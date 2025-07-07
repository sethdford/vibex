/**
 * Slash Commands for Conversation Tree Management
 * 
 * This module provides slash command functionality that integrates
 * conversation tree operations with the existing slash command infrastructure.
 */

import type { HistoryItem } from '../ui/types.js';
import { MessageType } from '../ui/types.js';
import { createConversationTreeServices } from '../services/conversation-tree-services/index.js';
import { ConversationTreeVisualizer } from './tree-visualizer.js';
import { ConversationTreeNavigator } from './tree-navigator.js';
import { logger } from '../utils/logger.js';
import { conversationState } from '../utils/conversation-state.js';
import { MergeStrategy } from './types.js';
import { createConversationTreeBranchService } from '../services/conversation-tree-branch.js';

/**
 * Chat command processor that adds tree functionality
 */
export class SlashCommands {
  private treeServices = createConversationTreeServices();
  private treeManager = this.treeServices.orchestrator;
  private lifecycleService = this.treeServices.lifecycleService;
  private navigationService = this.treeServices.navigationService;
  private branchService = createConversationTreeBranchService();
  private visualizer: ConversationTreeVisualizer;
  private navigator: ConversationTreeNavigator;
  private isInitialized = false;

  constructor() {
    this.visualizer = new ConversationTreeVisualizer();
    this.navigator = new ConversationTreeNavigator();
  }

  /**
   * Initialize the slash commands
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.treeManager.initialize();
      await conversationState.initialize();
      this.isInitialized = true;
      logger.info('Slash commands initialized');
    } catch (error) {
      logger.error('Failed to initialize slash commands:', error);
      throw error;
    }
  }

  /**
   * Process chat commands with tree functionality
   */
  async processChatCommand(
    subCommand: string,
    args: string[],
    addItem: (item: Partial<HistoryItem>, timestamp?: number) => void,
    clearItems: () => void
  ): Promise<boolean> {
    await this.initialize();

    try {
      switch (subCommand) {
        case 'branch':
          return await this.handleBranchCommand(args, addItem);
        case 'switch':
          return await this.handleSwitchCommand(args, addItem, clearItems);
        case 'merge':
          return await this.handleMergeCommand(args, addItem);
        case 'tree':
          return await this.handleTreeCommand(args, addItem);
        case 'branches':
          return await this.handleBranchesCommand(args, addItem);
        case 'navigate':
        case 'nav':
          return await this.handleNavigateCommand(args, addItem);
        case 'diff':
          return await this.handleDiffCommand(args, addItem);
        case 'history':
          return await this.handleHistoryCommand(args, addItem);
        default:
          return false; // Command not handled by slash system
      }
    } catch (error) {
      addItem({
        type: MessageType.ERROR,
        text: `Chat command error: ${error}`,
      });
      return true;
    }
  }

  /**
   * Handle /chat branch command
   */
  private async handleBranchCommand(
    args: string[],
    addItem: (item: Partial<HistoryItem>, timestamp?: number) => void
  ): Promise<boolean> {
    const branchName = args[0];
    const fromMessageIndex = args[1] ? parseInt(args[1], 10) : undefined;

    if (!branchName) {
      addItem({
        type: MessageType.ERROR,
        text: 'Usage: /chat branch <name> [from_message_index]\nExample: /chat branch "experiment-v2" 5',
      });
      return true;
    }

    try {
      // Get current active tree or create new one
      let tree = this.treeManager.getActiveTree() || null;
      if (!tree) {
        const createResult = await this.lifecycleService.createTree('default', {
          description: 'Default conversation tree'
        });
        if (!createResult.success || !createResult.tree) {
          throw new Error(createResult.error || 'Failed to create tree');
        }
        tree = createResult.tree;
      }

      // Create branch from current or specified point
      const currentNode = tree.nodes.get(tree.activeNodeId);
      if (!currentNode) {
        throw new Error('No active conversation node found');
      }

      const branchPoint = fromMessageIndex !== undefined ? 
        { messageIndex: fromMessageIndex, timestamp: Date.now() } : 
        { messageIndex: currentNode.messages.length, timestamp: Date.now() };

      if (!tree) {
        throw new Error('No active tree available');
      }
      const branchResult = await this.branchService.createBranch(tree, tree.activeNodeId, branchName, {
        branchName,
        description: `Branch created from message ${branchPoint.messageIndex}`,
        copyMessages: true,
        copyContext: true,
        preserveMetadata: true,
        compressParent: false,
        createCheckpoint: true
      });

      if (!branchResult.success) {
        throw new Error(branchResult.error || 'Failed to create branch');
      }

      const newNode = branchResult.branch;

      addItem({
        type: MessageType.INFO,
        text: `✅ Branch created: "${branchName}"\n• ID: ${newNode?.id || 'unknown'}\n• Branched from: ${currentNode.name || 'Current conversation'}\n• Messages copied: ${newNode?.messages?.length || 0}\n• Use "/chat switch ${branchName}" to switch to this branch\n• Use "/chat tree" to visualize branch structure`,
      });

      return true;
    } catch (error) {
      addItem({
        type: MessageType.ERROR,
        text: `Failed to create branch: ${error}`,
      });
      return true;
    }
  }

  /**
   * Handle /chat switch command
   */
  private async handleSwitchCommand(
    args: string[],
    addItem: (item: Partial<HistoryItem>, timestamp?: number) => void,
    clearItems: () => void
  ): Promise<boolean> {
    const branchName = args[0];

    if (!branchName) {
      addItem({
        type: MessageType.ERROR,
        text: 'Usage: /chat switch <branch_name>\nUse "/chat branches" to see available branches.',
      });
      return true;
    }

    try {
      const tree = this.treeManager.getActiveTree();
      if (!tree) {
        addItem({
          type: MessageType.ERROR,
          text: 'No active conversation tree found. Create a branch first with "/chat branch".',
        });
        return true;
      }

      // Find branch by name
      const targetNode = Array.from(tree.nodes.values()).find(node => 
        node.metadata?.branchName?.toLowerCase().includes(branchName.toLowerCase()) ||
        node.name.toLowerCase().includes(branchName.toLowerCase()) ||
        node.id === branchName
      );

      if (!targetNode) {
        addItem({
          type: MessageType.ERROR,
          text: `Branch not found: "${branchName}"\nUse "/chat branches" to see available branches.`,
        });
        return true;
      }

      // Switch to the branch
      const switchResult = await this.navigationService.navigateToNode(tree, targetNode.id);

      if (!switchResult.success || !switchResult.node) {
        throw new Error(switchResult.error || 'Failed to switch branch');
      }
      
      const switchedNode = switchResult.node;

      // Clear current UI history
      clearItems();

      // Restore branch messages to UI
      for (const message of switchedNode.messages) {
        const historyItem: Partial<HistoryItem> = {
          type: message.role === 'user' ? MessageType.USER : 
                message.role === 'assistant' ? MessageType.ASSISTANT :
                message.role === 'system' ? MessageType.INFO : MessageType.INFO,
          text: message.content,
          timestamp: message.metadata?.timestamp ? 
            new Date(message.metadata.timestamp).getTime() : 
            switchedNode.lastModified
        };
        
        addItem(historyItem, historyItem.timestamp);
      }

      addItem({
        type: MessageType.INFO,
        text: `✅ Switched to branch: "${switchedNode.metadata.branchName || switchedNode.name}"\n• Messages restored: ${switchedNode.messages.length}\n• Branch ID: ${switchedNode.id}\n• Last modified: ${new Date(switchedNode.lastModified).toLocaleString()}\n• Ready to continue conversation`,
      });

      return true;
    } catch (error) {
      addItem({
        type: MessageType.ERROR,
        text: `Failed to switch branch: ${error}`,
      });
      return true;
    }
  }

  /**
   * Handle /chat merge command
   */
  private async handleMergeCommand(
    args: string[],
    addItem: (item: Partial<HistoryItem>, timestamp?: number) => void
  ): Promise<boolean> {
    const sourceBranch = args[0];
    const targetBranch = args[1];
    const strategyString = args[2] || 'auto_resolve';
    const strategyMap: Record<string, MergeStrategy> = {
      'fast_forward': MergeStrategy.FAST_FORWARD,
      'three_way': MergeStrategy.THREE_WAY,
      'manual': MergeStrategy.MANUAL,
      'auto_resolve': MergeStrategy.AUTO_RESOLVE
    };
    const strategy = strategyMap[strategyString] || MergeStrategy.AUTO_RESOLVE;

    if (!sourceBranch) {
      addItem({
        type: MessageType.ERROR,
        text: 'Usage: /chat merge <source_branch> [target_branch] [strategy]\nStrategies: fast_forward, three_way, manual, auto_resolve\nExample: /chat merge "experiment" "main" auto_resolve',
      });
      return true;
    }

    try {
      const tree = this.treeManager.getActiveTree();
      if (!tree) {
        addItem({
          type: MessageType.ERROR,
          text: 'No active conversation tree found.',
        });
        return true;
      }

      // Find source and target nodes
      const sourceNode = Array.from(tree.nodes.values()).find(node => 
        node.metadata.branchName?.toLowerCase().includes(sourceBranch.toLowerCase()) ||
        node.name.toLowerCase().includes(sourceBranch.toLowerCase()) ||
        node.id === sourceBranch
      );

      if (!sourceNode) {
        addItem({
          type: MessageType.ERROR,
          text: `Source branch not found: "${sourceBranch}"`,
        });
        return true;
      }

      let targetNode;
      if (targetBranch) {
        targetNode = Array.from(tree.nodes.values()).find(node => 
          node.metadata.branchName?.toLowerCase().includes(targetBranch.toLowerCase()) ||
          node.name.toLowerCase().includes(targetBranch.toLowerCase()) ||
          node.id === targetBranch
        );
      } else {
        targetNode = tree.nodes.get(tree.activeNodeId);
      }

      if (!targetNode) {
        addItem({
          type: MessageType.ERROR,
          text: `Target branch not found: "${targetBranch || 'current'}"`,
        });
        return true;
      }

      addItem({
        type: MessageType.INFO,
        text: `🔄 Merging "${sourceNode.metadata.branchName || sourceNode.name}" into "${targetNode.metadata.branchName || targetNode.name}"\n• Strategy: ${strategy}\n• Analyzing conflicts...`,
      });

      // Perform merge
      const mergeResult = await this.branchService.mergeBranches(tree, sourceNode.id, targetNode.id, strategy);

      if (mergeResult.success && mergeResult.mergeResult && tree) {
        const resultNodeId = mergeResult.mergeResult.resultNodeId;
        const resultNode = resultNodeId ? tree.nodes.get(resultNodeId) : undefined;
        addItem({
          type: MessageType.INFO,
          text: `✅ Merge completed successfully!\n• Result node: ${mergeResult.mergeResult?.resultNodeId || 'unknown'}\n• Messages merged: ${resultNode?.messages?.length || 0}\n• Conflicts: ${mergeResult.mergeResult?.conflicts?.length || 0}\n• Preserved branches: ${targetNode.id}\n• Use "/chat tree" to see updated structure`,
        });
      } else {
        const conflictInfo = mergeResult.mergeResult?.conflicts?.map((conflict: any) => 
          `• ${conflict.type}: ${conflict.sourceNodeId} vs ${conflict.targetNodeId}`
        ).join('\n') || '';

        addItem({
          type: MessageType.WARNING,
          text: `⚠️ Merge completed with conflicts:\n${conflictInfo}\n• Use manual resolution or try different strategy\n• Result node: ${mergeResult.mergeResult?.resultNodeId || 'unknown'}`,
        });
      }

      return true;
    } catch (error) {
      addItem({
        type: MessageType.ERROR,
        text: `Failed to merge branches: ${error}`,
      });
      return true;
    }
  }

  /**
   * Handle /chat tree command
   */
  private async handleTreeCommand(
    args: string[],
    addItem: (item: Partial<HistoryItem>, timestamp?: number) => void
  ): Promise<boolean> {
    const action = args[0] || 'show';
    const options = args.slice(1);

    try {
      const tree = this.treeManager.getActiveTree();
      if (!tree) {
        addItem({
          type: MessageType.INFO,
          text: 'No conversation tree found. Create a branch to start using tree features:\n• /chat branch <name> - Create new branch\n• /chat save <name> --tree - Save as tree structure',
        });
        return true;
      }

      switch (action) {
        case 'show':
        case 'display':
          const visualization = await this.visualizer.generateVisualization(tree, {
            maxWidth: 80,
            maxDepth: 10,
            showMetadata: options.includes('--metadata'),
            showTimestamps: options.includes('--timestamps'),
            highlightActive: true,
            highlightConflicts: true,
            highlightPath: [],
            hideMerged: options.includes('--hide-merged'),
            hideOld: options.includes('--hide-old'),
            tagsFilter: []
          });

          addItem({
            type: MessageType.INFO,
            text: `🌳 Conversation Tree Structure:\n\n${visualization.ascii}\n\n📊 Tree Statistics:\n• Total nodes: ${visualization.stats.totalNodes}\n• Total messages: ${visualization.stats.totalMessages}\n• Max depth: ${visualization.stats.maxDepth}\n• Active branches: ${visualization.stats.branchCount}\n• Merged branches: ${visualization.stats.mergedBranches}\n\n💡 Use "/chat navigate" for interactive navigation`,
          });
          break;

        case 'analyze':
          addItem({
            type: MessageType.INFO,
            text: `📊 Tree Analysis is not yet implemented.`,
          });
          break;

        case 'optimize':
          addItem({
            type: MessageType.INFO,
            text: `⚡ Tree Optimization is not yet implemented.`,
          });
          break;

        default:
          addItem({
            type: MessageType.INFO,
            text: 'Usage: /chat tree [show|analyze|optimize] [options]\n• show - Display tree structure\n• analyze - Analyze tree complexity\n• optimize - Optimize tree performance\n\nOptions: --metadata, --timestamps, --hide-merged, --hide-old',
          });
      }

      return true;
    } catch (error) {
      addItem({
        type: MessageType.ERROR,
        text: `Tree command failed: ${error}`,
      });
      return true;
    }
  }

  /**
   * Handle /chat branches command
   */
  private async handleBranchesCommand(
    args: string[],
    addItem: (item: Partial<HistoryItem>, timestamp?: number) => void
  ): Promise<boolean> {
    try {
      const tree = this.treeManager.getActiveTree();
      if (!tree) {
        addItem({
          type: MessageType.INFO,
          text: 'No conversation tree found. Create a branch to start:\n• /chat branch <name> - Create new branch',
        });
        return true;
      }

      const branches = Array.from(tree.nodes.values())
        .filter(node => node.metadata.branchName || node.children.length > 0)
        .map(node => {
          const isActive = node.id === tree.activeNodeId;
          const messageCount = node.messages.length;
          const lastModified = new Date(node.lastModified).toLocaleDateString();
          const branchName = node.metadata.branchName || node.name;
          const status = node.metadata.mergeStatus || 'active';
          
          return `${isActive ? '→' : ' '} ${branchName}\n   ID: ${node.id}\n   Messages: ${messageCount} | Status: ${status} | Modified: ${lastModified}`;
        });

      if (branches.length === 0) {
        addItem({
          type: MessageType.INFO,
          text: 'No branches found in current tree.\n• /chat branch <name> - Create new branch',
        });
      } else {
        addItem({
          type: MessageType.INFO,
          text: `🌿 Available Branches (${branches.length}):\n\n${branches.join('\n\n')}\n\n• → indicates active branch\n• Use "/chat switch <name>" to switch branches\n• Use "/chat tree" to see visual structure`,
        });
      }

      return true;
    } catch (error) {
      addItem({
        type: MessageType.ERROR,
        text: `Failed to list branches: ${error}`,
      });
      return true;
    }
  }

  /**
   * Handle /chat navigate command
   */
  private async handleNavigateCommand(
    args: string[],
    addItem: (item: Partial<HistoryItem>, timestamp?: number) => void
  ): Promise<boolean> {
    const nodeId = args[0];

    if (!nodeId) {
      addItem({
        type: MessageType.INFO,
        text: '🧭 Interactive Tree Navigation\n• Use arrow keys to navigate\n• Press Enter to select node\n• Press "b" to create branch\n• Press "m" to merge\n• Press "q" to quit\n\nStarting interactive navigation...',
      });

      try {
        // Start interactive navigation
        await this.navigator.startInteractiveMode();
        addItem({
          type: MessageType.INFO,
          text: '✅ Interactive navigation started. Use keyboard controls to navigate the tree.',
        });
      } catch (error) {
        addItem({
          type: MessageType.ERROR,
          text: `Failed to start navigation: ${error}`,
        });
      }

      return true;
    }

    try {
      const tree = this.treeManager.getActiveTree();
      if (!tree) {
        throw new Error('No active tree found');
      }
      // Navigate to specific node
      const result = await this.navigationService.navigateToNode(tree, nodeId);
      if (!result.success || !result.node) {
        throw new Error(result.error || 'Navigation failed');
      }
      const node = result.node;
      addItem({
        type: MessageType.INFO,
        text: `📍 Navigated to node: ${node.name}\n• ID: ${node.id}\n• Messages: ${node.messages.length}\n• Branch: ${node.metadata.branchName || 'main'}\n• Modified: ${new Date(node.lastModified).toLocaleString()}`,
      });

      return true;
    } catch (error) {
      addItem({
        type: MessageType.ERROR,
        text: `Navigation failed: ${error}`,
      });
      return true;
    }
  }

  /**
   * Handle /chat diff command
   */
  private async handleDiffCommand(
    args: string[],
    addItem: (item: Partial<HistoryItem>, timestamp?: number) => void
  ): Promise<boolean> {
    const branch1 = args[0];
    const branch2 = args[1];

    if (!branch1 || !branch2) {
      addItem({
        type: MessageType.ERROR,
        text: 'Usage: /chat diff <branch1> <branch2>\nExample: /chat diff "main" "experiment"',
      });
      return true;
    }

    try {
      const tree = this.treeManager.getActiveTree();
      if (!tree) {
        addItem({
          type: MessageType.ERROR,
          text: 'No active conversation tree found.',
        });
        return true;
      }

      // Find nodes for comparison
      const node1 = Array.from(tree.nodes.values()).find(node => 
        node.metadata.branchName?.toLowerCase().includes(branch1.toLowerCase()) ||
        node.name.toLowerCase().includes(branch1.toLowerCase()) ||
        node.id === branch1
      );

      const node2 = Array.from(tree.nodes.values()).find(node => 
        node.metadata.branchName?.toLowerCase().includes(branch2.toLowerCase()) ||
        node.name.toLowerCase().includes(branch2.toLowerCase()) ||
        node.id === branch2
      );

      if (!node1 || !node2) {
        addItem({
          type: MessageType.ERROR,
          text: `One or both branches not found: "${branch1}", "${branch2}"`,
        });
        return true;
      }

      // Generate diff
      const diff = await this.generateBranchDiff(node1, node2);
      addItem({
        type: MessageType.INFO,
        text: `📋 Branch Comparison: "${node1.metadata.branchName || node1.name}" vs "${node2.metadata.branchName || node2.name}"\n\n${diff}`,
      });

      return true;
    } catch (error) {
      addItem({
        type: MessageType.ERROR,
        text: `Diff failed: ${error}`,
      });
      return true;
    }
  }

  /**
   * Handle /chat history command
   */
  private async handleHistoryCommand(
    args: string[],
    addItem: (item: Partial<HistoryItem>, timestamp?: number) => void
  ): Promise<boolean> {
    const showTree = args.includes('--tree');
    const nodeId = args.find(arg => !arg.startsWith('--'));

    try {
      if (showTree) {
        const tree = this.treeManager.getActiveTree();
        if (!tree) {
          addItem({
            type: MessageType.INFO,
            text: 'No conversation tree history available.',
          });
          return true;
        }

        const nodePath = this.navigationService.getNavigationPath(tree, tree.activeNodeId);
      const historyResult = {success: true, history: nodePath};
        if (!historyResult.success) {
          throw new Error('Failed to get history');
        }
        const history = historyResult.history;
        const historyText = nodePath.map((node: any, index: number) => 
          `${index + 1}. ${node.name} (${node.messages.length} messages, ${new Date(node.lastModified).toLocaleDateString()})`
        ).join('\n');

        addItem({
          type: MessageType.INFO,
          text: `🕐 Tree History (${history.length} nodes):\n${historyText}\n\nUse "/chat navigate <node_id>" to jump to specific node`,
        });
      } else {
        // Show linear history for current node
        const tree = this.treeManager.getActiveTree();
        const currentNode = tree?.nodes.get(tree.activeNodeId);
        
        if (!currentNode) {
          addItem({
            type: MessageType.INFO,
            text: 'No conversation history available in current context.',
          });
          return true;
        }

        const messageHistory = currentNode.messages.map((msg, index) => 
          `${index + 1}. [${msg.role}] ${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}`
        ).join('\n');

        addItem({
          type: MessageType.INFO,
          text: `📝 Current Branch History (${currentNode.messages.length} messages):\n${messageHistory}\n\nUse "/chat history --tree" to see full tree history`,
        });
      }

      return true;
    } catch (error) {
      addItem({
        type: MessageType.ERROR,
        text: `History command failed: ${error}`,
      });
      return true;
    }
  }

  /**
   * Generate a diff between two conversation nodes
   */
  private async generateBranchDiff(node1: any, node2: any): Promise<string> {
    const diff = [];
    
    // Basic statistics
    diff.push(`📊 Statistics:`);
    diff.push(`• ${node1.metadata.branchName || node1.name}: ${node1.messages.length} messages`);
    diff.push(`• ${node2.metadata.branchName || node2.name}: ${node2.messages.length} messages`);
    diff.push(`• Difference: ${Math.abs(node1.messages.length - node2.messages.length)} messages`);
    diff.push('');

    // Message content differences
    const maxMessages = Math.max(node1.messages.length, node2.messages.length);
    let differences = 0;
    
    for (let i = 0; i < maxMessages; i++) {
      const msg1 = node1.messages[i];
      const msg2 = node2.messages[i];
      
      if (!msg1) {
        diff.push(`+ [${node2.metadata.branchName || node2.name}] ${msg2.role}: ${msg2.content.slice(0, 50)}...`);
        differences++;
      } else if (!msg2) {
        diff.push(`- [${node1.metadata.branchName || node1.name}] ${msg1.role}: ${msg1.content.slice(0, 50)}...`);
        differences++;
      } else if (msg1.content !== msg2.content) {
        diff.push(`~ Message ${i + 1} differs`);
        differences++;
      }
    }
    
    if (differences === 0) {
      diff.push('✅ No content differences found');
    } else {
      diff.push(`⚠️ ${differences} differences found`);
    }

    return diff.join('\n');
  }

  /**
   * Get help text for slash commands
   */
  getHelpText(): string {
    return `🌳 Slash Commands (Tree Mode):

🌿 Branch Management:
• /chat branch <name> [from_index] - Create new branch
• /chat switch <branch> - Switch to branch
• /chat merge <source> [target] [strategy] - Merge branches
• /chat branches - List all branches

🔍 Tree Operations:
• /chat tree [show|analyze|optimize] - Tree visualization & management
• /chat navigate [node_id] - Interactive tree navigation
• /chat diff <branch1> <branch2> - Compare branches
• /chat history [--tree] - Show conversation history

📋 Examples:
• /chat branch "experiment" - Create experiment branch
• /chat switch experiment - Switch to experiment branch
• /chat merge experiment main auto_resolve - Merge experiment into main
• /chat tree show --metadata - Show tree with metadata
• /chat navigate - Start interactive navigation

💡 Tips:
• Use tab completion for branch names
• Tree visualization updates in real-time
• All existing /chat commands still work
• Branches preserve full conversation context`;
  }
}

// Export singleton instance
export const slashCommands = new SlashCommands(); 