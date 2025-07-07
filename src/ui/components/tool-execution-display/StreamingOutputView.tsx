/**
 * Streaming Output View
 * 
 * Displays real-time streaming output from tool execution.
 * Shows live output with scrolling and status indicators.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { ToolExecutionEntry } from './types.js';
import { createFormattingService } from './FormattingService.js';

/**
 * Streaming output view props
 */
export interface StreamingOutputViewProps {
  execution: ToolExecutionEntry;
  enableStreaming: boolean;
  maxLines?: number;
}

/**
 * Streaming output view component
 */
export const StreamingOutputView: React.FC<StreamingOutputViewProps> = ({
  execution,
  enableStreaming,
  maxLines = 5,
}) => {
  const formatter = createFormattingService();

  if (!enableStreaming || !execution.streamingOutput) return null;

  const lines = formatter.formatStreamingOutput(execution.streamingOutput, maxLines);

  return (
    <Box flexDirection="column" marginTop={1} marginLeft={2} borderStyle="single" borderColor="gray">
      <Box>
        <Text color={Colors.Info} bold>📺 Live Output</Text>
      </Box>
      
      {lines.map((line, index) => (
        <Box key={index} marginTop={index === 0 ? 1 : 0}>
          <Text color={Colors.Text}>
            {line || ' '}
          </Text>
        </Box>
      ))}
      
      {execution.state === 'executing' && (
        <Box marginTop={1}>
          <Text color={Colors.Info}>
            ▶ Streaming...
          </Text>
        </Box>
      )}
    </Box>
  );
}; 