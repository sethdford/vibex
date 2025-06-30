/**
 * Help Component
 * 
 * Displays available commands and keyboard shortcuts.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors';

/**
 * Command type
 */
export interface Command {
  /**
   * Command name
   */
  name: string;
  
  /**
   * Alternate command name
   */
  altName?: string;
  
  /**
   * Command description
   */
  description: string;
  
  /**
   * Command category
   */
  category?: string;
  
  /**
   * Command action function
   */
  action: (name: string, args: string, rawInput: string) => void;
  
  /**
   * Whether the command is hidden
   */
  hidden?: boolean;
}

/**
 * Help component props
 */
interface HelpProps {
  /**
   * Available commands
   */
  commands: Command[];
}

/**
 * Help component
 */
export const Help: React.FC<HelpProps> = ({ commands }) => {
  // Group commands by category
  const groupedCommands = commands.reduce<Record<string, Command[]>>(
    (acc, command) => {
      if (command.hidden) {
        return acc;
      }
      
      const category = command.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      
      acc[category].push(command);
      return acc;
    },
    {}
  );
  
  // Sort categories for display
  const sortOrder = [
    'General',
    'Conversation',
    'Tools',
    'Memory',
    'Settings',
    'File',
    'System',
  ];
  
  const sortedCategories = Object.keys(groupedCommands).sort(
    (a, b) => {
      const aIndex = sortOrder.indexOf(a);
      const bIndex = sortOrder.indexOf(b);
      
      if (aIndex === -1 && bIndex === -1) {
        return a.localeCompare(b);
      }
      
      if (aIndex === -1) {
        return 1;
      }
      
      if (bIndex === -1) {
        return -1;
      }
      
      return aIndex - bIndex;
    }
  );
  
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={Colors.Primary}
      paddingX={1}
      paddingY={0}
      marginY={1}
    >
      <Box marginBottom={1}>
        <Text bold color={Colors.Primary}>
          Available Commands
        </Text>
      </Box>
      
      {sortedCategories.map((category) => (
        <Box key={category} flexDirection="column" marginBottom={1}>
          <Text bold underline>
            {category}
          </Text>
          
          {groupedCommands[category].map((command) => (
            <Box key={command.name}>
              <Box width={20}>
                <Text bold color={Colors.Info}>
                  /{command.name}
                  {command.altName && <Text> (/{command.altName})</Text>}
                </Text>
              </Box>
              
              <Box>
                <Text>
                  {command.description}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      ))}
      
      <Box flexDirection="column" marginTop={1}>
        <Text bold underline>
          Keyboard Shortcuts
        </Text>
        
        <Box>
          <Box width={20}>
            <Text bold color={Colors.Info}>
              Ctrl+C
            </Text>
          </Box>
          <Box>
            <Text>Exit Claude Code (press twice)</Text>
          </Box>
        </Box>
        
        <Box>
          <Box width={20}>
            <Text bold color={Colors.Info}>
              Ctrl+D
            </Text>
          </Box>
          <Box>
            <Text>Exit Claude Code (press twice)</Text>
          </Box>
        </Box>
        
        <Box>
          <Box width={20}>
            <Text bold color={Colors.Info}>
              Ctrl+L
            </Text>
          </Box>
          <Box>
            <Text>Clear the screen</Text>
          </Box>
        </Box>
        
        <Box>
          <Box width={20}>
            <Text bold color={Colors.Info}>
              Ctrl+O
            </Text>
          </Box>
          <Box>
            <Text>Toggle error details</Text>
          </Box>
        </Box>
        
        <Box>
          <Box width={20}>
            <Text bold color={Colors.Info}>
              Ctrl+T
            </Text>
          </Box>
          <Box>
            <Text>Toggle tool descriptions</Text>
          </Box>
        </Box>
        
        <Box>
          <Box width={20}>
            <Text bold color={Colors.Info}>
              Ctrl+S
            </Text>
          </Box>
          <Box>
            <Text>Show all content (disable height constraints)</Text>
          </Box>
        </Box>
        
        <Box>
          <Box width={20}>
            <Text bold color={Colors.Info}>
              ↑/↓
            </Text>
          </Box>
          <Box>
            <Text>Navigate through command history</Text>
          </Box>
        </Box>
        
        <Box>
          <Box width={20}>
            <Text bold color={Colors.Info}>
              Tab
            </Text>
          </Box>
          <Box>
            <Text>Autocomplete commands and file paths</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};