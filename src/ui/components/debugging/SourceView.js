/**
 * Source View Component
 * 
 * Component for displaying source code with line numbers, breakpoints, and current execution line.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';

/**
 * Source View Component
 */
export const SourceView = ({
  path,
  content,
  currentLine,
  breakpoints = [],
  width,
  height,
  isFocused = false,
  onBreakpointToggle,
  onCursorChange
}) => {
  // State for cursor position and scroll
  const [cursor, setCursor] = useState({ line: currentLine || 1, column: 1 });
  const [scrollTop, setScrollTop] = useState(0);
  
  // Parsed source lines and line numbers
  const { lines, lineNumbers } = useMemo(() => {
    const sourceLines = content.split('\n');
    const maxLineNumberWidth = String(sourceLines.length).length + 1;
    const lineNumbersFormatted = sourceLines.map((_, i) => {
      return String(i + 1).padStart(maxLineNumberWidth, ' ');
    });
    
    return { 
      lines: sourceLines,
      lineNumbers: lineNumbersFormatted
    };
  }, [content]);
  
  // Make sure cursor is within valid range
  useEffect(() => {
    const maxLine = Math.max(lines.length, 1);
    const currentCursorLine = Math.min(Math.max(1, cursor.line), maxLine);
    
    if (currentCursorLine !== cursor.line) {
      setCursor(prev => ({ ...prev, line: currentCursorLine }));
    }
    
    // Make sure line with cursor is visible
    if (currentCursorLine <= scrollTop) {
      setScrollTop(Math.max(0, currentCursorLine - 1));
    } else if (currentCursorLine > scrollTop + height - 2) {
      setScrollTop(Math.max(0, currentCursorLine - height + 2));
    }
  }, [cursor.line, scrollTop, lines.length, height, currentLine]);
  
  // Update cursor position when current line changes
  useEffect(() => {
    if (currentLine && currentLine !== cursor.line) {
      setCursor(prev => ({ ...prev, line: currentLine }));
    }
  }, [currentLine]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Navigation with arrow keys
    if (key.upArrow) {
      setCursor(prev => ({ ...prev, line: Math.max(1, prev.line - 1) }));
    } else if (key.downArrow) {
      setCursor(prev => ({ ...prev, line: Math.min(lines.length, prev.line + 1) }));
    } else if (key.pageUp) {
      setCursor(prev => ({ ...prev, line: Math.max(1, prev.line - Math.floor(height / 2)) }));
    } else if (key.pageDown) {
      setCursor(prev => ({ ...prev, line: Math.min(lines.length, prev.line + Math.floor(height / 2)) }));
    } else if (key.home) {
      setCursor(prev => ({ ...prev, line: 1 }));
    } else if (key.end) {
      setCursor(prev => ({ ...prev, line: lines.length }));
    }
    
    // Toggle breakpoint with space or b key
    if ((input === ' ' || input === 'b') && onBreakpointToggle) {
      onBreakpointToggle(cursor.line);
    }
    
    // Notify cursor change if callback provided
    if (onCursorChange) {
      onCursorChange(cursor.line, cursor.column);
    }
  }, { isActive: isFocused });
  
  // Get visible lines based on scroll position
  const visibleLines = useMemo(() => {
    return lines.slice(scrollTop, scrollTop + height);
  }, [lines, scrollTop, height]);
  
  // Get visible line numbers
  const visibleLineNumbers = useMemo(() => {
    return lineNumbers.slice(scrollTop, scrollTop + height);
  }, [lineNumbers, scrollTop, height]);
  
  // Check if a line has a breakpoint
  const hasBreakpoint = useCallback((lineNum) => {
    return breakpoints?.some(bp => bp.line === lineNum && bp.enabled);
  }, [breakpoints]);
  
  // Check if a line has a disabled breakpoint
  const hasDisabledBreakpoint = useCallback((lineNum) => {
    return breakpoints?.some(bp => bp.line === lineNum && !bp.enabled);
  }, [breakpoints]);
  
  // Format a line with syntax highlighting (simplified)
  const formatLine = useCallback((line) => {
    // This is a simplified syntax highlighting implementation
    // In a real-world scenario, you'd use a proper syntax highlighter
    
    // Highlight keywords
    const keywordRegex = /\b(function|const|let|var|if|else|for|while|return|class|import|export|from|async|await|try|catch|throw)\b/g;
    let formattedLine = line.replace(keywordRegex, match => `<keyword>${match}</keyword>`);
    
    // Highlight strings
    const stringRegex = /(["'`])(?:(?=(\\?))\2.)*?\1/g;
    formattedLine = formattedLine.replace(stringRegex, match => `<string>${match}</string>`);
    
    // Highlight numbers
    const numberRegex = /\b(\d+(?:\.\d+)?)\b/g;
    formattedLine = formattedLine.replace(numberRegex, match => `<number>${match}</number>`);
    
    // Highlight comments
    const commentRegex = /(\/\/.*$|\/\*[\s\S]*?\*\/)/;
    formattedLine = formattedLine.replace(commentRegex, match => `<comment>${match}</comment>`);
    
    // Now render the formatted parts
    const parts = [];
    let currentText = '';
    let currentTag = null;
    
    for (let i = 0; i < formattedLine.length; i++) {
      // Check for tag start
      if (formattedLine.substring(i, i + 1) === '<' && 
          formattedLine.substring(i, i + 8) !== '<string>' &&
          formattedLine.substring(i, i + 9) !== '<keyword>' &&
          formattedLine.substring(i, i + 8) !== '<number>' &&
          formattedLine.substring(i, i + 9) !== '<comment>') {
        
        if (currentText) {
          if (currentTag === 'keyword') {
            parts.push(<Text key={parts.length} color={Colors.AccentGreen}>{currentText}</Text>);
          } else if (currentTag === 'string') {
            parts.push(<Text key={parts.length} color={Colors.AccentOrange}>{currentText}</Text>);
          } else if (currentTag === 'number') {
            parts.push(<Text key={parts.length} color={Colors.AccentCyan}>{currentText}</Text>);
          } else if (currentTag === 'comment') {
            parts.push(<Text key={parts.length} color={Colors.TextDim}>{currentText}</Text>);
          } else {
            parts.push(<Text key={parts.length}>{currentText}</Text>);
          }
          currentText = '';
        }
        
        // Extract tag name
        const tagEnd = formattedLine.indexOf('>', i);
        if (tagEnd !== -1) {
          const tag = formattedLine.substring(i + 1, tagEnd);
          if (tag.startsWith('/')) {
            currentTag = null;
          } else {
            currentTag = tag;
          }
          i = tagEnd;
          continue;
        }
      }
      
      // Add character to current text if not part of a tag
      if (formattedLine.substring(i, i + 1) !== '<' && formattedLine.substring(i, i + 1) !== '>') {
        currentText += formattedLine.substring(i, i + 1);
      }
    }
    
    // Add any remaining text
    if (currentText) {
      if (currentTag === 'keyword') {
        parts.push(<Text key={parts.length} color={Colors.AccentGreen}>{currentText}</Text>);
      } else if (currentTag === 'string') {
        parts.push(<Text key={parts.length} color={Colors.AccentOrange}>{currentText}</Text>);
      } else if (currentTag === 'number') {
        parts.push(<Text key={parts.length} color={Colors.AccentCyan}>{currentText}</Text>);
      } else if (currentTag === 'comment') {
        parts.push(<Text key={parts.length} color={Colors.TextDim}>{currentText}</Text>);
      } else {
        parts.push(<Text key={parts.length}>{currentText}</Text>);
      }
    }
    
    return <>{parts}</>;
  }, []);
  
  return (
    <Box 
      width={width} 
      height={height} 
      flexDirection="column"
      overflow="hidden"
      borderStyle={isFocused ? 'double' : 'single'}
      borderColor={isFocused ? Colors.Primary : Colors.Border}
    >
      {/* Source file path */}
      <Box width="100%" backgroundColor={Colors.BackgroundAlt}>
        <Text bold>{path}</Text>
      </Box>
      
      {/* Source code with line numbers */}
      {visibleLines.map((line, index) => {
        const lineNumber = scrollTop + index + 1;
        const isCurrentLine = lineNumber === currentLine;
        const isCurrentCursor = lineNumber === cursor.line;
        const hasBreakpointHere = hasBreakpoint(lineNumber);
        const hasDisabledBreakpointHere = hasDisabledBreakpoint(lineNumber);
        
        return (
          <Box key={`line-${lineNumber}`} width="100%">
            {/* Line number */}
            <Box 
              width={visibleLineNumbers[0]?.length + 3}
              backgroundColor={isCurrentCursor ? Colors.BackgroundSelected : undefined}
            >
              <Text 
                backgroundColor={isCurrentLine ? Colors.BackgroundHighlight : undefined}
                color={isCurrentLine ? Colors.ForegroundHighlight : Colors.TextDim}
                bold={isCurrentLine || isCurrentCursor}
              >
                {hasBreakpointHere && <Text color={Colors.Error}>●</Text>}
                {hasDisabledBreakpointHere && <Text color={Colors.Warning}>○</Text>}
                {!hasBreakpointHere && !hasDisabledBreakpointHere && ' '}
                {visibleLineNumbers[index]}
              </Text>
            </Box>
            
            {/* Source line */}
            <Box 
              flexGrow={1}
              backgroundColor={
                isCurrentLine ? Colors.BackgroundHighlight : 
                isCurrentCursor ? Colors.BackgroundSelected : undefined
              }
            >
              <Text
                color={isCurrentLine ? Colors.ForegroundHighlight : undefined}
                backgroundColor={
                  isCurrentLine ? Colors.BackgroundHighlight : 
                  isCurrentCursor ? Colors.BackgroundSelected : undefined
                }
              >
                {formatLine(line)}
              </Text>
            </Box>
          </Box>
        );
      })}
      
      {/* Status bar */}
      <Box 
        width="100%" 
        backgroundColor={Colors.BackgroundAlt}
        justifyContent="space-between"
      >
        <Text>Line {cursor.line}, Col {cursor.column}</Text>
        <Text color={Colors.TextDim}>
          {isFocused ? 
            '↑/↓: Navigate | Space: Toggle Breakpoint | PgUp/PgDn: Page | Home/End: Top/Bottom' :
            'Tab: Focus for navigation'
          }
        </Text>
      </Box>
    </Box>
  );
};

export default SourceView;