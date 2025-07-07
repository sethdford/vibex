/**
 * Content Input View - Clean Architecture like Gemini CLI
 * 
 * Focused component for file input interface
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ContentDisplayService } from './ContentDisplayService.js';
import { MultimodalTheme } from './types.js';

interface ContentInputViewProps {
  filePathInput: string;
  displayService: ContentDisplayService;
  theme: MultimodalTheme;
  terminalWidth: number;
}

export const ContentInputView: React.FC<ContentInputViewProps> = ({
  filePathInput,
  displayService,
  theme,
  terminalWidth
}) => {
  return (
    <Box 
      borderStyle="double" 
      borderColor={theme.accent} 
      paddingX={1} 
      marginY={1}
      flexDirection="column"
      width={terminalWidth}
    >
      <Box marginBottom={1}>
        <Text color={theme.accent} bold>📁 Add Files:</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color={theme.primary}>Enter file path(s) separated by commas:</Text>
      </Box>
      
      <Box borderStyle="single" borderColor={theme.muted} paddingX={1}>
        <Text color={theme.primary}>
          {filePathInput}
          <Text color={theme.accent}>|</Text>
        </Text>
      </Box>
      
      <Box marginTop={1}>
        <Text color={theme.muted}>
          Examples: ./file.txt, ~/Documents/doc.pdf, /absolute/path/image.jpg
        </Text>
      </Box>
      
      <Box marginTop={1}>
        <Text color={theme.muted}>
          Press Enter to add • Escape to cancel • Ctrl+O for current directory
        </Text>
      </Box>
    </Box>
  );
}; 