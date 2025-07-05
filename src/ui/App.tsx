/**
 * Main App Component
 * 
 * This is the root component for the Claude Code CLI terminal UI.
 * It orchestrates the entire UI interaction flow, manages state,
 * and coordinates between different components.
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Box,
  Static,
  Text,
  useStdin,
  useStdout,
  measureElement,
} from 'ink';
import type {
  DOMElement,
  useInput,
  Key as InkKeyType,
} from 'ink';

import { type HistoryItem, MessageType } from './types.js';
import { StreamingState } from './components/ModernInterface.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { useLoadingIndicator } from './hooks/useLoadingIndicator.js';
import { useThemeCommand } from './hooks/useThemeCommand.js';
import { useSettings } from './hooks/useSettings.js';
import { shouldDisableLoadingPhrases } from './utils/accessibilityUtils.js';
import { AccessibilitySettings } from './components/AccessibilitySettings.js';
import { useSlashCommandProcessor } from './hooks/slashCommandProcessor.js';
import { useAutoAcceptIndicator } from './hooks/useAutoAcceptIndicator.js';
import { useConsoleMessages } from './hooks/useConsoleMessages.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useClipboard } from './hooks/useClipboard.js';
import { Header } from './components/Header.js';
import { LoadingIndicator } from './components/LoadingIndicator.js';
import { AutoAcceptIndicator, ApprovalMode } from './components/AutoAcceptIndicator.js';
import { MemoryUsageDisplay } from './components/MemoryUsageDisplay.js';
import { PrivacyNotice } from './components/PrivacyNotice.js';
import { ToolStatsDisplay } from './components/ToolStatsDisplay.js';
import { InputPrompt } from './components/InputPrompt.js';
import { Footer } from './components/Footer.js';
import { ThemeDialog } from './components/ThemeDialog.js';
import { SettingsDialog } from './components/SettingsDialog.js';
import { Help } from './components/Help.js';
import { Colors } from './colors.js';
import { useClaude } from './hooks/useClaude.js';
import { useConsolePatcher } from './hooks/useConsolePatcher.js';
import { DetailedMessagesDisplay } from './components/DetailedMessagesDisplay.js';
import { HistoryItemDisplay } from './components/HistoryItemDisplay.js';
import { ContextSummaryDisplay } from './components/ContextSummaryDisplay.js';
import { useHistory } from './hooks/useHistoryManager.js';
import process from 'node:process';
import { StreamingContext } from './contexts/StreamingContext.js';
import { SessionStatsProvider, useSessionStats } from './contexts/SessionContext.js';
import { useTextBuffer } from './components/shared/text-buffer.js';
import * as fs from 'fs';
import { UpdateNotification } from './components/UpdateNotification.js';
import type { NotificationType } from './components/ClipboardNotification.js';
import { ClipboardNotification } from './components/ClipboardNotification.js';
import { checkForUpdates } from './utils/updateCheck.js';
import ansiEscapes from 'ansi-escapes';
import { OverflowProvider } from './contexts/OverflowContext.js';
import { ProgressProvider } from './contexts/ProgressContext.js';
import { ProgressDisplay } from './components/ProgressDisplay.js';
import { Tips } from './components/Tips.js';
import { ShowMoreLines } from './components/ShowMoreLines.js';
import { LiveToolFeedback, useLiveToolFeedback } from './components/LiveToolFeedback.js';
import { ToolExecutionFeed, useToolExecutionFeed } from './components/ToolExecutionFeed.js';
import { loadConfig } from '../config/index.js';
import { getAIClient } from '../ai/index.js';
import { logger } from '../utils/logger.js';
import type { AppConfigType } from '../config/schema.js';
import type { IntegratedConfig } from '../config/claude-integration.js';
// Advanced UI Components
import { ModernInterface, InterfaceMode, DensityMode as ModernDensityMode } from './components/ModernInterface.js';
import { MultimodalContentHandler, ProcessingStatus } from './components/MultimodalContentHandler.js';
import type { MultimodalContent, ThinkingBlock, CanvasElement, CollaborationState } from './components/ModernInterface.js';
import type { MultimodalContentItem, ProcessingCapabilities, ContentType } from './components/MultimodalContentHandler.js';

// @ Command Processing
import { useAtCommandProcessor } from './hooks/useAtCommandProcessor.js';
import type { AtCommandResult } from './hooks/useAtCommandProcessor.js';

// UI Density Management
import { useDensityMetrics } from './utils/density-metrics.js';
import { useProgressiveDisclosure } from './hooks/useProgressiveDisclosure.js';
import type { DensityMetrics } from './utils/density-metrics.js';

const CTRL_EXIT_PROMPT_DURATION_MS = 1000;

/**
 * App configuration interface - using integrated configuration with Claude optimizations
 */
export interface AppConfig extends Omit<IntegratedConfig, 'debug'> {
  debug?: boolean;
  targetDir?: string;
  [key: string]: unknown;
}

/**
 * App settings interface - compatible with useSettings hook
 */
export interface AppSettings {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * App props interface
 */
interface AppProps {
  /**
   * Application configuration
   */
  config: AppConfig;
  
  /**
   * Initial context to pass to the chat
   */
  initialContext?: string;
  
  /**
   * User settings
   */
  settings?: AppSettings;
  
  /**
   * Optional warnings to display at startup
   */
  startupWarnings?: string[];
  
  /**
   * Update message to display
   */
  updateMessage?: string | null;
  
  /**
   * Callback when the app exits
   */
  onExit?: () => void;
}

/**
 * Session stats provider wrapper for the main App
 */
export const AppWrapper = (props: AppProps) => (
  <SessionStatsProvider>
    <ProgressProvider>
      <App {...props} />
    </ProgressProvider>
  </SessionStatsProvider>
);

/**
 * UI Density Mode enumeration - using ModernInterface DensityMode
 */
export const DensityMode = ModernDensityMode;

/**
 * Main App component
 */
const App = ({ config, initialContext, settings = {}, startupWarnings = [], updateMessage = null, onExit }: AppProps) => {
  // Terminal and state hooks
  const [showTips, setShowTips] = useState<boolean>(false); // Start hidden like Gemini CLI
  const { stdout } = useStdout();

  // Conversation history management
  const { history, addItem, clearItems, loadHistory } = useHistory();
  const {
    consoleMessages,
    handleNewMessage,
    clearConsoleMessages: clearConsoleMessagesState,
  } = useConsoleMessages();
  const { stats: sessionStats } = useSessionStats();
  
  // UI state management
  const [staticNeedsRefresh, setStaticNeedsRefresh] = useState(false);
  const [staticKey, setStaticKey] = useState(0);
  const refreshStatic = useCallback(() => {
    stdout.write(ansiEscapes.clearTerminal);
    setStaticKey(prev => prev + 1);
  }, [setStaticKey, stdout]);

  // UI control states
  const [contextFileCount, setContextFileCount] = useState<number>(0);
  const [debugMessage, setDebugMessage] = useState<string>('');
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState<number>(0);
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);
  const [showToolDescriptions, setShowToolDescriptions] = useState<boolean>(false);
  const [ctrlCPressedOnce, setCtrlCPressedOnce] = useState(false);
  const [quittingMessages, setQuittingMessages] = useState<HistoryItem[] | null>(null);
  const ctrlCTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [ctrlDPressedOnce, setCtrlDPressedOnce] = useState(false);
  const ctrlDTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [constrainHeight, setConstrainHeight] = useState<boolean>(true);

  // Modern Interface State Management
  const [interfaceMode, setInterfaceMode] = useState<InterfaceMode>(InterfaceMode.CHAT);
  const [multimodalContent, setMultimodalContent] = useState<MultimodalContent[]>([]);
  const [thinkingBlocks, setThinkingBlocks] = useState<ThinkingBlock[]>([]);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [collaboration, setCollaboration] = useState<CollaborationState>({
    isActive: false,
    participants: [],
    sharedContext: {}
  });
  const [advancedFeaturesEnabled, setAdvancedFeaturesEnabled] = useState<boolean>(true);
  
  // UI Density Management State
  const [densityMode, setDensityMode] = useState<typeof DensityMode[keyof typeof DensityMode]>(DensityMode.NORMAL);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const mainContentRef = useRef<HTMLElement | null>(null);
  
  // Density metrics monitoring (only when ref is available)
  const { metrics: densityMetrics, measureDensity } = useDensityMetrics(
    mainContentRef as React.RefObject<HTMLElement>
  );
  
  // Progressive disclosure for collapsible sections
  const progressiveDisclosure = useProgressiveDisclosure([
    { id: 'history', priority: 80, defaultExpanded: true },
    { id: 'context', priority: 70, defaultExpanded: false },
    { id: 'tools', priority: 60, defaultExpanded: false },
    { id: 'debug', priority: 40, defaultExpanded: false },
    { id: 'stats', priority: 50, defaultExpanded: false },
  ]);

  // Multimodal Content Handler State
  const [contentItems, setContentItems] = useState<MultimodalContentItem[]>([]);
  const [processingCapabilities] = useState<ProcessingCapabilities>({
    imageAnalysis: true,
    audioTranscription: true,
    videoAnalysis: true,
    documentExtraction: true,
    codeAnalysis: true,
    realTimeProcessing: true,
    batchProcessing: true,
    cloudProcessing: true
  });

  // Error tracking
  const errorCount = useMemo(
    () => consoleMessages.filter(msg => msg.type === 'error').length,
    [consoleMessages],
  );

  // Settings management
  const {
    settings: userSettings,
    settingDefinitions,
    saveSetting,
    error: settingsError
  } = useSettings(settings);
  
  // Tool execution feedback
  const {
    currentFeedback,
    startFeedback,
    updateFeedback,
    completeFeedback,
    clearFeedback
  } = useLiveToolFeedback();
  
  // Tool execution feed
  const {
    feedVisible,
    feedMode,
    showFeed,
    hideFeed,
    toggleFeed
  } = useToolExecutionFeed();
  
  // Settings dialog state
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  
  // Accessibility settings dialog state
  const [isAccessibilityDialogOpen, setIsAccessibilityDialogOpen] = useState(false);
  
  // Theme management
  const {
    isThemeDialogOpen,
    openThemeDialog,
    handleThemeSelect,
    handleThemeHighlight,
  } = useThemeCommand(userSettings, setThemeError, addItem);

  // Context file management
  const refreshContextFiles = useCallback(async () => {
    addItem(
      {
        type: MessageType.INFO,
        text: 'Refreshing context files (CLAUDE.md or other context files)...',
      },
      Date.now(),
    );
    
    try {
      // For Claude Code, we'll implement our own context loading logic
      // This is a placeholder - we'll need to implement the actual logic
      const memoryContent = '';
      const fileCount = 0;
      
      setContextFileCount(fileCount);

      addItem(
        {
          type: MessageType.INFO,
          text: `Memory refreshed successfully. ${memoryContent.length > 0 ? `Loaded ${memoryContent.length} characters from ${fileCount} file(s).` : 'No memory content found.'}`,
        },
        Date.now(),
      );
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addItem(
        {
          type: MessageType.ERROR,
          text: `Error refreshing memory: ${errorMessage}`,
        },
        Date.now(),
      );
      logger.error('Error refreshing memory:', error);
    }
  }, [addItem]);

  // Claude configuration initialization
  useEffect(() => {
    const initializeClaudeConfig = async () => {
      try {
        if (config.claude) {
          logger.info('🤖 Claude-optimized configuration detected', {
            version: config.claude.version,
            conversationMode: config.claude.conversation.enableAdvancedReasoning,
            uiMode: config.claude.ui.defaultInterfaceMode,
            performanceMode: config.claude.performance.enableParallelProcessing
          });
          
          // Apply Claude UI optimizations
          if (config.claude.ui.defaultInterfaceMode) {
            const modeMap: Record<string, InterfaceMode> = {
              'chat': InterfaceMode.CHAT,
              'canvas': InterfaceMode.CANVAS,
              'multimodal': InterfaceMode.MULTIMODAL,
              'analysis': InterfaceMode.ANALYSIS,
              'collaboration': InterfaceMode.COLLABORATION,
              'compact': InterfaceMode.COMPACT,
              'streaming': InterfaceMode.STREAMING
            };
            const claudeMode = modeMap[config.claude.ui.defaultInterfaceMode];
            if (claudeMode) {
              setInterfaceMode(claudeMode);
              logger.debug(`Interface mode set to: ${claudeMode}`);
            }
          }
          
          // Apply density mode from Claude config
          if (config.claude.ui.densityMode) {
            const densityMap: Record<string, typeof DensityMode[keyof typeof DensityMode]> = {
              'ultra-compact': DensityMode.ULTRA_COMPACT,
              'compact': DensityMode.COMPACT,
              'normal': DensityMode.NORMAL,
              'spacious': DensityMode.ADAPTIVE // Map spacious to adaptive
            };
            const claudeDensity = densityMap[config.claude.ui.densityMode];
            if (claudeDensity) {
              setDensityMode(claudeDensity);
              setIsCompactMode(claudeDensity === DensityMode.COMPACT || claudeDensity === DensityMode.ULTRA_COMPACT);
              logger.debug(`Density mode set to: ${claudeDensity}`);
            }
          }
          
          // Enable advanced features if configured
          if (config.claude.features) {
            setAdvancedFeaturesEnabled(
              config.claude.features.workflowOrchestration.enableRealTimeOrchestration ||
              config.claude.features.multimodalContent.enableImageAnalysis ||
              config.claude.features.collaboration.enableRealTimeCollaboration
            );
          }
        }
      } catch (error) {
        logger.warn('Failed to initialize Claude configuration:', error);
      }
    };
    
    initializeClaudeConfig();
  }, [config]);

  // Automatic context loading on startup - made optional to prevent UI hanging
  useEffect(() => {
    const loadInitialContext = async () => {
      // Skip context loading if not in full context mode to prevent startup hangs
      if (!config.fullContext) {
        logger.debug('Skipping automatic context loading (not in full context mode)');
        return;
      }
      
      try {
        logger.info('🔍 Loading project context automatically...');
        
        // Use the context system for better performance and maintainability
        const { createContextSystem } = await import('../context/context-system.js');
        const contextSystem = createContextSystem();
        const result = await contextSystem.loadContext();
        
        if (result.stats.totalFiles > 0) {
          logger.info(`✅ Loaded project context: ${result.stats.totalFiles} files, ${result.stats.totalSize} characters`);
          
          // Update context file count for UI
          setContextFileCount(result.stats.totalFiles);
          
          // Count entries by type for display
          const globalFiles = result.entries.filter(e => e.type === 'global');
          const projectFiles = result.entries.filter(e => e.type === 'project');
          const currentFiles = result.entries.filter(e => e.type === 'directory' && e.scope === '.');
          
          // Add a subtle notification about context loading
          addItem(
            {
              type: MessageType.INFO,
              text: `📁 Project context loaded: ${result.stats.totalFiles} files (${result.stats.totalSize.toLocaleString()} characters)\n• Global context: ${globalFiles.length} files\n• Project context: ${projectFiles.length} files\n• Current directory: ${currentFiles.length} files\n• Use /memory show for details`,
            },
            Date.now(),
          );
        } else {
          logger.debug('No project context files found');
          // Don't show a message if no context is found - keep startup clean
        }
        
        // If there are any errors, log them but don't interrupt startup
        if (result.errors.length > 0) {
          logger.warn(`Context loading warnings: ${result.errors.length} errors`);
          result.errors.forEach((error: string) => {
            logger.warn(`Context error: ${error}`);
          });
        }
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to load initial context:', errorMessage);
        // Don't show error to user unless it's critical - keep startup clean
      }
    };
    
    // Only load context if in full context mode, and with a longer delay to ensure UI is ready
    if (config.fullContext) {
      const timeoutId = setTimeout(loadInitialContext, 1500);
      return () => clearTimeout(timeoutId);
    }
    
    // For normal mode, just add a welcome message
    addItem(
      {
        type: MessageType.INFO,
        text: `🚀 VibeX ready! Use --full-context flag for automatic project analysis, or /context load to load context manually.`,
      },
      Date.now(),
    );
    
  }, [addItem, config.fullContext]);

  // Command processing
  const {
    processSlashCommand: handleSlashCommand,
    slashCommands,
    pendingHistoryItems,
    clearPendingItems
  } = useSlashCommandProcessor(
    { ...config, debug: config.debug ?? false } as AppConfigType,
    settings,
    history,
    addItem,
    clearItems,
    loadHistory,
    refreshStatic,
    setShowHelp,
    setDebugMessage,
    openThemeDialog,
    refreshContextFiles,
    showToolDescriptions,
    setQuittingMessages
  );

  // Terminal dimensions
  const { rows: terminalHeight, columns: terminalWidth } = useTerminalSize();
  const isInitialMount = useRef(true);
  const { stdin, setRawMode } = useStdin();
  
  // File validation helper
  const isValidPath = useCallback((filePath: string): boolean => {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch (_e) {
      return false;
    }
  }, []);

  // Input dimensions
  const widthFraction = 0.9;
  const inputWidth = Math.max(
    20,
    Math.floor(terminalWidth * widthFraction) - 3,
  );
  const suggestionsWidth = Math.max(60, Math.floor(terminalWidth * 0.8));

  // Text input buffer
  const buffer = useTextBuffer({
    initialText: '',
    viewport: { height: 10, width: inputWidth },
    stdin,
    setRawMode,
    isValidPath,
  });

  // Exit handler for Ctrl+C/Ctrl+D
  const handleExit = useCallback(
    (
      pressedOnce: boolean,
      setPressedOnce: (value: boolean) => void,
      timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
    ) => {
      if (pressedOnce) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        const quitCommand = slashCommands.find(
          cmd => cmd.name === 'quit' || cmd.altName === 'exit',
        );
        if (quitCommand) {
          quitCommand.action('quit', '', '');
        } else {
          process.exit(0);
        }
      } else {
        setPressedOnce(true);
        timerRef.current = setTimeout(() => {
          setPressedOnce(false);
          timerRef.current = null;
        }, CTRL_EXIT_PROMPT_DURATION_MS);
      }
    },
    [slashCommands],
  );

  // Clear screen handler
  const handleClearScreen = useCallback(() => {
    clearItems();
    clearConsoleMessagesState();
    console.clear();
    refreshStatic();
  }, [clearItems, clearConsoleMessagesState, refreshStatic]);

  // Modern Interface Callback Handlers
  const handleModeChange = useCallback((mode: InterfaceMode) => {
    setInterfaceMode(mode);
    // Add mode-specific initialization logic here
    switch (mode) {
      case InterfaceMode.MULTIMODAL:
        // Initialize multimodal capabilities
        break;
      case InterfaceMode.CANVAS:
        // Initialize canvas elements
        break;
      case InterfaceMode.ANALYSIS:
        // Initialize analysis mode
        break;
      case InterfaceMode.COLLABORATION:
        // Initialize collaboration
        break;
      default:
        break;
    }
  }, []);

  const handleContentUpload = useCallback((content: MultimodalContent) => {
    setMultimodalContent(prev => [...prev, content]);
    // Process the content with Claude
    // This would integrate with the Claude API for multimodal processing
  }, []);

  const handleCanvasUpdate = useCallback((elements: CanvasElement[]) => {
    setCanvasElements(elements);
  }, []);

  const handleThinkingInteraction = useCallback((blockId: string, action: 'expand' | 'collapse' | 'copy') => {
    setThinkingBlocks(prev => prev.map(block => 
      block.id === blockId ? { ...block, isVisible: action === 'expand' } : block
    ));
    if (action === 'copy') {
      const block = thinkingBlocks.find(b => b.id === blockId);
      if (block) {
        // We'll handle this after copyToClipboard is defined
      }
    }
  }, [thinkingBlocks]);

  // Multimodal Content Handler Callbacks
  const handleMultimodalContentUpload = useCallback((files: File[]) => {
    // Convert File objects to MultimodalContentItem
    files.forEach(file => {
      const newItem: MultimodalContentItem = {
        id: `file-${Date.now()}-${Math.random()}`,
        type: file.type.startsWith('image/') ? 'image' as ContentType :
              file.type.startsWith('audio/') ? 'audio' as ContentType :
              file.type.startsWith('video/') ? 'video' as ContentType :
              'document' as ContentType,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        status: ProcessingStatus.PENDING,
        uploadedAt: Date.now()
      };
      setContentItems(prev => [...prev, newItem]);
    });
  }, []);

  const handleContentAnalyze = useCallback((contentId: string) => {
    // Trigger analysis for the content item
    setContentItems(prev => prev.map(item => 
      item.id === contentId ? { ...item, status: ProcessingStatus.ANALYZING } : item
    ));
    // Here we would integrate with Claude API for content analysis
  }, []);

  const handleContentRemove = useCallback((contentId: string) => {
    setContentItems(prev => prev.filter(item => item.id !== contentId));
  }, []);

  const handleBatchProcess = useCallback((contentIds: string[]) => {
    // Process multiple content items
    setContentItems(prev => prev.map(item => 
      contentIds.includes(item.id) ? { ...item, status: ProcessingStatus.ANALYZING } : item
    ));
  }, []);

  const handleContentInteraction = useCallback((contentId: string, action: 'view' | 'edit' | 'share' | 'export') => {
    // Handle content interaction actions
    const item = contentItems.find(item => item.id === contentId);
    if (item) {
      switch (action) {
        case 'view':
          // Open content viewer
          break;
        case 'edit':
          // Open content editor
          break;
        case 'share':
          // Share content
          break;
        case 'export':
          // Export content
          break;
      }
    }
  }, [contentItems]);

  // Clipboard integration
  const { copyToClipboard, pasteFromClipboard } = useClipboard();
  
  // Clipboard notification state
  const [clipboardNotification, setClipboardNotification] = useState<{
    message: string;
    type: NotificationType;
  } | null>(null);
  
  // Privacy notice state
  const [showPrivacyNotice, setShowPrivacyNotice] = useState<boolean>(false); // Start hidden like Gemini CLI
  
  // Tool stats - only populated from actual tool usage (no mock data)
  const [toolStats, setToolStats] = useState<any[]>([]);
  
  // Tool stats would be populated from actual tool usage in a real implementation
  // For now, keep empty to match Gemini CLI's clean startup
  
  // Define keyboard shortcuts
  const { registerShortcut } = useKeyboardShortcuts({
    shortcuts: [
      {
        name: 'toggleSettings',
        description: 'Open settings dialog',
        ctrl: true,
        key: ',',
        action: () => setIsSettingsDialogOpen(true),
      },
      {
        name: 'toggleAccessibilitySettings',
        description: 'Open accessibility settings',
        ctrl: true,
        alt: true,
        key: 'a',
        action: () => setIsAccessibilityDialogOpen(true),
      },
      {
        name: 'copyLastResponse',
        description: 'Copy last response',
        ctrl: true,
        key: 'y',
        action: async () => {
          // Find the last assistant message
          const lastAssistantMessage = [...history]
            .reverse()
            .find(item => item.type === 'assistant');
          
          if (lastAssistantMessage?.text) {
            const success = await copyToClipboard(lastAssistantMessage.text);
            if (success) {
              setClipboardNotification({
                message: 'Last response copied to clipboard',
                type: 'success'
              });
            } else {
              setClipboardNotification({
                message: 'Failed to copy to clipboard',
                type: 'error'
              });
            }
          } else {
            setClipboardNotification({
              message: 'No response to copy',
              type: 'info'
            });
          }
        },
      },
      {
        name: 'toggleErrorDetails',
        description: 'Toggle error details',
        ctrl: true,
        key: 'o',
        action: () => setShowErrorDetails(prev => !prev),
      },
      {
        name: 'toggleToolDescriptions',
        description: 'Toggle tool descriptions',
        ctrl: true,
        key: 't',
        action: () => setShowToolDescriptions(prev => !prev),
      },
      {
        name: 'toggleHeightConstraint',
        description: 'Toggle height constraint',
        ctrl: true,
        key: 's',
        action: () => setConstrainHeight(prev => !prev),
      },
      {
        name: 'clearScreen',
        description: 'Clear screen',
        ctrl: true,
        key: 'l',
        action: handleClearScreen,
      },
      {
        name: 'showHelp',
        description: 'Show help',
        ctrl: true,
        key: 'h',
        action: () => setShowHelp(true),
      },
      {
        name: 'toggleTips',
        description: 'Toggle tips display',
        ctrl: true,
        key: 'i',
        action: () => setShowTips(prev => !prev),
      },
      {
        name: 'toggleModernInterface',
        description: 'Toggle modern interface mode',
        ctrl: true,
        key: 'm',
        action: () => setInterfaceMode(prev => 
          prev === InterfaceMode.CHAT ? InterfaceMode.MULTIMODAL : InterfaceMode.CHAT
        ),
      },
      {
        name: 'toggleCompactMode',
        description: 'Toggle compact interface density mode',
        ctrl: true,
        key: 'k',
        action: () => setIsCompactMode(prev => !prev),
      },
      {
        name: 'closeHelp',
        description: 'Close help',
        key: 'escape',
        action: () => setShowHelp(false),
        isActive: showHelp,
      },
      {
        name: 'exitApp',
        description: 'Exit application',
        ctrl: true,
        key: 'c',
        action: () => handleExit(ctrlCPressedOnce, setCtrlCPressedOnce, ctrlCTimerRef),
      },
      {
        name: 'exitAppAlt',
        description: 'Exit application (alternative)',
        ctrl: true,
        key: 'd',
        action: () => {
          if (buffer.text.length === 0) {
            handleExit(ctrlDPressedOnce, setCtrlDPressedOnce, ctrlDTimerRef);
          }
        },
      },
    ],
    isActive: !isThemeDialogOpen && !isSettingsDialogOpen && !isAccessibilityDialogOpen,
    debug: config?.debug,
  });

  // Console message handling
  useConsolePatcher({
    onNewMessage: handleNewMessage,
    debugMode: config?.debug || false,
  });

  // Claude AI streaming
  const {
    streamingState,
    submitQuery,
    initError,
    pendingHistoryItems: pendingClaudeHistoryItems,
    thought,
    streamingText,
    streamingItemId,
  } = useClaude(
    getAIClient() as any, // TODO: Fix type compatibility between AIClient and ClaudeClient
    history,
    addItem,
    setShowHelp,
    { ...config, debug: config.debug ?? false } as AppConfigType,
    setDebugMessage,
    handleSlashCommand,
    refreshContextFiles,
  );
  
  // Combine pending items from different sources without mutation
  const allPendingHistoryItems = useMemo(() => {
    const combined = [...pendingHistoryItems, ...pendingClaudeHistoryItems];
    // Ensure each item has a unique key by adding source prefix if needed
    return combined.map((item, index) => ({
      ...item,
      id: item.id || `combined-${index}-${Date.now()}`
    }));
  }, [pendingHistoryItems, pendingClaudeHistoryItems]);
  
  // Loading indicator state
  const { elapsedTime, currentLoadingPhrase } = useLoadingIndicator(streamingState);
  
  // Auto-accept indicator
  const autoAcceptIndicatorState = useAutoAcceptIndicator({ ...config, debug: config.debug ?? false } as AppConfigType, false);

  // @ Command Processor
  const { processAtCommand } = useAtCommandProcessor({
    maxFileSize: 1024 * 1024, // 1MB
    respectGitIgnore: true
  });

  // Handle submission of user query with @ command processing
  const handleFinalSubmit = useCallback(
    async (submittedValue: string) => {
      const trimmedValue = submittedValue.trim();
      if (trimmedValue.length > 0) {
        try {
          // Process @ commands first
          const atResult: AtCommandResult = await processAtCommand(trimmedValue);
          
          if (atResult.processedQuery && atResult.processedQuery.length > 0) {
            // Combine all processed query parts into a single string
            const finalQuery = atResult.processedQuery.map(part => part.text).join('');
            
            // Log file injection for debugging
            if (atResult.fileContents && atResult.fileContents.length > 0) {
              logger.debug(`Injected ${atResult.fileContents.length} files into query`, {
                files: atResult.fileContents.map(f => f.path)
              });
            }
            
            submitQuery(finalQuery);
          } else {
            // Fallback to original query if processing fails
            submitQuery(trimmedValue);
          }
        } catch (error) {
          logger.error('Error processing @ commands, using original query', error);
          submitQuery(trimmedValue);
        }
      }
    },
    [submitQuery, processAtCommand],
  );

  // User message history
  const [userMessages, setUserMessages] = useState<string[]>([]);

  useEffect(() => {
    // Extract user messages for input history
    const currentSessionUserMessages = history
      .filter(
        (item): item is HistoryItem & { type: MessageType.USER; text: string } =>
          item.type === MessageType.USER &&
          typeof item.text === 'string' &&
          item.text.trim() !== '',
      )
      .map(item => item.text)
      .reverse(); // Newest first

    // Set user messages for input history
    setUserMessages([...currentSessionUserMessages]);
  }, [history]);

  // Input active state
  const isInputActive = streamingState === StreamingState.IDLE && !initError;

  // Track whether initial context has been submitted and store initial context
  const initialContextSubmittedRef = useRef(false);
  const initialContextRef = useRef(initialContext);

  // Auto-submit initial context when component mounts (only once)
  useEffect(() => {
    const contextToSubmit = initialContextRef.current;
    
    // Only run once on mount when we have initial context
    if (
      contextToSubmit?.trim() && 
      !initialContextSubmittedRef.current
    ) {
      // Mark as submitted immediately to prevent re-submission
      initialContextSubmittedRef.current = true;
      
      // Use a timeout to wait for initialization, but only once
      const timeoutId = setTimeout(() => {
        const trimmedValue = contextToSubmit.trim();
        if (trimmedValue.length > 0) {
          // Use handleFinalSubmit to properly process @ commands
          // This ensures @ commands are expanded before sending to Claude
          handleFinalSubmit(trimmedValue);
        }
      }, 500); // Wait 500ms for initialization
      
      // Cleanup timeout on unmount
      return () => clearTimeout(timeoutId);
    }
  }, [handleFinalSubmit]); // Add handleFinalSubmit to dependencies

  // Footer height measurement
  const mainControlsRef = useRef<DOMElement>(null);
  const pendingHistoryItemRef = useRef<DOMElement>(null);

  useEffect(() => {
    if (mainControlsRef.current) {
      const fullFooterMeasurement = measureElement(mainControlsRef.current);
      setFooterHeight(fullFooterMeasurement.height);
    }
  }, [terminalHeight, consoleMessages, showErrorDetails]);

  // Calculate available height for content
  const staticExtraHeight = /* margins and padding */ 3;
  const availableTerminalHeight = useMemo(
    () => terminalHeight - footerHeight - staticExtraHeight,
    [terminalHeight, footerHeight],
  );

  // Handle terminal resizing with debounced refresh (like Gemini CLI)
  useEffect(() => {
    // skip refreshing Static during first mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // debounce so it doesn't fire up too often during resize (300ms like Gemini)
    const handler = setTimeout(() => {
      setStaticNeedsRefresh(false);
      refreshStatic();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [terminalWidth, terminalHeight, refreshStatic]);

  useEffect(() => {
    if (streamingState === StreamingState.IDLE && staticNeedsRefresh) {
      setStaticNeedsRefresh(false);
      refreshStatic();
    }
  }, [streamingState, refreshStatic, staticNeedsRefresh]);

  // Filter console messages based on debug mode
  const filteredConsoleMessages = useMemo(() => {
    if (config?.debug) {
      return consoleMessages;
    }
    return consoleMessages.filter(msg => msg.type !== 'debug');
  }, [consoleMessages, config]);

  // Context file names
  const contextFileNames = useMemo(() => ['CLAUDE.md'], []);

  // Use provided update message or check for updates
  useEffect(() => {
    if (updateMessage) {
      // Update message already provided as prop, no need to set state
    } else {
      checkForUpdates().then(msg => {
        // Handle update message if needed
        if (msg) {
          logger.info('Update available:', msg);
        }
      });
    }
  }, [updateMessage]);

  // If quitting, show the quitting messages only
  if (quittingMessages) {
    return (
      <Box flexDirection="column" marginBottom={1}>
        {quittingMessages.map((item, index) => (
          <HistoryItemDisplay
            key={item.id || `quitting-${index}`}
            availableTerminalHeight={
              constrainHeight ? availableTerminalHeight : undefined
            }
            terminalWidth={terminalWidth}
            item={item}
            isPending={false}
            config={config}
          />
        ))}
      </Box>
    );
  }

  // Main layout sizes (like Gemini CLI)
  const mainAreaWidth = Math.floor(terminalWidth * 0.9);
  const debugConsoleMaxHeight = Math.floor(Math.max(terminalHeight * 0.2, 5));
  // Arbitrary threshold to ensure that items in the static area are large
  // enough but not too large to make the terminal hard to use (from Gemini CLI)
  const staticAreaMaxItemHeight = Math.max(terminalHeight * 4, 100);

  return (
    <StreamingContext.Provider value={streamingState}>
      <Box flexDirection="column" width="95%">
        {/*
         * Static component renders items once and preserves them
         * as the terminal scrolls, creating a persistent history
         */}
        <Static
          key={staticKey}
          items={[
            <Box flexDirection="column" key="header">
              <Header terminalWidth={terminalWidth} />
              {updateMessage && <UpdateNotification message={updateMessage} />}
              {clipboardNotification && (
                <ClipboardNotification
                  message={clipboardNotification.message}
                  type={clipboardNotification.type}
                  onDismiss={() => setClipboardNotification(null)}
                />
              )}
              
              {/* Privacy Notice */}
              {showPrivacyNotice && (
                <PrivacyNotice
                  title="Privacy & Telemetry Notice"
                  message="Vibex collects anonymous usage data to improve the tool. No personal data or code content is collected."
                  details="Usage data includes command invocations, error rates, and performance metrics. You can disable telemetry in settings."
                  dismissable={true}
                  level="info"
                  onAcknowledge={() => {
                    setShowPrivacyNotice(false);
                    // In a real app, we would save this preference
                    // saveSetting('privacyConsentGiven', true);
                  }}
                />
              )}
              
              {/* Show tips if enabled */}
              {showTips && (
                <Tips 
                  maxWidth={Math.floor(terminalWidth * 0.8)}
                  onDismiss={() => setShowTips(false)}
                />
              )}
            </Box>,
            ...history.map((h, index) => (
              <HistoryItemDisplay
                terminalWidth={mainAreaWidth}
                availableTerminalHeight={Math.min(staticAreaMaxItemHeight, 15)}
                key={h.id || `history-${h.timestamp}-${index}`}
                item={h}
                isPending={false}
                config={config}
              />
            )),
          ]}
        >
          {item => item}
        </Static>
        <OverflowProvider>
          <Box ref={pendingHistoryItemRef} flexDirection="column">
            {allPendingHistoryItems.map((item, i) => (
                <HistoryItemDisplay
                  key={item.id}
                  availableTerminalHeight={
                    constrainHeight ? Math.min(availableTerminalHeight, 12) : 12
                  }
                  terminalWidth={mainAreaWidth}
                  // Pending items may not have an ID yet
                  item={{ ...item, id: item.id || `pending-${i}` }}
                  isPending={true}
                  config={config}
                  isFocused={!isThemeDialogOpen}
                />
              ))}
            <ShowMoreLines constrainHeight={constrainHeight} />
          </Box>
        </OverflowProvider>

        {showHelp && <Help commands={slashCommands} />}

        <Box flexDirection="column" ref={mainControlsRef}>
          {startupWarnings.length > 0 && (
            <Box
              borderStyle="round"
              borderColor={Colors.Warning}
              paddingX={1}
              flexDirection="column"
            >
              {startupWarnings.map((warning, index) => (
                <Text key={index} color={Colors.Warning}>
                  {warning}
                </Text>
              ))}
            </Box>
          )}

          {/* Interface Mode Indicator */}
          {interfaceMode !== InterfaceMode.CHAT && (
            <Box borderStyle="single" borderColor={Colors.AccentBlue} paddingX={1} marginY={1}>
              <Text color={Colors.AccentBlue} bold>
                🚀 Modern Interface Mode: {interfaceMode.toUpperCase()}
              </Text>
              <Text color={Colors.TextDim}>
                {' '}• Press Ctrl+M to return to chat mode • Ctrl+V Canvas • Ctrl+A Analysis
              </Text>
            </Box>
          )}

          {/*
           * Main content area - conditionally wrapped with CompactInterface
           */}
          <Box 
            flexDirection="column" 
            width="100%" 
            minHeight={0}
          >
            {isCompactMode ? (
              <ModernInterface
                mode={InterfaceMode.COMPACT}
                densityMode={densityMode === DensityMode.COMPACT ? ModernDensityMode.COMPACT : 
                           densityMode === DensityMode.ULTRA_COMPACT ? ModernDensityMode.ULTRA_COMPACT :
                           ModernDensityMode.NORMAL}
                terminalWidth={terminalWidth}
                terminalHeight={terminalHeight}
                history={history}
                input={buffer.text}
                isProcessing={streamingState !== StreamingState.IDLE}
                streamingText={streamingText}
                model={config?.claude?.model || 'claude-sonnet-4-20250514'}
                metrics={{
                  tokensUsed: sessionStats.currentResponse.totalTokenCount,
                  responseTime: elapsedTime,
                  memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
                }}
                context={{
                  filesLoaded: contextFileCount,
                  projectName: config?.targetDir?.split('/').pop() || 'vibex',
                  gitBranch: undefined // Could be added later
                }}
                onSubmit={handleFinalSubmit}
                onCancel={() => {
                  // Handle cancel if needed
                }}
                onModeChange={setInterfaceMode}
                onDensityChange={(density) => setDensityMode(density)}
              />
            ) : (
              /* Normal mode - existing content */
              <>
                {isThemeDialogOpen ? (
                  <Box flexDirection="column">
                    {themeError && (
                      <Box marginBottom={1}>
                        <Text color={Colors.Error}>{themeError}</Text>
                      </Box>
                    )}
                    <ThemeDialog
                      onSelect={handleThemeSelect}
                      onHighlight={handleThemeHighlight}
                      settings={userSettings}
                      availableTerminalHeight={
                        constrainHeight
                          ? terminalHeight - staticExtraHeight
                          : undefined
                      }
                      terminalWidth={mainAreaWidth}
                    />
                  </Box>
                ) : isAccessibilityDialogOpen ? (
                  <Box flexDirection="column">
                    {settingsError && (
                      <Box marginBottom={1}>
                        <Text color={Colors.Error}>{settingsError}</Text>
                      </Box>
                    )}
                    <AccessibilitySettings
                      onClose={() => setIsAccessibilityDialogOpen(false)}
                      terminalWidth={mainAreaWidth}
                    />
                  </Box>
                ) : isSettingsDialogOpen ? (
                  <Box flexDirection="column">
                    {settingsError && (
                      <Box marginBottom={1}>
                        <Text color={Colors.Error}>{settingsError}</Text>
                      </Box>
                    )}
                    <SettingsDialog
                      settings={settingDefinitions}
                      onSave={saveSetting}
                      onClose={() => setIsSettingsDialogOpen(false)}
                      availableTerminalHeight={
                        constrainHeight
                          ? terminalHeight - staticExtraHeight
                          : undefined
                      }
                      terminalWidth={mainAreaWidth}
                    />
                  </Box>
                ) : (
                  <>
                    <LoadingIndicator
                      thought={
                        streamingState === StreamingState.TOOL_EXECUTING ||
                        shouldDisableLoadingPhrases({ ...config, debug: config.debug ?? false } as AppConfigType)
                          ? undefined
                          : thought
                      }
                      currentLoadingPhrase={
                        shouldDisableLoadingPhrases({ ...config, debug: config.debug ?? false } as AppConfigType)
                          ? undefined
                          : currentLoadingPhrase
                      }
                      elapsedTime={elapsedTime}
                    />
                    
                    {/* Live Tool Execution Feedback */}
                    {currentFeedback && (
                      <LiveToolFeedback
                        feedback={currentFeedback}
                        showProgress={true}
                        maxWidth={Math.floor(terminalWidth * 0.9)}
                      />
                    )}
                    
                    {/* Tool Execution Feed */}
                    {feedVisible && (
                      <ToolExecutionFeed
                        mode={feedMode}
                        maxItems={5}
                        showCompleted={true}
                        maxWidth={Math.floor(terminalWidth * 0.9)}
                        title="Recent Tool Executions"
                      />
                    )}
                    
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      width="100%"
                    >
                      <Box>
                        {ctrlCPressedOnce ? (
                          <Text color={Colors.Warning}>
                            Press Ctrl+C again to exit.
                          </Text>
                        ) : ctrlDPressedOnce ? (
                          <Text color={Colors.Warning}>
                            Press Ctrl+D again to exit.
                          </Text>
                        ) : (
                          <ContextSummaryDisplay
                            contextFileCount={contextFileCount}
                            contextFileNames={contextFileNames}
                            showToolDescriptions={showToolDescriptions}
                          />
                        )}
                    
                        {/* Tool statistics compact display */}
                        {toolStats.length > 0 && streamingState === StreamingState.IDLE && (
                          <Box marginLeft={2}>
                            <ToolStatsDisplay 
                              tools={toolStats}
                              visible={true}
                              displayMode="compact"
                              sortBy="usage"
                            />
                          </Box>
                        )}
                    
                        {/* Active progress indicators */}
                        {streamingState === StreamingState.IDLE && (
                          <Box marginLeft={2}>
                            <ProgressDisplay
                              maxItems={2}
                              width={Math.floor(terminalWidth * 0.25)}
                            />
                          </Box>
                        )}
                      </Box>
                      <Box>
                        {autoAcceptIndicatorState.showAutoAcceptIndicator && (
                          <AutoAcceptIndicator
                            approvalMode={ApprovalMode.AUTO_ACCEPT}
                          />
                        )}
                        <MemoryUsageDisplay />
                      </Box>
                    </Box>
                    
                    {/* Detailed tool statistics */}
                    {toolStats.length > 0 && config?.debug && (
                      <Box marginTop={1}>
                        <ToolStatsDisplay 
                          tools={toolStats}
                          visible={true}
                          maxTools={10}
                          sortBy="usage"
                          displayMode="detailed"
                          maxWidth={mainAreaWidth}
                        />
                      </Box>
                    )}

                    {showErrorDetails && (
                      <OverflowProvider>
                        <DetailedMessagesDisplay
                          messages={filteredConsoleMessages}
                          maxHeight={
                            constrainHeight ? debugConsoleMaxHeight : undefined
                          }
                          width={inputWidth}
                        />
                        <ShowMoreLines constrainHeight={constrainHeight} />
                      </OverflowProvider>
                    )}

                    {isInputActive && (
                      <InputPrompt
                        buffer={buffer}
                        inputWidth={inputWidth}
                        suggestionsWidth={suggestionsWidth}
                        onSubmit={(text: string) => {
                          if (text.startsWith('/')) {
                            const handled = handleSlashCommand(text);
                            if (!handled) {
                              logger.error('Unknown command:', text);
                            }
                          } else {
                            handleFinalSubmit(text);
                          }
                        }}
                        userMessages={userMessages}
                        onClearScreen={handleClearScreen}
                        config={config}
                        slashCommands={slashCommands}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>
    </StreamingContext.Provider>
  );
};

// Export App component for testing
export { App };