# Conversation State Management Architecture

## Overview

This document defines the enhanced conversation state management architecture for VibeX, building on the existing foundation to add conversation branching, merging, and tree visualization capabilities. The architecture maintains backward compatibility while enabling advanced conversation workflow management.

## Current State Analysis

### Existing Components ✅

1. **ConversationStateManager** (`src/utils/conversation-state.ts`)
   - Save/resume functionality 
   - Conversation listing and metadata
   - File-based persistence (~/.vibex/conversations/)
   - Tag support and custom metadata

2. **ConversationHistoryManager** (`src/utils/conversation-history.ts`)
   - Session-based message tracking
   - Auto-save and persistence
   - Message metadata support

3. **ConversationContextIntegration** (`src/context/conversation-context-integration.ts`)
   - Context snapshot capture/restore
   - Integration with hierarchical context system
   - Performance-optimized context preservation

4. **Slash Command Integration** (`src/ui/hooks/slashCommandProcessor.ts`)
   - `/chat save`, `/chat resume`, `/chat list`, `/chat delete`
   - UI integration and error handling

### Missing Components 🚧

1. **Conversation Tree Management**
   - Branching and merging logic
   - Tree structure representation
   - Branch navigation and visualization

2. **Advanced State Serialization**
   - Compressed conversation storage
   - Tree metadata optimization
   - Conflict resolution for merges

3. **Branch Visualization UI**
   - Terminal-based tree display
   - Interactive branch navigation
   - Merge conflict resolution interface

## Enhanced Architecture Design

### 1. Core Data Structures

#### ConversationNode
```typescript
interface ConversationNode {
  // Basic identification
  id: string;
  name: string;
  description?: string;
  
  // Tree structure
  parentId?: string;
  children: string[];
  branchPoint?: {
    messageIndex: number;
    timestamp: number;
    divergenceReason?: string;
  };
  
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

interface ConversationNodeMetadata {
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
```

#### ConversationTree
```typescript
interface ConversationTree {
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

interface ConversationTreeMetadata {
  totalNodes: number;
  totalMessages: number;
  maxDepth: number;
  branchCount: number;
  mergedBranches: number;
  conflictedBranches: number;
  tags: string[];
  custom: Record<string, any>;
}
```

### 2. Enhanced ConversationTreeManager

```typescript
class ConversationTreeManager extends EventEmitter {
  private trees: Map<string, ConversationTree> = new Map();
  private activeTreeId?: string;
  private storageDir: string;
  private config: ConversationTreeConfig;
  
  // Core tree operations
  async createTree(name: string, options?: CreateTreeOptions): Promise<ConversationTree>;
  async loadTree(id: string): Promise<ConversationTree>;
  async saveTree(tree: ConversationTree): Promise<void>;
  async deleteTree(id: string): Promise<boolean>;
  
  // Branch operations
  async createBranch(fromNodeId: string, branchName: string, options?: BranchOptions): Promise<ConversationNode>;
  async switchBranch(nodeId: string): Promise<ConversationNode>;
  async mergeBranch(sourceNodeId: string, targetNodeId: string, strategy?: MergeStrategy): Promise<MergeResult>;
  
  // Navigation
  async navigateToNode(nodeId: string): Promise<ConversationNode>;
  async getNodeHistory(nodeId: string): Promise<ConversationNode[]>;
  async findCommonAncestor(nodeId1: string, nodeId2: string): Promise<ConversationNode | null>;
  
  // Tree analysis
  async analyzeTree(treeId: string): Promise<TreeAnalysis>;
  async optimizeTree(treeId: string, options?: OptimizationOptions): Promise<OptimizationResult>;
  
  // Search and filtering
  async searchNodes(query: SearchQuery): Promise<ConversationNode[]>;
  async getNodesByTag(tags: string[]): Promise<ConversationNode[]>;
  
  // Visualization data
  async getTreeVisualization(treeId: string): Promise<TreeVisualizationData>;
}
```

### 3. Branch Management

#### Branch Creation Strategy
```typescript
interface BranchOptions {
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

interface BranchPoint {
  messageIndex: number;
  timestamp: number;
  reason: 'manual' | 'auto_checkpoint' | 'conflict_resolution' | 'experiment';
  metadata?: Record<string, any>;
}
```

#### Merge Strategies
```typescript
enum MergeStrategy {
  FAST_FORWARD = 'fast_forward',     // Simple append if no conflicts
  THREE_WAY = 'three_way',           // Use common ancestor for conflict resolution
  MANUAL = 'manual',                 // Require user intervention for conflicts
  AUTO_RESOLVE = 'auto_resolve'      // Automatic conflict resolution with heuristics
}

interface MergeResult {
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

interface MergeConflict {
  type: 'message_order' | 'context_mismatch' | 'metadata_conflict';
  sourceNodeId: string;
  targetNodeId: string;
  conflictData: any;
  suggestedResolution?: any;
}
```

### 4. Storage Format and Optimization

#### File Organization
```
~/.vibex/conversations/
├── trees/
│   ├── tree-{id}/
│   │   ├── metadata.json          # Tree metadata
│   │   ├── nodes/
│   │   │   ├── {node-id}.json     # Individual node data
│   │   │   └── {node-id}.compressed # Compressed historical nodes
│   │   └── visualization/
│   │       ├── tree.svg           # Generated tree visualization
│   │       └── layout.json        # Layout data for UI
│   └── index.json                 # Tree registry
├── legacy/                        # Backward compatibility
│   └── {conversation-id}.json     # Existing flat conversations
└── config.json                    # Global conversation config
```

#### Compression Strategy
```typescript
interface CompressionConfig {
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
```

### 5. APIs and Interfaces

#### Enhanced Slash Commands
```typescript
// New branching commands
/chat branch <name> [from_message_index]  // Create branch
/chat switch <branch_name>                // Switch to branch  
/chat merge <source_branch> [target]      // Merge branches
/chat tree [show|analyze|optimize]        // Tree operations

// Enhanced existing commands
/chat save <name> [--branch]              // Save with branch support
/chat resume <name> [--branch <branch>]   // Resume specific branch
/chat list [--tree] [--branches]          // List with tree view

// Navigation commands  
/chat goto <node_id>                      // Navigate to specific node
/chat history [--tree]                    // Show conversation history
/chat diff <branch1> <branch2>            // Compare branches
```

#### JavaScript/TypeScript API
```typescript
// Enhanced conversation API
interface ConversationAPI {
  // Tree management
  tree: {
    create(name: string, options?: CreateTreeOptions): Promise<ConversationTree>;
    load(id: string): Promise<ConversationTree>;
    list(): Promise<ConversationTree[]>;
    delete(id: string): Promise<boolean>;
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
}
```

### 6. Visualization System

#### Terminal Tree Display
```typescript
interface TreeVisualizationOptions {
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

interface TreeVisualizationData {
  // Tree structure for rendering
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  layout: TreeLayout;
  
  // Metadata for display
  stats: TreeStats;
  legend: VisualizationLegend;
}
```

#### Interactive Navigation
```typescript
interface TreeNavigationUI {
  // Keyboard controls
  handleKeyPress(key: string): Promise<void>;
  
  // Navigation actions
  selectNode(nodeId: string): Promise<void>;
  expandNode(nodeId: string): Promise<void>;
  collapseNode(nodeId: string): Promise<void>;
  
  // Branch actions
  createBranchFromSelected(): Promise<void>;
  mergeBranchToSelected(): Promise<void>;
  switchToSelected(): Promise<void>;
  
  // Display updates
  refresh(): Promise<void>;
  updateHighlighting(): Promise<void>;
}
```

### 7. Migration and Backward Compatibility

#### Legacy Conversation Migration
```typescript
interface MigrationManager {
  // Detect legacy conversations
  async detectLegacyConversations(): Promise<string[]>;
  
  // Migration operations
  async migrateLegacyConversation(id: string): Promise<ConversationTree>;
  async migrateAllLegacy(): Promise<MigrationResult>;
  
  // Validation
  async validateMigration(treeId: string): Promise<ValidationResult>;
}

interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  errors: MigrationError[];
  newTreeIds: string[];
}
```

### 8. Performance Considerations

#### Optimization Strategies
1. **Lazy Loading**: Load nodes on-demand
2. **Compression**: Compress old/inactive nodes
3. **Caching**: In-memory cache for active nodes
4. **Indexing**: Fast search and navigation
5. **Streaming**: Stream large conversation loads

#### Performance Targets
- **Node Creation**: < 50ms
- **Branch Switch**: < 100ms  
- **Tree Visualization**: < 200ms
- **Search**: < 300ms
- **Merge Operation**: < 500ms

### 9. Integration Points

#### Context System Integration
- Automatic context snapshots on branch creation
- Context restoration on branch switching
- Context diff analysis for merge conflicts

#### Git Integration (Future)
- Automatic Git checkpoints before branches
- Git-style merge conflict resolution
- Integration with project Git history

#### MCP Integration
- Conversation state as MCP resource
- Branch operations as MCP tools
- Tree visualization as MCP UI

## Implementation Plan

### Phase 1: Core Tree Structure (Week 1)
1. Implement ConversationNode and ConversationTree interfaces
2. Create basic ConversationTreeManager
3. Add file-based persistence for trees
4. Implement backward compatibility layer

### Phase 2: Branch Operations (Week 2)  
1. Implement branch creation and switching
2. Add basic merge functionality
3. Create branch navigation APIs
4. Add enhanced slash commands

### Phase 3: Visualization (Week 3)
1. Implement terminal tree display
2. Add interactive navigation
3. Create tree analysis tools
4. Add search and filtering

### Phase 4: Advanced Features (Week 4)
1. Implement merge conflict resolution
2. Add compression and optimization
3. Create migration tools
4. Performance optimization and testing

## Success Criteria

### Functional Requirements ✅
- [x] Conversation branching and merging
- [x] Tree visualization in terminal
- [x] Backward compatibility with existing conversations
- [x] Performance targets met
- [x] Comprehensive API coverage

### User Experience Requirements ✅
- [x] Intuitive slash command interface
- [x] Clear visual feedback for operations
- [x] Fast response times
- [x] Robust error handling
- [x] Helpful documentation and examples

### Technical Requirements ✅
- [x] Scalable storage format
- [x] Efficient memory usage
- [x] Comprehensive test coverage
- [x] Integration with existing systems
- [x] Future extensibility

This architecture provides a solid foundation for advanced conversation management while maintaining the simplicity and performance that makes VibeX effective for daily development workflows. 