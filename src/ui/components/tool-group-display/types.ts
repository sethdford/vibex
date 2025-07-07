/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { Tool, ToolCallRequest, ToolMetadata } from '../../../core/domain/tool/tool-interfaces';

/**
 * Tool group configuration
 */
export interface ToolGroup {
  /**
   * Group name
   */
  name: string;
  
  /**
   * Group description
   */
  description: string;
  
  /**
   * Icon for the group (optional)
   */
  icon?: string;
  
  /**
   * Tools in this group
   */
  tools: Tool[];
  
  /**
   * Whether the group is expanded
   */
  isExpanded?: boolean;
  
  /**
   * Metadata for the group
   */
  metadata?: {
    /**
     * Tags for categorization
     */
    tags?: string[];
    
    /**
     * Custom properties
     */
    [key: string]: unknown;
  };
}

/**
 * Tool group display props
 */
export interface ToolGroupDisplayProps {
  /**
   * Groups to display
   * If not provided, all tools will be grouped by namespace
   */
  groups?: ToolGroup[];
  
  /**
   * Custom grouping function
   */
  groupingFunction?: (tools: Tool[]) => ToolGroup[];
  
  /**
   * Filter function for tools
   */
  filterFunction?: (tool: Tool) => boolean;
  
  /**
   * Initial search query
   */
  initialSearch?: string;
  
  /**
   * Whether to show search box
   */
  showSearch?: boolean;
  
  /**
   * Whether to show documentation
   */
  showDocumentation?: boolean;
  
  /**
   * Whether to show examples
   */
  showExamples?: boolean;
  
  /**
   * Whether to allow execution
   */
  allowExecution?: boolean;
  
  /**
   * Terminal width
   */
  terminalWidth?: number;
  
  /**
   * Callback when a tool is selected
   */
  onToolSelect?: (tool: Tool) => void;
  
  /**
   * Callback when a tool is executed
   */
  onToolExecute?: (request: ToolCallRequest) => void;
  
  /**
   * Callback when a group is toggled
   */
  onGroupToggle?: (groupName: string) => void;
}

/**
 * Tool item props
 */
export interface ToolItemProps {
  /**
   * Tool instance
   */
  tool: Tool;
  
  /**
   * Whether to show documentation
   */
  showDocumentation?: boolean;
  
  /**
   * Whether to show examples
   */
  showExamples?: boolean;
  
  /**
   * Whether to allow execution
   */
  allowExecution?: boolean;
  
  /**
   * Terminal width
   */
  terminalWidth?: number;
  
  /**
   * Whether the tool is selected
   */
  isSelected?: boolean;
  
  /**
   * Callback when tool is selected
   */
  onSelect?: (tool: Tool) => void;
  
  /**
   * Callback when tool is executed
   */
  onExecute?: (request: ToolCallRequest) => void;
}

/**
 * Tool documentation props
 */
export interface ToolDocumentationProps {
  /**
   * Tool metadata
   */
  metadata: ToolMetadata;
  
  /**
   * Whether to show examples
   */
  showExamples?: boolean;
  
  /**
   * Terminal width
   */
  terminalWidth?: number;
}

/**
 * Tool example item props
 */
export interface ToolExampleItemProps {
  /**
   * Example name
   */
  name: string;
  
  /**
   * Example parameters
   */
  params: Record<string, unknown>;
  
  /**
   * Example result
   */
  result?: unknown;
  
  /**
   * Example description
   */
  description?: string;
  
  /**
   * Tool name
   */
  toolName: string;
  
  /**
   * Tool namespace
   */
  toolNamespace?: string;
  
  /**
   * Callback when example is executed
   */
  onExecute?: (request: ToolCallRequest) => void;
}

/**
 * Search box props
 */
export interface SearchBoxProps {
  /**
   * Search query
   */
  query: string;
  
  /**
   * Callback when query changes
   */
  onQueryChange: (query: string) => void;
  
  /**
   * Terminal width
   */
  terminalWidth?: number;
}