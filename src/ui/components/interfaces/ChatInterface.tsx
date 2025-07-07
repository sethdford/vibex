/**
 * Chat Interface Component - Clean Architecture like Gemini CLI
 * 
 * Single responsibility: Chat mode UI with thinking blocks
 * Extracted from ModernInterface.tsx monolith
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { ThinkingBlock, ThinkingPhase } from '../types/interface-types.js';

/**
 * Chat interface props
 */
export interface ChatInterfaceProps {
  terminalWidth: number;
  terminalHeight: number;
  thinkingBlocks: ThinkingBlock[];
  theme?: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    muted: string;
  };
  onThinkingInteraction?: (blockId: string, action: 'expand' | 'collapse' | 'copy') => void;
}

/**
 * Get phase icon for thinking blocks
 */
const getPhaseIcon = (phase: ThinkingPhase): string => {
  switch (phase) {
    case ThinkingPhase.ANALYSIS: return '🔍';
    case ThinkingPhase.PLANNING: return '📋';
    case ThinkingPhase.REASONING: return '🧠';
    case ThinkingPhase.VERIFICATION: return '✅';
    case ThinkingPhase.SYNTHESIS: return '🔗';
    default: return '💭';
  }
};

/**
 * Chat interface component - focused on chat mode only
 */
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  terminalWidth,
  terminalHeight,
  thinkingBlocks,
  theme = {
    primary: Colors.Primary,
    secondary: Colors.Secondary,
    accent: Colors.AccentBlue,
    text: Colors.Text,
    muted: Colors.TextMuted,
  },
  onThinkingInteraction,
}) => {
  return (
    <Box flexDirection="column" height={terminalHeight - 4}>
      {/* Header */}
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1}>
        <Text color={theme.accent}>💬 Chat Mode</Text>
        <Text color={theme.text} dimColor> • Ctrl+V Canvas • Ctrl+M Multimodal • Ctrl+A Analysis</Text>
      </Box>
      
      {/* Thinking blocks display */}
      {thinkingBlocks.length > 0 && (
        <Box flexDirection="column" marginY={1}>
          <Text color={theme.secondary} bold>🧠 AI Reasoning:</Text>
          {thinkingBlocks.filter(block => block.isVisible).map(block => (
            <Box key={block.id} borderStyle="round" borderColor={theme.secondary} paddingX={1} marginY={0}>
              <Box flexDirection="column">
                <Box justifyContent="space-between">
                  <Text color={theme.accent}>
                    {getPhaseIcon(block.phase)} {block.metadata?.reasoning_type || 'thinking'} 
                    {block.metadata?.confidence && ` (${Math.round(block.metadata.confidence * 100)}%)`}
                  </Text>
                  <Text color={theme.text} dimColor>
                    {block.metadata?.tokens && `${block.metadata.tokens} tokens`}
                  </Text>
                </Box>
                <Text color={theme.text}>{block.content.slice(0, 200)}...</Text>
                <Box marginTop={1}>
                  <Text color={theme.secondary} dimColor>
                    Press 'e' to expand • 'c' to copy • 'h' to hide
                  </Text>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ChatInterface; 