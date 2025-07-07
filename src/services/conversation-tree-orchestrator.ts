/**
 * Conversation Tree Orchestrator - Clean Architecture
 * 
 * Single Responsibility: Coordinate conversation tree services
 * - Service composition and delegation
 * - Event forwarding and integration
 * - Unified API for conversation tree operations
 * - Cross-service coordination without business logic
 * 
 * Following Gemini CLI's clean orchestration patterns
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import type {
  ConversationTree,
  ConversationNode,
  CreateTreeOptions,
  BranchOptions,
  MergeStrategy
} from '../conversation/types.js';

// Import service types
import type { 
  ConversationTreeLifecycleService,
  TreeLifecycleResult,
  TreeLifecycleConfig
} from './conversation-tree-lifecycle.js';
import type { 
  ConversationTreeNavigationService,
  NavigationResult,
  NavigationConfig
} from './conversation-tree-navigation.js';

/**
 * Configuration for the orchestrator
 */
export interface ConversationTreeOrchestratorConfig {
  lifecycle?: Partial<TreeLifecycleConfig>;
  navigation?: Partial<NavigationConfig>;
  enableEventForwarding?: boolean;
  enableAutoSave?: boolean;
}

/**
 * Orchestrator result type
 */
export interface OrchestratorResult {
  success: boolean;
  tree?: ConversationTree;
  node?: ConversationNode;
  error?: string;
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  serviceResults?: {
    lifecycle?: TreeLifecycleResult;
    navigation?: NavigationResult;
  };
}

/**
 * Tree summary for overview operations
 */
export interface TreeSummary {
  id: string;
  name: string;
  activeNodeId: string;
  nodeCount: number;
  branchCount: number;
  maxDepth: number;
  lastModified: number;
  statistics: {
    totalMessages: number;
    averageDepth: number;
    messageCount: number;
  };
}

/**
 * Default configuration
 */
const DEFAULT_ORCHESTRATOR_CONFIG: ConversationTreeOrchestratorConfig = {
  enableEventForwarding: true,
  enableAutoSave: true
};

/**
 * Conversation Tree Orchestrator
 * Focus: Service coordination without business logic
 */
export class ConversationTreeOrchestrator extends EventEmitter {
  private config: ConversationTreeOrchestratorConfig;
  private lifecycleService: ConversationTreeLifecycleService;
  private navigationService: ConversationTreeNavigationService;
  private activeTrees: Map<string, ConversationTree> = new Map();
  private activeTreeId?: string;

  constructor(
    lifecycleService: ConversationTreeLifecycleService,
    navigationService: ConversationTreeNavigationService,
    config: ConversationTreeOrchestratorConfig = {}
  ) {
    super();
    
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
    this.lifecycleService = lifecycleService;
    this.navigationService = navigationService;

    // Set up event forwarding if enabled
    if (this.config.enableEventForwarding) {
      this.setupEventForwarding();
    }

    logger.debug('Conversation tree orchestrator initialized');
  }

  // ===== TREE LIFECYCLE OPERATIONS =====

  /**
   * Initialize the orchestrator and all services
   */
    async initialize(configDir?: string): Promise<OrchestratorResult> {
    const startTime = Date.now();

    try {
      // Initialize lifecycle service
      const lifecycleResult = await this.lifecycleService.initialize(configDir);
      
      if (!lifecycleResult.success) {
        return {
          success: false,
          error: `Lifecycle service initialization failed: ${lifecycleResult.error}`,
        };
      }

      const endTime = Date.now();

      this.emit('orchestrator-initialized', {
        timestamp: endTime,
        configDir
      });

      logger.info('Conversation tree orchestrator initialized successfully');

      return {
        success: true,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        },
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to initialize conversation tree orchestrator', error);
      
      return {
        success: false,
        error: `Orchestrator initialization failed: ${error instanceof Error ? error.message : String(error)}`,
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
    async createTree(name: string, options: CreateTreeOptions = {}): Promise<OrchestratorResult> {
    const startTime = Date.now();

    try {
      // Delegate to lifecycle service
      const lifecycleResult = await this.lifecycleService.createTree(name, options);
      
      if (!lifecycleResult.success || !lifecycleResult.tree) {
        return {
          success: false,
          error: lifecycleResult.error,
        };
      }

      // Add to active trees
      const tree = lifecycleResult.tree;
      this.activeTrees.set(tree.id, tree);
      
      // Set as active if no current active tree
      if (!this.activeTreeId) {
        this.activeTreeId = tree.id;
      }

      const endTime = Date.now();

      this.emit('tree-created', {
        treeId: tree.id,
        name: tree.name,
        timestamp: endTime
      });

      logger.info('Tree created through orchestrator', {
        treeId: tree.id,
        name: tree.name
      });

      return {
        success: true,
        tree,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        },
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to create tree through orchestrator', error);
      
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
   * Load an existing conversation tree
   */
    async loadTree(id: string): Promise<OrchestratorResult> {
    const startTime = Date.now();

    try {
      // Delegate to lifecycle service
      const lifecycleResult = await this.lifecycleService.loadTree(id);
      
      if (!lifecycleResult.success || !lifecycleResult.tree) {
        return {
          success: false,
          error: lifecycleResult.error,
        };
      }

      // Add to active trees
      const tree = lifecycleResult.tree;
      this.activeTrees.set(tree.id, tree);

      const endTime = Date.now();

      this.emit('tree-loaded', {
        treeId: tree.id,
        timestamp: endTime
      });

      logger.info('Tree loaded through orchestrator', {
        treeId: tree.id,
        nodeCount: tree.nodes.size
      });

      return {
        success: true,
        tree,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        },
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to load tree through orchestrator', error);
      
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
   * Save a conversation tree
   */
    async saveTree(treeId?: string): Promise<OrchestratorResult> {
    const startTime = Date.now();

    try {
      const targetTreeId = treeId || this.activeTreeId;
      if (!targetTreeId) {
        return {
          success: false,
          error: 'No tree ID provided and no active tree'
        };
      }

      const tree = this.activeTrees.get(targetTreeId);
      if (!tree) {
        return {
          success: false,
          error: `Tree not found in active trees: ${targetTreeId}`
        };
      }

      // Delegate to lifecycle service
      const lifecycleResult = await this.lifecycleService.saveTree(tree);
      
      const endTime = Date.now();

      if (lifecycleResult.success) {
        this.emit('tree-saved', {
          treeId: targetTreeId,
          timestamp: endTime
        });

        logger.debug('Tree saved through orchestrator', {
          treeId: targetTreeId
        });
      }

      return {
        success: lifecycleResult.success,
        tree,
        error: lifecycleResult.error,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        },
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to save tree through orchestrator', error);
      
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
    async deleteTree(id: string): Promise<OrchestratorResult> {
    const startTime = Date.now();

    try {
      // Delegate to lifecycle service
      const lifecycleResult = await this.lifecycleService.deleteTree(id);
      
      if (lifecycleResult.success) {
        // Remove from active trees
        this.activeTrees.delete(id);
        
        // Clear active tree if it was deleted
        if (this.activeTreeId === id) {
          this.activeTreeId = undefined;
        }
      }

      const endTime = Date.now();

      if (lifecycleResult.success) {
        this.emit('tree-deleted', {
          treeId: id,
          timestamp: endTime
        });

        logger.info('Tree deleted through orchestrator', {
          treeId: id
        });
      }

      return {
        success: lifecycleResult.success,
        error: lifecycleResult.error,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        },
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to delete tree through orchestrator', error);
      
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

  // ===== NAVIGATION OPERATIONS =====

  /**
   * Navigate to a specific node
   */
    async navigateToNode(nodeId: string, treeId?: string): Promise<OrchestratorResult> {
    const startTime = Date.now();

    try {
      const tree = this.getActiveTree(treeId);
      if (!tree) {
        return {
          success: false,
          error: 'No active tree found'
        };
      }

      // Delegate to navigation service
      const navigationResult = await this.navigationService.navigateToNode(tree, nodeId);
      
      if (navigationResult.success) {
        // Auto-save if enabled
        if (this.config.enableAutoSave) {
          await this.saveTree(tree.id);
        }
      }

      const endTime = Date.now();

      return {
        success: navigationResult.success,
        tree,
        node: navigationResult.node,
        error: navigationResult.error,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        },
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to navigate to node through orchestrator', error);
      
      return {
        success: false,
        error: `Navigation failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  /**
   * Navigate to parent node
   */
  async navigateToParent(treeId?: string): Promise<OrchestratorResult> {
    const startTime = Date.now();

    try {
      const tree = this.getActiveTree(treeId);
      if (!tree) {
        return {
          success: false,
          error: 'No active tree found'
        };
      }

      // Delegate to navigation service
      const navigationResult = await this.navigationService.navigateToParent(tree);
      
      if (navigationResult.success && this.config.enableAutoSave) {
        await this.saveTree(tree.id);
      }

      const endTime = Date.now();

      return {
        success: navigationResult.success,
        tree,
        node: navigationResult.node,
        error: navigationResult.error,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        },
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to navigate to parent through orchestrator', error);
      
      return {
        success: false,
        error: `Parent navigation failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  async navigateToChild(childIndex = 0, treeId?: string): Promise<OrchestratorResult> {
    const startTime = Date.now();

    try {
      const tree = this.getActiveTree(treeId);
      if (!tree) {
        return {
          success: false,
          error: 'No active tree found'
        };
      }

      // Delegate to navigation service
      const navigationResult = await this.navigationService.navigateToChild(tree, childIndex);
      
      if (navigationResult.success && this.config.enableAutoSave) {
        await this.saveTree(tree.id);
      }

      const endTime = Date.now();

      return {
        success: navigationResult.success,
        tree,
        node: navigationResult.node,
        error: navigationResult.error,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        },
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to navigate to child through orchestrator', error);
      
      return {
        success: false,
        error: `Child navigation failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  // ===== QUERY OPERATIONS =====

  /**
   * Get the active tree
   */
  getActiveTree(treeId?: string): ConversationTree | null {
    const targetTreeId = treeId || this.activeTreeId;
    if (!targetTreeId) {
      return null;
    }
    return this.activeTrees.get(targetTreeId) || null;
  }

  /**
   * Set the active tree
   */
  setActiveTree(treeId: string): boolean {
    if (this.activeTrees.has(treeId)) {
      this.activeTreeId = treeId;
      
      this.emit('active-tree-changed', {
        treeId,
        timestamp: Date.now()
      });

      logger.debug('Active tree changed', { treeId });
      return true;
    }
    return false;
  }

  /**
   * Get active node
   */
  getActiveNode(treeId?: string): ConversationNode | null {
    const tree = this.getActiveTree(treeId);
    if (!tree) {
      return null;
    }
    return this.navigationService.getActiveNode(tree);
  }

  /**
   * Get a specific node
   */
  getNode(nodeId: string, treeId?: string): ConversationNode | null {
    const tree = this.getActiveTree(treeId);
    if (!tree) {
      return null;
    }
    return this.navigationService.getNode(tree, nodeId);
  }

  /**
   * Get navigation path
   */
  getNavigationPath(nodeId?: string, treeId?: string): ConversationNode[] {
    const tree = this.getActiveTree(treeId);
    if (!tree) {
      return [];
    }
    return this.navigationService.getNavigationPath(tree, nodeId);
  }

  /**
   * Get tree summary
   */
  getTreeSummary(treeId?: string): TreeSummary | null {
    const tree = this.getActiveTree(treeId);
    if (!tree) {
      return null;
    }

    const statistics = this.navigationService.getTreeStatistics(tree);

    return {
      id: tree.id,
      name: tree.name,
      activeNodeId: tree.activeNodeId,
      nodeCount: tree.nodes.size,
      branchCount: statistics.branchCount,
      maxDepth: statistics.maxDepth,
      lastModified: tree.lastModified,
      statistics: {
        totalMessages: statistics.messageCount,
        averageDepth: statistics.averageDepth,
        messageCount: statistics.messageCount
      }
    };
  }

  /**
   * List all available trees
   */
    async listTrees(): Promise<OrchestratorResult & { trees?: any[] }> {
    const startTime = Date.now();

    try {
      // Delegate to lifecycle service
      const lifecycleResult = await this.lifecycleService.listTrees();
      
      const endTime = Date.now();

      return {
        success: lifecycleResult.success,
        trees: lifecycleResult.trees,
        error: lifecycleResult.error,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        },
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to list trees through orchestrator', error);
      
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

  // ===== EVENT FORWARDING =====

  /**
   * Set up event forwarding from services
   */
  private setupEventForwarding(): void {
    // Forward lifecycle events
    this.lifecycleService.on('lifecycle-initialized', (data) => {
      this.emit('lifecycle-initialized', data);
    });

    this.lifecycleService.on('tree-created', (data) => {
      this.emit('tree-created', data);
    });

    this.lifecycleService.on('tree-loaded', (data) => {
      this.emit('tree-loaded', data);
    });

    this.lifecycleService.on('tree-saved', (data) => {
      this.emit('tree-saved', data);
    });

    this.lifecycleService.on('tree-deleted', (data) => {
      this.emit('tree-deleted', data);
    });

    this.lifecycleService.on('auto-save-trigger', async (data) => {
      if (this.activeTreeId) {
        await this.saveTree(this.activeTreeId);
      }
    });

    // Forward navigation events
    this.navigationService.on('node-navigated', (data) => {
      this.emit('node-navigated', data);
    });

    this.navigationService.on('parent-navigated', (data) => {
      this.emit('parent-navigated', data);
    });

    this.navigationService.on('child-navigated', (data) => {
      this.emit('child-navigated', data);
    });

    this.navigationService.on('caches-cleared', (data) => {
      this.emit('caches-cleared', data);
    });

    logger.debug('Event forwarding set up for conversation tree orchestrator');
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.navigationService.clearCaches();
    
    this.emit('all-caches-cleared', {
      timestamp: Date.now()
    });

    logger.debug('All caches cleared through orchestrator');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConversationTreeOrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update service configurations
    if (config.lifecycle) {
      this.lifecycleService.updateConfig(config.lifecycle);
    }
    
    if (config.navigation) {
      this.navigationService.updateConfig(config.navigation);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Save all active trees
    if (this.config.enableAutoSave) {
      for (const [treeId] of this.activeTrees) {
        try {
          await this.saveTree(treeId);
        } catch (error) {
          logger.warn(`Failed to save tree during cleanup: ${treeId}`, error);
        }
      }
    }

    // Cleanup services
    this.lifecycleService.cleanup();
    this.navigationService.cleanup();

    // Clear state
    this.activeTrees.clear();
    this.activeTreeId = undefined;
    this.removeAllListeners();
    
    logger.info('Conversation tree orchestrator cleaned up');
  }
}

/**
 * Factory function for creating orchestrator
 */
export function createConversationTreeOrchestrator(
  lifecycleService: ConversationTreeLifecycleService,
  navigationService: ConversationTreeNavigationService,
  config?: ConversationTreeOrchestratorConfig
): ConversationTreeOrchestrator {
  return new ConversationTreeOrchestrator(lifecycleService, navigationService, config);
} 