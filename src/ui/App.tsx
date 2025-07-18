/**
 * Main App Component - Clean Architecture like Gemini CLI
 * 
 * This component has ONE job: UI orchestration
 * All business logic has been extracted to services
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Box, Static, Text, useStdin, measureElement } from 'ink';

import { type HistoryItem, MessageType, StreamingState } from './types.js';
import { useHistory } from './hooks/useHistoryManager.js';
import { useConsoleMessages } from './hooks/useConsoleMessages.js';
import { useClaude } from './hooks/claude/index.js';
import { useSlashCommandProcessor } from './hooks/slashCommandProcessor.js';
import { useAtCommandProcessor } from './hooks/useAtCommandProcessor.js';
import { useLoadingIndicator } from './hooks/useLoadingIndicator.js';
import { useSettings } from './hooks/useSettings.js';
// Removed complex text buffer - using simple input approach

// Services
import { contextService } from '../services/contextService.js';
import { useDialogManager, DialogType } from '../services/dialogService.js';
import { inputService } from '../services/inputService.js';
import { appOrchestrationService } from '../services/app-orchestration.js';
import { clipboardService } from '../services/clipboard-service.js';

// Hooks
import { useAppState } from './hooks/useAppState.js';

import { useUINotifications } from './hooks/useUINotifications.js';
import { useContextManager } from './hooks/useContextManager.js';

// Components
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { LoadingIndicator } from './components/LoadingIndicator.js';
import { FinalInput } from './components/FinalInput.js';
import { ThemeDialog } from './components/ThemeDialog.js';
import { SettingsDialog } from './components/SettingsDialog.js';
import { Help } from './components/Help.js';
import { HistoryItemDisplay } from './components/HistoryItemDisplay.js';
import { DetailedMessagesDisplay } from './components/DetailedMessagesDisplay.js';
import { ContextSummaryDisplay } from './components/ContextSummaryDisplay.js';
import { UpdateNotification } from './components/UpdateNotification.js';
import { ClipboardNotification } from './components/ClipboardNotification.js';

import { Colors } from './colors.js';
import { getAIClient } from '../ai/index.js';
import { logger } from '../utils/logger.js';
import type { AppConfigType } from '../config/schema.js';
import type { NotificationType } from './components/ClipboardNotification.js';

/**
 * App configuration interface
 */
export interface AppConfiguration extends AppConfigType {
  targetDir?: string;
  [key: string]: unknown;
}

/**
 * App props interface
 */
interface AppProps {
  config: AppConfiguration;
  initialContext?: string;
  preloadedContext?: string;
  settings?: Record<string, any>;
  startupWarnings?: string[];
  updateMessage?: string | null;
  onExit?: () => void;
}

/**
 * Main App component - Clean Gemini CLI Architecture
 * Focus: UI orchestration only, no business logic
 */
const App = ({ 
  config, 
  initialContext, 
  preloadedContext, 
  settings = {}, 
  startupWarnings = [], 
  updateMessage = null, 
  onExit 
}: AppProps) => {
  
  // Core hooks for UI state
  const appState = useAppState();
  const dialogManager = useDialogManager();
  const notifications = useUINotifications();
  const contextManager = useContextManager();
  const { stdin, setRawMode } = useStdin();
  
  // Data hooks
  const { history, addItem, clearItems, loadHistory } = useHistory();
  const { consoleMessages, clearConsoleMessages } = useConsoleMessages();
  const { settings: userSettings, saveSetting, settingDefinitions, error: settingsError } = useSettings(settings);
  
  // Business logic hooks (simplified)
  const { processAtCommand } = useAtCommandProcessor({
    maxFileSize: 1024 * 1024,
    respectGitIgnore: true
  });
  
  const {
    processSlashCommand: handleSlashCommand,
    slashCommands,
    pendingHistoryItems,
  } = useSlashCommandProcessor(
    config as AppConfigType,
    settings,
    history,
    addItem,
    clearItems,
    loadHistory,
    appState.refreshStatic,
    () => dialogManager.openHelp(),
    (msg: string) => logger.debug(msg),
    () => dialogManager.openTheme(),
    () => contextService.refreshContext(),
    false,
    () => {} // Replace null with empty function
  );
  
  const {
    streamingState,
    submitQuery,
    initError,
    pendingHistoryItems: pendingClaudeHistoryItems,
    thought,
  } = useClaude(
    {
      claudeClient: getAIClient() as any,
      history,
      addItem,
      config: config as AppConfigType,
      setDebugMessage: (msg: string) => logger.debug(msg),
      handleSlashCommand,
    },
    {
      enableAdvancedStreaming: true,
      useConversationHistory: true,
      enableRealToolExecution: true,
      maxRetries: 3,
      requestTimeout: 120000,
      enableDebugLogging: false
    }
  );
  
  const { elapsedTime, currentLoadingPhrase } = useLoadingIndicator(streamingState as StreamingState);
  
  // No more local UI state - using focused hooks
  
  // Terminal dimensions (simplified)
  const terminalWidth = process.stdout.columns || 80;
  const terminalHeight = process.stdout.rows || 24;
  
  // Using simple input approach - no complex text buffer needed
  
  // Layout calculations (responsive like Gemini)
  const inputWidth = Math.max(20, Math.floor(terminalWidth * 0.9) - 3);
  const mainAreaWidth = Math.floor(terminalWidth * 0.9);
  const debugConsoleMaxHeight = Math.floor(Math.max(terminalHeight * 0.2, 5));
  
  // Calculate available height
  const staticExtraHeight = 3;
  const availableTerminalHeight = useMemo(
    () => terminalHeight - appState.footerHeight - staticExtraHeight,
    [terminalHeight, appState.footerHeight],
  );
  
  // Initialize context on startup
  useEffect(() => {
    appOrchestrationService.initializeApp(config, preloadedContext).then(message => {
      addItem({ type: MessageType.INFO, text: message }, Date.now());
    }).catch(error => {
      addItem({ type: MessageType.ERROR, text: `Initialization failed: ${error.message}` }, Date.now());
    });
  }, [addItem, config, preloadedContext]);
  
  // Update user messages for input history - DISABLED to prevent infinite loop
  // useEffect(() => {
  //   const currentSessionUserMessages = appOrchestrationService.extractUserMessages(history);
  //   notifications.updateUserMessages(currentSessionUserMessages);
  // }, [history, notifications]);
  
  // Auto-submit initial context (simplified)
  const initialContextSubmittedRef = useRef(false);
  
  // Combine pending items (simplified)
  const allPendingHistoryItems = useMemo(() => {
    if (streamingState === StreamingState.IDLE) {
      return pendingHistoryItems;
    }
    
    const combined = [...pendingHistoryItems];
    pendingClaudeHistoryItems.forEach(claudeItem => {
      const isDuplicate = combined.some(item => 
        item.id === claudeItem.id || 
        (item.type === claudeItem.type && item.timestamp === claudeItem.timestamp)
      );
      
      if (!isDuplicate) {
        combined.push(claudeItem);
      }
    });
    
    return combined.map((item, index) => ({
      ...item,
      id: item.id || `combined-${index}-${item.timestamp || Date.now()}`
    }));
  }, [pendingHistoryItems, pendingClaudeHistoryItems, streamingState]);
  
    // Input handlers
  const handleFinalSubmit = useCallback(async (submittedValue: string) => {
    // Check if Claude is initialized
    if (initError) {
      addItem({ 
        type: MessageType.ERROR, 
        text: `❌ Claude AI not available: ${initError}\n\nPlease set your ANTHROPIC_API_KEY environment variable and restart VibeX.` 
      }, Date.now());
      return;
    }

    try {
      const processedQuery = await appOrchestrationService.processUserInput(submittedValue, processAtCommand);
      submitQuery(processedQuery);
    } catch (error) {
      if (error instanceof Error && error.message === 'Empty input provided') {
        return; // Silently ignore empty input
      }
      logger.error('Error processing user input', error);
      // Still submit the original input as fallback
      submitQuery(submittedValue);
    }
  }, [submitQuery, processAtCommand, initError, addItem]);
  
  // Auto-submit initial context (after handleFinalSubmit is defined)
  useEffect(() => {
    if (initialContext?.trim() && !initialContextSubmittedRef.current) {
      initialContextSubmittedRef.current = true;
      setTimeout(() => {
        handleFinalSubmit(initialContext.trim());
      }, 1000);
    }
  }, [initialContext, handleFinalSubmit]);
  
  const handleClearScreen = useCallback(() => {
    clearItems();
    clearConsoleMessages();
    appOrchestrationService.clearAppState();
    appState.refreshStatic();
  }, [clearItems, clearConsoleMessages, appState.refreshStatic]);
  
  const handleCopyLastResponse = useCallback(async () => {
    const lastAssistantMessage = appOrchestrationService.findLastAssistantMessage(history);
    
    if (lastAssistantMessage) {
      const success = await clipboardService.copyToClipboard(lastAssistantMessage);
      notifications.showClipboardNotification(
        success ? 'Last response copied to clipboard' : 'Failed to copy to clipboard',
        success ? 'success' : 'error'
      );
    } else {
      notifications.showClipboardNotification('No response to copy', 'info');
    }
  }, [history]);
  
  // Exit handler
  const handleExit = useCallback(() => {
    appOrchestrationService.handleExit(slashCommands, onExit);
  }, [slashCommands, onExit]);
  
  // Note: Input handling is done by InputPrompt component - no need for useSimpleInput here
  
  // Footer height measurement
  const mainControlsRef = useRef<any>(null);
  useEffect(() => {
    if (mainControlsRef.current) {
      const measurement = measureElement(mainControlsRef.current);
      appState.setFooterHeight(measurement.height);
    }
  }, [terminalHeight, consoleMessages, appState.showErrorDetails, appState.setFooterHeight]);
  
  // Filter console messages
  const filteredConsoleMessages = useMemo(() => {
    return config?.debug ? consoleMessages : consoleMessages.filter(msg => msg.type !== 'debug');
  }, [consoleMessages, config]);
  
  // Input active state - ALWAYS show input, handle errors on submit
  const isInputActive = streamingState === StreamingState.IDLE;
  

  
  return (
    <Box flexDirection="column" marginBottom={1} width={Math.min(terminalWidth - 2, 100)} key="vibex-main-app">
      {/* Notifications */}
      {updateMessage && <UpdateNotification message={updateMessage} />}
      {notifications.clipboardNotification && (
        <ClipboardNotification
          message={notifications.clipboardNotification.message}
          type={notifications.clipboardNotification.type}
          onDismiss={notifications.clearClipboardNotification}
        />
      )}

      {/* Static history */}
      <Static
        key={appState.staticKey}
        items={[
          <Box flexDirection="column" key="header">
            <Header terminalWidth={terminalWidth} />
          </Box>,
          ...history.map((h: HistoryItem, index: number) => (
            <HistoryItemDisplay
              terminalWidth={mainAreaWidth}
              availableTerminalHeight={Math.max(terminalHeight * 4, 100)}
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

      {/* Pending items */}
      <Box flexDirection="column">
        {allPendingHistoryItems.map((item: HistoryItem, i: number) => (
          <HistoryItemDisplay
            key={item.id}
            availableTerminalHeight={appState.constrainHeight ? Math.min(availableTerminalHeight, 12) : 12}
            terminalWidth={mainAreaWidth}
            item={{ ...item, id: item.id || `pending-${i}` }}
            isPending={true}
            config={config}
            isFocused={!dialogManager.hasActiveDialog}
          />
        ))}
      </Box>

      {/* Help */}
      {dialogManager.isHelpOpen && <Help commands={slashCommands} />}

      {/* Main controls */}
      <Box flexDirection="column" ref={mainControlsRef} key="main-controls">
        {/* Startup warnings */}
        {startupWarnings.length > 0 && (
          <Box borderStyle="round" borderColor={Colors.Warning} paddingX={1} flexDirection="column">
            {startupWarnings.map((warning: string, index: number) => (
              <Text key={index} color={Colors.Warning}>{warning}</Text>
            ))}
          </Box>
        )}

        {/* Dialogs */}
        {dialogManager.isThemeOpen ? (
          <ThemeDialog
            onSelect={() => {}} // TODO: Implement theme selection
            onHighlight={() => {}}
            settings={userSettings}
            availableTerminalHeight={appState.constrainHeight ? terminalHeight - staticExtraHeight : undefined}
            terminalWidth={mainAreaWidth}
          />
        ) : dialogManager.isSettingsOpen ? (
          <SettingsDialog
            settings={settingDefinitions}
            onSave={saveSetting}
            onClose={dialogManager.closeDialog}
            availableTerminalHeight={appState.constrainHeight ? terminalHeight - staticExtraHeight : undefined}
            terminalWidth={mainAreaWidth}
          />
        ) : (
          <>
            {/* Loading indicator - only show when actually loading */}
            {streamingState !== StreamingState.IDLE && (
              <LoadingIndicator
                thought={thought}
                currentLoadingPhrase={currentLoadingPhrase}
                elapsedTime={elapsedTime}
              />
            )}
            
            {/* Status line */}
            <Box display="flex" justifyContent="space-between" width="100%">
              <Box>
                {appState.ctrlCPressedOnce ? (
                  <Text color={Colors.Warning}>Press Ctrl+C again to exit.</Text>
                ) : appState.ctrlDPressedOnce ? (
                  <Text color={Colors.Warning}>Press Ctrl+D again to exit.</Text>
                ) : (
                  <ContextSummaryDisplay
                    contextFileCount={contextManager.contextInfo.fileCount}
                    contextFileNames={contextManager.contextInfo.fileNames}
                    showToolDescriptions={false}
                  />
                )}
              </Box>
            </Box>

            {/* Error details */}
            {appState.showErrorDetails && (
              <DetailedMessagesDisplay
                messages={filteredConsoleMessages}
                maxHeight={appState.constrainHeight ? debugConsoleMaxHeight : undefined}
                width={inputWidth}
              />
            )}

            {/* Input - BULLETPROOF AGAINST DUPLICATION */}
            {isInputActive && (
              <FinalInput
                maxWidth={Math.min(terminalWidth - 4, 70)}
                onSubmit={useCallback((text: string) => {
                  if (text.startsWith('/')) {
                    const handled = handleSlashCommand(text);
                    if (!handled) {
                      logger.error('Unknown command:', text);
                    }
                  } else {
                    handleFinalSubmit(text);
                  }
                }, [handleSlashCommand, handleFinalSubmit])}
              />
            )}
          </>
        )}
        
        {/* Footer - like Gemini CLI */}
        <Footer
          model="Claude 3.5 Sonnet"
          targetDir={process.cwd()}
          debugMode={config?.debug || false}
          branchName={undefined}
          debugMessage={undefined}
          errorCount={0}
          showErrorDetails={appState.showErrorDetails}
          showMemoryUsage={config?.debug || false}
          promptTokenCount={0}
          candidatesTokenCount={0}
          totalTokenCount={0}
        />
      </Box>
    </Box>
  );
};

export { App };
export type { AppProps };