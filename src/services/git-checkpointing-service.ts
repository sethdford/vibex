/**
 * Git Checkpointing Service
 * 
 * Provides automatic Git snapshot system for file modifications and conversation history.
 * Integrates with existing GitService and conversation state management to create
 * comprehensive checkpoints that can be browsed and restored.
 * 
 * Features:
 * - Automatic checkpoints before file modifications
 * - Conversation state integration
 * - Checkpoint metadata and browsing
 * - Safety checks and validation
 * - Performance optimization
 */

import { EventEmitter } from 'events';
import { GitService } from './git-service.js';
import { conversationState } from '../utils/conversation-state.js';
import { logger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs/promises';
import { createHash } from 'crypto';

/**
 * Checkpoint metadata
 */
export interface CheckpointMetadata {
  /** Unique checkpoint ID */
  id: string;
  
  /** Human-readable checkpoint name */
  name: string;
  
  /** Checkpoint description */
  description?: string;
  
  /** Timestamp when checkpoint was created */
  timestamp: number;
  
  /** Git commit hash for this checkpoint */
  gitCommitHash?: string;
  
  /** Conversation state ID if conversation was saved */
  conversationId?: string;
  
  /** Files that were modified and included in checkpoint */
  modifiedFiles: string[];
  
  /** Working directory at checkpoint time */
  workingDirectory: string;
  
  /** Tool operation that triggered the checkpoint */
  triggerOperation?: string;
  
  /** User who created the checkpoint */
  user?: string;
  
  /** Git branch at checkpoint time */
  gitBranch?: string;
  
  /** Repository status at checkpoint time */
  repositoryStatus: {
    isClean: boolean;
    stagedFiles: number;
    unstagedFiles: number;
    untrackedFiles: number;
  };
  
  /** Performance metrics */
  performance: {
    gitSnapshotTime: number;
    conversationSaveTime: number;
    totalTime: number;
  };
  
  /** Custom metadata */
  custom?: Record<string, any>;
}

/**
 * Checkpoint creation options
 */
export interface CheckpointOptions {
  /** Custom checkpoint name */
  name?: string;
  
  /** Checkpoint description */
  description?: string;
  
  /** Files to include (defaults to all modified files) */
  filePaths?: string[];
  
  /** Whether to save conversation state */
  saveConversation?: boolean;
  
  /** Tool operation triggering this checkpoint */
  triggerOperation?: string;
  
  /** Whether to force checkpoint even if no changes */
  force?: boolean;
  
  /** Custom metadata to include */
  custom?: Record<string, any>;
  
  /** Whether to create Git commit or just stash */
  createCommit?: boolean;
}

/**
 * Checkpoint restoration options
 */
export interface CheckpointRestoreOptions {
  /** Whether to restore conversation state */
  restoreConversation?: boolean;
  
  /** Whether to restore working directory */
  restoreWorkingDirectory?: boolean;
  
  /** Whether to create backup before restoration */
  createBackup?: boolean;
  
  /** Files to restore (defaults to all files in checkpoint) */
  filePaths?: string[];
}

/**
 * Checkpoint search filters
 */
export interface CheckpointSearchFilters {
  /** Filter by operation type */
  operation?: string;
  
  /** Filter by date range */
  dateRange?: {
    start: number;
    end: number;
  };
  
  /** Filter by files modified */
  containsFile?: string;
  
  /** Filter by conversation ID */
  conversationId?: string;
  
  /** Filter by Git branch */
  gitBranch?: string;
  
  /** Text search in name/description */
  textSearch?: string;
}

/**
 * Checkpoint events
 */
export enum CheckpointEvent {
  CHECKPOINT_CREATED = 'checkpoint:created',
  CHECKPOINT_RESTORED = 'checkpoint:restored',
  CHECKPOINT_DELETED = 'checkpoint:deleted',
  CHECKPOINT_ERROR = 'checkpoint:error',
  VALIDATION_FAILED = 'checkpoint:validation_failed',
}

/**
 * Git Checkpointing Service
 */
export class GitCheckpointingService extends EventEmitter {
  private gitService: GitService;
  private checkpointsDirectory: string;
  private isInitialized = false;
  private config: {
    enabled: boolean;
    autoCheckpoint: boolean;
    maxCheckpoints: number;
    checkpointRetentionDays: number;
    createCommits: boolean;
    saveConversations: boolean;
  };

  constructor(workingDirectory: string = process.cwd()) {
    super();
    
    this.gitService = new GitService(workingDirectory);
    this.checkpointsDirectory = path.join(workingDirectory, '.vibex', 'checkpoints');
    
    // Default configuration
    this.config = {
      enabled: true,
      autoCheckpoint: true,
      maxCheckpoints: 100,
      checkpointRetentionDays: 30,
      createCommits: true,
      saveConversations: true,
    };
  }

  /**
   * Initialize the checkpointing service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if we're in a Git repository
      const isGitRepo = await this.gitService.isGitRepository();
      if (!isGitRepo) {
        logger.warn('Git checkpointing disabled: not in a Git repository');
        this.config.enabled = false;
        return;
      }

      // Create checkpoints directory
      await fs.mkdir(this.checkpointsDirectory, { recursive: true });

      // Initialize conversation state manager
      await conversationState.initialize();

      // Clean up old checkpoints
      await this.cleanupOldCheckpoints();

      this.isInitialized = true;
      
      logger.info('Git checkpointing service initialized', {
        enabled: this.config.enabled,
        autoCheckpoint: this.config.autoCheckpoint,
        directory: this.checkpointsDirectory,
      });
    } catch (error) {
      logger.error('Failed to initialize Git checkpointing service', { error });
      throw error;
    }
  }

  /**
   * Create a checkpoint before file modifications
   */
  async createCheckpoint(options: CheckpointOptions = {}): Promise<CheckpointMetadata | null> {
    if (!this.isInitialized || !this.config.enabled) {
      logger.debug('Checkpointing disabled or not initialized');
      return null;
    }

    const startTime = Date.now();
    
    try {
      // Get repository status
      const fileStatus = await this.gitService.getFileStatus();
      const currentBranch = await this.gitService.getCurrentBranch();
      
      // Determine files to checkpoint
      let filesToCheckpoint = options.filePaths || [];
      if (filesToCheckpoint.length === 0) {
        filesToCheckpoint = fileStatus
          .filter(file => file.status !== 'untracked' || options.force)
          .map(file => file.path);
      }

      // Skip if no changes and not forced
      if (filesToCheckpoint.length === 0 && !options.force) {
        logger.debug('No changes to checkpoint');
        return null;
      }

      // Generate checkpoint ID and metadata
      const checkpointId = this.generateCheckpointId(options.triggerOperation);
      const checkpointName = options.name || this.generateCheckpointName(options.triggerOperation);
      
      // Create Git snapshot
      const gitSnapshotStart = Date.now();
      let gitCommitHash: string | null = null;
      
      if (options.createCommit !== false && this.config.createCommits) {
        const commitMessage = `VibeX Checkpoint: ${checkpointName}`;
        gitCommitHash = await this.gitService.createFileSnapshot(commitMessage, filesToCheckpoint);
      }
      
      const gitSnapshotTime = Date.now() - gitSnapshotStart;

      // Save conversation state if requested
      const conversationSaveStart = Date.now();
      let conversationId: string | undefined;
      
      if ((options.saveConversation !== false && this.config.saveConversations) || options.saveConversation) {
        try {
          const savedConversation = await conversationState.saveConversation({
            name: `Checkpoint: ${checkpointName}`,
            description: `Auto-saved with checkpoint ${checkpointId}`,
            tags: ['checkpoint', 'auto-save'],
            custom: {
              checkpointId,
              triggerOperation: options.triggerOperation,
              isCheckpointSave: true,
            },
          });
          conversationId = savedConversation.id;
        } catch (error) {
          logger.warn('Failed to save conversation with checkpoint', { error });
        }
      }
      
      const conversationSaveTime = Date.now() - conversationSaveStart;

      // Create checkpoint metadata
      const metadata: CheckpointMetadata = {
        id: checkpointId,
        name: checkpointName,
        description: options.description,
        timestamp: Date.now(),
        gitCommitHash: gitCommitHash || undefined,
        conversationId,
        modifiedFiles: filesToCheckpoint,
        workingDirectory: process.cwd(),
        triggerOperation: options.triggerOperation,
        user: process.env.USER || process.env.USERNAME || 'unknown',
        gitBranch: currentBranch || undefined,
        repositoryStatus: {
          isClean: fileStatus.length === 0,
          stagedFiles: fileStatus.filter(f => f.status === 'staged').length,
          unstagedFiles: fileStatus.filter(f => f.status === 'unstaged' || f.status === 'modified').length,
          untrackedFiles: fileStatus.filter(f => f.status === 'untracked').length,
        },
        performance: {
          gitSnapshotTime,
          conversationSaveTime,
          totalTime: Date.now() - startTime,
        },
        custom: options.custom,
      };

      // Save checkpoint metadata
      await this.saveCheckpointMetadata(metadata);

      // Emit event
      this.emit(CheckpointEvent.CHECKPOINT_CREATED, metadata);

      logger.info('Checkpoint created successfully', {
        id: checkpointId,
        name: checkpointName,
        filesCount: filesToCheckpoint.length,
        hasGitCommit: !!gitCommitHash,
        hasConversation: !!conversationId,
        totalTime: metadata.performance.totalTime,
      });

      return metadata;
    } catch (error) {
      logger.error('Failed to create checkpoint', { error, options });
      this.emit(CheckpointEvent.CHECKPOINT_ERROR, { error, operation: 'create' });
      throw error;
    }
  }

  /**
   * Restore from a checkpoint
   */
  async restoreCheckpoint(
    checkpointId: string, 
    options: CheckpointRestoreOptions = {}
  ): Promise<boolean> {
    if (!this.isInitialized || !this.config.enabled) {
      throw new Error('Checkpointing service not initialized or disabled');
    }

    try {
      // Load checkpoint metadata
      const metadata = await this.loadCheckpointMetadata(checkpointId);
      if (!metadata) {
        throw new Error(`Checkpoint not found: ${checkpointId}`);
      }

      // Create backup if requested
      if (options.createBackup !== false) {
        await this.createCheckpoint({
          name: `Backup before restore ${checkpointId}`,
          description: `Auto-backup before restoring checkpoint ${metadata.name}`,
          triggerOperation: 'checkpoint_restore',
          force: true,
        });
      }

      // Restore Git state
      if (metadata.gitCommitHash) {
        const filesToRestore = options.filePaths || metadata.modifiedFiles;
        
        for (const filePath of filesToRestore) {
          const restored = await this.gitService.restoreFile(filePath, metadata.gitCommitHash);
          if (!restored) {
            logger.warn(`Failed to restore file: ${filePath}`);
          }
        }
      }

      // Restore conversation state
      if (options.restoreConversation !== false && metadata.conversationId) {
        try {
          await conversationState.loadConversation(metadata.conversationId);
          logger.info('Conversation state restored from checkpoint');
        } catch (error) {
          logger.warn('Failed to restore conversation state', { error });
        }
      }

      // Restore working directory
      if (options.restoreWorkingDirectory && metadata.workingDirectory !== process.cwd()) {
        try {
          process.chdir(metadata.workingDirectory);
          logger.info('Working directory restored', { 
            from: process.cwd(), 
            to: metadata.workingDirectory 
          });
        } catch (error) {
          logger.warn('Failed to restore working directory', { error });
        }
      }

      this.emit(CheckpointEvent.CHECKPOINT_RESTORED, { metadata, options });

      logger.info('Checkpoint restored successfully', {
        id: checkpointId,
        name: metadata.name,
        filesRestored: options.filePaths?.length || metadata.modifiedFiles.length,
      });

      return true;
    } catch (error) {
      logger.error('Failed to restore checkpoint', { error, checkpointId });
      this.emit(CheckpointEvent.CHECKPOINT_ERROR, { error, operation: 'restore' });
      throw error;
    }
  }

  /**
   * List checkpoints with optional filtering
   */
  async listCheckpoints(filters: CheckpointSearchFilters = {}): Promise<CheckpointMetadata[]> {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const checkpointFiles = await fs.readdir(this.checkpointsDirectory);
      const checkpoints: CheckpointMetadata[] = [];

      for (const file of checkpointFiles) {
        if (!file.endsWith('.json')) continue;

        try {
          const metadata = await this.loadCheckpointMetadata(path.basename(file, '.json'));
          if (metadata && this.matchesFilters(metadata, filters)) {
            checkpoints.push(metadata);
          }
        } catch (error) {
          logger.warn(`Failed to load checkpoint metadata: ${file}`, { error });
        }
      }

      // Sort by timestamp (newest first)
      checkpoints.sort((a, b) => b.timestamp - a.timestamp);

      return checkpoints;
    } catch (error) {
      logger.error('Failed to list checkpoints', { error });
      return [];
    }
  }

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<boolean> {
    try {
      const metadataPath = path.join(this.checkpointsDirectory, `${checkpointId}.json`);
      await fs.unlink(metadataPath);

      this.emit(CheckpointEvent.CHECKPOINT_DELETED, { checkpointId });
      
      logger.info('Checkpoint deleted', { id: checkpointId });
      return true;
    } catch (error) {
      logger.error('Failed to delete checkpoint', { error, checkpointId });
      return false;
    }
  }

  /**
   * Get checkpoint details
   */
  async getCheckpoint(checkpointId: string): Promise<CheckpointMetadata | null> {
    return this.loadCheckpointMetadata(checkpointId);
  }

  /**
   * Check if automatic checkpointing should be performed for an operation
   */
  shouldCreateCheckpoint(operation: string, filePaths: string[] = []): boolean {
    if (!this.config.enabled || !this.config.autoCheckpoint) {
      return false;
    }

    // Operations that should trigger checkpoints
    const destructiveOperations = [
      'write_file',
      'replace_file',
      'edit_file',
      'delete_file',
      'move_file',
      'copy_file',
      'create_file',
      'modify_file',
    ];

    return destructiveOperations.includes(operation) && filePaths.length > 0;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
    logger.info('Checkpointing configuration updated', { config: this.config });
  }

  // Private helper methods

  private generateCheckpointId(operation?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const operationPrefix = operation ? `${operation}_` : '';
    return `${operationPrefix}${timestamp}_${random}`;
  }

  private generateCheckpointName(operation?: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const operationName = operation ? ` (${operation})` : '';
    return `Checkpoint ${timestamp}${operationName}`;
  }

  private async saveCheckpointMetadata(metadata: CheckpointMetadata): Promise<void> {
    const metadataPath = path.join(this.checkpointsDirectory, `${metadata.id}.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  }

  private async loadCheckpointMetadata(checkpointId: string): Promise<CheckpointMetadata | null> {
    try {
      const metadataPath = path.join(this.checkpointsDirectory, `${checkpointId}.json`);
      const content = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(content) as CheckpointMetadata;
    } catch (error) {
      return null;
    }
  }

  private matchesFilters(metadata: CheckpointMetadata, filters: CheckpointSearchFilters): boolean {
    if (filters.operation && metadata.triggerOperation !== filters.operation) {
      return false;
    }

    if (filters.dateRange) {
      if (metadata.timestamp < filters.dateRange.start || metadata.timestamp > filters.dateRange.end) {
        return false;
      }
    }

    if (filters.containsFile && !metadata.modifiedFiles.includes(filters.containsFile)) {
      return false;
    }

    if (filters.conversationId && metadata.conversationId !== filters.conversationId) {
      return false;
    }

    if (filters.gitBranch && metadata.gitBranch !== filters.gitBranch) {
      return false;
    }

    if (filters.textSearch) {
      const searchText = filters.textSearch.toLowerCase();
      const searchableText = `${metadata.name} ${metadata.description || ''}`.toLowerCase();
      if (!searchableText.includes(searchText)) {
        return false;
      }
    }

    return true;
  }

  private async cleanupOldCheckpoints(): Promise<void> {
    try {
      const checkpoints = await this.listCheckpoints();
      const cutoffTime = Date.now() - (this.config.checkpointRetentionDays * 24 * 60 * 60 * 1000);
      
      // Remove old checkpoints
      const oldCheckpoints = checkpoints.filter(cp => cp.timestamp < cutoffTime);
      
      // Keep at least the most recent checkpoints even if they're old
      const checkpointsToDelete = checkpoints.length > this.config.maxCheckpoints 
        ? checkpoints.slice(this.config.maxCheckpoints)
        : oldCheckpoints;

      for (const checkpoint of checkpointsToDelete) {
        await this.deleteCheckpoint(checkpoint.id);
      }

      if (checkpointsToDelete.length > 0) {
        logger.info('Cleaned up old checkpoints', { 
          deleted: checkpointsToDelete.length,
          total: checkpoints.length 
        });
      }
    } catch (error) {
      logger.warn('Failed to cleanup old checkpoints', { error });
    }
  }
}

// Export singleton instance
export const gitCheckpointing = new GitCheckpointingService(); 