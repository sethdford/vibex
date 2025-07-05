/**
 * Unit tests for Terminal class
 */

import { jest } from '@jest/globals';
import { Terminal, initTerminal } from '../../../src/terminal/index.js';
import type { TerminalInterface, TerminalConfig } from '../../../src/terminal/types.js';

// Mock dependencies
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../../src/terminal/formatting.js', () => ({
  formatOutput: jest.fn().mockImplementation((content) => content),
  clearScreen: jest.fn(),
  getTerminalSize: jest.fn().mockReturnValue({ rows: 24, columns: 80 })
}));

jest.mock('chalk', () => ({
  blue: {
    bold: jest.fn().mockImplementation((text) => text)
  },
  gray: jest.fn().mockImplementation((text) => text),
  white: jest.fn().mockImplementation((text) => text),
  cyan: {
    bold: jest.fn().mockImplementation((text) => text)
  },
  cyan: jest.fn().mockImplementation((text) => text),
  dim: jest.fn().mockImplementation((text) => text),
  green: jest.fn().mockImplementation((text) => text),
  yellow: jest.fn().mockImplementation((text) => text),
  red: jest.fn().mockImplementation((text) => text),
  bold: jest.fn().mockImplementation((text) => text),
  level: 3
}));

jest.mock('ora', () => {
  // Mock Ora spinner
  const mockSpinner = {
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis(),
    text: ''
  };
  return jest.fn().mockImplementation(() => mockSpinner);
});

jest.mock('terminal-link', () => {
  return jest.fn().mockImplementation((text, url, options) => {
    return `${text} (${url})`;
  });
});

jest.mock('table', () => ({
  table: jest.fn().mockImplementation((data) => JSON.stringify(data))
}));

jest.mock('../../../src/terminal/prompt.js', () => ({
  createPrompt: jest.fn().mockResolvedValue('mocked-response')
}));

describe('Terminal', () => {
  // Backup and restore console methods
  const originalConsoleLog = console.log;
  const mockConsoleLog = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = mockConsoleLog;
  });
  
  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('initTerminal', () => {
    test('should initialize terminal with default config', async () => {
      const mockConfig = { terminal: { theme: 'dark' } };
      const terminal = await initTerminal(mockConfig as any);
      
      expect(terminal).toBeDefined();
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.debug).toHaveBeenCalledWith('Initializing terminal interface');
    });

    test('should handle initialization errors gracefully', async () => {
      const mockConfig = {};
      const getTerminalSize = require('../../../src/terminal/formatting.js').getTerminalSize;
      getTerminalSize.mockImplementationOnce(() => {
        throw new Error('Terminal size detection error');
      });
      
      const terminal = await initTerminal(mockConfig as any);
      
      expect(terminal).toBeDefined();
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.warn).toHaveBeenCalledWith('Error initializing terminal interface:', expect.any(Error));
    });
  });

  describe('Terminal instance methods', () => {
    let terminal: TerminalInterface;
    
    beforeEach(() => {
      const config: TerminalConfig = {
        theme: 'dark',
        useColors: true,
        showProgressIndicators: true,
        codeHighlighting: true
      };
      
      // Create a new terminal instance for each test
      terminal = new (Terminal as any)(config);
    });

    test('clear() should call clearScreen if interactive', () => {
      const clearScreen = require('../../../src/terminal/formatting.js').clearScreen;
      
      terminal.clear();
      
      expect(clearScreen).toHaveBeenCalled();
    });

    test('display() should format and log content', () => {
      const formatOutput = require('../../../src/terminal/formatting.js').formatOutput;
      formatOutput.mockReturnValueOnce('formatted content');
      
      terminal.display('test content');
      
      expect(formatOutput).toHaveBeenCalledWith('test content', expect.objectContaining({
        colors: true,
        codeHighlighting: true
      }));
      expect(console.log).toHaveBeenCalledWith('formatted content');
    });

    test('displayWelcome() should show welcome message', () => {
      terminal.displayWelcome();
      
      // Check that console.log was called multiple times
      expect(console.log).toHaveBeenCalledTimes(5);
    });

    test('emphasize() should highlight message with color when available', () => {
      terminal.emphasize('important message');
      
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('emphasize() should use uppercase when colors not available', () => {
      const config: TerminalConfig = {
        theme: 'dark',
        useColors: false,
        showProgressIndicators: true,
        codeHighlighting: true
      };
      
      const noColorTerminal = new (Terminal as any)(config);
      noColorTerminal.emphasize('important message');
      
      expect(console.log).toHaveBeenCalledWith('IMPORTANT MESSAGE');
    });
    
    test('info() should display info message', () => {
      terminal.info('info message');
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('success() should display success message', () => {
      terminal.success('success message');
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('warn() should display warning message', () => {
      terminal.warn('warning message');
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('error() should display error message', () => {
      terminal.error('error message');
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('link() should create terminal links', () => {
      const result = terminal.link('click me', 'https://example.com');
      expect(result).toBe('click me (https://example.com)');
    });

    test('table() should display tabular data', () => {
      const data = [['row1', 'data'], ['row2', 'data']];
      terminal.table(data);
      
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('table() should add header formatting when provided', () => {
      const data = [['row1', 'data'], ['row2', 'data']];
      const options = { header: ['Column 1', 'Column 2'] };
      
      terminal.table(data, options);
      
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('prompt() should create and return a prompt', async () => {
      const createPrompt = require('../../../src/terminal/prompt.js').createPrompt;
      
      const result = await terminal.prompt({ type: 'text', message: 'Enter something:' });
      
      expect(createPrompt).toHaveBeenCalledWith(
        { type: 'text', message: 'Enter something:' },
        expect.any(Object)
      );
      expect(result).toBe('mocked-response');
    });

    test('spinner() should create and return a spinner instance', () => {
      const spinnerInstance = terminal.spinner('Loading...');
      
      expect(spinnerInstance).toBeDefined();
      expect(spinnerInstance.id).toBe('default');
      
      // Test spinner methods
      spinnerInstance.update('Updated text');
      spinnerInstance.succeed('Success message');
      spinnerInstance.fail('Failure message');
      spinnerInstance.warn('Warning message');
      spinnerInstance.info('Info message');
      spinnerInstance.stop();
      
      const ora = require('ora');
      expect(ora).toHaveBeenCalledWith('Loading...');
    });

    test('detectCapabilities() should check terminal capabilities', async () => {
      await terminal.detectCapabilities();
      
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.debug).toHaveBeenCalledWith('Terminal capabilities detected', expect.any(Object));
    });

    test('detectCapabilities() should handle terminals without color support', async () => {
      // Mock chalk level to indicate no color support
      const chalk = require('chalk');
      const originalLevel = chalk.level;
      chalk.level = 0;
      
      await terminal.detectCapabilities();
      
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.warn).toHaveBeenCalledWith('Terminal does not support colors, disabling color output');
      
      // Restore chalk level
      chalk.level = originalLevel;
    });
  });
});