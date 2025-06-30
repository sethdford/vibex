/**
 * Diff Renderer Component
 * 
 * Displays code or text diffs with syntax highlighting
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors';
import * as diff from 'diff';

/**
 * Diff renderer props
 */
interface DiffRendererProps {
  /**
   * Original text
   */
  oldText: string;
  
  /**
   * New text
   */
  newText: string;
  
  /**
   * Whether to show line numbers
   */
  showLineNumbers?: boolean;
  
  /**
   * Maximum number of context lines to show
   */
  contextLines?: number;
  
  /**
   * Maximum width for rendering
   */
  maxWidth?: number;
  
  /**
   * Whether to show a header with file names
   */
  showHeader?: boolean;
  
  /**
   * Old file name (for header)
   */
  oldFileName?: string;
  
  /**
   * New file name (for header)
   */
  newFileName?: string;
  
  /**
   * Whether to use colors
   */
  useColors?: boolean;
}

/**
 * Line type in a diff
 */
type LineType = 'added' | 'removed' | 'unchanged' | 'header';

/**
 * Diff line interface
 */
interface DiffLine {
  /**
   * Line content
   */
  content: string;
  
  /**
   * Line type
   */
  type: LineType;
  
  /**
   * Line number in old file
   */
  oldLineNumber?: number;
  
  /**
   * Line number in new file
   */
  newLineNumber?: number;
}

/**
 * Parse diff into lines
 */
function parseDiff(oldText: string, newText: string, contextLines: number): DiffLine[] {
  // Generate line-by-line diff
  const changes = diff.diffLines(oldText, newText);
  
  const diffLines: DiffLine[] = [];
  let oldLineCounter = 1;
  let newLineCounter = 1;
  
  // Process each change
  changes.forEach((change) => {
    const lines = change.value.split('\n');
    // Remove empty line at the end if the last line ended with a newline
    if (lines[lines.length - 1] === '') {
      lines.pop();
    }
    
    lines.forEach((line) => {
      if (change.added) {
        // Added line
        diffLines.push({
          content: line,
          type: 'added',
          newLineNumber: newLineCounter++,
        });
      } else if (change.removed) {
        // Removed line
        diffLines.push({
          content: line,
          type: 'removed',
          oldLineNumber: oldLineCounter++,
        });
      } else {
        // Unchanged line
        diffLines.push({
          content: line,
          type: 'unchanged',
          oldLineNumber: oldLineCounter++,
          newLineNumber: newLineCounter++,
        });
      }
    });
  });
  
  // Apply context limiting
  if (contextLines >= 0) {
    return limitDiffContext(diffLines, contextLines);
  }
  
  return diffLines;
}

/**
 * Limit diff context to a specific number of unchanged lines
 */
function limitDiffContext(lines: DiffLine[], contextLines: number): DiffLine[] {
  if (contextLines < 0) return lines;
  if (lines.length === 0) return [];
  
  const result: DiffLine[] = [];
  let lastChangedIndex = -1;
  
  // Find changed lines and keep track of context
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // If this is a changed line or within contextLines of a changed line, include it
    if (line.type === 'added' || line.type === 'removed') {
      // Include preceding context if this is the first change or far from the last change
      const startContext = Math.max(0, i - contextLines);
      const endContext = Math.min(lines.length - 1, i + contextLines);
      
      // Add separator if needed
      if (result.length > 0 && startContext > lastChangedIndex + contextLines + 1) {
        result.push({
          content: '...',
          type: 'header',
        });
      }
      
      // Add context before the change if it's not already included
      for (let j = Math.max(lastChangedIndex + 1, startContext); j < i; j++) {
        result.push(lines[j]);
      }
      
      // Add the changed line
      result.push(line);
      
      // Add context after the change
      for (let j = i + 1; j <= endContext; j++) {
        if (lines[j] && lines[j].type === 'unchanged') {
          result.push(lines[j]);
        }
      }
      
      lastChangedIndex = i;
    }
  }
  
  return result;
}

/**
 * Get color for line type
 */
function getLineColor(type: LineType, useColors: boolean): string | undefined {
  if (!useColors) return undefined;
  
  switch (type) {
    case 'added':
      return Colors.Success;
    case 'removed':
      return Colors.Error;
    case 'header':
      return Colors.Info;
    default:
      return undefined;
  }
}

/**
 * Get prefix for line type
 */
function getLinePrefix(type: LineType): string {
  switch (type) {
    case 'added':
      return '+ ';
    case 'removed':
      return '- ';
    case 'unchanged':
      return '  ';
    case 'header':
      return '';
    default:
      return '';
  }
}

/**
 * Format line numbers
 */
function formatLineNumbers(oldNum?: number, newNum?: number): string {
  const oldStr = oldNum !== undefined ? oldNum.toString().padStart(4) : '    ';
  const newStr = newNum !== undefined ? newNum.toString().padStart(4) : '    ';
  return `${oldStr}:${newStr}`;
}

/**
 * Diff renderer component
 */
export const DiffRenderer: React.FC<DiffRendererProps> = ({
  oldText,
  newText,
  showLineNumbers = true,
  contextLines = 3,
  maxWidth,
  showHeader = true,
  oldFileName = 'a',
  newFileName = 'b',
  useColors = true,
}) => {
  // Parse diff
  const diffLines = parseDiff(oldText, newText, contextLines);
  
  // Calculate content width
  const lineNumbersWidth = showLineNumbers ? 10 : 0;
  const prefixWidth = 2;
  const contentWidth = maxWidth
    ? Math.max(20, maxWidth - lineNumbersWidth - prefixWidth)
    : 80;
  
  return (
    <Box flexDirection="column" marginY={1}>
      {/* Header */}
      {showHeader && (
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={Colors.TextDim}>--- {oldFileName}</Text>
          </Box>
          <Box>
            <Text color={Colors.TextDim}>+++ {newFileName}</Text>
          </Box>
        </Box>
      )}
      
      {/* Diff lines */}
      {diffLines.map((line, index) => (
        <Box key={index}>
          {/* Line numbers */}
          {showLineNumbers && (
            <Box width={lineNumbersWidth} marginRight={1}>
              <Text color={Colors.TextDim} dimColor>
                {line.type !== 'header' ? formatLineNumbers(line.oldLineNumber, line.newLineNumber) : '        '}
              </Text>
            </Box>
          )}
          
          {/* Line content */}
          <Box>
            <Text color={getLineColor(line.type, useColors)}>
              {line.type !== 'header' ? getLinePrefix(line.type) : ''}
              {line.content.length > contentWidth
                ? `${line.content.substring(0, contentWidth - 3)}...`
                : line.content}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};