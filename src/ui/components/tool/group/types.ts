/**
 * Tool Group Display Types
 * 
 * Type definitions for the Tool Group Display component.
 */

/**
 * Tool parameter type
 */
export interface ToolParameter {
  name: string;
  description: string;
  type: string;
  required: boolean;
  defaultValue?: any;
}

/**
 * Tool example type
 */
export interface ToolExample {
  title: string;
  description?: string;
  parameters: Record<string, any>;
}

/**
 * Tool information
 */
export interface Tool {
  id: string;
  name: string;
  namespace?: string;
  description: string;
  parameters: ToolParameter[];
  tags?: string[];
  examples?: ToolExample[];
  documentation?: string;
}

/**
 * Tool group type
 */
export interface ToolGroup {
  id: string;
  name: string;
  description?: string;
  tools: Tool[];
  expanded?: boolean;
  tags?: string[];
}

/**
 * Tool execution options
 */
export interface ToolExecutionOptions {
  showConfirmation?: boolean;
  autoCollapse?: boolean;
}

/**
 * Tool group display props
 */
export interface ToolGroupDisplayProps {
  /**
   * Tool groups to display
   */
  groups: ToolGroup[];
  
  /**
   * Terminal width for responsive layout
   */
  width: number;
  
  /**
   * Maximum height for the component
   */
  height?: number;
  
  /**
   * Whether search functionality is enabled
   */
  searchEnabled?: boolean;
  
  /**
   * Initial search query
   */
  initialSearch?: string;
  
  /**
   * Whether tool execution is enabled
   */
  executionEnabled?: boolean;
  
  /**
   * Tool execution options
   */
  executionOptions?: ToolExecutionOptions;
  
  /**
   * Whether to group tools by namespace
   * If false, groups prop is used directly
   */
  groupByNamespace?: boolean;
  
  /**
   * Callback when a tool is selected
   */
  onToolSelect?: (tool: Tool) => void;
  
  /**
   * Callback when a tool is executed
   */
  onToolExecute?: (tool: Tool, parameters: Record<string, any>) => Promise<any>;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when focus changes
   */
  onFocusChange?: (focused: boolean) => void;
}

/**
 * Tool group item props
 */
export interface ToolGroupItemProps {
  /**
   * Group to display
   */
  group: ToolGroup;
  
  /**
   * Whether the group is expanded
   */
  expanded: boolean;
  
  /**
   * Whether tool execution is enabled
   */
  executionEnabled?: boolean;
  
  /**
   * Tool execution options
   */
  executionOptions?: ToolExecutionOptions;
  
  /**
   * Maximum width for the component
   */
  width: number;
  
  /**
   * Search query for filtering
   */
  searchQuery?: string;
  
  /**
   * Callback when expansion state changes
   */
  onToggleExpand: () => void;
  
  /**
   * Callback when a tool is selected
   */
  onToolSelect?: (tool: Tool) => void;
  
  /**
   * Callback when a tool is executed
   */
  onToolExecute?: (tool: Tool, parameters: Record<string, any>) => Promise<any>;
}

/**
 * Tool item props
 */
export interface ToolItemProps {
  /**
   * Tool to display
   */
  tool: Tool;
  
  /**
   * Whether the tool is expanded
   */
  expanded: boolean;
  
  /**
   * Whether the tool is selected
   */
  selected?: boolean;
  
  /**
   * Whether tool execution is enabled
   */
  executionEnabled?: boolean;
  
  /**
   * Tool execution options
   */
  executionOptions?: ToolExecutionOptions;
  
  /**
   * Maximum width for the component
   */
  width: number;
  
  /**
   * Search terms to highlight
   */
  searchTerms?: string[];
  
  /**
   * Callback when expansion state changes
   */
  onToggleExpand: () => void;
  
  /**
   * Callback when the tool is selected
   */
  onSelect?: () => void;
  
  /**
   * Callback when the tool is executed
   */
  onExecute?: (parameters: Record<string, any>) => Promise<any>;
}

/**
 * Tool documentation props
 */
export interface ToolDocumentationProps {
  /**
   * Tool to display documentation for
   */
  tool: Tool;
  
  /**
   * Maximum width for the component
   */
  width: number;
  
  /**
   * Search terms to highlight
   */
  searchTerms?: string[];
  
  /**
   * Whether execution form is enabled
   */
  executionEnabled?: boolean;
  
  /**
   * Tool execution options
   */
  executionOptions?: ToolExecutionOptions;
  
  /**
   * Callback when the tool is executed
   */
  onExecute?: (parameters: Record<string, any>) => Promise<any>;
}

/**
 * Tool example item props
 */
export interface ToolExampleItemProps {
  /**
   * Example to display
   */
  example: ToolExample;
  
  /**
   * Tool that the example belongs to
   */
  tool: Tool;
  
  /**
   * Maximum width for the component
   */
  width: number;
  
  /**
   * Whether execution is enabled
   */
  executionEnabled?: boolean;
  
  /**
   * Callback when the example is executed
   */
  onExecute?: (parameters: Record<string, any>) => Promise<any>;
}

/**
 * Search box props
 */
export interface SearchBoxProps {
  /**
   * Maximum width for the component
   */
  width: number;
  
  /**
   * Initial search query
   */
  initialQuery?: string;
  
  /**
   * Callback when search query changes
   */
  onSearch: (query: string) => void;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when focus changes
   */
  onFocusChange?: (focused: boolean) => void;
}