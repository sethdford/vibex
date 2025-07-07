/**
 * Interface Orchestrator - Clean Architecture like Gemini CLI
 * 
 * Single responsibility: Coordinate interface components without business logic
 * Replaces the ModernInterface.tsx monolith
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';

// Interface components
import { ChatInterface } from './ChatInterface.js';
import { StreamingInterface } from './StreamingInterface.js';
import { CompactInterface } from './CompactInterface.js';
import { CanvasInterface } from './CanvasInterface.js';
import { MultimodalInterface } from './MultimodalInterface.js';

// Types
import {
  InterfaceMode,
  DensityMode,
  StreamingMode,
  StreamingState,
  ThinkingBlock,
  CanvasElement,
  MultimodalContent,
  CollaborationState,
  StreamingResponse,
  InterfaceTheme,
  PerformanceMetrics,
  ContextInfo
} from '../types/interface-types.js';
import { HistoryItem } from '../../types.js';

/**
 * Interface orchestrator props - consolidated from ModernInterface
 */
export interface InterfaceOrchestratorProps {
  // Core interface settings
  mode: InterfaceMode;
  densityMode?: DensityMode;
  streamingMode?: StreamingMode;
  streamingState?: StreamingState;
  
  // Layout
  terminalWidth: number;
  terminalHeight: number;
  
  // Data for different modes
  history?: HistoryItem[];
  input?: string;
  isProcessing?: boolean;
  streamingText?: string;
  model?: string;
  metrics?: PerformanceMetrics;
  context?: ContextInfo;
  
  // Specialized content
  multimodalContent?: MultimodalContent[];
  thinkingBlocks?: ThinkingBlock[];
  canvasElements?: CanvasElement[];
  collaboration?: CollaborationState;
  currentResponse?: StreamingResponse;
  
  // Streaming settings
  content?: string;
  isStreaming?: boolean;
  charsPerSecond?: number;
  showCursor?: boolean;
  showThinking?: boolean;
  showMetrics?: boolean;
  
  // Theme
  theme?: InterfaceTheme;
  
  // Callbacks
  onModeChange?: (mode: InterfaceMode) => void;
  onDensityChange?: (density: DensityMode) => void;
  onContentUpload?: (content: MultimodalContent) => void;
  onCanvasUpdate?: (elements: CanvasElement[]) => void;
  onThinkingInteraction?: (blockId: string, action: 'expand' | 'collapse' | 'copy') => void;
  onResponseInteraction?: (responseId: string, action: 'copy' | 'regenerate' | 'continue') => void;
  onSubmit?: (text: string) => void;
  onCancel?: () => void;
  onComplete?: () => void;
}

/**
 * Interface orchestrator component - coordinates focused interface components
 */
export const InterfaceOrchestrator: React.FC<InterfaceOrchestratorProps> = ({
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
  content = '',
  isStreaming = false,
  charsPerSecond = 50,
  showCursor = true,
  showThinking = true,
  showMetrics = true,
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
  // Local state for upload progress tracking
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Input handling for mode switching
  useInput(useCallback((input, key) => {
    if (!key.ctrl) return;
    
    switch (input.toLowerCase()) {
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
      case 'd':
        // Cycle through density modes
        const densities = [DensityMode.NORMAL, DensityMode.COMPACT, DensityMode.ULTRA_COMPACT];
        const currentIndex = densities.indexOf(densityMode);
        const nextDensity = densities[(currentIndex + 1) % densities.length];
        onDensityChange?.(nextDensity);
        break;
    }
  }, [mode, densityMode, onModeChange, onDensityChange]));

  // Handle multimodal content upload with progress
  const handleContentUpload = useCallback(async (content: MultimodalContent) => {
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

  // Render the appropriate interface based on mode
  const renderInterface = () => {
    switch (mode) {
      case InterfaceMode.CHAT:
        return (
          <ChatInterface
            terminalWidth={terminalWidth}
            terminalHeight={terminalHeight}
            thinkingBlocks={thinkingBlocks}
            theme={theme}
            onThinkingInteraction={onThinkingInteraction}
          />
        );
        
      case InterfaceMode.STREAMING:
        return (
          <StreamingInterface
            terminalWidth={terminalWidth}
            terminalHeight={terminalHeight}
            streamingState={streamingState}
            thinkingBlocks={thinkingBlocks}
            currentResponse={currentResponse}
            showThinking={showThinking}
            showMetrics={showMetrics}
            charsPerSecond={charsPerSecond}
            theme={theme}
            onThinkingInteraction={onThinkingInteraction}
            onResponseInteraction={onResponseInteraction}
          />
        );
        
      case InterfaceMode.COMPACT:
        return (
          <CompactInterface
            terminalWidth={terminalWidth}
            terminalHeight={terminalHeight}
            history={history}
            input={input}
            isProcessing={isProcessing}
            streamingText={streamingText}
            model={model}
            metrics={metrics}
            context={context}
            theme={theme}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        );
        
      case InterfaceMode.CANVAS:
        return (
          <CanvasInterface
            terminalWidth={terminalWidth}
            terminalHeight={terminalHeight}
            canvasElements={canvasElements}
            theme={theme}
            onCanvasUpdate={onCanvasUpdate}
          />
        );
        
      case InterfaceMode.MULTIMODAL:
        return (
          <MultimodalInterface
            terminalWidth={terminalWidth}
            terminalHeight={terminalHeight}
            multimodalContent={multimodalContent}
            uploadProgress={uploadProgress}
            theme={theme}
            onContentUpload={handleContentUpload}
          />
        );
        
      case InterfaceMode.ANALYSIS:
        return (
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
        
      case InterfaceMode.COLLABORATION:
        return (
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
        
      default:
        return (
          <ChatInterface
            terminalWidth={terminalWidth}
            terminalHeight={terminalHeight}
            thinkingBlocks={thinkingBlocks}
            theme={theme}
            onThinkingInteraction={onThinkingInteraction}
          />
        );
    }
  };

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Render the selected interface */}
      {renderInterface()}
      
      {/* Status bar - shows current mode and density */}
      <Box borderStyle="single" borderColor={theme.secondary} paddingX={1}>
        <Box justifyContent="space-between" width="100%">
          <Text color={theme.text}>
            Mode: <Text color={theme.accent}>{mode.toUpperCase()}</Text>
            {densityMode !== DensityMode.NORMAL && (
              <Text color={theme.muted}> • {densityMode.toUpperCase()}</Text>
            )}
          </Text>
          <Text color={theme.text} dimColor>
            Ctrl+D density • Ctrl+C/V/M/A/L/K/S modes
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default InterfaceOrchestrator; 