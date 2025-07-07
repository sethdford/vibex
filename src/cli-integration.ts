/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * CLI Integration for VibeX using clean architecture components
 */

import path from 'path';
import os from 'os';
import { CliAdapter } from './adapters/cli-adapter';
import { ServiceFactory } from './services/service-factory';
import chalk from 'chalk';

interface CliConfig {
  apiKey: string;
  baseDir?: string;
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Initialize the CLI with clean architecture services
 */
export async function initializeCli(config: CliConfig): Promise<CliAdapter> {
  try {
    // Create and initialize the CLI adapter
    const adapter = new CliAdapter(config.apiKey, {
      baseDir: config.baseDir || path.join(os.homedir(), '.vibex'),
      defaultModel: config.defaultModel || 'claude-3-7-sonnet'
    });
    
    await adapter.initialize();
    return adapter;
  } catch (error) {
    console.error(chalk.red('Failed to initialize VibeX:'), error);
    throw error;
  }
}

/**
 * Get streaming callbacks for CLI output
 */
export function getDefaultStreamCallbacks() {
  return {
    onContent: (content: string) => {
      // Output content without newline to allow streaming
      process.stdout.write(content);
    },
    
    onToolCall: (name: string, input: unknown) => {
      console.log(chalk.yellow('\n\nUsing tool:'), name);
      console.log(chalk.dim(JSON.stringify(input, null, 2)));
    },
    
    onThought: (thought: { subject: string, description?: string }) => {
      console.log(chalk.magenta('\n\nThinking:'), thought.subject);
      if (thought.description) {
        console.log(chalk.dim(thought.description));
      }
    },
    
    onComplete: () => {
      console.log('\n'); // Add newline at the end
    },
    
    onError: (error: Error) => {
      console.error(chalk.red('\nError:'), error.message);
    }
  };
}

/**
 * Process tool call results and return to the adapter
 */
export async function processToolCall(
  adapter: CliAdapter,
  toolCallId: string,
  name: string,
  input: any
): Promise<void> {
  let result;
  
  try {
    // Here you can implement various tools based on the name
    switch (name) {
      case 'search':
        console.log(chalk.green('Performing search...'));
        result = { results: ['mock search result 1', 'mock search result 2'] };
        break;
        
      case 'readFile':
        console.log(chalk.green(`Reading file ${input.path}...`));
        result = { content: 'mock file content' };
        break;
        
      default:
        console.log(chalk.yellow(`Unknown tool: ${name}`));
        result = { error: `Tool ${name} not implemented` };
    }
    
    // Send result back to the adapter
    await adapter.handleToolResult(toolCallId, result);
    
  } catch (error) {
    console.error(chalk.red(`Error executing tool ${name}:`), error);
    await adapter.handleToolResult(toolCallId, { 
      error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
}

/**
 * Display conversation history in the terminal
 */
export async function displayConversationHistory(adapter: CliAdapter): Promise<void> {
  try {
    const history = await adapter.getConversationHistory();
    
    console.log(chalk.blue('\nRecent conversations:'));
    console.log(chalk.dim('──────────────────────────────────'));
    
    if (history.length === 0) {
      console.log(chalk.dim('No conversation history found.'));
    } else {
      for (const [index, conv] of history.entries()) {
        const date = conv.date.toLocaleDateString() + ' ' + conv.date.toLocaleTimeString();
        console.log(chalk.green(`${index + 1}. ${conv.summary}`));
        console.log(chalk.dim(`   ID: ${conv.id} | ${date}`));
      }
    }
    
    console.log(chalk.dim('──────────────────────────────────'));
  } catch (error) {
    console.error(chalk.red('Failed to display conversation history:'), error);
  }
}

/**
 * Run a simple CLI chat session
 */
export async function runChatSession(adapter: CliAdapter): Promise<void> {
  try {
    // Set up readline for interactive input
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.green('You: ')
    });
    
    console.log(chalk.blue('\nVibeX Chat Session'));
    console.log(chalk.dim('Type your message or "/help" for commands'));
    console.log(chalk.dim('──────────────────────────────────'));
    
    rl.prompt();
    
    rl.on('line', async (line: string) => {
      const input = line.trim();
      
      // Handle special commands
      if (input.startsWith('/')) {
        await handleCommand(input, adapter, rl);
        return;
      }
      
      if (!input) {
        rl.prompt();
        return;
      }
      
      try {
        console.log(chalk.blue('\nAI: '));
        
        // Get streaming callbacks for terminal display
        const callbacks = getDefaultStreamCallbacks();
        
        // Override tool call to add handler
        callbacks.onToolCall = async (name: string, toolInput: unknown) => {
          console.log(chalk.yellow('\n\nUsing tool:'), name);
          console.log(chalk.dim(JSON.stringify(toolInput, null, 2)));
          
          // Process tool calls with mocked results
          // In a real implementation, you'd handle the actual tool execution
          const toolCallId = Math.random().toString(36).substring(2, 15);
          await processToolCall(adapter, toolCallId, name, toolInput);
        };
        
        // Send message with streaming response
        await adapter.sendStreamingMessage(input, callbacks);
        
      } catch (error) {
        console.error(chalk.red('\nError:'), 
          error instanceof Error ? error.message : String(error)
        );
      }
      
      console.log('\n');
      rl.prompt();
    });
    
    rl.on('close', () => {
      console.log(chalk.blue('\nThank you for using VibeX!'));
      process.exit(0);
    });
    
  } catch (error) {
    console.error(chalk.red('Error in chat session:'), error);
    process.exit(1);
  }
}

/**
 * Handle special CLI commands
 */
async function handleCommand(
  input: string,
  adapter: CliAdapter,
  rl: any
): Promise<void> {
  const command = input.toLowerCase();
  
  switch (command) {
    case '/help':
      displayHelp();
      break;
      
    case '/clear':
      console.clear();
      console.log(chalk.blue('VibeX Chat Session'));
      console.log(chalk.dim('Type your message or "/help" for commands'));
      console.log(chalk.dim('──────────────────────────────────'));
      break;
      
    case '/history':
      await displayConversationHistory(adapter);
      break;
      
    case '/new':
      await adapter.startNewConversation();
      console.log(chalk.green('Started a new conversation.'));
      break;
      
    case '/exit':
    case '/quit':
      console.log(chalk.blue('Goodbye!'));
      process.exit(0);
      break;
      
    default:
      console.log(chalk.yellow(`Unknown command: ${input}`));
      console.log('Type /help for available commands.');
  }
  
  rl.prompt();
}

/**
 * Display help information
 */
function displayHelp(): void {
  console.log(chalk.blue('\nAvailable commands:'));
  console.log(chalk.dim('──────────────────────────────────'));
  console.log(chalk.green('/help') + '    - Show this help message');
  console.log(chalk.green('/clear') + '   - Clear the terminal');
  console.log(chalk.green('/history') + ' - Show conversation history');
  console.log(chalk.green('/new') + '     - Start a new conversation');
  console.log(chalk.green('/exit') + '    - Exit the application');
  console.log(chalk.dim('──────────────────────────────────'));
}