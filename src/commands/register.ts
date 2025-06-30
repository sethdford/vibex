/**
 * Command Registration
 * 
 * Registers all available CLI commands with the command registry.
 */

import { commandRegistry, ArgType, CommandDef, ArgDef, CommandCategory } from './index.js';
import { logger } from '../utils/logger.js';
// import { registerUpgradedCommands } from './upgraded-commands.js';
// import { registerDoctorCommand, registerUpdateCommand, registerMigrateInstallerCommand } from './system-commands.js';
// import { registerMCPCommand } from './mcp-commands.js';
// import { registerAliasCommand, registerMentionCommand } from './utility-commands.js';
// import { registerEnhancedCommands } from './enhanced-commands.js';
import { initAI } from '../ai/index.js';
import { fileExists, readTextFile } from '../fs/operations.js';
import { isNonEmptyString } from '../utils/validation.js';
import { formatErrorForDisplay } from '../errors/formatter.js';
import { authManager } from '../auth/index.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { table } from 'table';

// Global AI interface
let aiInterface: any = null;

/**
 * Get or initialize AI interface
 */
async function getAI(): Promise<any> {
  if (!aiInterface) {
    aiInterface = await initAI();
  }
  return aiInterface;
}

/**
 * Register all commands
 */
export function registerCommands(): void {
  logger.debug('Registering commands');
  
  // Register core commands (avoiding AI-dependent ones for now)
  registerExitCommand();
  registerQuitCommand();
  registerClearCommand();
  registerCommandsCommand();
  registerHelpCommand();
  registerConfigCommand();
  registerThemeCommand();
  registerVerbosityCommand();
  registerRunCommand();
  registerResetCommand();
  registerHistoryCommand();
  
  // TODO: Re-enable AI-dependent commands once punycode issue is resolved
  // registerLoginCommand();
  // registerLogoutCommand();
  // registerExplainCommand();
  // registerRefactorCommand();
  // registerFixCommand();
  // registerBugCommand();
  // registerFeedbackCommand();
  // registerEditCommand();
  // registerGitCommand();
  
  // TODO: Re-enable these commands once the modules are available
  // // Register upgraded commands with v1.0.35 features
  // try {
  //   registerUpgradedCommands(commandRegistry);
  //   logger.info('Upgraded commands registered');
  // } catch (error) {
  //   logger.warn('Failed to register upgraded commands:', error instanceof Error ? error.message : 'Unknown error');
  // }
  
  // // Register system commands
  // try {
  //   commandRegistry.register(registerDoctorCommand());
  //   commandRegistry.register(registerUpdateCommand());
  //   commandRegistry.register(registerMigrateInstallerCommand());
  //   logger.info('System commands registered');
  // } catch (error) {
  //   logger.warn('Failed to register system commands:', error instanceof Error ? error.message : 'Unknown error');
  // }
  
  // // Register MCP command
  // try {
  //   commandRegistry.register(registerMCPCommand());
  //   logger.info('MCP command registered');
  // } catch (error) {
  //   logger.warn('Failed to register MCP command:', error instanceof Error ? error.message : 'Unknown error');
  // }
  
  // // Register utility commands
  // try {
  //   commandRegistry.register(registerAliasCommand());
  //   commandRegistry.register(registerMentionCommand());
  //   logger.info('Utility commands registered');
  // } catch (error) {
  //   logger.warn('Failed to register utility commands:', error instanceof Error ? error.message : 'Unknown error');
  // }
  
  // // Register enhanced commands with ripgrep (includes next-gen functionality)
  // try {
  //   registerEnhancedCommands(commandRegistry);
  //   logger.info('Enhanced commands registered');
  // } catch (error) {
  //   logger.warn('Failed to register enhanced commands:', error instanceof Error ? error.message : 'Unknown error');
  // }
  
  logger.info('Commands registered successfully');
}

/**
 * Register login command
 */
function registerLoginCommand(): void {
  const command: CommandDef = {
    name: 'login',
    description: 'Authenticate with Claude',
    category: CommandCategory.AUTH,
    handler: async (args: any) => {
      try {
        if (authManager.isAuthenticated()) {
          console.log('You are already logged in.');
          return;
        }

        const { 'api-key': apiKey, oauth } = args;
        
        console.log('Authenticating with Claude...');
        
        const apiKeyToUse = apiKey || process.env.ANTHROPIC_API_KEY;

        if (apiKeyToUse) {
          // Use API key authentication
          const authResult = await authManager.authenticateWithApiKey();
          if (authResult.success) {
            console.log('Successfully logged in with API key.');
            
            // Display token expiration if available
            if (authResult.token?.expiresAt) {
              const expirationDate = new Date(authResult.token.expiresAt * 1000);
              console.log(`Token expires on: ${expirationDate.toLocaleString()}`);
            }
          } else {
            console.error(`Authentication failed: ${authResult.error || 'Unknown error'}`);
          }
        } else {
          // Default to OAuth if no API key is available
          console.log('No API key found. Proceeding with OAuth authentication...');
          const authResult = await authManager.authenticateWithOAuth();
          if (authResult.success) {
            console.log('Successfully logged in with OAuth.');
            
            // Display token expiration if available
            if (authResult.token?.expiresAt) {
              const expirationDate = new Date(authResult.token.expiresAt * 1000);
              console.log(`Token expires on: ${expirationDate.toLocaleString()}`);
            }
          } else {
            console.error(`Authentication failed: ${authResult.error || 'Unknown error'}`);
          }
        }
      } catch (error) {
        console.error('Error during authentication:', formatErrorForDisplay(error));
      }
    },
    args: [
      {
        name: 'api-key',
        description: 'API key for Claude AI',
        type: ArgType.STRING,
        shortFlag: 'k'
      },
      {
        name: 'oauth',
        description: 'Use OAuth authentication',
        type: ArgType.BOOLEAN,
        shortFlag: 'o'
      }
    ]
  };
  
  commandRegistry.register(command);
}

/**
 * Register logout command
 */
function registerLogoutCommand(): void {
  const command: CommandDef = {
    name: 'logout',
    description: 'Log out from Claude',
    category: CommandCategory.AUTH,
    handler: async () => {
      try {
        console.log('Logging out and clearing credentials...');
        
        // Call the auth manager's logout function
        await authManager.logout();
        
        console.log('Successfully logged out. All credentials have been cleared.');
      } catch (error) {
        console.error('Error during logout:', formatErrorForDisplay(error));
      }
    }
  };
  
  commandRegistry.register(command);
}

/**
 * Register ask command
 */
function registerAskCommand(): void {
  const command: CommandDef = {
    name: 'ask',
    description: 'Ask Claude a question',
    category: CommandCategory.AI,
    handler: async (args: any) => {
      try {
        const { question } = args;
        
        if (!isNonEmptyString(question)) {
          console.error('Please provide a question to ask.');
          return;
        }
        
        console.log(`🤔 Asking: ${question}\n`);
        
        // Initialize conversation history
        const { conversationHistory } = await import('../utils/conversation-history.js');
        try {
          await conversationHistory.initialize();
        } catch (error) {
          // May already be initialized
        }
        
        // Track user message
        await conversationHistory.addMessage('user', question, {
          command: 'ask'
        });
        
        // Get AI client and send request
        const aiClient = await getAI();
        const result = await aiClient.query(question, {
          maxTokens: 2048
        });
        
        // Extract the response
        const responseText = result.message.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n') || 'No response received';
        
        console.log(responseText);
        
        // Track AI response
        await conversationHistory.addMessage('assistant', responseText, {
          command: 'ask',
          model: result.model || 'claude-3-5-sonnet-20241022',
          tokens: result.usage ? {
            input: result.usage.input_tokens,
            output: result.usage.output_tokens
          } : undefined
        });
        
        // Show usage metrics if available
        if (result.usage) {
          console.log(`\n📊 Tokens: ${result.usage.input_tokens} in, ${result.usage.output_tokens} out`);
        }
        
      } catch (error) {
        const errorMessage = formatErrorForDisplay(error);
        console.error('Error asking question:', errorMessage);
        
        // Track error in history
        try {
          const { conversationHistory } = await import('../utils/conversation-history.js');
          await conversationHistory.addMessage('system', `Error: ${errorMessage}`, {
            command: 'ask'
          });
        } catch (historyError) {
          // Don't fail if history tracking fails
        }
      }
    },
    args: [
      {
        name: 'question',
        description: 'Question to ask Claude',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ]
  };
  
  commandRegistry.register(command);
}

/**
 * Register explain command
 */
function registerExplainCommand(): void {
  const command: CommandDef = {
    name: 'explain',
    description: 'Explain a code file or snippet',
    category: CommandCategory.ASSISTANCE,
    handler: async (args: any) => {
      try {
        const { file } = args;
        
        // Validate file path
        if (!isNonEmptyString(file)) {
          console.error('Please provide a file path to explain.');
          return;
        }
        
        // Check if file exists
        if (!await fileExists(file)) {
          console.error(`File not found: ${file}`);
          return;
        }
        
        console.log(`Explaining ${file}...\n`);
        
        // Read the file
        const fileContent = await readTextFile(file);
        
        // Construct the prompt using the template
        const { PROMPT_TEMPLATES } = await import('../ai/prompts.js');
        const explainTemplate = PROMPT_TEMPLATES.explainCode;
        const prompt = explainTemplate.template.replace('{code}', fileContent);
        
        // Get AI client and send request
        const aiClient = await getAI();
        const result = await aiClient.query(prompt, {
          system: explainTemplate.system,
          maxTokens: 2048
        });
        
        // Extract and print the response
        const responseText = result.message.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n') || 'No explanation received';
        console.log(responseText);
        
        // Show usage metrics if available
        if (result.usage) {
          console.log(`\n📊 Tokens: ${result.usage.input_tokens} in, ${result.usage.output_tokens} out`);
        }
      } catch (error) {
        console.error('Error explaining code:', formatErrorForDisplay(error));
      }
    },
    args: [
      {
        name: 'file',
        description: 'File to explain',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'detail',
        description: 'Level of detail',
        type: ArgType.STRING,
        shortFlag: 'd',
        choices: ['basic', 'intermediate', 'detailed'],
        default: 'intermediate'
      }
    ]
  };
  
  commandRegistry.register(command);
}

/**
 * Register refactor command
 */
function registerRefactorCommand(): void {
  const command: CommandDef = {
    name: 'refactor',
    description: 'Refactor code for better readability, performance, or structure',
    category: CommandCategory.CODE_GENERATION,
    handler: async (args: any) => {
      try {
        const { file, focus } = args;
        
        // Validate file path
        if (!isNonEmptyString(file)) {
          console.error('Please provide a file path to refactor.');
          return;
        }
        
        // Check if file exists
        if (!await fileExists(file)) {
          console.error(`File not found: ${file}`);
          return;
        }
        
        console.log(`Refactoring ${file} with focus on ${focus}...\n`);
        
        // Read the file
        const fileContent = await readTextFile(file);
        
        // Construct the prompt using the template
        const { PROMPT_TEMPLATES } = await import('../ai/prompts.js');
        const refactorTemplate = PROMPT_TEMPLATES.refactorCode;
        const prompt = refactorTemplate.template
          .replace('{code}', fileContent)
          .replace('{focus}', focus || 'readability and maintainability')
          .replace('{context}', 'None');
        
        // Get AI client and send request
        const aiClient = await getAI();
        const result = await aiClient.query(prompt, {
          system: refactorTemplate.system,
          maxTokens: 4096
        });
        
        // Extract and print the response
        const responseText = result.message.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n') || 'No refactored code received';
        console.log(responseText);
        
        // Show usage metrics if available
        if (result.usage) {
          console.log(`\n📊 Tokens: ${result.usage.input_tokens} in, ${result.usage.output_tokens} out`);
        }
      } catch (error) {
        console.error('Error refactoring code:', formatErrorForDisplay(error));
      }
    },
    args: [
      {
        name: 'file',
        description: 'File to refactor',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'focus',
        description: 'Focus of the refactoring',
        type: ArgType.STRING,
        shortFlag: 'f',
        choices: ['readability', 'performance', 'simplicity', 'maintainability'],
        default: 'readability'
      },
      {
        name: 'output',
        description: 'Output file path (defaults to stdout)',
        type: ArgType.STRING,
        shortFlag: 'o'
      }
    ]
  };
  
  commandRegistry.register(command);
}

/**
 * Register fix command
 */
function registerFixCommand(): void {
  const command: CommandDef = {
    name: 'fix',
    description: 'Fix bugs or issues in code',
    category: CommandCategory.ASSISTANCE,
    handler: async (args: any) => {
      try {
        const { file, issue } = args;
        
        // Validate file path
        if (!isNonEmptyString(file)) {
          console.error('Please provide a file path to fix.');
          return;
        }
        
        // Check if file exists
        if (!await fileExists(file)) {
          console.error(`File not found: ${file}`);
          return;
        }
        
        console.log(`Fixing ${file}...\n`);
        
        // Read the file
        const fileContent = await readTextFile(file);
        
        // Construct the prompt using the template
        const { PROMPT_TEMPLATES } = await import('../ai/prompts.js');
        const debugTemplate = PROMPT_TEMPLATES.debugCode;
        const prompt = debugTemplate.template
          .replace('{code}', fileContent)
          .replace('{issue}', issue || 'Identify and fix any issues')
          .replace('{errorMessages}', 'None specified');
        
        // Get AI client and send request
        const aiClient = await getAI();
        const result = await aiClient.query(prompt, {
          system: debugTemplate.system,
          maxTokens: 4096
        });
        
        // Extract and print the response
        const responseText = result.message.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n') || 'No fixed code received';
        console.log(responseText);
        
        // Show usage metrics if available
        if (result.usage) {
          console.log(`\n📊 Tokens: ${result.usage.input_tokens} in, ${result.usage.output_tokens} out`);
        }
      } catch (error) {
        console.error('Error fixing code:', formatErrorForDisplay(error));
      }
    },
    args: [
      {
        name: 'file',
        description: 'File to fix',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'issue',
        description: 'Specific issue to fix (optional)',
        type: ArgType.STRING,
        shortFlag: 'i'
      }
    ]
  };
  
  commandRegistry.register(command);
}

/**
 * Register generate command
 */
function registerGenerateCommand(): void {
  const command: CommandDef = {
    name: 'generate',
    description: 'Generate code based on a prompt',
    category: CommandCategory.CODE_GENERATION,
    handler: async (args: any) => {
      try {
        const { prompt, language, output } = args;
        
        // Validate prompt
        if (!isNonEmptyString(prompt)) {
          console.error('Please provide a prompt for code generation.');
          return;
        }
        
        console.log(`Generating ${language} code...\n`);
        
        // Construct the prompt using the template
        const { PROMPT_TEMPLATES } = await import('../ai/prompts.js');
        const generateTemplate = PROMPT_TEMPLATES.generateCode;
        const fullPrompt = generateTemplate.template
          .replace('{task}', prompt)
          .replace('{language}', language || 'JavaScript')
          .replace('{requirements}', '- Write clean, well-documented code\n- Follow best practices');
        
        // Get AI client and send request
        const aiClient = await getAI();
        const result = await aiClient.query(fullPrompt, {
          system: generateTemplate.system,
          maxTokens: 4096
        });
        
        // Extract the response
        const responseText = result.message.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n') || 'No code generated';
        
        // Output to file or console
        if (output) {
          const { writeTextFile } = await import('../fs/operations.js');
          await writeTextFile(output, responseText);
          console.log(`Code generated and saved to: ${output}`);
        } else {
          console.log(responseText);
        }
        
        // Show usage metrics if available
        if (result.usage) {
          console.log(`\n📊 Tokens: ${result.usage.input_tokens} in, ${result.usage.output_tokens} out`);
        }
      } catch (error) {
        console.error('Error generating code:', formatErrorForDisplay(error));
      }
    },
    args: [
      {
        name: 'prompt',
        description: 'Description of the code to generate',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'language',
        description: 'Programming language for the generated code',
        type: ArgType.STRING,
        shortFlag: 'l',
        default: 'JavaScript'
      },
      {
        name: 'output',
        description: 'Output file path (defaults to stdout)',
        type: ArgType.STRING,
        shortFlag: 'o'
      }
    ]
  };
  
  commandRegistry.register(command);
}

/**
 * Register config command
 */
function registerConfigCommand(): void {
  logger.debug('Registering config command');

  const command: CommandDef = {
    name: 'config',
    description: 'View or set configuration values',
    category: CommandCategory.SETTINGS,
    async handler({ key, value }: { key?: string; value?: string }) {
      logger.info('Executing config command');
      
      try {
        const configModule = await import('../config/index.js');
        // Load the current configuration
        const currentConfig = await configModule.loadConfig();
        
        if (!key) {
          // Display the current configuration
          logger.info('Current configuration:');
          console.log(JSON.stringify(currentConfig, null, 2));
          return;
        }
        
        // Handle nested keys like "api.baseUrl"
        const keyPath = key.split('.');
        let configSection: any = currentConfig;
        
        // Navigate to the nested config section
        for (let i = 0; i < keyPath.length - 1; i++) {
          configSection = configSection[keyPath[i]];
          if (!configSection) {
            throw new Error(`Configuration key '${key}' not found`);
          }
        }
        
        const finalKey = keyPath[keyPath.length - 1];
        
        if (value === undefined) {
          // Get the value
          const keyValue = configSection[finalKey];
          if (keyValue === undefined) {
            throw new Error(`Configuration key '${key}' not found`);
          }
          logger.info(`${key}: ${JSON.stringify(keyValue)}`);
        } else {
          // Set the value
          // Parse the value if needed (convert strings to numbers/booleans)
          let parsedValue: any = value;
          if (value.toLowerCase() === 'true') parsedValue = true;
          else if (value.toLowerCase() === 'false') parsedValue = false;
          else if (!isNaN(Number(value))) parsedValue = Number(value);
          
          // Update the config in memory
          configSection[finalKey] = parsedValue;
          
          // Save the updated config to file
          // Since there's no direct saveConfig function, we'd need to implement
          // this part separately to write to a config file
          logger.info(`Configuration updated in memory: ${key} = ${JSON.stringify(parsedValue)}`);
          logger.warn('Note: Configuration changes are only temporary for this session');
          // In a real implementation, we would save to the config file
        }
      } catch (error) {
        logger.error(`Error executing config command: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    },
    args: [
      {
        name: 'key',
        description: 'Configuration key (e.g., "api.baseUrl")',
        type: ArgType.STRING,
        required: false
      },
      {
        name: 'value',
        description: 'New value to set',
        type: ArgType.STRING,
        required: false
      }
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register bug command
 */
function registerBugCommand(): void {
  logger.debug('Registering bug command');

  const command: CommandDef = {
    name: 'bug',
    description: 'Report a bug or issue',
    category: CommandCategory.SUPPORT,
    async handler(args: any): Promise<void> {
      logger.info('Executing bug command');
      
      const description = args.description;
      if (!isNonEmptyString(description)) {
        throw createUserError('Bug description is required', {
          category: ErrorCategory.VALIDATION,
          resolution: 'Please provide a description of the bug you encountered'
        });
      }
      
      try {
        // In a real implementation, this would send the bug report to a server
        logger.info('Submitting bug report...');
        
        // Get system information
        const os = await import('os');
        const systemInfo = {
          platform: os.platform(),
          release: os.release(),
          nodeVersion: process.version,
          appVersion: '0.2.29', // This would come from package.json in a real implementation
          timestamp: new Date().toISOString()
        };
        
        // Get current telemetry client
        const telemetryModule = await import('../telemetry/index.js');
        const telemetryManager = telemetryModule.telemetry;
        
        telemetryManager.captureMessage(`Bug report: ${description}`, 'info');
        
        logger.info('Bug report submitted successfully');
        console.log('Thank you for your bug report. Our team will investigate the issue.');
        
      } catch (error) {
        logger.error(`Error submitting bug report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    },
    args: [
      {
        name: 'description',
        description: 'Description of the bug or issue',
        type: ArgType.STRING,
        required: true
      }
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register feedback command
 */
function registerFeedbackCommand(): void {
  logger.debug('Registering feedback command');

  const command: CommandDef = {
    name: 'feedback',
    description: 'Provide general feedback about Vibex',
    category: CommandCategory.SUPPORT,
    async handler(args: any): Promise<void> {
      logger.info('Executing feedback command');
      
      const { feedback, screenshot } = args;
      
      let screenshotPath: string | undefined;
      
      // If screenshot is requested, capture it before sending feedback
      if (screenshot) {
        try {
          console.log('📸 Taking screenshot...');
          
          const { takeScreenshot } = await import('../tools/screenshot.js');
          const result = await takeScreenshot({
            type: 'terminal',
            quality: 85,
            delay: 1000 // Give user a moment to prepare
          });
          
          screenshotPath = result.filePath;
          console.log(`Screenshot saved: ${screenshotPath}`);
        } catch (error) {
          console.warn(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`);
          console.log('Continuing with feedback submission without screenshot...');
        }
      }
      
      if (feedback) {
        // Get current telemetry client
        const telemetryModule = await import('../telemetry/index.js');
        const telemetryManager = telemetryModule.telemetry;
        
        if (telemetryManager) {
          // In a real implementation, this would send the feedback to a server
          logger.info('Submitting feedback...');
          
          // Get system information
          const os = await import('os');
          const systemInfo = {
            platform: os.platform(),
            release: os.release(),
            nodeVersion: process.version,
            appVersion: '0.2.29', // This would come from package.json in a real implementation
            timestamp: new Date().toISOString(),
            screenshotPath
          };
          
          const feedbackMessage = `User feedback: ${feedback}${screenshotPath ? ` (Screenshot: ${screenshotPath})` : ''}`;
          telemetryManager.captureMessage(feedbackMessage, 'info');
          
          logger.info('Feedback submitted successfully');
          console.log('✅ Thank you for your feedback! We appreciate your input.');
          
          if (screenshotPath) {
            console.log(`📸 Screenshot included: ${screenshotPath}`);
          }
        }
      }
    },
    args: [
      {
        name: 'feedback',
        description: 'Your feedback about Claude Code',
        type: ArgType.STRING,
        required: true
      },
      {
        name: 'screenshot',
        description: 'Include a screenshot with your feedback',
        type: ArgType.BOOLEAN,
        shortFlag: 's'
      }
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register run command
 */
function registerRunCommand(): void {
  logger.debug('Registering run command');

  const command: CommandDef = {
    name: 'run',
    description: 'Execute a terminal command',
    category: CommandCategory.SYSTEM,
    async handler(args: any): Promise<void> {
      logger.info('Executing run command');
      
      const { command: commandToRun } = args;
      if (!isNonEmptyString(commandToRun)) {
        throw createUserError('Please provide a command to run.', {
          category: ErrorCategory.VALIDATION,
          resolution: 'Please provide a command to execute'
        });
      }
      
      try {
        logger.info(`Running command: ${commandToRun}`);
        
        // Execute the command
        const { exec } = await import('child_process');
        const util = await import('util');
        const execPromise = util.promisify(exec);
        
        logger.debug(`Executing: ${commandToRun}`);
        const { stdout, stderr } = await execPromise(commandToRun);
        
        if (stdout) {
          console.log(stdout);
        }
        
        if (stderr) {
          console.error(stderr);
        }
        
        logger.info('Command executed successfully');
      } catch (error) {
        logger.error(`Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
        }
        
        throw error;
      }
    },
    args: [
      {
        name: 'command',
        description: 'The command to execute',
        type: ArgType.STRING,
        required: true
      }
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register search command
 */
function registerSearchCommand(): void {
  logger.debug('Registering search command');

  const command: CommandDef = {
    name: 'search',
    description: 'Search the codebase for a term',
    category: CommandCategory.SYSTEM,
    async handler(args: any): Promise<void> {
      logger.info('Executing search command');
      
      const term = args.term;
      if (!isNonEmptyString(term)) {
        throw createUserError('Search term is required', {
          category: ErrorCategory.VALIDATION,
          resolution: 'Please provide a term to search for'
        });
      }
      
      try {
        logger.info(`Searching for: ${term}`);
        
        // Get search directory (current directory if not specified)
        const searchDir = args.dir || process.cwd();
        
        // Execute the search using ripgrep if available, otherwise fall back to simple grep
        const { exec } = await import('child_process');
        const util = await import('util');
        const execPromise = util.promisify(exec);
        
        let searchCommand;
        const searchPattern = term.includes(' ') ? `"${term}"` : term;
        
        try {
          // Try to use ripgrep (rg) for better performance
          await execPromise('rg --version');
          
          // Ripgrep is available, use it
          searchCommand = `rg --color=always --line-number --heading --smart-case ${searchPattern} ${searchDir}`;
        } catch {
          // Fall back to grep (available on most Unix systems)
          searchCommand = `grep -r --color=always -n "${term}" ${searchDir}`;
        }
        
        logger.debug(`Running search command: ${searchCommand}`);
        const { stdout, stderr } = await execPromise(searchCommand);
        
        if (stderr) {
          console.error(stderr);
        }
        
        if (stdout) {
          console.log(stdout);
        } else {
          console.log(`No results found for '${term}'`);
        }
        
        logger.info('Search completed');
      } catch (error) {
        logger.error(`Error searching codebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
        }
        
        throw error;
      }
    },
    args: [
      {
        name: 'term',
        description: 'The term to search for',
        type: ArgType.STRING,
        position: 0,
        required: true
      },
      {
        name: 'dir',
        description: 'Directory to search in (defaults to current directory)',
        type: ArgType.STRING,
        shortFlag: 'd'
      }
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register theme command
 */
function registerThemeCommand(): void {
  logger.debug('Registering theme command');

  const command: CommandDef = {
    name: 'theme',
    description: 'View or set the theme',
    category: CommandCategory.SETTINGS,
    async handler(args: any): Promise<void> {
      logger.info('Executing theme command');
      
      const theme = args.name;
      if (!isNonEmptyString(theme)) {
        // If no theme is specified, display the current theme
        const configModule = await import('../config/index.js');
        const currentConfig = await configModule.loadConfig();
        
        console.log(`Current theme: ${currentConfig.terminal?.theme || 'default'}`);
        return;
      }
      
      // Validate the theme
      const validThemes = ['dark', 'light', 'system'];
      if (!validThemes.includes(theme.toLowerCase())) {
        throw createUserError(`Invalid theme: ${theme}`, {
          category: ErrorCategory.VALIDATION,
          resolution: `Please choose one of: ${validThemes.join(', ')}`
        });
      }
      
      try {
        // Update the theme in the configuration
        const configModule = await import('../config/index.js');
        const currentConfig = await configModule.loadConfig();
        
        if (currentConfig.terminal) {
          currentConfig.terminal.theme = theme as 'dark' | 'light' | 'system';
        }
        
        // await configModule.saveConfig(currentConfig);
        
        logger.info(`Theme updated to: ${theme}`);
        console.log(`Theme set to: ${theme}`);
        console.log('Note: Theme changes are only temporary for this session. Use the config command to make permanent changes.');
        
      } catch (error) {
        logger.error(`Error changing theme: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    },
    args: [
      {
        name: 'name',
        description: 'Theme name (dark, light, system)',
        type: ArgType.STRING,
        position: 0,
        required: false
      }
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register verbosity command
 */
function registerVerbosityCommand(): void {
  logger.debug('Registering verbosity command');

  const command: CommandDef = {
    name: 'verbosity',
    description: 'View or set the logging verbosity level',
    category: CommandCategory.SETTINGS,
    async handler(args: any): Promise<void> {
      logger.info('Executing verbosity command');
      
      const level = args.level;
      
      try {
        // If no level is specified, display the current verbosity level
        if (!isNonEmptyString(level)) {
          const configModule = await import('../config/index.js');
          const currentConfig = await configModule.loadConfig();
          
          console.log(`Current verbosity level: ${currentConfig.logger?.level || 'info'}`);
          return;
        }
        
        // Validate the verbosity level and map to LogLevel
        const { LogLevel } = await import('../utils/logger.js');
        let logLevel: any;
        
        switch (level.toLowerCase()) {
          case 'debug':
            logLevel = LogLevel.DEBUG;
            break;
          case 'info':
            logLevel = LogLevel.INFO;
            break;
          case 'warn':
            logLevel = LogLevel.WARN;
            break;
          case 'error':
            logLevel = LogLevel.ERROR;
            break;
          case 'silent':
            logLevel = LogLevel.SILENT;
            break;
          default:
            console.error(`Invalid verbosity level: ${level}`);
            return;
        }
        
        // Update the verbosity level in the configuration
        const configModule = await import('../config/index.js');
        const currentConfig = await configModule.loadConfig();
        
        if (currentConfig.logger) {
          currentConfig.logger.level = level.toLowerCase();
        }
        
        // await configModule.saveConfig(currentConfig);
        
        logger.info(`Verbosity level updated to: ${level}`);
        console.log(`Verbosity level set to: ${level}`);
        
      } catch (error) {
        logger.error(`Error changing verbosity level: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    },
    args: [
      {
        name: 'level',
        description: 'Verbosity level (debug, info, warn, error, silent)',
        type: ArgType.STRING,
        position: 0,
        required: false
      }
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register edit command
 */
function registerEditCommand(): void {
  logger.debug('Registering edit command');

  const command: CommandDef = {
    name: 'edit',
    description: 'Edit a file with AI assistance',
    category: CommandCategory.DEV,
    async handler(args: any): Promise<void> {
      logger.info('Executing edit command');
      
      const file = args.file;
      if (!isNonEmptyString(file)) {
        throw createUserError('File path is required', {
          category: ErrorCategory.VALIDATION,
          resolution: 'Please provide a file path to edit'
        });
      }
      
      try {
        // Check if file exists
        const fs = await import('fs/promises');
        const path = await import('path');
        
        // Resolve the file path
        const resolvedPath = path.resolve(process.cwd(), file);
        
        try {
          // Check if file exists
          await fs.access(resolvedPath);
        } catch (error) {
          // If file doesn't exist, create it with empty content
          logger.info(`File doesn't exist, creating: ${resolvedPath}`);
          await fs.writeFile(resolvedPath, '');
        }
        
        logger.info(`Opening file for editing: ${resolvedPath}`);
        
        // On different platforms, open the file with different editors
        const { platform } = await import('os');
        const { exec } = await import('child_process');
        const util = await import('util');
        const execPromise = util.promisify(exec);
        
        let editorCommand;
        const systemPlatform = platform();
        
        // Try to use the EDITOR environment variable first
        const editor = process.env.EDITOR;
        
        if (editor) {
          editorCommand = `${editor} "${resolvedPath}"`;
        } else {
          // Default editors based on platform
          if (systemPlatform === 'win32') {
            editorCommand = `notepad "${resolvedPath}"`;
          } else if (systemPlatform === 'darwin') {
            editorCommand = `open -a TextEdit "${resolvedPath}"`;
          } else {
            // Try nano first, fall back to vi
            try {
              await execPromise('which nano');
              editorCommand = `nano "${resolvedPath}"`;
            } catch {
              editorCommand = `vi "${resolvedPath}"`;
            }
          }
        }
        
        logger.debug(`Executing editor command: ${editorCommand}`);
        console.log(`Opening ${resolvedPath} for editing...`);
        
        const child = exec(editorCommand);
        
        // Log when the editor process exits
        child.on('exit', (code) => {
          logger.info(`Editor process exited with code: ${code}`);
          if (code === 0) {
            console.log(`File saved: ${resolvedPath}`);
          } else {
            console.error(`Editor exited with non-zero code: ${code}`);
          }
        });
        
        // Wait for the editor to start
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
      } catch (error) {
        logger.error(`Error editing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    },
    args: [
      {
        name: 'file',
        description: 'File path to edit',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register git command
 */
function registerGitCommand(): void {
  logger.debug('Registering git command');

  const command: CommandDef = {
    name: 'git',
    description: 'Git operations with AI assistance',
    category: CommandCategory.DEV,
    async handler(args: any): Promise<void> {
      logger.info('Executing git command');
      
      const operation = args.operation;
      if (!isNonEmptyString(operation)) {
        throw createUserError('Git operation is required', {
          category: ErrorCategory.VALIDATION,
          resolution: 'Please provide a git operation to perform'
        });
      }
      
      try {
        logger.info(`Performing git operation: ${operation}`);
        
        // Check if git is installed
        const { exec } = await import('child_process');
        const util = await import('util');
        const execPromise = util.promisify(exec);
        
        try {
          await execPromise('git --version');
        } catch (error) {
          throw createUserError('Git is not installed or not in PATH', {
            category: ErrorCategory.COMMAND_EXECUTION,
            resolution: 'Please install git or add it to your PATH'
          });
        }
        
        // Validate the operation is a simple command without pipes, redirection, etc.
        const validOpRegex = /^[a-z0-9\-_\s]+$/i;
        if (!validOpRegex.test(operation)) {
          throw createUserError('Invalid git operation', {
            category: ErrorCategory.VALIDATION,
            resolution: 'Please provide a simple git operation without special characters'
          });
        }
        
        // Construct and execute the git command
        const gitCommand = `git ${operation}`;
        logger.debug(`Executing git command: ${gitCommand}`);
        
        const { stdout, stderr } = await execPromise(gitCommand);
        
        if (stderr) {
          console.error(stderr);
        }
        
        if (stdout) {
          console.log(stdout);
        }
        
        logger.info('Git operation completed');
      } catch (error) {
        logger.error(`Error executing git operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
        }
        
        throw error;
      }
    },
    args: [
      {
        name: 'operation',
        description: 'Git operation to perform',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register exit command
 */
function registerExitCommand(): void {
  const command: CommandDef = {
    name: 'exit',
    description: 'Exit the application',
    category: CommandCategory.SESSION,
    async handler(): Promise<void> {
      logger.info('Executing exit command');
      console.log('Exiting Claude Code CLI...');
      process.exit(0);
    }
  };

  commandRegistry.register(command);
}

/**
 * Register quit command
 */
function registerQuitCommand(): void {
  const command: CommandDef = {
    name: 'quit',
    description: 'Exit the application',
    category: CommandCategory.SESSION,
    async handler(): Promise<void> {
      logger.info('Executing quit command');
      console.log('Exiting Claude Code CLI...');
      process.exit(0);
    }
  };

  commandRegistry.register(command);
}

/**
 * Register clear command
 */
function registerClearCommand(): void {
  const command: CommandDef = {
    name: 'clear',
    description: 'Clear the terminal screen',
    category: CommandCategory.SESSION,
    async handler(): Promise<void> {
      logger.info('Executing clear command');
      
      // Clear the console using the appropriate method for the current platform
      // This is the cross-platform way to clear the terminal
      process.stdout.write('\x1Bc');
      
      console.log('Display cleared.');
    }
  };

  commandRegistry.register(command);
}

/**
 * Register reset command
 */
function registerResetCommand(): void {
  const command: CommandDef = {
    name: 'reset',
    description: 'Reset the conversation history',
    category: CommandCategory.SESSION,
    async handler(): Promise<void> {
      logger.info('Executing reset command');
      
      try {
        // Since there's no direct reset method, we'll reinitialize the AI client
        logger.info('Reinitializing AI client to reset conversation context');
        
        // Re-initialize the AI client
        await initAI();
        
        console.log('Conversation context has been reset.');
        logger.info('AI client reinitialized, conversation context reset');
      } catch (error) {
        logger.error(`Error resetting conversation context: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }
  };

  commandRegistry.register(command);
}

/**
 * Register history command
 */
function registerHistoryCommand(): void {
  const command: CommandDef = {
    name: 'history',
    description: 'View conversation history',
    category: CommandCategory.SESSION,
    async handler(args: Record<string, any>): Promise<void> {
      logger.info('Executing history command');
      
      try {
        const { limit, search, export: exportPath, session } = args;
        
        // Import the conversation history manager
        const { conversationHistory } = await import('../utils/conversation-history.js');
        
        // Initialize if not already done
        try {
          await conversationHistory.initialize();
        } catch (error) {
          // May already be initialized
        }
        
        if (exportPath && session) {
          // Export a specific session
          try {
            await conversationHistory.exportSession(session, exportPath);
            console.log(`✅ Session exported to: ${exportPath}`);
            return;
          } catch (error) {
            console.error(`Failed to export session: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return;
          }
        }
        
        if (search) {
          // Search through conversation history
          console.log(`🔍 Searching for: "${search}"\n`);
          
          const results = await conversationHistory.searchMessages(search, limit || 20);
          
          if (results.length === 0) {
            console.log('No messages found matching your search.');
            return;
          }
          
          console.log(`Found ${results.length} matching messages:\n`);
          
          results.forEach((message, index) => {
            const timestamp = new Date(message.timestamp).toLocaleString();
            const role = message.role.toUpperCase().padEnd(9);
            const preview = message.content.length > 100 
              ? message.content.substring(0, 100) + '...'
              : message.content;
            
            console.log(`${index + 1}. [${timestamp}] ${role} ${preview}`);
            
            if (message.metadata?.command) {
              console.log(`   Command: /${message.metadata.command}`);
            }
            if (message.metadata?.file) {
              console.log(`   File: ${message.metadata.file}`);
            }
            console.log('');
          });
          
          return;
        }
        
        if (session) {
          // Show a specific session
          try {
            const sessionData = await conversationHistory.loadSession(session);
            
            console.log(`📖 Session: ${sessionData.title || sessionData.id}`);
            console.log(`Started: ${new Date(sessionData.startTime).toLocaleString()}`);
            if (sessionData.endTime) {
              console.log(`Ended: ${new Date(sessionData.endTime).toLocaleString()}`);
            }
            if (sessionData.stats) {
              console.log(`Messages: ${sessionData.stats.messageCount}, Tokens: ${sessionData.stats.totalTokens}`);
            }
            console.log('');
            
            const messagesToShow = limit ? sessionData.messages.slice(-limit) : sessionData.messages;
            
            messagesToShow.forEach((message, index) => {
              const timestamp = new Date(message.timestamp).toLocaleTimeString();
              const role = message.role.toUpperCase().padEnd(9);
              
              console.log(`[${timestamp}] ${role} ${message.content}`);
              
              if (message.metadata?.tokens) {
                console.log(`   Tokens: ${message.metadata.tokens.input} in, ${message.metadata.tokens.output} out`);
              }
              console.log('');
            });
            
            return;
          } catch (error) {
            console.error(`Session not found: ${session}`);
            return;
          }
        }
        
        // Show recent sessions
        const sessions = await conversationHistory.listSessions();
        
        if (sessions.length === 0) {
          console.log('📜 No conversation history available.');
          console.log('Start a conversation to begin tracking history.');
          return;
        }
        
        const sessionsToShow = sessions.slice(0, limit || 10);
        
        console.log(`📜 Recent Sessions (showing ${sessionsToShow.length} of ${sessions.length}):\n`);
        
        sessionsToShow.forEach((session, index) => {
          const startTime = new Date(session.startTime).toLocaleString();
          const duration = session.endTime 
            ? Math.round((session.endTime - session.startTime) / 1000 / 60) + ' min'
            : 'ongoing';
          
          console.log(`${index + 1}. ${session.title}`);
          console.log(`   ID: ${session.id}`);
          console.log(`   Started: ${startTime} (${duration})`);
          console.log(`   Messages: ${session.messageCount}`);
          console.log('');
        });
        
        console.log('💡 Use the following commands to explore history:');
        console.log('   /history --session <session-id>     View specific session');
        console.log('   /history --search <query>           Search messages');
        console.log('   /history --export <path> --session <id>  Export session');
        
      } catch (error) {
        logger.error(`Error retrieving conversation history: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('Failed to retrieve conversation history. History tracking may be disabled.');
      }
    },
    args: [
      {
        name: 'limit',
        description: 'Maximum number of items to display',
        type: ArgType.NUMBER,
        shortFlag: 'l',
        required: false,
        default: 10
      },
      {
        name: 'search',
        description: 'Search for messages containing this text',
        type: ArgType.STRING,
        shortFlag: 's',
        required: false
      },
      {
        name: 'session',
        description: 'Show or export a specific session by ID',
        type: ArgType.STRING,
        required: false
      },
      {
        name: 'export',
        description: 'Export session to file (requires --session)',
        type: ArgType.STRING,
        shortFlag: 'e',
        required: false
      }
    ]
  };

  commandRegistry.register(command);
}

/**
 * Register commands command
 */
function registerCommandsCommand(): void {
  const command: CommandDef = {
    name: 'commands',
    description: 'List all available commands',
    category: CommandCategory.HELP,
    async handler(): Promise<void> {
      logger.info('Executing commands command');
      
      try {
        // Get all registered commands
        const allCommands = commandRegistry.list()
          .sort((a, b) => {
            // Sort first by category, then by name
            if (a.category && b.category) {
              if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
              }
            } else if (a.category) {
              return -1;
            } else if (b.category) {
              return 1;
            }
            return a.name.localeCompare(b.name);
          });
        
        // Group commands by category
        const categories = new Map<string, CommandDef[]>();
        const uncategorizedCommands: CommandDef[] = [];
        
        for (const cmd of allCommands) {
          if (cmd.category) {
            if (!categories.has(cmd.category)) {
              categories.set(cmd.category, []);
            }
            categories.get(cmd.category)!.push(cmd);
          } else {
            uncategorizedCommands.push(cmd);
          }
        }
        
        console.log('Available slash commands:\n');
        
        // Display uncategorized commands first
        if (uncategorizedCommands.length > 0) {
          for (const cmd of uncategorizedCommands) {
            console.log(`/${cmd.name.padEnd(15)} ${cmd.description}`);
          }
          console.log('');
        }
        
        // Display categorized commands
        for (const [category, commands] of categories.entries()) {
          console.log(`${category}:`);
          for (const cmd of commands) {
            console.log(`  /${cmd.name.padEnd(13)} ${cmd.description}`);
          }
          console.log('');
        }
        
        console.log('For more information on a specific command, use:');
        console.log('  /help <command>');
        
      } catch (error) {
        logger.error(`Error listing commands: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }
  };

  commandRegistry.register(command);
}

/**
 * Register help command
 */
function registerHelpCommand(): void {
  logger.debug('Registering help command');

  const createUsage = (command: CommandDef): string => {
    const helpText: string[] = [];

    command.args?.forEach((arg: { name: string; position?: number }) => {
      if (arg.position === undefined) {
        helpText.push(`[--${arg.name}]`);
      } else {
        helpText.push(`<${arg.name}>`);
      }
    });

    return helpText.join(' ');
  }

  const command: CommandDef = {
    name: 'help',
    description: 'Get help for a specific command',
    category: CommandCategory.HELP,
    async handler(args: Record<string, any>): Promise<void> {
      logger.info('Executing help command');
      
      const commandName = args.command;
      if (!isNonEmptyString(commandName)) {
        throw createUserError('Command name is required', {
          category: ErrorCategory.VALIDATION,
          resolution: 'Please provide a command name to get help for'
        });
      }
      
      try {
        // Get the command definition
        const command = commandRegistry.get(commandName);
        if (!command) {
          throw createUserError(`Command not found: ${commandName}`, {
            category: ErrorCategory.VALIDATION,
            resolution: 'Please check the command name and try again'
          });
        }
        
        // Display command information
        console.log(`Command: ${command.name}`);
        console.log(`Description: ${command.description}`);
        if (command.category) {
          console.log(`Category: ${command.category}`);
        }
        
        // Display command usage
        console.log('\nUsage:');
        if (command.args && command.args.length > 0) {
          console.log(`  /${command.name} ${command.args.map((arg: {name: string}) => arg.name).join(' ')}`);
        } else {
          console.log(`  /${command.name}`);
        }
        
        // Display command arguments
        if (command.args && command.args.length > 0) {
          console.log('\nArguments:');
          for (const arg of command.args) {
            console.log(`  ${arg.name}: ${arg.description}`);
          }
        }
        
        logger.info('Help information retrieved');
      } catch (error) {
        logger.error(`Error retrieving help: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    },
    args: [
      {
        name: 'command',
        description: 'The command to get help for',
        type: ArgType.STRING,
        position: 0,
        required: true
      }
    ]
  };

  commandRegistry.register(command);
}

function createConfigView(key: string, value: any): string {
  if (key === 'api.key' && typeof value === 'string' && value.length > 0) {
    return '********' + value.slice(-4);
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, (k: any, v: any) => (k === 'key' && typeof v === 'string' && v.length > 0) ? '********' + v.slice(-4) : v, 2);
  }
  return String(value);
}

function renderTable(data: any[][]) {
  const tableConfig = {
    border: {
      topBody: `─`, topJoin: `┬`, topLeft: `┌`, topRight: `┐`,
      bottomBody: `─`, bottomJoin: `┴`, bottomLeft: `└`, bottomRight: `┘`,
      bodyLeft: `│`, bodyRight: `│`, bodyJoin: `│`,
      headerJoin: '│'
    },
    drawHorizontalLine: (index: number, size: number) => {
      return index === 0 || index === 1 || index === size;
    }
  };
  console.log(table(data, tableConfig));
} 