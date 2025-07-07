/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Unit tests for basic commands
 */

import { jest } from 'vitest';
import { basicCommands, registerBasicCommands } from '../../../src/commands/basic-commands.js';
import type { CommandRegistry, UnifiedCommand } from '../../../src/commands/types.js';
import * as configModule from '../../../src/config/index.js';

// Mock dependencies
vi.mock('../../../src/utils/logger.ts', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  },
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  },
}));

vi.mock('../../../src/config/index.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    terminal: {
      theme: 'dark'
    },
    logger: {
      level: 'info'
    }
  }),
  saveConfig: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../src/version.js', () => ({
  version: '1.0.0'
}));

describe('Basic Commands', () => {
  // Mock command registry
  const mockRegistry: CommandRegistry = {
    registerCommand: vi.fn(),
    someOtherMethod: vi.fn()
  };

  // Mock terminal and context
  const mockTerminal = {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    prompt: vi.fn()
  };

  const createMockContext = (args = {}) => ({
    terminal: mockTerminal,
    args,
    config: {},
    rawArgs: [],
    flags: {},
    options: {}
  });

  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Command Registration', () => {
    test('should register all basic commands', () => {
      registerBasicCommands(mockRegistry);
      
      expect(mockRegistry.registerCommand).toHaveBeenCalledTimes(basicCommands.length);
      
      // Verify each command is registered
      basicCommands.forEach(command => {
        expect(mockRegistry.registerCommand).toHaveBeenCalledWith(command);
      });
    });

    test('should have at least the core commands', () => {
      const commandNames = basicCommands.map(cmd => cmd.name);
      const expectedCommands = ['help', 'config', 'login', 'logout', 'version', 'theme'];
      
      expectedCommands.forEach(expectedCmd => {
        expect(commandNames).toContain(expectedCmd);
      });
    });
  });

  describe('Help Command', () => {
    test('should show general help when no command specified', async () => {
      const helpCommand = basicCommands.find(cmd => cmd.id === 'help');
      expect(helpCommand).toBeDefined();
      
      const result = await helpCommand!.handler(createMockContext());
      
      expect(mockTerminal.info).toHaveBeenCalledWith(expect.stringContaining('Available commands'));
      expect(result.success).toBe(true);
      expect(result.message).toBe('Help displayed');
    });

    test('should show specific command help', async () => {
      const helpCommand = basicCommands.find(cmd => cmd.id === 'help');
      expect(helpCommand).toBeDefined();
      
      const result = await helpCommand!.handler(createMockContext({ command: 'config' }));
      
      expect(mockTerminal.info).toHaveBeenCalledWith(expect.stringContaining('Help for command: config'));
      expect(result.success).toBe(true);
    });
  });

  describe('Config Command', () => {
    test('should show all config when no key specified', async () => {
      const configCommand = basicCommands.find(cmd => cmd.id === 'config');
      expect(configCommand).toBeDefined();
      
      const result = await configCommand!.handler(createMockContext());
      
      expect(mockTerminal.info).toHaveBeenCalledWith(expect.any(String));
      expect(configModule.loadConfig).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should show specific config value when key provided', async () => {
      const configCommand = basicCommands.find(cmd => cmd.id === 'config');
      expect(configCommand).toBeDefined();
      
      const result = await configCommand!.handler(createMockContext({ key: 'terminal.theme' }));
      
      expect(mockTerminal.info).toHaveBeenCalled();
      expect(configModule.loadConfig).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test('should update config when key and value provided', async () => {
      const configCommand = basicCommands.find(cmd => cmd.id === 'config');
      expect(configCommand).toBeDefined();
      
      const result = await configCommand!.handler(createMockContext({
        key: 'terminal.theme',
        value: 'light'
      }));
      
      expect(mockTerminal.success).toHaveBeenCalledWith(expect.stringContaining('Configuration updated'));
      expect(configModule.loadConfig).toHaveBeenCalled();
      expect(configModule.saveConfig).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Set terminal.theme to light');
    });
  });

  describe('Login Command', () => {
    test('should login with provided token', async () => {
      const loginCommand = basicCommands.find(cmd => cmd.id === 'login');
      expect(loginCommand).toBeDefined();
      
      const result = await loginCommand!.handler(createMockContext({ token: 'test-token' }));
      
      expect(mockTerminal.success).toHaveBeenCalledWith('Logged in with provided token');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Authentication successful');
    });

    test('should prompt for token when not provided', async () => {
      const loginCommand = basicCommands.find(cmd => cmd.id === 'login');
      expect(loginCommand).toBeDefined();
      
      // Mock successful prompt
      mockTerminal.prompt.mockResolvedValueOnce('entered-token');
      
      const result = await loginCommand!.handler(createMockContext());
      
      expect(mockTerminal.prompt).toHaveBeenCalledWith('Enter your API token: ');
      expect(mockTerminal.success).toHaveBeenCalledWith('Logged in successfully');
      expect(result.success).toBe(true);
    });

    test('should handle cancelled login', async () => {
      const loginCommand = basicCommands.find(cmd => cmd.id === 'login');
      expect(loginCommand).toBeDefined();
      
      // Mock empty prompt response (cancelled)
      mockTerminal.prompt.mockResolvedValueOnce('');
      
      const result = await loginCommand!.handler(createMockContext());
      
      expect(mockTerminal.error).toHaveBeenCalledWith('Login cancelled');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Login cancelled');
    });
  });

  describe('Logout Command', () => {
    test('should logout successfully', async () => {
      const logoutCommand = basicCommands.find(cmd => cmd.id === 'logout');
      expect(logoutCommand).toBeDefined();
      
      const result = await logoutCommand!.handler(createMockContext());
      
      expect(mockTerminal.success).toHaveBeenCalledWith('Logged out successfully');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Logout successful');
    });
  });

  describe('Settings Command', () => {
    test('should list all settings by default', async () => {
      const settingsCommand = basicCommands.find(cmd => cmd.id === 'cmd-settings');
      expect(settingsCommand).toBeDefined();
      
      const result = await settingsCommand!.handler(createMockContext());
      
      expect(configModule.loadConfig).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Settings displayed');
    });

    test('should get specific setting', async () => {
      const settingsCommand = basicCommands.find(cmd => cmd.id === 'cmd-settings');
      expect(settingsCommand).toBeDefined();
      
      const result = await settingsCommand!.handler(createMockContext({
        action: 'get',
        key: 'terminal.theme'
      }));
      
      expect(configModule.loadConfig).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Retrieved value for terminal.theme');
    });

    test('should throw error when get action missing key', async () => {
      const settingsCommand = basicCommands.find(cmd => cmd.id === 'cmd-settings');
      expect(settingsCommand).toBeDefined();
      
      await expect(settingsCommand!.handler(createMockContext({
        action: 'get'
      }))).rejects.toThrow('Key is required for get action');
    });

    test('should set specific setting', async () => {
      const settingsCommand = basicCommands.find(cmd => cmd.id === 'cmd-settings');
      expect(settingsCommand).toBeDefined();
      
      const result = await settingsCommand!.handler(createMockContext({
        action: 'set',
        key: 'terminal.theme',
        value: 'light'
      }));
      
      expect(configModule.loadConfig).toHaveBeenCalled();
      expect(configModule.saveConfig).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Set terminal.theme to light');
    });

    test('should throw error when set action missing key', async () => {
      const settingsCommand = basicCommands.find(cmd => cmd.id === 'cmd-settings');
      expect(settingsCommand).toBeDefined();
      
      await expect(settingsCommand!.handler(createMockContext({
        action: 'set',
        value: 'light'
      }))).rejects.toThrow('Key is required for set action');
    });

    test('should throw error when set action missing value', async () => {
      const settingsCommand = basicCommands.find(cmd => cmd.id === 'cmd-settings');
      expect(settingsCommand).toBeDefined();
      
      await expect(settingsCommand!.handler(createMockContext({
        action: 'set',
        key: 'terminal.theme'
      }))).rejects.toThrow('Value is required for set action');
    });

    test('should reset all settings', async () => {
      const settingsCommand = basicCommands.find(cmd => cmd.id === 'cmd-settings');
      expect(settingsCommand).toBeDefined();
      
      const result = await settingsCommand!.handler(createMockContext({
        action: 'reset'
      }));
      
      expect(configModule.saveConfig).toHaveBeenCalledWith({});
      expect(result.success).toBe(true);
      expect(result.message).toBe('Reset all settings to defaults');
    });

    test('should reset specific setting', async () => {
      const settingsCommand = basicCommands.find(cmd => cmd.id === 'cmd-settings');
      expect(settingsCommand).toBeDefined();
      
      const result = await settingsCommand!.handler(createMockContext({
        action: 'reset',
        key: 'terminal.theme'
      }));
      
      expect(configModule.loadConfig).toHaveBeenCalled();
      expect(configModule.saveConfig).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Reset terminal.theme to default');
    });
  });

  describe('Version Command', () => {
    test('should display version information', async () => {
      const versionCommand = basicCommands.find(cmd => cmd.id === 'cmd-version');
      expect(versionCommand).toBeDefined();
      
      const logger = require('../../../src/utils/logger.js').logger;
      
      const result = await versionCommand!.handler(createMockContext());
      
      expect(logger.info).toHaveBeenCalledWith('Vibex v1.0.0');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Node.js'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Uptime:'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Memory:'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('CPU:'));
      expect(result.success).toBe(true);
      expect(result.message).toBe('Version information displayed');
    });
  });

  describe('Clear Command', () => {
    test('should clear console', async () => {
      const clearCommand = basicCommands.find(cmd => cmd.id === 'cmd-clear');
      expect(clearCommand).toBeDefined();
      
      const logger = require('../../../src/utils/logger.js').logger;
      
      const result = await clearCommand!.handler(createMockContext());
      
      expect(logger.info).toHaveBeenCalledWith('Clear command executed');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Console cleared');
    });
  });

  describe('Theme Command', () => {
    test('should list available themes', async () => {
      const themeCommand = basicCommands.find(cmd => cmd.id === 'cmd-theme');
      expect(themeCommand).toBeDefined();
      
      const logger = require('../../../src/utils/logger.js').logger;
      
      const result = await themeCommand!.handler(createMockContext({
        list: true
      }));
      
      expect(logger.info).toHaveBeenCalledWith('Available themes:');
      expect(logger.info).toHaveBeenCalledTimes(7); // Header + 6 themes
      expect(result.success).toBe(true);
      expect(result.message).toBe('Available themes listed');
    });

    test('should show current theme', async () => {
      const themeCommand = basicCommands.find(cmd => cmd.id === 'cmd-theme');
      expect(themeCommand).toBeDefined();
      
      const logger = require('../../../src/utils/logger.js').logger;
      
      const result = await themeCommand!.handler(createMockContext());
      
      expect(logger.info).toHaveBeenCalledWith('Current theme: dark');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Current theme displayed');
    });

    test('should change theme', async () => {
      const themeCommand = basicCommands.find(cmd => cmd.id === 'cmd-theme');
      expect(themeCommand).toBeDefined();
      
      const logger = require('../../../src/utils/logger.js').logger;
      
      const result = await themeCommand!.handler(createMockContext({
        name: 'light'
      }));
      
      expect(configModule.loadConfig).toHaveBeenCalled();
      expect(configModule.saveConfig).toHaveBeenCalledWith(expect.objectContaining({
        terminal: expect.objectContaining({
          theme: 'light'
        })
      }));
      expect(logger.info).toHaveBeenCalledWith('Theme changed to light');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Theme changed to light');
    });
  });

  describe('Debug Command', () => {
    test('should toggle debug mode', async () => {
      const debugCommand = basicCommands.find(cmd => cmd.id === 'cmd-debug');
      expect(debugCommand).toBeDefined();
      
      const logger = require('../../../src/utils/logger.js').logger;
      
      const result = await debugCommand!.handler(createMockContext());
      
      expect(configModule.loadConfig).toHaveBeenCalled();
      expect(configModule.saveConfig).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Debug mode enabled');
      expect(logger.setLevel).toHaveBeenCalledWith('debug');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Debug mode enabled');
    });

    test('should set specific debug level', async () => {
      const debugCommand = basicCommands.find(cmd => cmd.id === 'cmd-debug');
      expect(debugCommand).toBeDefined();
      
      const logger = require('../../../src/utils/logger.js').logger;
      
      const result = await debugCommand!.handler(createMockContext({
        level: 'trace'
      }));
      
      expect(configModule.loadConfig).toHaveBeenCalled();
      expect(configModule.saveConfig).toHaveBeenCalledWith(expect.objectContaining({
        logger: expect.objectContaining({
          level: 'trace'
        })
      }));
      expect(logger.info).toHaveBeenCalledWith('Debug level set to trace');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Debug level set to trace');
    });
  });
});