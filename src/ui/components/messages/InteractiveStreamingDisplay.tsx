/**
 * Interactive Streaming Display Component
 * 
 * Handles Claude-style thinking blocks and interactive responses
 * Following Gemini CLI patterns - single responsibility, focused component
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import type { 
  BaseStreamingProps, 
  LiveThinkingBlock, 
  StreamingResponse, 
  StreamingState,
  ThinkingPhase 
} from '../shared/streaming-types.js';

export interface InteractiveStreamingDisplayProps extends BaseStreamingProps {
  /** Current streaming state */
  streamingState: StreamingState;
  /** Live thinking blocks */
  thinkingBlocks?: LiveThinkingBlock[];
  /** Current streaming response */
  currentResponse?: StreamingResponse;
  /** Whether to show thinking blocks */
  showThinking?: boolean;
  /** Callback for thinking block interactions */
  onThinkingInteraction?: (blockId: string, action: 'expand' | 'collapse' | 'copy') => void;
  /** Callback for response interactions */
  onResponseInteraction?: (responseId: string, action: 'copy' | 'regenerate' | 'continue') => void;
}

/**
 * Interactive streaming display with thinking blocks
 */
export const InteractiveStreamingDisplay: React.FC<InteractiveStreamingDisplayProps> = ({
  streamingState,
  thinkingBlocks = [],
  currentResponse,
  showThinking = true,
  terminalWidth = 100,
  terminalHeight = 30,
  theme = {
    thinking: Colors.AccentPurple,
    response: Colors.Text,
    accent: Colors.AccentBlue,
    muted: Colors.TextMuted,
    error: Colors.Error,
    success: Colors.Success,
    warning: Colors.Warning
  },
  showMetrics = true,
  onThinkingInteraction,
  onResponseInteraction
}) => {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  
  // Get streaming state indicator
  const getStreamingIndicator = () => {
    const indicators = {
      idle: { icon: '⏸️', text: 'Ready', color: theme.muted },
      thinking: { icon: '🤔', text: 'Thinking...', color: theme.thinking },
      responding: { icon: '💬', text: 'Responding...', color: theme.response },
      tool_executing: { icon: '🔧', text: 'Executing...', color: theme.accent },
      complete: { icon: '✅', text: 'Complete', color: theme.success },
      error: { icon: '❌', text: 'Error', color: theme.error }
    };
    
    return indicators[streamingState] || indicators.idle;
  };
  
  // Get thinking phase icon
  const getPhaseIcon = (phase: ThinkingPhase): string => {
    const phaseIcons = {
      analysis: '🔍',
      planning: '📋',
      reasoning: '🧠',
      verification: '✅',
      synthesis: '🔗'
    };
    
    return phaseIcons[phase] || '💭';
  };
  
  // Handle keyboard shortcuts
  useInput(useCallback((input, key) => {
    if (key.ctrl) {
      switch (input) {
        case 't':
          // Toggle thinking blocks
          if (selectedBlock && onThinkingInteraction) {
            const isExpanded = expandedBlocks.has(selectedBlock);
            onThinkingInteraction(selectedBlock, isExpanded ? 'collapse' : 'expand');
            setExpandedBlocks(prev => {
              const newSet = new Set(prev);
              if (isExpanded) {
                newSet.delete(selectedBlock);
              } else {
                newSet.add(selectedBlock);
              }
              return newSet;
            });
          }
          break;
        case 'c':
          // Copy content
          if (selectedBlock && onThinkingInteraction) {
            onThinkingInteraction(selectedBlock, 'copy');
          } else if (currentResponse && onResponseInteraction) {
            onResponseInteraction(currentResponse.id, 'copy');
          }
          break;
        case 'r':
          // Regenerate response
          if (currentResponse && onResponseInteraction) {
            onResponseInteraction(currentResponse.id, 'regenerate');
          }
          break;
      }
    }
    
    // Navigation
    if (key.upArrow || key.downArrow) {
      const blockIds = thinkingBlocks.map(block => block.id);
      if (blockIds.length > 0) {
        const currentIndex = selectedBlock ? blockIds.indexOf(selectedBlock) : -1;
        let newIndex = currentIndex;
        
        if (key.upArrow) {
          newIndex = currentIndex > 0 ? currentIndex - 1 : blockIds.length - 1;
        } else {
          newIndex = currentIndex < blockIds.length - 1 ? currentIndex + 1 : 0;
        }
        
        setSelectedBlock(blockIds[newIndex]);
      }
    }
  }, [selectedBlock, expandedBlocks, thinkingBlocks, currentResponse, onThinkingInteraction, onResponseInteraction]));
  
  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Header with streaming indicator */}
      <Box marginBottom={1}>
        <Box borderStyle="round" borderColor={getStreamingIndicator().color} paddingX={1}>
          <Text color={getStreamingIndicator().color}>
            {getStreamingIndicator().icon} {getStreamingIndicator().text}
          </Text>
        </Box>
      </Box>
      
      {/* Thinking blocks */}
      {showThinking && thinkingBlocks.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.thinking} bold>🧠 AI Reasoning:</Text>
          {thinkingBlocks.map(block => (
            <Box key={block.id} flexDirection="column" marginTop={1}>
              <Box>
                <Text color={theme.thinking}>
                  {getPhaseIcon(block.phase)} {block.phase}
                </Text>
                {showMetrics && block.metadata?.confidence && (
                  <Text color={theme.muted}>
                    {' '}• Confidence: {Math.round(block.metadata.confidence * 100)}%
                  </Text>
                )}
              </Box>
              
              {(block.isExpanded || expandedBlocks.has(block.id)) && (
                <Box marginLeft={2} marginTop={1}>
                  <Text color={theme.response}>{block.content}</Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
      
      {/* Current response */}
      {currentResponse && (
        <Box flexDirection="column" marginY={1}>
          <Box marginBottom={1}>
            <Text color={theme.response} bold>💬 AI Response:</Text>
            {showMetrics && currentResponse.metadata && (
              <Text color={theme.muted}>
                {' '}• {currentResponse.metadata.model || 'Claude 4'}
                {currentResponse.metadata.latency && ` • ${currentResponse.metadata.latency}ms`}
              </Text>
            )}
          </Box>
          
          <Box borderStyle="single" borderColor={theme.response} paddingX={1}>
            <Text color={theme.response}>
              {currentResponse.content}
              {!currentResponse.isComplete && '▋'}
            </Text>
          </Box>
        </Box>
      )}
      
      {/* Help text */}
      <Box marginTop={1}>
        <Text color={theme.muted} dimColor>
          Navigation: ↑↓ select • Ctrl+T expand/collapse • Ctrl+C copy • Ctrl+R regenerate
        </Text>
      </Box>
    </Box>
  );
};

export default InteractiveStreamingDisplay; 