/**
 * Content Controls View - Clean Architecture like Gemini CLI
 * 
 * Focused component for displaying controls help
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ContentDisplayService } from './ContentDisplayService.js';
import { MultimodalTheme } from './types.js';

interface ContentControlsViewProps {
  displayService: ContentDisplayService;
  theme: MultimodalTheme;
  terminalWidth: number;
}

export const ContentControlsView: React.FC<ContentControlsViewProps> = ({
  displayService,
  theme,
  terminalWidth
}) => {
  const controlsHelp = displayService.getControlsHelp();

  return (
    <Box 
      borderStyle="single" 
      borderColor={theme.muted} 
      paddingX={1}
      width={terminalWidth}
    >
      <Box flexDirection="column">
        {controlsHelp.map((helpText, index) => (
          <Text key={index} color={theme.muted} dimColor>
            {helpText}
          </Text>
        ))}
      </Box>
    </Box>
  );
}; 