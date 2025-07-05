/**
 * Advanced Streaming Display Component
 * 
 * Unified streaming component that consolidates core streaming functionality:
 * - StreamingText: Basic typewriter effect with cursor and speed control
 * - StreamingTextOutput: Markdown and syntax highlighting support
 * - ToolExecutionDisplay: Tool execution streaming with metrics
 * - LoadingIndicator: Spinner and status display
 * 
 * Note: RealTimeStreamingInterface (Claude-style thinking blocks) functionality
 * is now consolidated into ModernInterface with InterfaceMode.STREAMING.
 * 
 * This component provides a single, comprehensive streaming interface
 * that can handle all core streaming use cases previously covered by separate components.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { Colors } from '../colors.js';
import { highlightCode } from '../utils/highlighter.js';
import type { ToolCall, ToolResult } from '../../ai/content-stream.js';

/**
 * Streaming mode determines the display style and features
 */
export enum StreamingMode {
  BASIC = 'basic',           // Simple typewriter effect
  MARKDOWN = 'markdown',     // Markdown with syntax highlighting
  INTERACTIVE = 'interactive', // Claude-style with thinking blocks
  TOOL_EXECUTION = 'tool_execution', // Tool execution display
  LOADING = 'loading'        // Simple loading indicator
}

/**
 * Streaming state
 */
export enum StreamingState {
  IDLE = 'idle',
  THINKING = 'thinking',
  RESPONDING = 'responding',
  TOOL_EXECUTING = 'tool_executing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Thinking phase for interactive mode
 */
export enum ThinkingPhase {
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  REASONING = 'reasoning',
  VERIFICATION = 'verification',
  SYNTHESIS = 'synthesis'
}

/**
 * Live thinking block for interactive mode
 */
export interface LiveThinkingBlock {
  id: string;
  phase: ThinkingPhase;
  content: string;
  startTime: number;
  endTime?: number;
  isExpanded: boolean;
  metadata?: {
    tokens?: number;
    confidence?: number;
    [key: string]: unknown;
  };
}

/**
 * Tool execution entry for tool mode
 */
export interface ToolExecutionEntry {
  id: string;
  toolCall: ToolCall;
  state: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  result?: ToolResult;
  error?: string;
  streamingOutput?: string;
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
 * Advanced streaming display props
 */
export interface AdvancedStreamingDisplayProps {
  /**
   * Streaming mode
   */
  mode: StreamingMode;
  
  /**
   * Current streaming state
   */
  streamingState: StreamingState;
  
  /**
   * Text content to display
   */
  content: string;
  
  /**
   * Whether content is actively streaming
   */
  isStreaming: boolean;
  
  /**
   * Typewriter effect speed (characters per second)
   */
  charsPerSecond?: number;
  
  /**
   * Whether to show cursor during streaming
   */
  showCursor?: boolean;
  
  /**
   * Whether to preserve whitespace
   */
  preserveWhitespace?: boolean;
  
  /**
   * Custom color for text
   */
  textColor?: string;
  
  /**
   * Enable syntax highlighting for code blocks
   */
  enableSyntaxHighlighting?: boolean;
  
  /**
   * Show loading indicator
   */
  showLoadingIndicator?: boolean;
  
  /**
   * Loading message
   */
  loadingMessage?: string;
  
  /**
   * Current thought/reasoning (for interactive mode)
   */
  thought?: string;
  
  /**
   * Live thinking blocks (for interactive mode)
   */
  thinkingBlocks?: LiveThinkingBlock[];
  
  /**
   * Current streaming response (for interactive mode)
   */
  currentResponse?: StreamingResponse;
  
  /**
   * Tool execution entries (for tool mode)
   */
  toolExecutions?: ToolExecutionEntry[];
  
  /**
   * Terminal dimensions
   */
  terminalWidth?: number;
  terminalHeight?: number;
  
  /**
   * Whether to show metrics
   */
  showMetrics?: boolean;
  
  /**
   * Whether to show thinking blocks
   */
  showThinking?: boolean;
  
  /**
   * Maximum number of tool entries to display
   */
  maxToolEntries?: number;
  
  /**
   * Theme colors
   */
  theme?: {
    thinking: string;
    response: string;
    accent: string;
    muted: string;
    error: string;
    success: string;
    warning: string;
  };
  
  /**
   * Callback when streaming completes
   */
  onComplete?: () => void;
  
  /**
   * Callback for thinking block interactions
   */
  onThinkingInteraction?: (blockId: string, action: 'expand' | 'collapse' | 'copy') => void;
  
  /**
   * Callback for response interactions
   */
  onResponseInteraction?: (responseId: string, action: 'copy' | 'regenerate' | 'continue') => void;
  
  /**
   * Callback for tool interactions
   */
  onToolInteraction?: (toolId: string, action: 'cancel' | 'retry' | 'view_details') => void;
}

/**
 * Advanced streaming display component
 */
export const AdvancedStreamingDisplay: React.FC<AdvancedStreamingDisplayProps> = ({
  mode,
  streamingState,
  content,
  isStreaming,
  charsPerSecond = 40,
  showCursor = true,
  preserveWhitespace = true,
  textColor,
  enableSyntaxHighlighting = true,
  showLoadingIndicator = true,
  loadingMessage = 'Processing...',
  thought,
  thinkingBlocks = [],
  currentResponse,
  toolExecutions = [],
  terminalWidth = 100,
  terminalHeight = 30,
  showMetrics = true,
  showThinking = true,
  maxToolEntries = 10,
  theme = {
    thinking: Colors.AccentPurple,
    response: Colors.Text,
    accent: Colors.AccentBlue,
    muted: Colors.TextMuted,
    error: Colors.Error,
    success: Colors.Success,
    warning: Colors.Warning
  },
  onComplete,
  onThinkingInteraction,
  onResponseInteraction,
  onToolInteraction
}) => {
  // Streaming state
  const [visibleText, setVisibleText] = useState<string>('');
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [typingEffect, setTypingEffect] = useState<Record<string, number>>({});
  
  // Refs
  const contentRef = useRef(content);
  const isCompleteRef = useRef(false);
  
  // Update content reference
  useEffect(() => {
    contentRef.current = content;
    
    // Reset if content changed
    if (isCompleteRef.current && content !== visibleText) {
      setCursorPos(0);
      setVisibleText('');
      isCompleteRef.current = false;
    }
  }, [content, visibleText]);
  
  // Typewriter effect
  useEffect(() => {
    if (!isStreaming || isCompleteRef.current) {
      if (!isStreaming) {
        setVisibleText(content);
        setCursorPos(content.length);
        isCompleteRef.current = true;
        if (onComplete) onComplete();
      }
      return;
    }
    
    if (cursorPos >= contentRef.current.length) {
      setVisibleText(contentRef.current);
      isCompleteRef.current = true;
      if (onComplete) onComplete();
      return;
    }
    
    const interval = 1000 / charsPerSecond;
    const timer = setTimeout(() => {
      const nextPos = Math.min(cursorPos + 1, contentRef.current.length);
      const nextVisibleText = contentRef.current.substring(0, nextPos);
      
      setVisibleText(nextVisibleText);
      setCursorPos(nextPos);
    }, interval);
    
    return () => clearTimeout(timer);
  }, [content, isStreaming, cursorPos, charsPerSecond, onComplete]);
  
  // Keyboard shortcuts for interactive mode
  useInput((input, key) => {
    if (mode !== StreamingMode.INTERACTIVE) return;
    
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
  });
  
  // Get streaming state indicator
  const getStreamingIndicator = () => {
    const indicators = {
      [StreamingState.IDLE]: { icon: '⏸️', text: 'Ready', color: theme.muted },
      [StreamingState.THINKING]: { icon: '🤔', text: 'Thinking...', color: theme.thinking },
      [StreamingState.RESPONDING]: { icon: '💬', text: 'Responding...', color: theme.response },
      [StreamingState.TOOL_EXECUTING]: { icon: '🔧', text: 'Executing...', color: theme.accent },
      [StreamingState.COMPLETE]: { icon: '✅', text: 'Complete', color: theme.success },
      [StreamingState.ERROR]: { icon: '❌', text: 'Error', color: theme.error }
    };
    
    return indicators[streamingState] || indicators[StreamingState.IDLE];
  };
  
  // Get thinking phase icon
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
  
  // Render basic mode
  const renderBasicMode = () => (
    <Box flexDirection="column">
      <Text color={textColor} wrap={preserveWhitespace ? "wrap" : "wrap"}>
        {visibleText}
        {isStreaming && showCursor && cursorPos < content.length && (
          <Text color={theme.accent}>▌</Text>
        )}
      </Text>
      
      {isStreaming && showLoadingIndicator && (
        <Box marginTop={1}>
          <Text color={theme.accent}>
            <Spinner type="dots" />
            <Text> {loadingMessage}</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
  
  // Render markdown mode
  const renderMarkdownMode = () => {
    if (!visibleText) return null;
    
    // Split content into regular text and code blocks
    const parts = visibleText.split(/(```[\s\S]*?```)/g);
    
    return (
      <Box flexDirection="column">
        {parts.map((part, index) => {
          // Check if this part is a code block
          if (part.startsWith('```') && part.endsWith('```')) {
            const match = part.match(/```(\w*)\n([\s\S]*?)```/);
            if (!match) {
              return <Text key={index}>{part}</Text>;
            }
            
            const [, language, code] = match;
            
            if (enableSyntaxHighlighting) {
              return (
                <Box key={index} flexDirection="column" marginY={1}>
                  <Box paddingX={1}>
                    <Text color={theme.muted}>{language || 'code'}</Text>
                  </Box>
                  <Box paddingX={1} paddingY={1} flexDirection="column">
                    {highlightCode(code, language).map((line: string, lineIndex: number) => (
                      <Text key={lineIndex} color={theme.response}>
                        {line}
                      </Text>
                    ))}
                  </Box>
                </Box>
              );
            } else {
              return (
                <Box key={index} flexDirection="column" marginY={1}>
                  <Box paddingX={1}>
                    <Text color={theme.muted}>{code}</Text>
                  </Box>
                </Box>
              );
            }
          }
          
          // Process basic markdown formatting
          const formattedParts: React.ReactNode[] = [];
          let lastIndex = 0;
          
          const boldRegex = /\*\*(.*?)\*\*/g;
          let boldMatch;
          while ((boldMatch = boldRegex.exec(part)) !== null) {
            if (boldMatch.index > lastIndex) {
              formattedParts.push(
                <Text key={`text-${formattedParts.length}`}>
                  {part.substring(lastIndex, boldMatch.index)}
                </Text>
              );
            }
            
            formattedParts.push(
              <Text key={`bold-${formattedParts.length}`} bold>
                {boldMatch[1]}
              </Text>
            );
            
            lastIndex = boldMatch.index + boldMatch[0].length;
          }
          
          if (lastIndex < part.length) {
            formattedParts.push(
              <Text key={`text-${formattedParts.length}`}>
                {part.substring(lastIndex)}
              </Text>
            );
          }
          
                         return <Box key={index}>{formattedParts.length > 0 ? formattedParts : <Text>{String(part)}</Text>}</Box>;
        })}
        
        {isStreaming && showLoadingIndicator && !isCompleteRef.current && (
          <Box marginTop={1}>
            <Text color={theme.accent}>
              <Spinner type="dots" />
              <Text> {loadingMessage}</Text>
            </Text>
          </Box>
        )}
      </Box>
    );
  };
  
  // Render interactive mode
  const renderInteractiveMode = () => (
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
                {block.metadata?.confidence && (
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
              {!currentResponse.isComplete && showCursor && '▋'}
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
  
  // Render tool execution mode
  const renderToolExecutionMode = () => {
    const displayExecutions = toolExecutions.slice(0, maxToolEntries);
    
    return (
      <Box flexDirection="column">
        <Text color={theme.accent} bold>🔧 Tool Execution</Text>
        
        {displayExecutions.map(execution => {
          const stateIcon = {
            pending: '⏳',
            executing: '⚡',
            completed: '✅',
            failed: '❌',
            cancelled: '⏹️'
          }[execution.state];
          
          const stateColor = {
            pending: theme.warning,
            executing: theme.accent,
            completed: theme.success,
            failed: theme.error,
            cancelled: theme.muted
          }[execution.state];
          
          return (
            <Box key={execution.id} flexDirection="column" marginTop={1}>
              <Box>
                <Text color={stateColor}>
                  {stateIcon} {String(execution.toolCall.name)}
                </Text>
                {execution.endTime && (
                  <Text color={theme.muted}>
                    {' '}• {execution.endTime - execution.startTime}ms
                  </Text>
                )}
              </Box>
              
              {execution.streamingOutput && (
                <Box marginLeft={2} marginTop={1}>
                  <Text color={theme.response}>
                    {execution.streamingOutput.split('\n').slice(-3).join('\n')}
                    {execution.state === 'executing' && '▋'}
                  </Text>
                </Box>
              )}
              
              {execution.result && (
                <Box marginLeft={2} marginTop={1}>
                  <Text color={execution.result.error ? theme.error : theme.success}>
                    {String(execution.result.content)}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };
  
  // Render loading mode
  const renderLoadingMode = () => (
    <Box>
      <Text color={theme.accent}>
        <Spinner type="dots" />
        <Text> {loadingMessage}</Text>
      </Text>
      {thought && (
        <Text color={theme.muted}> • {thought}</Text>
      )}
    </Box>
  );
  
  // Main render
  switch (mode) {
    case StreamingMode.BASIC:
      return renderBasicMode();
    case StreamingMode.MARKDOWN:
      return renderMarkdownMode();
    case StreamingMode.INTERACTIVE:
      return renderInteractiveMode();
    case StreamingMode.TOOL_EXECUTION:
      return renderToolExecutionMode();
    case StreamingMode.LOADING:
      return renderLoadingMode();
    default:
      return renderBasicMode();
  }
};

export default AdvancedStreamingDisplay; 