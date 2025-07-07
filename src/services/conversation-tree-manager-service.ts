/**
 * Conversation Tree Manager Service
 * 
 * Single Responsibility: Manage conversation tree lifecycle and state
 * Following Gemini CLI's clean architecture patterns
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { conversationHistory } from '../utils/conversation-history.js';
import {
  ConversationTree,
  ConversationNode,
  ConversationTreeConfig,
  ConversationTreeMetadata,
  CreateTreeOptions,
  TreeEventData,
  ConversationTreeEvent
} from '../conversation/types.js';
import type { ConversationMessage } from '../utils/conversation-history.js';
import { ConversationTreeStorageService, type StorageConfig } from './conversation-tree-storage.js';

export interface TreeManagerConfig {
  storageDirectory: string;
  enableCompression: boolean;
  autoSaveInterval?: number;
  maxCachedTrees?: number;
}

export interface TreeManagerResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Tree Manager Service - Clean Architecture
 * Focus: Tree lifecycle and state management only
 */
export class ConversationTreeManagerService extends EventEmitter {
  private trees: Map<string, ConversationTree> = new Map();
  private activeTreeId?: string;
  private config: TreeManagerConfig;
  private initialized = false;
  private autoSaveInterval?: NodeJS.Timeout;
  private storageService: ConversationTreeStorageService;

    constructor(config: TreeManagerConfig) {
    super();
    this.config = config;
    
    // Initialize storage service
    this.storageService = new ConversationTreeStorageService({
      storageDirectory: config.storageDirectory,
      enableBackups: true,
      maxBackups: 5,
      compressionEnabled: config.enableCompression
    });
  }

  /**
   * Initialize the tree manager
   */
  async initialize(): Promise<TreeManagerResult> {
    try {
      // Initialize storage
      const storageResult = await this.storageService.initialize();
      if (!storageResult.success) {
        return {
          success: false,
          error: `Storage initialization failed: ${storageResult.error}`
        };
      }

      // Start auto-save if configured
      if (this.config.autoSaveInterval && this.config.autoSaveInterval > 0) {
        this.startAutoSave();
      }

      this.initialized = true;

            // Emit initialization event
      this.emit(ConversationTreeEvent.TREE_CREATED, {
        treeId: 'system',
        timestamp: Date.now(),
      } as TreeEventData);

      logger.info('Conversation tree manager initialized', {
        storageDir: this.config.storageDirectory,
        autoSave: !!this.config.autoSaveInterval
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize conversation tree manager', error);
      return {
        success: false,
        error: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create a new conversation tree
   */
    async createTree(name: string, options?: Partial<CreateTreeOptions>): Promise<TreeManagerResult<ConversationTree>> {
    this.ensureInitialized();

    try {
      const treeId = uuidv4();
      const rootNodeId = uuidv4();
      const timestamp = Date.now();

      // Get current conversation messages for initial node
      const messages = await conversationHistory.getRecentMessages(1000);

      // Create root node
            const rootNode: ConversationNode = {
        id: rootNodeId,
        name: options?.initialBranchName || 'main',
        description: 'Root conversation node',
        parentId: undefined,
        children: [],
        messages: messages,
        contextSnapshot: undefined,
        metadata: {
          model: messages[0]?.metadata?.model,
          messageCount: messages.length,
          size: JSON.stringify(messages).length,
          tags: options?.tags || [],
          branchName: options?.initialBranchName || 'main',
          isMainBranch: true,
          mergeStatus: 'unmerged',
          compressionRatio: undefined,
          loadTime: undefined,
          custom: options?.custom || {}
        },
        createdAt: timestamp,
        lastModified: timestamp,
        lastActive: timestamp
      };

      // Create tree metadata
      const treeMetadata: ConversationTreeMetadata = {
        totalNodes: 1,
        totalMessages: messages.length,
        maxDepth: 1,
        branchCount: 1,
        mergedBranches: 0,
        conflictedBranches: 0,
        tags: options?.tags || [],
        custom: options?.custom || {}
      };

      // Create tree
      const tree: ConversationTree = {
        id: treeId,
        name: name,
        description: options?.description,
        rootId: rootNodeId,
        nodes: new Map([[rootNodeId, rootNode]]),
        activeNodeId: rootNodeId,
        metadata: treeMetadata,
        createdAt: timestamp,
        lastModified: timestamp
      };

      // Store in memory
      this.trees.set(treeId, tree);
      this.activeTreeId = treeId;

      // Save to disk
      const saveResult = await this.storageService.saveTree(tree);
      if (!saveResult.success) {
        // Rollback memory state
        this.trees.delete(treeId);
        if (this.activeTreeId === treeId) {
          this.activeTreeId = undefined;
        }
        
        return {
          success: false,
          error: `Failed to save tree: ${saveResult.error}`
        };
      }

      // Emit event
      this.emit(ConversationTreeEvent.TREE_CREATED, {
        treeId: tree.id,
        tree: tree,
        timestamp: Date.now(),
        metadata: { name, options }
      } as TreeEventData);

      logger.info('Created new conversation tree', {
        treeId: tree.id,
        name: tree.name,
        rootNodeId: rootNode.id,
        messageCount: messages.length
      });

      return {
        success: true,
        data: tree
      };
    } catch (error) {
      logger.error('Failed to create conversation tree', error);
      return {
        success: false,
        error: `Tree creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Load an existing conversation tree
   */
  async loadTree(id: string): Promise<TreeManagerResult<ConversationTree>> {
    this.ensureInitialized();

    // Check if already loaded in memory
    if (this.trees.has(id)) {
      const tree = this.trees.get(id)!;
      this.activeTreeId = id;
      
      this.emit(ConversationTreeEvent.TREE_LOADED, {
        treeId: tree.id,
        tree: tree,
        timestamp: Date.now(),
        metadata: { cached: true }
      } as TreeEventData);

      return {
        success: true,
        data: tree
      };
    }

    try {
      // Load from storage
      const loadResult = await this.storageService.loadTree(id);
      if (!loadResult.success || !loadResult.data) {
        return {
          success: false,
          error: loadResult.error || 'Failed to load tree from storage'
        };
      }

      const tree = loadResult.data;

      // Store in memory
      this.trees.set(id, tree);
      this.activeTreeId = id;

      // Manage memory usage
      await this.manageCacheSize();

      this.emit(ConversationTreeEvent.TREE_LOADED, {
        treeId: tree.id,
        tree: tree,
        timestamp: Date.now(),
        metadata: { 
          loadTime: loadResult.timing?.duration,
          nodeCount: tree.nodes.size 
        }
      } as TreeEventData);

      logger.info('Loaded conversation tree', {
        treeId: tree.id,
        name: tree.name,
        nodeCount: tree.nodes.size,
        loadTime: loadResult.timing?.duration
      });

      return {
        success: true,
        data: tree
      };
    } catch (error) {
      logger.error('Failed to load conversation tree', { treeId: id, error });
      return {
        success: false,
        error: `Load failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete a conversation tree
   */
  async deleteTree(id: string): Promise<TreeManagerResult> {
    this.ensureInitialized();

    try {
      // Remove from memory first
      const wasActive = this.activeTreeId === id;
      this.trees.delete(id);
      
      if (wasActive) {
        this.activeTreeId = undefined;
      }

      // Delete from storage
      const deleteResult = await this.storageService.deleteTree(id);
      if (!deleteResult.success) {
        return {
          success: false,
          error: deleteResult.error || 'Failed to delete from storage'
        };
      }

      logger.info('Deleted conversation tree', { treeId: id });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete conversation tree', { treeId: id, error });
      return {
        success: false,
        error: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * List all available conversation trees
   */
    async listTrees(): Promise<TreeManagerResult<any[]>> {
    this.ensureInitialized();

    try {
      const listResult = await this.storageService.listTrees();
      return {
        success: listResult.success,
        data: listResult.data,
        error: listResult.error
      };
    } catch (error) {
      logger.error('Failed to list conversation trees', error);
      return {
        success: false,
        error: `List failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get the currently active tree
   */
  getActiveTree(): ConversationTree | null {
    if (!this.activeTreeId) {
      return null;
    }
    return this.trees.get(this.activeTreeId) || null;
  }

  /**
   * Set the active tree
   */
  async setActiveTree(treeId: string): Promise<TreeManagerResult<ConversationTree>> {
    this.ensureInitialized();

    // Load tree if not in memory
    if (!this.trees.has(treeId)) {
      const loadResult = await this.loadTree(treeId);
      if (!loadResult.success) {
        return loadResult;
      }
    }

    this.activeTreeId = treeId;
    const tree = this.trees.get(treeId)!;

    return {
      success: true,
      data: tree
    };
  }

  /**
   * Get tree by ID (load if necessary)
   */
  async getTree(treeId: string): Promise<TreeManagerResult<ConversationTree>> {
    this.ensureInitialized();

    if (this.trees.has(treeId)) {
      return {
        success: true,
        data: this.trees.get(treeId)!
      };
    }

    return await this.loadTree(treeId);
  }

  /**
   * Save the active tree
   */
  async saveActiveTree(): Promise<TreeManagerResult> {
    const tree = this.getActiveTree();
    if (!tree) {
      return {
        success: false,
        error: 'No active tree to save'
      };
    }

    const saveResult = await this.storageService.saveTree(tree);
    return {
      success: saveResult.success,
      error: saveResult.error
    };
  }

  /**
   * Update tree metadata
   */
  updateTreeMetadata(treeId: string, updates: Partial<ConversationTreeMetadata>): TreeManagerResult {
    const tree = this.trees.get(treeId);
    if (!tree) {
      return {
        success: false,
        error: `Tree not found: ${treeId}`
      };
    }

    tree.metadata = { ...tree.metadata, ...updates };
    tree.lastModified = Date.now();

    return { success: true };
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<TreeManagerResult<{
    totalTrees: number;
    totalSize: number;
    oldestTree: number;
    newestTree: number;
    memoryUsage: {
      loadedTrees: number;
      totalNodes: number;
    };
  }>> {
    try {
      const storageStats = await this.storageService.getStorageStats();
      if (!storageStats.success || !storageStats.data) {
        return {
          success: false,
          error: storageStats.error || 'Failed to get storage stats'
        };
      }

      // Add memory usage stats
      let totalNodes = 0;
      for (const tree of this.trees.values()) {
        totalNodes += tree.nodes.size;
      }

      return {
        success: true,
        data: {
          ...storageStats.data,
          memoryUsage: {
            loadedTrees: this.trees.size,
            totalNodes
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Stats failed: ${error instanceof Error ? error.message : 'Unknown error'}`
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

    this.autoSaveInterval = setInterval(async () => {
      try {
        await this.performAutoSave();
      } catch (error) {
        logger.warn('Auto-save failed', { error });
      }
    }, this.config.autoSaveInterval);

    logger.debug('Auto-save started', { interval: this.config.autoSaveInterval });
  }

  /**
   * Perform auto-save of active tree
   */
  private async performAutoSave(): Promise<void> {
    const tree = this.getActiveTree();
    if (!tree) {
      return;
    }

    try {
      const saveResult = await this.storageService.saveTree(tree);
      if (saveResult.success) {
        logger.debug('Auto-save completed', { treeId: tree.id });
      } else {
        logger.warn('Auto-save failed', { treeId: tree.id, error: saveResult.error });
      }
    } catch (error) {
      logger.warn('Auto-save operation failed', { treeId: tree.id, error });
    }
  }

  /**
   * Stop auto-save functionality
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
      logger.debug('Auto-save stopped');
    }
  }

  /**
   * Manage cache size to prevent memory bloat
   */
  private async manageCacheSize(): Promise<void> {
    const maxCached = this.config.maxCachedTrees || 10;
    
    if (this.trees.size <= maxCached) {
      return;
    }

    // Find least recently used trees (excluding active)
    const sortedTrees = Array.from(this.trees.entries())
      .filter(([id]) => id !== this.activeTreeId)
      .sort(([, a], [, b]) => a.lastModified - b.lastModified);

    const toRemove = sortedTrees.slice(0, this.trees.size - maxCached);
    
    for (const [treeId] of toRemove) {
      this.trees.delete(treeId);
      logger.debug('Evicted tree from cache', { treeId });
    }
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw createUserError('Tree manager service not initialized', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Call initialize() before using tree operations'
      });
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopAutoSave();
    this.trees.clear();
    this.activeTreeId = undefined;
    this.removeAllListeners();
    
    logger.info('Conversation tree manager cleaned up');
  }
}

// Factory function for creating tree manager service
export function createTreeManagerService(config: TreeManagerConfig): ConversationTreeManagerService {
  return new ConversationTreeManagerService(config);
}