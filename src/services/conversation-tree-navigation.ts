/**
 * Conversation Tree Navigation Service - Clean Architecture
 * 
 * Single Responsibility: Handle tree navigation and node operations
 * - Node navigation and traversal
 * - Path finding and history tracking
 * - Node access and retrieval
 * - Tree state management
 * 
 * Following Gemini CLI's focused service patterns
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import type {
  ConversationTree,
  ConversationNode
} from '../conversation/types.js';

/**
 * Configuration for navigation operations
 */
export interface NavigationConfig {
  maxDepth: number;
  cacheSize: number;
  enablePathCaching: boolean;
}

/**
 * Result type for navigation operations
 */
export interface NavigationResult {
  success: boolean;
  node?: ConversationNode;
  path?: ConversationNode[];
  error?: string;
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

/**
 * Navigation state tracking
 */
export interface NavigationState {
  currentNodeId?: string;
  lastNavigationTime: number;
  navigationHistory: string[];
}

/**
 * Default configuration
 */
const DEFAULT_NAVIGATION_CONFIG: NavigationConfig = {
  maxDepth: 50,
  cacheSize: 100,
  enablePathCaching: true
};

/**
 * Conversation Tree Navigation Service
 * Focus: Tree navigation and node operations only
 */
export class ConversationTreeNavigationService extends EventEmitter {
  private config: NavigationConfig;
  private pathCache: Map<string, ConversationNode[]> = new Map();
  private nodeCache: Map<string, ConversationNode> = new Map();
  private navigationStates: Map<string, NavigationState> = new Map();

  constructor(config: Partial<NavigationConfig> = {}) {
    super();
    this.config = { ...DEFAULT_NAVIGATION_CONFIG, ...config };
  }

  /**
   * Navigate to a specific node in the tree
   */
  async navigateToNode(tree: ConversationTree, nodeId: string): Promise<NavigationResult> {
    const startTime = Date.now();

    try {
      const node = tree.nodes.get(nodeId);
      if (!node) {
        return {
          success: false,
          error: `Node not found: ${nodeId}`
        };
      }

      // Update tree active node
      tree.activeNodeId = nodeId;

      // Update navigation state
      this.updateNavigationState(tree.id, nodeId);

      const endTime = Date.now();

      this.emit('node-navigated', {
        treeId: tree.id,
        nodeId,
        timestamp: endTime
      });

      logger.debug('Navigated to node', {
        treeId: tree.id,
        nodeId,
        branchName: node.metadata?.branchName
      });

      return {
        success: true,
        node,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to navigate to node', error);
      
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
  async navigateToParent(tree: ConversationTree): Promise<NavigationResult> {
    const startTime = Date.now();

    try {
      const currentNode = this.getActiveNode(tree);
      if (!currentNode) {
        return {
          success: false,
          error: 'No active node found'
        };
      }

      if (!currentNode.parentId) {
        return {
          success: false,
          error: 'Current node has no parent'
        };
      }

      const parentNode = tree.nodes.get(currentNode.parentId);
      if (!parentNode) {
        return {
          success: false,
          error: 'Parent node not found'
        };
      }

      // Navigate to parent
      const result = await this.navigateToNode(tree, parentNode.id);
      
      const endTime = Date.now();
      
      if (result.success) {
        this.emit('parent-navigated', {
          treeId: tree.id,
          fromNodeId: currentNode.id,
          toNodeId: parentNode.id,
          timestamp: endTime
        });
      }

      return {
        ...result,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to navigate to parent', error);
      
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

  /**
   * Navigate to child node
   */
    async navigateToChild(tree: ConversationTree, childIndex = 0): Promise<NavigationResult> {
    const startTime = Date.now();

    try {
      const currentNode = this.getActiveNode(tree);
      if (!currentNode) {
        return {
          success: false,
          error: 'No active node found'
        };
      }

      if (currentNode.children.length === 0) {
        return {
          success: false,
          error: 'Current node has no children'
        };
      }

      if (childIndex >= currentNode.children.length || childIndex < 0) {
        return {
          success: false,
          error: `Child index ${childIndex} out of range (0-${currentNode.children.length - 1})`
        };
      }

      const childId = currentNode.children[childIndex];
      const childNode = tree.nodes.get(childId);
      if (!childNode) {
        return {
          success: false,
          error: 'Child node not found'
        };
      }

      // Navigate to child
      const result = await this.navigateToNode(tree, childNode.id);
      
      const endTime = Date.now();
      
      if (result.success) {
        this.emit('child-navigated', {
          treeId: tree.id,
          fromNodeId: currentNode.id,
          toNodeId: childNode.id,
          childIndex,
          timestamp: endTime
        });
      }

      return {
        ...result,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to navigate to child', error);
      
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

  /**
   * Get the active node in the tree
   */
  getActiveNode(tree: ConversationTree): ConversationNode | null {
    if (!tree.activeNodeId) {
      return null;
    }

    return tree.nodes.get(tree.activeNodeId) || null;
  }

  /**
   * Get a specific node by ID
   */
  getNode(tree: ConversationTree, nodeId: string): ConversationNode | null {
    return tree.nodes.get(nodeId) || null;
  }

  /**
   * Get navigation path from root to current node
   */
  getNavigationPath(tree: ConversationTree, nodeId?: string): ConversationNode[] {
    const targetNodeId = nodeId || tree.activeNodeId;
    if (!targetNodeId) {
      return [];
    }

    // Check cache first
    const cacheKey = `${tree.id}-${targetNodeId}`;
    if (this.config.enablePathCaching && this.pathCache.has(cacheKey)) {
      return this.pathCache.get(cacheKey)!;
    }

    const path: ConversationNode[] = [];
    let currentNode = tree.nodes.get(targetNodeId);

    while (currentNode) {
      path.unshift(currentNode);
      if (currentNode.parentId) {
        currentNode = tree.nodes.get(currentNode.parentId);
      } else {
        currentNode = undefined;
      }
    }

    // Cache the path
    if (this.config.enablePathCaching) {
      this.pathCache.set(cacheKey, path);
      
      // Limit cache size
      if (this.pathCache.size > this.config.cacheSize) {
        const firstKey = this.pathCache.keys().next().value;
        this.pathCache.delete(firstKey);
      }
    }

    return path;
  }

  /**
   * Get node history (path from root to node)
   */
  async getNodeHistory(tree: ConversationTree, nodeId: string): Promise<NavigationResult> {
    const startTime = Date.now();

    try {
      const node = tree.nodes.get(nodeId);
      if (!node) {
        return {
          success: false,
          error: `Node not found: ${nodeId}`
        };
      }

      const path = this.getNavigationPath(tree, nodeId);
      const endTime = Date.now();

      logger.debug('Retrieved node history', {
        treeId: tree.id,
        nodeId,
        pathLength: path.length
      });

      return {
        success: true,
        node,
        path,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Failed to get node history', error);
      
      return {
        success: false,
        error: `History retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
        timing: {
          startTime,
          endTime,
          duration: endTime - startTime
        }
      };
    }
  }

  /**
   * Get all branches in the tree
   */
  getBranches(tree: ConversationTree): ConversationNode[] {
    const branches: ConversationNode[] = [];
    
    for (const node of tree.nodes.values()) {
      // A node is a branch point if it has multiple children or is the start of a named branch
      if (node.children.length > 1 || (node.metadata?.branchName && node.metadata.branchName !== 'main')) {
        branches.push(node);
      }
    }

    return branches.sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Find nodes by criteria
   */
  findNodes(tree: ConversationTree, criteria: {
    branchName?: string;
    hasMessages?: boolean;
    minDepth?: number;
    maxDepth?: number;
    createdAfter?: number;
    createdBefore?: number;
  }): ConversationNode[] {
    const results: ConversationNode[] = [];

    for (const node of tree.nodes.values()) {
      let matches = true;

      // Check branch name
      if (criteria.branchName && node.metadata?.branchName !== criteria.branchName) {
        matches = false;
      }

      // Check if has messages
      if (criteria.hasMessages !== undefined && (node.messages.length > 0) !== criteria.hasMessages) {
        matches = false;
      }

      // Check depth
      if (criteria.minDepth !== undefined || criteria.maxDepth !== undefined) {
        const depth = this.getNodeDepth(tree, node.id);
        if (criteria.minDepth !== undefined && depth < criteria.minDepth) {
          matches = false;
        }
        if (criteria.maxDepth !== undefined && depth > criteria.maxDepth) {
          matches = false;
        }
      }

      // Check creation time
      if (criteria.createdAfter && node.createdAt < criteria.createdAfter) {
        matches = false;
      }
      if (criteria.createdBefore && node.createdAt > criteria.createdBefore) {
        matches = false;
      }

      if (matches) {
        results.push(node);
      }
    }

    return results;
  }

  /**
   * Get node depth in tree
   */
  getNodeDepth(tree: ConversationTree, nodeId: string): number {
    const path = this.getNavigationPath(tree, nodeId);
    return Math.max(0, path.length - 1);
  }

  /**
   * Get tree statistics
   */
  getTreeStatistics(tree: ConversationTree): {
    totalNodes: number;
    maxDepth: number;
    branchCount: number;
    messageCount: number;
    averageDepth: number;
  } {
    const totalNodes = tree.nodes.size;
    let maxDepth = 0;
    let totalDepth = 0;
    let messageCount = 0;
    const branchPoints = new Set<string>();

    for (const node of tree.nodes.values()) {
      const depth = this.getNodeDepth(tree, node.id);
      maxDepth = Math.max(maxDepth, depth);
      totalDepth += depth;
      messageCount += node.messages.length;

      if (node.children.length > 1) {
        branchPoints.add(node.id);
      }
    }

    return {
      totalNodes,
      maxDepth,
      branchCount: branchPoints.size,
      messageCount,
      averageDepth: totalNodes > 0 ? totalDepth / totalNodes : 0
    };
  }

  /**
   * Update navigation state for a tree
   */
  private updateNavigationState(treeId: string, nodeId: string): void {
    const state = this.navigationStates.get(treeId) || {
      lastNavigationTime: 0,
      navigationHistory: []
    };

    state.currentNodeId = nodeId;
    state.lastNavigationTime = Date.now();
    
    // Add to history (keep last 50 navigations)
    state.navigationHistory.push(nodeId);
    if (state.navigationHistory.length > 50) {
      state.navigationHistory = state.navigationHistory.slice(-50);
    }

    this.navigationStates.set(treeId, state);
  }

  /**
   * Get navigation state for a tree
   */
  getNavigationState(treeId: string): NavigationState | null {
    return this.navigationStates.get(treeId) || null;
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.pathCache.clear();
    this.nodeCache.clear();
    
    this.emit('caches-cleared', {
      timestamp: Date.now()
    });

    logger.debug('Navigation caches cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NavigationConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Clear caches if caching disabled
    if (!this.config.enablePathCaching) {
      this.pathCache.clear();
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearCaches();
    this.navigationStates.clear();
    this.removeAllListeners();
    
    logger.debug('Conversation tree navigation service cleaned up');
  }
}

/**
 * Factory function for creating navigation service
 */
export function createConversationTreeNavigationService(config?: Partial<NavigationConfig>): ConversationTreeNavigationService {
  return new ConversationTreeNavigationService(config);
}