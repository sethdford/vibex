/**
 * Basic Streaming Text Component
 * 
 * Handles simple typewriter effect with cursor
 * Following Gemini CLI patterns - single responsibility, focused component
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Colors } from '../../colors.js';
import type { BaseStreamingProps } from './streaming-types.js';

export interface BasicStreamingTextProps extends BaseStreamingProps {
  /** Text content to display */
  content: string;
  /** Whether content is actively streaming */
  isStreaming: boolean;
  /** Typewriter effect speed (characters per second) */
  charsPerSecond?: number;
  /** Whether to show cursor during streaming */
  showCursor?: boolean;
  /** Whether to preserve whitespace */
  preserveWhitespace?: boolean;
  /** Custom color for text */
  textColor?: string;
  /** Show loading indicator */
  showLoadingIndicator?: boolean;
  /** Loading message */
  loadingMessage?: string;
  /** Callback when streaming completes */
  onComplete?: () => void;
}

/**
 * Basic streaming text component with typewriter effect
 */
export const BasicStreamingText: React.FC<BasicStreamingTextProps> = ({
  content,
  isStreaming,
  charsPerSecond = 40,
  showCursor = true,
  preserveWhitespace = true,
  textColor = Colors.Text,
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
  
  return (
    <Box flexDirection="column">
      <Text color={textColor} wrap={preserveWhitespace ? "wrap" : "wrap"}>
        {visibleText}
        {isStreaming && showCursor && cursorPos < content.length && (
          <Text color={theme.accent}>▌</Text>
        )}
      </Text>
      
      {isStreaming && showLoadingIndicator && (
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

export default BasicStreamingText; 