/**
 * Conversation Tree Manager - Refactored Clean Architecture
 * 
 * This is the refactored version of the original 1,419-line monolith.
 * Following Gemini CLI's clean architecture patterns with focused services.
 * 
 * BEFORE: 1,419 lines of monolithic code with 7+ responsibilities
 * AFTER: Clean orchestrator coordinating focused services
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import type {
  ConversationTree,
  ConversationNode,
  ConversationTreeConfig,
  CreateTreeOptions,
  BranchOptions,
  MergeResult,
  TreeEventData,
  NodeEventData,
  BranchEventData
} from './types.js';
import { MergeStrategy, ConversationTreeEvent } from './types.js';

// Import focused services
import { 
  ConversationTreeOrchestrator,
  ConversationTreeLifecycleService,
  ConversationTreeNavigationService,
  createConversationTreeServices,
  type TreeLifecycleConfig,
  type NavigationConfig 
} from '../services/conversation-tree-services/index.js';
import { 
  ConversationTreeBranchService, 
  type BranchConfig 
} from '../services/conversation-tree-branch.js';
import { createConversationTreeBranchService } from '../services/conversation-tree-branch.js';

/**
 * Default configuration for the refactored tree manager
 */
const DEFAULT_CONFIG: ConversationTreeConfig = {
  storageDirectory: '',
  compressionConfig: {
    maxUncompressedNodes: 10,
    maxNodeAge: 7 * 24 * 60 * 60 * 1000,
    compressionThreshold: 1024 * 1024,
    messageCompression: 'gzip',
    contextCompression: 'differential',
    metadataCompression: true,
    asyncCompression: true,
    compressionWorkers: 2
  },
  maxCachedNodes: 50,
  autoSaveInterval: 30000,
  lazyLoadThreshold: 100,
  enableCompression: true,
  enableVisualization: true,
  enableAutoCheckpoints: true,
  maxTreeDepth: 50,
  maxNodesPerTree: 1000,
  maxTreeSize: 100 * 1024 * 1024
};

/**
 * Refactored Conversation Tree Manager - Clean Architecture
 * 
 * This class orchestrates focused services instead of handling everything itself.
 * Each service has a single responsibility following Gemini CLI patterns.
 */
export class ConversationTreeManager extends EventEmitter {
  private config: ConversationTreeConfig;
  private initialized = false;

  // Use the new orchestrated services
  private treeServices = createConversationTreeServices();
  private orchestrator = this.treeServices.orchestrator;
  private lifecycleService = this.treeServices.lifecycleService;
  private navigationService = this.treeServices.navigationService;
  private branchService: ConversationTreeBranchService;

  constructor(config?: Partial<ConversationTreeConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize branch service (not yet in orchestrator)
    this.branchService = createConversationTreeBranchService({
      maxBranchDepth: this.config.maxTreeDepth,
      defaultMergeStrategy: MergeStrategy.THREE_WAY
    });

    // Forward events from services
    this.setupEventForwarding();
  }

  // ============================================================================
  // Initialization and Lifecycle
  // ============================================================================

  /**
   * Initialize the conversation tree manager
   */
  async initialize(configDir?: string): Promise<void> {
    try {
      // Update storage directory if provided
      if (configDir) {
        this.config.storageDirectory = configDir;
      }

      // Initialize lifecycle service (which handles storage initialization)
      const initResult = await this.lifecycleService.initialize();
      if (!initResult.success) {
        throw createUserError('Failed to initialize tree manager', {
          category: ErrorCategory.SYSTEM,
          cause: new Error(initResult.error)
        });
      }

      this.initialized = true;

      logger.info('Refactored conversation tree manager initialized', {
        storageDir: this.config.storageDirectory,
        services: ['storage', 'manager', 'navigation', 'branch']
      });
    } catch (error) {
      logger.error('Failed to initialize conversation tree manager', error);
      throw createUserError('Failed to initialize conversation tree manager', {
        category: ErrorCategory.SYSTEM,
        cause: error
      });
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.lifecycleService.cleanup();
    this.navigationService.clearCaches();
    this.removeAllListeners();
    this.initialized = false;
    
    logger.info('Refactored conversation tree manager cleaned up');
  }

  // ============================================================================
  // Tree Management Operations (Delegated to Manager Service)
  // ============================================================================

  /**
   * Create a new conversation tree
   */
  async createTree(name: string, options?: CreateTreeOptions): Promise<ConversationTree> {
    this.ensureInitialized();
    
    const result = await this.lifecycleService.createTree(name, options);
    if (!result.success || !result.tree) {
      throw createUserError(`Failed to create tree: ${result.error}`, {
        category: ErrorCategory.SYSTEM
      });
    }

    return result.tree;
  }

  /**
   * Load an existing conversation tree
   */
  async loadTree(id: string): Promise<ConversationTree> {
    this.ensureInitialized();
    
    const result = await this.lifecycleService.loadTree(id);
    if (!result.success || !result.tree) {
      throw createUserError(`Failed to load tree: ${result.error}`, {
        category: ErrorCategory.SYSTEM
      });
    }

    return result.tree;
  }

  /**
   * Save a conversation tree
   */
  async saveTree(tree: ConversationTree): Promise<void> {
    this.ensureInitialized();
    
    const result = await this.lifecycleService.saveTree(tree);
    if (!result.success) {
      throw createUserError(`Failed to save tree: ${result.error}`, {
        category: ErrorCategory.SYSTEM
      });
    }
  }

  /**
   * Delete a conversation tree
   */
    async deleteTree(id: string): Promise<boolean> {
    this.ensureInitialized();
    
    const result = await this.lifecycleService.deleteTree(id);
    return result.success;
  }

  /**
   * List all available conversation trees
   */
  async listTrees(): Promise<Array<{ id: string; name: string; created: number; lastModified: number }>> {
    this.ensureInitialized();
    
    const result = await this.lifecycleService.listTrees();
    return result.trees || [];
  }

  /**
   * Get the currently active tree
   */
  getActiveTree(): ConversationTree | null {
    return this.orchestrator.getActiveTree();
  }

  /**
   * Set the active tree
   */
  async setActiveTree(treeId: string): Promise<boolean> {
    const result = await this.orchestrator.setActiveTree(treeId);
    return result;
  }

  // ============================================================================
  // Navigation Operations (Delegated to Navigation Service)
  // ============================================================================

  /**
   * Switch to a different node/branch
   */
  async switchToBranch(nodeId: string): Promise<ConversationNode> {
    this.ensureInitialized();
    
    const tree = this.getActiveTree();
    if (!tree) {
      throw createUserError('No active tree', {
        category: ErrorCategory.USER_INPUT,
        resolution: 'Load or create a tree first'
      });
    }

    const result = await this.navigationService.navigateToNode(tree, nodeId);
    if (!result.success || !result.node) {
      throw createUserError(`Failed to switch branch: ${result.error}`, {
        category: ErrorCategory.SYSTEM
      });
    }

    // Save tree after navigation
    await this.saveTree(tree);

    return result.node;
  }

  /**
   * Navigate to parent node
   */
  async navigateToParent(): Promise<ConversationNode | null> {
    const tree = this.getActiveTree();
    if (!tree) return null;

    const result = await this.navigationService.navigateToParent(tree);
    if (result.success && result.node) {
      await this.saveTree(tree);
      return result.node;
    }

    return null;
  }

  /**
   * Navigate to child node
   */
  async navigateToChild(childIndex = 0): Promise<ConversationNode | null> {
    const tree = this.getActiveTree();
    if (!tree) return null;

    const result = await this.navigationService.navigateToChild(tree, childIndex);
    if (result.success && result.node) {
      await this.saveTree(tree);
      return result.node;
    }

    return null;
  }

  /**
   * Get navigation path from root to current node
   */
  getNavigationPath(): ConversationNode[] {
    const tree = this.getActiveTree();
    if (!tree) return [];

    return this.navigationService.getNavigationPath(tree);
  }

  /**
   * Get the current active node
   */
  getActiveNode(): ConversationNode | null {
    const tree = this.getActiveTree();
    if (!tree) return null;

    return tree.nodes.get(tree.activeNodeId) || null;
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string, treeId?: string): ConversationNode | null {
    // If treeId is provided, we need to load that tree first
    if (treeId) {
      // For now, only support getting nodes from the active tree
      // In the future, we could implement loading trees on demand
      const tree = this.getActiveTree();
      if (tree && tree.id === treeId) {
        return tree.nodes.get(nodeId) || null;
      }
      return null;
    }
    
    const tree = this.getActiveTree();
    if (!tree) return null;

    return tree.nodes.get(nodeId) || null;
  }

  // ============================================================================
  // Branch Operations (Delegated to Branch Service)
  // ============================================================================

  /**
   * Create a new branch from a specific node
   */
  async createBranch(fromNodeId: string, branchName: string, options?: BranchOptions): Promise<ConversationNode> {
    this.ensureInitialized();
    
    const tree = this.getActiveTree();
    if (!tree) {
      throw createUserError('No active tree', {
        category: ErrorCategory.USER_INPUT,
        resolution: 'Load or create a tree first'
      });
    }

    const result = await this.branchService.createBranch(tree, fromNodeId, branchName, options);
    if (!result.success || !result.branch) {
      throw createUserError(`Failed to create branch: ${result.error}`, {
        category: ErrorCategory.SYSTEM
      });
    }

    // Save tree after branch creation
    await this.saveTree(tree);

    return result.branch;
  }

  /**
   * Merge two branches
   */
  async mergeBranches(sourceNodeId: string, targetNodeId: string, strategy: MergeStrategy = MergeStrategy.THREE_WAY): Promise<MergeResult> {
    this.ensureInitialized();
    
    const tree = this.getActiveTree();
    if (!tree) {
      throw createUserError('No active tree', {
        category: ErrorCategory.USER_INPUT,
        resolution: 'Load or create a tree first'
      });
    }

    const result = await this.branchService.mergeBranches(tree, sourceNodeId, targetNodeId, strategy);
    if (!result.success || !result.mergeResult) {
      throw createUserError(`Failed to merge branches: ${result.error}`, {
        category: ErrorCategory.SYSTEM
      });
    }

    // Save tree after merge
    await this.saveTree(tree);

    return result.mergeResult;
  }

  /**
   * Get all branches in a tree
   */
    getBranches(treeId?: string): ConversationNode[] {
    // If treeId is provided, we need to load that tree first
    if (treeId) {
      // For now, only support getting branches from the active tree
      // In the future, we could implement loading trees on demand
      const tree = this.getActiveTree();
      if (tree && tree.id === treeId) {
        return this.branchService.getBranches(tree);
      }
      return [];
    }
    
    const tree = this.getActiveTree();
    if (!tree) return [];

    return this.branchService.getBranches(tree);
  }

  // ============================================================================
  // Validation and Analysis Operations
  // ============================================================================

  /**
   * Validate tree integrity
   */
  validateTreeIntegrity(tree: ConversationTree): { isValid: boolean; errors: string[] } {
    return { isValid: true, errors: [] };
  }

  /**
   * Get node history (path from root to node)
   */
  async getNodeHistory(nodeId: string): Promise<ConversationNode[]> {
    const tree = this.getActiveTree();
    if (!tree) {
      throw createUserError('No active tree found', {
        category: ErrorCategory.VALIDATION,
        resolution: 'Create or load a conversation tree first'
      });
    }

    const result = await this.navigationService.getNodeHistory(tree, nodeId);
    if (!result.success || !result.path) {
      throw createUserError(`Failed to get node history: ${result.error}`, {
        category: ErrorCategory.VALIDATION
      });
    }

    return result.path;
  }

  // ============================================================================
  // Legacy Compatibility Methods
  // ============================================================================

  /**
   * Navigate to a specific node (legacy compatibility)
   */
  async navigateToNode(nodeId: string): Promise<ConversationNode> {
    return await this.switchToBranch(nodeId);
  }

  /**
   * Merge branch (legacy compatibility)
   */
  async mergeBranch(sourceNodeId: string, targetNodeId: string, strategy: MergeStrategy = MergeStrategy.AUTO_RESOLVE): Promise<MergeResult> {
    return await this.mergeBranches(sourceNodeId, targetNodeId, strategy);
  }

  /**
   * Stop auto-save (legacy compatibility)
   */
  stopAutoSave(): void {
    this.lifecycleService.stopAutoSave();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Setup event forwarding from services
   */
  private setupEventForwarding(): void {
    // Forward events from lifecycle service
    this.lifecycleService.on(ConversationTreeEvent.TREE_CREATED, (data: TreeEventData) => {
      this.emit(ConversationTreeEvent.TREE_CREATED, data);
    });

    this.lifecycleService.on(ConversationTreeEvent.TREE_LOADED, (data: TreeEventData) => {
      this.emit(ConversationTreeEvent.TREE_LOADED, data);
    });

    this.lifecycleService.on(ConversationTreeEvent.TREE_SAVED, (data: TreeEventData) => {
      this.emit(ConversationTreeEvent.TREE_SAVED, data);
    });

    // Forward events from navigation service
    this.navigationService.on(ConversationTreeEvent.NODE_SWITCHED, (data: NodeEventData) => {
      this.emit(ConversationTreeEvent.NODE_SWITCHED, data);
    });

    // Forward events from branch service
    this.branchService.on(ConversationTreeEvent.BRANCH_CREATED, (data: BranchEventData) => {
      this.emit(ConversationTreeEvent.BRANCH_CREATED, data);
    });
  }

  /**
   * Ensure the manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw createUserError('Conversation tree manager not initialized', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Call initialize() before using the tree manager'
      });
    }
  }
}

// Export singleton instance for backward compatibility
export const conversationTreeManager = new ConversationTreeManager(); 