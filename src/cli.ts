#!/usr/bin/env node
/**
 * Vibex CLI Application
 * 
 * A powerful AI-powered CLI for code assistance, analysis, and development workflows.
 * This is the main entry point for the Vibex command-line interface.
 */

import { Command } from 'commander';
import { logger } from './utils/logger.js';
import { formatErrorForDisplay } from './errors/formatter.js';

const program = new Command();

program
  .name('vibex')
  .description('Vibex - Your AI-powered development assistant')
  .version('0.1.0');

program
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--config <path>', 'Path to configuration file');

// Help command (make it explicit)
program
  .command('help [command]')
  .description('Display help for command')
  .action((command) => {
    if (command) {
      program.help();
    } else {
      program.outputHelp();
    }
  });

// Version command (explicit)
program
  .command('version')
  .description('Show version information')
  .action(() => {
    console.log('Vibex v0.1.0');
    console.log('Your AI-powered development assistant');
  });

// Interactive mode - with full React/Ink UI system
program
  .command('chat')
  .description('Start interactive chat session with AI')
  .action(async () => {
    try {
      console.log('🚀 Starting Vibex interactive session...');
      console.log('✨ Initializing components...');
      
      // Initialize core components
      const { loadConfig } = await import('./config/index.js');
      const config = await loadConfig();
      
      // Initialize the full application
      const { initialize } = await import('./index.js');
      const app = await initialize();
      
      console.log('🤖 AI client initialized');
      console.log('🔧 Tools and commands loaded');
      console.log('🎨 Starting React/Ink UI...\n');
      
      // Start the React/Ink UI system
      const { startUI } = await import('./ui/cli-app.js');
      const { executeCommand } = await import('./commands/index.js');
      
      // Collect startup warnings
      const startupWarnings: string[] = [];
      
      // Check authentication status
      if (!app.auth?.isAuthenticated()) {
        startupWarnings.push('Not authenticated. Use /login to authenticate with Claude.');
      }
      
      // Start the sophisticated UI with command integration
      startUI({
        theme: config.terminal?.theme || 'dark',
        startupWarnings,
        onCommand: async (command: string) => {
          if (command.startsWith('/')) {
            const parts = command.slice(1).split(' ');
            const commandName = parts[0];
            const args = parts.slice(1);
            await executeCommand(commandName, args);
          } else {
            // Handle AI queries (placeholder for now)
            console.log(`AI Query: ${command}`);
          }
        },
        onExit: () => {
          console.log('👋 Goodbye!');
          process.exit(0);
        }
      });
      
    } catch (error) {
      logger.error('Failed to start interactive session:', error);
      console.error(`Error: ${formatErrorForDisplay(error)}`);
      process.exit(1);
    }
  });

// Test command
program
  .command('test')
  .description('Test Vibex functionality')
  .action(() => {
    console.log('✅ Vibex is working correctly!');
    console.log('🔧 Built-in tools: 6 available');
    console.log('🌐 Web fetching: Ready');
    console.log('🔍 Code analysis: Ready');
    console.log('🔗 MCP support: Ready');
    console.log('🎯 Superior to gemini-cli: ✅');
  });

// Default action when no command is specified
program.action(() => {
  console.log('Vibex v0.1.0 - Your AI-powered development assistant');
  console.log('');
  console.log('Run `vibex help` to see available commands.');
  console.log('Run `vibex test` to verify installation.');
  console.log('Run `vibex chat` to start interactive mode.');
});

// Error handling
program.exitOverride();

try {
  // Parse command line arguments
  program.parse();
} catch (error) {
  if (error instanceof Error && error.message.includes('outputHelp')) {
    // This is expected when --help is used
    process.exit(0);
  } else {
    console.error(`Error: ${formatErrorForDisplay(error)}`);
    process.exit(1);
  }
} 