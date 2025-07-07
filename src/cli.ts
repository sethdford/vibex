#!/usr/bin/env node

/**
 * VibeX CLI - AI-powered development workflow orchestration
 * 
 * A sophisticated terminal UI built with Ink and React, similar to Gemini CLI.
 * Provides streaming AI responses, tool execution, and rich terminal interactions.
 */

import { Command } from 'commander';
import { version } from './version.js';
import { logger } from './utils/logger.js';
import { initializeCli, runChatSession } from './cli-integration.js';
import path from 'path';

interface CLIOptions {
  prompt?: string;
  model?: string;
  temperature?: string;
  verbose?: boolean;
  debug?: boolean;
  config?: string;
  fullContext?: boolean;
  apiKey?: string;
  chat?: boolean;
}

/**
 * Start the full UI like Gemini CLI does
 */
async function startUI(options: CLIOptions) {
  try {
    // Load configuration
    const { loadConfig } = await import('./config/index.js');
    const config = await loadConfig();
    
    // Apply CLI options to config
    if (options.model) {
      config.ai = { ...config.ai, model: options.model };
    }
    if (options.debug) {
      config.debug = true;
    }
    if (options.fullContext) {
      config.fullContext = true;
    }
    
    // Start the UI like Gemini CLI
    const { startUI: startVibeXUI } = await import('./ui/main.js');
    await startVibeXUI({
      config,
      initialContext: options.prompt,
      startupWarnings: [],
      updateMessage: null,
      onExit: () => process.exit(0)
    });
    
  } catch (error) {
    logger.error('Failed to start VibeX UI:', error);
    console.error('Error starting VibeX:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Main CLI program setup
 */
function setupCLI() {
  const program = new Command();
  
  program
    .name('vibex')
    .description('VibeX - AI-powered development workflow orchestration')
    .version(version);
  
  // Main command - start interactive UI
  program
    .option('-p, --prompt <text>', 'Initial prompt to send to AI')
    .option('-m, --model <model>', 'AI model to use')
    .option('-t, --temperature <temp>', 'Model temperature (0.0-1.0)')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-d, --debug', 'Enable debug mode')
    .option('-c, --config <path>', 'Path to config file')
    .option('--full-context', 'Load full project context automatically')
    .option('-k, --api-key <key>', 'API key for Claude')
    .option('--chat', 'Start in simple chat mode without UI')
    .action(async (options: CLIOptions) => {
      if (options.chat) {
        await startChatMode(options);
      } else {
        await startUI(options);
      }
    });
  
  // Version command
  program
    .command('version')
    .description('Show version information')
    .action(() => {
      console.log(`VibeX v${version}`);
    });
    
  // Chat command
  program
    .command('chat')
    .description('Start a simple chat session with Claude')
    .option('-k, --api-key <key>', 'API key for Claude')
    .option('-m, --model <model>', 'AI model to use')
    .action(async (options) => {
      await startChatMode(options);
    });
  
  return program;
}

/**
 * Start a simple chat session without the full UI
 */
async function startChatMode(options: CLIOptions) {
  try {
    // Get API key from environment or options
    const apiKey = options.apiKey || process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      console.error('Error: API key is required. Provide it with --api-key or set CLAUDE_API_KEY environment variable.');
      process.exit(1);
    }
    
    // Initialize clean architecture components
    const adapter = await initializeCli({
      apiKey,
      defaultModel: options.model,
      temperature: options.temperature ? parseFloat(options.temperature) : undefined
    });
    
    // Run the chat session
    await runChatSession(adapter);
    
  } catch (error) {
    logger.error('Failed to start chat mode:', error);
    console.error('Error starting chat:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    const program = setupCLI();
    await program.parseAsync(process.argv);
  } catch (error) {
    logger.error('CLI error:', error);
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    console.error('Fatal error:', error);
    process.exit(1);
  });
}