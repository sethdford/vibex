/**
 * Conversation Tree Storage Service
 * 
 * Single Responsibility: Handle all file system operations for conversation trees
 * Following Gemini CLI's clean architecture patterns
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import type { ConversationTree, ConversationNode } from '../conversation/types.js';

export interface StorageConfig {
  storageDirectory: string;
  enableBackups?: boolean;
  maxBackups?: number;
  compressionEnabled?: boolean;
}

export interface StorageResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  timing?: {
    startTime: number;
    duration: number;
  };
}

/**
 * Tree Storage Service - Clean Architecture
 * Focus: File system operations only
 */
export class ConversationTreeStorageService {
  private config: StorageConfig;
  private initialized = false;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<StorageResult> {
    const startTime = Date.now();
    
    try {
      // Ensure directory structure exists
      await fs.mkdir(this.config.storageDirectory, { recursive: true });
      await fs.mkdir(path.join(this.config.storageDirectory, 'nodes'), { recursive: true });
      await fs.mkdir(path.join(this.config.storageDirectory, 'visualization'), { recursive: true });
      
      if (this.config.enableBackups) {
        await fs.mkdir(path.join(this.config.storageDirectory, 'backups'), { recursive: true });
      }

      this.initialized = true;

      return {
        success: true,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      logger.error('Failed to initialize tree storage', error);
      return {
        success: false,
        error: `Storage initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Save a conversation tree to disk
   */
    async saveTree(tree: ConversationTree): Promise<StorageResult> {
    this.ensureInitialized();
    const startTime = Date.now();

    try {
      const treeDir = path.join(this.config.storageDirectory, tree.id);
      
      // Ensure tree directory exists
      await fs.mkdir(treeDir, { recursive: true });
      await fs.mkdir(path.join(treeDir, 'nodes'), { recursive: true });

      // Create backup if enabled
      if (this.config.enableBackups) {
        await this.createBackup(tree);
      }

      // Save tree metadata (without nodes Map which can't be serialized)
      const treeMetadata = {
        ...tree,
        nodes: undefined // Will save nodes separately
      };
      
      const metadataPath = path.join(treeDir, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(treeMetadata, null, 2), 'utf8');

      // Save individual nodes
      const nodesDir = path.join(treeDir, 'nodes');
      let nodeCount = 0;
      
      for (const [nodeId, node] of tree.nodes) {
        const nodePath = path.join(nodesDir, `${nodeId}.json`);
        await fs.writeFile(nodePath, JSON.stringify(node, null, 2), 'utf8');
        nodeCount++;
      }

      const duration = Date.now() - startTime;

      logger.debug('Saved conversation tree', {
        treeId: tree.id,
        name: tree.name,
        nodeCount,
        duration
      });

      return {
        success: true,
        timing: {
          startTime,
          duration
        }
      };
    } catch (error) {
      logger.error('Failed to save conversation tree', { treeId: tree.id, error });
      return {
        success: false,
        error: `Failed to save tree: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Load a conversation tree from disk
   */
  async loadTree(id: string): Promise<StorageResult<ConversationTree>> {
    this.ensureInitialized();
    const startTime = Date.now();

    try {
      // Load tree metadata
      const treeMetadataPath = path.join(this.config.storageDirectory, id, 'metadata.json');
      const metadataContent = await fs.readFile(treeMetadataPath, 'utf8');
      const treeData = JSON.parse(metadataContent) as ConversationTree;

      // Load nodes
      const nodesDir = path.join(this.config.storageDirectory, id, 'nodes');
      const nodeFiles = await fs.readdir(nodesDir);
      const nodes = new Map<string, ConversationNode>();

      for (const nodeFile of nodeFiles) {
        if (nodeFile.endsWith('.json')) {
          const nodeId = nodeFile.replace('.json', '');
          const nodePath = path.join(nodesDir, nodeFile);
          const nodeContent = await fs.readFile(nodePath, 'utf8');
          const node = JSON.parse(nodeContent) as ConversationNode;
          nodes.set(nodeId, node);
        }
      }

      // Reconstruct tree with Map
      const tree: ConversationTree = {
        ...treeData,
        nodes: nodes
      };

      const duration = Date.now() - startTime;

      logger.debug('Loaded conversation tree', {
        treeId: tree.id,
        name: tree.name,
        nodeCount: nodes.size,
        duration
      });

      return {
        success: true,
        data: tree,
        timing: {
          startTime,
          duration
        }
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          success: false,
          error: `Tree not found: ${id}`,
          timing: {
            startTime,
            duration: Date.now() - startTime
          }
        };
      }

      return {
        success: false,
        error: `Failed to load tree: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Delete a conversation tree from disk
   */
  async deleteTree(id: string): Promise<StorageResult> {
    this.ensureInitialized();
    const startTime = Date.now();

    try {
      const treeDir = path.join(this.config.storageDirectory, id);
      
      // Check if tree exists
      try {
        await fs.access(treeDir);
      } catch {
        return {
          success: false,
          error: `Tree not found: ${id}`,
          timing: {
            startTime,
            duration: Date.now() - startTime
          }
        };
      }

      // Create final backup if enabled
      if (this.config.enableBackups) {
        const tree = await this.loadTree(id);
        if (tree.success && tree.data) {
          await this.createBackup(tree.data, 'final');
        }
      }

      // Remove directory recursively
      await fs.rm(treeDir, { recursive: true, force: true });

      const duration = Date.now() - startTime;

      logger.info('Deleted conversation tree', { treeId: id, duration });

      return {
        success: true,
        timing: {
          startTime,
          duration
        }
      };
    } catch (error) {
      logger.error('Failed to delete conversation tree', { treeId: id, error });
      return {
        success: false,
        error: `Failed to delete tree: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * List all available conversation trees
   */
    async listTrees(): Promise<StorageResult<any[]>> {
    this.ensureInitialized();
    const startTime = Date.now();

    try {
      const trees: any[] = [];
      const treeDirectories = await fs.readdir(this.config.storageDirectory);

      for (const treeDir of treeDirectories) {
        try {
          const metadataPath = path.join(this.config.storageDirectory, treeDir, 'metadata.json');
          const content = await fs.readFile(metadataPath, 'utf8');
          const treeMetadata = JSON.parse(content) as Omit<ConversationTree, 'nodes'>;
          
          // Create lightweight tree object for listing
          const tree: Partial<ConversationTree> = {
            ...treeMetadata,
            nodes: new Map() // Empty for listing
          };
          
          trees.push(tree);
        } catch (error) {
          logger.warn(`Failed to read tree metadata: ${treeDir}`, error);
        }
      }

      const sortedTrees = trees.sort((a, b) => b.lastModified - a.lastModified);

      return {
        success: true,
        data: sortedTrees,
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      logger.error('Failed to list conversation trees', error);
      return {
        success: true, // Don't fail completely
        data: [],
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Check if a tree exists
   */
  async treeExists(id: string): Promise<boolean> {
    try {
      const treeDir = path.join(this.config.storageDirectory, id);
      await fs.access(treeDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageResult<{
    totalTrees: number;
    totalSize: number;
    oldestTree: number;
    newestTree: number;
  }>> {
    this.ensureInitialized();
    const startTime = Date.now();

    try {
      const listResult = await this.listTrees();
      if (!listResult.success || !listResult.data) {
        return {
          success: false,
          error: 'Failed to get tree list for stats'
        };
      }

      const trees = listResult.data;
      let totalSize = 0;
      let oldestTree = Date.now();
      let newestTree = 0;

      for (const tree of trees) {
        const treeDir = path.join(this.config.storageDirectory, tree.id);
        try {
          const stats = await this.getDirectorySize(treeDir);
          totalSize += stats;
        } catch {
          // Skip if can't read
        }

        if (tree.createdAt < oldestTree) oldestTree = tree.createdAt;
        if (tree.createdAt > newestTree) newestTree = tree.createdAt;
      }

      return {
        success: true,
        data: {
          totalTrees: trees.length,
          totalSize,
          oldestTree,
          newestTree
        },
        timing: {
          startTime,
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create backup of a tree
   */
  private async createBackup(tree: ConversationTree, suffix = ''): Promise<void> {
    if (!this.config.enableBackups) return;

    const backupDir = path.join(this.config.storageDirectory, 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${tree.id}_${timestamp}${suffix ? `_${suffix}` : ''}`;
    const backupPath = path.join(backupDir, backupName);

    const treeDir = path.join(this.config.storageDirectory, tree.id);
    
    try {
      await fs.cp(treeDir, backupPath, { recursive: true });
      
      // Clean old backups if needed
      if (this.config.maxBackups && this.config.maxBackups > 0) {
        await this.cleanOldBackups();
      }
    } catch (error) {
      logger.warn('Failed to create backup', { treeId: tree.id, error });
    }
  }

  /**
   * Clean old backups
   */
    private async cleanOldBackups(): Promise<void> {
    if (!this.config.maxBackups) return;

    try {
      const backupDir = path.join(this.config.storageDirectory, 'backups');
      const backups = await fs.readdir(backupDir);
      
      if (backups.length > this.config.maxBackups) {
        // Sort by creation time and remove oldest
        const backupStats = await Promise.all(
          backups.map(async (backup) => {
            const stat = await fs.stat(path.join(backupDir, backup));
            return { name: backup, ctime: stat.ctime };
          })
        );

        backupStats.sort((a, b) => a.ctime.getTime() - b.ctime.getTime());
        
        const toDelete = backupStats.slice(0, backupStats.length - this.config.maxBackups);
        
        for (const backup of toDelete) {
          await fs.rm(path.join(backupDir, backup.name), { recursive: true, force: true });
        }
      }
    } catch (error) {
      logger.warn('Failed to clean old backups', error);
    }
  }

  /**
   * Get directory size recursively
   */
    private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          size += await this.getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          size += stats.size;
        }
      }
    } catch {
      // Return 0 if can't read
    }
    
    return size;
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw createUserError('Tree storage service not initialized', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Call initialize() before using storage operations'
      });
    }
  }
}

// Factory function for creating storage service
export function createTreeStorageService(config: StorageConfig): ConversationTreeStorageService {
  return new ConversationTreeStorageService(config);
} 