/**
 * Interactive Conversation Tree Navigator
 * 
 * This module provides an interactive terminal UI for navigating conversation trees
 * with keyboard shortcuts, real-time updates, and visual feedback.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { createConversationTreeServices } from '../services/conversation-tree-services/index.js';
import { conversationTreeVisualizer } from './tree-visualizer.js';
import type {
  ConversationTree,
  ConversationNode,
  TreeVisualizationOptions,
  ConversationTreeEvent
} from './types.js';

// Key mappings for navigation
const KEY_MAPPINGS: Record<string, string[]> = {
  // Navigation
  UP: ['ArrowUp', 'k'],
  DOWN: ['ArrowDown', 'j'],
  LEFT: ['ArrowLeft', 'h'],
  RIGHT: ['ArrowRight', 'l'],
  
  // Tree operations
  EXPAND: ['Enter', ' '],
  COLLAPSE: ['Backspace'],
  SELECT: ['Enter'],
  
  // Branch operations
  CREATE_BRANCH: ['b'],
  SWITCH_BRANCH: ['s'],
  MERGE_BRANCH: ['m'],
  
  // View controls
  TOGGLE_METADATA: ['i'],
  TOGGLE_TIMESTAMPS: ['t'],
  FILTER_CONFLICTS: ['c'],
  FILTER_MERGED: ['M'],
  
  // Navigation shortcuts
  GO_TO_ROOT: ['g', 'g'],
  GO_TO_ACTIVE: ['a'],
  GO_TO_PARENT: ['p'],
  
  // Search and filtering
  SEARCH: ['/'],
  CLEAR_FILTER: ['x'],
  
  // Help and exit
  HELP: ['?', 'h'],
  QUIT: ['q', 'Escape'],
  REFRESH: ['r']
};

interface NavigationState {
  selectedNodeId: string;
  expandedNodes: Set<string>;
  highlightedPath: string[];
  viewOptions: TreeVisualizationOptions;
  searchQuery: string;
  filterActive: boolean;
  showHelp: boolean;
}

interface NavigationContext {
  tree: ConversationTree;
  state: NavigationState;
  renderBuffer: string[];
  cursorPosition: { x: number; y: number };
  terminalSize: { width: number; height: number };
  lastRender: number;
}

/**
 * Interactive Tree Navigation UI
 */
export class ConversationTreeNavigator extends EventEmitter {
  private context: NavigationContext | null = null;
  private isActive = false;
  private keyBuffer: string[] = [];
  private keyTimeout: NodeJS.Timeout | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private treeServices = createConversationTreeServices();
  private treeManager = this.treeServices.orchestrator;

  constructor() {
    super();
    this.setupKeyboardHandlers();
  }

  /**
   * Start interactive navigation for a tree
   */
  async startInteractiveMode(): Promise<void> {
    const tree = this.treeManager.getActiveTree();
    if (!tree) {
      throw new Error('No active tree found for navigation');
    }
    
    await this.startNavigation(tree.id);
  }

    async startNavigation(treeId: string): Promise<void> {
    try {
      // Load the tree
      const result = await this.treeServices.lifecycleService.loadTree(treeId);
      if (!result.success) {
        throw createUserError(`Tree not found: ${treeId}`, {
          category: ErrorCategory.USER_INPUT,
          resolution: 'Check tree ID and try again'
        });
      }
      const tree = result.tree;

      // Initialize navigation context
      if (!tree) {
        throw new Error('Failed to load tree');
      }
      this.context = {
        tree,
        state: {
          selectedNodeId: tree.activeNodeId,
          expandedNodes: new Set([tree.rootId]),
          highlightedPath: [],
          viewOptions: {
            maxWidth: process.stdout.columns || 120,
            maxDepth: 20,
            showMetadata: true,
            showTimestamps: false,
            highlightActive: true,
            highlightConflicts: true,
            highlightPath: [],
            hideMerged: false,
            hideOld: false,
            tagsFilter: []
          },
          searchQuery: '',
          filterActive: false,
          showHelp: false
        },
        renderBuffer: [],
        cursorPosition: { x: 0, y: 0 },
        terminalSize: {
          width: process.stdout.columns || 120,
          height: process.stdout.rows || 40
        },
        lastRender: 0
      };

      // Start navigation
      this.isActive = true;
      this.emit('navigation_started', { treeId });
      
      // Initial render
      await this.render();
      
      // Start refresh interval
      this.startRefreshInterval();
      
      logger.info('Tree navigation started', { treeId });
    } catch (error) {
      logger.error('Failed to start tree navigation', { error, treeId });
      throw error;
    }
  }

  /**
   * Stop interactive navigation
   */
  async stopNavigation(): Promise<void> {
    if (!this.isActive) return;

    this.isActive = false;
    this.stopRefreshInterval();
    this.clearKeyBuffer();
    
    // Clear screen and restore cursor
    process.stdout.write('\x1b[2J\x1b[H\x1b[?25h');
    
    this.emit('navigation_stopped');
    logger.info('Tree navigation stopped');
  }

  /**
   * Handle keyboard input
   */
  private async handleKeyPress(key: string): Promise<void> {
    if (!this.isActive || !this.context) return;

    try {
      // Add to key buffer for multi-key commands
      this.keyBuffer.push(key);
      this.resetKeyTimeout();

      // Check for multi-key commands first
      if (this.handleMultiKeyCommands()) {
        this.clearKeyBuffer();
        return;
      }

      // Handle single key commands
      await this.handleSingleKeyCommand(key);
      
      // Clear buffer after successful command
      this.clearKeyBuffer();
    } catch (error) {
      logger.error('Error handling key press', { error, key });
      this.clearKeyBuffer();
    }
  }

  /**
   * Handle multi-key commands (like 'gg' for go to root)
   */
  private handleMultiKeyCommands(): boolean {
    const buffer = this.keyBuffer.join('');
    
    // Go to root (gg)
    if (buffer === 'gg') {
      this.goToRoot();
      return true;
    }
    
    return false;
  }

  /**
   * Handle single key commands
   */
  private async handleSingleKeyCommand(key: string): Promise<void> {
    if (!this.context) return;

    // Navigation
    if (KEY_MAPPINGS.UP.includes(key)) {
      await this.navigateUp();
    } else if (KEY_MAPPINGS.DOWN.includes(key)) {
      await this.navigateDown();
    } else if (KEY_MAPPINGS.LEFT.includes(key)) {
      await this.navigateLeft();
    } else if (KEY_MAPPINGS.RIGHT.includes(key)) {
      await this.navigateRight();
    }
    
    // Tree operations
    else if (KEY_MAPPINGS.EXPAND.includes(key)) {
      await this.expandOrSelectNode();
    } else if (KEY_MAPPINGS.COLLAPSE.includes(key)) {
      await this.collapseNode();
    }
    
    // Branch operations
    else if (KEY_MAPPINGS.CREATE_BRANCH.includes(key)) {
      await this.createBranchPrompt();
    } else if (KEY_MAPPINGS.SWITCH_BRANCH.includes(key)) {
      await this.switchToSelected();
    } else if (KEY_MAPPINGS.MERGE_BRANCH.includes(key)) {
      await this.mergeBranchPrompt();
    }
    
    // View controls
    else if (KEY_MAPPINGS.TOGGLE_METADATA.includes(key)) {
      this.toggleMetadata();
    } else if (KEY_MAPPINGS.TOGGLE_TIMESTAMPS.includes(key)) {
      this.toggleTimestamps();
    } else if (KEY_MAPPINGS.FILTER_CONFLICTS.includes(key)) {
      this.toggleConflictFilter();
    } else if (KEY_MAPPINGS.FILTER_MERGED.includes(key)) {
      this.toggleMergedFilter();
    }
    
    // Navigation shortcuts
    else if (KEY_MAPPINGS.GO_TO_ACTIVE.includes(key)) {
      this.goToActive();
    } else if (KEY_MAPPINGS.GO_TO_PARENT.includes(key)) {
      await this.goToParent();
    }
    
    // Search and filtering
    else if (KEY_MAPPINGS.SEARCH.includes(key)) {
      await this.startSearch();
    } else if (KEY_MAPPINGS.CLEAR_FILTER.includes(key)) {
      this.clearFilters();
    }
    
    // Help and exit
    else if (KEY_MAPPINGS.HELP.includes(key)) {
      this.toggleHelp();
    } else if (KEY_MAPPINGS.QUIT.includes(key)) {
      await this.stopNavigation();
      return;
    } else if (KEY_MAPPINGS.REFRESH.includes(key)) {
      await this.refresh();
    }

    // Re-render after command
    await this.render();
  }

  /**
   * Navigate up to previous node
   */
  private async navigateUp(): Promise<void> {
    if (!this.context) return;

    const visibleNodes = await this.getVisibleNodes();
    const currentIndex = visibleNodes.findIndex(id => id === this.context!.state.selectedNodeId);
    
    if (currentIndex > 0) {
      this.context.state.selectedNodeId = visibleNodes[currentIndex - 1];
      this.updateHighlightedPath();
    }
  }

  /**
   * Navigate down to next node
   */
  private async navigateDown(): Promise<void> {
    if (!this.context) return;

    const visibleNodes = await this.getVisibleNodes();
    const currentIndex = visibleNodes.findIndex(id => id === this.context!.state.selectedNodeId);
    
    if (currentIndex < visibleNodes.length - 1) {
      this.context.state.selectedNodeId = visibleNodes[currentIndex + 1];
      this.updateHighlightedPath();
    }
  }

  /**
   * Navigate left (collapse or go to parent)
   */
  private async navigateLeft(): Promise<void> {
    if (!this.context) return;

    const selectedNode = this.context.tree.nodes.get(this.context.state.selectedNodeId);
    if (!selectedNode) return;

    // If node is expanded, collapse it
    if (this.context.state.expandedNodes.has(selectedNode.id)) {
      this.context.state.expandedNodes.delete(selectedNode.id);
    }
    // Otherwise go to parent
    else if (selectedNode.parentId) {
      this.context.state.selectedNodeId = selectedNode.parentId;
      this.updateHighlightedPath();
    }
  }

  /**
   * Navigate right (expand or go to first child)
   */
  private async navigateRight(): Promise<void> {
    if (!this.context) return;

    const selectedNode = this.context.tree.nodes.get(this.context.state.selectedNodeId);
    if (!selectedNode) return;

    // If node has children and is not expanded, expand it
    if (selectedNode.children.length > 0 && !this.context.state.expandedNodes.has(selectedNode.id)) {
      this.context.state.expandedNodes.add(selectedNode.id);
    }
    // If expanded and has children, go to first child
    else if (selectedNode.children.length > 0 && this.context.state.expandedNodes.has(selectedNode.id)) {
      this.context.state.selectedNodeId = selectedNode.children[0];
      this.updateHighlightedPath();
    }
  }

  /**
   * Expand node or select if already expanded
   */
  private async expandOrSelectNode(): Promise<void> {
    if (!this.context) return;

    const selectedNode = this.context.tree.nodes.get(this.context.state.selectedNodeId);
    if (!selectedNode) return;

    if (selectedNode.children.length > 0) {
      if (this.context.state.expandedNodes.has(selectedNode.id)) {
        // Already expanded, switch to this node
        await this.switchToSelected();
      } else {
        // Expand the node
        this.context.state.expandedNodes.add(selectedNode.id);
      }
    } else {
      // No children, switch to this node
      await this.switchToSelected();
    }
  }

  /**
   * Collapse selected node
   */
  private async collapseNode(): Promise<void> {
    if (!this.context) return;
    this.context.state.expandedNodes.delete(this.context.state.selectedNodeId);
  }

  /**
   * Switch to selected node
   */
  private async switchToSelected(): Promise<void> {
    if (!this.context) return;

    try {
      const result = await this.treeServices.navigationService.navigateToNode(this.context.tree, this.context.state.selectedNodeId);
      if (!result.success) {
        throw new Error('Failed to switch to selected node');
      }
      this.context.tree.activeNodeId = this.context.state.selectedNodeId;
      this.emit('node_switched', { nodeId: this.context.state.selectedNodeId });
    } catch (error) {
      logger.error('Failed to switch to selected node', { error });
      // Show error message in UI
    }
  }

  /**
   * Get list of visible nodes in order
   */
  private async getVisibleNodes(): Promise<string[]> {
    if (!this.context) return [];

    const visibleNodes: string[] = [];
    
    const traverse = (nodeId: string): void => {
      visibleNodes.push(nodeId);
      
      if (this.context!.state.expandedNodes.has(nodeId)) {
        const node = this.context!.tree.nodes.get(nodeId);
        if (node) {
          for (const childId of node.children) {
            traverse(childId);
          }
        }
      }
    };

    traverse(this.context.tree.rootId);
    return visibleNodes;
  }

  /**
   * Update highlighted path to selected node
   */
  private updateHighlightedPath(): void {
    if (!this.context) return;

    const path: string[] = [];
    let currentId: string | undefined = this.context.state.selectedNodeId;
    
    while (currentId) {
      path.unshift(currentId);
      const node = this.context.tree.nodes.get(currentId);
      currentId = node?.parentId;
    }
    
    this.context.state.highlightedPath = path;
    this.context.state.viewOptions.highlightPath = path;
  }

  /**
   * Go to root node
   */
  private goToRoot(): void {
    if (!this.context) return;
    this.context.state.selectedNodeId = this.context.tree.rootId;
    this.updateHighlightedPath();
  }

  /**
   * Go to active node
   */
  private goToActive(): void {
    if (!this.context) return;
    this.context.state.selectedNodeId = this.context.tree.activeNodeId;
    this.updateHighlightedPath();
  }

  /**
   * Go to parent of selected node
   */
  private async goToParent(): Promise<void> {
    if (!this.context) return;

    const selectedNode = this.context.tree.nodes.get(this.context.state.selectedNodeId);
    if (selectedNode?.parentId) {
      this.context.state.selectedNodeId = selectedNode.parentId;
      this.updateHighlightedPath();
    }
  }

  /**
   * Toggle metadata display
   */
  private toggleMetadata(): void {
    if (!this.context) return;
    this.context.state.viewOptions.showMetadata = !this.context.state.viewOptions.showMetadata;
  }

  /**
   * Toggle timestamp display
   */
  private toggleTimestamps(): void {
    if (!this.context) return;
    this.context.state.viewOptions.showTimestamps = !this.context.state.viewOptions.showTimestamps;
  }

  /**
   * Toggle conflict highlighting
   */
  private toggleConflictFilter(): void {
    if (!this.context) return;
    this.context.state.viewOptions.highlightConflicts = !this.context.state.viewOptions.highlightConflicts;
  }

  /**
   * Toggle merged node filtering
   */
  private toggleMergedFilter(): void {
    if (!this.context) return;
    this.context.state.viewOptions.hideMerged = !this.context.state.viewOptions.hideMerged;
  }

  /**
   * Clear all filters
   */
  private clearFilters(): void {
    if (!this.context) return;
    this.context.state.viewOptions.tagsFilter = [];
    this.context.state.viewOptions.hideMerged = false;
    this.context.state.viewOptions.hideOld = false;
    this.context.state.searchQuery = '';
  }

  /**
   * Toggle help display
   */
  private toggleHelp(): void {
    if (!this.context) return;
    this.context.state.showHelp = !this.context.state.showHelp;
  }

  /**
   * Refresh tree data
   */
  private async refresh(): Promise<void> {
    if (!this.context) return;

    try {
      const result = await this.treeServices.lifecycleService.loadTree(this.context.tree.id);
      if (result.success && result.tree) {
        this.context.tree = result.tree;
        this.emit('tree_refreshed', { treeId: result.tree.id });
      }
    } catch (error) {
      logger.error('Failed to refresh tree', { error });
    }
  }

  /**
   * Render the current state
   */
  private async render(): Promise<void> {
    if (!this.context || !this.isActive) return;

    try {
      // Hide cursor during render
      process.stdout.write('\x1b[?25l');
      
      // Clear screen
      process.stdout.write('\x1b[2J\x1b[H');
      
      if (this.context.state.showHelp) {
        this.renderHelp();
      } else {
        await this.renderTree();
      }
      
      // Show cursor
      process.stdout.write('\x1b[?25h');
      
      this.context.lastRender = Date.now();
    } catch (error) {
      logger.error('Failed to render tree navigation', { error });
    }
  }

  /**
   * Render the tree visualization
   */
  private async renderTree(): Promise<void> {
    if (!this.context) return;

    // Update view options with current selection
    this.context.state.viewOptions.highlightPath = [this.context.state.selectedNodeId];
    
    // Generate tree visualization
    const treeOutput = await conversationTreeVisualizer.renderTree(
      this.context.tree,
      this.context.state.viewOptions
    );
    
    // Add navigation indicators
    const lines = treeOutput.split('\n');
    const enhancedLines = this.addNavigationIndicators(lines);
    
    // Add status bar
    enhancedLines.push('');
    enhancedLines.push(this.renderStatusBar());
    
    // Output to terminal
    process.stdout.write(enhancedLines.join('\n'));
  }

  /**
   * Add navigation indicators to tree lines
   */
  private addNavigationIndicators(lines: string[]): string[] {
    if (!this.context) return lines;

    return lines.map(line => {
      // Highlight selected node line
      if (line.includes(this.context!.state.selectedNodeId.slice(0, 8))) {
        return `\x1b[7m${line}\x1b[0m`; // Reverse video
      }
      return line;
    });
  }

  /**
   * Render status bar
   */
  private renderStatusBar(): string {
    if (!this.context) return '';

    const selectedNode = this.context.tree.nodes.get(this.context.state.selectedNodeId);
    const statusParts = [
      `Selected: ${selectedNode?.name || selectedNode?.id.slice(0, 8) || 'None'}`,
      `Active: ${this.context.tree.activeNodeId.slice(0, 8)}`,
      `Nodes: ${this.context.tree.nodes.size}`,
      `Press ? for help, q to quit`
    ];
    
    const statusLine = statusParts.join(' | ');
    const separator = '─'.repeat(Math.min(statusLine.length, this.context.terminalSize.width));
    
    return `\x1b[90m${separator}\n${statusLine}\x1b[0m`;
  }

  /**
   * Render help screen
   */
  private renderHelp(): void {
    const helpText = `
┌─ Conversation Tree Navigator Help ─┐
│                                     │
│ Navigation:                         │
│   ↑/k        Move up                │
│   ↓/j        Move down              │
│   ←/h        Collapse/go to parent  │
│   →/l        Expand/go to child     │
│                                     │
│ Tree Operations:                    │
│   Enter/Space  Expand or switch     │
│   Backspace    Collapse node        │
│   b            Create branch        │
│   s            Switch to node       │
│   m            Merge branch         │
│                                     │
│ View Controls:                      │
│   i            Toggle metadata      │
│   t            Toggle timestamps    │
│   c            Toggle conflicts     │
│   M            Toggle merged        │
│                                     │
│ Navigation Shortcuts:               │
│   gg           Go to root           │
│   a            Go to active         │
│   p            Go to parent         │
│                                     │
│ Other:                              │
│   /            Search               │
│   x            Clear filters        │
│   r            Refresh              │
│   ?            Toggle help          │
│   q/Esc        Quit                 │
│                                     │
└─────────────────────────────────────┘

Press any key to return to tree view...
`;

    process.stdout.write(helpText);
  }

  /**
   * Start search mode
   */
  private async startSearch(): Promise<void> {
    // TODO: Implement search input
    // For now, just show a placeholder
    if (!this.context) return;
    
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write('Search: ');
    
    // This would need proper input handling for search
    // For now, return to normal view
    await this.render();
  }

  /**
   * Create branch prompt
   */
  private async createBranchPrompt(): Promise<void> {
    // TODO: Implement branch creation prompt
    // For now, just show a placeholder
    if (!this.context) return;
    
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write('Create branch from selected node...\n');
    process.stdout.write('Press any key to continue...');
    
    // This would need proper input handling
    // For now, return to normal view after a delay
    setTimeout(async () => {
      await this.render();
    }, 2000);
  }

  /**
   * Merge branch prompt
   */
  private async mergeBranchPrompt(): Promise<void> {
    // TODO: Implement merge prompt
    // For now, just show a placeholder
    if (!this.context) return;
    
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write('Merge selected branch...\n');
    process.stdout.write('Press any key to continue...');
    
    // This would need proper input handling
    // For now, return to normal view after a delay
    setTimeout(async () => {
      await this.render();
    }, 2000);
  }

  /**
   * Setup keyboard event handlers
   */
  private setupKeyboardHandlers(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', (key: string) => {
        this.handleKeyPress(key);
      });
    }
  }

  /**
   * Start refresh interval
   */
  private startRefreshInterval(): void {
    this.refreshInterval = setInterval(async () => {
      if (this.isActive && this.context) {
        await this.render();
      }
    }, 1000); // Refresh every second
  }

  /**
   * Stop refresh interval
   */
  private stopRefreshInterval(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Reset key timeout for multi-key commands
   */
  private resetKeyTimeout(): void {
    if (this.keyTimeout) {
      clearTimeout(this.keyTimeout);
    }
    
    this.keyTimeout = setTimeout(() => {
      this.clearKeyBuffer();
    }, 1000); // 1 second timeout for multi-key commands
  }

  /**
   * Clear key buffer
   */
  private clearKeyBuffer(): void {
    this.keyBuffer = [];
    if (this.keyTimeout) {
      clearTimeout(this.keyTimeout);
      this.keyTimeout = null;
    }
  }
}

// Export singleton instance (class is already exported)
export const conversationTreeNavigator = new ConversationTreeNavigator(); 

// Alias for backwards compatibility
export const TreeNavigator = ConversationTreeNavigator; 