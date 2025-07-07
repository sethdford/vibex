/**
 * Markdown Streaming Display Component
 * 
 * Handles markdown rendering with syntax highlighting
 * Following Gemini CLI patterns - single responsibility, focused component
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Colors } from '../../colors.js';
import { highlightCode } from '../../utils/highlighter.js';
import type { BaseStreamingProps } from '../shared/streaming-types.js';

export interface MarkdownStreamingDisplayProps extends BaseStreamingProps {
  /** Text content to display */
  content: string;
  /** Whether content is actively streaming */
  isStreaming: boolean;
  /** Typewriter effect speed (characters per second) */
  charsPerSecond?: number;
  /** Whether to show cursor during streaming */
  showCursor?: boolean;
  /** Enable syntax highlighting for code blocks */
  enableSyntaxHighlighting?: boolean;
  /** Show loading indicator */
  showLoadingIndicator?: boolean;
  /** Loading message */
  loadingMessage?: string;
  /** Callback when streaming completes */
  onComplete?: () => void;
}

/**
 * Markdown streaming display component with syntax highlighting
 */
export const MarkdownStreamingDisplay: React.FC<MarkdownStreamingDisplayProps> = ({
  content,
  isStreaming,
  charsPerSecond = 40,
  showCursor = true,
  enableSyntaxHighlighting = true,
  showLoadingIndicator = true,
  loadingMessage = 'Processing...',
  theme = {
    thinking: Colors.AccentPurple,
    response: Colors.Text,
    accent: Colors.AccentBlue,
    muted: Colors.TextMuted,
    error: Colors.Error,
    success: Colors.Success,
    warning: Colors.Warning
  },
  onComplete
}) => {
  // Streaming state
  const [visibleText, setVisibleText] = useState<string>('');
  const [cursorPos, setCursorPos] = useState<number>(0);
  
  // Refs
  const contentRef = useRef(content);
  const isCompleteRef = useRef(false);
  
  // Update content reference
  useEffect(() => {
    contentRef.current = content;
    
    // Reset if content changed
    if (isCompleteRef.current && content !== visibleText) {
      setCursorPos(0);
      setVisibleText('');
      isCompleteRef.current = false;
    }
  }, [content, visibleText]);
  
  // Typewriter effect
  useEffect(() => {
    if (!isStreaming || isCompleteRef.current) {
      if (!isStreaming) {
        setVisibleText(content);
        setCursorPos(content.length);
        isCompleteRef.current = true;
        if (onComplete) onComplete();
      }
      return;
    }
    
    if (cursorPos >= contentRef.current.length) {
      setVisibleText(contentRef.current);
      isCompleteRef.current = true;
      if (onComplete) onComplete();
      return;
    }
    
    const interval = 1000 / charsPerSecond;
    const timer = setTimeout(() => {
      const nextPos = Math.min(cursorPos + 1, contentRef.current.length);
      const nextVisibleText = contentRef.current.substring(0, nextPos);
      
      setVisibleText(nextVisibleText);
      setCursorPos(nextPos);
    }, interval);
    
    return () => clearTimeout(timer);
  }, [content, isStreaming, cursorPos, charsPerSecond, onComplete]);
  
  if (!visibleText) return null;
  
  // Split content into regular text and code blocks
  const parts = visibleText.split(/(```[\s\S]*?```)/g);
  
  return (
    <Box flexDirection="column">
      {parts.map((part, index) => {
        // Check if this part is a code block
        if (part.startsWith('```') && part.endsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          if (!match) {
            return <Text key={index}>{part}</Text>;
          }
          
          const [, language, code] = match;
          
          if (enableSyntaxHighlighting) {
            return (
              <Box key={index} flexDirection="column" marginY={1}>
                <Box paddingX={1}>
                  <Text color={theme.muted}>{language || 'code'}</Text>
                </Box>
                <Box paddingX={1} paddingY={1} flexDirection="column">
                  {highlightCode(code, language).map((line: string, lineIndex: number) => (
                    <Text key={lineIndex} color={theme.response}>
                      {line}
                    </Text>
                  ))}
                </Box>
              </Box>
            );
          } else {
            return (
              <Box key={index} flexDirection="column" marginY={1}>
                <Box paddingX={1}>
                  <Text color={theme.muted}>{code}</Text>
                </Box>
              </Box>
            );
          }
        }
        
        // Process basic markdown formatting
        const formattedParts: React.ReactNode[] = [];
        let lastIndex = 0;
        
        const boldRegex = /\*\*(.*?)\*\*/g;
        let boldMatch;
        while ((boldMatch = boldRegex.exec(part)) !== null) {
          if (boldMatch.index > lastIndex) {
            formattedParts.push(
              <Text key={`text-${formattedParts.length}`}>
                {part.substring(lastIndex, boldMatch.index)}
              </Text>
            );
          }
          
          formattedParts.push(
            <Text key={`bold-${formattedParts.length}`} bold>
              {boldMatch[1]}
            </Text>
          );
          
          lastIndex = boldMatch.index + boldMatch[0].length;
        }
        
        if (lastIndex < part.length) {
          formattedParts.push(
            <Text key={`text-${formattedParts.length}`}>
              {part.substring(lastIndex)}
            </Text>
          );
        }
        
        return <Box key={index}>{formattedParts.length > 0 ? formattedParts : <Text>{String(part)}</Text>}</Box>;
      })}
      
      {isStreaming && showLoadingIndicator && !isCompleteRef.current && (
        <Box marginTop={1}>
          <Text color={theme.accent}>
            <Spinner type="dots" />
            <Text> {loadingMessage}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default MarkdownStreamingDisplay; 