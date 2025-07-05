#!/usr/bin/env node

/**
 * Vibex CLI - AI-Powered Development Assistant
 * 
 * A high-performance CLI tool that outperforms Google's Gemini CLI
 * with faster startup, better UX, and superior AI capabilities.
 */

import { Command } from 'commander';
import { logger } from './utils/logger.js';
import { version } from './version.js';
import type { ContentBlock } from './index.js';
import {
  ContextSystem,
  createContextSystem
} from './context/index.js';

interface CLIOptions {
  initialContext?: string;
  fullContext?: boolean;
  model?: string;
  temperature?: string;
  verbose?: boolean;
  debug?: boolean;
}

interface CodeAnalysisOptions {
  verbose?: boolean;
  format?: 'text' | 'json';
}

// Performance tracking
const startTime = Date.now();

/**
 * Main CLI application
 */
async function main() {
  try {
    // Create commander instance immediately
    const program = new Command();
    
    program
      .name('vibex')
      .description('VibeX - AI-powered CLI for development workflows')
      .version(version);
    
    // Add global options
    program
      .option('-v, --verbose', 'Enable verbose logging')
      .option('-d, --debug', 'Enable debug mode with detailed logging')
      .option('--full-context', 'Enable full context mode for complete project analysis');
    
    // Parse command line arguments early
    const args = process.argv;
    
    // Add commands but don't register heavy systems yet
    program
      .command('chat [context...]')
      .description('Start interactive chat mode with AI assistant')
      .option('-m, --model <model>', 'Specify AI model to use')
      .option('-t, --temperature <temp>', 'Set AI temperature (0-1)')
      .option('--full-context', 'Enable full context mode for complete project analysis')
      .action(async (context, options) => {
        await initializeHeavySystems();
        const initialContext = context ? context.join(' ') : '';
        await startInteractiveMode({ ...options, initialContext });
      });
    
    program
      .command('analyze <file>')
      .description('Analyze code file and provide insights')
      .option('-l, --language <lang>', 'Specify programming language')
      .action(async (file, options) => {
        await initializeHeavySystems();
        await analyzeCode(file, options);
      });
    
    program
      .command('explain <file>')
      .description('Explain what the code does')
      .action(async (file, options) => {
        await initializeHeavySystems();
        await explainCode(file, options);
      });
    
    program
      .command('review <file>')
      .description('Review code and suggest improvements')
      .action(async (file, options) => {
        await initializeHeavySystems();
        await reviewCode(file, options);
      });
    
    // Handle help and version AFTER commands are registered
    if (args.includes('--help') || args.includes('-h')) {
      program.outputHelp();
      return;
    }
    
    if (args.includes('--version') || args.includes('-V')) {
      console.log(version);
      return;
    }
    
    // If no arguments provided, start interactive mode
    if (args.length === 2) {
      await initializeHeavySystems();
      await startInteractiveMode({});
      return;
    }
    
    // Check if the input is a recognized command
    const inputArgs = args.slice(2);
    const knownCommands = ['chat', 'analyze', 'explain', 'review'];
    const firstArg = inputArgs[0];
    
    // If the first argument is not a known command and not a flag,
    // treat the entire input as chat context
    if (firstArg && !knownCommands.includes(firstArg) && !firstArg.startsWith('-')) {
      await initializeHeavySystems();
      const initialContext = inputArgs.join(' ');
      await startInteractiveMode({ initialContext });
      return;
    }
    
    // Parse and execute commands
    await program.parseAsync(args);
    
    // Log performance only if we loaded the logger
    const { logger } = await import('./utils/logger.js');
    const duration = Date.now() - startTime;
    logger.info(`CLI completed in ${duration}ms`);
    
  } catch (error) {
    const { formatErrorForDisplay } = await import('./errors/formatter.js');
    const { logger } = await import('./utils/logger.js');
    logger.error('CLI Error:', formatErrorForDisplay(error));
    process.exit(1);
  }
}

/**
 * Initialize heavy systems that are not needed for simple commands
 */
async function initializeHeavySystems() {
  const { logger } = await import('./utils/logger.js');
  const { registerBuiltInTools } = await import('./tools/index.js');
  const { registerCommands } = await import('./commands/register.js');
  
  // Import context system to ensure it's included in build
  const { 
    ContextSystem,
    createContextSystem
  } = await import('./context/index.js');
  
  logger.info('Registered built-in tools');
  registerBuiltInTools();
  
  logger.info('Context system loaded');
  
  console.log('Module patching system initialized');
  registerCommands();
}

/**
 * Start interactive chat mode
 */
async function startInteractiveMode(options: CLIOptions) {
  const { initialContext } = options;
  
  // Check if we're in a proper terminal environment
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log('🤖 Starting simple chat mode...');
    await startSimpleChat(options);
    return;
  }
  
  const { startUI } = await import('./ui/index.js');
  const { loadConfig } = await import('./config/index.js');
  const { initAI } = await import('./ai/index.js');
  
  // Load configuration
  const config = await loadConfig();
  
  // Apply CLI options to configuration
  if (options.fullContext !== undefined) {
    // Set full context mode in configuration
    config.fullContext = options.fullContext;
  }
  if (options.model) {
    config.ai = { ...config.ai, model: options.model };
  }
  if (options.debug !== undefined) {
    config.debug = options.debug;
  }
  
  // Initialize AI client BEFORE starting UI
  console.log('🤖 Initializing AI client...');
  try {
    await initAI(config);
    console.log('✅ AI client initialized successfully');
  } catch (error) {
    const { logger } = await import('./utils/logger.js');
    logger.error('Failed to initialize AI client:', error);
    process.exit(1);
  }
  
  // Load default app configuration
  const { defaults } = await import('./config/defaults.js');
  
  // Start UI with default configuration and initial context
  await startUI({
    config: defaults,
    initialContext,
    startupWarnings: [],
    updateMessage: null,
    onExit: () => {
      console.log('\n👋 Thanks for using VibeX!');
      process.exit(0);
    }
  });
}

/**
 * Simple chat mode without complex UI
 */
async function startSimpleChat(options: CLIOptions) {
  const { loadConfig } = await import('./config/index.js');
  const { initAI } = await import('./ai/index.js');
  const { formatErrorForDisplay } = await import('./errors/formatter.js');
  
  console.log('🚀 VibeX AI Chat - Simple Mode');
  console.log('================================');
  
  try {
    // Load configuration and initialize AI
    const config = await loadConfig();
    console.log('🤖 Initializing AI client...');
    const aiClient = await initAI(config);
    console.log('✅ AI client initialized successfully');
    
    // Use the provided initial context or default prompt
    const prompt = options.initialContext || "Hello! How can I help you today?";
    
    if (options.initialContext) {
      console.log('\n🤖 Processing your request...\n');
    } else {
      console.log('Ask me anything! Type "exit" to quit.\n');
      console.log(`> ${prompt}`);
    }
    
    console.log('\n🤖 Claude:');
    
    const result = await aiClient.query(prompt);
    const responseText = Array.isArray(result.message.content)
      ? result.message.content
          .filter((block: ContentBlock) => block.type === 'text')
          .map((block: ContentBlock) => block.text)
          .join('\n')
      : result.message.content;
    
    console.log(responseText);
    
    if (options.initialContext) {
      console.log('\n✅ Request completed successfully!');
    } else {
      console.log('\n✅ Chat test completed successfully!');
    }
    
  } catch (error) {
    const { logger } = await import('./utils/logger.js');
    logger.error('Chat failed:', formatErrorForDisplay(error));
    process.exit(1);
  }
}

/**
 * Analyze code file
 */
async function analyzeCode(file: string, options: CodeAnalysisOptions) {
  const { logger } = await import('./utils/logger.js');
  const { fileExists, readTextFile } = await import('./fs/operations.js');
  
  try {
    if (!await fileExists(file)) {
      logger.error(`File not found: ${file}`);
      process.exit(1);
    }
    
    const content = await readTextFile(file);
    const language = getLanguageFromFile(file);
    
    // Launch UI with analyze context pre-loaded
    const initialContext = `Analyze this ${language} code file (${file}):\n\n\`\`\`${language}\n${content}\n\`\`\``;
    
    await startInteractiveMode({ initialContext });
    
  } catch (error) {
    const { formatErrorForDisplay } = await import('./errors/formatter.js');
    logger.error('Analysis failed:', formatErrorForDisplay(error));
    process.exit(1);
  }
}

/**
 * Explain code file
 */
async function explainCode(file: string, options: CodeAnalysisOptions) {
  const { logger } = await import('./utils/logger.js');
  const { fileExists, readTextFile } = await import('./fs/operations.js');
  
  try {
    if (!await fileExists(file)) {
      logger.error(`File not found: ${file}`);
      process.exit(1);
    }
    
    const content = await readTextFile(file);
    const language = getLanguageFromFile(file);
    
    // Launch UI with explain context pre-loaded
    const initialContext = `Explain what this ${language} code does (${file}):\n\n\`\`\`${language}\n${content}\n\`\`\``;
    
    await startInteractiveMode({ initialContext });
    
  } catch (error) {
    const { formatErrorForDisplay } = await import('./errors/formatter.js');
    logger.error('Explanation failed:', formatErrorForDisplay(error));
    process.exit(1);
  }
}

/**
 * Review code file
 */
async function reviewCode(file: string, options: CodeAnalysisOptions) {
  const { logger } = await import('./utils/logger.js');
  const { fileExists, readTextFile } = await import('./fs/operations.js');
  
  try {
    if (!await fileExists(file)) {
      logger.error(`File not found: ${file}`);
      process.exit(1);
    }
    
    const content = await readTextFile(file);
    const language = getLanguageFromFile(file);
    
    // Launch UI with review context pre-loaded
    const initialContext = `Review this ${language} code and suggest improvements (${file}):\n\n\`\`\`${language}\n${content}\n\`\`\``;
    
    await startInteractiveMode({ initialContext });
    
  } catch (error) {
    const { formatErrorForDisplay } = await import('./errors/formatter.js');
    logger.error('Review failed:', formatErrorForDisplay(error));
    process.exit(1);
  }
}

/**
 * Get programming language from file extension
 */
function getLanguageFromFile(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    sh: 'bash',
    html: 'html',
    css: 'css',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    md: 'markdown'
  };
  
  return languageMap[ext || ''] || 'text';
}

// Run the CLI
main().catch(async error => {
  const { formatErrorForDisplay } = await import('./errors/formatter.js');
  const { logger } = await import('./utils/logger.js');
  logger.error('Fatal error:', formatErrorForDisplay(error));
  process.exit(1);
});