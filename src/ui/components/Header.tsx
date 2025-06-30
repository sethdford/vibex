/**
 * Header Component
 * 
 * Displays the application header with branding and version information.
 */

import React from 'react';
import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import { Colors } from '../colors';

/**
 * Header component props
 */
interface HeaderProps {
  /**
   * Width of the terminal
   */
  terminalWidth: number;
}

/**
 * Header component for the application
 */
export const Header: React.FC<HeaderProps> = ({ terminalWidth }) => {
  // Calculate if we should show full header based on terminal width
  const showFullHeader = terminalWidth > 60;
  
  // Get package version
  const version = '0.1.0'; // This should be dynamically loaded from package.json
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      {showFullHeader ? (
        // Full header for larger terminals
        <Box flexDirection="column" alignItems="center">
          <Gradient name="mind">
            <BigText text="Claude Code" font="simple" />
          </Gradient>
          <Box justifyContent="center" marginY={1}>
            <Text color={Colors.TextDim}>
              Version {version} • Your AI coding assistant in the terminal
            </Text>
          </Box>
        </Box>
      ) : (
        // Compact header for smaller terminals
        <Box flexDirection="column">
          <Box>
            <Text bold color={Colors.Primary}>Claude Code</Text>
            <Text color={Colors.TextDim}> v{version}</Text>
          </Box>
        </Box>
      )}
      <Box marginY={1}>
        <Text>
          Type <Text color={Colors.Info}>/help</Text> to see available commands or ask me anything about your code.
        </Text>
      </Box>
    </Box>
  );
};