/**
 * Conversation Tree Branch Service - Clean Architecture
 * 
 * Single Responsibility: Handle conversation tree branch operations
 * - Branch creation and management
 * - Branch switching and navigation
 * - Merge operations and conflict resolution
 * - Branch analysis and comparison
 * 
 * Following Gemini CLI's focused service patterns
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import {
  ConversationTree,
  ConversationNode,
  BranchOptions,
  MergeResult,
  MergeConflict,
  MergeStrategy
} from '../conversation/types.js';

/**
 * Configuration for branch operations
 */
export interface BranchConfig {
  maxBranchDepth: number;
  enableConflictDetection: boolean;
  autoResolveConflicts: boolean;
  defaultMergeStrategy: MergeStrategy;
}

/**
 * Result type for branch operations
 */
export interface BranchResult {
  success: boolean;
  node?: ConversationNode;
  branch?: ConversationNode;
  mergeResult?: MergeResult;
  error?: string;
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

/**
 * Branch comparison result
 */
export interface BranchComparison {
  sourceNode: ConversationNode;
  targetNode: ConversationNode;
  commonAncestor?: ConversationNode;
  differences: {
    messageCount: number;
    contextChanges: number;
    metadataChanges: number;
  };
  conflicts: MergeConflict[];
  canAutoMerge: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_BRANCH_CONFIG: BranchConfig = {
  maxBranchDepth: 20,
  enableConflictDetection: true,
  autoResolveConflicts: false,
  defaultMergeStrategy: MergeStrategy.THREE_WAY
};

/**
 * Conversation Tree Branch Service
 * Focus: Branch operations and merging only
 */
export class ConversationTreeBranchService extends EventEmitter {
  private config: BranchConfig;

  constructor(config: Partial<BranchConfig> = {}) {
    super();
    this.config = { ...DEFAULT_BRANCH_CONFIG, ...config };
  }

  /**
   * Create a new branch from an existing node
   */
    async createBranch(
    tree: ConversationTree,
    fromNodeId: string,
    branchName: string,
    options: Partial<BranchOptions> = {}
  ): Promise<BranchResult> {
    const startTime = Date.now();

    try {
      const sourceNode = tree.nodes.get(fromNodeId);
      if (!sourceNode) {
        return {
          success: false,
          error: `Source node not found: ${fromNodeId}`
        };
      }

      // Check branch depth
      const depth = this.getNodeDepth(tree, fromNodeId);
      if (depth >= this.config.maxBranchDepth) {
        return {
          success: false,
          error: `Maximum branch depth (${this.config.maxBranchDepth}) exceeded`
        };
      }

      // Create new branch node
      const branchNodeId = uuidv4();
      const timestamp = Date.now();

      const branchNode: ConversationNode = {
        id: branchNodeId,
        name: options.branchName || `Branch: ${branchName}`,
        description: options.description || `Branch created from ${sourceNode.name}`,
        parentId: fromNodeId,
        children: [],
        messages: options.copyMessages ? [...sourceNode.messages] : [],
        contextSnapshot: options.copyContext && sourceNode.contextSnapshot ? { ...sourceNode.contextSnapshot, timestamp: Date.now() } : undefined,
        metadata: {
          branchName,
          isMainBranch: false,
          mergeStatus: 'unmerged',
          messageCount: options.copyMessages ? sourceNode.messages.length : 0,
          size: options.copyMessages ? sourceNode.metadata.size : 0,
          tags: options.tags || [],
          custom: {
            ...options.metadata?.custom
          }
        },
        createdAt: timestamp,
        lastModified: timestamp,
        lastActive: timestamp
      };

      // Add to tree
      tree.nodes.set(branchNodeId, branchNode);
      
      // Update parent's children
      sourceNode.children.push(branchNodeId);
      sourceNode.lastModified = timestamp;

      // Update tree metadata
      tree.lastModified = timestamp;
      tree.metadata.totalNodes = tree.nodes.size;
      tree.metadata.branchCount++;

      const endTime = Date.now();

      this.emit('branch-created', {
        treeId: tree.id,
        sourceNodeId: fromNodeId,
        branchNodeId,
        branchName,
        timestamp: endTime
      });

      logger.info('Branch created', {
        treeId: tree.id,
        branchName,
        sourceNodeId: fromNodeId,
        branchNodeId
      });

      return {
        success: true,
        node: sourceNode,
        branch: branchNode,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to create branch', error);
      
      return {
        success: false,
        error: `Branch creation failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  /**
   * Switch to a different branch
   */
  async switchToBranch(tree: ConversationTree, nodeId: string): Promise<BranchResult> {
    const startTime = Date.now();

    try {
      const targetNode = tree.nodes.get(nodeId);
      if (!targetNode) {
        return {
          success: false,
          error: `Node not found: ${nodeId}`
        };
      }

      const previousNodeId = tree.activeNodeId;
      
      // Update active node
      tree.activeNodeId = nodeId;
      targetNode.lastActive = Date.now();
      tree.lastModified = Date.now();

      const endTime = Date.now();

      this.emit('branch-switched', {
        treeId: tree.id,
        fromNodeId: previousNodeId,
        toNodeId: nodeId,
        branchName: targetNode.metadata?.branchName,
        timestamp: endTime
      });

      logger.info('Switched to branch', {
        treeId: tree.id,
        nodeId,
        branchName: targetNode.metadata?.branchName,
        previousNodeId
      });

      return {
        success: true,
        node: targetNode,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to switch branch', error);
      
      return {
        success: false,
        error: `Branch switch failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  /**
   * Merge two branches
   */
  async mergeBranches(
    tree: ConversationTree,
    sourceNodeId: string,
    targetNodeId: string,
    strategy: MergeStrategy = this.config.defaultMergeStrategy
  ): Promise<BranchResult> {
    const startTime = Date.now();

    try {
      const sourceNode = tree.nodes.get(sourceNodeId);
      const targetNode = tree.nodes.get(targetNodeId);

      if (!sourceNode || !targetNode) {
        return {
          success: false,
          error: 'Source or target node not found'
        };
      }

      // Analyze branches for conflicts
      const comparison = await this.compareBranches(tree, sourceNodeId, targetNodeId);
      
      // Perform merge based on strategy
      let mergeResult: MergeResult;
      
      switch (strategy) {
        case MergeStrategy.FAST_FORWARD:
          mergeResult = await this.performFastForwardMerge(tree, sourceNode, targetNode);
          break;
        case MergeStrategy.THREE_WAY:
          mergeResult = await this.performThreeWayMerge(tree, sourceNode, targetNode, comparison);
          break;
        case MergeStrategy.AUTO_RESOLVE:
          mergeResult = await this.performAutoResolveMerge(tree, sourceNode, targetNode, comparison);
          break;
        default:
          return {
            success: false,
            error: `Unsupported merge strategy: ${strategy}`
          };
      }

      const endTime = Date.now();

      this.emit('branches-merged', {
        treeId: tree.id,
        sourceNodeId,
        targetNodeId,
        strategy,
        success: mergeResult.success,
        conflictCount: mergeResult.conflicts?.length || 0,
        timestamp: endTime
      });

      logger.info('Branches merged', {
        treeId: tree.id,
        sourceNodeId,
        targetNodeId,
        strategy,
        success: mergeResult.success,
        conflicts: mergeResult.conflicts?.length || 0
      });

      return {
        success: mergeResult.success,
        mergeResult,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to merge branches', error);
      
      return {
        success: false,
        error: `Merge failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  /**
   * Compare two branches for differences and conflicts
   */
  async compareBranches(
    tree: ConversationTree,
    sourceNodeId: string,
    targetNodeId: string
  ): Promise<BranchComparison> {
    const sourceNode = tree.nodes.get(sourceNodeId)!;
    const targetNode = tree.nodes.get(targetNodeId)!;
    
    // Find common ancestor
    const commonAncestor = this.findCommonAncestor(tree, sourceNode, targetNode);
    
    // Analyze differences
    const differences = {
      messageCount: Math.abs(sourceNode.messages.length - targetNode.messages.length),
      contextChanges: this.compareContextSnapshots(sourceNode.contextSnapshot, targetNode.contextSnapshot),
      metadataChanges: this.compareMetadata(sourceNode.metadata, targetNode.metadata)
    };

    // Detect conflicts
    const conflicts = this.config.enableConflictDetection
      ? this.detectConflicts(sourceNode, targetNode, commonAncestor)
      : [];

    const canAutoMerge = conflicts.length === 0 || 
      (this.config.autoResolveConflicts && conflicts.every(c => c.canAutoResolve));

    return {
      sourceNode,
      targetNode,
      commonAncestor,
      differences,
      conflicts,
      canAutoMerge
    };
  }

  /**
   * Get all branches in the tree
   */
  getBranches(tree: ConversationTree): ConversationNode[] {
    const branches: ConversationNode[] = [];
    
    for (const node of tree.nodes.values()) {
      // A node is a branch if it has a named branch or multiple children
      if (node.metadata?.branchName || node.children.length > 1) {
        branches.push(node);
      }
    }

    return branches.sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Get branch tips (leaf nodes)
   */
  getBranchTips(tree: ConversationTree): ConversationNode[] {
    return Array.from(tree.nodes.values())
      .filter(node => node.children.length === 0)
      .sort((a, b) => b.lastActive - a.lastActive);
  }

  /**
   * Perform fast-forward merge
   */
    private async performFastForwardMerge(
    tree: ConversationTree,
    sourceNode: ConversationNode,
    targetNode: ConversationNode
  ): Promise<MergeResult> {
    // Check if fast-forward is possible
    if (!this.canFastForward(tree, sourceNode, targetNode)) {
      return {
        success: false,
        strategy: MergeStrategy.FAST_FORWARD,
        conflicts: [],
        metadata: {
        mergedMessages: 0,
        conflictCount: 0,
        resolutionTime: 0,
        preservedBranches: [],
      }
      };
    }

    // Update target node with source changes
    targetNode.messages = [...sourceNode.messages];
    targetNode.contextSnapshot = sourceNode.contextSnapshot;
    targetNode.lastModified = Date.now();
    targetNode.metadata.mergeStatus = 'merged';

    return {
      success: true,
      strategy: MergeStrategy.FAST_FORWARD,
      resultNodeId: targetNode.id,
      conflicts: [],
      metadata: {
        mergedMessages: 0,
        conflictCount: 0,
        resolutionTime: 0,
        preservedBranches: [],
      }
    };
  }

  /**
   * Perform three-way merge
   */
  private async performThreeWayMerge(
    tree: ConversationTree,
    sourceNode: ConversationNode,
    targetNode: ConversationNode,
    comparison: BranchComparison
  ): Promise<MergeResult> {
    const conflicts = comparison.conflicts;
    
    if (conflicts.length > 0) {
      return {
        success: false,
        strategy: MergeStrategy.THREE_WAY,
        conflicts,
        resultNodeId: targetNode.id,
        metadata: {
        mergedMessages: 0,
        conflictCount: 0,
        resolutionTime: 0,
        preservedBranches: [],
      }
      };
    }

    // Merge messages (simple concatenation for now)
    const mergedMessages = [...targetNode.messages, ...sourceNode.messages];
    
    // Merge context snapshots
    const mergedContext = {
      ...targetNode.contextSnapshot,
      ...sourceNode.contextSnapshot,
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
        lastModified: 0
      }
    };

    // Update target node
    targetNode.messages = mergedMessages;
    targetNode.contextSnapshot = mergedContext;
    targetNode.lastModified = Date.now();
    targetNode.metadata.mergeStatus = 'merged';

    return {
      success: true,
      strategy: MergeStrategy.THREE_WAY,
      resultNodeId: targetNode.id,
      conflicts: [],
      metadata: {
        mergedMessages: 0,
        conflictCount: 0,
        resolutionTime: 0,
        preservedBranches: [],
      }
    };
  }

  /**
   * Perform auto-resolve merge
   */
  private async performAutoResolveMerge(
    tree: ConversationTree,
    sourceNode: ConversationNode,
    targetNode: ConversationNode,
    comparison: BranchComparison
  ): Promise<MergeResult> {
    const conflicts = comparison.conflicts;
    const resolvedConflicts: MergeConflict[] = [];

    // Auto-resolve conflicts where possible
    for (const conflict of conflicts) {
      if (conflict.canAutoResolve && conflict.suggestedResolution) {
        this.applyConflictResolution(targetNode, conflict);
        resolvedConflicts.push(conflict);
      }
    }

    const remainingConflicts = conflicts.filter(c => !resolvedConflicts.includes(c));

    if (remainingConflicts.length > 0) {
      return {
        success: false,
        strategy: MergeStrategy.AUTO_RESOLVE,
        conflicts: remainingConflicts,
        resultNodeId: targetNode.id,
        metadata: {
        mergedMessages: 0,
        conflictCount: 0,
        resolutionTime: 0,
        preservedBranches: [],
      }
      };
    }

    // Complete the merge
    targetNode.lastModified = Date.now();
    targetNode.metadata.mergeStatus = 'merged';

    return {
      success: true,
      strategy: MergeStrategy.AUTO_RESOLVE,
      resultNodeId: targetNode.id,
      conflicts: [],
      metadata: {
        mergedMessages: 0,
        conflictCount: 0,
        resolutionTime: 0,
        preservedBranches: [],
      }
    };
  }

  /**
   * Check if fast-forward merge is possible
   */
  private canFastForward(tree: ConversationTree, sourceNode: ConversationNode, targetNode: ConversationNode): boolean {
    // Fast-forward is possible if target is an ancestor of source
    let current = sourceNode;
    while (current.parentId) {
      if (current.parentId === targetNode.id) {
        return true;
      }
      current = tree.nodes.get(current.parentId)!;
    }
    return false;
  }

  /**
   * Find common ancestor of two nodes
   */
  private findCommonAncestor(tree: ConversationTree, node1: ConversationNode, node2: ConversationNode): ConversationNode | undefined {
    const path1 = this.getPathToRoot(tree, node1);
    const path2 = this.getPathToRoot(tree, node2);

    // Find where paths diverge
    for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
      if (path1[i].id !== path2[i].id) {
        return i > 0 ? path1[i - 1] : undefined;
      }
    }

    return path1.length <= path2.length ? path1[path1.length - 1] : path2[path2.length - 1];
  }

  /**
   * Get path from node to root
   */
  private getPathToRoot(tree: ConversationTree, node: ConversationNode): ConversationNode[] {
    const path: ConversationNode[] = [];
    let current: ConversationNode | undefined = node;

    while (current) {
      path.unshift(current);
      current = current.parentId ? tree.nodes.get(current.parentId) : undefined;
    }

    return path;
  }

  /**
   * Get node depth in tree
   */
  private getNodeDepth(tree: ConversationTree, nodeId: string): number {
    const path = this.getPathToRoot(tree, tree.nodes.get(nodeId)!);
    return path.length - 1;
  }

  /**
   * Detect conflicts between two nodes
   */
    private detectConflicts(
    sourceNode: ConversationNode,
    targetNode: ConversationNode,
    commonAncestor?: ConversationNode
  ): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Message conflicts (simplified)
    if (sourceNode.messages.length !== targetNode.messages.length) {
      conflicts.push({
        type: 'message_order',
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        canAutoResolve: true,
        suggestedResolution: 'merge_messages'
      });
    }

    // Context conflicts
    if (this.compareContextSnapshots(sourceNode.contextSnapshot, targetNode.contextSnapshot) > 0) {
      conflicts.push({
        type: 'context_mismatch',
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        canAutoResolve: true,
        suggestedResolution: 'merge_contexts'
      });
    }

    // Metadata conflicts
    if (sourceNode.metadata.model !== targetNode.metadata.model) {
      conflicts.push({
        type: 'metadata_conflict',
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        canAutoResolve: false,
        suggestedResolution: 'use_target_model'
      });
    }

    return conflicts;
  }

  /**
   * Compare context snapshots
   */
  private compareContextSnapshots(context1: any, context2: any): number {
    if (!context1 && !context2) return 0;
    if (!context1 || !context2) return 1;
    
    const keys1 = Object.keys(context1);
    const keys2 = Object.keys(context2);
    
    if (keys1.length !== keys2.length) return 1;
    
    return keys1.some(key => context1[key] !== context2[key]) ? 1 : 0;
  }

  /**
   * Compare metadata objects
   */
  private compareMetadata(meta1: any, meta2: any): number {
    const keys1 = Object.keys(meta1);
    const keys2 = Object.keys(meta2);
    
    if (keys1.length !== keys2.length) return 1;
    
    return keys1.some(key => meta1[key] !== meta2[key]) ? 1 : 0;
  }

  /**
   * Apply conflict resolution to a node
   */
    private applyConflictResolution(node: ConversationNode, conflict: MergeConflict): void {
    switch (conflict.type) {
      case 'message_order':
        // Already handled by merge logic
        break;
      case 'context_mismatch':
        // Merge contexts by combining unique elements
        if (conflict.sourceNodeId && conflict.targetNodeId) {
          const sourceNode = node;
          const targetNode = node;
          if (sourceNode.contextSnapshot && targetNode.contextSnapshot) {
            node.contextSnapshot = { ...targetNode.contextSnapshot, ...sourceNode.contextSnapshot, timestamp: Date.now() };
          }
        }
        break;
      case 'metadata_conflict':
        // Use suggested resolution
        if (conflict.suggestedResolution === 'use_target_model') {
          // Keep current metadata (target)
        }
        break;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BranchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.removeAllListeners();
    logger.debug('Conversation tree branch service cleaned up');
  }
}

/**
 * Factory function for creating branch service
 */
export function createConversationTreeBranchService(config?: Partial<BranchConfig>): ConversationTreeBranchService {
  return new ConversationTreeBranchService(config);
} 