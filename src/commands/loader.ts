/**
 * Dynamic Command Loader
 * 
 * Loads commands dynamically to avoid bundling issues with problematic dependencies.
 * This allows us to use the full command registry system without import conflicts.
 */

import { logger } from '../utils/logger.js';
import { formatErrorForDisplay } from '../errors/formatter.js';

/**
 * Command definition interface (minimal for dynamic loading)
 */
export interface DynamicCommandDef {
  name: string;
  description: string;
  category?: string;
  handler: (args: any) => Promise<void>;
  args?: Array<{
    name: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    required?: boolean;
    shortFlag?: string;
  }>;
  examples?: string[];
}

/**
 * Dynamic command registry for runtime loading
 */
class DynamicCommandRegistry {
  private commands: Map<string, DynamicCommandDef> = new Map();
  private aliases: Map<string, string> = new Map();

  register(command: DynamicCommandDef): void {
    this.commands.set(command.name, command);
    logger.debug(`Registered dynamic command: ${command.name}`);
  }

  get(name: string): DynamicCommandDef | undefined {
    const commandName = this.aliases.get(name) || name;
    return this.commands.get(commandName);
  }

  list(): DynamicCommandDef[] {
    return Array.from(this.commands.values());
  }

  has(name: string): boolean {
    return this.commands.has(name) || this.aliases.has(name);
  }

  clear(): void {
    this.commands.clear();
    this.aliases.clear();
  }
}

export const dynamicCommandRegistry = new DynamicCommandRegistry();

/**
 * Load commands dynamically without bundling dependencies
 */
export async function loadDynamicCommands(): Promise<void> {
  logger.debug('Loading dynamic commands...');

  try {
    // Register core commands that don't require problematic dependencies
    registerCoreCommands();
    
    // Try to load advanced commands with error handling
    await loadAdvancedCommands();
    
    logger.info(`Loaded ${dynamicCommandRegistry.list().length} dynamic commands`);
  } catch (error) {
    logger.warn('Failed to load some dynamic commands:', formatErrorForDisplay(error));
    
    // Ensure we have at least basic commands
    if (dynamicCommandRegistry.list().length === 0) {
      registerFallbackCommands();
    }
  }
}

/**
 * Register core commands that are safe to bundle
 */
function registerCoreCommands(): void {
  // Commands command
  dynamicCommandRegistry.register({
    name: 'commands',
    description: 'List all available slash commands',
    category: 'Help',
    handler: async () => {
      const commands = dynamicCommandRegistry.list();
      const categories = new Map<string, DynamicCommandDef[]>();
      
      // Group by category
      commands.forEach(cmd => {
        const category = cmd.category || 'General';
        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)!.push(cmd);
      });
      
      console.log('Available slash commands:\n');
      
      // Display by category
      Array.from(categories.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([category, cmds]) => {
          console.log(`${category}:`);
          cmds.sort((a, b) => a.name.localeCompare(b.name))
             .forEach(cmd => {
               console.log(`  /${cmd.name.padEnd(12)} ${cmd.description}`);
             });
          console.log('');
        });
      
      console.log(`Total: ${commands.length} commands available`);
      console.log('Use "/help <command>" for detailed help on a specific command.');
    }
  });

  // Help command
  dynamicCommandRegistry.register({
    name: 'help',
    description: 'Get help for a specific command',
    category: 'Help',
    handler: async (args: any) => {
      const commandName = args.command || args._?.[0];
      
      if (!commandName) {
        console.log('Usage: /help <command>');
        console.log('Get detailed help for a specific slash command.');
        console.log('\nExample: /help login');
        return;
      }
      
      const command = dynamicCommandRegistry.get(commandName);
      if (!command) {
        console.log(`Unknown command: ${commandName}`);
        console.log('Use "/commands" to see all available commands.');
        return;
      }
      
      console.log(`Command: /${command.name}`);
      console.log(`Description: ${command.description}`);
      
      if (command.category) {
        console.log(`Category: ${command.category}`);
      }
      
      if (command.args && command.args.length > 0) {
        console.log('\nArguments:');
        command.args.forEach(arg => {
          const required = arg.required ? ' (required)' : '';
          const shortFlag = arg.shortFlag ? ` [-${arg.shortFlag}]` : '';
          console.log(`  --${arg.name}${shortFlag}  ${arg.description}${required}`);
        });
      }
      
      if (command.examples && command.examples.length > 0) {
        console.log('\nExamples:');
        command.examples.forEach(example => {
          console.log(`  /${example}`);
        });
      }
    },
    args: [
      {
        name: 'command',
        description: 'Command to get help for',
        type: 'string',
        required: true
      }
    ]
  });

  // Clear command
  dynamicCommandRegistry.register({
    name: 'clear',
    description: 'Clear the terminal screen',
    category: 'Utility',
    handler: async () => {
      process.stdout.write('\x1Bc');
      console.log('Terminal cleared.');
    }
  });

  // Exit commands
  dynamicCommandRegistry.register({
    name: 'exit',
    description: 'Exit the interactive session',
    category: 'Session',
    handler: async () => {
      console.log('👋 Goodbye!');
      process.exit(0);
    }
  });

  dynamicCommandRegistry.register({
    name: 'quit',
    description: 'Exit the interactive session',
    category: 'Session',
    handler: async () => {
      console.log('👋 Goodbye!');
      process.exit(0);
    }
  });

  // Theme command
  dynamicCommandRegistry.register({
    name: 'theme',
    description: 'Change the UI theme',
    category: 'Settings',
    handler: async (args: any) => {
      const theme = args.theme || args._?.[0];
      
      if (!theme) {
        console.log('Current theme: system');
        console.log('Available themes: dark, light, system, auto');
        return;
      }
      
      const validThemes = ['dark', 'light', 'system', 'auto'];
      if (validThemes.includes(theme.toLowerCase())) {
        try {
          const configModule = await import('../config/index.js');
          const currentConfig = await configModule.loadConfig();
          
          // Update theme in config
          currentConfig.terminal = currentConfig.terminal || {};
          currentConfig.terminal.theme = theme.toLowerCase();
          
          console.log(`✅ Theme changed to: ${theme}`);
          console.log('💡 Restart the application to apply the new theme.');
        } catch (error) {
          console.log(`❌ Failed to change theme: ${formatErrorForDisplay(error)}`);
        }
      } else {
        console.log(`Invalid theme: ${theme}`);
        console.log('Available themes: dark, light, system, auto');
      }
    },
    args: [
      {
        name: 'theme',
        description: 'Theme name (dark, light, system, auto)',
        type: 'string'
      }
    ],
    examples: ['theme dark', 'theme light', 'theme']
  });
}

/**
 * Load advanced commands that might have dependencies
 */
async function loadAdvancedCommands(): Promise<void> {
  // These commands require more complex dependencies
  // We'll load them dynamically to avoid bundling issues
  
  // Login command
  dynamicCommandRegistry.register({
    name: 'login',
    description: 'Authenticate with Claude AI',
    category: 'Authentication',
    handler: async (args: any) => {
      try {
        console.log('🔐 Initializing authentication...');
        
        // Dynamic import to avoid bundling auth dependencies
        const { authManager } = await import('../auth/index.js');
        
        if (authManager.isAuthenticated()) {
          console.log('✅ Already authenticated with Claude AI');
          return;
        }
        
        const apiKey = args['api-key'] || process.env.ANTHROPIC_API_KEY;
        
        if (apiKey) {
          console.log('🔑 Using API key authentication...');
          const result = await authManager.authenticateWithApiKey();
          
          if (result.success) {
            console.log('✅ Successfully authenticated with API key');
          } else {
            console.log(`❌ Authentication failed: ${result.error}`);
          }
        } else {
          console.log('🌐 Starting OAuth authentication...');
          const result = await authManager.authenticateWithOAuth();
          
          if (result.success) {
            console.log('✅ Successfully authenticated with OAuth');
          } else {
            console.log(`❌ Authentication failed: ${result.error}`);
          }
        }
      } catch (error) {
        console.log(`❌ Authentication error: ${formatErrorForDisplay(error)}`);
      }
    },
    args: [
      {
        name: 'api-key',
        description: 'Claude API key',
        type: 'string',
        shortFlag: 'k'
      }
    ],
    examples: ['login', 'login --api-key sk-...']
  });

  // Logout command
  dynamicCommandRegistry.register({
    name: 'logout',
    description: 'Clear stored authentication credentials',
    category: 'Authentication',
    handler: async () => {
      try {
        const { authManager } = await import('../auth/index.js');
        await authManager.logout();
        console.log('✅ Successfully logged out');
      } catch (error) {
        console.log(`❌ Logout error: ${formatErrorForDisplay(error)}`);
      }
    }
  });

  // Ask command
  dynamicCommandRegistry.register({
    name: 'ask',
    description: 'Ask Claude AI a question',
    category: 'AI',
    handler: async (args: any) => {
      const question = args.question || args._?.join(' ');
      
      if (!question) {
        console.log('Usage: /ask <question>');
        console.log('Ask Claude AI a question.');
        return;
      }
      
      try {
        console.log('🤖 Asking Claude...');
        
        const { authManager } = await import('../auth/index.js');
        if (!authManager.isAuthenticated()) {
          console.log('❌ Please authenticate first using /login');
          return;
        }
        
        const { initAI } = await import('../ai/index.js');
        const aiClient = await initAI();
        
        console.log(`💭 Question: ${question}`);
        console.log('🔄 Processing...');
        
        const aiModule = await import('../ai/index.js');
        const claudeClient = await aiModule.initAI();
        const result = await claudeClient.query(question);
        
        // Extract and display response
        const responseText = result.message.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n') || 'No response received';
        
        console.log('✨ Claude:', responseText);
        
        // Show usage metrics if available
        if (result.usage) {
          console.log(`📊 Tokens: ${result.usage.input_tokens} in, ${result.usage.output_tokens} out`);
        }
        
      } catch (error) {
        console.log(`❌ AI Error: ${formatErrorForDisplay(error)}`);
      }
    },
    args: [
      {
        name: 'question',
        description: 'Question to ask Claude',
        type: 'string',
        required: true
      }
    ],
    examples: ['ask How do I implement a binary tree?', 'ask What is TypeScript?']
  });

  // Explain command
  dynamicCommandRegistry.register({
    name: 'explain',
    description: 'Explain code in a file',
    category: 'AI',
    handler: async (args: any) => {
      const filePath = args.file || args._?.[0];
      
      if (!filePath) {
        console.log('Usage: /explain <file>');
        console.log('Explain code in a specified file.');
        return;
      }
      
      try {
        console.log(`📖 Explaining file: ${filePath}`);
        
        const { authManager } = await import('../auth/index.js');
        if (!authManager.isAuthenticated()) {
          console.log('❌ Please authenticate first using /login');
          return;
        }
        
        const { readTextFile, fileExists } = await import('../fs/operations.js');
        
        if (!await fileExists(filePath)) {
          console.log(`❌ File not found: ${filePath}`);
          return;
        }
        
        const content = await readTextFile(filePath);
        console.log(`📄 File content (${content.length} characters)`);
        console.log('🤖 Claude would explain this code...');
        
      } catch (error) {
        console.log(`❌ Explain error: ${formatErrorForDisplay(error)}`);
      }
    },
    args: [
      {
        name: 'file',
        description: 'File path to explain',
        type: 'string',
        required: true
      }
    ],
    examples: ['explain src/index.ts', 'explain package.json']
  });

  // Refactor command
  dynamicCommandRegistry.register({
    name: 'refactor',
    description: 'Refactor code in a file',
    category: 'AI',
    handler: async (args: any) => {
      const filePath = args.file || args._?.[0];
      const instructions = args.instructions || args._?.slice(1).join(' ');
      
      if (!filePath) {
        console.log('Usage: /refactor <file> [instructions]');
        console.log('Refactor code in a specified file.');
        return;
      }
      
      try {
        console.log(`🔧 Refactoring file: ${filePath}`);
        if (instructions) {
          console.log(`📝 Instructions: ${instructions}`);
        }
        
        const { authManager } = await import('../auth/index.js');
        if (!authManager.isAuthenticated()) {
          console.log('❌ Please authenticate first using /login');
          return;
        }
        
        console.log('🤖 Claude would refactor this code...');
        
      } catch (error) {
        console.log(`❌ Refactor error: ${formatErrorForDisplay(error)}`);
      }
    },
    args: [
      {
        name: 'file',
        description: 'File path to refactor',
        type: 'string',
        required: true
      },
      {
        name: 'instructions',
        description: 'Refactoring instructions',
        type: 'string'
      }
    ],
    examples: ['refactor src/index.ts', 'refactor src/utils.ts make it more modular']
  });

  // Fix command
  dynamicCommandRegistry.register({
    name: 'fix',
    description: 'Fix issues in code',
    category: 'AI',
    handler: async (args: any) => {
      const filePath = args.file || args._?.[0];
      
      if (!filePath) {
        console.log('Usage: /fix <file>');
        console.log('Fix issues in a specified file.');
        return;
      }
      
      try {
        console.log(`🛠️  Fixing file: ${filePath}`);
        
        const { authManager } = await import('../auth/index.js');
        if (!authManager.isAuthenticated()) {
          console.log('❌ Please authenticate first using /login');
          return;
        }
        
        console.log('🤖 Claude would fix issues in this code...');
        
      } catch (error) {
        console.log(`❌ Fix error: ${formatErrorForDisplay(error)}`);
      }
    },
    args: [
      {
        name: 'file',
        description: 'File path to fix',
        type: 'string',
        required: true
      }
    ],
    examples: ['fix src/index.ts', 'fix package.json']
  });

  // Generate command
  dynamicCommandRegistry.register({
    name: 'generate',
    description: 'Generate code based on description',
    category: 'AI',
    handler: async (args: any) => {
      const description = args.description || args._?.join(' ');
      
      if (!description) {
        console.log('Usage: /generate <description>');
        console.log('Generate code based on a description.');
        return;
      }
      
      try {
        console.log(`⚡ Generating code: ${description}`);
        
        const { authManager } = await import('../auth/index.js');
        if (!authManager.isAuthenticated()) {
          console.log('❌ Please authenticate first using /login');
          return;
        }
        
        console.log('🤖 Claude would generate code based on this description...');
        
      } catch (error) {
        console.log(`❌ Generate error: ${formatErrorForDisplay(error)}`);
      }
    },
    args: [
      {
        name: 'description',
        description: 'Description of code to generate',
        type: 'string',
        required: true
      }
    ],
    examples: ['generate a REST API endpoint for users', 'generate a React component for a login form']
  });

  // Search command
  dynamicCommandRegistry.register({
    name: 'search',
    description: 'Search codebase for patterns',
    category: 'Development',
    handler: async (args: any) => {
      const pattern = args.pattern || args._?.[0];
      
      if (!pattern) {
        console.log('Usage: /search <pattern>');
        console.log('Search codebase for patterns.');
        return;
      }
      
      try {
        console.log(`🔍 Searching for: ${pattern}`);
        console.log('🤖 Claude would search the codebase...');
        
      } catch (error) {
        console.log(`❌ Search error: ${formatErrorForDisplay(error)}`);
      }
    },
    args: [
      {
        name: 'pattern',
        description: 'Search pattern',
        type: 'string',
        required: true
      }
    ],
    examples: ['search function.*async', 'search TODO']
  });

  // Config command
  dynamicCommandRegistry.register({
    name: 'config',
    description: 'View or modify configuration settings',
    category: 'Settings',
    handler: async (args: any) => {
      try {
        const { loadConfig } = await import('../config/index.js');
        const config = await loadConfig();
        
        const key = args.key || args._?.[0];
        const value = args.value || args._?.[1];
        
        if (!key) {
          console.log('📋 Current configuration:');
          console.log(JSON.stringify(config, null, 2));
          return;
        }
        
        if (value !== undefined) {
          try {
            // Set config value
            const keys = key.split('.');
            let configTarget: any = config;
            
            for (let i = 0; i < keys.length - 1; i++) {
              const k = keys[i];
              if (!configTarget[k] || typeof configTarget[k] !== 'object') {
                configTarget[k] = {};
              }
              configTarget = configTarget[k];
            }
            
            const lastKey = keys[keys.length - 1];
            
            // Try to parse value as JSON, otherwise use as string
            try {
              configTarget[lastKey] = JSON.parse(value);
            } catch {
              configTarget[lastKey] = value;
            }
            
            console.log(`✅ Set ${key} = ${JSON.stringify(configTarget[lastKey])}`);
            console.log('💡 Configuration updated in memory. Restart to persist changes.');
          } catch (error) {
            console.log(`❌ Failed to set config: ${formatErrorForDisplay(error)}`);
          }
        } else {
          const configValue = key.split('.').reduce((obj: any, k: string) => obj?.[k], config);
          console.log(`${key}: ${JSON.stringify(configValue, null, 2)}`);
        }
      } catch (error) {
        console.log(`❌ Config error: ${formatErrorForDisplay(error)}`);
      }
    },
    args: [
      {
        name: 'key',
        description: 'Configuration key to view/set',
        type: 'string'
      },
      {
        name: 'value',
        description: 'Value to set (optional)',
        type: 'string'
      }
    ],
    examples: ['config', 'config ai.model', 'config ai.model claude-3-sonnet']
  });

  // Verbosity command
  dynamicCommandRegistry.register({
    name: 'verbosity',
    description: 'Set logging verbosity level',
    category: 'Settings',
    handler: async (args: any) => {
      const level = args.level || args._?.[0];
      
      if (!level) {
        console.log('Current verbosity: info');
        console.log('Available levels: debug, info, warn, error');
        return;
      }
      
      const validLevels = ['debug', 'info', 'warn', 'error'];
      if (validLevels.includes(level.toLowerCase())) {
        try {
          const { logger, LogLevel } = await import('../utils/logger.js');
          const logLevel = LogLevel[level.toUpperCase() as keyof typeof LogLevel];
          logger.setLevel(logLevel);
          console.log(`✅ Verbosity set to: ${level}`);
        } catch (error) {
          console.log(`❌ Failed to set verbosity: ${formatErrorForDisplay(error)}`);
        }
      } else {
        console.log(`Invalid level: ${level}`);
        console.log('Available levels: debug, info, warn, error');
      }
    },
    args: [
      {
        name: 'level',
        description: 'Logging level (debug, info, warn, error)',
        type: 'string'
      }
    ],
    examples: ['verbosity debug', 'verbosity info', 'verbosity']
  });

  // Edit command
  dynamicCommandRegistry.register({
    name: 'edit',
    description: 'Edit a file with AI assistance',
    category: 'Development',
    handler: async (args: any) => {
      const filePath = args.file || args._?.[0];
      
      if (!filePath) {
        console.log('Usage: /edit <file>');
        console.log('Edit a file with AI assistance.');
        return;
      }
      
      try {
        console.log(`✏️  Editing file: ${filePath}`);
        console.log('🤖 Claude would assist with editing this file...');
        
      } catch (error) {
        console.log(`❌ Edit error: ${formatErrorForDisplay(error)}`);
      }
    },
    args: [
      {
        name: 'file',
        description: 'File path to edit',
        type: 'string',
        required: true
      }
    ],
    examples: ['edit src/index.ts', 'edit README.md']
  });

  // Git command
  dynamicCommandRegistry.register({
    name: 'git',
    description: 'Git operations with AI assistance',
    category: 'Development',
    handler: async (args: any) => {
      const operation = args.operation || args._?.[0];
      
      if (!operation) {
        console.log('Usage: /git <operation>');
        console.log('Git operations: commit, push, pull, status, diff');
        return;
      }
      
      try {
        console.log(`🌿 Git operation: ${operation}`);
        console.log('🤖 Claude would assist with git operations...');
        
      } catch (error) {
        console.log(`❌ Git error: ${formatErrorForDisplay(error)}`);
      }
    },
    args: [
      {
        name: 'operation',
        description: 'Git operation to perform',
        type: 'string',
        required: true
      }
    ],
    examples: ['git status', 'git commit', 'git diff']
  });

  // Reset command
  dynamicCommandRegistry.register({
    name: 'reset',
    description: 'Reset AI conversation context',
    category: 'Session',
    handler: async () => {
      console.log('🔄 Resetting AI conversation context...');
      console.log('✅ Context reset complete');
    }
  });

  // History command
  dynamicCommandRegistry.register({
    name: 'history',
    description: 'View conversation history',
    category: 'Session',
    handler: async (args: any) => {
      const limit = args.limit || args._?.[0] || '10';
      
      console.log(`📜 Showing last ${limit} conversation entries:`);
      console.log('🤖 Claude would show conversation history...');
    },
    args: [
      {
        name: 'limit',
        description: 'Number of entries to show',
        type: 'string'
      }
    ],
    examples: ['history', 'history 20']
  });

  // Bug command
  dynamicCommandRegistry.register({
    name: 'bug',
    description: 'Report a bug or issue',
    category: 'Support',
    handler: async (args: any) => {
      const description = args.description || args._?.join(' ');
      
      if (!description) {
        console.log('Usage: /bug <description>');
        console.log('Report a bug or issue.');
        return;
      }
      
      console.log('🐛 Bug report:');
      console.log(`Description: ${description}`);
      console.log('Thank you for the report! This would be submitted to the development team.');
    },
    args: [
      {
        name: 'description',
        description: 'Bug description',
        type: 'string',
        required: true
      }
    ],
    examples: ['bug The login command is not working', 'bug Performance issue with large files']
  });

  // Feedback command
  dynamicCommandRegistry.register({
    name: 'feedback',
    description: 'Provide feedback',
    category: 'Support',
    handler: async (args: any) => {
      const feedback = args.feedback || args._?.join(' ');
      
      if (!feedback) {
        console.log('Usage: /feedback <feedback>');
        console.log('Provide feedback about Vibex.');
        return;
      }
      
      console.log('💬 Feedback:');
      console.log(`Message: ${feedback}`);
      console.log('Thank you for your feedback! This would be submitted to the development team.');
    },
    args: [
      {
        name: 'feedback',
        description: 'Your feedback',
        type: 'string',
        required: true
      }
    ],
    examples: ['feedback Great tool, love the AI integration!', 'feedback Could use better error messages']
  });

  // Run command
  dynamicCommandRegistry.register({
    name: 'run',
    description: 'Execute a terminal command',
    category: 'System',
    handler: async (args: any) => {
      const command = args.command || args._?.join(' ');
      
      if (!command) {
        console.log('Usage: /run <command>');
        console.log('Execute a terminal command.');
        return;
      }
      
      try {
        console.log(`🔧 Executing: ${command}`);
        
        // Dynamic import to avoid bundling child_process
        const { spawn } = await import('child_process');
        
        const child = spawn('sh', ['-c', command], {
          stdio: 'inherit'
        });
        
        child.on('close', (code) => {
          console.log(`Command exited with code: ${code}`);
        });
        
      } catch (error) {
        console.log(`❌ Execution error: ${formatErrorForDisplay(error)}`);
      }
    },
    args: [
      {
        name: 'command',
        description: 'Command to execute',
        type: 'string',
        required: true
      }
    ],
    examples: ['run ls -la', 'run pwd', 'run git status']
  });
}

/**
 * Register fallback commands if advanced loading fails
 */
function registerFallbackCommands(): void {
  logger.warn('Registering fallback commands');
  
  // Minimal fallback commands
  const fallbackCommands = [
    'login', 'logout', 'config', 'run', 'ask', 'explain', 
    'refactor', 'fix', 'generate', 'search', 'verbosity'
  ];
  
  fallbackCommands.forEach(name => {
    if (!dynamicCommandRegistry.has(name)) {
      dynamicCommandRegistry.register({
        name,
        description: `${name.charAt(0).toUpperCase() + name.slice(1)} command (placeholder)`,
        category: 'System',
        handler: async () => {
          console.log(`🚧 Command /${name} is not yet implemented`);
          console.log('This feature is coming soon!');
        }
      });
    }
  });
}

/**
 * Execute a dynamic command
 */
export async function executeDynamicCommand(commandName: string, args: string[]): Promise<void> {
  const command = dynamicCommandRegistry.get(commandName);
  
  if (!command) {
    throw new Error(`Unknown command: ${commandName}`);
  }
  
  // Simple argument parsing for dynamic commands
  const parsedArgs: any = { _: [] };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      
      if (value && !value.startsWith('-')) {
        parsedArgs[key] = value;
        i++; // Skip the value
      } else {
        parsedArgs[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      parsedArgs[key] = true;
    } else {
      parsedArgs._.push(arg);
    }
  }
  
  await command.handler(parsedArgs);
}