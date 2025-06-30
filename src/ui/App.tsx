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
  DOMElement,
  measureElement,
  Static,
  Text,
  useStdin,
  useStdout,
  useInput,
  type Key as InkKeyType,
} from 'ink';

import { StreamingState, type HistoryItem, MessageType } from './types';
import { useTerminalSize } from './hooks/useTerminalSize';
import { useLoadingIndicator } from './hooks/useLoadingIndicator';
import { useThemeCommand } from './hooks/useThemeCommand';
import { useSettings } from './hooks/useSettings';
import { shouldDisableLoadingPhrases } from './utils/accessibilityUtils';
import { AccessibilitySettings } from './components/AccessibilitySettings';
import { useSlashCommandProcessor } from './hooks/slashCommandProcessor';
import { useAutoAcceptIndicator } from './hooks/useAutoAcceptIndicator';
import { useConsoleMessages } from './hooks/useConsoleMessages';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useClipboard } from './hooks/useClipboard';
import { Header } from './components/Header';
import { LoadingIndicator } from './components/LoadingIndicator';
import { AutoAcceptIndicator } from './components/AutoAcceptIndicator';
import { InputPrompt } from './components/InputPrompt';
import { Footer } from './components/Footer';
import { ThemeDialog } from './components/ThemeDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { Help } from './components/Help';
import { Colors } from './colors';
import { useClaude4Stream } from './hooks/useClaude4Stream';
import { useConsolePatcher } from './hooks/useConsolePatcher';
import { DetailedMessagesDisplay } from './components/DetailedMessagesDisplay';
import { HistoryItemDisplay } from './components/HistoryItemDisplay';
import { ContextSummaryDisplay } from './components/ContextSummaryDisplay';
import { useHistory } from './hooks/useHistoryManager';
import process from 'node:process';
import { StreamingContext } from './contexts/StreamingContext';
import { SessionStatsProvider, useSessionStats } from './contexts/SessionContext';
import { useTextBuffer } from './components/shared/text-buffer';
import * as fs from 'fs';
import { UpdateNotification } from './components/UpdateNotification';
import { ClipboardNotification, NotificationType } from './components/ClipboardNotification';
import { checkForUpdates } from './utils/updateCheck';
import ansiEscapes from 'ansi-escapes';
import { OverflowProvider } from './contexts/OverflowContext';
import { ProgressProvider } from './contexts/ProgressContext';
import { ProgressDisplay } from './components/ProgressDisplay';
import { Tips } from './components/Tips';
import { ShowMoreLines } from './components/ShowMoreLines';
import { loadConfig } from '../config/index.js';
import { getAIClient } from '../ai/index.js';
import { logger } from '../utils/logger.js';

const CTRL_EXIT_PROMPT_DURATION_MS = 1000;

/**
 * App props interface
 */
interface AppProps {
  /**
   * Application configuration
   */
  config: any;
  
  /**
   * User settings
   */
  settings?: any;
  
  /**
   * Optional warnings to display at startup
   */
  startupWarnings?: string[];
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
 * Main App component
 */
const App = ({ config, settings = {}, startupWarnings = [] }: AppProps) => {
  // Terminal and state hooks
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [showTips, setShowTips] = useState<boolean>(true);
  const { stdout } = useStdout();

  // Check for updates
  useEffect(() => {
    checkForUpdates().then(setUpdateMessage);
  }, []);

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
    setStaticKey((prev) => prev + 1);
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

  // Error tracking
  const errorCount = useMemo(
    () => consoleMessages.filter((msg) => msg.type === 'error').length,
    [consoleMessages],
  );

  // Settings management
  const {
    settings: userSettings,
    settingDefinitions,
    saveSetting,
    error: settingsError
  } = useSettings(settings);
  
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
      
    } catch (error: any) {
      const errorMessage = error.message || String(error);
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

  // Command processing
  const {
    handleSlashCommand,
    slashCommands,
    pendingHistoryItems: pendingSlashCommandHistoryItems,
  } = useSlashCommandProcessor(
    config,
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
    setQuittingMessages,
  );
  const pendingHistoryItems = [...pendingSlashCommandHistoryItems];

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
          (cmd) => cmd.name === 'quit' || cmd.altName === 'exit',
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

  // Clipboard integration
  const { copyToClipboard, pasteFromClipboard } = useClipboard();
  
  // Clipboard notification state
  const [clipboardNotification, setClipboardNotification] = useState<{
    message: string;
    type: NotificationType;
  } | null>(null);
  
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
        action: () => setShowErrorDetails((prev) => !prev),
      },
      {
        name: 'toggleToolDescriptions',
        description: 'Toggle tool descriptions',
        ctrl: true,
        key: 't',
        action: () => setShowToolDescriptions((prev) => !prev),
      },
      {
        name: 'toggleHeightConstraint',
        description: 'Toggle height constraint',
        ctrl: true,
        key: 's',
        action: () => setConstrainHeight((prev) => !prev),
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
  } = useClaude4Stream(
    getAIClient(),
    history,
    addItem,
    setShowHelp,
    config,
    setDebugMessage,
    handleSlashCommand,
    refreshContextFiles,
  );
  pendingHistoryItems.push(...pendingClaudeHistoryItems);
  
  // Loading indicator state
  const { elapsedTime, currentLoadingPhrase } = useLoadingIndicator(streamingState);
  
  // Auto-accept indicator
  const showAutoAcceptIndicator = useAutoAcceptIndicator({ config });

  // Handle submission of user query
  const handleFinalSubmit = useCallback(
    (submittedValue: string) => {
      const trimmedValue = submittedValue.trim();
      if (trimmedValue.length > 0) {
        submitQuery(trimmedValue);
      }
    },
    [submitQuery],
  );

  // User message history
  const [userMessages, setUserMessages] = useState<string[]>([]);

  useEffect(() => {
    // Build user message history from current conversation
    const currentSessionUserMessages = history
      .filter(
        (item): item is HistoryItem & { type: 'user'; text: string } =>
          item.type === 'user' &&
          typeof item.text === 'string' &&
          item.text.trim() !== '',
      )
      .map((item) => item.text)
      .reverse(); // Newest first

    // Set user messages for input history
    setUserMessages([...currentSessionUserMessages]);
  }, [history]);

  // Input active state
  const isInputActive = streamingState === StreamingState.Idle && !initError;

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

  // Handle terminal resizing
  useEffect(() => {
    // skip refreshing Static during first mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // debounce so it doesn't fire up too often during resize
    const handler = setTimeout(() => {
      setStaticNeedsRefresh(false);
      refreshStatic();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [terminalWidth, terminalHeight, refreshStatic]);

  useEffect(() => {
    if (streamingState === StreamingState.Idle && staticNeedsRefresh) {
      setStaticNeedsRefresh(false);
      refreshStatic();
    }
  }, [streamingState, refreshStatic, staticNeedsRefresh]);

  // Filter console messages based on debug mode
  const filteredConsoleMessages = useMemo(() => {
    if (config?.debug) {
      return consoleMessages;
    }
    return consoleMessages.filter((msg) => msg.type !== 'debug');
  }, [consoleMessages, config]);

  // Context file names
  const contextFileNames = useMemo(() => {
    return ['CLAUDE.md'];
  }, []);

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

  // Main layout sizes
  const mainAreaWidth = Math.floor(terminalWidth * 0.9);
  const debugConsoleMaxHeight = Math.floor(Math.max(terminalHeight * 0.2, 5));
  const staticAreaMaxItemHeight = Math.max(terminalHeight * 4, 100);

  return (
    <StreamingContext.Provider value={streamingState}>
      <Box flexDirection="column" marginBottom={1} width="90%">
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
                <Box marginY={1}>
                  <ClipboardNotification
                    message={clipboardNotification.message}
                    type={clipboardNotification.type}
                    onDismiss={() => setClipboardNotification(null)}
                  />
                </Box>
              )}
              
              {/* Show tips if enabled */}
              {showTips && (
                <Box marginTop={1}>
                  <Tips 
                    maxWidth={Math.floor(terminalWidth * 0.8)}
                    onDismiss={() => setShowTips(false)}
                  />
                </Box>
              )}
            </Box>,
            ...history.map((h) => (
              <HistoryItemDisplay
                terminalWidth={mainAreaWidth}
                availableTerminalHeight={staticAreaMaxItemHeight}
                key={h.id || `history-${h.timestamp}`}
                item={h}
                isPending={false}
                config={config}
              />
            )),
          ]}
        >
          {(item) => item}
        </Static>
        <OverflowProvider>
          <Box ref={pendingHistoryItemRef} flexDirection="column">
            {pendingHistoryItems.map((item, i) => (
              <HistoryItemDisplay
                key={i}
                availableTerminalHeight={
                  constrainHeight ? availableTerminalHeight : undefined
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
              marginY={1}
              flexDirection="column"
            >
              {startupWarnings.map((warning, index) => (
                <Text key={index} color={Colors.Warning}>
                  {warning}
                </Text>
              ))}
            </Box>
          )}

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
                  streamingState === StreamingState.WaitingForConfirmation ||
                  shouldDisableLoadingPhrases(config)
                    ? undefined
                    : thought
                }
                currentLoadingPhrase={
                  shouldDisableLoadingPhrases(config)
                    ? undefined
                    : currentLoadingPhrase
                }
                elapsedTime={elapsedTime}
              />
              <Box
                marginTop={1}
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
              
              {/* Active progress indicators */}
              {streamingState === StreamingState.Idle && (
                <Box marginLeft={2}>
                  <ProgressDisplay
                    maxItems={2}
                    width={Math.floor(terminalWidth * 0.25)}
                  />
                </Box>
              )}
                </Box>
                <Box>
                  {showAutoAcceptIndicator && (
                    <AutoAcceptIndicator
                      approvalMode={showAutoAcceptIndicator}
                    />
                  )}
                </Box>
              </Box>

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
                  onSubmit={handleFinalSubmit}
                  userMessages={userMessages}
                  onClearScreen={handleClearScreen}
                  config={config}
                  slashCommands={slashCommands}
                />
              )}
            </>
          )}

          {initError && streamingState !== StreamingState.Responding && (
            <Box
              borderStyle="round"
              borderColor={Colors.Error}
              paddingX={1}
              marginBottom={1}
            >
              <Text color={Colors.Error}>
                Initialization Error: {initError}
              </Text>
              <Text color={Colors.Error}>
                {' '}
                Please check API key and configuration.
              </Text>
            </Box>
          )}
          <Footer
            model="claude-3-7-sonnet"
            targetDir={config?.targetDir || process.cwd()}
            debugMode={config?.debug || false}
            errorCount={errorCount}
            showErrorDetails={showErrorDetails}
            promptTokenCount={sessionStats.currentResponse.promptTokenCount}
            candidatesTokenCount={
              sessionStats.currentResponse.candidatesTokenCount
            }
            totalTokenCount={sessionStats.currentResponse.totalTokenCount}
          />
        </Box>
      </Box>
    </StreamingContext.Provider>
  );
};