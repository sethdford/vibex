/**
 * Content Header View - Clean Architecture like Gemini CLI
 * 
 * Focused component for displaying multimodal content header
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ContentDisplayService } from './ContentDisplayService.js';
import { MultimodalTheme, ProcessingStatus } from './types.js';

interface ContentHeaderViewProps {
  contentStats: {
    total: number;
    selected: number;
    processing: number;
    byStatus: Record<ProcessingStatus, number>;
  };
  displayService: ContentDisplayService;
  theme: MultimodalTheme;
  terminalWidth: number;
}

export const ContentHeaderView: React.FC<ContentHeaderViewProps> = ({
  contentStats,
  displayService,
  theme,
  terminalWidth
}) => {
  const statusSummary = displayService.createStatusSummary(contentStats);

  return (
    <Box 
      borderStyle="round" 
      borderColor={theme.primary} 
      paddingX={1} 
      marginBottom={1}
      width={terminalWidth}
    >
      <Box flexDirection="column" width="100%">
        <Box justifyContent="space-between">
          <Text color={theme.primary} bold>
            🎯 Multimodal Content Handler
          </Text>
          <Text color={theme.muted}>
            {statusSummary || 'No content'}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}; 