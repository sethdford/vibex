/**
 * Clipboard Actions Component
 * 
 * Provides copy/paste functionality for text content
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { useClipboard } from '../hooks/useClipboard';
import { Colors } from '../colors';

/**
 * Clipboard actions props
 */
interface ClipboardActionsProps {
  /**
   * Text content to be copied
   */
  content: string;
  
  /**
   * Whether to show paste action
   */
  showPaste?: boolean;
  
  /**
   * Callback when paste is performed
   */
  onPaste?: (text: string) => void;
  
  /**
   * Style for the container box
   */
  boxStyle?: React.ComponentProps<typeof Box>;
  
  /**
   * Whether the component is focused to accept keyboard input
   */
  isFocused?: boolean;
}

/**
 * Clipboard actions component
 */
export const ClipboardActions: React.FC<ClipboardActionsProps> = ({
  content,
  showPaste = false,
  onPaste,
  boxStyle,
  isFocused = true,
}) => {
  // Clipboard state
  const { copyToClipboard, pasteFromClipboard, error, isLoading } = useClipboard();
  
  // Status message state
  const [status, setStatus] = useState<{ message: string; isError: boolean } | null>(null);
  
  // Clear status after a delay
  const clearStatusAfterDelay = useCallback(() => {
    setTimeout(() => {
      setStatus(null);
    }, 3000);
  }, []);
  
  // Handle copy action
  const handleCopy = useCallback(async () => {
    setStatus(null);
    
    if (isLoading) return;
    if (!content) {
      setStatus({ message: 'Nothing to copy', isError: true });
      clearStatusAfterDelay();
      return;
    }
    
    const success = await copyToClipboard(content);
    
    if (success) {
      setStatus({ message: 'Copied to clipboard', isError: false });
    } else {
      setStatus({ message: `Failed to copy: ${error || 'Unknown error'}`, isError: true });
    }
    
    clearStatusAfterDelay();
  }, [content, copyToClipboard, error, isLoading, clearStatusAfterDelay]);
  
  // Handle paste action
  const handlePaste = useCallback(async () => {
    setStatus(null);
    
    if (isLoading || !onPaste) return;
    
    const text = await pasteFromClipboard();
    
    if (text) {
      onPaste(text);
      setStatus({ message: 'Pasted from clipboard', isError: false });
    } else {
      setStatus({ message: `Failed to paste: ${error || 'Empty clipboard'}`, isError: true });
    }
    
    clearStatusAfterDelay();
  }, [pasteFromClipboard, error, isLoading, onPaste, clearStatusAfterDelay]);
  
  // Register keyboard handler
  React.useEffect(() => {
    if (!isFocused) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Copy: Ctrl+C (only when content is selected, not as interrupt)
      if (e.ctrlKey && e.key === 'c' && window.getSelection()?.toString()) {
        handleCopy();
        e.preventDefault();
      }
      
      // Paste: Ctrl+V
      if (e.ctrlKey && e.key === 'v' && showPaste) {
        handlePaste();
        e.preventDefault();
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isFocused, handleCopy, handlePaste, showPaste]);
  
  return (
    <Box {...boxStyle}>
      <Box marginRight={2}>
        <Text>
          <Text color={Colors.Info} dimColor>Press </Text>
          <Text color={Colors.Primary} bold>Ctrl+C</Text>
          <Text color={Colors.Info} dimColor> to copy</Text>
        </Text>
      </Box>
      
      {showPaste && (
        <Box marginRight={2}>
          <Text>
            <Text color={Colors.Info} dimColor>Press </Text>
            <Text color={Colors.Primary} bold>Ctrl+V</Text>
            <Text color={Colors.Info} dimColor> to paste</Text>
          </Text>
        </Box>
      )}
      
      {status && (
        <Box marginLeft={2}>
          <Text color={status.isError ? Colors.Error : Colors.Success}>
            {status.message}
          </Text>
        </Box>
      )}
    </Box>
  );
};