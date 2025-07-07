import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';

import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { ConversationHistory, type HistoryMessage } from './components/ConversationHistory.js';
import { ErrorDisplay } from './components/ErrorDisplay.js';
import { SlashCommandBar } from './components/SlashCommandBar.js';
import { useSlashCommandProcessor } from './hooks/slashCommandProcessor.js';
import type { Command } from './components/Help.js';

import { Colors } from './colors.js';
import type { AppConfigType } from '../config/schema.js';

interface CLIAppProps {
  config: AppConfigType;
  onExit: () => void;
  startupWarnings?: string[];
  updateMessage?: string | null;
}

const initialCommands: Command[] = [
  { name: 'help', description: 'Show help', action: async () => {} },
  { name: 'exit', description: 'Exit the application', action: async () => {} },
  { name: 'quit', description: 'Exit the application', action: async () => {} },
];

export const CLIApp: React.FC<CLIAppProps> = ({ config, onExit, startupWarnings = [], updateMessage = null }) => {
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { exit } = useApp();

  // Note: This component needs to be updated to use useSlashCommandProcessor
  // For now, creating minimal mock implementation
  const commands = initialCommands;
  const getSuggestions = (input: string) => input.startsWith('/') ? [input] : [];
  const executeCommandString = async (cmd: string) => ({ success: true, message: 'OK' });
  
  const suggestions = getSuggestions(input);
  const commandList = commands.filter((cmd: Command) => suggestions.some((s: string) => s.startsWith(`/${cmd.name}`)));


  // Add welcome message and system notifications
  useEffect(() => {
    const initialMessages: HistoryMessage[] = [
      {
        id: 'welcome',
        role: 'system' as const,
        content: `Welcome to VibeX - AI-powered development workflow orchestration.\n\nVibeX helps you build, test, and optimize your applications with the power of AI.\n\nType a message to get started or use slash commands for specific actions.`,
        timestamp: new Date(),
        metadata: {
          type: 'welcome',
        }
      }
    ];
    
    // Add any startup warnings
    if (startupWarnings && startupWarnings.length > 0) {
      startupWarnings.forEach((warning, i) => {
        initialMessages.push({
          id: `warning-${i}`,
          role: 'system',
          content: `⚠️ ${warning}`,
          timestamp: new Date(),
          metadata: {
            type: 'warning',
          }
        });
      });
    }
    
    // Add update notification if present
    if (updateMessage) {
      initialMessages.push({
        id: 'update',
        role: 'system',
        content: `🔔 ${updateMessage}`,
        timestamp: new Date(),
        metadata: {
          type: 'update',
        }
      });
    }
    
    // Add tip about slash commands
    initialMessages.push({
      id: 'tip',
      role: 'system',
      content: 'TIP: Use /help to see available commands and /exit to quit.',
      timestamp: new Date(),
      metadata: {
        type: 'tip',
      }
    });
    
    setMessages(initialMessages);
  }, [config?.ai?.model, startupWarnings, updateMessage]);

  const handleSubmit = useCallback(async (submittedInput: string) => {
    const command = submittedInput.trim();
    if (!command) {return;}

    // Add user message to history
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: command,
      timestamp: new Date()
    }]);
    
    setInput('');
    setIsProcessing(true);
    setError(null);

    if (command.startsWith('/')) {
        if(command === '/exit' || command === '/quit') {
            onExit();
            return;
        }
      const result = await executeCommandString(command);
      if(!result.success) {
        setError(new Error(result.message || 'Unknown command error'));
      }
    } else {
        // TODO: Handle natural language submission to AI
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `(Placeholder) AI response to: "${command}"`,
            timestamp: new Date()
          }]);
        }, 500);
    }
    
    setIsProcessing(false);

  }, [executeCommandString, onExit]);


  useInput(
    useCallback(
      (char, key) => {
        if (key.return) {
          handleSubmit(input);
          return;
        }

        if (key.backspace || key.delete) {
          setInput(prev => prev.slice(0, -1));
          return;
        }

        if (key.ctrl && char === 'c') {
          onExit();
          return;
        }
        
        if (char && !key.ctrl && !key.meta) {
          setInput(prev => prev + char);
        }
      },
      [input, onExit, handleSubmit]
    )
  );

  return (
    <Box flexDirection="column" height="100%" width="100%">
      <Header terminalWidth={process.stdout.columns || 80} />
      
      <Box flexGrow={1} flexDirection="column" paddingX={1}>
        <ConversationHistory messages={messages} />
        {error && <ErrorDisplay error={error} />}
      </Box>

      <SlashCommandBar 
        commands={[]}
      />

      <Box borderStyle="round" borderColor={Colors.Primary} paddingX={1}>
        <Text color={Colors.Primary}>❯ </Text>
        <Text>{input}</Text>
        {isProcessing && <Text color={Colors.TextDim}> (Processing...)</Text>}
      </Box>

      <Footer
        model={config?.ai?.model || 'default'}
        targetDir={process.cwd()}
        debugMode={config?.ai?.enableBetaFeatures || false}
        errorCount={error ? 1 : 0}
        showErrorDetails={!!error}
      />
    </Box>
  );
};

export function startUI(options: { 
  config: AppConfigType;
  onExit: () => void;
  startupWarnings?: string[];
  updateMessage?: string | null;
}) {
  const app = render(
    <CLIApp 
      config={options.config}
      onExit={options.onExit}
      startupWarnings={options.startupWarnings}
      updateMessage={options.updateMessage}
    />
  );
  return app;
}