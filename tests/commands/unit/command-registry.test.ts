/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Unit tests for CommandRegistry class
 */

import { jest } from 'vitest';
import { CommandRegistry, generateCommandHelp } from '../../../src/commands/index.js';
import { CommandCategory } from '../../../src/commands/types.js';
import type { UnifiedCommand, CommandContext, CommandResult } from '../../../src/commands/types.js';

// Mock dependencies
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('CommandRegistry', () => {
  // Test command setup
  let registry: CommandRegistry;
  let mockHandler: jest.Mock;
  
  const createTestCommand = (id: string, name: string): UnifiedCommand => {
    return {
      id,
      name,
      description: `Test command ${name}`,
      category: CommandCategory.SYSTEM,
      parameters: [],
      handler: mockHandler,
      aliases: [`${name}_alias`]
    };
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create mock handler
    mockHandler = vi.fn().mockResolvedValue({
      success: true,
      message: 'Command executed successfully'
    });
    
    // Create a fresh registry for each test
    registry = new CommandRegistry();
  });

  describe('Registration', () => {
    test('should register a command successfully', () => {
      const command = createTestCommand('test', 'test');
      registry.register(command);
      
      expect(registry.has('test')).toBe(true);
      expect(registry.size()).toBe(1);
    });

    test('should throw error for invalid command', () => {
      const invalidCommand = { name: 'invalid' } as UnifiedCommand;
      expect(() => registry.register(invalidCommand)).toThrow();
    });

    test('should warn and overwrite when registering duplicate command', () => {
      const command1 = createTestCommand('duplicate', 'test');
      const command2 = createTestCommand('duplicate', 'updated_test');
      
      registry.register(command1);
      registry.register(command2);
      
      expect(registry.size()).toBe(1);
      expect(registry.get('duplicate')?.name).toBe('updated_test');
    });

    test('should register command aliases', () => {
      const command = createTestCommand('aliased', 'aliased_command');
      registry.register(command);
      
      expect(registry.findByAlias('aliased_command_alias')).toBeDefined();
      expect(registry.findByAlias('aliased_command_alias')?.id).toBe('aliased');
    });

    test('should warn when registering duplicate alias', () => {
      const command1 = createTestCommand('cmd1', 'command_one');
      const command2 = {
        ...createTestCommand('cmd2', 'command_two'),
        aliases: ['command_one_alias']
      };
      
      registry.register(command1);
      registry.register(command2);
      
      expect(registry.findByAlias('command_one_alias')?.id).toBe('cmd2');
    });
  });

  describe('Retrieval', () => {
    beforeEach(() => {
      // Register test commands
      registry.register(createTestCommand('cmd1', 'first'));
      registry.register(createTestCommand('cmd2', 'second'));
      registry.register({
        ...createTestCommand('cmd3', 'third'),
        category: CommandCategory.HELP
      });
    });
    
    test('should get command by id', () => {
      const command = registry.get('cmd1');
      expect(command).toBeDefined();
      expect(command?.name).toBe('first');
    });
    
    test('should get command by name', () => {
      const command = registry.get('second');
      expect(command).toBeDefined();
      expect(command?.id).toBe('cmd2');
    });
    
    test('should get command by alias', () => {
      const command = registry.get('third_alias');
      expect(command).toBeDefined();
      expect(command?.id).toBe('cmd3');
    });
    
    test('should return undefined for non-existent command', () => {
      expect(registry.get('non_existent')).toBeUndefined();
      expect(registry.findByAlias('non_existent')).toBeUndefined();
    });
    
    test('should list all commands', () => {
      const commands = registry.list();
      expect(commands).toHaveLength(3);
    });
    
    test('should list commands by category', () => {
      const systemCommands = registry.listByCategory(CommandCategory.SYSTEM);
      expect(systemCommands).toHaveLength(2);
      
      const helpCommands = registry.listByCategory(CommandCategory.HELP);
      expect(helpCommands).toHaveLength(1);
      expect(helpCommands[0].name).toBe('third');
    });
    
    test('should get all categories', () => {
      const categories = registry.getAllCategories();
      expect(categories).toContain(CommandCategory.SYSTEM);
      expect(categories).toContain(CommandCategory.HELP);
      expect(categories).toHaveLength(2);
    });
  });

  describe('Unregistration', () => {
    beforeEach(() => {
      // Register test commands
      registry.register(createTestCommand('remove1', 'remove_me'));
      registry.register(createTestCommand('keep1', 'keep_me'));
    });
    
    test('should unregister a command by id', () => {
      expect(registry.has('remove1')).toBe(true);
      
      const result = registry.unregister('remove1');
      expect(result).toBe(true);
      expect(registry.has('remove1')).toBe(false);
      expect(registry.size()).toBe(1);
    });
    
    test('should unregister a command by name', () => {
      expect(registry.has('keep_me')).toBe(true);
      
      const result = registry.unregister('keep_me');
      expect(result).toBe(true);
      expect(registry.has('keep1')).toBe(false);
      expect(registry.size()).toBe(1);
    });
    
    test('should return false when unregistering non-existent command', () => {
      const result = registry.unregister('non_existent');
      expect(result).toBe(false);
      expect(registry.size()).toBe(2);
    });
    
    test('should unregister command aliases', () => {
      expect(registry.findByAlias('remove_me_alias')).toBeDefined();
      
      registry.unregister('remove1');
      expect(registry.findByAlias('remove_me_alias')).toBeUndefined();
    });
    
    test('should clear all commands', () => {
      expect(registry.size()).toBe(2);
      
      registry.clear();
      expect(registry.size()).toBe(0);
      expect(registry.getAllCategories()).toHaveLength(0);
    });
  });

  describe('Command Execution', () => {
    const testCommand: UnifiedCommand = {
      id: 'exec_test',
      name: 'execute_test',
      description: 'Test execution',
      category: CommandCategory.SYSTEM,
      parameters: [
        {
          name: 'param1',
          description: 'First parameter',
          type: 'string',
          required: true
        }
      ],
      handler: vi.fn().mockResolvedValue({
        success: true,
        message: 'Executed with args'
      }),
      aliases: ['exec']
    };

    beforeEach(() => {
      registry.register(testCommand);
    });
    
    test('should execute command by id', async () => {
      const args = { param1: 'test value' };
      const result = await registry.executeCommand('exec_test', args);
      
      expect(testCommand.handler).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Executed with args'
      });
    });
    
    test('should throw error when executing non-existent command', async () => {
      await expect(registry.executeCommand('non_existent', {}))
        .rejects.toThrow('Command not found');
    });
    
    test('should execute command string', async () => {
      const result = await registry.executeCommandString('execute_test arg1 arg2');
      
      expect(testCommand.handler).toHaveBeenCalled();
      
      // Check that args were parsed correctly
      const context = (testCommand.handler as jest.Mock).mock.calls[0][0];
      expect(context.args).toEqual({ arg0: 'arg1', arg1: 'arg2' });
      
      expect(result).toEqual({
        success: true,
        message: 'Executed with args'
      });
    });
  });

  describe('Suggestions', () => {
    beforeEach(() => {
      registry.register(createTestCommand('help', 'help'));
      registry.register(createTestCommand('hello', 'hello'));
      registry.register(createTestCommand('test', 'test'));
    });
    
    test('should get command suggestions based on prefix', () => {
      const suggestions = registry.getSuggestions('he');
      expect(suggestions).toContain('help');
      expect(suggestions).toContain('hello');
      expect(suggestions).not.toContain('test');
    });
    
    test('should include aliases in suggestions', () => {
      const suggestions = registry.getSuggestions('help');
      expect(suggestions).toContain('help');
      expect(suggestions).toContain('help_alias');
    });
    
    test('should return empty array for no matches', () => {
      const suggestions = registry.getSuggestions('xyz');
      expect(suggestions).toHaveLength(0);
    });
  });
  
  describe('Legacy Compatibility', () => {
    test('should use registerCommand alias', () => {
      const command = createTestCommand('legacy', 'legacy_test');
      registry.registerCommand(command);
      
      expect(registry.has('legacy')).toBe(true);
    });
    
    test('should use getAllCommands alias', () => {
      registry.register(createTestCommand('cmd1', 'test1'));
      registry.register(createTestCommand('cmd2', 'test2'));
      
      const commands = registry.getAllCommands();
      expect(commands).toHaveLength(2);
    });
    
    test('should use findCommand alias', () => {
      registry.register(createTestCommand('find_me', 'find_me_test'));
      
      const command = registry.findCommand('find_me');
      expect(command).toBeDefined();
      expect(command?.name).toBe('find_me_test');
    });
    
    test('should use unregisterCommand alias', () => {
      registry.register(createTestCommand('remove_me', 'remove_alias_test'));
      
      expect(registry.has('remove_me')).toBe(true);
      const result = registry.unregisterCommand('remove_me');
      expect(result).toBe(true);
      expect(registry.has('remove_me')).toBe(false);
    });
    
    test('should use getCommandsByCategory alias', () => {
      registry.register({
        ...createTestCommand('cat1', 'cat_test1'),
        category: CommandCategory.DEV
      });
      
      const devCommands = registry.getCommandsByCategory(CommandCategory.DEV);
      expect(devCommands).toHaveLength(1);
      expect(devCommands[0].name).toBe('cat_test1');
    });
  });
});

describe('Command Help', () => {
  test('should generate help text for a simple command', () => {
    const command: UnifiedCommand = {
      id: 'help_test',
      name: 'help',
      description: 'Show help information',
      category: CommandCategory.HELP,
      parameters: [],
      handler: vi.fn()
    };
    
    const helpText = generateCommandHelp(command);
    expect(helpText).toContain('Command: help');
    expect(helpText).toContain('Description: Show help information');
    expect(helpText).toContain('Category: Help');
    expect(helpText).toContain('Usage: /help');
  });
  
  test('should include parameters in help text', () => {
    const command: UnifiedCommand = {
      id: 'complex_test',
      name: 'complex',
      description: 'Complex command',
      category: CommandCategory.SYSTEM,
      parameters: [
        {
          name: 'required_param',
          description: 'Required parameter',
          type: 'string',
          required: true
        },
        {
          name: 'optional_param',
          description: 'Optional parameter',
          type: 'number',
          required: false,
          default: 42
        }
      ],
      handler: vi.fn(),
      aliases: ['cplx'],
      examples: ['complex example1', 'complex example2']
    };
    
    const helpText = generateCommandHelp(command);
    
    expect(helpText).toContain('Command: complex');
    expect(helpText).toContain('Aliases: cplx');
    expect(helpText).toContain('Usage: /complex <required_param> [optional_param]');
    expect(helpText).toContain('required_param: Required parameter (required)');
    expect(helpText).toContain('optional_param: Optional parameter (default: 42)');
    expect(helpText).toContain('Examples:');
    expect(helpText).toContain('complex example1');
    expect(helpText).toContain('complex example2');
  });
  
  test('should use custom usage if provided', () => {
    const command: UnifiedCommand = {
      id: 'custom_usage',
      name: 'custom',
      description: 'Custom usage command',
      category: CommandCategory.SYSTEM,
      parameters: [],
      handler: vi.fn(),
      usage: 'custom <special usage>'
    };
    
    const helpText = generateCommandHelp(command);
    expect(helpText).toContain('Usage: custom <special usage>');
  });
});