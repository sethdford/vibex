import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { Colors } from './colors.js';

interface CLIAppProps {
  startupWarnings?: string[];
  theme?: string;
  onCommand?: (command: string) => Promise<void>;
  onExit?: () => void;
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'error';
  content: string;
  timestamp: Date;
}

export const CLIApp: React.FC<CLIAppProps> = ({ 
  startupWarnings = [], 
  theme = 'dark',
  onCommand,
  onExit 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { exit } = useApp();

  // Add startup messages
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'system',
      content: `Welcome to Vibex! Type /help to see available commands.\nYou can ask Claude to explain code, fix issues, or perform tasks.`,
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);

    if (startupWarnings.length > 0) {
      const warningMessage: Message = {
        id: 'warnings',
        type: 'system',
        content: `Startup warnings:\n${startupWarnings.map(w => `• ${w}`).join('\n')}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, warningMessage]);
    }
  }, [startupWarnings]);

  // Handle user input
  useInput(useCallback((input, key) => {
    if (key.return) {
      handleSubmit();
    } else if (key.backspace) {
      setInput(prev => prev.slice(0, -1));
    } else if (key.ctrl && input === 'c') {
      if (onExit) {
        onExit();
      } else {
        exit();
      }
    } else if (input && !key.ctrl && !key.meta) {
      setInput(prev => prev + input);
    }
  }, [input, onExit, exit]));

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const command = input.trim();
    setInput('');

    // Handle exit commands
    if (['exit', 'quit', '/exit', '/quit'].includes(command.toLowerCase())) {
      if (onExit) {
        onExit();
      } else {
        exit();
      }
      return;
    }

    setIsProcessing(true);

    try {
      if (onCommand) {
        await onCommand(command);
      } else {
        // Default command handling
        if (command.startsWith('/')) {
          const responseMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'system',
            content: `Command "${command}" executed.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, responseMessage]);
        } else {
          const responseMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `I received your message: "${command}". AI functionality will be available once authentication is set up.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, responseMessage]);
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'error',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const getMessageColor = (type: Message['type']) => {
    switch (type) {
      case 'user': return Colors.Primary;
      case 'assistant': return Colors.Secondary;
      case 'system': return Colors.Info;
      case 'error': return Colors.Error;
      default: return Colors.Text;
    }
  };

  const getMessagePrefix = (type: Message['type']) => {
    switch (type) {
      case 'user': return 'You';
      case 'assistant': return 'Claude';
      case 'system': return 'System';
      case 'error': return 'Error';
      default: return '';
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="round" borderColor={Colors.Primary} paddingX={1} marginBottom={1}>
        <Text color={Colors.Primary} bold>
          🚀 Vibex - AI-Powered Development Assistant
        </Text>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {messages.map((message) => (
          <Box key={message.id} marginBottom={1} flexDirection="column">
            <Box>
              <Text color={getMessageColor(message.type)} bold>
                {getMessagePrefix(message.type)}
              </Text>
              <Text color={Colors.TextDim}>
                {' '}({message.timestamp.toLocaleTimeString()})
              </Text>
            </Box>
            <Box paddingLeft={2}>
              <Text color={message.type === 'error' ? Colors.Error : Colors.Text}>
                {message.content}
              </Text>
            </Box>
          </Box>
        ))}
        
        {isProcessing && (
          <Box marginBottom={1}>
            <Text color={Colors.TextDim}>
              Processing...
            </Text>
          </Box>
        )}
      </Box>

      {/* Input */}
      <Box borderStyle="round" borderColor={Colors.Secondary} paddingX={1}>
        <Text color={Colors.Secondary}>❯ </Text>
        <Text color={Colors.Text}>{input}</Text>
        <Text color={Colors.TextDim}>_</Text>
      </Box>

      {/* Help text */}
      <Box paddingX={1} paddingY={0}>
        <Text color={Colors.TextDim}>
          Type your message and press Enter. Use Ctrl+C to exit.
        </Text>
      </Box>
    </Box>
  );
};

export function startUI(options: { 
  startupWarnings?: string[]; 
  theme?: string;
  onCommand?: (command: string) => Promise<void>;
  onExit?: () => void;
}) {
  return render(
    <CLIApp 
      startupWarnings={options.startupWarnings}
      theme={options.theme}
      onCommand={options.onCommand}
      onExit={options.onExit}
    />
  );
} 