/**
 * Content Capabilities View - Clean Architecture like Gemini CLI
 * 
 * Focused component for displaying processing capabilities
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ContentDisplayService } from './ContentDisplayService.js';
import { MultimodalTheme, ProcessingCapabilities } from './types.js';

interface ContentCapabilitiesViewProps {
  capabilities: ProcessingCapabilities;
  displayService: ContentDisplayService;
  theme: MultimodalTheme;
  terminalWidth: number;
}

export const ContentCapabilitiesView: React.FC<ContentCapabilitiesViewProps> = ({
  capabilities,
  displayService,
  theme,
  terminalWidth
}) => {
  return (
    <Box 
      borderStyle="single" 
      borderColor={theme.secondary} 
      paddingX={1} 
      marginBottom={1}
      width={terminalWidth}
    >
      <Box flexDirection="column" width="100%">
        <Text color={theme.secondary} bold>
          🔧 Processing Capabilities:
        </Text>
        <Box>
          <Text color={capabilities.imageAnalysis ? theme.success : theme.muted}>
            • {capabilities.imageAnalysis ? '✅' : '❌'} Images
          </Text>
          <Text color={capabilities.audioTranscription ? theme.success : theme.muted}>
            {' '}• {capabilities.audioTranscription ? '✅' : '❌'} Audio
          </Text>
          <Text color={capabilities.videoAnalysis ? theme.success : theme.muted}>
            {' '}• {capabilities.videoAnalysis ? '✅' : '❌'} Video
          </Text>
          <Text color={capabilities.documentExtraction ? theme.success : theme.muted}>
            {' '}• {capabilities.documentExtraction ? '✅' : '❌'} Documents
          </Text>
          <Text color={capabilities.codeAnalysis ? theme.success : theme.muted}>
            {' '}• {capabilities.codeAnalysis ? '✅' : '❌'} Code
          </Text>
          <Text color={capabilities.realTimeProcessing ? theme.success : theme.muted}>
            {' '}• {capabilities.realTimeProcessing ? '✅' : '❌'} Real-time
          </Text>
        </Box>
      </Box>
    </Box>
  );
}; 