/**
 * Workflow Graph Visualization Types
 * 
 * Type definitions for workflow graph visualization components.
 */

/**
 * Node type enum for workflow nodes
 */
export enum NodeType {
  START = 'start',
  TASK = 'task',
  DECISION = 'decision',
  PARALLEL = 'parallel',
  WAIT = 'wait',
  END = 'end',
  SUBPROCESS = 'subprocess',
  ERROR = 'error',
  CUSTOM = 'custom'
}

/**
 * Status enum for workflow nodes
 */
export enum NodeStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ERROR = 'error',
  SKIPPED = 'skipped',
  WAITING = 'waiting',
  CANCELED = 'canceled'
}

/**
 * Edge type enum for workflow connections
 */
export enum EdgeType {
  DEFAULT = 'default',
  SUCCESS = 'success',
  FAILURE = 'failure',
  CONDITION = 'condition'
}

/**
 * Position interface for node coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Size interface for node dimensions
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Node interface for workflow graph
 */
export interface Node {
  /**
   * Unique node identifier
   */
  id: string;
  
  /**
   * Node display label
   */
  label: string;
  
  /**
   * Node type
   */
  type: NodeType;
  
  /**
   * Node status
   */
  status: NodeStatus;
  
  /**
   * Node position
   */
  position: Position;
  
  /**
   * Node size (optional, can be calculated from content)
   */
  size?: Size;
  
  /**
   * Node data (specific to the node type)
   */
  data?: Record<string, any>;
  
  /**
   * Node tooltip or description
   */
  description?: string;
  
  /**
   * Node metadata
   */
  meta?: Record<string, any>;
  
  /**
   * Whether the node is selected
   */
  selected?: boolean;
  
  /**
   * Whether the node is highlighted
   */
  highlighted?: boolean;
  
  /**
   * Whether the node is disabled
   */
  disabled?: boolean;
  
  /**
   * Whether the node is expanded (for subprocesses)
   */
  expanded?: boolean;
  
  /**
   * Additional classes for styling
   */
  classes?: string[];
  
  /**
   * Custom renderer for the node
   */
  customRenderer?: string;
}

/**
 * Edge interface for workflow connections
 */
export interface Edge {
  /**
   * Unique edge identifier
   */
  id: string;
  
  /**
   * Source node ID
   */
  source: string;
  
  /**
   * Target node ID
   */
  target: string;
  
  /**
   * Edge label
   */
  label?: string;
  
  /**
   * Edge type
   */
  type?: EdgeType;
  
  /**
   * Edge data
   */
  data?: Record<string, any>;
  
  /**
   * Whether the edge is animated
   */
  animated?: boolean;
  
  /**
   * Whether the edge is selected
   */
  selected?: boolean;
  
  /**
   * Whether the edge is highlighted
   */
  highlighted?: boolean;
  
  /**
   * Intermediate points for the edge path
   */
  waypoints?: Position[];
  
  /**
   * Custom renderer for the edge
   */
  customRenderer?: string;
}

/**
 * Workflow graph data interface
 */
export interface WorkflowGraph {
  /**
   * Graph nodes
   */
  nodes: Node[];
  
  /**
   * Graph edges
   */
  edges: Edge[];
  
  /**
   * Graph metadata
   */
  meta?: Record<string, any>;
}

/**
 * Viewport state interface for graph navigation
 */
export interface Viewport {
  /**
   * Zoom level
   */
  zoom: number;
  
  /**
   * Pan offset X
   */
  offsetX: number;
  
  /**
   * Pan offset Y
   */
  offsetY: number;
  
  /**
   * Viewport width
   */
  width: number;
  
  /**
   * Viewport height
   */
  height: number;
}

/**
 * Layout type enum for automatic graph layout
 */
export enum LayoutType {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
  RADIAL = 'radial',
  FORCE = 'force',
  GRID = 'grid',
  TREE = 'tree',
  CUSTOM = 'custom'
}

/**
 * Layout options for automatic graph layout
 */
export interface LayoutOptions {
  /**
   * Layout type
   */
  type: LayoutType;
  
  /**
   * Node spacing
   */
  nodeSpacing?: number;
  
  /**
   * Rank spacing (for hierarchical layouts)
   */
  rankSpacing?: number;
  
  /**
   * Direction (for hierarchical layouts)
   */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  
  /**
   * Alignment (for hierarchical layouts)
   */
  alignment?: 'UL' | 'UR' | 'DL' | 'DR' | 'CENTER';
  
  /**
   * Additional layout options
   */
  options?: Record<string, any>;
}

/**
 * Node change event interface
 */
export interface NodeChangeEvent {
  /**
   * Node that was changed
   */
  node: Node;
  
  /**
   * Type of change
   */
  type: 'select' | 'position' | 'size' | 'data' | 'status' | 'add' | 'remove';
  
  /**
   * Previous state of the node
   */
  previous?: Partial<Node>;
}

/**
 * Edge change event interface
 */
export interface EdgeChangeEvent {
  /**
   * Edge that was changed
   */
  edge: Edge;
  
  /**
   * Type of change
   */
  type: 'select' | 'data' | 'waypoints' | 'add' | 'remove';
  
  /**
   * Previous state of the edge
   */
  previous?: Partial<Edge>;
}

/**
 * Viewport change event interface
 */
export interface ViewportChangeEvent {
  /**
   * New viewport state
   */
  viewport: Viewport;
  
  /**
   * Previous viewport state
   */
  previous?: Viewport;
}

/**
 * Workflow Graph component props
 */
export interface WorkflowGraphProps {
  /**
   * Graph data
   */
  graph: WorkflowGraph;
  
  /**
   * Component width
   */
  width: number;
  
  /**
   * Component height
   */
  height: number;
  
  /**
   * Initial viewport state
   */
  initialViewport?: Partial<Viewport>;
  
  /**
   * Layout options for automatic layout
   */
  layoutOptions?: LayoutOptions;
  
  /**
   * Whether the graph is read-only
   */
  readOnly?: boolean;
  
  /**
   * Whether the graph is interactive
   */
  interactive?: boolean;
  
  /**
   * Whether to fit the graph to the viewport on initial render
   */
  fitView?: boolean;
  
  /**
   * Whether to enable minimap
   */
  minimap?: boolean;
  
  /**
   * Whether to enable grid
   */
  grid?: boolean;
  
  /**
   * Whether to enable controls
   */
  controls?: boolean;
  
  /**
   * Whether to enable node drag-and-drop
   */
  nodeDraggable?: boolean;
  
  /**
   * Whether to enable edge creation
   */
  connectingEdgesEnabled?: boolean;
  
  /**
   * Whether to enable edge removal
   */
  deleteEdgeEnabled?: boolean;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when a node is selected
   */
  onNodeSelect?: (node: Node) => void;
  
  /**
   * Callback when an edge is selected
   */
  onEdgeSelect?: (edge: Edge) => void;
  
  /**
   * Callback when a node is changed
   */
  onNodeChange?: (event: NodeChangeEvent) => void;
  
  /**
   * Callback when an edge is changed
   */
  onEdgeChange?: (event: EdgeChangeEvent) => void;
  
  /**
   * Callback when the viewport is changed
   */
  onViewportChange?: (event: ViewportChangeEvent) => void;
  
  /**
   * Callback when a node is double-clicked
   */
  onNodeDoubleClick?: (node: Node) => void;
  
  /**
   * Callback when focus changes
   */
  onFocusChange?: (focused: boolean) => void;
}