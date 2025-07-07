/**
 * Command Registry Service Tests
 * 
 * Comprehensive test coverage following Gemini CLI standards
 * Tests registration, lookup, validation, and edge cases
 */

import { CommandRegistryService } from './command-registry-service.js';
import type { Command } from './types.js';

describe('CommandRegistryService', () => {
  let service: CommandRegistryService;

  beforeEach(() => {
    service = new CommandRegistryService();
  });

  afterEach(() => {
    service.clear();
  });

  describe('Command Registration', () => {
    const mockCommand: Command = {
      id: 'test-cmd',
      name: 'test',
      description: 'Test command',
      handler: async () => ({ success: true })
    };

    it('should register a command successfully', () => {
      const unregister = service.registerCommand(mockCommand);
      
      expect(service.hasCommand('test')).toBe(true);
      expect(service.getCommandCount()).toBe(1);
      expect(typeof unregister).toBe('function');
    });

    it('should return unregister function that works', () => {
      const unregister = service.registerCommand(mockCommand);
      
      expect(service.hasCommand('test')).toBe(true);
      
      unregister();
      
      expect(service.hasCommand('test')).toBe(false);
      expect(service.getCommandCount()).toBe(0);
    });

    it('should replace existing command with same id', () => {
      const command1: Command = { ...mockCommand, description: 'First' };
      const command2: Command = { ...mockCommand, description: 'Second' };
      
      service.registerCommand(command1);
      service.registerCommand(command2);
      
      const found = service.findCommand('test');
      expect(found?.description).toBe('Second');
      expect(service.getCommandCount()).toBe(1);
    });

    it('should register commands with aliases', () => {
      const commandWithAliases: Command = {
        ...mockCommand,
        aliases: ['t', 'testing']
      };
      
      service.registerCommand(commandWithAliases);
      
      expect(service.hasCommand('test')).toBe(true);
      expect(service.hasCommand('t')).toBe(true);
      expect(service.hasCommand('testing')).toBe(true);
    });

    it('should register commands with categories', () => {
      const categorizedCommand: Command = {
        ...mockCommand,
        category: 'utility'
      };
      
      service.registerCommand(categorizedCommand);
      
      expect(service.getCategories()).toContain('utility');
      expect(service.getCommandsByCategory('utility')).toHaveLength(1);
    });
  });

  describe('Command Validation', () => {
    it('should reject command without id', () => {
      const invalidCommand = {
        id: '',
        name: 'test',
        description: 'Test',
        handler: async () => ({ success: true })
      } as Command;
      
      expect(() => service.registerCommand(invalidCommand)).toThrow('valid id');
    });

    it('should reject command without name', () => {
      const invalidCommand = {
        id: 'test',
        name: '',
        description: 'Test',
        handler: async () => ({ success: true })
      } as Command;
      
      expect(() => service.registerCommand(invalidCommand)).toThrow('valid name');
    });

    it('should reject command without description', () => {
      const invalidCommand = {
        id: 'test',
        name: 'test',
        description: '',
        handler: async () => ({ success: true })
      } as Command;
      
      expect(() => service.registerCommand(invalidCommand)).toThrow('valid description');
    });

    it('should reject command without handler', () => {
      const invalidCommand = {
        id: 'test',
        name: 'test',
        description: 'Test'
      } as Command;
      
      expect(() => service.registerCommand(invalidCommand)).toThrow('valid handler');
    });

    it('should reject command with invalid aliases', () => {
      const invalidCommand: Command = {
        id: 'test',
        name: 'test',
        description: 'Test',
        aliases: ['valid', ''] as string[],
        handler: async () => ({ success: true })
      };
      
      expect(() => service.registerCommand(invalidCommand)).toThrow('non-empty strings');
    });

    it('should reject command with duplicate name', () => {
      const command1: Command = {
        id: 'cmd1',
        name: 'duplicate',
        description: 'First',
        handler: async () => ({ success: true })
      };
      
      const command2: Command = {
        id: 'cmd2',
        name: 'duplicate',
        description: 'Second',
        handler: async () => ({ success: true })
      };
      
      service.registerCommand(command1);
      
      expect(() => service.registerCommand(command2)).toThrow('already exists');
    });
  });

  describe('Multiple Command Registration', () => {
    const commands: Command[] = [
      {
        id: 'cmd1',
        name: 'first',
        description: 'First command',
        handler: async () => ({ success: true })
      },
      {
        id: 'cmd2',
        name: 'second',
        description: 'Second command',
        handler: async () => ({ success: true })
      }
    ];

    it('should register multiple commands', () => {
      const unregister = service.registerCommands(commands);
      
      expect(service.getCommandCount()).toBe(2);
      expect(service.hasCommand('first')).toBe(true);
      expect(service.hasCommand('second')).toBe(true);
      expect(typeof unregister).toBe('function');
    });

    it('should rollback on error during batch registration', () => {
      const invalidCommands = [
        ...commands,
        { id: 'invalid' } as Command // Invalid command
      ];
      
      expect(() => service.registerCommands(invalidCommands)).toThrow();
      expect(service.getCommandCount()).toBe(0);
    });

    it('should unregister all commands when batch unregister is called', () => {
      const unregister = service.registerCommands(commands);
      
      expect(service.getCommandCount()).toBe(2);
      
      unregister();
      
      expect(service.getCommandCount()).toBe(0);
    });
  });

  describe('Command Lookup', () => {
    beforeEach(() => {
      const command: Command = {
        id: 'test-cmd',
        name: 'test',
        description: 'Test command',
        aliases: ['t', 'testing'],
        category: 'utility',
        handler: async () => ({ success: true })
      };
      
      service.registerCommand(command);
    });

    it('should find command by name', () => {
      const found = service.findCommand('test');
      expect(found).toBeTruthy();
      expect(found?.name).toBe('test');
    });

    it('should find command by alias', () => {
      const found1 = service.findCommand('t');
      const found2 = service.findCommand('testing');
      
      expect(found1).toBeTruthy();
      expect(found2).toBeTruthy();
      expect(found1?.name).toBe('test');
      expect(found2?.name).toBe('test');
    });

    it('should return null for non-existent command', () => {
      const found = service.findCommand('nonexistent');
      expect(found).toBeNull();
    });

    it('should check command existence', () => {
      expect(service.hasCommand('test')).toBe(true);
      expect(service.hasCommand('t')).toBe(true);
      expect(service.hasCommand('nonexistent')).toBe(false);
    });
  });

  describe('Command Organization', () => {
    beforeEach(() => {
      const commands: Command[] = [
        {
          id: 'cmd1',
          name: 'first',
          description: 'First command',
          category: 'utility',
          handler: async () => ({ success: true })
        },
        {
          id: 'cmd2',
          name: 'second',
          description: 'Second command',
          category: 'utility',
          handler: async () => ({ success: true })
        },
        {
          id: 'cmd3',
          name: 'third',
          description: 'Third command',
          category: 'admin',
          hidden: true,
          handler: async () => ({ success: true })
        }
      ];
      
      service.registerCommands(commands);
    });

    it('should get all commands', () => {
      const allCommands = service.getAllCommands();
      expect(allCommands).toHaveLength(3);
    });

    it('should get visible commands only', () => {
      const visibleCommands = service.getVisibleCommands();
      expect(visibleCommands).toHaveLength(2);
      expect(visibleCommands.every(cmd => !cmd.hidden)).toBe(true);
    });

    it('should get commands by category', () => {
      const utilityCommands = service.getCommandsByCategory('utility');
      const adminCommands = service.getCommandsByCategory('admin');
      
      expect(utilityCommands).toHaveLength(2);
      expect(adminCommands).toHaveLength(1);
    });

    it('should get all categories', () => {
      const categories = service.getCategories();
      expect(categories).toEqual(['admin', 'utility']);
    });

    it('should return empty array for non-existent category', () => {
      const commands = service.getCommandsByCategory('nonexistent');
      expect(commands).toEqual([]);
    });
  });

  describe('Command Unregistration', () => {
    let command: Command;

    beforeEach(() => {
      command = {
        id: 'test-cmd',
        name: 'test',
        description: 'Test command',
        aliases: ['t'],
        category: 'utility',
        handler: async () => ({ success: true })
      };
      
      service.registerCommand(command);
    });

    it('should unregister command by id', () => {
      const result = service.unregisterCommand('test-cmd');
      
      expect(result).toBe(true);
      expect(service.hasCommand('test')).toBe(false);
      expect(service.hasCommand('t')).toBe(false);
      expect(service.getCommandCount()).toBe(0);
    });

    it('should return false for non-existent command', () => {
      const result = service.unregisterCommand('nonexistent');
      expect(result).toBe(false);
    });

    it('should clean up aliases when unregistering', () => {
      service.unregisterCommand('test-cmd');
      expect(service.hasCommand('t')).toBe(false);
    });

    it('should clean up categories when unregistering', () => {
      service.unregisterCommand('test-cmd');
      expect(service.getCategories()).not.toContain('utility');
    });
  });

  describe('Service Management', () => {
    beforeEach(() => {
      const commands: Command[] = [
        {
          id: 'cmd1',
          name: 'first',
          description: 'First',
          handler: async () => ({ success: true })
        },
        {
          id: 'cmd2',
          name: 'second',
          description: 'Second',
          handler: async () => ({ success: true })
        }
      ];
      
      service.registerCommands(commands);
    });

    it('should clear all commands', () => {
      expect(service.getCommandCount()).toBe(2);
      
      service.clear();
      
      expect(service.getCommandCount()).toBe(0);
      expect(service.getAllCommands()).toEqual([]);
      expect(service.getCategories()).toEqual([]);
    });

    it('should get accurate command count', () => {
      expect(service.getCommandCount()).toBe(2);
      
      service.unregisterCommand('cmd1');
      expect(service.getCommandCount()).toBe(1);
      
      service.clear();
      expect(service.getCommandCount()).toBe(0);
    });
  });
}); 