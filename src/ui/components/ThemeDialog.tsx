/**
 * Theme Dialog Component
 * 
 * Displays a dialog for selecting a theme.
 */

import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { Colors } from '../colors';

/**
 * Theme option type
 */
interface ThemeOption {
  /**
   * Option label
   */
  label: string;
  
  /**
   * Option value
   */
  value: string;
}

/**
 * Theme dialog props
 */
interface ThemeDialogProps {
  /**
   * Handler for theme selection
   */
  onSelect: (item: ThemeOption) => void;
  
  /**
   * Handler for theme highlight
   */
  onHighlight: (item: ThemeOption) => void;
  
  /**
   * User settings
   */
  settings: any;
  
  /**
   * Available terminal height
   */
  availableTerminalHeight?: number;
  
  /**
   * Terminal width
   */
  terminalWidth: number;
}

/**
 * Theme dialog component
 */
export const ThemeDialog: React.FC<ThemeDialogProps> = ({
  onSelect,
  onHighlight,
  settings,
  availableTerminalHeight,
  terminalWidth,
}) => {
  // Available themes
  const themeOptions: ThemeOption[] = [
    { label: 'Dark Theme (Default)', value: 'dark' },
    { label: 'Light Theme', value: 'light' },
    { label: 'System Theme', value: 'system' },
    { label: 'High Contrast', value: 'high-contrast' }
  ];
  
  // Current selected theme
  const currentTheme = settings?.terminal?.theme || 'dark';
  
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={Colors.Primary}
      paddingX={1}
      paddingY={0}
      width={Math.min(terminalWidth, 60)}
    >
      <Box marginBottom={1}>
        <Text bold>
          Select Theme
        </Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text>
          Choose a theme for the terminal interface.
        </Text>
      </Box>
      
      <SelectInput
        items={themeOptions}
        onSelect={onSelect}
        onHighlight={onHighlight}
        initialIndex={themeOptions.findIndex(
          option => option.value === currentTheme
        )}
        itemComponent={({ isSelected, label }) => (
          <Text color={isSelected ? Colors.Primary : undefined}>
            {isSelected ? '› ' : '  '}{label}
          </Text>
        )}
      />
      
      <Box marginTop={1}>
        <Text color={Colors.TextDim}>
          Use arrow keys to navigate, Enter to select
        </Text>
      </Box>
    </Box>
  );
};