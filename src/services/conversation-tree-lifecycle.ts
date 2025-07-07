/**
 * Conversation Tree Lifecycle Service - Clean Architecture
 * 
 * Single Responsibility: Manage conversation tree lifecycle operations
 * - Tree creation, loading, saving, deletion
 * - Storage management and persistence
 * - Auto-save functionality
 * 
 * Following Gemini CLI's focused service patterns
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import type {
  ConversationTree,
  ConversationNode,
  ConversationTreeConfig,
  CreateTreeOptions,
  ConversationTreeEvent
} from '../conversation/types.js';

/**
 * Configuration for tree lifecycle operations
 */
export interface TreeLifecycleConfig {
  storageDirectory: string;
  autoSaveInterval: number;
  maxTreeSize: number;
  enableAutoSave: boolean;
}

/**
 * Result type for lifecycle operations
 */
export interface TreeLifecycleResult {
  success: boolean;
  tree?: ConversationTree;
  error?: string;
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

/**
 * Default configuration
 */
const DEFAULT_LIFECYCLE_CONFIG: TreeLifecycleConfig = {
  storageDirectory: '',
  autoSaveInterval: 30000, // 30 seconds
  maxTreeSize: 100 * 1024 * 1024, // 100MB
  enableAutoSave: true
};

/**
 * Conversation Tree Lifecycle Service
 * Focus: Tree lifecycle management only
 */
export class ConversationTreeLifecycleService extends EventEmitter {
  private config: TreeLifecycleConfig;
  private autoSaveInterval?: NodeJS.Timeout;
  private initialized = false;

  constructor(config: Partial<TreeLifecycleConfig> = {}) {
    super();
    this.config = { ...DEFAULT_LIFECYCLE_CONFIG, ...config };
  }

  /**
   * Initialize the lifecycle service
   */
  async initialize(configDir?: string): Promise<TreeLifecycleResult> {
    const startTime = Date.now();

    try {
      // Set storage directory
      this.config.storageDirectory = configDir 
        ? path.join(configDir, 'conversations', 'trees')
        : path.join(process.env.HOME || process.env.USERPROFILE || '.', '.vibex', 'conversations', 'trees');

      // Ensure directory structure exists
      await fs.mkdir(this.config.storageDirectory, { recursive: true });
      await fs.mkdir(path.join(this.config.storageDirectory, 'nodes'), { recursive: true });
      await fs.mkdir(path.join(this.config.storageDirectory, 'backups'), { recursive: true });

      // Start auto-save if enabled
      if (this.config.enableAutoSave && this.config.autoSaveInterval > 0) {
        this.startAutoSave();
      }

      this.initialized = true;
      
      const endTime = Date.now();
      
      this.emit('lifecycle-initialized', {
        storageDirectory: this.config.storageDirectory,
        timestamp: endTime
      });

      logger.info('Conversation tree lifecycle service initialized', {
        storageDir: this.config.storageDirectory,
        autoSave: this.config.enableAutoSave
      });

      return {
        success: true,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to initialize conversation tree lifecycle service', error);
      
      return {
        success: false,
        error: `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  /**
   * Create a new conversation tree
   */
    async createTree(name: string, options: Partial<CreateTreeOptions> = {}): Promise<TreeLifecycleResult> {
    const startTime = Date.now();

    if (!this.initialized) {
      return {
        success: false,
        error: 'Lifecycle service not initialized'
      };
    }

    try {
      const treeId = uuidv4();
      const rootNodeId = uuidv4();
      const timestamp = Date.now();

      // Create root node
      const rootNode: ConversationNode = {
        id: rootNodeId,
        name: 'root',
        parentId: undefined,
        children: [],
        messages: [],
        contextSnapshot: {
          timestamp: Date.now(),
          contextEntries: [],
          contextConfig: {},
          workingDirectory: '',
          environmentContext: {},
          contextVariables: {},
          hierarchyMetadata: {
            levels: [],
            totalSize: 0,
            fileCount: 0,
            lastModified: 0,
          }
        },
        createdAt: timestamp,
        lastModified: timestamp,
        lastActive: timestamp,
        metadata: {
          messageCount: 0,
          size: 0,
          tags: [],
          isMainBranch: true,
          custom: {},
        }
      };

      // Create tree
      const tree: ConversationTree = {
        id: treeId,
        name,
        rootId: rootNodeId,
        activeNodeId: rootNodeId,
        nodes: new Map([[rootNodeId, rootNode]]),
        createdAt: timestamp,
        lastModified: timestamp,
        metadata: {
          totalNodes: 1,
          branchCount: 1,
          maxDepth: 0,
          tags: [],
          custom: {},
          totalMessages: 0,
          mergedBranches: 0,
          conflictedBranches: 0,
        }
      };

      // Save the tree
      const saveResult = await this.saveTree(tree);
      if (!saveResult.success) {
        return saveResult;
      }

      const endTime = Date.now();

      this.emit('tree-created', {
        treeId,
        name,
        timestamp: endTime
      });

      logger.info('Conversation tree created', {
        treeId,
        name,
        rootNodeId
      });

      return {
        success: true,
        tree,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to create conversation tree', error);
      
      return {
        success: false,
        error: `Tree creation failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  /**
   * Load a conversation tree from storage
   */
  async loadTree(id: string): Promise<TreeLifecycleResult> {
    const startTime = Date.now();

    if (!this.initialized) {
      return {
        success: false,
        error: 'Lifecycle service not initialized'
      };
    }

    try {
      const treePath = path.join(this.config.storageDirectory, `${id}.json`);
      
      // Check if tree file exists
      try {
        await fs.access(treePath);
      } catch {
        return {
          success: false,
          error: `Tree not found: ${id}`
        };
      }

      // Read and parse tree data
      const treeData = await fs.readFile(treePath, 'utf-8');
      const parsedTree = JSON.parse(treeData);

      // Reconstruct the tree with Map for nodes
      const tree: ConversationTree = {
        ...parsedTree,
        nodes: new Map(Object.entries(parsedTree.nodes))
      };

      // Validate tree integrity
      const validation = this.validateTreeStructure(tree);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Tree validation failed: ${validation.errors.join(', ')}`
        };
      }

      const endTime = Date.now();

      this.emit('tree-loaded', {
        treeId: id,
        timestamp: endTime
      });

      logger.info('Conversation tree loaded', {
        treeId: id,
        nodeCount: tree.nodes.size
      });

      return {
        success: true,
        tree,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to load conversation tree', error);
      
      return {
        success: false,
        error: `Tree loading failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  /**
   * Save a conversation tree to storage
   */
  async saveTree(tree: ConversationTree): Promise<TreeLifecycleResult> {
    const startTime = Date.now();

    if (!this.initialized) {
      return {
        success: false,
        error: 'Lifecycle service not initialized'
      };
    }

    try {
      // Check tree size
      const treeSize = this.calculateTreeSize(tree);
      if (treeSize > this.config.maxTreeSize) {
        return {
          success: false,
          error: `Tree size (${treeSize}) exceeds maximum allowed size (${this.config.maxTreeSize})`
        };
      }

      // Update metadata
      tree.lastModified = Date.now();
      tree.metadata.totalNodes = tree.nodes.size;

      // Prepare data for serialization
      const treeData = {
        ...tree,
        nodes: Object.fromEntries(tree.nodes)
      };

      // Save to file
      const treePath = path.join(this.config.storageDirectory, `${tree.id}.json`);
      const backupPath = path.join(this.config.storageDirectory, 'backups', `${tree.id}-${Date.now()}.json`);

      // Create backup if tree already exists
      try {
        await fs.access(treePath);
        await fs.copyFile(treePath, backupPath);
      } catch {
        // Tree doesn't exist yet, no backup needed
      }

      // Write tree data
      await fs.writeFile(treePath, JSON.stringify(treeData, null, 2), 'utf-8');

      const endTime = Date.now();

      this.emit('tree-saved', {
        treeId: tree.id,
        timestamp: endTime,
        size: treeSize
      });

      logger.debug('Conversation tree saved', {
        treeId: tree.id,
        nodeCount: tree.nodes.size,
        size: treeSize
      });

      return {
        success: true,
        tree,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to save conversation tree', error);
      
      return {
        success: false,
        error: `Tree saving failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  /**
   * Delete a conversation tree
   */
  async deleteTree(id: string): Promise<TreeLifecycleResult> {
    const startTime = Date.now();

    if (!this.initialized) {
      return {
        success: false,
        error: 'Lifecycle service not initialized'
      };
    }

    try {
      const treePath = path.join(this.config.storageDirectory, `${id}.json`);
      
      // Check if tree exists
      try {
        await fs.access(treePath);
      } catch {
        return {
          success: false,
          error: `Tree not found: ${id}`
        };
      }

      // Create final backup before deletion
      const backupPath = path.join(this.config.storageDirectory, 'backups', `${id}-deleted-${Date.now()}.json`);
      await fs.copyFile(treePath, backupPath);

      // Delete tree file
      await fs.unlink(treePath);

      const endTime = Date.now();

      this.emit('tree-deleted', {
        treeId: id,
        timestamp: endTime
      });

      logger.info('Conversation tree deleted', {
        treeId: id,
        backupPath
      });

      return {
        success: true,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to delete conversation tree', error);
      
      return {
        success: false,
        error: `Tree deletion failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  /**
   * List all available trees
   */
  async listTrees(): Promise<TreeLifecycleResult & { trees?: Array<{ id: string; name: string; created: number; lastModified: number }> }> {
    const startTime = Date.now();

    if (!this.initialized) {
      return {
        success: false,
        error: 'Lifecycle service not initialized'
      };
    }

    try {
      const files = await fs.readdir(this.config.storageDirectory);
      const treeFiles = files.filter(file => file.endsWith('.json') && !file.includes('backup'));

      const trees = await Promise.all(
        treeFiles.map(async (file) => {
          try {
            const treePath = path.join(this.config.storageDirectory, file);
            const treeData = await fs.readFile(treePath, 'utf-8');
            const tree = JSON.parse(treeData);
            
            return {
              id: tree.id,
              name: tree.name,
              created: tree.created,
              lastModified: tree.lastModified
            };
          } catch (error) {
            logger.warn(`Failed to read tree file: ${file}`, error);
            return null;
          }
        })
      );

      const validTrees = trees.filter(tree => tree !== null);
      const endTime = Date.now();

      logger.debug('Listed conversation trees', {
        count: validTrees.length
      });

      return {
        success: true,
        trees: validTrees,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to list conversation trees', error);
      
      return {
        success: false,
        error: `Tree listing failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  /**
   * Start auto-save functionality
   */
  private startAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      this.emit('auto-save-trigger', {
        timestamp: Date.now()
      });
    }, this.config.autoSaveInterval);

    logger.debug('Auto-save started', {
      interval: this.config.autoSaveInterval
    });
  }

  /**
   * Stop auto-save functionality
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
      
      this.emit('auto-save-stopped', {
        timestamp: Date.now()
      });

      logger.debug('Auto-save stopped');
    }
  }

  /**
   * Validate tree structure
   */
    private validateTreeStructure(tree: ConversationTree): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!tree.id) errors.push('Tree missing ID');
    if (!tree.name) errors.push('Tree missing name');
    if (!tree.rootId) errors.push('Tree missing root node ID');
    if (!tree.nodes) errors.push('Tree missing nodes');

    // Check root node exists
    if (tree.rootId && !tree.nodes.has(tree.rootId)) {
      errors.push('Root node not found in tree');
    }

    // Check active node exists
    if (tree.activeNodeId && !tree.nodes.has(tree.activeNodeId)) {
      errors.push('Active node not found in tree');
    }

    // Check for circular references
    if (this.hasCircularReference(tree)) {
      errors.push('Circular reference detected in tree');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for circular references in tree
   */
  private hasCircularReference(tree: ConversationTree): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = tree.nodes.get(nodeId);
      if (node) {
        for (const childId of node.children) {
          if (hasCycle(childId)) return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    return hasCycle(tree.rootId);
  }

  /**
   * Calculate tree size in bytes
   */
  private calculateTreeSize(tree: ConversationTree): number {
    return JSON.stringify({
      ...tree,
      nodes: Object.fromEntries(tree.nodes)
    }).length;
  }

  /**
   * Get storage directory
   */
  getStorageDirectory(): string {
    return this.config.storageDirectory;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TreeLifecycleConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart auto-save if interval changed
    if (config.autoSaveInterval !== undefined && this.config.enableAutoSave) {
      this.startAutoSave();
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopAutoSave();
    this.removeAllListeners();
    this.initialized = false;
    
    logger.debug('Conversation tree lifecycle service cleaned up');
  }
}

/**
 * Factory function for creating lifecycle service
 */
export function createConversationTreeLifecycleService(config?: Partial<TreeLifecycleConfig>): ConversationTreeLifecycleService {
  return new ConversationTreeLifecycleService(config);
}