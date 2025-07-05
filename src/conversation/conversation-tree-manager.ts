/**
 * Conversation Tree Manager
 * 
 * This module provides the core functionality for managing conversation trees,
 * including branching, merging, and tree operations. It builds upon the existing
 * ConversationStateManager to add tree-based conversation management.
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { conversationHistory } from '../utils/conversation-history.js';
import { conversationState } from '../utils/conversation-state.js';
import type {
  ConversationTree,
  ConversationNode,
  ConversationTreeConfig,
  ConversationTreeMetadata,
  ConversationNodeMetadata,
  BranchOptions,
  BranchPoint,
  MergeResult,
  MergeConflict,
  CreateTreeOptions,
  TreeAnalysis,
  OptimizationOptions,
  OptimizationResult,
  SearchQuery,
  SearchResult,
  TreeVisualizationData,
  TreeVisualizationOptions,
  TreeEventData,
  NodeEventData,
  BranchEventData
} from './types.js';
import { ConversationTreeEvent, MergeStrategy } from './types.js';
import type { ConversationMessage } from '../utils/conversation-history.js';

/**
 * Default configuration for conversation tree management
 */
const DEFAULT_CONFIG: ConversationTreeConfig = {
  storageDirectory: '',
  compressionConfig: {
    maxUncompressedNodes: 10,
    maxNodeAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    compressionThreshold: 1024 * 1024, // 1MB
    messageCompression: 'gzip',
    contextCompression: 'differential',
    metadataCompression: true,
    asyncCompression: true,
    compressionWorkers: 2
  },
  maxCachedNodes: 50,
  autoSaveInterval: 30000, // 30 seconds
  lazyLoadThreshold: 100,
  enableCompression: true,
  enableVisualization: true,
  enableAutoCheckpoints: true,
  maxTreeDepth: 50,
  maxNodesPerTree: 1000,
  maxTreeSize: 100 * 1024 * 1024 // 100MB
};

/**
 * Core Conversation Tree Manager
 */
export class ConversationTreeManager extends EventEmitter {
  private trees: Map<string, ConversationTree> = new Map();
  private activeTreeId?: string;
  private storageDir: string;
  private config: ConversationTreeConfig;
  private initialized = false;
  private nodeCache: Map<string, ConversationNode> = new Map();
  private autoSaveInterval?: NodeJS.Timeout;

  constructor(config?: Partial<ConversationTreeConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storageDir = this.config.storageDirectory;
  }

  /**
   * Initialize the conversation tree manager
   */
  async initialize(configDir?: string): Promise<void> {
    try {
      // Set storage directory
      this.storageDir = configDir 
        ? path.join(configDir, 'conversations', 'trees')
        : path.join(process.env.HOME || process.env.USERPROFILE || '.', '.vibex', 'conversations', 'trees');
      
      this.config.storageDirectory = this.storageDir;

      // Ensure directory structure exists
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.mkdir(path.join(this.storageDir, 'nodes'), { recursive: true });
      await fs.mkdir(path.join(this.storageDir, 'visualization'), { recursive: true });

      // Start auto-save if enabled
      if (this.config.autoSaveInterval > 0) {
        this.startAutoSave();
      }

      this.initialized = true;
      
      this.emit(ConversationTreeEvent.TREE_CREATED, {
        treeId: 'system',
        timestamp: Date.now(),
        metadata: { action: 'manager_initialized' }
      } as TreeEventData);

      logger.info('Conversation tree manager initialized', {
        storageDir: this.storageDir,
        config: this.config
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
  }

  /**
   * Perform auto-save of active tree
   */
  private async performAutoSave(): Promise<void> {
    if (!this.activeTreeId) {
      return;
    }

    const tree = this.trees.get(this.activeTreeId);
    if (tree) {
      try {
        await this.saveTree(tree);
        logger.debug('Auto-save completed', { treeId: tree.id });
      } catch (error) {
        logger.warn('Auto-save operation failed', { treeId: tree.id, error });
      }
    }
  }

  /**
   * Stop auto-save functionality
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }
  }

  // ============================================================================
  // Core Tree Operations
  // ============================================================================

  /**
   * Create a new conversation tree
   */
  async createTree(name: string, options?: CreateTreeOptions): Promise<ConversationTree> {
    this.ensureInitialized();

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
      branchPoint: undefined,
      messages: messages,
      contextSnapshot: undefined, // Will be set by context integration
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

    // Store tree
    this.trees.set(treeId, tree);
    this.activeTreeId = treeId;

    // Cache root node
    this.nodeCache.set(rootNodeId, rootNode);

    // Save to disk
    await this.saveTree(tree);

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

    return tree;
  }

  /**
   * Load an existing conversation tree
   */
  async loadTree(id: string): Promise<ConversationTree> {
    this.ensureInitialized();

    // Check if already loaded
    if (this.trees.has(id)) {
      const tree = this.trees.get(id)!;
      this.activeTreeId = id;
      
      this.emit(ConversationTreeEvent.TREE_LOADED, {
        treeId: tree.id,
        tree: tree,
        timestamp: Date.now(),
        metadata: { cached: true }
      } as TreeEventData);

      return tree;
    }

    try {
      const startTime = Date.now();
      
      // Load tree metadata
      const treeMetadataPath = path.join(this.storageDir, `${id}`, 'metadata.json');
      const metadataContent = await fs.readFile(treeMetadataPath, 'utf8');
      const treeData = JSON.parse(metadataContent) as ConversationTree;

      // Load nodes
      const nodesDir = path.join(this.storageDir, `${id}`, 'nodes');
      const nodeFiles = await fs.readdir(nodesDir);
      const nodes = new Map<string, ConversationNode>();

      for (const nodeFile of nodeFiles) {
        if (nodeFile.endsWith('.json')) {
          const nodeId = nodeFile.replace('.json', '');
          const nodePath = path.join(nodesDir, nodeFile);
          const nodeContent = await fs.readFile(nodePath, 'utf8');
          const node = JSON.parse(nodeContent) as ConversationNode;
          nodes.set(nodeId, node);
          
          // Cache recently active nodes
          if (Date.now() - node.lastActive < 24 * 60 * 60 * 1000) { // 24 hours
            this.nodeCache.set(nodeId, node);
          }
        }
      }

      // Reconstruct tree with Map
      const tree: ConversationTree = {
        ...treeData,
        nodes: nodes
      };

      // Store in memory
      this.trees.set(id, tree);
      this.activeTreeId = id;

      const loadTime = Date.now() - startTime;

      this.emit(ConversationTreeEvent.TREE_LOADED, {
        treeId: tree.id,
        tree: tree,
        timestamp: Date.now(),
        metadata: { loadTime, nodeCount: nodes.size }
      } as TreeEventData);

      logger.info('Loaded conversation tree', {
        treeId: tree.id,
        name: tree.name,
        nodeCount: nodes.size,
        loadTime
      });

      return tree;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw createUserError(`Conversation tree not found: ${id}`, {
          category: ErrorCategory.USER_INPUT,
          resolution: 'Use listTrees() to see available trees'
        });
      }

      throw createUserError(`Failed to load conversation tree: ${id}`, {
        category: ErrorCategory.FILE_SYSTEM,
        cause: error
      });
    }
  }

  /**
   * Save a conversation tree to disk
   */
  async saveTree(tree: ConversationTree): Promise<void> {
    this.ensureInitialized();

    try {
      const startTime = Date.now();
      const treeDir = path.join(this.storageDir, tree.id);
      
      // Ensure tree directory exists
      await fs.mkdir(treeDir, { recursive: true });
      await fs.mkdir(path.join(treeDir, 'nodes'), { recursive: true });

      // Save tree metadata (without nodes Map which can't be serialized)
      const treeMetadata = {
        ...tree,
        nodes: undefined // Will save nodes separately
      };
      
      const metadataPath = path.join(treeDir, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(treeMetadata, null, 2), 'utf8');

      // Save individual nodes
      const nodesDir = path.join(treeDir, 'nodes');
      for (const [nodeId, node] of tree.nodes) {
        const nodePath = path.join(nodesDir, `${nodeId}.json`);
        await fs.writeFile(nodePath, JSON.stringify(node, null, 2), 'utf8');
      }

      // Update tree's last modified time
      tree.lastModified = Date.now();

      const saveTime = Date.now() - startTime;

      this.emit(ConversationTreeEvent.TREE_SAVED, {
        treeId: tree.id,
        tree: tree,
        timestamp: Date.now(),
        metadata: { saveTime, nodeCount: tree.nodes.size }
      } as TreeEventData);

      logger.debug('Saved conversation tree', {
        treeId: tree.id,
        name: tree.name,
        nodeCount: tree.nodes.size,
        saveTime
      });
    } catch (error) {
      logger.error('Failed to save conversation tree', { treeId: tree.id, error });
      throw createUserError(`Failed to save conversation tree: ${tree.id}`, {
        category: ErrorCategory.FILE_SYSTEM,
        cause: error
      });
    }
  }

  /**
   * Delete a conversation tree
   */
  async deleteTree(id: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      // Remove from memory
      this.trees.delete(id);
      
      // Clear from cache
      const tree = this.trees.get(id);
      if (tree) {
        for (const nodeId of tree.nodes.keys()) {
          this.nodeCache.delete(nodeId);
        }
      }

      // Reset active tree if this was active
      if (this.activeTreeId === id) {
        this.activeTreeId = undefined;
      }

      // Remove from disk
      const treeDir = path.join(this.storageDir, id);
      await fs.rm(treeDir, { recursive: true, force: true });

      this.emit(ConversationTreeEvent.TREE_DELETED, {
        treeId: id,
        timestamp: Date.now(),
        metadata: { deleted: true }
      } as TreeEventData);

      logger.info('Deleted conversation tree', { treeId: id });
      return true;
    } catch (error) {
      logger.error('Failed to delete conversation tree', { treeId: id, error });
      return false;
    }
  }

  /**
   * List all available conversation trees
   */
  async listTrees(): Promise<ConversationTree[]> {
    this.ensureInitialized();

    try {
      const trees: ConversationTree[] = [];
      const treeDirectories = await fs.readdir(this.storageDir);

      for (const treeDir of treeDirectories) {
        try {
          const metadataPath = path.join(this.storageDir, treeDir, 'metadata.json');
          const content = await fs.readFile(metadataPath, 'utf8');
          const treeMetadata = JSON.parse(content) as Omit<ConversationTree, 'nodes'>;
          
          // Create lightweight tree object for listing
          const tree: ConversationTree = {
            ...treeMetadata,
            nodes: new Map() // Empty for listing
          };
          
          trees.push(tree);
        } catch (error) {
          logger.warn(`Failed to read tree metadata: ${treeDir}`, error);
        }
      }

      return trees.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error) {
      logger.error('Failed to list conversation trees', error);
      return [];
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
  setActiveTree(treeId: string): boolean {
    if (this.trees.has(treeId)) {
      this.activeTreeId = treeId;
      return true;
    }
    return false;
  }

  // ============================================================================
  // Tree Validation and Integrity
  // ============================================================================

  /**
   * Validate tree integrity
   */
  validateTreeIntegrity(tree: ConversationTree): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if root node exists
    if (!tree.nodes.has(tree.rootId)) {
      errors.push(`Root node ${tree.rootId} not found in tree`);
    }

    // Check if active node exists
    if (!tree.nodes.has(tree.activeNodeId)) {
      errors.push(`Active node ${tree.activeNodeId} not found in tree`);
    }

    // Validate each node
    for (const [nodeId, node] of tree.nodes) {
      // Check parent-child relationships
      if (node.parentId && !tree.nodes.has(node.parentId)) {
        errors.push(`Node ${nodeId} references non-existent parent ${node.parentId}`);
      }

      // Check children exist
      for (const childId of node.children) {
        if (!tree.nodes.has(childId)) {
          errors.push(`Node ${nodeId} references non-existent child ${childId}`);
        }
      }

      // Check for cycles
      if (this.hasCircularReference(tree, nodeId)) {
        errors.push(`Circular reference detected starting from node ${nodeId}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for circular references in tree
   */
  private hasCircularReference(tree: ConversationTree, startNodeId: string, visited = new Set<string>()): boolean {
    if (visited.has(startNodeId)) {
      return true;
    }

    visited.add(startNodeId);
    const node = tree.nodes.get(startNodeId);
    
    if (!node) {
      return false;
    }

    for (const childId of node.children) {
      if (this.hasCircularReference(tree, childId, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  // ============================================================================
  // Branch Operations
  // ============================================================================

  /**
   * Create a new branch from an existing node
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

    const sourceNode = tree.nodes.get(fromNodeId);
    if (!sourceNode) {
      throw createUserError(`Source node not found: ${fromNodeId}`, {
        category: ErrorCategory.USER_INPUT,
        resolution: 'Use a valid node ID from the current tree'
      });
    }

    const newNodeId = uuidv4();
    const timestamp = Date.now();

    // Determine branch point
    const branchPoint: BranchPoint = {
      messageIndex: sourceNode.messages.length,
      timestamp: timestamp,
      divergenceReason: 'manual',
      metadata: { branchName, fromNodeId }
    };

    // Copy messages and context if requested
    let messages = sourceNode.messages;
    let contextSnapshot = sourceNode.contextSnapshot;

    if (options?.copyMessages === false) {
      messages = [];
    }

    if (options?.copyContext === false) {
      contextSnapshot = undefined;
    }

    // Create new branch node
    const newNode: ConversationNode = {
      id: newNodeId,
      name: branchName,
      description: options?.description || `Branch from ${sourceNode.name}`,
      parentId: fromNodeId,
      children: [],
      branchPoint: branchPoint,
      messages: [...messages], // Create a copy
      contextSnapshot: contextSnapshot,
      metadata: {
        model: sourceNode.metadata.model,
        messageCount: messages.length,
        size: JSON.stringify(messages).length,
        tags: [...(options?.tags || []), ...(options?.preserveMetadata ? sourceNode.metadata.tags : [])],
        branchName: branchName,
        isMainBranch: false,
        mergeStatus: 'unmerged',
        compressionRatio: undefined,
        loadTime: undefined,
        custom: options?.preserveMetadata ? { ...sourceNode.metadata.custom } : {}
      },
      createdAt: timestamp,
      lastModified: timestamp,
      lastActive: timestamp
    };

    // Add to tree
    tree.nodes.set(newNodeId, newNode);
    
    // Update parent's children
    sourceNode.children.push(newNodeId);
    sourceNode.lastModified = timestamp;

    // Update tree metadata
    tree.metadata.totalNodes++;
    tree.metadata.branchCount++;
    tree.metadata.totalMessages += messages.length;
    tree.lastModified = timestamp;

    // Cache the new node
    this.nodeCache.set(newNodeId, newNode);

    // Compress parent if requested
    if (options?.compressParent) {
      // TODO: Implement compression logic
      logger.debug('Compression requested for parent node', { parentId: fromNodeId });
    }

    // Create checkpoint if requested
    if (options?.createCheckpoint) {
      await conversationState.createCheckpoint(`Branch point: ${branchName}`);
    }

    // Save tree
    await this.saveTree(tree);

    // Emit event
    this.emit(ConversationTreeEvent.BRANCH_CREATED, {
      treeId: tree.id,
      sourceNodeId: fromNodeId,
      targetNodeId: newNodeId,
      branchName: branchName,
      timestamp: Date.now(),
      metadata: { options }
    } as BranchEventData);

    logger.info('Created new branch', {
      treeId: tree.id,
      fromNodeId: fromNodeId,
      newNodeId: newNodeId,
      branchName: branchName,
      messageCount: messages.length
    });

    return newNode;
  }

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

    const targetNode = tree.nodes.get(nodeId);
    if (!targetNode) {
      throw createUserError(`Node not found: ${nodeId}`, {
        category: ErrorCategory.USER_INPUT,
        resolution: 'Use a valid node ID from the current tree'
      });
    }

    const previousNodeId = tree.activeNodeId;

    // Update active node
    tree.activeNodeId = nodeId;
    targetNode.lastActive = Date.now();
    tree.lastModified = Date.now();

    // Update conversation history with the target node's messages
    await conversationHistory.endSession();
    await conversationHistory.startSession(`${tree.name} - ${targetNode.name}`);

    // Add all messages to the new session
    for (const message of targetNode.messages) {
      if (message.role !== 'tool') {
        await conversationHistory.addMessage(
          message.role,
          message.content,
          message.metadata
        );
      }
    }

    // Cache the node
    this.nodeCache.set(nodeId, targetNode);

    // Save tree
    await this.saveTree(tree);

    // Emit event
    this.emit(ConversationTreeEvent.NODE_SWITCHED, {
      treeId: tree.id,
      nodeId: nodeId,
      node: targetNode,
      timestamp: Date.now(),
      metadata: { previousNodeId }
    } as NodeEventData);

    logger.info('Switched to branch', {
      treeId: tree.id,
      nodeId: nodeId,
      branchName: targetNode.metadata.branchName,
      messageCount: targetNode.messages.length
    });

    return targetNode;
  }

  /**
   * Get all branches in a tree
   */
  getBranches(treeId?: string): ConversationNode[] {
    const tree = treeId ? this.trees.get(treeId) : this.getActiveTree();
    if (!tree) {
      return [];
    }

    return Array.from(tree.nodes.values()).filter(node => 
      node.metadata.branchName && node.metadata.branchName !== 'main'
    );
  }

  /**
   * Get the current active node
   */
  getActiveNode(): ConversationNode | null {
    const tree = this.getActiveTree();
    if (!tree) {
      return null;
    }

    return tree.nodes.get(tree.activeNodeId) || null;
  }

  /**
   * Get a specific node by ID
   */
  getNode(nodeId: string, treeId?: string): ConversationNode | null {
    const tree = treeId ? this.trees.get(treeId) : this.getActiveTree();
    if (!tree) {
      return null;
    }

    // Check cache first
    if (this.nodeCache.has(nodeId)) {
      return this.nodeCache.get(nodeId)!;
    }

    // Get from tree
    const node = tree.nodes.get(nodeId);
    if (node) {
      this.nodeCache.set(nodeId, node);
    }

    return node || null;
  }

  // ============================================================================
  // Navigation Operations
  // ============================================================================

  /**
   * Navigate to parent node
   */
  async navigateToParent(): Promise<ConversationNode | null> {
    const currentNode = this.getActiveNode();
    if (!currentNode || !currentNode.parentId) {
      return null;
    }

    return await this.switchToBranch(currentNode.parentId);
  }

  /**
   * Navigate to a child node (first child by default)
   */
  async navigateToChild(childIndex = 0): Promise<ConversationNode | null> {
    const currentNode = this.getActiveNode();
    if (!currentNode || currentNode.children.length === 0) {
      return null;
    }

    const childId = currentNode.children[childIndex];
    if (!childId) {
      return null;
    }

    return await this.switchToBranch(childId);
  }

  /**
   * Get navigation path from root to current node
   */
  getNavigationPath(): ConversationNode[] {
    const tree = this.getActiveTree();
    const currentNode = this.getActiveNode();
    
    if (!tree || !currentNode) {
      return [];
    }

    const path: ConversationNode[] = [];
    let node: ConversationNode | null = currentNode;

    while (node) {
      path.unshift(node);
      node = node.parentId ? tree.nodes.get(node.parentId) || null : null;
    }

    return path;
  }

  // ============================================================================
  // Merge Operations
  // ============================================================================

  /**
   * Merge two branches with conflict resolution
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

    const sourceNode = tree.nodes.get(sourceNodeId);
    const targetNode = tree.nodes.get(targetNodeId);

    if (!sourceNode || !targetNode) {
      throw createUserError('Source or target node not found', {
        category: ErrorCategory.USER_INPUT,
        resolution: 'Use valid node IDs from the current tree'
      });
    }

    const startTime = Date.now();
    const conflicts: MergeConflict[] = [];

    try {
      // Analyze potential conflicts
      const conflictAnalysis = this.analyzeConflicts(sourceNode, targetNode, tree);
      conflicts.push(...conflictAnalysis.conflicts);

      let resultNode: ConversationNode;
      let success = true;

      switch (strategy) {
        case MergeStrategy.FAST_FORWARD:
          resultNode = await this.performFastForwardMerge(sourceNode, targetNode, tree);
          break;

        case MergeStrategy.THREE_WAY:
          resultNode = await this.performThreeWayMerge(sourceNode, targetNode, tree);
          break;

        case MergeStrategy.AUTO_RESOLVE:
          resultNode = await this.performAutoResolveMerge(sourceNode, targetNode, tree, conflicts);
          break;

        case MergeStrategy.MANUAL:
          // For manual strategy, return conflicts for user resolution
          success = conflicts.length === 0;
          resultNode = conflicts.length === 0 ? await this.performThreeWayMerge(sourceNode, targetNode, tree) : targetNode;
          break;

        default:
          throw createUserError(`Unsupported merge strategy: ${strategy}`, {
            category: ErrorCategory.USER_INPUT
          });
      }

      // Update tree metadata
      if (success && conflicts.length === 0) {
        tree.metadata.mergedBranches++;
        sourceNode.metadata.mergeStatus = 'merged';
      } else if (conflicts.length > 0) {
        tree.metadata.conflictedBranches++;
        sourceNode.metadata.mergeStatus = 'conflict';
      }

      tree.lastModified = Date.now();

      // Save tree
      await this.saveTree(tree);

      const result: MergeResult = {
        success: success && conflicts.length === 0,
        resultNodeId: resultNode.id,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        strategy: strategy,
        metadata: {
          mergedMessages: resultNode.messages.length,
          conflictCount: conflicts.length,
          resolutionTime: Date.now() - startTime,
          preservedBranches: [sourceNodeId, targetNodeId]
        }
      };

      // Emit event
      this.emit(ConversationTreeEvent.BRANCH_MERGED, {
        treeId: tree.id,
        sourceNodeId: sourceNodeId,
        targetNodeId: targetNodeId,
        result: result,
        timestamp: Date.now(),
        metadata: { strategy }
      } as BranchEventData);

      logger.info('Branch merge completed', {
        treeId: tree.id,
        sourceNodeId,
        targetNodeId,
        strategy,
        success: result.success,
        conflictCount: conflicts.length
      });

      return result;
    } catch (error) {
      logger.error('Branch merge failed', {
        treeId: tree.id,
        sourceNodeId,
        targetNodeId,
        strategy,
        error
      });

             this.emit(ConversationTreeEvent.BRANCH_CONFLICT, {
         treeId: tree.id,
         sourceNodeId: sourceNodeId,
         targetNodeId: targetNodeId,
         timestamp: Date.now(),
         metadata: { error: (error as Error).message, strategy }
       } as BranchEventData);

       throw createUserError(`Merge failed: ${(error as Error).message}`, {
         category: ErrorCategory.SYSTEM,
         cause: error
       });
    }
  }

  /**
   * Analyze potential conflicts between two nodes
   */
  private analyzeConflicts(sourceNode: ConversationNode, targetNode: ConversationNode, tree: ConversationTree): { conflicts: MergeConflict[] } {
    const conflicts: MergeConflict[] = [];

    // Check for message order conflicts
    if (sourceNode.messages.length !== targetNode.messages.length) {
      const commonAncestor = this.findCommonAncestor(sourceNode, targetNode, tree);
      if (commonAncestor) {
        const sourceNewMessages = sourceNode.messages.slice(commonAncestor.messages.length);
        const targetNewMessages = targetNode.messages.slice(commonAncestor.messages.length);

        if (sourceNewMessages.length > 0 && targetNewMessages.length > 0) {
          conflicts.push({
            type: 'message_order',
            sourceNodeId: sourceNode.id,
            targetNodeId: targetNode.id,
            conflictData: {
              sourceMessages: sourceNewMessages,
              targetMessages: targetNewMessages
            },
            suggestedResolution: 'interleave_by_timestamp'
          });
        }
      }
    }

    // Check for context mismatches
    if (sourceNode.contextSnapshot && targetNode.contextSnapshot) {
      // Simple check - in a real implementation, this would be more sophisticated
      if (JSON.stringify(sourceNode.contextSnapshot) !== JSON.stringify(targetNode.contextSnapshot)) {
        conflicts.push({
          type: 'context_mismatch',
          sourceNodeId: sourceNode.id,
          targetNodeId: targetNode.id,
          conflictData: {
            sourceContext: sourceNode.contextSnapshot,
            targetContext: targetNode.contextSnapshot
          },
          suggestedResolution: 'merge_contexts'
        });
      }
    }

    // Check for metadata conflicts
    const sourceMetadata = sourceNode.metadata;
    const targetMetadata = targetNode.metadata;

    if (sourceMetadata.model !== targetMetadata.model) {
      conflicts.push({
        type: 'metadata_conflict',
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        conflictData: {
          field: 'model',
          sourceValue: sourceMetadata.model,
          targetValue: targetMetadata.model
        },
        suggestedResolution: 'use_target_model'
      });
    }

    return { conflicts };
  }

  /**
   * Find common ancestor of two nodes
   */
  private findCommonAncestor(node1: ConversationNode, node2: ConversationNode, tree: ConversationTree): ConversationNode | null {
    const path1 = this.getPathToRoot(node1, tree);
    const path2 = this.getPathToRoot(node2, tree);

    // Find the last common node in both paths
    for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
      if (path1[i].id !== path2[i].id) {
        return i > 0 ? path1[i - 1] : null;
      }
    }

    // If one path is a subset of the other
    return path1.length <= path2.length ? path1[path1.length - 1] : path2[path2.length - 1];
  }

  /**
   * Get path from node to root
   */
  private getPathToRoot(node: ConversationNode, tree: ConversationTree): ConversationNode[] {
    const path: ConversationNode[] = [];
    let currentNode: ConversationNode | null = node;

    while (currentNode) {
      path.unshift(currentNode);
      currentNode = currentNode.parentId ? tree.nodes.get(currentNode.parentId) || null : null;
    }

    return path;
  }

  /**
   * Perform fast-forward merge
   */
  private async performFastForwardMerge(sourceNode: ConversationNode, targetNode: ConversationNode, tree: ConversationTree): Promise<ConversationNode> {
    // Fast-forward is only possible if target is a direct ancestor of source
    const sourcePath = this.getPathToRoot(sourceNode, tree);
    const isDirectPath = sourcePath.some(node => node.id === targetNode.id);

    if (!isDirectPath) {
      throw new Error('Fast-forward merge not possible - nodes are not on direct path');
    }

    // Simply update target node with source's messages
    targetNode.messages = [...sourceNode.messages];
    targetNode.lastModified = Date.now();
    targetNode.metadata.messageCount = sourceNode.messages.length;
    targetNode.metadata.size = JSON.stringify(sourceNode.messages).length;

    return targetNode;
  }

  /**
   * Perform three-way merge using common ancestor
   */
  private async performThreeWayMerge(sourceNode: ConversationNode, targetNode: ConversationNode, tree: ConversationTree): Promise<ConversationNode> {
    const commonAncestor = this.findCommonAncestor(sourceNode, targetNode, tree);
    
    if (!commonAncestor) {
      throw new Error('No common ancestor found for three-way merge');
    }

    // Get changes from common ancestor
    const sourceChanges = sourceNode.messages.slice(commonAncestor.messages.length);
    const targetChanges = targetNode.messages.slice(commonAncestor.messages.length);

    // Merge messages by interleaving based on timestamp
    const mergedMessages = [...commonAncestor.messages];
    const allChanges = [...sourceChanges, ...targetChanges];
    
         allChanges.sort((a, b) => {
       const aTime = a.metadata?.timestamp ? new Date(a.metadata.timestamp).getTime() : 0;
       const bTime = b.metadata?.timestamp ? new Date(b.metadata.timestamp).getTime() : 0;
       return aTime - bTime;
     });
    mergedMessages.push(...allChanges);

    // Update target node
    targetNode.messages = mergedMessages;
    targetNode.lastModified = Date.now();
    targetNode.metadata.messageCount = mergedMessages.length;
    targetNode.metadata.size = JSON.stringify(mergedMessages).length;

    return targetNode;
  }

  /**
   * Perform auto-resolve merge with conflict resolution heuristics
   */
  private async performAutoResolveMerge(sourceNode: ConversationNode, targetNode: ConversationNode, tree: ConversationTree, conflicts: MergeConflict[]): Promise<ConversationNode> {
    // Start with three-way merge as base
    let resultNode = await this.performThreeWayMerge(sourceNode, targetNode, tree);

    // Apply automatic conflict resolutions
    for (const conflict of conflicts) {
      switch (conflict.type) {
        case 'message_order':
          // Already handled by three-way merge (timestamp ordering)
          break;

        case 'context_mismatch':
          if (conflict.suggestedResolution === 'merge_contexts') {
            // Merge contexts by combining unique elements
            // This is a simplified implementation
            resultNode.contextSnapshot = targetNode.contextSnapshot; // Prefer target
          }
          break;

        case 'metadata_conflict':
          if (conflict.suggestedResolution === 'use_target_model') {
            // Keep target's metadata
            resultNode.metadata.model = targetNode.metadata.model;
          }
          break;
      }
    }

    return resultNode;
  }

  /**
   * Wrapper method for mergeBranches to match enhanced slash commands interface
   */
  async mergeBranch(sourceNodeId: string, targetNodeId: string, strategy: MergeStrategy = MergeStrategy.AUTO_RESOLVE): Promise<MergeResult> {
    return this.mergeBranches(sourceNodeId, targetNodeId, strategy);
  }

  /**
   * Navigate to a specific node by ID
   */
  async navigateToNode(nodeId: string): Promise<ConversationNode> {
    const tree = this.getActiveTree();
    if (!tree) {
      throw createUserError('No active tree found', {
        category: ErrorCategory.VALIDATION,
        resolution: 'Create or load a conversation tree first'
      });
    }

    const node = tree.nodes.get(nodeId);
    if (!node) {
      throw createUserError(`Node not found: ${nodeId}`, {
        category: ErrorCategory.VALIDATION,
        resolution: 'Provide a valid node ID'
      });
    }

    // Switch to this node
    tree.activeNodeId = nodeId;
    await this.saveTree(tree);

    this.emit(ConversationTreeEvent.NODE_SWITCHED, {
      nodeId,
      treeId: tree.id,
      timestamp: Date.now(),
      metadata: { action: 'navigate_to_node' }
    } as NodeEventData);

    return node;
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

    const node = tree.nodes.get(nodeId);
    if (!node) {
      throw createUserError(`Node not found: ${nodeId}`, {
        category: ErrorCategory.VALIDATION,
        resolution: 'Provide a valid node ID'
      });
    }

    const history: ConversationNode[] = [];
    let currentNode: ConversationNode | undefined = node;

    while (currentNode) {
      history.unshift(currentNode);
      currentNode = currentNode.parentId ? tree.nodes.get(currentNode.parentId) : undefined;
    }

    return history;
  }

  /**
   * Analyze tree complexity and structure
   */
  async analyzeTree(treeId: string): Promise<{
    complexityScore: number;
    optimizationPotential: number;
    recommendations: string[];
    performance: Record<string, any>;
  }> {
    const tree = this.trees.get(treeId) || this.getActiveTree();
    if (!tree) {
      throw createUserError('Tree not found', {
        category: ErrorCategory.VALIDATION,
        resolution: 'Provide a valid tree ID'
      });
    }

    const nodeCount = tree.nodes.size;
    const maxDepth = Math.max(...Array.from(tree.nodes.values()).map(node => {
      let depth = 0;
      let current = node;
      while (current.parentId) {
        depth++;
        current = tree.nodes.get(current.parentId)!;
      }
      return depth;
    }));

    const branchCount = Array.from(tree.nodes.values()).filter(node => node.children.length > 1).length;
    
    // Simple complexity calculation
    const complexityScore = Math.min(10, (nodeCount / 10) + (maxDepth / 5) + (branchCount / 2));
    const optimizationPotential = Math.max(0, 100 - (complexityScore * 10));

    const recommendations: string[] = [];
    if (nodeCount > 50) recommendations.push('Consider compressing old nodes');
    if (maxDepth > 20) recommendations.push('Consider flattening deep branches');
    if (branchCount > 10) recommendations.push('Consider merging similar branches');

    return {
      complexityScore,
      optimizationPotential,
      recommendations,
      performance: {
        nodeCount,
        maxDepth,
        branchCount,
        memoryUsage: JSON.stringify(tree).length
      }
    };
  }

  /**
   * Optimize tree structure
   */
  async optimizeTree(treeId: string, options: {
    compressOldNodes?: boolean;
    mergeSimilarBranches?: boolean;
    pruneEmptyBranches?: boolean;
    defragmentStorage?: boolean;
  }): Promise<{
    nodesCompressed: number;
    branchesMerged: number;
    storageSaved: number;
    performanceGain: number;
  }> {
    const tree = this.trees.get(treeId) || this.getActiveTree();
    if (!tree) {
      throw createUserError('Tree not found', {
        category: ErrorCategory.VALIDATION,
        resolution: 'Provide a valid tree ID'
      });
    }

    let nodesCompressed = 0;
    let branchesMerged = 0;
    const originalSize = JSON.stringify(tree).length;

    // Simple optimization implementation
    if (options.compressOldNodes) {
      const oldNodes = Array.from(tree.nodes.values()).filter(node => 
        Date.now() - node.lastModified > 7 * 24 * 60 * 60 * 1000 // 7 days
      );
      nodesCompressed = oldNodes.length;
      // In a real implementation, we would compress these nodes
    }

    if (options.pruneEmptyBranches) {
      const emptyNodes = Array.from(tree.nodes.values()).filter(node => 
        node.messages.length === 0 && node.children.length === 0
      );
      for (const node of emptyNodes) {
        tree.nodes.delete(node.id);
      }
    }

    await this.saveTree(tree);

    const newSize = JSON.stringify(tree).length;
    const storageSaved = Math.max(0, ((originalSize - newSize) / originalSize) * 100);
    const performanceGain = Math.min(50, storageSaved); // Simple calculation

    return {
      nodesCompressed,
      branchesMerged,
      storageSaved,
      performanceGain
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopAutoSave();
    this.trees.clear();
    this.nodeCache.clear();
    this.activeTreeId = undefined;
    this.removeAllListeners();
    
    logger.info('Conversation tree manager cleaned up');
  }
}

// Export singleton instance
export const conversationTreeManager = new ConversationTreeManager(); 