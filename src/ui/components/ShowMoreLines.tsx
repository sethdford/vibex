/**
 * Advanced Show More Lines Component
 * 
 * Implements Gemini CLI's sophisticated overflow indication with interactive controls
 */

import React, { useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { useOverflow } from '../contexts/OverflowContext.js';

/**
 * Show more lines component props
 */
interface ShowMoreLinesProps {
  /**
   * Whether height is constrained
   */
  constrainHeight: boolean;
  
  /**
   * Whether the component is focused and can handle input
   */
  isFocused?: boolean;
  
  /**
   * Custom message for overflow indication
   */
  customMessage?: string;
  
  /**
   * Whether to show keyboard shortcuts
   */
  showShortcuts?: boolean;
}

/**
 * Advanced show more lines component with Gemini CLI's interactive controls
 */
export const ShowMoreLines: React.FC<ShowMoreLinesProps> = ({ 
  constrainHeight,
  isFocused = false,
  customMessage,
  showShortcuts = true,
}) => {
  const { 
    hasOverflow, 
    hiddenLineCount, 
    totalContentHeight,
    availableHeight,
    showAllContent,
    resetToConstrained,
    toggleConstrainHeight 
  } = useOverflow();
  
  // Handle keyboard input
  useInput(
    useCallback((input, key) => {
      if (!isFocused) return;
      
      // Ctrl+S to show all content
      if (key.ctrl && input === 's') {
        showAllContent();
        return;
      }
      
      // Ctrl+H to toggle height constraints
      if (key.ctrl && input === 'h') {
        toggleConstrainHeight();
        return;
      }
      
      // Escape to reset to constrained view
      if (key.escape) {
        resetToConstrained();
        return;
      }
    }, [isFocused, showAllContent, toggleConstrainHeight, resetToConstrained])
  );
  
  // Don't show if no overflow, not constraining height, or no hidden lines
  if (!hasOverflow || !constrainHeight || hiddenLineCount <= 0) {
    return null;
  }
  
  // Calculate overflow percentage
  const overflowPercentage = Math.round((hiddenLineCount / totalContentHeight) * 100);
  
  // Default message based on Gemini CLI's pattern
  const defaultMessage = `${hiddenLineCount} more line${hiddenLineCount !== 1 ? 's' : ''} hidden (${overflowPercentage}% of content)`;
  const displayMessage = customMessage || defaultMessage;
  
  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Primary overflow message */}
      <Box>
        <Text color={Colors.TextDim}>
          {displayMessage}
        </Text>
      </Box>
      
      {/* Keyboard shortcuts */}
      {showShortcuts && (
        <Box marginTop={0}>
          <Text color={Colors.TextDim} dimColor>
            {isFocused ? (
              <>
                Press <Text bold color={Colors.Primary}>Ctrl+S</Text> to show all, {' '}
                <Text bold color={Colors.Primary}>Ctrl+H</Text> to toggle constraints
              </>
            ) : (
              'Focus this area for keyboard controls'
            )}
          </Text>
        </Box>
      )}
      
      {/* Content summary */}
      <Box marginTop={0}>
        <Text color={Colors.TextDim} dimColor>
          Showing {availableHeight} of {totalContentHeight} lines
        </Text>
      </Box>
    </Box>
  );
};