/**
 * SlashCommand Bar Component
 * 
 * Displays available slash commands in an elegant interactive bar
 * with keyboard shortcuts, visual hints, autocomplete suggestions,
 * and contextual help.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

export interface SlashCommand {
  /**
   * Unique command identifier
   */
  id: string;
  
  /**
   * Command name (without the /)
   */
  name: string;
  
  /**
   * Command description
   */
  description: string;
  
  /**
   * Keyboard shortcut for the command
   */
  shortcut?: string;
  
  /**
   * Icon to display with the command
   */
  icon?: string;
  
  /**
   * Category for grouping commands
   */
  category?: string;
  
  /**
   * Whether to hide from command bar
   */
  hidden?: boolean;
  
  /**
   * Example usage of the command
   */
  example?: string;
  
  /**
   * Additional details about the command
   */
  details?: string;
  
  /**
   * Command arguments
   */
  args?: Array<{
    name: string;
    description: string;
    required?: boolean;
    values?: string[];
  }>;
  
  /**
   * Whether the command is featured (prioritized in display)
   */
  featured?: boolean;
  
  /**
   * Action to execute when the command is selected
   */
  action?: (commandName: string, args?: string) => void;
}

interface SlashCommandBarProps {
  /**
   * List of available commands
   */
  commands: SlashCommand[];
  
  /**
   * Currently active command ID
   */
  activeCommandId?: string;
  
  /**
   * Whether to show in compact mode
   */
  compact?: boolean;
  
  /**
   * Width of terminal for responsive layout
   */
  terminalWidth?: number;
  
  /**
   * Maximum number of visible commands
   */
  maxVisible?: number;
  
  /**
   * Callback when a command is selected
   */
  onSelect?: (commandId: string) => void;
  
  /**
   * Current input text (for autocomplete)
   */
  inputText?: string;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when a command is highlighted
   */
  onHighlight?: (commandId: string) => void;
  
  /**
   * Whether to show detailed help for commands
   */
  showDetailedHelp?: boolean;
}

/**
 * Interactive slash command toolbar with autocomplete and contextual help
 */
export const SlashCommandBar: React.FC<SlashCommandBarProps> = ({
  commands,
  activeCommandId,
  compact = false,
  terminalWidth = 80,
  maxVisible = 6,
  onSelect,
  inputText = '',
  isFocused = false,
  onHighlight,
  showDetailedHelp = false
}) => {
  // State for keyboard navigation
  const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
  const [isHelpExpanded, setIsHelpExpanded] = React.useState<boolean>(false);
  
  // Determine relevant commands based on input text (for autocomplete)
  const relevantCommands = React.useMemo(() => {
    // If input starts with a slash, filter commands by name
    if (inputText && inputText.startsWith('/')) {
      const searchText = inputText.slice(1).toLowerCase();
      return commands
        .filter(cmd => !cmd.hidden && cmd.name.toLowerCase().includes(searchText))
        .sort((a, b) => {
          // Exact matches first
          if (a.name.toLowerCase() === searchText) return -1;
          if (b.name.toLowerCase() === searchText) return 1;
          
          // Then starts with matches
          const aStartsWith = a.name.toLowerCase().startsWith(searchText);
          const bStartsWith = b.name.toLowerCase().startsWith(searchText);
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          
          // Then featured commands
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          
          // Finally alphabetical
          return a.name.localeCompare(b.name);
        });
    }
    
    // Otherwise, filter out hidden commands
    return commands.filter(cmd => !cmd.hidden);
  }, [commands, inputText]);

  // If compact mode or small terminal, show fewer commands
  const showMaxCommands = terminalWidth < 60 ? 3 : 
                         terminalWidth < 80 ? 4 : 
                         maxVisible;
  
  // Select commands to show (prioritize active command)
  let commandsToShow = relevantCommands;
  if (relevantCommands.length > showMaxCommands) {
    if (activeCommandId) {
      const activeIndex = relevantCommands.findIndex(cmd => cmd.id === activeCommandId);
      if (activeIndex !== -1) {
        const startIndex = Math.max(0, Math.min(
          activeIndex - Math.floor(showMaxCommands / 2),
          relevantCommands.length - showMaxCommands
        ));
        commandsToShow = relevantCommands.slice(startIndex, startIndex + showMaxCommands);
      } else {
        commandsToShow = relevantCommands.slice(0, showMaxCommands);
      }
    } else {
      commandsToShow = relevantCommands.slice(0, showMaxCommands);
    }
  }
  
  // Handle keyboard navigation
  React.useEffect(() => {
    if (!isFocused) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setSelectedIndex(prev => Math.max(0, prev - 1));
          if (onHighlight && commandsToShow[Math.max(0, selectedIndex - 1)]) {
            onHighlight(commandsToShow[Math.max(0, selectedIndex - 1)].id);
          }
          break;
          
        case 'ArrowDown':
          setSelectedIndex(prev => Math.min(commandsToShow.length - 1, prev + 1));
          if (onHighlight && commandsToShow[Math.min(commandsToShow.length - 1, selectedIndex + 1)]) {
            onHighlight(commandsToShow[Math.min(commandsToShow.length - 1, selectedIndex + 1)].id);
          }
          break;
          
        case 'Enter':
        case 'Tab':
          if (onSelect && commandsToShow[selectedIndex]) {
            onSelect(commandsToShow[selectedIndex].id);
          }
          break;
          
        case '?':
          // Toggle detailed help
          setIsHelpExpanded(prev => !prev);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFocused, commandsToShow, selectedIndex, onHighlight, onSelect]);

  return (
    <Box flexDirection="column">
      <Box 
        borderStyle={compact ? undefined : "round"} 
        borderColor={isFocused ? Colors.Primary : Colors.Gray700}
        paddingX={compact ? 0 : 1}
        paddingY={compact ? 0 : 1}
        marginY={compact ? 0 : 1}
      >
        {/* Header - show when not compact */}
        {!compact && (
          <Box marginBottom={1}>
            <Text bold>
              {inputText && inputText.startsWith('/') ? 'Command Suggestions' : 'Available Commands'}
            </Text>
            <Box flexGrow={1} />
            <Text color={Colors.TextDim}>
              Press Tab to complete | ? for help
            </Text>
          </Box>
        )}
        
        {commandsToShow.length === 0 ? (
          <Box>
            <Text color={Colors.TextDim}>
              {inputText ? `No matches for "${inputText}"` : 'No commands available'}
            </Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {commandsToShow.map((command, index) => {
              const isActive = command.id === activeCommandId || index === selectedIndex;
              return (
                <Box
                  key={command.id}
                  paddingX={1}
                  paddingY={0}
                >
                  {/* Command name and icon */}
                  <Box>
                    {command.icon && (
                      <Text color={isActive ? Colors.Primary : Colors.TextDim}>
                        {command.icon} 
                      </Text>
                    )}
                    <Text 
                      bold={isActive}
                      color={isActive ? Colors.Primary : Colors.TextDim}
                    >
                      /{command.name}
                    </Text>
                    
                    {/* Description (truncated if needed) */}
                    {command.description && (
                      <Text color={Colors.TextDim}> - {command.description}</Text>
                    )}
                    
                    {/* Shortcut if available */}
                    {command.shortcut && (
                      <Box flexGrow={1}>
                        <Text color={Colors.TextDim}> [{command.shortcut}]</Text>
                      </Box>
                    )}
                    
                    {/* Featured indicator */}
                    {command.featured && (
                      <Text color={Colors.Warning}> ★</Text>
                    )}
                  </Box>
                  
                  {/* Expanded command help (when active) */}
                  {(showDetailedHelp || isHelpExpanded) && isActive && command.example && (
                    <Box marginLeft={2} marginTop={1} flexDirection="column">
                      <Text color={Colors.Info}>Example: {command.example}</Text>
                      
                      {/* Show arguments if available */}
                      {command.args && command.args.length > 0 && (
                        <Box flexDirection="column" marginTop={1}>
                          <Text color={Colors.TextDim}>Arguments:</Text>
                          {command.args.map(arg => (
                            <Box key={arg.name} marginLeft={2}>
                              <Text color={Colors.Primary}>{arg.name}</Text>
                              <Text color={arg.required ? Colors.Warning : Colors.TextDim}>
                                {arg.required ? ' (required)' : ' (optional)'}
                              </Text>
                              <Text color={Colors.TextDim}> - {arg.description}</Text>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
            
            {/* More commands indicator */}
            {relevantCommands.length > showMaxCommands && (
              <Box marginTop={1}>
                <Text color={Colors.TextDim}>
                  +{relevantCommands.length - showMaxCommands} more commands available
                </Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SlashCommandBar;