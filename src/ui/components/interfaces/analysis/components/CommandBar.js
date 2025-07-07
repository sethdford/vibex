/**
 * Command Bar Component
 * 
 * Displays available keyboard commands in a horizontal bar at the bottom of the interface.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../../../colors.js';

/**
 * Command interface
 * @typedef {Object} Command
 * @property {string} key - Key or key combination
 * @property {string} label - Command description
 * @property {boolean} [isEnabled=true] - Whether the command is currently enabled
 * @property {Function} [action] - Action to perform when command is invoked
 */

/**
 * CommandBar props
 * @typedef {Object} CommandBarProps
 * @property {Command[]} commands - List of available commands
 * @property {number} width - Available width for the component
 * @property {string} [backgroundColor] - Optional background color
 */

/**
 * CommandBar component
 * 
 * @param {CommandBarProps} props - Component props
 * @returns {React.Element} Command bar component
 */
export const CommandBar = ({ 
  commands,
  width,
  backgroundColor = Colors.BackgroundAlt
}) => {
  return (
    <Box 
      width={width} 
      height={2}
      backgroundColor={backgroundColor}
      borderStyle="single"
      borderColor={Colors.Border}
      alignItems="center"
      paddingX={1}
    >
      {commands.map((command, index) => (
        <React.Fragment key={command.key}>
          {index > 0 && (
            <Text color={Colors.Border} marginX={1}>|</Text>
          )}
          
          <Box>
            <Text 
              bold
              color={command.isEnabled ? Colors.Primary : Colors.TextDim}
              dimColor={!command.isEnabled}
            >
              {command.key}
            </Text>
            <Text
              color={command.isEnabled ? Colors.Text : Colors.TextDim}
              dimColor={!command.isEnabled}
              marginLeft={1}
            >
              {command.label}
            </Text>
          </Box>
        </React.Fragment>
      ))}
    </Box>
  );
};

export default CommandBar;