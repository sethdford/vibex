/**
 * Tool Types
 * 
 * Core type definitions for the tool system including confirmation UI types.
 */

// Define PartListUnion locally since it's not available from SDK
export type PartListUnion = Array<{
  type: string;
  text?: string;
  [key: string]: unknown;
}>;

/**
 * Result of a tool execution
 */
export interface ToolResult {
  /**
   * Content meant to be included in LLM history.
   */
  llmContent: PartListUnion | string;
  
  /**
   * Markdown string for user display.
   */
  returnDisplay?: ToolResultDisplay;
  
  /**
   * Error flag
   */
  is_error?: boolean;
}

/**
 * Display type for tool results
 */
export type ToolResultDisplay = string | FileDiff;

/**
 * File diff result
 */
export interface FileDiff {
  /**
   * Diff content in unified format
   */
  fileDiff: string;
  
  /**
   * File name
   */
  fileName: string;
}

/**
 * Possible outcomes from a tool confirmation prompt
 */
export enum ToolConfirmationOutcome {
  /**
   * Proceed with this tool invocation only
   */
  ProceedOnce = 'proceed_once',
  
  /**
   * Always proceed with this tool
   */
  ProceedAlways = 'proceed_always',
  
  /**
   * Always proceed with all tools from this server
   */
  ProceedAlwaysServer = 'proceed_always_server',
  
  /**
   * Always proceed with this specific tool from this server
   */
  ProceedAlwaysTool = 'proceed_always_tool',
  
  /**
   * Modify the tool parameters with an editor before proceeding
   */
  ModifyWithEditor = 'modify_with_editor',
  
  /**
   * Cancel the tool execution
   */
  Cancel = 'cancel',
}

/**
 * File edit confirmation details
 */
export interface ToolEditConfirmationDetails {
  /**
   * Confirmation type
   */
  type: 'edit';
  
  /**
   * Dialog title
   */
  title: string;
  
  /**
   * Callback for handling confirmation
   */
  onConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>;
  
  /**
   * File being edited
   */
  fileName: string;
  
  /**
   * Diff showing changes
   */
  fileDiff: string;
  
  /**
   * Whether the file is currently being modified
   */
  isModifying?: boolean;
}

/**
 * Command execution confirmation details
 */
export interface ToolExecuteConfirmationDetails {
  /**
   * Confirmation type
   */
  type: 'exec';
  
  /**
   * Dialog title
   */
  title: string;
  
  /**
   * Callback for handling confirmation
   */
  onConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>;
  
  /**
   * Full command being executed
   */
  command: string;
  
  /**
   * Root command (first word)
   */
  rootCommand: string;
}

/**
 * MCP tool confirmation details
 */
export interface ToolMcpConfirmationDetails {
  /**
   * Confirmation type
   */
  type: 'mcp';
  
  /**
   * Dialog title
   */
  title: string;
  
  /**
   * MCP server name
   */
  serverName: string;
  
  /**
   * Tool name on the server
   */
  toolName: string;
  
  /**
   * Display name for the tool
   */
  toolDisplayName: string;
  
  /**
   * Callback for handling confirmation
   */
  onConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>;
}

/**
 * Information confirmation details (for web fetches, etc)
 */
export interface ToolInfoConfirmationDetails {
  /**
   * Confirmation type
   */
  type: 'info';
  
  /**
   * Dialog title
   */
  title: string;
  
  /**
   * Callback for handling confirmation
   */
  onConfirm: (outcome: ToolConfirmationOutcome) => Promise<void>;
  
  /**
   * Information about the action
   */
  prompt: string;
  
  /**
   * URLs involved in the action
   */
  urls?: string[];
}

/**
 * Union type for all confirmation detail types
 */
export type ToolCallConfirmationDetails =
  | ToolEditConfirmationDetails
  | ToolExecuteConfirmationDetails
  | ToolMcpConfirmationDetails
  | ToolInfoConfirmationDetails;