/**
 * Thought Display Component
 * 
 * Displays AI thinking process in real-time with proper formatting and visual separation.
 * Shows the AI's reasoning, planning, and analysis during response generation.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

interface ThoughtSummary {
  /** The thought content */
  content: string;
  /** When the thought was generated */
  timestamp: Date;
}

interface ThoughtDisplayProps {
  /**
   * Current thought to display
   */
  thought: ThoughtSummary | null;
  
  /**
   * Whether to show the thought
   */
  show: boolean;
  
  /**
   * Whether to animate the thinking dots
   */
  animate?: boolean;
  
  /**
   * Animation style for thinking indicator
   */
  animationStyle?: 'dots' | 'spinner' | 'pulse';
  
  /**
   * Available height for display
   */
  maxHeight?: number;
  
  /**
   * Maximum width
   */
  maxWidth?: number;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
}

/**
 * Component for displaying the AI's thought process
 */
export const ThoughtDisplay: React.FC<ThoughtDisplayProps> = ({ 
  thought,
  show,
  animate = true,
  animationStyle = 'dots',
  maxHeight = 10,
  maxWidth = 100,
  isFocused = true
}) => {
  const [displayText, setDisplayText] = useState<string>('');
  const [thinking, setThinking] = useState(false);
  const [frame, setFrame] = useState(0);
  
  // Update display text when thought changes
  useEffect(() => {
    if (thought && show) {
      setDisplayText(thought.content);
      setThinking(true);
    } else {
      setThinking(false);
    }
  }, [thought, show]);
  
  // Thinking animation
  useEffect(() => {
    if (!animate || !thinking) return;
    
    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % 4);
    }, 250);
    
    return () => clearInterval(interval);
  }, [animate, thinking]);

  if (!thinking || !displayText) {
    return null;
  }
  
  // Format animation based on style
  const getAnimationIndicator = () => {
    if (animationStyle === 'dots') {
      return '.'.repeat((frame % 3) + 1);
    }
    
    if (animationStyle === 'spinner') {
      const spinChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      return spinChars[frame % spinChars.length];
    }
    
    // Pulse style
    const pulseChars = ['▮', '▯'];
    return pulseChars[frame % 2];
  };

  const animationIndicator = getAnimationIndicator();
  
  // Process thought text for display (truncate if needed)
  const prepareDisplayText = () => {
    if (!maxHeight || !maxWidth) return displayText;
    
    // Simple truncation for now - could be more sophisticated
    const lines = displayText.split('\n');
    if (lines.length > maxHeight - 2) {
      return [...lines.slice(0, maxHeight - 3), '...'].join('\n');
    }
    
    return displayText;
  };

  return (
    <Box 
      flexDirection="column" 
      borderStyle="round" 
      borderColor={Colors.Gray600} 
      padding={1}
    >
      <Box marginBottom={1}>
        <Text color={Colors.AccentPurple} bold>
          Thinking{animate ? animationIndicator : ''}
        </Text>
      </Box>
      <Box>
        <Text color={Colors.TextDim} wrap="wrap">
          {prepareDisplayText()}
        </Text>
      </Box>
    </Box>
  );
};

export default ThoughtDisplay;