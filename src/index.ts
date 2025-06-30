/**
 * Main Application Initialization
 *
 * This module orchestrates the entire application startup sequence, bringing together
 * all the necessary components and services to create a fully functional CLI.
 * Key responsibilities include:
 *
 * - Loading and validating application configuration
 * - Initializing all core modules (terminal, auth, AI, etc.)
 * - Setting up the command processing loop
 * - Handling process-wide events and signals
 *
 * The `initialize` function serves as the main entry point for the application,
 * returning a fully configured application object that can be used to start
 * an interactive session or execute a single command.
 */

import { loadConfig } from './config/index.js';
import { initTerminal } from './terminal/index.js';
import { authManager } from './auth/index.js';
import { initAI } from './ai/index.js';
import { initCodebaseAnalysis } from './codebase/index.js';
import { registerCommands } from './commands/register.js';
import { initFileOperations } from './fileops/index.js';
import { initExecutionEnvironment } from './execution/index.js';
import { telemetry } from './telemetry/index.js';
import { logger, LogLevel } from './utils/logger.js';
import { formatErrorForDisplay } from './errors/formatter.js';
import { mcpClient } from './tools/mcp-client.js';

/**
 * Application instance that holds references to all initialized subsystems
 */
export interface AppInstance {
  config: any;
  terminal: any;
  auth: any;
  ai: any;
  codebase: any;
  commands: any;
  fileOps: any;
  execution: any;
  errors?: any;
  telemetry?: any;
}

/**
 * Main application initialization
 */
export async function initialize(): Promise<any> {
  try {
    // Load configuration
    const config = await loadConfig();

    // Set up logger
    logger.setLevel(config.logger?.level as unknown as LogLevel || LogLevel.INFO);

    // Initialize modules
    const terminal = await initTerminal(config);
    await authManager.initialize();
    const ai = await initAI(config);
    const codebase = await initCodebaseAnalysis(config);
    const fileOps = await initFileOperations(config);
    const execution = await initExecutionEnvironment(config);
    registerCommands();

    return {
      config,
      terminal,
      auth: authManager,
      ai,
      codebase,
      fileOps,
      execution,
      telemetry
    };
  } catch (error) {
    logger.error('Failed to initialize application', error as Error);
    process.exit(1);
  }
}

/**
 * Start interactive session with enhanced CLI interface
 */
export async function startInteractiveSession(app: any): Promise<void> {
  try {
    logger.info('Starting interactive session');
    
    // Collect any startup warnings
    const startupWarnings: string[] = [];
    
    // Check for authentication
    if (!authManager.isAuthenticated()) {
      startupWarnings.push('Not authenticated. Some features may be limited. Use /login to authenticate.');
    }
    
    // Initialize MCP servers if configured
    const mcpServers = app.config.mcp?.servers || {};
    if (Object.keys(mcpServers).length > 0) {
      logger.info('Initializing MCP servers...');
      for (const [name, config] of Object.entries(mcpServers)) {
        try {
          await mcpClient.connectServer({ name, ...config as any });
        } catch (error) {
          logger.warn(`Failed to connect MCP server ${name}:`, error);
          startupWarnings.push(`MCP server '${name}' failed to connect`);
        }
      }
    }
    
    // Display welcome and startup info
    app.terminal.displayWelcome();
    
    if (startupWarnings.length > 0) {
      app.terminal.warn('Startup warnings:');
      startupWarnings.forEach(warning => app.terminal.warn(`  • ${warning}`));
      app.terminal.info('');
    }
    
    // Start interactive loop
    await startInteractiveLoop(app);
    
    logger.info('Interactive session ended');
  } catch (error) {
    logger.error('Error in interactive session', error as Error);
    throw error;
  }
}

/**
 * Main interactive command loop
 */
async function startInteractiveLoop(app: any): Promise<void> {
  const { commandRegistry } = await import('./commands/index.js');
  
  // Check if we're in an interactive terminal
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    app.terminal.warn('Non-interactive terminal detected. Exiting interactive mode.');
    app.terminal.info('Use specific commands instead of interactive mode.');
    return;
  }
  
  while (true) {
    try {
      // Show prompt
      const input = await app.terminal.prompt({
        type: 'input',
        name: 'command',
        message: '❯'
      });
      
      if (!input.command || input.command.trim() === '') {
        continue;
      }
      
      const trimmedInput = input.command.trim();
      
      // Handle exit commands
      if (['exit', 'quit', 'q'].includes(trimmedInput.toLowerCase())) {
        break;
      }
      
      // Handle slash commands
      if (trimmedInput.startsWith('/')) {
        await handleSlashCommand(trimmedInput, app);
        continue;
      }
      
      // Handle AI queries
      await handleAIQuery(trimmedInput, app);
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        break;
      }
      if (error instanceof Error && error.message.includes('non-interactive terminal')) {
        app.terminal.warn('Cannot prompt in non-interactive terminal. Exiting.');
        break;
      }
      app.terminal.error(`Error: ${formatErrorForDisplay(error)}`);
    }
  }
  
  // Cleanup
  await mcpClient.disconnectAll();
}

/**
 * Handle slash commands
 */
async function handleSlashCommand(input: string, app: any): Promise<void> {
  const { commandRegistry, executeCommand } = await import('./commands/index.js');
  
  const parts = input.slice(1).split(' ');
  const commandName = parts[0];
  const args = parts.slice(1);
  
  try {
    await executeCommand(commandName, args);
  } catch (error) {
    app.terminal.error(`Command failed: ${formatErrorForDisplay(error)}`);
  }
}

/**
 * Handle AI queries
 */
async function handleAIQuery(input: string, app: any): Promise<void> {
  try {
    app.terminal.info('Asking Claude...\n');
    
    const aiClient = app.ai;
    if (!aiClient) {
      app.terminal.error('AI client not available. Please check your authentication.');
      return;
    }
    
    // Show spinner while processing
    const spinner = app.terminal.spinner('Processing...');
    
    try {
      const result = await aiClient.query(input);
      spinner.succeed('Response received');
      
      // Extract and display response
      const responseText = result.message.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n') || 'No response received';
      
      app.terminal.display(responseText);
      
      // Show usage metrics if available
      if (result.usage) {
        app.terminal.info(`\nTokens: ${result.usage.input_tokens} in, ${result.usage.output_tokens} out`);
      }
      
    } catch (error) {
      spinner.fail('Request failed');
      throw error;
    }
    
  } catch (error) {
    app.terminal.error(`AI query failed: ${formatErrorForDisplay(error)}`);
  }
}

/**
 * Set up process handlers
 */
export function setupProcessHandlers(app: any): void {
  process.on('SIGINT', () => {
    app.terminal.info('Caught interrupt signal. Exiting gracefully.');
    process.exit(0);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', reason as Error);
    console.error('An unexpected error occurred. Please check the logs.');
  });
}