/**
 * Conversation Tree Visualizer
 * 
 * This module provides ASCII-based tree visualization for conversation trees,
 * including layout algorithms, visual indicators, and terminal-optimized rendering.
 */

import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import type {
  ConversationTree,
  ConversationNode,
  TreeVisualizationData,
  TreeVisualizationOptions,
  VisualizationNode,
  VisualizationEdge,
  TreeLayout,
  TreeStats,
  VisualizationLegend
} from './types.js';

// ASCII characters for tree drawing
const TREE_CHARS = {
  // Box drawing characters
  VERTICAL: '│',
  HORIZONTAL: '─',
  TOP_LEFT: '┌',
  TOP_RIGHT: '┐',
  BOTTOM_LEFT: '└',
  BOTTOM_RIGHT: '┘',
  CROSS: '┼',
  T_DOWN: '┬',
  T_UP: '┴',
  T_RIGHT: '├',
  T_LEFT: '┤',
  
  // Tree structure
  BRANCH: '├',
  LAST_BRANCH: '└',
  CONTINUE: '│',
  SPACE: ' ',
  
  // Special indicators
  ACTIVE: '●',
  INACTIVE: '○',
  MERGED: '◆',
  CONFLICT: '⚠',
  ROOT: '◉',
  
  // Status indicators
  CURRENT: '→',
  MODIFIED: '*',
  COMPRESSED: '~',
  
  // Connection lines
  LINE_STRAIGHT: '─',
  LINE_CURVED: '╭',
  LINE_CURVED_END: '╰'
} as const;

// Color codes for terminal output
const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  
  // Text colors
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  GRAY: '\x1b[90m',
  
  // Background colors
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m'
} as const;

interface TreeRenderContext {
  tree: ConversationTree;
  options: TreeVisualizationOptions;
  stats: TreeStats;
  maxWidth: number;
  maxDepth: number;
  nodePositions: Map<string, { x: number; y: number; depth: number }>;
  renderLines: string[];
}

interface NodeRenderInfo {
  id: string;
  displayName: string;
  indicator: string;
  color: string;
  isActive: boolean;
  isHighlighted: boolean;
  metadata: string[];
  children: string[];
  depth: number;
}

/**
 * Tree Visualization System
 */
export class ConversationTreeVisualizer {
  private defaultOptions: TreeVisualizationOptions = {
    maxWidth: 120,
    maxDepth: 20,
    showMetadata: true,
    showTimestamps: false,
    highlightActive: true,
    highlightConflicts: true,
    highlightPath: [],
    hideMerged: false,
    hideOld: false,
    tagsFilter: []
  };

  /**
   * Generate visualization data for a conversation tree
   */
  async generateVisualization(
    tree: ConversationTree,
    options: Partial<TreeVisualizationOptions> = {}
  ): Promise<TreeVisualizationData> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      // Calculate tree statistics
      const stats = this.calculateTreeStats(tree);
      
      // Build visualization nodes and edges
      const { nodes, edges } = this.buildVisualizationGraph(tree, mergedOptions);
      
      // Calculate layout
      const layout = this.calculateLayout(nodes, edges, mergedOptions);
      
      // Generate legend
      const legend = this.generateLegend(tree, stats);
      
      return {
        nodes,
        edges,
        layout,
        ascii: '', // Will be populated by caller if needed
        stats,
        legend
      };
    } catch (error) {
      logger.error('Failed to generate tree visualization', { error, treeId: tree.id });
      throw createUserError('Failed to generate tree visualization', {
        category: ErrorCategory.SYSTEM,
        cause: error
      });
    }
  }

  /**
   * Render tree as ASCII art for terminal display
   */
  async renderTree(
    tree: ConversationTree,
    options: Partial<TreeVisualizationOptions> = {}
  ): Promise<string> {
    const visualization = await this.generateVisualization(tree, options);
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    const context: TreeRenderContext = {
      tree,
      options: mergedOptions,
      stats: visualization.stats,
      maxWidth: mergedOptions.maxWidth,
      maxDepth: mergedOptions.maxDepth,
      nodePositions: new Map(),
      renderLines: []
    };

    // Render tree structure
    await this.renderTreeStructure(context);
    
    // Add header and footer
    const header = this.renderHeader(tree, visualization.stats);
    const footer = this.renderFooter(visualization.legend);
    
    return [header, ...context.renderLines, footer].join('\n');
  }

  /**
   * Calculate tree statistics
   */
  private calculateTreeStats(tree: ConversationTree): TreeStats {
    const nodes = Array.from(tree.nodes.values());
    
    let maxDepth = 0;
    let totalMessages = 0;
    let branchCount = 0;
    let mergedBranches = 0;
    let conflictedBranches = 0;
    
    // Calculate depths and count branches
    const calculateDepth = (nodeId: string, depth = 0): number => {
      maxDepth = Math.max(maxDepth, depth);
      const node = tree.nodes.get(nodeId);
      if (!node) return depth;
      
      totalMessages += node.messages.length;
      
      if (node.children.length > 1) {
        branchCount++;
      }
      
      if (node.metadata.mergeStatus === 'merged') {
        mergedBranches++;
      } else if (node.metadata.mergeStatus === 'conflict') {
        conflictedBranches++;
      }
      
      let maxChildDepth = depth;
      for (const childId of node.children) {
        const childDepth = calculateDepth(childId, depth + 1);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
      
      return maxChildDepth;
    };
    
    calculateDepth(tree.rootId);
    
    return {
      totalNodes: nodes.length,
      totalMessages,
      maxDepth,
      branchCount,
      mergedBranches,
      conflictedBranches,
      averageMessagesPerNode: totalMessages / nodes.length,
      compressionRatio: this.calculateCompressionRatio(nodes),
      lastModified: Math.max(...nodes.map(n => n.lastModified))
    };
  }

  /**
   * Build visualization graph from tree structure
   */
  private buildVisualizationGraph(
    tree: ConversationTree,
    options: TreeVisualizationOptions
  ): { nodes: VisualizationNode[]; edges: VisualizationEdge[] } {
    const nodes: VisualizationNode[] = [];
    const edges: VisualizationEdge[] = [];
    
    const processNode = (nodeId: string, depth = 0): void => {
      const node = tree.nodes.get(nodeId);
      if (!node) return;
      
      // Apply filters
      if (this.shouldHideNode(node, options)) {
        return;
      }
      
      // Create visualization node
      const vizNode: VisualizationNode = {
        id: nodeId,
        displayName: this.getNodeDisplayName(node),
        position: { x: 0, y: 0 }, // Will be calculated in layout
        size: { width: 0, height: 1 },
        style: this.getNodeStyle(node, tree.activeNodeId === nodeId, options),
        metadata: this.getNodeMetadata(node, options),
        depth,
        isActive: tree.activeNodeId === nodeId,
        isHighlighted: options.highlightPath.includes(nodeId)
      };
      
      nodes.push(vizNode);
      
      // Create edges to children
      for (const childId of node.children) {
        const childNode = tree.nodes.get(childId);
        if (childNode && !this.shouldHideNode(childNode, options)) {
          edges.push({
            from: nodeId,
            to: childId,
            style: this.getEdgeStyle(node, childNode, options)
          });
        }
        
        processNode(childId, depth + 1);
      }
    };
    
    processNode(tree.rootId);
    
    return { nodes, edges };
  }

  /**
   * Calculate layout positions for nodes
   */
  private calculateLayout(
    nodes: VisualizationNode[],
    edges: VisualizationEdge[],
    options: TreeVisualizationOptions
  ): TreeLayout {
    // Group nodes by depth
    const nodesByDepth = new Map<number, VisualizationNode[]>();
    for (const node of nodes) {
      const depthNodes = nodesByDepth.get(node.depth) || [];
      depthNodes.push(node);
      nodesByDepth.set(node.depth, depthNodes);
    }
    
    // Calculate positions
    let currentY = 0;
    const spacing = 2;
    
    for (let depth = 0; depth <= Math.max(...nodes.map(n => n.depth)); depth++) {
      const depthNodes = nodesByDepth.get(depth) || [];
      
      for (let i = 0; i < depthNodes.length; i++) {
        const node = depthNodes[i];
        node.position.x = depth * 4; // 4 characters per depth level
        node.position.y = currentY;
        
        // Calculate node width based on content
        const nameWidth = node.displayName.length;
        const metadataWidth = Math.max(...node.metadata.map(m => m.length), 0);
        node.size.width = Math.max(nameWidth, metadataWidth) + 2;
        
        currentY += spacing;
      }
    }
    
    return {
      width: Math.max(...nodes.map(n => n.position.x + n.size.width)),
      height: currentY,
      algorithm: 'hierarchical'
    };
  }

  /**
   * Render the main tree structure
   */
  private async renderTreeStructure(context: TreeRenderContext): Promise<void> {
    const { tree, options } = context;
    
    // Initialize render grid
    const maxLines = 100; // Reasonable limit for terminal display
    context.renderLines = new Array(maxLines).fill('').map(() => ' '.repeat(context.maxWidth));
    
    // Render from root
    await this.renderNodeRecursive(
      tree.rootId,
      context,
      0, // depth
      0, // y position
      '', // prefix for tree lines
      true // is last child
    );
    
    // Trim empty lines
    while (context.renderLines.length > 0 && context.renderLines[context.renderLines.length - 1].trim() === '') {
      context.renderLines.pop();
    }
  }

  /**
   * Recursively render nodes and their children
   */
  private async renderNodeRecursive(
    nodeId: string,
    context: TreeRenderContext,
    depth: number,
    yPos: number,
    prefix: string,
    isLast: boolean
  ): Promise<number> {
    const { tree, options } = context;
    const node = tree.nodes.get(nodeId);
    
    if (!node || this.shouldHideNode(node, options) || depth > context.maxDepth) {
      return yPos;
    }
    
    // Get node render info
    const renderInfo = this.getNodeRenderInfo(node, tree.activeNodeId === nodeId, options);
    
    // Render current node
    const nodePrefix = depth === 0 ? '' : prefix + (isLast ? TREE_CHARS.LAST_BRANCH : TREE_CHARS.BRANCH);
    const nodeLine = this.formatNodeLine(nodePrefix, renderInfo);
    
    if (yPos < context.renderLines.length) {
      context.renderLines[yPos] = nodeLine.slice(0, context.maxWidth);
      context.nodePositions.set(nodeId, { x: nodePrefix.length, y: yPos, depth });
    }
    
    yPos++;
    
    // Render metadata if enabled
    if (options.showMetadata && renderInfo.metadata.length > 0) {
      for (const metadata of renderInfo.metadata) {
        if (yPos < context.renderLines.length) {
          const metadataPrefix = depth === 0 ? '  ' : prefix + (isLast ? '  ' : TREE_CHARS.CONTINUE + ' ');
          const metadataLine = metadataPrefix + COLORS.DIM + metadata + COLORS.RESET;
          context.renderLines[yPos] = metadataLine.slice(0, context.maxWidth);
        }
        yPos++;
      }
    }
    
    // Render children
    const children = node.children.filter(childId => {
      const childNode = tree.nodes.get(childId);
      return childNode && !this.shouldHideNode(childNode, options);
    });
    
    for (let i = 0; i < children.length; i++) {
      const childId = children[i];
      const isLastChild = i === children.length - 1;
      const childPrefix = depth === 0 ? '' : prefix + (isLast ? '  ' : TREE_CHARS.CONTINUE + ' ');
      
      yPos = await this.renderNodeRecursive(
        childId,
        context,
        depth + 1,
        yPos,
        childPrefix,
        isLastChild
      );
    }
    
    return yPos;
  }

  /**
   * Get node rendering information
   */
  private getNodeRenderInfo(
    node: ConversationNode,
    isActive: boolean,
    options: TreeVisualizationOptions
  ): NodeRenderInfo {
    const displayName = this.getNodeDisplayName(node);
    const indicator = this.getNodeIndicator(node, isActive);
    const color = this.getNodeColor(node, isActive, options);
    const metadata = this.getNodeMetadata(node, options);
    
    return {
      id: node.id,
      displayName,
      indicator,
      color,
      isActive,
      isHighlighted: options.highlightPath.includes(node.id),
      metadata,
      children: node.children,
      depth: 0 // Will be set by caller
    };
  }

  /**
   * Format a complete node line with colors and indicators
   */
  private formatNodeLine(prefix: string, renderInfo: NodeRenderInfo): string {
    const parts = [
      prefix,
      TREE_CHARS.LINE_STRAIGHT,
      ' ',
      renderInfo.color,
      renderInfo.indicator,
      ' ',
      renderInfo.displayName
    ];
    
    if (renderInfo.isActive) {
      parts.push(' ', COLORS.BRIGHT, COLORS.YELLOW, TREE_CHARS.CURRENT, COLORS.RESET);
    }
    
    parts.push(COLORS.RESET);
    
    return parts.join('');
  }

  /**
   * Get display name for a node
   */
  private getNodeDisplayName(node: ConversationNode): string {
    if (node.metadata.branchName) {
      return node.metadata.branchName;
    }
    
    if (node.name) {
      return node.name;
    }
    
    // Generate name from content
    if (node.messages.length > 0) {
      const firstMessage = node.messages[0];
      const content = typeof firstMessage.content === 'string' 
        ? firstMessage.content 
        : JSON.stringify(firstMessage.content);
      return content.slice(0, 30) + (content.length > 30 ? '...' : '');
    }
    
    return `Node ${node.id.slice(0, 8)}`;
  }

  /**
   * Get visual indicator for a node
   */
  private getNodeIndicator(node: ConversationNode, isActive: boolean): string {
    if (isActive) {
      return TREE_CHARS.ACTIVE;
    }
    
    if (node.metadata.isMainBranch) {
      return TREE_CHARS.ROOT;
    }
    
    switch (node.metadata.mergeStatus) {
      case 'merged':
        return TREE_CHARS.MERGED;
      case 'conflict':
        return TREE_CHARS.CONFLICT;
      default:
        return TREE_CHARS.INACTIVE;
    }
  }

  /**
   * Get color for a node
   */
  private getNodeColor(
    node: ConversationNode,
    isActive: boolean,
    options: TreeVisualizationOptions
  ): string {
    if (isActive && options.highlightActive) {
      return COLORS.BRIGHT + COLORS.GREEN;
    }
    
    if (options.highlightConflicts && node.metadata.mergeStatus === 'conflict') {
      return COLORS.BRIGHT + COLORS.RED;
    }
    
    if (options.highlightPath.includes(node.id)) {
      return COLORS.BRIGHT + COLORS.CYAN;
    }
    
    if (node.metadata.isMainBranch) {
      return COLORS.BRIGHT + COLORS.BLUE;
    }
    
    return COLORS.WHITE;
  }

  /**
   * Get metadata lines for a node
   */
  private getNodeMetadata(node: ConversationNode, options: TreeVisualizationOptions): string[] {
    const metadata: string[] = [];
    
    if (options.showMetadata) {
      metadata.push(`${node.messages.length} messages`);
      
      if (node.metadata.tags.length > 0) {
        metadata.push(`tags: ${node.metadata.tags.join(', ')}`);
      }
    }
    
    if (options.showTimestamps) {
      const date = new Date(node.lastModified).toLocaleDateString();
      metadata.push(`modified: ${date}`);
    }
    
    return metadata;
  }

  /**
   * Check if a node should be hidden based on filters
   */
  private shouldHideNode(node: ConversationNode, options: TreeVisualizationOptions): boolean {
    if (options.hideMerged && node.metadata.mergeStatus === 'merged') {
      return true;
    }
    
    if (options.hideOld) {
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      if (node.lastModified < weekAgo) {
        return true;
      }
    }
    
    if (options.tagsFilter.length > 0) {
      const hasMatchingTag = options.tagsFilter.some(tag => 
        node.metadata.tags.includes(tag)
      );
      if (!hasMatchingTag) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get node style for visualization
   */
  private getNodeStyle(
    node: ConversationNode,
    isActive: boolean,
    options: TreeVisualizationOptions
  ): Record<string, any> {
    return {
      color: this.getNodeColor(node, isActive, options),
      indicator: this.getNodeIndicator(node, isActive),
      highlighted: options.highlightPath.includes(node.id)
    };
  }

  /**
   * Get edge style for visualization
   */
  private getEdgeStyle(
    fromNode: ConversationNode,
    toNode: ConversationNode,
    options: TreeVisualizationOptions
  ): Record<string, any> {
    return {
      color: COLORS.GRAY,
      style: 'solid'
    };
  }

  /**
   * Calculate compression ratio for nodes
   */
  private calculateCompressionRatio(nodes: ConversationNode[]): number {
    let totalOriginal = 0;
    let totalCompressed = 0;
    
    for (const node of nodes) {
      const originalSize = JSON.stringify(node).length;
      totalOriginal += originalSize;
      
      if (node.metadata.compressionRatio) {
        totalCompressed += originalSize * node.metadata.compressionRatio;
      } else {
        totalCompressed += originalSize;
      }
    }
    
    return totalOriginal > 0 ? totalCompressed / totalOriginal : 1;
  }

  /**
   * Generate legend for the visualization
   */
  private generateLegend(tree: ConversationTree, stats: TreeStats): VisualizationLegend {
    return {
      symbols: [
        { symbol: TREE_CHARS.ACTIVE, description: 'Active node', color: COLORS.GREEN },
        { symbol: TREE_CHARS.ROOT, description: 'Main branch', color: COLORS.BLUE },
        { symbol: TREE_CHARS.MERGED, description: 'Merged branch', color: COLORS.GRAY },
        { symbol: TREE_CHARS.CONFLICT, description: 'Conflict', color: COLORS.RED },
        { symbol: TREE_CHARS.CURRENT, description: 'Current position', color: COLORS.YELLOW }
      ],
      stats: [
        `Nodes: ${stats.totalNodes}`,
        `Messages: ${stats.totalMessages}`,
        `Max Depth: ${stats.maxDepth}`,
        `Branches: ${stats.branchCount}`,
        `Conflicts: ${stats.conflictedBranches}`
      ]
    };
  }

  /**
   * Render header with tree information
   */
  private renderHeader(tree: ConversationTree, stats: TreeStats): string {
    const title = `Conversation Tree: ${tree.name || tree.id}`;
    const separator = '═'.repeat(Math.min(title.length + 4, 80));
    
    return [
      COLORS.BRIGHT + COLORS.CYAN + separator + COLORS.RESET,
      COLORS.BRIGHT + `  ${title}` + COLORS.RESET,
      COLORS.DIM + `  ${stats.totalNodes} nodes, ${stats.totalMessages} messages, depth ${stats.maxDepth}` + COLORS.RESET,
      COLORS.BRIGHT + COLORS.CYAN + separator + COLORS.RESET,
      ''
    ].join('\n');
  }

  /**
   * Render footer with legend
   */
  private renderFooter(legend: VisualizationLegend): string {
    const lines = ['', COLORS.DIM + 'Legend:' + COLORS.RESET];
    
    for (const symbol of legend.symbols) {
      lines.push(`  ${symbol.color}${symbol.symbol}${COLORS.RESET} ${symbol.description}`);
    }
    
    lines.push('');
    lines.push(COLORS.DIM + 'Statistics:' + COLORS.RESET);
    for (const stat of legend.stats) {
      lines.push(`  ${stat}`);
    }
    
    return lines.join('\n');
  }
}

// Export singleton instance (class is already exported)
export const conversationTreeVisualizer = new ConversationTreeVisualizer(); 

// Alias for backwards compatibility
export const TreeVisualizer = ConversationTreeVisualizer; 