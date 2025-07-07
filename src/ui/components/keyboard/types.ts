/**
 * Keyboard Navigation Types
 * 
 * Type definitions for keyboard navigation system.
 */

/**
 * Key input interface for key events
 */
export interface KeyInput {
  /**
   * Key character or name
   */
  key: string;
  
  /**
   * Whether the Alt key was pressed
   */
  alt?: boolean;
  
  /**
   * Whether the Ctrl key was pressed
   */
  ctrl?: boolean;
  
  /**
   * Whether the Meta key was pressed
   */
  meta?: boolean;
  
  /**
   * Whether the Shift key was pressed
   */
  shift?: boolean;
}

/**
 * Direction enum for navigation
 */
export enum NavigationDirection {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  NEXT = 'next',
  PREVIOUS = 'previous',
  FIRST = 'first',
  LAST = 'last'
}

/**
 * Focus group identifier interface
 */
export interface FocusGroupId {
  /**
   * Group ID
   */
  id: string;
  
  /**
   * Optional parent group ID
   */
  parentId?: string;
}

/**
 * Focus target identifier interface
 */
export interface FocusTargetId {
  /**
   * Target ID
   */
  id: string;
  
  /**
   * Group ID this target belongs to
   */
  groupId: string;
  
  /**
   * Display order in the group (for sequential navigation)
   */
  order?: number;
  
  /**
   * Whether this target can be focused
   */
  focusable?: boolean;
}

/**
 * Focus node interface for navigation graph
 */
export interface FocusNode {
  /**
   * Target ID
   */
  id: string;
  
  /**
   * Group ID this node belongs to
   */
  groupId: string;
  
  /**
   * Display order in the group (for sequential navigation)
   */
  order?: number;
  
  /**
   * Whether this node is currently focusable
   */
  focusable: boolean;
  
  /**
   * Whether this node is currently focused
   */
  focused: boolean;
  
  /**
   * Display name for debugging
   */
  name?: string;
  
  /**
   * Node position for 2D navigation
   */
  position?: {
    row: number;
    col: number;
  };
  
  /**
   * Adjacent node IDs for each direction
   */
  adjacent?: {
    [NavigationDirection.UP]?: string;
    [NavigationDirection.DOWN]?: string;
    [NavigationDirection.LEFT]?: string;
    [NavigationDirection.RIGHT]?: string;
    [NavigationDirection.NEXT]?: string;
    [NavigationDirection.PREVIOUS]?: string;
  };
}

/**
 * Focus group interface for organizing focus targets
 */
export interface FocusGroup {
  /**
   * Group ID
   */
  id: string;
  
  /**
   * Optional parent group ID
   */
  parentId?: string;
  
  /**
   * Whether this group is currently active
   */
  active: boolean;
  
  /**
   * Focus nodes in this group
   */
  nodes: FocusNode[];
  
  /**
   * Currently focused node ID in this group
   */
  focusedNodeId?: string;
  
  /**
   * Display name for debugging
   */
  name?: string;
}

/**
 * Keyboard shortcut interface
 */
export interface KeyboardShortcut {
  /**
   * Shortcut ID
   */
  id: string;
  
  /**
   * Key combination to trigger the shortcut
   */
  keys: KeyInput | KeyInput[];
  
  /**
   * Action to perform when shortcut is triggered
   */
  action: () => void;
  
  /**
   * Group ID this shortcut belongs to (if any)
   */
  groupId?: string;
  
  /**
   * Description of the shortcut
   */
  description?: string;
  
  /**
   * Whether the shortcut is currently enabled
   */
  enabled?: boolean;
  
  /**
   * Display name for the shortcut
   */
  name?: string;
}

/**
 * Focus context interface for managing focus state
 */
export interface FocusContextType {
  /**
   * All focus groups
   */
  groups: FocusGroup[];
  
  /**
   * All focus nodes
   */
  nodes: FocusNode[];
  
  /**
   * All keyboard shortcuts
   */
  shortcuts: KeyboardShortcut[];
  
  /**
   * Currently active group ID
   */
  activeGroupId?: string;
  
  /**
   * Currently focused node ID
   */
  focusedNodeId?: string;
  
  /**
   * Register a focus group
   */
  registerGroup: (group: Omit<FocusGroup, 'nodes' | 'active'>) => void;
  
  /**
   * Unregister a focus group
   */
  unregisterGroup: (groupId: string) => void;
  
  /**
   * Register a focus node
   */
  registerNode: (node: Omit<FocusNode, 'focused'>) => void;
  
  /**
   * Unregister a focus node
   */
  unregisterNode: (nodeId: string) => void;
  
  /**
   * Set a node as focused
   */
  setFocusedNode: (nodeId: string) => void;
  
  /**
   * Set a group as active
   */
  setActiveGroup: (groupId: string) => void;
  
  /**
   * Navigate in a direction
   */
  navigate: (direction: NavigationDirection) => void;
  
  /**
   * Register a keyboard shortcut
   */
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  
  /**
   * Unregister a keyboard shortcut
   */
  unregisterShortcut: (shortcutId: string) => void;
  
  /**
   * Execute a keyboard shortcut
   */
  executeShortcut: (keys: KeyInput) => boolean;
}