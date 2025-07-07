/**
 * Streaming Interface Component - Clean Architecture like Gemini CLI
 * 
 * Single responsibility: Real-time streaming UI with thinking blocks and responses
 * Extracted from ModernInterface.tsx monolith
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { 
  ThinkingBlock, 
  ThinkingPhase, 
  StreamingState, 
  StreamingResponse,
  InterfaceTheme 
} from '../types/interface-types.js';

/**
 * Streaming interface props
 */
export interface StreamingInterfaceProps {
  terminalWidth: number;
  terminalHeight: number;
  streamingState: StreamingState;
  thinkingBlocks: ThinkingBlock[];
  currentResponse?: StreamingResponse;
  showThinking?: boolean;
  showMetrics?: boolean;
  charsPerSecond?: number;
  theme?: InterfaceTheme;
  onThinkingInteraction?: (blockId: string, action: 'expand' | 'collapse' | 'copy') => void;
  onResponseInteraction?: (responseId: string, action: 'copy' | 'regenerate' | 'continue') => void;
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
 * Streaming interface component - focused on real-time streaming only
 */
export const StreamingInterface: React.FC<StreamingInterfaceProps> = ({
  terminalWidth,
  terminalHeight,
  streamingState,
  thinkingBlocks,
  currentResponse,
  showThinking = true,
  showMetrics = true,
  charsPerSecond = 50,
  theme = {
    primary: Colors.Primary,
    secondary: Colors.Secondary,
    accent: Colors.AccentBlue,
    background: Colors.Background,
    text: Colors.Text,
    thinking: Colors.AccentPurple,
    response: Colors.Text,
    muted: Colors.TextMuted,
    error: Colors.Error,
    success: Colors.Success,
    warning: Colors.Warning
  },
  onThinkingInteraction,
  onResponseInteraction,
}) => {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [typingEffect, setTypingEffect] = useState<Record<string, number>>({});

  // Render streaming state indicator
  const renderStreamingIndicator = () => {
    const indicators = {
      [StreamingState.IDLE]: { icon: '⏸️', text: 'Ready', color: theme.muted },
      [StreamingState.THINKING]: { icon: '🤔', text: 'Thinking...', color: theme.thinking },
      [StreamingState.RESPONDING]: { icon: '💬', text: 'Responding...', color: theme.response },
      [StreamingState.TOOL_EXECUTING]: { icon: '🔧', text: 'Executing...', color: theme.warning },
      [StreamingState.COMPLETE]: { icon: '✅', text: 'Complete', color: theme.accent },
      [StreamingState.ERROR]: { icon: '❌', text: 'Error', color: theme.error }
    };
    
    const indicator = indicators[streamingState];
    
    return (
      <Box borderStyle="round" borderColor={indicator.color} paddingX={1}>
        <Text color={indicator.color}>
          {indicator.icon} {indicator.text}
        </Text>
      </Box>
    );
  };

  // Render thinking blocks
  const renderThinkingBlocks = () => {
    if (!showThinking || thinkingBlocks.length === 0) return null;

    return (
      <Box flexDirection="column" marginY={1}>
        <Text color={theme.thinking} bold>🧠 AI Reasoning:</Text>
        {thinkingBlocks.map(block => {
          const isExpanded = expandedBlocks.has(block.id);
          const isSelected = selectedBlock === block.id;
          const duration = block.endTime ? block.endTime - block.startTime : Date.now() - block.startTime;

          return (
            <Box 
              key={block.id} 
              borderStyle={isSelected ? "double" : "round"} 
              borderColor={isSelected ? theme.accent : theme.thinking} 
              paddingX={1} 
              marginY={0}
            >
              <Box flexDirection="column">
                {/* Header */}
                <Box justifyContent="space-between">
                  <Box>
                    <Text color={theme.thinking}>
                      {getPhaseIcon(block.phase)} {block.phase.toUpperCase()}
                    </Text>
                    {block.metadata?.confidence && (
                      <Text color={theme.muted}>
                        {' '}({Math.round(block.metadata.confidence * 100)}% confidence)
                      </Text>
                    )}
                  </Box>
                  <Box>
                    <Text color={theme.muted}>
                      {Math.round(duration / 1000)}s
                    </Text>
                    {block.metadata?.tokens && (
                      <Text color={theme.muted}>
                        {' '}• {block.metadata.tokens} tokens
                      </Text>
                    )}
                  </Box>
                </Box>
                
                {/* Content */}
                <Box marginTop={1}>
                  <Text color={theme.response}>
                    {isExpanded ? block.content : `${block.content.slice(0, 150)}...`}
                  </Text>
                </Box>
                
                {/* Controls */}
                <Box marginTop={1}>
                  <Text color={theme.muted} dimColor>
                    {isExpanded ? '↑ Ctrl+T collapse' : '↓ Ctrl+T expand'} • Ctrl+Y copy
                    {isSelected && ' • Selected'}
                  </Text>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  // Render streaming response
  const renderStreamingResponse = () => {
    if (!currentResponse) return null;
    
    const displayedContent = currentResponse.isComplete 
      ? currentResponse.content 
      : currentResponse.content.slice(0, typingEffect[currentResponse.id] || 0);
    
    const cursor = !currentResponse.isComplete ? '▋' : '';
    
    return (
      <Box flexDirection="column" marginY={1}>
        <Box marginBottom={1}>
          <Text color={theme.response} bold>💬 AI Response:</Text>
          {showMetrics && currentResponse.metadata && (
            <Text color={theme.muted}>
              {' '}• {currentResponse.metadata.model || 'Claude 4'} 
              {currentResponse.metadata.latency && ` • ${currentResponse.metadata.latency}ms`}
              {currentResponse.metadata.quality_score && ` • Quality: ${Math.round(currentResponse.metadata.quality_score * 100)}%`}
            </Text>
          )}
        </Box>
        
        <Box borderStyle="single" borderColor={theme.response} paddingX={1}>
          <Box flexDirection="column">
            <Text color={theme.response}>
              {displayedContent}{cursor}
            </Text>
            
            {currentResponse.isComplete && (
              <Box marginTop={1}>
                <Text color={theme.muted} dimColor>
                  Ctrl+Y copy • Ctrl+R regenerate
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  // Render metrics panel
  const renderMetrics = () => {
    if (!showMetrics) return null;
    
    const totalThinkingTime = thinkingBlocks.reduce((total, block) => {
      const duration = block.endTime ? block.endTime - block.startTime : Date.now() - block.startTime;
      return total + duration;
    }, 0);
    
    const totalTokens = thinkingBlocks.reduce((total, block) => {
      return total + (block.metadata?.tokens || 0);
    }, 0) + (currentResponse?.metadata?.tokens || 0);
    
    return (
      <Box borderStyle="single" borderColor={theme.muted} paddingX={1}>
        <Box justifyContent="space-between" width="100%">
          <Text color={theme.muted}>
            Thinking: {Math.round(totalThinkingTime / 1000)}s • Tokens: {totalTokens}
          </Text>
          <Text color={theme.muted}>
            Blocks: {thinkingBlocks.length} • State: {streamingState}
          </Text>
        </Box>
      </Box>
    );
  };

  // Typing effect for streaming response
  useEffect(() => {
    if (currentResponse && !currentResponse.isComplete) {
      const targetLength = currentResponse.content.length;
      const currentLength = typingEffect[currentResponse.id] || 0;
      
      if (currentLength < targetLength) {
        const timer = setTimeout(() => {
          setTypingEffect(prev => ({
            ...prev,
            [currentResponse.id]: Math.min(currentLength + 1, targetLength)
          }));
        }, 1000 / charsPerSecond);
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentResponse, typingEffect, charsPerSecond]);

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Header with streaming indicator */}
      <Box marginBottom={1}>
        {renderStreamingIndicator()}
      </Box>
      
      {/* Main content area */}
      <Box flexDirection="column" flexGrow={1}>
        {renderThinkingBlocks()}
        {renderStreamingResponse()}
      </Box>
      
      {/* Metrics footer */}
      {renderMetrics()}
      
      {/* Help text */}
      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          Navigation: ↑↓ select • Ctrl+T expand/collapse • Ctrl+Y copy • Ctrl+R regenerate
        </Text>
      </Box>
    </Box>
  );
};

export default StreamingInterface; 