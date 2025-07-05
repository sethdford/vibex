/**
 * Modern Interface Foundation Component
 * 
 * UNIFIED INTERFACE SYSTEM - Consolidates all interface components:
 * - ModernInterface (5 modes: CHAT, CANVAS, MULTIMODAL, ANALYSIS, COLLABORATION)
 * - CompactInterface (high-density display)
 * - RealTimeStreamingInterface (Claude-style streaming with thinking blocks)
 * - AdvancedStreamingDisplay (unified streaming modes)
 * 
 * This component eliminates duplication by providing a single adaptive interface
 * that can dynamically switch between all interface modes and density levels.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { Colors } from '../colors.js';
import { highlightCode } from '../utils/highlighter.js';
import type { ToolCall, ToolResult } from '../../ai/content-stream.js';
import type { HistoryItem } from '../types.js';
import { MessageType } from '../types.js';

/**
 * UNIFIED Interface mode enum - consolidates all interface types
 */
export enum InterfaceMode {
  CHAT = 'chat',
  CANVAS = 'canvas',
  MULTIMODAL = 'multimodal',
  ANALYSIS = 'analysis',
  COLLABORATION = 'collaboration',
  COMPACT = 'compact',           // From CompactInterface
  STREAMING = 'streaming'        // From RealTimeStreamingInterface
}

/**
 * UNIFIED Density mode for adaptive layout
 */
export enum DensityMode {
  NORMAL = 'normal',
  COMPACT = 'compact',
  ULTRA_COMPACT = 'ultra_compact',
  ADAPTIVE = 'adaptive'
}

/**
 * UNIFIED Streaming mode - consolidates AdvancedStreamingDisplay modes
 */
export enum StreamingMode {
  BASIC = 'basic',
  MARKDOWN = 'markdown',
  INTERACTIVE = 'interactive',
  TOOL_EXECUTION = 'tool_execution',
  LOADING = 'loading'
}

/**
 * UNIFIED Streaming state
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
 * Media type enum for multimodal content
 */
export enum MediaType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  CODE = 'code'
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
 * UNIFIED Multimodal content interface
 */
export interface MultimodalContent {
  id: string;
  type: MediaType;
  content: string | Buffer;
  metadata?: {
    filename?: string;
    mimeType?: string;
    size?: number;
    dimensions?: { width: number; height: number };
    duration?: number;
  };
  processing?: {
    status: 'pending' | 'processing' | 'complete' | 'error';
    progress?: number;
    message?: string;
  };
}

/**
 * UNIFIED Thinking block interface - consolidates all thinking block implementations
 */
export interface ThinkingBlock {
  id: string;
  phase: ThinkingPhase;
  content: string;
  timestamp: number;
  isVisible: boolean;
  isExpanded?: boolean;
  startTime: number;
  endTime?: number;
  metadata?: {
    reasoning_type?: 'analysis' | 'planning' | 'reflection' | 'debugging';
    confidence?: number;
    tokens?: number;
    complexity?: 'low' | 'medium' | 'high';
    reasoning_depth?: number;
  };
}

/**
 * UNIFIED Canvas element interface
 */
export interface CanvasElement {
  id: string;
  type: 'text' | 'code' | 'diagram' | 'table' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  editable: boolean;
  selected: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * UNIFIED Collaboration state interface
 */
export interface CollaborationState {
  isActive: boolean;
  participants: Array<{
    id: string;
    name: string;
    cursor?: { x: number; y: number };
    color: string;
  }>;
  sharedContext: Record<string, unknown>;
}

/**
 * UNIFIED Streaming response interface
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
 * UNIFIED Tool execution entry
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
  metadata?: {
    memoryUsed?: number;
    cpuUsed?: number;
    networkRequests?: number;
    cacheHits?: number;
  };
}

/**
 * UNIFIED Modern interface props - consolidates all interface component props
 */
interface ModernInterfaceProps {
  /**
   * Current interface mode
   */
  mode: InterfaceMode;
  
  /**
   * Current density mode
   */
  densityMode?: DensityMode;
  
  /**
   * Current streaming mode (for STREAMING interface mode)
   */
  streamingMode?: StreamingMode;
  
  /**
   * Current streaming state
   */
  streamingState?: StreamingState;
  
  /**
   * Available terminal dimensions
   */
  terminalWidth: number;
  terminalHeight: number;
  
  /**
   * Conversation history (for COMPACT mode)
   */
  history?: HistoryItem[];
  
  /**
   * Current input text (for COMPACT mode)
   */
  input?: string;
  
  /**
   * Whether currently processing (for COMPACT mode)
   */
  isProcessing?: boolean;
  
  /**
   * Current streaming text
   */
  streamingText?: string;
  
  /**
   * Model information (for COMPACT mode)
   */
  model?: string;
  
  /**
   * Performance metrics (for COMPACT mode)
   */
  metrics?: {
    tokensUsed: number;
    responseTime: number;
    memoryUsage: number;
  };
  
  /**
   * Context information (for COMPACT mode)
   */
  context?: {
    filesLoaded: number;
    projectName: string;
    gitBranch?: string;
  };
  
  /**
   * Multimodal content to display
   */
  multimodalContent?: MultimodalContent[];
  
  /**
   * Thinking blocks to display
   */
  thinkingBlocks?: ThinkingBlock[];
  
  /**
   * Canvas elements for interactive editing
   */
  canvasElements?: CanvasElement[];
  
  /**
   * Collaboration state
   */
  collaboration?: CollaborationState;
  
  /**
   * Current streaming response (for STREAMING mode)
   */
  currentResponse?: StreamingResponse;
  
  /**
   * Tool execution entries (for STREAMING mode)
   */
  toolExecutions?: ToolExecutionEntry[];
  
  /**
   * Current thought/reasoning (for STREAMING mode)
   */
  thought?: string;
  
  /**
   * Text content to display (for STREAMING mode)
   */
  content?: string;
  
  /**
   * Whether content is actively streaming
   */
  isStreaming?: boolean;
  
  /**
   * Typewriter effect speed (characters per second)
   */
  charsPerSecond?: number;
  
  /**
   * Whether to show cursor during streaming
   */
  showCursor?: boolean;
  
  /**
   * Whether advanced features are enabled
   */
  advancedFeaturesEnabled?: boolean;
  
  /**
   * Whether to show thinking blocks
   */
  showThinking?: boolean;
  
  /**
   * Whether to show real-time metrics
   */
  showMetrics?: boolean;
  
  /**
   * Whether to show completed executions
   */
  showCompleted?: boolean;
  
  /**
   * Whether to show execution details
   */
  showDetails?: boolean;
  
  /**
   * Enable streaming output display
   */
  enableStreaming?: boolean;
  
  /**
   * Enable syntax highlighting
   */
  enableSyntaxHighlighting?: boolean;
  
  /**
   * Maximum number of tool entries to display
   */
  maxToolEntries?: number;
  
  /**
   * Theme configuration
   */
  theme?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    thinking: string;
    response: string;
    muted: string;
    error: string;
    success: string;
    warning: string;
  };
  
  /**
   * Callback for mode changes
   */
  onModeChange?: (mode: InterfaceMode) => void;
  
  /**
   * Callback for density mode changes
   */
  onDensityChange?: (density: DensityMode) => void;
  
  /**
   * Callback for multimodal content upload
   */
  onContentUpload?: (content: MultimodalContent) => void;
  
  /**
   * Callback for canvas element updates
   */
  onCanvasUpdate?: (elements: CanvasElement[]) => void;
  
  /**
   * Callback for thinking block interactions
   */
  onThinkingInteraction?: (blockId: string, action: 'expand' | 'collapse' | 'copy') => void;
  
  /**
   * Callback for response interactions
   */
  onResponseInteraction?: (responseId: string, action: 'copy' | 'regenerate' | 'continue') => void;
  
  /**
   * Callback for submission (for COMPACT mode)
   */
  onSubmit?: (text: string) => void;
  
  /**
   * Callback for cancel (for COMPACT mode)
   */
  onCancel?: () => void;
  
  /**
   * Callback when streaming completes
   */
  onComplete?: () => void;
}

/**
 * UNIFIED Modern interface component - consolidates all interface functionality
 */
export const ModernInterface: React.FC<ModernInterfaceProps> = ({
  mode,
  densityMode = DensityMode.NORMAL,
  streamingMode = StreamingMode.INTERACTIVE,
  streamingState = StreamingState.IDLE,
  terminalWidth,
  terminalHeight,
  history = [],
  input = '',
  isProcessing = false,
  streamingText = '',
  model = 'Claude 4',
  metrics,
  context,
  multimodalContent = [],
  thinkingBlocks = [],
  canvasElements = [],
  collaboration,
  currentResponse,
  toolExecutions = [],
  thought,
  content = '',
  isStreaming = false,
  charsPerSecond = 50,
  showCursor = true,
  advancedFeaturesEnabled = false,
  showThinking = true,
  showMetrics = true,
  showCompleted = true,
  showDetails = true,
  enableStreaming = true,
  enableSyntaxHighlighting = true,
  maxToolEntries = 10,
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
  onModeChange,
  onDensityChange,
  onContentUpload,
  onCanvasUpdate,
  onThinkingInteraction,
  onResponseInteraction,
  onSubmit,
  onCancel,
  onComplete
}) => {
  // UNIFIED State management - consolidates all component states
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    elementId?: string;
    startPos?: { x: number; y: number };
  }>({ isDragging: false });
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(-1);
  const [showExpanded, setShowExpanded] = useState(false);
  const [visibleText, setVisibleText] = useState<string>('');
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [typingEffect, setTypingEffect] = useState<Record<string, number>>({});
  
  // Refs for interaction handling
  const interfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  const isCompleteRef = useRef(false);
  
  // UNIFIED Keyboard shortcuts - consolidates all interface shortcuts
  useInput((input, key) => {
    if (key.ctrl) {
      switch (input) {
        // Mode switching shortcuts
        case 'c':
          onModeChange?.(InterfaceMode.CHAT);
          break;
        case 'v':
          onModeChange?.(InterfaceMode.CANVAS);
          break;
        case 'm':
          onModeChange?.(InterfaceMode.MULTIMODAL);
          break;
        case 'a':
          onModeChange?.(InterfaceMode.ANALYSIS);
          break;
        case 'l':
          onModeChange?.(InterfaceMode.COLLABORATION);
          break;
        case 'k':
          onModeChange?.(InterfaceMode.COMPACT);
          break;
        case 's':
          onModeChange?.(InterfaceMode.STREAMING);
          break;
        
        // Density mode shortcuts
        case 'd':
          const densityModes = [DensityMode.NORMAL, DensityMode.COMPACT, DensityMode.ULTRA_COMPACT];
          const currentIndex = densityModes.indexOf(densityMode);
          const nextDensity = densityModes[(currentIndex + 1) % densityModes.length];
          onDensityChange?.(nextDensity);
          break;
        
        // COMPACT mode shortcuts
        case 'e':
          if (mode === InterfaceMode.COMPACT) {
            setShowExpanded(!showExpanded);
          }
          break;
        
        // STREAMING mode shortcuts
        case 't':
          if (mode === InterfaceMode.STREAMING && selectedBlock && onThinkingInteraction) {
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
        
        // Copy shortcuts
        case 'y':
          if (selectedBlock && onThinkingInteraction) {
            onThinkingInteraction(selectedBlock, 'copy');
          } else if (currentResponse && onResponseInteraction) {
            onResponseInteraction(currentResponse.id, 'copy');
          }
          break;
        
        // Regenerate response
        case 'r':
          if (currentResponse && onResponseInteraction) {
            onResponseInteraction(currentResponse.id, 'regenerate');
          }
          break;
        
        // Cancel
        case 'x':
          if (mode === InterfaceMode.COMPACT) {
            onCancel?.();
          }
          break;
      }
    }
    
    // Navigation shortcuts
    if (key.upArrow || key.downArrow) {
      if (mode === InterfaceMode.COMPACT) {
        if (key.upArrow) {
          setSelectedMessageIndex(Math.max(0, selectedMessageIndex - 1));
        } else {
          setSelectedMessageIndex(Math.min(history.length - 1, selectedMessageIndex + 1));
        }
      } else if (mode === InterfaceMode.STREAMING) {
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
    }
  });
  
  // Multimodal content processing
  const processMultimodalContent = useCallback(async (content: MultimodalContent) => {
    setUploadProgress(prev => ({ ...prev, [content.id]: 0 }));
    
    // Simulate processing progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        const currentProgress = prev[content.id] || 0;
        if (currentProgress >= 100) {
          clearInterval(progressInterval);
          return prev;
        }
        return { ...prev, [content.id]: currentProgress + 10 };
      });
    }, 100);
    
    onContentUpload?.(content);
  }, [onContentUpload]);
  
  // Canvas element manipulation
  const handleElementSelection = useCallback((elementId: string, multiSelect = false) => {
    setSelectedElements(prev => {
      if (multiSelect) {
        return prev.includes(elementId) 
          ? prev.filter(id => id !== elementId)
          : [...prev, elementId];
      }
      return [elementId];
    });
  }, []);
  
  // Thinking block interaction
  const handleThinkingBlock = useCallback((blockId: string, action: 'expand' | 'collapse' | 'copy') => {
    onThinkingInteraction?.(blockId, action);
  }, [onThinkingInteraction]);
  
  // Render mode-specific interface
  const renderModeInterface = () => {
    switch (mode) {
      case InterfaceMode.CHAT:
        return renderChatInterface();
      case InterfaceMode.CANVAS:
        return renderCanvasInterface();
      case InterfaceMode.MULTIMODAL:
        return renderMultimodalInterface();
      case InterfaceMode.ANALYSIS:
        return renderAnalysisInterface();
      case InterfaceMode.COLLABORATION:
        return renderCollaborationInterface();
      case InterfaceMode.COMPACT:
        return renderCompactInterface();
      case InterfaceMode.STREAMING:
        return renderStreamingInterface();
      default:
        return renderChatInterface();
    }
  };
  
  // Chat interface renderer
  const renderChatInterface = () => (
    <Box flexDirection="column" height={terminalHeight - 4}>
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
                    {block.metadata?.reasoning_type || 'thinking'} 
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
  
  // Canvas interface renderer
  const renderCanvasInterface = () => (
    <Box flexDirection="column" height={terminalHeight - 4}>
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1}>
        <Text color={theme.accent}>🎨 Canvas Mode</Text>
        <Text color={theme.text} dimColor> • Interactive editing • Drag & drop • Multi-select</Text>
      </Box>
      
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {canvasElements.length === 0 ? (
          <Box justifyContent="center" alignItems="center" height="100%">
            <Text color={theme.secondary}>Canvas is empty. Start creating...</Text>
          </Box>
        ) : (
          canvasElements.map(element => (
            <Box 
              key={element.id} 
              borderStyle={element.selected ? "double" : "single"}
              borderColor={element.selected ? theme.accent : theme.secondary}
              paddingX={1}
              marginY={0}
            >
              <Box flexDirection="column">
                <Box justifyContent="space-between">
                  <Text color={theme.accent}>{element.type.toUpperCase()}</Text>
                  <Text color={theme.text} dimColor>
                    {element.size.width}x{element.size.height}
                  </Text>
                </Box>
                <Text color={theme.text}>{element.content.slice(0, 100)}...</Text>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
  
  // Multimodal interface renderer
  const renderMultimodalInterface = () => (
    <Box flexDirection="column" height={terminalHeight - 4}>
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1}>
        <Text color={theme.accent}>🎭 Multimodal Mode</Text>
        <Text color={theme.text} dimColor> • Images • Audio • Video • Documents</Text>
      </Box>
      
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {multimodalContent.length === 0 ? (
          <Box justifyContent="center" alignItems="center" height="100%">
            <Text color={theme.secondary}>Drop files here or paste content...</Text>
          </Box>
        ) : (
          multimodalContent.map(content => (
            <Box 
              key={content.id} 
              borderStyle="round" 
              borderColor={theme.secondary}
              paddingX={1}
              marginY={0}
            >
              <Box flexDirection="column">
                <Box justifyContent="space-between">
                  <Text color={theme.accent}>
                    {getMediaIcon(content.type)} {content.metadata?.filename || content.type}
                  </Text>
                  <Text color={theme.text} dimColor>
                    {formatFileSize(content.metadata?.size)}
                  </Text>
                </Box>
                
                {content.processing && (
                  <Box marginTop={1}>
                    <Text color={theme.secondary}>
                      Status: {content.processing.status} 
                      {content.processing.progress && ` (${content.processing.progress}%)`}
                    </Text>
                    {uploadProgress[content.id] !== undefined && (
                      <Text color={theme.accent}>
                        Upload: {uploadProgress[content.id]}%
                      </Text>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
  
  // Analysis interface renderer
  const renderAnalysisInterface = () => (
    <Box flexDirection="column" height={terminalHeight - 4}>
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1}>
        <Text color={theme.accent}>📊 Analysis Mode</Text>
        <Text color={theme.text} dimColor> • Deep insights • Pattern recognition • Data visualization</Text>
      </Box>
      
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        <Text color={theme.secondary}>Analysis capabilities coming soon...</Text>
      </Box>
    </Box>
  );
  
  // Collaboration interface renderer
  const renderCollaborationInterface = () => (
    <Box flexDirection="column" height={terminalHeight - 4}>
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1}>
        <Text color={theme.accent}>👥 Collaboration Mode</Text>
        <Text color={theme.text} dimColor> • Real-time editing • Shared context • Team workflows</Text>
      </Box>
      
      {collaboration?.isActive ? (
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          <Text color={theme.secondary}>
            Active participants: {collaboration.participants.length}
          </Text>
          {collaboration.participants.map(participant => (
            <Box key={participant.id} marginY={0}>
              <Text color={participant.color}>● {participant.name}</Text>
            </Box>
          ))}
        </Box>
      ) : (
        <Box justifyContent="center" alignItems="center" height="100%">
          <Text color={theme.secondary}>Start a collaboration session...</Text>
        </Box>
      )}
    </Box>
  );
  
  // Compact interface renderer
  const renderCompactInterface = () => {
    // Calculate available space for messages
    const headerHeight = 1;
    const statusHeight = 1;
    const inputHeight = 1;
    const helpHeight = 1;
    const availableHeight = terminalHeight - headerHeight - statusHeight - inputHeight - helpHeight;
    
    // Get messages to display (most recent first, fit in available space)
    const displayMessages = history.slice(-availableHeight);
    
    // Compact message display with minimal spacing
    const CompactMessage: React.FC<{
      message: HistoryItem;
      isLast: boolean;
      maxWidth: number;
    }> = ({ message, isLast, maxWidth }) => {
      const getMessageIcon = (type: MessageType): string => {
        switch (type) {
          case MessageType.USER: return '❯';
          case MessageType.ASSISTANT: return '🤖';
          case MessageType.SYSTEM: return 'ℹ';
          case MessageType.ERROR: return '❌';
          case MessageType.TOOL_USE: return '🔧';
          case MessageType.TOOL_OUTPUT: return '⚙️';
          default: return '•';
        }
      };
      
      const getMessageColor = (type: MessageType): string => {
        switch (type) {
          case MessageType.USER: return theme.primary;
          case MessageType.ASSISTANT: return theme.success;
          case MessageType.SYSTEM: return theme.accent;
          case MessageType.ERROR: return theme.error;
          case MessageType.TOOL_USE: return theme.warning;
          case MessageType.TOOL_OUTPUT: return theme.warning;
          default: return theme.text;
        }
      };
      
      // Truncate long messages for density
      const truncateText = (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength - 3) + '...';
      };
      
      const maxTextLength = maxWidth - 15;
      const displayText = truncateText(message.text, maxTextLength);
      
      return (
        <Box>
          {/* Timestamp (compact) */}
          <Box width={6}>
            <Text color={theme.muted}>
              {new Date(message.timestamp).toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </Box>
          
          {/* Icon */}
          <Box width={2} marginLeft={1}>
            <Text color={getMessageColor(message.type)}>
              {getMessageIcon(message.type)}
            </Text>
          </Box>
          
          {/* Message content */}
          <Box flexGrow={1} marginLeft={1}>
            <Text color={getMessageColor(message.type)}>
              {displayText}
            </Text>
            
            {/* Show expansion hint for truncated messages */}
            {message.text.length > maxTextLength && (
              <Text color={theme.muted}> [Ctrl+E to expand]</Text>
            )}
          </Box>
        </Box>
      );
    };

    // Ultra-compact status bar with all key information
    const CompactStatusBar: React.FC<{
      model: string;
      metrics?: typeof metrics;
      context?: typeof context;
      terminalWidth: number;
    }> = ({ model, metrics, context, terminalWidth }) => {
      // Format metrics compactly
      const formatMetrics = (): string => {
        if (!metrics) return '';
        const { tokensUsed, responseTime, memoryUsage } = metrics;
        return `${tokensUsed}t ${responseTime}ms ${Math.round(memoryUsage)}MB`;
      };
      
      // Format context compactly
      const formatContext = (): string => {
        if (!context) return '';
        const { filesLoaded, projectName, gitBranch } = context;
        return `${projectName}${gitBranch ? `@${gitBranch}` : ''} (${filesLoaded}f)`;
      };
      
      const metricsText = formatMetrics();
      const contextText = formatContext();
      
      return (
        <Box justifyContent="space-between" width="100%">
          {/* Left: Model and context */}
          <Box>
            <Text color={theme.primary}>{model}</Text>
            {contextText && (
              <>
                <Text color={theme.muted}> • </Text>
                <Text color={theme.accent}>{contextText}</Text>
              </>
            )}
          </Box>
          
          {/* Right: Metrics */}
          {metricsText && (
            <Text color={theme.muted}>{metricsText}</Text>
          )}
        </Box>
      );
    };

    // Compact input area with inline status
    const CompactInput: React.FC<{
      input: string;
      isProcessing: boolean;
      streamingText?: string;
      terminalWidth: number;
    }> = ({ input, isProcessing, streamingText, terminalWidth }) => {
      const maxInputWidth = terminalWidth - 10;
      
      return (
        <Box>
          {/* Prompt */}
          <Text color={theme.primary}>❯ </Text>
          
          {/* Input or streaming text */}
          <Box width={maxInputWidth}>
            {isProcessing ? (
              <Text color={theme.warning}>
                {streamingText || 'Processing...'}
                <Text color={theme.primary}>▋</Text>
              </Text>
            ) : (
              <Text>{input}</Text>
            )}
          </Box>
          
          {/* Processing indicator */}
          {isProcessing && (
            <Box marginLeft={1}>
              <Text color={theme.warning}>⏳</Text>
            </Box>
          )}
        </Box>
      );
    };
    
    return (
      <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
        {/* Ultra-compact header */}
        <Box>
          <Text color={theme.primary} bold>VIBEX</Text>
          <Text color={theme.muted}> • AI Development CLI</Text>
        </Box>
        
        {/* Message history (compact) */}
        <Box flexDirection="column" flexGrow={1}>
          {displayMessages.map((message, index) => (
            <CompactMessage
              key={message.id}
              message={message}
              isLast={index === displayMessages.length - 1}
              maxWidth={terminalWidth}
            />
          ))}
          
          {/* Show overflow indicator */}
          {history.length > availableHeight && (
            <Text color={theme.muted}>
              ↑ {history.length - availableHeight} more messages (Ctrl+S to show all)
            </Text>
          )}
        </Box>
        
        {/* Compact input */}
        <CompactInput
          input={input}
          isProcessing={isProcessing}
          streamingText={streamingText}
          terminalWidth={terminalWidth}
        />
        
        {/* Status bar */}
        <CompactStatusBar
          model={model}
          metrics={metrics}
          context={context}
          terminalWidth={terminalWidth}
        />
        
        {/* Minimal help */}
        <Text color={theme.muted}>
          Ctrl+E expand • Ctrl+S show all • Ctrl+X exit • /help commands
        </Text>
      </Box>
    );
  };
  
  // Streaming interface renderer
  const renderStreamingInterface = () => {
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
  
  // Update content reference and typewriter effect
  useEffect(() => {
    contentRef.current = content;
    
    // Reset if content changed
    if (isCompleteRef.current && content !== visibleText) {
      setCursorPos(0);
      setVisibleText('');
      isCompleteRef.current = false;
    }
  }, [content, visibleText]);

  // Typewriter effect for streaming mode
  useEffect(() => {
    if (mode !== InterfaceMode.STREAMING || !isStreaming || isCompleteRef.current) {
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
  }, [mode, content, isStreaming, cursorPos, charsPerSecond, onComplete]);

  // Typing effect for streaming response in streaming mode
  useEffect(() => {
    if (mode === InterfaceMode.STREAMING && currentResponse && !currentResponse.isComplete) {
      const targetLength = currentResponse.content.length;
      const currentLength = typingEffect[currentResponse.id] || 0;
      
      if (currentLength < targetLength) {
        const timer = setTimeout(() => {
          setTypingEffect(prev => ({
            ...prev,
            [currentResponse.id]: Math.min(currentLength + 1, targetLength)
          }));
        }, charsPerSecond);
        
        return () => clearTimeout(timer);
      }
    }
  }, [mode, currentResponse, typingEffect, charsPerSecond]);

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {renderModeInterface()}
      
      {/* UNIFIED Status bar - shows current mode and density */}
      <Box borderStyle="single" borderColor={theme.secondary} paddingX={1}>
        <Box justifyContent="space-between" width="100%">
          <Text color={theme.text}>
            Mode: <Text color={theme.accent}>{mode.toUpperCase()}</Text>
            {densityMode !== DensityMode.NORMAL && (
              <Text color={theme.muted}> • {densityMode.toUpperCase()}</Text>
            )}
          </Text>
          <Text color={theme.text} dimColor>
            {advancedFeaturesEnabled ? '🚀 Advanced' : '⚡ Standard'}
            {' '}• Ctrl+D density • Ctrl+C/V/M/A/L/K/S modes
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

// Helper functions
const getMediaIcon = (type: MediaType): string => {
  switch (type) {
    case MediaType.IMAGE: return '🖼️';
    case MediaType.AUDIO: return '🎵';
    case MediaType.VIDEO: return '🎬';
    case MediaType.DOCUMENT: return '📄';
    case MediaType.CODE: return '💻';
    default: return '📝';
  }
};

const formatFileSize = (size?: number): string => {
  if (!size) return '';
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
};

export default ModernInterface; 