/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Slash Command System Integration Tests
 * Tests command registry, validation, autocomplete, and built-in commands
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { 
  SlashCommandRegistry,
  createSlashCommandRegistry,
  type SlashCommand,
  type CommandContext,
  type CommandResult
} from '../../src/commands/slash-command-system.js';
import { 
  registerBuiltInCommands,
  helpCommand,
  configCommand,
  fileCommand
} from '../../src/commands/built-in-commands.js';

describe('Slash Command System Integration', () => {
  let registry: SlashCommandRegistry;
  let mockContext: Omit<CommandContext, 'args' | 'options' | 'rawInput'>;

  beforeEach(() => {
    registry = createSlashCommandRegistry();
    mockContext = {
      sessionId: 'test-session',
      workspaceDir: '/test/workspace',
      user: {
        id: 'test-user',
        name: 'Test User',
        preferences: {}
      }
    };
  });

  describe('Command Registry', () => {
    test('should register and retrieve commands', () => {
      const testCommand: SlashCommand = {
        name: 'test',
        description: 'Test command',
        category: 'Test',
        async execute() {
          return { success: true, message: 'Test executed' };
        }
      };

      registry.register(testCommand);

      const retrieved = registry.getCommand('test');
      expect(retrieved).toBe(testCommand);
    });

    test('should handle command aliases', () => {
      const testCommand: SlashCommand = {
        name: 'test',
        description: 'Test command',
        category: 'Test',
        aliases: ['t', 'testing'],
        async execute() {
          return { success: true, message: 'Test executed' };
        }
      };

      registry.register(testCommand);

      expect(registry.getCommand('test')).toBe(testCommand);
      expect(registry.getCommand('t')).toBe(testCommand);
      expect(registry.getCommand('testing')).toBe(testCommand);
    });

    test('should unregister commands', () => {
      const testCommand: SlashCommand = {
        name: 'test',
        description: 'Test command',
        category: 'Test',
        aliases: ['t'],
        async execute() {
          return { success: true, message: 'Test executed' };
        }
      };

      registry.register(testCommand);
      expect(registry.getCommand('test')).toBe(testCommand);

      const unregistered = registry.unregister('test');
      expect(unregistered).toBe(true);
      expect(registry.getCommand('test')).toBeUndefined();
      expect(registry.getCommand('t')).toBeUndefined();
    });

    test('should organize commands by category', () => {
      const cmd1: SlashCommand = {
        name: 'cmd1',
        description: 'Command 1',
        category: 'Category A',
        async execute() { return { success: true }; }
      };

      const cmd2: SlashCommand = {
        name: 'cmd2',
        description: 'Command 2',
        category: 'Category A',
        async execute() { return { success: true }; }
      };

      const cmd3: SlashCommand = {
        name: 'cmd3',
        description: 'Command 3',
        category: 'Category B',
        async execute() { return { success: true }; }
      };

      registry.register(cmd1);
      registry.register(cmd2);
      registry.register(cmd3);

      const categoryA = registry.getCommandsByCategory('Category A');
      const categoryB = registry.getCommandsByCategory('Category B');

      expect(categoryA).toHaveLength(2);
      expect(categoryA).toContain(cmd1);
      expect(categoryA).toContain(cmd2);

      expect(categoryB).toHaveLength(1);
      expect(categoryB).toContain(cmd3);
    });

    test('should validate command definitions', () => {
      const invalidCommand = {
        // Missing required fields
        description: 'Invalid command'
      } as SlashCommand;

      expect(() => registry.register(invalidCommand)).toThrow();
    });
  });

  describe('Command Parsing and Validation', () => {
    beforeEach(() => {
      const testCommand: SlashCommand = {
        name: 'test',
        description: 'Test command with arguments',
        category: 'Test',
        arguments: [
          {
            name: 'required-arg',
            type: 'string',
            description: 'Required argument',
            required: true
          },
          {
            name: 'optional-arg',
            type: 'number',
            description: 'Optional argument',
            required: false,
            default: 42
          }
        ],
        options: [
          {
            name: 'flag',
            alias: 'f',
            type: 'boolean',
            description: 'Boolean flag',
            default: false
          },
          {
            name: 'value',
            type: 'string',
            description: 'String value'
          }
        ],
        async execute() {
          return { success: true };
        }
      };

      registry.register(testCommand);
    });

    test('should parse valid commands correctly', async () => {
      const { command, validation } = await registry.parseCommand('/test hello 123 --flag --value world');

      expect(command?.name).toBe('test');
      expect(validation.valid).toBe(true);
      expect(validation.parsedArgs).toEqual({
        'required-arg': 'hello',
        'optional-arg': 123
      });
      expect(validation.parsedOptions).toEqual({
        flag: true,
        value: 'world'
      });
    });

    test('should handle missing required arguments', async () => {
      const { validation } = await registry.parseCommand('/test');

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Required argument 'required-arg' is missing");
    });

    test('should handle invalid argument types', async () => {
      const { validation } = await registry.parseCommand('/test hello invalid-number');

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(err => err.includes('Invalid value for argument'))).toBe(true);
    });

    test('should apply default values', async () => {
      const { validation } = await registry.parseCommand('/test hello');

      expect(validation.valid).toBe(true);
      expect(validation.parsedArgs['optional-arg']).toBe(42);
      expect(validation.parsedOptions.flag).toBe(false);
    });

    test('should handle unknown commands', async () => {
      const { validation } = await registry.parseCommand('/unknown');

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Unknown command: unknown');
    });
  });

  describe('Command Execution', () => {
    test('should execute commands successfully', async () => {
      const testCommand: SlashCommand = {
        name: 'test',
        description: 'Test command',
        category: 'Test',
        arguments: [
          {
            name: 'message',
            type: 'string',
            description: 'Message to echo',
            required: true
          }
        ],
        async execute(context) {
          return {
            success: true,
            message: `Echo: ${context.args.message}`,
            data: context.args
          };
        }
      };

      registry.register(testCommand);

      const result = await registry.executeCommand('/test hello', mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Echo: hello');
      expect(result.data).toEqual({ message: 'hello' });
    });

    test('should handle command execution errors', async () => {
      const errorCommand: SlashCommand = {
        name: 'error',
        description: 'Command that throws',
        category: 'Test',
        async execute() {
          throw new Error('Test error');
        }
      };

      registry.register(errorCommand);

      const result = await registry.executeCommand('/error', mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Command execution failed: Test error');
      expect(result.error).toBeInstanceOf(Error);
    });

    test('should handle validation failures', async () => {
      const testCommand: SlashCommand = {
        name: 'test',
        description: 'Test command',
        category: 'Test',
        arguments: [
          {
            name: 'required',
            type: 'string',
            description: 'Required argument',
            required: true
          }
        ],
        async execute() {
          return { success: true };
        }
      };

      registry.register(testCommand);

      const result = await registry.executeCommand('/test', mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Required argument 'required' is missing");
    });
  });

  describe('Autocomplete System', () => {
    beforeEach(() => {
      const testCommand: SlashCommand = {
        name: 'test',
        description: 'Test command',
        category: 'Test',
        arguments: [
          {
            name: 'choice-arg',
            type: 'choice',
            description: 'Choice argument',
            choices: ['option1', 'option2', 'option3']
          }
        ],
        options: [
          {
            name: 'verbose',
            alias: 'v',
            type: 'boolean',
            description: 'Verbose output'
          }
        ],
        async execute() {
          return { success: true };
        }
      };

      registry.register(testCommand);
    });

    test('should provide command suggestions', async () => {
      const suggestions = await registry.getAutocompleteSuggestions('/te', 3, mockContext);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.value === 'test')).toBe(true);
      expect(suggestions[0].type).toBe('command');
    });

    test('should provide argument value suggestions', async () => {
      const suggestions = await registry.getAutocompleteSuggestions('/test opt', 9, mockContext);

      expect(suggestions.some(s => s.value === 'option1')).toBe(true);
      expect(suggestions.some(s => s.value === 'option2')).toBe(true);
      expect(suggestions.some(s => s.value === 'option3')).toBe(true);
    });

    test('should provide option suggestions', async () => {
      const suggestions = await registry.getAutocompleteSuggestions('/test option1 --', 15, mockContext);

      expect(suggestions.some(s => s.value === '--verbose')).toBe(true);
      expect(suggestions.some(s => s.value === '-v')).toBe(true);
    });
  });

  describe('Help System', () => {
    beforeEach(() => {
      const testCommand: SlashCommand = {
        name: 'test',
        description: 'Test command for help',
        category: 'Test',
        aliases: ['t'],
        arguments: [
          {
            name: 'arg1',
            type: 'string',
            description: 'First argument',
            required: true
          }
        ],
        options: [
          {
            name: 'option1',
            alias: 'o',
            type: 'boolean',
            description: 'Test option',
            default: false
          }
        ],
        examples: [
          'test hello',
          'test world --option1'
        ],
        async execute() {
          return { success: true };
        }
      };

      registry.register(testCommand);
    });

    test('should generate help for specific command', () => {
      const help = registry.generateHelp('test');

      expect(help).toContain('**/test**');
      expect(help).toContain('Test command for help');
      expect(help).toContain('**Aliases:** t');
      expect(help).toContain('**Arguments:**');
      expect(help).toContain('arg1: First argument (required)');
      expect(help).toContain('**Options:**');
      expect(help).toContain('--option1, -o: Test option');
      expect(help).toContain('**Examples:**');
      expect(help).toContain('/test hello');
    });

    test('should generate overall help', () => {
      const help = registry.generateHelp();

      expect(help).toContain('**Available Commands**');
      expect(help).toContain('**Test:**');
      expect(help).toContain('/test: Test command for help');
      expect(help).toContain('Use `/help <command>` to get detailed help');
    });

    test('should handle help for unknown command', () => {
      const help = registry.generateHelp('unknown');

      expect(help).toContain("Command 'unknown' not found");
    });
  });

  describe('Built-in Commands', () => {
    beforeEach(() => {
      registerBuiltInCommands(registry);
    });

    test('should register all built-in commands', () => {
      expect(registry.getCommand('help')).toBeDefined();
      expect(registry.getCommand('clear')).toBeDefined();
      expect(registry.getCommand('exit')).toBeDefined();
      expect(registry.getCommand('config')).toBeDefined();
      expect(registry.getCommand('file')).toBeDefined();
      expect(registry.getCommand('memory')).toBeDefined();
      expect(registry.getCommand('search')).toBeDefined();
    });

    test('should execute help command', async () => {
      const result = await registry.executeCommand('/help', mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('**Available Commands**');
    });

    test('should execute config command with list action', async () => {
      const result = await registry.executeCommand('/config list', mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Configuration listing');
    });

    test('should execute config command with set action', async () => {
      const result = await registry.executeCommand('/config set theme dark', mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Set theme = "dark"');
    });

    test('should validate config command arguments', async () => {
      const result = await registry.executeCommand('/config', mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Required argument 'action' is missing");
    });

    test('should handle config command with invalid action', async () => {
      const result = await registry.executeCommand('/config invalid', mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Must be one of: get, set, delete, list, reset');
    });

    test('should execute file command with info action', async () => {
      const result = await registry.executeCommand('/file info package.json', mockContext);

      // This would fail in the test environment since package.json might not exist
      // but we can test that the command parsing worked
      expect(result.success).toBe(false); // File doesn't exist
      expect(result.message).toContain('File operation failed');
    });

    test('should execute memory command with stats action', async () => {
      const result = await registry.executeCommand('/memory stats', mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Memory statistics');
      expect(result.data).toEqual({
        total_memories: 0,
        by_type: {},
        memory_usage: '0 MB'
      });
    });

    test('should execute search command', async () => {
      const result = await registry.executeCommand('/search "TODO" src', mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Searching for "TODO" in src (type: text)');
      expect(result.data).toHaveProperty('query', 'TODO');
      expect(result.data).toHaveProperty('path', 'src');
    });
  });

  describe('Command Similarity and Suggestions', () => {
    beforeEach(() => {
      registry.register({
        name: 'config',
        description: 'Configuration management',
        category: 'Core',
        async execute() { return { success: true }; }
      });

      registry.register({
        name: 'configure',
        description: 'Configure settings',
        category: 'Core',
        async execute() { return { success: true }; }
      });
    });

    test('should suggest similar commands for typos', async () => {
      const { validation } = await registry.parseCommand('/conf');

      expect(validation.valid).toBe(false);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Did you mean:');
    });
  });

  describe('Event System', () => {
    test('should emit events for command registration', (done) => {
      registry.on('command:registered', (command) => {
        expect(command.name).toBe('test');
        done();
      });

      registry.register({
        name: 'test',
        description: 'Test command',
        category: 'Test',
        async execute() { return { success: true }; }
      });
    });

    test('should emit events for command execution', (done) => {
      const testCommand: SlashCommand = {
        name: 'test',
        description: 'Test command',
        category: 'Test',
        async execute() { return { success: true, message: 'Test' }; }
      };

      registry.register(testCommand);

      registry.on('command:executed', (name, context, result) => {
        expect(name).toBe('test');
        expect(result.success).toBe(true);
        done();
      });

      registry.executeCommand('/test', mockContext);
    });
  });
}); 