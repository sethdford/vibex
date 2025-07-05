/**
 * Streaming Text Component
 * 
 * Renders text with a typewriter-like streaming effect.
 */

import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { Colors } from '../colors.js';

/**
 * Streaming text props
 */
interface StreamingTextProps {
  /**
   * Text content to render
   */
  text: string;
  
  /**
   * Whether the content is actively streaming
   */
  isStreaming: boolean;
  
  /**
   * Characters per second to render (speed)
   */
  charsPerSecond?: number;
  
  /**
   * Whether to preserve whitespace
   */
  preserveWhitespace?: boolean;
  
  /**
   * Custom color for the text
   */
  color?: string;
  
  /**
   * Callback when streaming completes
   */
  onComplete?: () => void;
}

/**
 * Streaming text component
 */
export const StreamingText: React.FC<StreamingTextProps> = ({
  text,
  isStreaming,
  charsPerSecond = 40, // Default speed: 40 characters per second
  preserveWhitespace = true,
  color,
  onComplete,
}) => {
  // Current visible portion of the text
  const [visibleText, setVisibleText] = useState<string>('');
  
  // Cursor position
  const [cursorPos, setCursorPos] = useState<number>(0);
  
  // Streaming effect
  useEffect(() => {
    // Reset when text changes
    if (!isStreaming) {
      setVisibleText(text);
      setCursorPos(text.length);
      return;
    }
    
    // If streaming has just started, reset
    if (cursorPos === 0) {
      setVisibleText('');
    }
    
    // If we've reached the end of the text, call onComplete
    if (cursorPos >= text.length) {
      if (onComplete) {
        onComplete();
      }
      return;
    }
    
    // Calculate interval based on characters per second
    const interval = 1000 / charsPerSecond;
    
    // Start streaming timer
    const timer = setTimeout(() => {
      const nextPos = Math.min(cursorPos + 1, text.length);
      const nextVisibleText = text.substring(0, nextPos);
      
      setVisibleText(nextVisibleText);
      setCursorPos(nextPos);
    }, interval);
    
    // Clean up timer
    return () => clearTimeout(timer);
  }, [text, isStreaming, cursorPos, charsPerSecond, onComplete]);
  
  // Reset when text changes completely
  useEffect(() => {
    // If not streaming, show full text immediately
    if (!isStreaming) {
      setVisibleText(text);
      setCursorPos(text.length);
      return;
    }
    
    // If text has changed, reset cursor position
    setVisibleText('');
    setCursorPos(0);
  }, [text, isStreaming]);
  
  return (
    <Text 
      color={color} 
      wrap={preserveWhitespace ? "wrap" : "wrap"}
    >
      {visibleText}
      {isStreaming && cursorPos < text.length && (
        <Text color={Colors.Primary}>▌</Text>
      )}
    </Text>
  );
};