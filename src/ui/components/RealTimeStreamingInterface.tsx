/**
 * Real-Time Streaming Interface Component
 * 
 * This component provides Claude-style real-time streaming with thinking blocks,
 * live response updates, and interactive AI reasoning display.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';

/**
 * Streaming state enum
 */
export enum StreamingState {
  IDLE = 'idle',
  THINKING = 'thinking',
  RESPONDING = 'responding',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Thinking phase enum for different reasoning types
 */
export enum ThinkingPhase {
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  REASONING = 'reasoning',
  VERIFICATION = 'verification',
  SYNTHESIS = 'synthesis'
}

/**
 * Live thinking block interface
 */
export interface LiveThinkingBlock {
  id: string;
  phase: ThinkingPhase;
  content: string;
  isComplete: boolean;
  startTime: number;
  endTime?: number;
  confidence?: number;
  metadata?: {
    tokens?: number;
    complexity?: 'low' | 'medium' | 'high';
    reasoning_depth?: number;
  };
}

/**
 * Streaming response interface
 */
export interface StreamingResponse {
  id: string;
  content: string;
  isComplete: boolean;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    latency?: number;
    quality_score?: number;
  };
}

/**
 * Real-time streaming props
 */
interface RealTimeStreamingInterfaceProps {
  /**
   * Current streaming state
   */
  streamingState: StreamingState;
  
  /**
   * Live thinking blocks
   */
  thinkingBlocks: LiveThinkingBlock[];
  
  /**
   * Current streaming response
   */
  currentResponse?: StreamingResponse;
  
  /**
   * Terminal dimensions
   */
  terminalWidth: number;
  terminalHeight: number;
  
  /**
   * Whether to show thinking blocks
   */
  showThinking?: boolean;
  
  /**
   * Whether to show real-time metrics
   */
  showMetrics?: boolean;
  
  /**
   * Animation speed for typing effect
   */
  typingSpeed?: number;
  
  /**
   * Theme colors
   */
  theme?: {
    thinking: string;
    response: string;
    accent: string;
    muted: string;
    error: string;
  };
  
  /**
   * Callback for thinking block interactions
   */
  onThinkingInteraction?: (blockId: string, action: 'expand' | 'collapse' | 'copy') => void;
  
  /**
   * Callback for response interactions
   */
  onResponseInteraction?: (responseId: string, action: 'copy' | 'regenerate' | 'continue') => void;
}

/**
 * Real-time streaming interface component
 */
export const RealTimeStreamingInterface: React.FC<RealTimeStreamingInterfaceProps> = ({
  streamingState,
  thinkingBlocks,
  currentResponse,
  terminalWidth,
  terminalHeight,
  showThinking = true,
  showMetrics = true,
  typingSpeed = 50,
  theme = {
    thinking: Colors.AccentPurple,
    response: Colors.Text,
    accent: Colors.AccentBlue,
    muted: Colors.TextMuted,
    error: Colors.Error
  },
  onThinkingInteraction,
  onResponseInteraction
}) => {
  // State for UI interactions
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [typingEffect, setTypingEffect] = useState<Record<string, number>>({});
  
  // Keyboard shortcuts
  useInput((input, key) => {
    if (key.ctrl) {
      switch (input) {
        case 't':
          // Toggle thinking blocks visibility
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
          // Copy current content
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
  });
  
  // Typing effect for streaming content
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
        }, typingSpeed);
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentResponse, typingEffect, typingSpeed]);
  
  // Render thinking phase icon
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
  
  // Render streaming state indicator
  const renderStreamingIndicator = () => {
    const indicators = {
      [StreamingState.IDLE]: { icon: '⏸️', text: 'Ready', color: theme.muted },
      [StreamingState.THINKING]: { icon: '🤔', text: 'Thinking...', color: theme.thinking },
      [StreamingState.RESPONDING]: { icon: '💬', text: 'Responding...', color: theme.response },
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
        <Box marginBottom={1}>
          <Text color={theme.thinking} bold>🧠 AI Reasoning Process:</Text>
        </Box>
        
        {thinkingBlocks.map(block => {
          const isExpanded = expandedBlocks.has(block.id);
          const isSelected = selectedBlock === block.id;
          const duration = block.endTime ? block.endTime - block.startTime : Date.now() - block.startTime;
          
          return (
            <Box 
              key={block.id} 
              borderStyle={isSelected ? "double" : "single"}
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
                    {block.confidence && (
                      <Text color={theme.muted}>
                        {' '}({Math.round(block.confidence * 100)}% confidence)
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
                    {isExpanded ? '↑ Ctrl+T collapse' : '↓ Ctrl+T expand'} • Ctrl+C copy
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
                  Ctrl+C copy • Ctrl+R regenerate
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
          Navigation: ↑↓ select • Ctrl+T expand/collapse • Ctrl+C copy • Ctrl+R regenerate
        </Text>
      </Box>
    </Box>
  );
};

export default RealTimeStreamingInterface; 