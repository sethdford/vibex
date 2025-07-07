/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { v4 as uuidv4 } from 'uuid';
import { CheckpointService, CheckpointOptions, CheckpointMetadata, CheckpointInfo } from '../tool-services';
import { EventBus, CheckpointCreatedEvent, CheckpointRestoredEvent } from '../tool-events';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

/**
 * Configuration for the Checkpoint Service
 */
export interface CheckpointConfig {
  /**
   * Whether to enable git-based checkpoints
   */
  enabled?: boolean;
  
  /**
   * Git branch to use for checkpoints (default: 'vibex-checkpoints')
   */
  checkpointBranch?: string;
  
  /**
   * Default expiration time in milliseconds (default: 1 hour)
   */
  defaultExpirationTime?: number;
  
  /**
   * Tools that should create checkpoints (default: ['write_file', 'shell'])
   */
  checkpointTools?: string[];
  
  /**
   * Maximum number of checkpoints to keep (default: 10)
   */
  maxCheckpoints?: number;
  
  /**
   * Directory to store checkpoints metadata
   */
  metadataDir?: string;
}

/**
 * Implementation of the CheckpointService
 * 
 * Uses Git for creating checkpoints before risky operations.
 */
export class CheckpointServiceImpl implements CheckpointService {
  /**
   * Configuration
   */
  private config: CheckpointConfig;
  
  /**
   * Event bus
   */
  private eventBus?: EventBus;
  
  /**
   * Tracked checkpoints
   */
  private checkpoints: CheckpointMetadata[] = [];
  
  /**
   * Whether Git is available
   */
  private gitAvailable = false;
  
  /**
   * Whether we're in a Git repository
   */
  private inGitRepo = false;

  /**
   * Constructor
   */
  constructor(config: CheckpointConfig = {}, eventBus?: EventBus) {
    this.config = {
      enabled: true,
      checkpointBranch: 'vibex-checkpoints',
      defaultExpirationTime: 60 * 60 * 1000, // 1 hour
      checkpointTools: ['write_file', 'shell'],
      maxCheckpoints: 10,
      metadataDir: '.vibex/checkpoints',
      ...config
    };
    
    this.eventBus = eventBus;
    
    // Initialize in the background
    this.initialize().catch(error => {
      console.error('Failed to initialize checkpoint service:', error);
    });
  }

  /**
   * Create a checkpoint before risky operations
   */
  async createCheckpoint(options: CheckpointOptions): Promise<CheckpointMetadata> {
    if (!this.config.enabled || !this.gitAvailable || !this.inGitRepo) {
      throw new Error('Checkpoints are not available (Git not found or not in a Git repository)');
    }
    
    try {
      // Generate a unique ID for this checkpoint
      const id = uuidv4();
      
      // Set up expiration time
      const createdAt = new Date();
      const expiresAt = options.expiresIn ? 
        new Date(createdAt.getTime() + options.expiresIn) : 
        new Date(createdAt.getTime() + (this.config.defaultExpirationTime || 3600000));
      
      // Create checkpoint branch if it doesn't exist
      const branchName = this.config.checkpointBranch || 'vibex-checkpoints';
      const checkpointName = `${branchName}-${id}`;
      
      // Detect current branch
      const { stdout: currentBranchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD');
      const currentBranch = currentBranchOutput.trim();
      
      // Create a stash with the changes
      let stashMessage = `VibeX Checkpoint: ${options.description} (${id})`;
      if (options.includeAllModified) {
        await execAsync(`git stash push -m "${stashMessage}" --include-untracked`);
      } else if (options.files && options.files.length > 0) {
        // Stash specific files
        for (const file of options.files) {
          await execAsync(`git add "${file}"`);
        }
        await execAsync(`git stash push -m "${stashMessage}" --keep-index`);
        // Unstage the files
        await execAsync('git reset HEAD');
      } else {
        throw new Error('No files specified for checkpoint');
      }
      
      // Get the stash reference
      const { stdout: stashListOutput } = await execAsync('git stash list');
      const stashRef = stashListOutput.split('\n')[0].split(':')[0];
      
      // Create a checkpoint branch from the stash
      await execAsync(`git branch ${checkpointName} ${stashRef}`);
      
      // Apply the stash back to continue working
      await execAsync('git stash pop');
      
      // Create checkpoint metadata
      const checkpoint: CheckpointMetadata = {
        id,
        description: options.description,
        createdAt,
        expiresAt,
        files: options.files || [],
        branch: checkpointName,
        originalBranch: currentBranch
      };
      
      // Add to checkpoints list
      this.checkpoints.push(checkpoint);
      
      // Enforce maximum number of checkpoints
      if (this.config.maxCheckpoints && 
          this.checkpoints.length > this.config.maxCheckpoints) {
        // Remove oldest checkpoints
        const toRemove = this.checkpoints.length - this.config.maxCheckpoints;
        const removedCheckpoints = this.checkpoints.splice(0, toRemove);
        
        // Clean up removed checkpoints
        for (const cp of removedCheckpoints) {
          this.cleanupCheckpoint(cp.id).catch(console.error);
        }
      }
      
      // Save checkpoint metadata
      await this.saveCheckpointMetadata();
      
      // Publish checkpoint created event if event bus is available
      if (this.eventBus) {
        this.eventBus.publish(new CheckpointCreatedEvent(
          id,
          options.description,
          options.files || []
        ));
      }
      
      return checkpoint;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create checkpoint: ${errorMessage}`);
    }
  }

  /**
   * Restore from a checkpoint
   */
  async restoreCheckpoint(id: string): Promise<boolean> {
    if (!this.config.enabled || !this.gitAvailable || !this.inGitRepo) {
      throw new Error('Checkpoints are not available (Git not found or not in a Git repository)');
    }
    
    // Find the checkpoint
    const checkpoint = this.checkpoints.find(cp => cp.id === id);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${id}`);
    }
    
    try {
      // Detect current branch
      const { stdout: currentBranchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD');
      const currentBranch = currentBranchOutput.trim();
      
      // Check if we have uncommitted changes
      const { stdout: statusOutput } = await execAsync('git status --porcelain');
      const hasChanges = statusOutput.trim().length > 0;
      
      // If we have changes, stash them
      if (hasChanges) {
        await execAsync('git stash push -m "Auto-stash before checkpoint restore" --include-untracked');
      }
      
      // Switch to the checkpoint branch
      await execAsync(`git checkout ${checkpoint.branch}`);
      
      // Create a patch
      const { stdout: diffOutput } = await execAsync(`git diff ${checkpoint.originalBranch} ${checkpoint.branch}`);
      
      // Switch back to the original branch
      await execAsync(`git checkout ${currentBranch}`);
      
      // Apply the patch
      if (diffOutput.trim().length > 0) {
        // Write the patch to a temporary file
        const tempPatchFile = path.join(process.env.TEMP || '/tmp', `vibex-checkpoint-${id}.patch`);
        await fs.writeFile(tempPatchFile, diffOutput);
        
        try {
          // Apply the patch
          await execAsync(`git apply --3way ${tempPatchFile}`);
          
          // Remove the temporary patch file
          await fs.unlink(tempPatchFile);
        } catch (error) {
          // If applying the patch fails, try to clean up
          try {
            await fs.unlink(tempPatchFile);
          } catch (e) {
            // Ignore cleanup errors
          }
          throw error;
        }
      }
      
      // Clean up the checkpoint branch
      await this.cleanupCheckpoint(id);
      
      // Remove from checkpoints list
      this.checkpoints = this.checkpoints.filter(cp => cp.id !== id);
      await this.saveCheckpointMetadata();
      
      // Publish checkpoint restored event if event bus is available
      if (this.eventBus) {
        this.eventBus.publish(new CheckpointRestoredEvent(id, true));
      }
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Publish checkpoint restored event with failure if event bus is available
      if (this.eventBus) {
        this.eventBus.publish(new CheckpointRestoredEvent(id, false));
      }
      
      throw new Error(`Failed to restore checkpoint: ${errorMessage}`);
    }
  }

  /**
   * Check if a checkpoint should be created
   */
  shouldCreateCheckpoint(toolName: string, filePaths: string[]): boolean {
    if (!this.config.enabled || !this.gitAvailable || !this.inGitRepo) {
      return false;
    }
    
    // Check if the tool is in the list of tools that should create checkpoints
    const checkpointTools = this.config.checkpointTools || ['write_file', 'shell'];
    if (!checkpointTools.includes(toolName)) {
      return false;
    }
    
    // For file operations, only create checkpoint if there are file paths
    if (toolName === 'write_file' && (!filePaths || filePaths.length === 0)) {
      return false;
    }
    
    // For shell operations, always create checkpoints (could be destructive)
    if (toolName === 'shell') {
      return true;
    }
    
    return true;
  }

  /**
   * Get all checkpoints
   */
  getCheckpoints(): CheckpointInfo[] {
    // Filter expired checkpoints
    const now = new Date();
    return this.checkpoints
      .filter(cp => !cp.expiresAt || cp.expiresAt > now)
      .map(cp => ({
        id: cp.id,
        description: cp.description,
        createdAt: cp.createdAt,
        expiresAt: cp.expiresAt,
        expired: false
      }));
  }
  
  /**
   * Initialize the service
   * @private
   */
  private async initialize(): Promise<void> {
    try {
      // Check if Git is available
      await execAsync('git --version');
      this.gitAvailable = true;
      
      // Check if we're in a Git repository
      try {
        await execAsync('git rev-parse --is-inside-work-tree');
        this.inGitRepo = true;
      } catch {
        // Not in a Git repository
        this.inGitRepo = false;
      }
      
      // If we're in a Git repository and checkpoints are enabled, load existing checkpoints
      if (this.inGitRepo && this.config.enabled) {
        await this.loadCheckpointMetadata();
        
        // Clean up expired checkpoints
        await this.cleanupExpiredCheckpoints();
      }
    } catch {
      // Git not available
      this.gitAvailable = false;
    }
  }
  
  /**
   * Save checkpoint metadata
   * @private
   */
  private async saveCheckpointMetadata(): Promise<void> {
    if (!this.config.metadataDir) return;
    
    try {
      // Create metadata directory if it doesn't exist
      await fs.mkdir(this.config.metadataDir, { recursive: true });
      
      // Write checkpoints to file
      const metadataFile = path.join(this.config.metadataDir, 'checkpoints.json');
      await fs.writeFile(
        metadataFile,
        JSON.stringify(this.checkpoints, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save checkpoint metadata:', error);
    }
  }
  
  /**
   * Load checkpoint metadata
   * @private
   */
  private async loadCheckpointMetadata(): Promise<void> {
    if (!this.config.metadataDir) return;
    
    try {
      // Create metadata directory if it doesn't exist
      await fs.mkdir(this.config.metadataDir, { recursive: true });
      
      // Read checkpoints from file
      const metadataFile = path.join(this.config.metadataDir, 'checkpoints.json');
      try {
        const data = await fs.readFile(metadataFile, 'utf-8');
        const checkpoints = JSON.parse(data);
        
        // Convert date strings to Date objects
        this.checkpoints = checkpoints.map((cp: any) => ({
          ...cp,
          createdAt: new Date(cp.createdAt),
          expiresAt: cp.expiresAt ? new Date(cp.expiresAt) : undefined
        }));
      } catch (e) {
        // File doesn't exist or invalid JSON
        this.checkpoints = [];
      }
    } catch (error) {
      console.error('Failed to load checkpoint metadata:', error);
    }
  }
  
  /**
   * Clean up expired checkpoints
   * @private
   */
  private async cleanupExpiredCheckpoints(): Promise<void> {
    const now = new Date();
    const expiredCheckpoints = this.checkpoints.filter(
      cp => cp.expiresAt && cp.expiresAt < now
    );
    
    // Clean up each expired checkpoint
    for (const cp of expiredCheckpoints) {
      await this.cleanupCheckpoint(cp.id).catch(console.error);
    }
    
    // Remove expired checkpoints from the list
    this.checkpoints = this.checkpoints.filter(
      cp => !cp.expiresAt || cp.expiresAt >= now
    );
    
    // Save updated checkpoint metadata
    await this.saveCheckpointMetadata();
  }
  
  /**
   * Clean up a checkpoint
   * @private
   */
  private async cleanupCheckpoint(id: string): Promise<void> {
    const checkpoint = this.checkpoints.find(cp => cp.id === id);
    if (!checkpoint) return;
    
    try {
      // Delete the checkpoint branch
      if (checkpoint.branch) {
        await execAsync(`git branch -D ${checkpoint.branch}`);
      }
    } catch (error) {
      console.error(`Failed to clean up checkpoint ${id}:`, error);
    }
  }
}

/**
 * Additional fields for checkpoint metadata
 */
interface ExtendedCheckpointMetadata extends CheckpointMetadata {
  /**
   * Git branch name for the checkpoint
   */
  branch: string;
  
  /**
   * Original branch name when checkpoint was created
   */
  originalBranch: string;
}

/**
 * Factory function to create a CheckpointService
 */
export function createCheckpointService(
  config: CheckpointConfig = {},
  eventBus?: EventBus
): CheckpointService {
  return new CheckpointServiceImpl(config, eventBus);
}