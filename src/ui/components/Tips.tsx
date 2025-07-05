/**
 * Tips Component
 * 
 * Displays helpful tips to users in the terminal interface
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

/**
 * Tips data
 */
export const tipsList = [
  {
    id: 'shortcut_ctrl_h',
    text: 'Press Ctrl+H to view keyboard shortcuts',
    category: 'shortcuts',
    priority: 'high',
  },
  {
    id: 'shortcut_ctrl_c',
    text: 'Press Ctrl+C twice to exit the application',
    category: 'shortcuts',
    priority: 'high',
  },
  {
    id: 'shortcut_ctrl_o',
    text: 'Press Ctrl+O to toggle error details',
    category: 'shortcuts',
    priority: 'medium',
  },
  {
    id: 'shortcut_ctrl_l',
    text: 'Press Ctrl+L to clear the screen',
    category: 'shortcuts',
    priority: 'medium',
  },
  {
    id: 'shortcut_ctrl_t',
    text: 'Press Ctrl+T to toggle tool descriptions',
    category: 'shortcuts',
    priority: 'medium',
  },
  {
    id: 'shortcut_ctrl_comma',
    text: 'Press Ctrl+, to open settings',
    category: 'shortcuts',
    priority: 'medium',
  },
  {
    id: 'shortcut_ctrl_y',
    text: 'Press Ctrl+Y to copy the last response',
    category: 'clipboard',
    priority: 'medium',
  },
  {
    id: 'command_theme',
    text: 'Type /theme to change the color theme',
    category: 'commands',
    priority: 'medium',
  },
  {
    id: 'command_help',
    text: 'Type /help to see available commands',
    category: 'commands',
    priority: 'high',
  },
  {
    id: 'command_clear',
    text: 'Type /clear to clear the conversation history',
    category: 'commands',
    priority: 'medium',
  },
  {
    id: 'feature_images',
    text: 'You can include image files by using Markdown syntax: ![description](path/to/image.png)',
    category: 'features',
    priority: 'medium',
  },
  {
    id: 'feature_clipboard',
    text: 'Copy text from any response using the clipboard icon or keyboard shortcut',
    category: 'features',
    priority: 'medium',
  },
];

/**
 * Tip props interface
 */
interface TipsProps {
  /**
   * Categories to show (defaults to all)
   */
  categories?: string[];
  
  /**
   * How often to rotate tips (in milliseconds)
   */
  rotateInterval?: number;
  
  /**
   * Minimum priority level to show
   */
  minPriority?: 'low' | 'medium' | 'high';
  
  /**
   * Maximum width for the tips box
   */
  maxWidth?: number;
  
  /**
   * Whether to cycle through tips automatically
   */
  autoCycle?: boolean;
  
  /**
   * Whether tips are enabled
   */
  enabled?: boolean;
  
  /**
   * Callback when tip is dismissed
   */
  onDismiss?: (tipId: string) => void;
}

/**
 * Get priority value for sorting
 */
function getPriorityValue(priority: string): number {
  switch (priority) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

/**
 * Tips component
 */
export const Tips: React.FC<TipsProps> = ({
  categories = [],
  rotateInterval = 20000, // 20 seconds
  minPriority = 'medium',
  maxWidth = 60,
  autoCycle = true,
  enabled = true,
  onDismiss,
}) => {
  // Skip rendering if disabled
  if (!enabled) {
    return null;
  }
  
  // Filter tips by category and priority
  const minPriorityValue = getPriorityValue(minPriority);
  const filteredTips = tipsList.filter(tip => {
    // Filter by priority
    const priorityValue = getPriorityValue(tip.priority);
    if (priorityValue < minPriorityValue) {
      return false;
    }
    
    // Filter by category if specified
    if (categories.length > 0) {
      return categories.includes(tip.category);
    }
    
    return true;
  });
  
  // State for current tip index
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(true);
  
  // Handle auto cycling of tips
  useEffect(() => {
    if (!autoCycle || filteredTips.length <= 1) {
      return;
    }
    
    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % filteredTips.length);
    }, rotateInterval);
    
    return () => clearInterval(interval);
  }, [autoCycle, filteredTips.length, rotateInterval]);
  
  // Get current tip
  const currentTip = filteredTips[currentTipIndex];
  
  // If no tips match the criteria, don't render anything
  if (!currentTip || !visible) {
    return null;
  }
  
  // Handle dismissal
  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) {
      onDismiss(currentTip.id);
    }
  };
  
  return (
    <Box 
      borderStyle="round" 
      borderColor={Colors.Info} 
      width={maxWidth} 
      padding={1}
    >
      <Box flexDirection="column">
        <Box>
          <Text color={Colors.Info} bold>TIP: </Text>
          <Text>{currentTip.text}</Text>
        </Box>
        
        {filteredTips.length > 1 && (
          <Box marginTop={1} justifyContent="space-between">
            <Text color={Colors.TextDim} dimColor>
              {`Tip ${currentTipIndex + 1}/${filteredTips.length}`}
            </Text>
            <Text color={Colors.TextDim} dimColor>
              Press D to dismiss
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};