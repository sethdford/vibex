/**
 * Enhanced Tool Message Component
 * 
 * A comprehensive tool message component that displays tool requests and results
 * with rich visualization options, status indicators, and progressive disclosure.
 * 
 * This component is part of the VibeX UI Enhancement Plan and replaces the basic ToolMessage.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { StatusIndicator } from './StatusIndicator.js';
import { ToolResultVisualizer } from './ToolResultVisualizer.js';
import { ProgressIndicator } from '../ProgressIndicator.js';

/**
 * Tool execution status
 */
export enum ToolExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELED = 'canceled',
  WARNING = 'warning',
}

/**
 * Tool visibility level for progressive disclosure
 */
export enum ToolVisibilityLevel {
  MINIMAL = 'minimal',    // Just name and status
  STANDARD = 'standard',  // With input parameters
  DETAILED = 'detailed',  // With full result details
  EXPANDED = 'expanded',  // With full context and metadata
}

/**
 * Tool result type for specialized visualization
 */
export enum ToolResultType {
  TEXT = 'text',
  JSON = 'json',
  FILE_PATHS = 'file_paths',
  FILE_CONTENT = 'file_content',
  FILE_DIFF = 'file_diff',
  CODE = 'code',
  IMAGE = 'image',
  ERROR = 'error',
  METRICS = 'metrics',
  UNKNOWN = 'unknown',
}

/**
 * Tool input parameters interface
 */
export interface ToolInputParameters {
  [key: string]: string | number | boolean | null | undefined | object | Array<any>;
}

/**
 * Tool use props with enhanced metadata
 */
export interface EnhancedToolUseProps {
  /**
   * Tool name
   */
  name: string;
  
  /**
   * Tool input parameters
   */
  input: ToolInputParameters;
  
  /**
   * Tool ID
   */
  id: string;
  
  /**
   * Current execution status
   */
  status: ToolExecutionStatus;
  
  /**
   * Tool namespace or category
   */
  namespace?: string;
  
  /**
   * Tool description
   */
  description?: string;
  
  /**
   * Optional metadata for specialized display
   */
  metadata?: {
    /**
     * Time when tool execution started
     */
    startTime?: number;
    
    /**
     * Time when tool execution completed
     */
    endTime?: number;
    
    /**
     * Execution progress (0-100)
     */
    progress?: number;
    
    /**
     * Execution message for progress updates
     */
    message?: string;
    
    /**
     * Whether this tool requires confirmation
     */
    requiresConfirmation?: boolean;
    
    /**
     * Whether this tool execution was automated
     */
    isAutomated?: boolean;
    
    /**
     * Custom properties for specialized tools
     */
    [key: string]: any;
  };
}

/**
 * Tool result props with enhanced metadata
 */
export interface EnhancedToolResultProps {
  /**
   * Result content
   */
  content: string | object | null;
  
  /**
   * Whether the result is an error
   */
  isError: boolean;
  
  /**
   * Related tool use ID
   */
  toolUseId: string;
  
  /**
   * Result type for specialized visualization
   */
  resultType?: ToolResultType;
  
  /**
   * Optional metadata for specialized display
   */
  metadata?: {
    /**
     * Content length
     */
    contentLength?: number;
    
    /**
     * File paths for file results
     */
    filePaths?: string[];
    
    /**
     * Language for code display
     */
    language?: string;
    
    /**
     * Metrics data
     */
    metrics?: {
      executionTime?: number;
      memoryUsage?: number;
      processedItems?: number;
      [key: string]: any;
    };
    
    /**
     * Custom properties for specialized results
     */
    [key: string]: any;
  };
}

/**
 * Enhanced tool message props
 */
export interface EnhancedToolMessageProps {
  /**
   * Tool use data
   */
  toolUse: EnhancedToolUseProps;
  
  /**
   * Tool result data (optional)
   */
  toolResult?: EnhancedToolResultProps;
  
  /**
   * Initial visibility level
   */
  initialVisibility?: ToolVisibilityLevel;
  
  /**
   * Whether the tool message is focused
   */
  isFocused?: boolean;
  
  /**
   * Whether to auto-collapse large results
   */
  autoCollapseResults?: boolean;
  
  /**
   * Maximum result lines to show before collapsing
   */
  maxResultLines?: number;
  
  /**
   * Terminal width for responsive layout
   */
  terminalWidth?: number;
  
  /**
   * Callbacks
   */
  onFocus?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  onCopyResult?: () => void;
}

/**
 * Enhanced tool message component
 */
export const EnhancedToolMessage: React.FC<EnhancedToolMessageProps> = ({
  toolUse,
  toolResult,
  initialVisibility = ToolVisibilityLevel.STANDARD,
  isFocused = false,
  autoCollapseResults = true,
  maxResultLines = 20,
  terminalWidth = 80,
  onFocus,
  onRetry,
  onCancel,
  onCopyResult,
}) => {
  // Local state
  const [visibilityLevel, setVisibilityLevel] = useState<ToolVisibilityLevel>(initialVisibility);
  const [isResultExpanded, setIsResultExpanded] = useState<boolean>(!autoCollapseResults);
  
  // Determine the status color
  const statusColor = useMemo(() => {
    switch (toolUse.status) {
      case ToolExecutionStatus.PENDING:
        return Colors.TextDim;
      case ToolExecutionStatus.RUNNING:
        return Colors.Info;
      case ToolExecutionStatus.SUCCESS:
        return Colors.Success;
      case ToolExecutionStatus.ERROR:
        return Colors.Error;
      case ToolExecutionStatus.CANCELED:
        return Colors.TextMuted;
      case ToolExecutionStatus.WARNING:
        return Colors.Warning;
      default:
        return Colors.TextDim;
    }
  }, [toolUse.status]);
  
  // Determine the result type if not explicitly provided
  const detectedResultType = useMemo(() => {
    if (!toolResult) return null;
    
    if (toolResult.resultType) return toolResult.resultType;
    
    const content = toolResult.content;
    
    // Detect result type based on content
    if (toolResult.isError) {
      return ToolResultType.ERROR;
    }
    
    if (typeof content === 'object') {
      return ToolResultType.JSON;
    }
    
    if (typeof content === 'string') {
      // Check for common patterns in content
      if (content.match(/^\s*[\[\{]/)) {
        try {
          JSON.parse(content);
          return ToolResultType.JSON;
        } catch (e) {
          // Not valid JSON
        }
      }
      
      if (content.match(/^([a-zA-Z]:)?\/[\w\/\.-]+\n?$/m)) {
        return ToolResultType.FILE_PATHS;
      }
      
      if (content.match(/^diff --git /m)) {
        return ToolResultType.FILE_DIFF;
      }
      
      // More pattern detection could be added here...
    }
    
    return ToolResultType.TEXT;
  }, [toolResult]);
  
  // Toggle visibility level
  const toggleVisibilityLevel = useCallback(() => {
    setVisibilityLevel(current => {
      switch (current) {
        case ToolVisibilityLevel.MINIMAL:
          return ToolVisibilityLevel.STANDARD;
        case ToolVisibilityLevel.STANDARD:
          return ToolVisibilityLevel.DETAILED;
        case ToolVisibilityLevel.DETAILED:
          return ToolVisibilityLevel.EXPANDED;
        case ToolVisibilityLevel.EXPANDED:
          return ToolVisibilityLevel.MINIMAL;
        default:
          return ToolVisibilityLevel.STANDARD;
      }
    });
  }, []);
  
  // Toggle result expansion
  const toggleResultExpansion = useCallback(() => {
    setIsResultExpanded(prev => !prev);
  }, []);
  
  // Format tool input for display
  const formatToolInput = useCallback((input: ToolInputParameters): string => {
    try {
      return JSON.stringify(input, null, 2);
    } catch (error) {
      return String(input);
    }
  }, []);
  
  // Should show input parameters
  const shouldShowInput = visibilityLevel !== ToolVisibilityLevel.MINIMAL;
  
  // Should show detailed result
  const shouldShowDetailedResult = visibilityLevel === ToolVisibilityLevel.DETAILED || 
                                  visibilityLevel === ToolVisibilityLevel.EXPANDED;
  
  // Should show metadata
  const shouldShowMetadata = visibilityLevel === ToolVisibilityLevel.EXPANDED;
  
  return (
    <Box flexDirection="column" marginBottom={1} borderStyle={isFocused ? "round" : undefined} 
         borderColor={isFocused ? statusColor : undefined}>
      {/* Tool request header */}
      <Box>
        <StatusIndicator 
          status={toolUse.status} 
          marginRight={1} 
          animate={toolUse.status === ToolExecutionStatus.RUNNING} 
        />
        
        <Box marginRight={1}>
          <Text color={Colors.Info} bold>
            {toolUse.namespace ? `${toolUse.namespace}:` : ''}
            {toolUse.name}
          </Text>
        </Box>
        
        {/* Show execution time if available */}
        {toolUse.metadata?.startTime && toolUse.metadata?.endTime && (
          <Box marginLeft={1}>
            <Text color={Colors.TextDim}>
              ({Math.round((toolUse.metadata.endTime - toolUse.metadata.startTime) / 10) / 100}s)
            </Text>
          </Box>
        )}
        
        {/* Show toggle indicator */}
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={Colors.TextDim}>
            [{visibilityLevel}] {isFocused ? '(focused)' : ''}
          </Text>
        </Box>
      </Box>
      
      {/* Tool description if available */}
      {toolUse.description && (
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>{toolUse.description}</Text>
        </Box>
      )}
      
      {/* Tool input parameters */}
      {shouldShowInput && (
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          <Text color={Colors.TextDim}>
            Input:
          </Text>
          
          <Box 
            marginLeft={1} 
            marginTop={1}
            borderStyle="round"
            borderColor={Colors.TextDim}
            paddingX={1}
            flexDirection="column"
          >
            <Text>
              {formatToolInput(toolUse.input)}
            </Text>
          </Box>
        </Box>
      )}
      
      {/* Progress indicator for running tools */}
      {toolUse.status === ToolExecutionStatus.RUNNING && toolUse.metadata?.progress !== undefined && (
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          <ProgressIndicator
            percent={toolUse.metadata.progress}
            width={Math.min(terminalWidth - 10, 50)}
            message={toolUse.metadata.message}
          />
        </Box>
      )}
      
      {/* Tool result */}
      {toolResult && (
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          <Box>
            <Text color={toolResult.isError ? Colors.Error : Colors.Success}>
              {toolResult.isError ? 'Error:' : 'Result:'}
            </Text>
            
            {/* Result type indicator */}
            {detectedResultType && (
              <Text color={Colors.TextDim} italic>
                {' '}[{detectedResultType}]
              </Text>
            )}
            
            {/* Expand/collapse control for large results */}
            {autoCollapseResults && toolResult.metadata?.contentLength && 
             toolResult.metadata.contentLength > maxResultLines && (
              <Box marginLeft={1}>
                <Text color={Colors.AccentBlue} underline>
                  [{isResultExpanded ? 'Collapse' : 'Expand'}]
                </Text>
              </Box>
            )}
          </Box>
          
          {/* Result content */}
          {shouldShowDetailedResult && (
            <Box 
              marginLeft={1}
              marginTop={1}
              borderStyle="round"
              borderColor={toolResult.isError ? Colors.Error : Colors.Success}
              paddingX={1}
              flexDirection="column"
            >
              <ToolResultVisualizer
                result={toolResult}
                resultType={detectedResultType || ToolResultType.TEXT}
                isExpanded={isResultExpanded}
                maxLines={maxResultLines}
                width={terminalWidth - 10}
              />
            </Box>
          )}
        </Box>
      )}
      
      {/* Tool metadata */}
      {shouldShowMetadata && toolUse.metadata && Object.keys(toolUse.metadata).length > 0 && (
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          <Text color={Colors.TextDim}>
            Metadata:
          </Text>
          
          <Box 
            marginLeft={1}
            marginTop={1}
            borderStyle="round"
            borderColor={Colors.TextDim}
            paddingX={1}
            flexDirection="column"
          >
            <Text>
              {formatToolInput(toolUse.metadata)}
            </Text>
          </Box>
        </Box>
      )}
      
      {/* Action buttons */}
      {isFocused && (
        <Box marginTop={1} justifyContent="flex-end">
          {onRetry && toolUse.status !== ToolExecutionStatus.RUNNING && (
            <Box marginRight={1}>
              <Text color={Colors.AccentBlue} underline>
                [Retry]
              </Text>
            </Box>
          )}
          
          {onCancel && toolUse.status === ToolExecutionStatus.RUNNING && (
            <Box marginRight={1}>
              <Text color={Colors.Warning} underline>
                [Cancel]
              </Text>
            </Box>
          )}
          
          {onCopyResult && toolResult && (
            <Box marginRight={1}>
              <Text color={Colors.AccentBlue} underline>
                [Copy]
              </Text>
            </Box>
          )}
          
          <Box marginRight={1}>
            <Text color={Colors.AccentBlue} underline>
              [Toggle]
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default EnhancedToolMessage;