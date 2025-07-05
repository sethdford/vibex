/**
 * Code Colorizer
 * 
 * Advanced syntax highlighting for code blocks in terminal UI
 */

import React from 'react';
import { Text, Box } from 'ink';
import type { Root, Element, Text as HastText, ElementContent, RootContent } from 'hast';
import { Colors } from '../colors.js';
import { themes } from '../themes/theme-manager.js';
import { ShowMoreLines } from '../components/ShowMoreLines.js';
import { useTheme } from '../contexts/ThemeContext.js';
import { highlightCode } from './highlighter.js';

/**
 * Theme interface for code colorization
 */
export interface CodeTheme {
  [className: string]: string | undefined;
}

/**
 * Code colorizer props
 */
interface CodeColorizerProps {
  /**
   * Code content to highlight
   */
  code: string;
  
  /**
   * Programming language
   */
  language?: string;
  
  /**
   * Whether to show line numbers
   */
  showLineNumbers?: boolean;
  
  /**
   * Maximum height (lines)
   */
  maxHeight?: number;
  
  /**
   * Maximum width (characters)
   */
  maxWidth?: number;
  
  /**
   * Whether to enable line wrapping
   */
  wrap?: boolean;
}

/**
 * Convert HAST class names to theme colors
 * 
 * Maps syntax highlighting tokens to theme colors
 */
function getColorForToken(className: string, theme: CodeTheme): string | undefined {
  // Extract token type from class name (e.g., "hljs-keyword" -> "keyword")
  const token = className.replace(/^hljs-/, '');
  
  // Map token types to theme color properties
  const tokenToColorMap: Record<string, keyof typeof theme> = {
    keyword: 'keyword',
    built_in: 'builtin',
    type: 'type',
    literal: 'constant',
    number: 'number',
    operator: 'operator',
    punctuation: 'operator',
    property: 'property',
    'class': 'class',
    string: 'string',
    comment: 'comment',
    doctag: 'comment',
    'function': 'function',
    params: 'variable',
    variable: 'variable',
    attr: 'attribute',
    tag: 'tag',
    name: 'tag',
    symbol: 'symbol',
    regexp: 'regex',
    'char': 'string',
    constant: 'constant',
  };
  
  // Get the theme color for this token type
  const colorKey = tokenToColorMap[token];
  return colorKey ? theme[colorKey] : undefined;
}

/**
 * Render HAST node with theme colors
 */
function renderHastNode(
  node: Root | Element | HastText | RootContent,
  theme: CodeTheme,
  inheritedColor?: string
): React.ReactNode {
  // Text nodes just use the inherited color
  if (node.type === 'text') {
    return <Text color={inheritedColor}>{node.value}</Text>;
  }
  
  // Element nodes need color calculation
  if (node.type === 'element') {
    const nodeClasses = (node.properties?.className as string[]) || [];
    let elementColor: string | undefined = undefined;
    
    // Find the appropriate color for this element
    for (let i = nodeClasses.length - 1; i >= 0; i--) {
      const color = getColorForToken(nodeClasses[i], theme);
      if (color) {
        elementColor = color;
        break;
      }
    }
    
    // Use element color or inherited color
    const colorToPassDown = elementColor || inheritedColor;
    
    // Recursively render children
    const children = node.children?.map((child: ElementContent, index: number) => (
      <React.Fragment key={index}>
        {renderHastNode(child, theme, colorToPassDown)}
      </React.Fragment>
    ));
    
    return <React.Fragment>{children}</React.Fragment>;
  }
  
  // Root node starts the recursion
  if (node.type === 'root') {
    if (!node.children || node.children.length === 0) {
      return null;
    }
    
    return node.children?.map((child: RootContent, index: number) => (
      <React.Fragment key={index}>
        {renderHastNode(child, theme, inheritedColor)}
      </React.Fragment>
    ));
  }
  
  // Unknown node types
  return null;
}

/**
 * Code colorizer component
 */
export const CodeColorizer: React.FC<CodeColorizerProps> = ({
  code,
  language,
  showLineNumbers = true,
  maxHeight,
  maxWidth,
  wrap = false,
}) => {
  // Get theme from context
  const { theme } = useTheme();
  
  // Prepare code by removing trailing newline
  const codeToHighlight = code.replace(/\n$/, '');
  
  // Split into lines
  const lines = codeToHighlight.split('\n');
  
  // Calculate padding width for line numbers
  const padWidth = String(lines.length).length;
  
  // Track if content is truncated
  const isTruncated = maxHeight !== undefined && lines.length > maxHeight;
  
  // Truncate lines if maxHeight is specified
  const displayedLines = maxHeight ? lines.slice(0, maxHeight) : lines;
  
  try {
    // Helper function to highlight a single line
    const highlightLine = (line: string) => {
      // Use the simple highlighter
      const highlighted = highlightCode(line, language);
      return highlighted.join('\n');
    };
    
    return (
      <Box flexDirection="column">
        {/* Code with line numbers */}
        {displayedLines.map((line, index) => (
          <Box key={index}>
            {/* Line number */}
            {showLineNumbers && (
              <Box marginRight={1}>
                <Text color={Colors.TextDim}>
                  {String(index + 1).padStart(padWidth, ' ')}
                </Text>
              </Box>
            )}
            
            {/* Highlighted line content */}
            <Text wrap={wrap ? 'wrap' : undefined}>
              {highlightLine(line)}
            </Text>
          </Box>
        ))}
        
        {/* Show "more lines" indicator if truncated */}
        {isTruncated && (
          <Box marginTop={1}>
            <Text color={Colors.TextDim} dimColor>
              {`... ${lines.length - maxHeight} more lines`}
            </Text>
          </Box>
        )}
      </Box>
    );
  } catch (error) {
    // Fallback to plain text with line numbers on error
    return (
      <Box flexDirection="column">
        {displayedLines.map((line, index) => (
          <Box key={index}>
            {/* Line number */}
            {showLineNumbers && (
              <Box marginRight={1}>
                <Text color={Colors.TextDim}>
                  {String(index + 1).padStart(padWidth, ' ')}
                </Text>
              </Box>
            )}
            
            {/* Plain text line */}
            <Text wrap={wrap ? 'wrap' : undefined}>
              {line}
            </Text>
          </Box>
        ))}
        
        {/* Show "more lines" indicator if truncated */}
        {isTruncated && (
          <Box marginTop={1}>
            <Text color={Colors.TextDim} dimColor>
              {`... ${lines.length - maxHeight} more lines`}
            </Text>
          </Box>
        )}
      </Box>
    );
  }
};

/**
 * Colorize code function for use in other components
 */
export function colorizeCode(
  code: string,
  language?: string,
  maxHeight?: number,
  maxWidth?: number,
  showLineNumbers = true,
  wrap = false,
): React.ReactNode {
  return (
    <CodeColorizer
      code={code}
      language={language}
      maxHeight={maxHeight}
      maxWidth={maxWidth}
      showLineNumbers={showLineNumbers}
      wrap={wrap}
    />
  );
}