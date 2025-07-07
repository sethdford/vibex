/**
 * Debugging Interface Types
 * 
 * Type definitions for the Debugging Interface component.
 */

/**
 * Debug variable type
 */
export enum DebugVariableType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  NULL = 'null',
  UNDEFINED = 'undefined',
  FUNCTION = 'function',
  SYMBOL = 'symbol',
  BIGINT = 'bigint'
}

/**
 * Debug variable interface
 */
export interface DebugVariable {
  /**
   * Variable name
   */
  name: string;
  
  /**
   * Variable value as string representation
   */
  value: string;
  
  /**
   * Raw variable value (for manipulation)
   */
  rawValue: any;
  
  /**
   * Variable type
   */
  type: DebugVariableType;
  
  /**
   * Whether the variable is expanded (for objects/arrays)
   */
  expanded?: boolean;
  
  /**
   * Child variables (for objects/arrays)
   */
  children?: DebugVariable[];
  
  /**
   * Whether the variable is a primitive value
   */
  isPrimitive: boolean;
  
  /**
   * Variable path (for nested objects)
   */
  path: string;
  
  /**
   * Whether the variable is editable
   */
  editable: boolean;
  
  /**
   * Whether the variable is enumerable
   */
  enumerable: boolean;
  
  /**
   * Whether the variable is configurable
   */
  configurable: boolean;
  
  /**
   * Reference to parent variable
   */
  parent?: DebugVariable;
}

/**
 * Debug breakpoint interface
 */
export interface DebugBreakpoint {
  /**
   * Breakpoint ID
   */
  id: string;
  
  /**
   * File path
   */
  path: string;
  
  /**
   * Line number
   */
  line: number;
  
  /**
   * Breakpoint condition
   */
  condition?: string;
  
  /**
   * Whether the breakpoint is enabled
   */
  enabled: boolean;
  
  /**
   * Hit count
   */
  hitCount: number;
  
  /**
   * Log message
   */
  logMessage?: string;
}

/**
 * Debug callstack frame
 */
export interface DebugStackFrame {
  /**
   * Frame ID
   */
  id: string;
  
  /**
   * Function name
   */
  name: string;
  
  /**
   * File path
   */
  path: string;
  
  /**
   * Line number
   */
  line: number;
  
  /**
   * Column number
   */
  column: number;
  
  /**
   * Whether this is the current frame
   */
  isCurrent: boolean;
  
  /**
   * Source code context
   */
  context?: string[];
  
  /**
   * Local variables in this frame
   */
  locals?: DebugVariable[];
  
  /**
   * Frame-specific scope variables
   */
  scopeVariables?: {
    locals: DebugVariable[];
    closure: DebugVariable[];
    global: DebugVariable[];
  };
}

/**
 * Debug console message
 */
export interface DebugConsoleMessage {
  /**
   * Message ID
   */
  id: string;
  
  /**
   * Message type
   */
  type: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'command' | 'result';
  
  /**
   * Message text
   */
  text: string;
  
  /**
   * Rich objects attached to the message
   */
  objects?: any[];
  
  /**
   * Source information
   */
  source?: {
    path?: string;
    line?: number;
    column?: number;
  };
  
  /**
   * Timestamp
   */
  timestamp: Date;
  
  /**
   * Message grouping level
   */
  groupLevel: number;
  
  /**
   * Whether to start collapsed group
   */
  startCollapsedGroup?: boolean;
  
  /**
   * Whether to start group
   */
  startGroup?: boolean;
  
  /**
   * Whether to end group
   */
  endGroup?: boolean;
}

/**
 * Debug watch expression
 */
export interface DebugWatchExpression {
  /**
   * Expression ID
   */
  id: string;
  
  /**
   * Expression text
   */
  expression: string;
  
  /**
   * Last evaluated value
   */
  value: string;
  
  /**
   * Error message if evaluation failed
   */
  error?: string;
  
  /**
   * Last evaluation timestamp
   */
  timestamp: Date;
  
  /**
   * Result type
   */
  type: DebugVariableType;
  
  /**
   * Whether the expression is enabled
   */
  enabled: boolean;
  
  /**
   * Whether to show type information
   */
  showType: boolean;
}

/**
 * Debug thread
 */
export interface DebugThread {
  /**
   * Thread ID
   */
  id: string;
  
  /**
   * Thread name
   */
  name: string;
  
  /**
   * Whether the thread is stopped
   */
  stopped: boolean;
  
  /**
   * Current frame ID
   */
  frameId?: string;
  
  /**
   * Stack frames
   */
  frames: DebugStackFrame[];
}

/**
 * Debug exception
 */
export interface DebugException {
  /**
   * Exception ID
   */
  id: string;
  
  /**
   * Exception name
   */
  name: string;
  
  /**
   * Exception message
   */
  message: string;
  
  /**
   * Stack trace
   */
  stackTrace: string;
  
  /**
   * Exception object
   */
  exception?: any;
  
  /**
   * Source information
   */
  source?: {
    path?: string;
    line?: number;
    column?: number;
  };
  
  /**
   * Timestamp
   */
  timestamp: Date;
}

/**
 * Debug state interface
 */
export interface DebugState {
  /**
   * Whether the debugger is connected
   */
  connected: boolean;
  
  /**
   * Whether the target is running
   */
  running: boolean;
  
  /**
   * Whether the target is paused
   */
  paused: boolean;
  
  /**
   * Variables in the current scope
   */
  variables: DebugVariable[];
  
  /**
   * Breakpoints
   */
  breakpoints: DebugBreakpoint[];
  
  /**
   * Call stack
   */
  callstack: DebugStackFrame[];
  
  /**
   * Console messages
   */
  console: DebugConsoleMessage[];
  
  /**
   * Watch expressions
   */
  watches: DebugWatchExpression[];
  
  /**
   * Current thread
   */
  currentThread?: DebugThread;
  
  /**
   * All threads
   */
  threads: DebugThread[];
  
  /**
   * Last exception
   */
  lastException?: DebugException;
  
  /**
   * Error message if connection failed
   */
  connectionError?: string;
}

/**
 * Debug command interface
 */
export interface DebugCommand {
  /**
   * Command name
   */
  name: string;
  
  /**
   * Command description
   */
  description: string;
  
  /**
   * Keyboard shortcut
   */
  shortcut?: string;
  
  /**
   * Whether the command is enabled in the current state
   */
  enabled: boolean;
  
  /**
   * Command action
   */
  action: () => void;
  
  /**
   * Command category
   */
  category: 'control' | 'navigation' | 'inspection' | 'configuration' | 'other';
  
  /**
   * Command icon or symbol
   */
  icon?: string;
}

/**
 * Debug panel type
 */
export enum DebugPanelType {
  VARIABLES = 'variables',
  CALL_STACK = 'callstack',
  BREAKPOINTS = 'breakpoints',
  CONSOLE = 'console',
  WATCHES = 'watches',
  THREADS = 'threads',
  SOURCES = 'sources'
}

/**
 * Debug interface props
 */
export interface DebuggingInterfaceProps {
  /**
   * Width of the component
   */
  width: number;
  
  /**
   * Height of the component
   */
  height: number;
  
  /**
   * Initial debug state
   */
  initialState?: Partial<DebugState>;
  
  /**
   * Whether the interface is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when the user exits the interface
   */
  onExit?: () => void;
  
  /**
   * Callback when a command is executed
   */
  onCommand?: (command: string, args?: any[]) => Promise<any>;
  
  /**
   * Callback when a variable is edited
   */
  onVariableEdit?: (variable: DebugVariable, newValue: any) => Promise<any>;
  
  /**
   * Callback when a breakpoint is added
   */
  onBreakpointAdd?: (path: string, line: number, condition?: string) => Promise<DebugBreakpoint>;
  
  /**
   * Callback when a breakpoint is removed
   */
  onBreakpointRemove?: (id: string) => Promise<void>;
  
  /**
   * Callback when a breakpoint is updated
   */
  onBreakpointUpdate?: (id: string, updates: Partial<DebugBreakpoint>) => Promise<DebugBreakpoint>;
  
  /**
   * Callback when a watch expression is added
   */
  onWatchAdd?: (expression: string) => Promise<DebugWatchExpression>;
  
  /**
   * Callback when a watch expression is removed
   */
  onWatchRemove?: (id: string) => Promise<void>;
  
  /**
   * Callback when a watch expression is updated
   */
  onWatchUpdate?: (id: string, updates: Partial<DebugWatchExpression>) => Promise<DebugWatchExpression>;
  
  /**
   * Callback when the console is cleared
   */
  onConsoleClear?: () => void;
}

/**
 * Debug panel props
 */
export interface DebugPanelProps {
  /**
   * Panel title
   */
  title: string;
  
  /**
   * Panel type
   */
  type: DebugPanelType;
  
  /**
   * Panel width
   */
  width: number;
  
  /**
   * Panel height
   */
  height: number;
  
  /**
   * Whether the panel is focused
   */
  isFocused?: boolean;
  
  /**
   * Debug state
   */
  state: DebugState;
  
  /**
   * Callback when a command is executed
   */
  onCommand?: (command: string, args?: any[]) => Promise<any>;
  
  /**
   * Callback when focus changes
   */
  onFocusChange?: (focused: boolean) => void;
}

/**
 * Variables panel props
 */
export interface VariablesPanelProps extends Omit<DebugPanelProps, 'title' | 'type'> {
  /**
   * Variables to display
   */
  variables: DebugVariable[];
  
  /**
   * Callback when a variable is edited
   */
  onVariableEdit?: (variable: DebugVariable, newValue: any) => Promise<any>;
  
  /**
   * Callback when a variable is expanded/collapsed
   */
  onVariableToggle?: (variable: DebugVariable) => void;
  
  /**
   * Callback when a variable is selected
   */
  onVariableSelect?: (variable: DebugVariable) => void;
}

/**
 * Call stack panel props
 */
export interface CallStackPanelProps extends Omit<DebugPanelProps, 'title' | 'type'> {
  /**
   * Call stack to display
   */
  callstack: DebugStackFrame[];
  
  /**
   * Callback when a frame is selected
   */
  onFrameSelect?: (frame: DebugStackFrame) => void;
}

/**
 * Breakpoints panel props
 */
export interface BreakpointsPanelProps extends Omit<DebugPanelProps, 'title' | 'type'> {
  /**
   * Breakpoints to display
   */
  breakpoints: DebugBreakpoint[];
  
  /**
   * Callback when a breakpoint is added
   */
  onBreakpointAdd?: (path: string, line: number, condition?: string) => Promise<DebugBreakpoint>;
  
  /**
   * Callback when a breakpoint is removed
   */
  onBreakpointRemove?: (id: string) => Promise<void>;
  
  /**
   * Callback when a breakpoint is updated
   */
  onBreakpointUpdate?: (id: string, updates: Partial<DebugBreakpoint>) => Promise<DebugBreakpoint>;
  
  /**
   * Callback when a breakpoint is selected
   */
  onBreakpointSelect?: (breakpoint: DebugBreakpoint) => void;
}

/**
 * Console panel props
 */
export interface ConsolePanelProps extends Omit<DebugPanelProps, 'title' | 'type'> {
  /**
   * Console messages to display
   */
  messages: DebugConsoleMessage[];
  
  /**
   * Callback when the console is cleared
   */
  onClear?: () => void;
  
  /**
   * Callback when a command is executed
   */
  onCommand?: (command: string) => Promise<any>;
}

/**
 * Watches panel props
 */
export interface WatchesPanelProps extends Omit<DebugPanelProps, 'title' | 'type'> {
  /**
   * Watch expressions to display
   */
  watches: DebugWatchExpression[];
  
  /**
   * Callback when a watch expression is added
   */
  onWatchAdd?: (expression: string) => Promise<DebugWatchExpression>;
  
  /**
   * Callback when a watch expression is removed
   */
  onWatchRemove?: (id: string) => Promise<void>;
  
  /**
   * Callback when a watch expression is updated
   */
  onWatchUpdate?: (id: string, updates: Partial<DebugWatchExpression>) => Promise<DebugWatchExpression>;
  
  /**
   * Callback when a watch expression is selected
   */
  onWatchSelect?: (watch: DebugWatchExpression) => void;
}

/**
 * Threads panel props
 */
export interface ThreadsPanelProps extends Omit<DebugPanelProps, 'title' | 'type'> {
  /**
   * Threads to display
   */
  threads: DebugThread[];
  
  /**
   * Callback when a thread is selected
   */
  onThreadSelect?: (thread: DebugThread) => void;
}

/**
 * Sources panel props
 */
export interface SourcesPanelProps extends Omit<DebugPanelProps, 'title' | 'type'> {
  /**
   * Current file path
   */
  currentFile?: string;
  
  /**
   * Current line number
   */
  currentLine?: number;
  
  /**
   * Callback when a source file is opened
   */
  onSourceOpen?: (path: string, line?: number) => void;
}

/**
 * Source view props
 */
export interface SourceViewProps {
  /**
   * File path
   */
  path: string;
  
  /**
   * File content
   */
  content: string;
  
  /**
   * Current line number
   */
  currentLine?: number;
  
  /**
   * Breakpoints in this file
   */
  breakpoints?: DebugBreakpoint[];
  
  /**
   * Component width
   */
  width: number;
  
  /**
   * Component height
   */
  height: number;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when a breakpoint is toggled
   */
  onBreakpointToggle?: (line: number) => void;
  
  /**
   * Callback when the cursor position changes
   */
  onCursorChange?: (line: number, column: number) => void;
}

/**
 * Debug toolbar props
 */
export interface DebugToolbarProps {
  /**
   * Available debug commands
   */
  commands: DebugCommand[];
  
  /**
   * Debug state
   */
  state: DebugState;
  
  /**
   * Component width
   */
  width: number;
  
  /**
   * Callback when a command is executed
   */
  onCommand?: (command: string, args?: any[]) => Promise<any>;
}