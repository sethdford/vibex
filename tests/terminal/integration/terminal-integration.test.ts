/**
 * Integration tests for Terminal module
 */

import { jest } from '@jest/globals';
import { initTerminal } from '../../../src/terminal/index.js';
import type { TerminalInterface } from '../../../src/terminal/types.js';
import { loadConfig } from '../../../src/config/index.js';

// Mock dependencies
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../../src/config/index.js', () => ({
  loadConfig: jest.fn().mockResolvedValue({
    terminal: {
      theme: 'dark',
      useColors: true,
      showProgressIndicators: true,
      codeHighlighting: true
    }
  })
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

// Mock prompt
jest.mock('../../../src/terminal/prompt.js', () => ({
  createPrompt: jest.fn().mockResolvedValue('mocked-response')
}));

describe('Terminal Integration', () => {
  // Backup and restore console methods
  const originalConsoleLog = console.log;
  const mockConsoleLog = jest.fn();
  
  let terminal: TerminalInterface;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    console.log = mockConsoleLog;
    
    const config = await loadConfig();
    terminal = await initTerminal(config);
  });
  
  afterEach(() => {
    console.log = originalConsoleLog;
  });
  
  test('should initialize terminal with config from config module', async () => {
    expect(loadConfig).toHaveBeenCalled();
    expect(terminal).toBeDefined();
  });
  
  test('should display formatted content', () => {
    const formatOutput = require('../../../src/terminal/formatting.js').formatOutput;
    
    terminal.display('test content');
    
    expect(formatOutput).toHaveBeenCalledWith('test content', expect.objectContaining({
      colors: true,
      codeHighlighting: true
    }));
  });
  
  test('should integrate with spinner for async operations', async () => {
    // Test integration with spinner for async operations
    const spinnerInstance = terminal.spinner('Processing...');
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    
    spinnerInstance.succeed('Operation completed');
    
    const ora = require('ora');
    expect(ora).toHaveBeenCalledWith('Processing...');
  });
  
  test('should use prompt for user input', async () => {
    const createPrompt = require('../../../src/terminal/prompt.js').createPrompt;
    
    const result = await terminal.prompt({
      type: 'text',
      message: 'Enter your name:'
    });
    
    expect(createPrompt).toHaveBeenCalled();
    expect(result).toBe('mocked-response');
  });
  
  test('should use terminal capabilities for messaging', () => {
    // Test the integration between different messaging methods
    terminal.info('This is an info message');
    terminal.success('This is a success message');
    terminal.warn('This is a warning message');
    terminal.error('This is an error message');
    
    expect(console.log).toHaveBeenCalledTimes(4);
  });
  
  test('should integrate with terminal size detection', () => {
    const getTerminalSize = require('../../../src/terminal/formatting.js').getTerminalSize;
    getTerminalSize.mockReturnValueOnce({ rows: 30, columns: 100 });
    
    // This would trigger a resize event handler internally
    process.stdout.emit('resize');
    
    const logger = require('../../../src/utils/logger.js').logger;
    expect(logger.debug).toHaveBeenCalledWith('Terminal resized to 100x30');
  });
});