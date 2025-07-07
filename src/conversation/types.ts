/**
 * Enhanced Conversation State Management Types
 * 
 * This module defines the complete type system for VibeX's enhanced conversation
 * state management, including tree structures, branching, and merge capabilities.
 * 
 * Builds on existing types from:
 * - src/utils/conversation-state.ts
 * - src/utils/conversation-history.ts
 * - src/context/conversation-context-integration.ts
 */

import type { ConversationMessage, ConversationCustomData, SavedConversation } from '../utils/conversation-state.js';
import type { ConversationContextSnapshot } from '../context/conversation-context-integration.js';

// ============================================================================
// Core Tree Data Structures
// ============================================================================

/**
 * Individual node in a conversation tree
 */
export interface ConversationNode {
  // Basic identification
  id: string;
  name: string;
  description?: string;
  
  // Tree structure
  parentId?: string;
  children: string[];
  branchPoint?: BranchPoint;
  
  // Content and state
  messages: ConversationMessage[];
  contextSnapshot?: ConversationContextSnapshot;
  
  // Metadata
  metadata: ConversationNodeMetadata;
  
  // Timestamps
  createdAt: number;
  lastModified: number;
  lastActive: number;
}

/**
 * Branch point information
 */
export interface BranchPoint {
  messageIndex: number;
  timestamp: number;
  divergenceReason?: 'manual' | 'auto_checkpoint' | 'conflict_resolution' | 'experiment';
  metadata?: Record<string, any>;
}

/**
 * Metadata for conversation nodes
 */
export interface ConversationNodeMetadata {
  // Basic metadata
  model?: string;
  messageCount: number;
  size: number;
  tags: string[];
  
  // Branch metadata
  branchName?: string;
  isMainBranch: boolean;
  mergeStatus?: 'unmerged' | 'merged' | 'conflict';
  
  // Performance metadata
  compressionRatio?: number;
  loadTime?: number;
  
  // Custom metadata (extensible)
  custom: ConversationCustomData;
}

/**
 * Complete conversation tree
 */
export interface ConversationTree {
  // Tree identification
  id: string;
  name: string;
  description?: string;
  
  // Tree structure
  rootId: string;
  nodes: Map<string, ConversationNode>;
  activeNodeId: string;
  
  // Tree metadata
  metadata: ConversationTreeMetadata;
  
  // Timestamps
  createdAt: number;
  lastModified: number;
}

/**
 * Tree-level metadata
 */
export interface ConversationTreeMetadata {
  totalNodes: number;
  totalMessages: number;
  maxDepth: number;
  branchCount: number;
  mergedBranches: number;
  conflictedBranches: number;
  tags: string[];
  custom: Record<string, any>;
}

// ============================================================================
// Branch Management
// ============================================================================

/**
 * Options for creating a new branch
 */
export interface BranchOptions {
  // Branch configuration
  branchName: string;
  description?: string;
  tags?: string[];
  
  // Content options
  copyMessages: boolean;
  copyContext: boolean;
  preserveMetadata: boolean;
  
  // Optimization options
  compressParent: boolean;
  createCheckpoint: boolean;
}

/**
 * Merge strategies for combining branches
 */
export enum MergeStrategy {
  FAST_FORWARD = 'fast_forward',     // Simple append if no conflicts
  THREE_WAY = 'three_way',           // Use common ancestor for conflict resolution
  MANUAL = 'manual',                 // Require user intervention for conflicts
  AUTO_RESOLVE = 'auto_resolve'      // Automatic conflict resolution with heuristics
}

/**
 * Result of a merge operation
 */
export interface MergeResult {
  success: boolean;
  resultNodeId?: string;
  conflicts?: MergeConflict[];
  strategy: MergeStrategy;
  metadata: {
    mergedMessages: number;
    conflictCount: number;
    resolutionTime: number;
    preservedBranches: string[];
  };
}

/**
 * Conflict detected during merge
 */
export interface MergeConflict {
  type: 'message_order' | 'context_mismatch' | 'metadata_conflict';
  sourceNodeId: string;
  targetNodeId: string;
  conflictData: any;
  suggestedResolution?: any;
  canAutoResolve?: boolean;
}

// ============================================================================
// Configuration and Options
// ============================================================================

/**
 * Configuration for conversation tree management
 */
export interface ConversationTreeConfig {
  // Storage options
  storageDirectory: string;
  compressionConfig: CompressionConfig;
  
  // Performance options
  maxCachedNodes: number;
  autoSaveInterval: number;
  lazyLoadThreshold: number;
  
  // Feature flags
  enableCompression: boolean;
  enableVisualization: boolean;
  enableAutoCheckpoints: boolean;
  
  // Limits
  maxTreeDepth: number;
  maxNodesPerTree: number;
  maxTreeSize: number;
}

/**
 * Compression configuration
 */
export interface CompressionConfig {
  // When to compress
  maxUncompressedNodes: number;      // Default: 10
  maxNodeAge: number;                // Default: 7 days
  compressionThreshold: number;      // Default: 1MB
  
  // Compression levels
  messageCompression: 'none' | 'gzip' | 'brotli';
  contextCompression: 'none' | 'differential' | 'full';
  metadataCompression: boolean;
  
  // Performance
  asyncCompression: boolean;
  compressionWorkers: number;
}

/**
 * Options for creating a new tree
 */
export interface CreateTreeOptions {
  description?: string;
  tags?: string[];
  initialBranchName?: string;
  migrateFromLegacy?: string; // Legacy conversation ID to migrate
  custom?: Record<string, any>;
}

// ============================================================================
// Search and Analysis
// ============================================================================

/**
 * Search query for conversations
 */
export interface SearchQuery {
  // Text search
  text?: string;
  messageContent?: string;
  
  // Metadata filters
  tags?: string[];
  model?: string;
  dateRange?: {
    start: number;
    end: number;
  };
  
  // Tree structure filters
  treeId?: string;
  branchName?: string;
  nodeId?: string;
  
  // Advanced filters
  minMessages?: number;
  maxMessages?: number;
  hasContext?: boolean;
  mergeStatus?: ConversationNodeMetadata['mergeStatus'];
  
  // Result options
  limit?: number;
  offset?: number;
  sortBy?: 'created' | 'modified' | 'active' | 'messages' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search result
 */
export interface SearchResult {
  node: ConversationNode;
  tree: ConversationTree;
  relevanceScore: number;
  matchedFields: string[];
  context?: {
    beforeText?: string;
    matchText: string;
    afterText?: string;
  };
}

/**
 * Tree analysis result
 */
export interface TreeAnalysis {
  // Structure analysis
  structure: {
    totalNodes: number;
    maxDepth: number;
    branchCount: number;
    leafNodes: number;
    orphanedNodes: number;
  };
  
  // Content analysis
  content: {
    totalMessages: number;
    averageMessagesPerNode: number;
    totalSize: number;
    averageSizePerNode: number;
    modelDistribution: Record<string, number>;
  };
  
  // Performance analysis
  performance: {
    compressionRatio: number;
    loadTime: number;
    cacheHitRate: number;
    optimizationOpportunities: string[];
  };
  
  // Usage patterns
  usage: {
    mostActiveNodes: string[];
    recentlyModified: string[];
    longestBranches: string[];
    mergeComplexity: number;
  };
}

/**
 * Conversation diff between two nodes
 */
export interface ConversationDiff {
  sourceNodeId: string;
  targetNodeId: string;
  
  // Message differences
  messageDiffs: MessageDiff[];
  
  // Context differences
  contextDiff?: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  
  // Metadata differences
  metadataDiff?: {
    added: Record<string, any>;
    removed: Record<string, any>;
    modified: Record<string, { old: any; new: any }>;
  };
  
  // Summary
  summary: {
    messagesAdded: number;
    messagesRemoved: number;
    messagesModified: number;
    similarity: number; // 0-1 similarity score
  };
}

/**
 * Individual message difference
 */
export interface MessageDiff {
  type: 'added' | 'removed' | 'modified';
  messageId?: string;
  index: number;
  content?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

// ============================================================================
// Visualization
// ============================================================================

/**
 * Options for tree visualization
 */
export interface TreeVisualizationOptions {
  // Display options
  maxWidth: number;
  maxDepth: number;
  showMetadata: boolean;
  showTimestamps: boolean;
  
  // Highlighting
  highlightActive: boolean;
  highlightConflicts: boolean;
  highlightPath: string[];
  
  // Filtering
  hideMerged: boolean;
  hideOld: boolean;
  tagsFilter: string[];
}

/**
 * Tree visualization data
 */
export interface TreeVisualizationData {
  // Tree structure for rendering
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  layout: TreeLayout;
  
  // Rendered output
  ascii: string;
  
  // Metadata for display
  stats: TreeStats;
  legend: VisualizationLegend;
}

/**
 * Node in visualization
 */
export interface VisualizationNode {
  id: string;
  displayName: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: Record<string, any>;
  metadata: string[];
  depth: number;
  isActive: boolean;
  isHighlighted: boolean;
}

/**
 * Edge in visualization
 */
export interface VisualizationEdge {
  from: string;
  to: string;
  style: Record<string, any>;
}

/**
 * Layout information for tree
 */
export interface TreeLayout {
  width: number;
  height: number;
  algorithm: string;
}

/**
 * Tree statistics for display
 */
export interface TreeStats {
  totalNodes: number;
  totalMessages: number;
  maxDepth: number;
  branchCount: number;
  mergedBranches: number;
  conflictedBranches: number;
  averageMessagesPerNode: number;
  compressionRatio: number;
  lastModified: number;
}

/**
 * Legend for visualization
 */
export interface VisualizationLegend {
  symbols: Array<{
    symbol: string;
    description: string;
    color: string;
  }>;
  stats: string[];
}

// ============================================================================
// Migration and Compatibility
// ============================================================================

/**
 * Migration manager interface
 */
export interface MigrationManager {
  // Detect legacy conversations
  detectLegacyConversations(): Promise<string[]>;
  
  // Migration operations
  migrateLegacyConversation(id: string): Promise<ConversationTree>;
  migrateAllLegacy(): Promise<MigrationResult>;
  
  // Validation
  validateMigration(treeId: string): Promise<ValidationResult>;
}

/**
 * Migration operation result
 */
export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  errors: MigrationError[];
  newTreeIds: string[];
}

/**
 * Migration error
 */
export interface MigrationError {
  conversationId: string;
  error: string;
  details?: any;
}

/**
 * Migration validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// ============================================================================
// Optimization
// ============================================================================

/**
 * Optimization options
 */
export interface OptimizationOptions {
  // What to optimize
  compressOldNodes: boolean;
  removeOrphanedNodes: boolean;
  defragmentStorage: boolean;
  rebuildIndexes: boolean;
  
  // Optimization thresholds
  maxAge: number;
  minActivityThreshold: number;
  compressionRatio: number;
  
  // Safety options
  createBackup: boolean;
  dryRun: boolean;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  success: boolean;
  
  // What was optimized
  nodesCompressed: number;
  nodesRemoved: number;
  storageReclaimed: number;
  indexesRebuilt: number;
  
  // Performance impact
  beforeSize: number;
  afterSize: number;
  compressionRatio: number;
  optimizationTime: number;
  
  // Issues encountered
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Events
// ============================================================================

/**
 * Events emitted by the conversation tree system
 */
export enum ConversationTreeEvent {
  // Tree events
  TREE_CREATED = 'tree_created',
  TREE_LOADED = 'tree_loaded',
  TREE_SAVED = 'tree_saved',
  TREE_DELETED = 'tree_deleted',
  
  // Node events
  NODE_CREATED = 'node_created',
  NODE_SWITCHED = 'node_switched',
  NODE_UPDATED = 'node_updated',
  NODE_DELETED = 'node_deleted',
  
  // Branch events
  BRANCH_CREATED = 'branch_created',
  BRANCH_MERGED = 'branch_merged',
  BRANCH_CONFLICT = 'branch_conflict',
  
  // System events
  OPTIMIZATION_STARTED = 'optimization_started',
  OPTIMIZATION_COMPLETED = 'optimization_completed',
  MIGRATION_STARTED = 'migration_started',
  MIGRATION_COMPLETED = 'migration_completed',
  
  // Error events
  ERROR = 'error',
  WARNING = 'warning'
}

/**
 * Event data for tree events
 */
export interface TreeEventData {
  treeId: string;
  tree?: ConversationTree;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Event data for node events
 */
export interface NodeEventData {
  treeId: string;
  nodeId: string;
  node?: ConversationNode;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Event data for branch events
 */
export interface BranchEventData {
  treeId: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  branchName?: string;
  result?: MergeResult;
  timestamp: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// API Interfaces
// ============================================================================

/**
 * Enhanced conversation API
 */
export interface ConversationAPI {
  // Tree management
  tree: {
    create(name: string, options?: CreateTreeOptions): Promise<ConversationTree>;
    load(id: string): Promise<ConversationTree>;
    list(): Promise<ConversationTree[]>;
    delete(id: string): Promise<boolean>;
    analyze(id: string): Promise<TreeAnalysis>;
    optimize(id: string, options?: OptimizationOptions): Promise<OptimizationResult>;
  };
  
  // Branch management
  branch: {
    create(fromNodeId: string, name: string, options?: BranchOptions): Promise<ConversationNode>;
    switch(nodeId: string): Promise<ConversationNode>;
    merge(sourceId: string, targetId: string, strategy?: MergeStrategy): Promise<MergeResult>;
    list(treeId?: string): Promise<ConversationNode[]>;
  };
  
  // Navigation
  navigation: {
    goto(nodeId: string): Promise<ConversationNode>;
    back(): Promise<ConversationNode | null>;
    forward(): Promise<ConversationNode | null>;
    history(): Promise<ConversationNode[]>;
  };
  
  // Analysis
  analysis: {
    tree(treeId: string): Promise<TreeAnalysis>;
    diff(nodeId1: string, nodeId2: string): Promise<ConversationDiff>;
    search(query: SearchQuery): Promise<SearchResult[]>;
  };
  
  // Visualization
  visualization: {
    getTreeData(treeId: string, options?: TreeVisualizationOptions): Promise<TreeVisualizationData>;
    renderTree(data: TreeVisualizationData): Promise<string>;
  };
  
  // Migration
  migration: {
    detectLegacy(): Promise<string[]>;
    migrate(conversationId: string): Promise<ConversationTree>;
    migrateAll(): Promise<MigrationResult>;
    validate(treeId: string): Promise<ValidationResult>;
  };
}

// ============================================================================
// Backward Compatibility
// ============================================================================

/**
 * Adapter for legacy conversation state
 */
export interface LegacyConversationAdapter {
  // Convert legacy to new format
  convertToTree(legacyConversation: SavedConversation): Promise<ConversationTree>;
  
  // Convert new format to legacy (for compatibility)
  convertToLegacy(tree: ConversationTree, nodeId?: string): Promise<SavedConversation>;
  
  // Check if conversion is needed
  needsConversion(data: any): boolean;
  
  // Get conversion metadata
  getConversionMetadata(legacyId: string): Promise<{
    canConvert: boolean;
    estimatedSize: number;
    warnings: string[];
  }>;
}

/**
 * Export all types for easy importing
 */
export type {
  // Core types already exported above
};

/**
 * Default configuration values
 */
export const DEFAULT_TREE_CONFIG: ConversationTreeConfig = {
  storageDirectory: '~/.vibex/conversations/trees',
  compressionConfig: {
    maxUncompressedNodes: 10,
    maxNodeAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    compressionThreshold: 1024 * 1024, // 1MB
    messageCompression: 'gzip',
    contextCompression: 'differential',
    metadataCompression: true,
    asyncCompression: true,
    compressionWorkers: 2,
  },
  maxCachedNodes: 50,
  autoSaveInterval: 30000, // 30 seconds
  lazyLoadThreshold: 100,
  enableCompression: true,
  enableVisualization: true,
  enableAutoCheckpoints: true,
  maxTreeDepth: 100,
  maxNodesPerTree: 1000,
  maxTreeSize: 100 * 1024 * 1024, // 100MB
};

/**
 * Default branch options
 */
export const DEFAULT_BRANCH_OPTIONS: Partial<BranchOptions> = {
  copyMessages: true,
  copyContext: true,
  preserveMetadata: true,
  compressParent: false,
  createCheckpoint: true,
};

/**
 * Default visualization options
 */
export const DEFAULT_VISUALIZATION_OPTIONS: Partial<TreeVisualizationOptions> = {
  maxWidth: 120,
  maxDepth: 10,
  showMetadata: true,
  showTimestamps: false,
  highlightActive: true,
  highlightConflicts: true,
  highlightPath: [],
  hideMerged: false,
  hideOld: false,
  tagsFilter: [],
}; 