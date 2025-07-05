/**
 * Header Component
 * 
 * Displays the application header with branding and version information.
 */

import React from 'react';
import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import { Colors } from '../colors.js';
import { getLogoForWidth, standardLogo } from './AsciiLogo.js';
import { version } from '../../version.js';

/**
 * Header component props
 */
interface HeaderProps {
  /**
   * Width of the terminal
   */
  terminalWidth: number;
  
  /**
   * Custom gradient colors
   */
  gradientColors?: string[];
}

/**
 * Header component for the application
 */
export const Header: React.FC<HeaderProps> = ({ 
  terminalWidth,
  gradientColors = ['cyan', 'magenta', 'blue'] 
}) => {
  // Calculate if we should show full header based on terminal width
  const showFullHeader = terminalWidth > 60;
  
  return (
    <Box flexDirection="column">
      {showFullHeader ? (
        // Full header with ASCII art for larger terminals
        <Box flexDirection="column">
          <Gradient colors={gradientColors}>
            <Text>{getLogoForWidth(terminalWidth)}</Text>
          </Gradient>
          <Box justifyContent="flex-end">
            <Text color={Colors.TextDim}>
              Version {version} • Your AI development orchestration system
            </Text>
          </Box>
        </Box>
      ) : (
        // Compact header for smaller terminals
        <Box flexDirection="column">
          <Gradient colors={gradientColors}>
            <Text bold>VIBEX</Text>
          </Gradient>
          <Box>
            <Text color={Colors.TextDim}> v{version}</Text>
          </Box>
        </Box>
      )}
      <Box>
        <Text>
          Type <Text color={Colors.Info}>/help</Text> to see available commands or start developing with AI.
        </Text>
      </Box>
    </Box>
  );
};