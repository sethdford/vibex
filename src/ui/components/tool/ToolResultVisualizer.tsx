/**
 * Tool Result Visualizer Component
 * 
 * Specialized component for visualizing different types of tool results with
 * appropriate formatting, syntax highlighting, and truncation.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { EnhancedToolResultProps, ToolResultType } from './EnhancedToolMessage.js';

/**
 * Tool result visualizer props
 */
export interface ToolResultVisualizerProps {
  /**
   * Tool result data
   */
  result: EnhancedToolResultProps;
  
  /**
   * Result type for visualization
   */
  resultType: ToolResultType;
  
  /**
   * Whether the result is expanded
   */
  isExpanded?: boolean;
  
  /**
   * Maximum lines to show when not expanded
   */
  maxLines?: number;
  
  /**
   * Width constraint for rendering
   */
  width?: number;
}

/**
 * Helper to truncate multiline text
 */
const truncateText = (text: string, maxLines: number): [string, boolean] => {
  if (typeof text !== 'string') return [String(text), false];
  
  const lines = text.split('\n');
  if (lines.length <= maxLines) return [text, false];
  
  return [lines.slice(0, maxLines).join('\n'), true];
};

/**
 * Visualize JSON content
 */
const JsonVisualizer: React.FC<{content: any, maxLines?: number, isExpanded?: boolean}> = ({
  content,
  maxLines = 20,
  isExpanded = false,
}) => {
  const jsonString = typeof content === 'string' 
    ? content 
    : JSON.stringify(content, null, 2);
  
  const [displayText, isTruncated] = isExpanded 
    ? [jsonString, false]
    : truncateText(jsonString, maxLines);
  
  return (
    <Box flexDirection="column">
      <Text>{displayText}</Text>
      
      {isTruncated && (
        <Text color={Colors.TextDim} italic>
          ... {jsonString.split('\n').length - maxLines} more lines
        </Text>
      )}
    </Box>
  );
};

/**
 * Visualize file paths
 */
const FilePathsVisualizer: React.FC<{content: string, maxLines?: number, isExpanded?: boolean}> = ({
  content,
  maxLines = 20,
  isExpanded = false,
}) => {
  const paths = typeof content === 'string' 
    ? content.split('\n').filter(line => line.trim().length > 0)
    : [];
  
  const displayPaths = isExpanded 
    ? paths 
    : paths.slice(0, maxLines);
  
  return (
    <Box flexDirection="column">
      {displayPaths.map((path, index) => (
        <Text key={index} color={Colors.AccentBlue}>{path}</Text>
      ))}
      
      {!isExpanded && paths.length > maxLines && (
        <Text color={Colors.TextDim} italic>
          ... {paths.length - maxLines} more files
        </Text>
      )}
    </Box>
  );
};

/**
 * Visualize file diff
 */
const FileDiffVisualizer: React.FC<{content: string, maxLines?: number, isExpanded?: boolean}> = ({
  content,
  maxLines = 20,
  isExpanded = false,
}) => {
  const lines = typeof content === 'string' 
    ? content.split('\n')
    : [];
  
  const displayLines = isExpanded 
    ? lines 
    : lines.slice(0, maxLines);
  
  return (
    <Box flexDirection="column">
      {displayLines.map((line, index) => {
        let color = Colors.Text;
        
        if (line.startsWith('+')) {
          color = Colors.Success;
        } else if (line.startsWith('-')) {
          color = Colors.Error;
        } else if (line.startsWith('@@ ')) {
          color = Colors.Info;
        } else if (line.startsWith('diff ') || line.startsWith('index ')) {
          color = Colors.Secondary;
        }
        
        return <Text key={index} color={color}>{line}</Text>;
      })}
      
      {!isExpanded && lines.length > maxLines && (
        <Text color={Colors.TextDim} italic>
          ... {lines.length - maxLines} more lines
        </Text>
      )}
    </Box>
  );
};

/**
 * Visualize error content
 */
const ErrorVisualizer: React.FC<{content: any, maxLines?: number, isExpanded?: boolean}> = ({
  content,
  maxLines = 20,
  isExpanded = false,
}) => {
  const errorText = typeof content === 'string' 
    ? content 
    : JSON.stringify(content, null, 2);
  
  const [displayText, isTruncated] = isExpanded 
    ? [errorText, false]
    : truncateText(errorText, maxLines);
  
  return (
    <Box flexDirection="column">
      <Text color={Colors.Error}>{displayText}</Text>
      
      {isTruncated && (
        <Text color={Colors.TextDim} italic>
          ... {errorText.split('\n').length - maxLines} more lines
        </Text>
      )}
    </Box>
  );
};

/**
 * Default text visualizer
 */
const TextVisualizer: React.FC<{content: any, maxLines?: number, isExpanded?: boolean}> = ({
  content,
  maxLines = 20,
  isExpanded = false,
}) => {
  const text = typeof content === 'string' 
    ? content 
    : String(content);
  
  const [displayText, isTruncated] = isExpanded 
    ? [text, false]
    : truncateText(text, maxLines);
  
  return (
    <Box flexDirection="column">
      <Text>{displayText}</Text>
      
      {isTruncated && (
        <Text color={Colors.TextDim} italic>
          ... {text.split('\n').length - maxLines} more lines
        </Text>
      )}
    </Box>
  );
};

/**
 * Main tool result visualizer component
 */
export const ToolResultVisualizer: React.FC<ToolResultVisualizerProps> = ({
  result,
  resultType,
  isExpanded = false,
  maxLines = 20,
  width = 80,
}) => {
  const content = result.content;
  
  // Return appropriate visualizer based on result type
  switch (resultType) {
    case ToolResultType.JSON:
      return <JsonVisualizer content={content} maxLines={maxLines} isExpanded={isExpanded} />;
    
    case ToolResultType.FILE_PATHS:
      return <FilePathsVisualizer content={content as string} maxLines={maxLines} isExpanded={isExpanded} />;
    
    case ToolResultType.FILE_DIFF:
      return <FileDiffVisualizer content={content as string} maxLines={maxLines} isExpanded={isExpanded} />;
    
    case ToolResultType.ERROR:
      return <ErrorVisualizer content={content} maxLines={maxLines} isExpanded={isExpanded} />;
    
    case ToolResultType.TEXT:
    default:
      return <TextVisualizer content={content} maxLines={maxLines} isExpanded={isExpanded} />;
  }
};

export default ToolResultVisualizer;