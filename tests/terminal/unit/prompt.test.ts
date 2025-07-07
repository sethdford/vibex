/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Unit tests for terminal prompt utilities
 */

import { jest } from 'vitest';
import { Prompt, createPrompt, promptText, promptPassword, promptConfirm, promptList, promptCheckbox, promptEditor } from '../../../src/terminal/prompt.js';
import type { PromptOptions, TerminalConfig } from '../../../src/terminal/types.js';

// Mock dependencies
vi.mock('readline', () => ({
  default: {
    createInterface: vi.fn().mockImplementation(() => ({
      question: vi.fn((query, cb) => setTimeout(() => cb('mocked-answer'), 0)),
      close: vi.fn(),
      on: vi.fn()
    }))
  },
  createInterface: vi.fn().mockImplementation(() => ({
    question: vi.fn((query, cb) => setTimeout(() => cb('mocked-answer'), 0)),
    close: vi.fn(),
    on: vi.fn()
  }))
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockImplementation((questions) => {
      const question = questions[0];
      let result: any = 'mocked-answer';
      
      // Return different values based on prompt type
      switch (question.type) {
        case 'confirm':
          result = true;
          break;
        case 'list':
          result = question.choices && question.choices.length > 0 
            ? question.choices[0].value || question.choices[0]
            : 'mocked-choice';
          break;
        case 'checkbox':
          result = question.choices && question.choices.length > 0 
            ? [question.choices[0].value || question.choices[0]]
            : ['mocked-choice'];
          break;
        default:
          result = 'mocked-answer';
      }
      
      return Promise.resolve({ [question.name]: result });
    })
  }
}));

vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Terminal Prompts', () => {
  const mockConfig: TerminalConfig = {
    theme: 'dark',
    useColors: true,
    showProgressIndicators: true,
    codeHighlighting: true
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock TTY properties
    Object.defineProperty(process.stdin, 'isTTY', { value: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true });
  });
  
  describe('Prompt class', () => {
    test('should create a readline interface and handle user input', async () => {
      const options: PromptOptions = {
        type: 'input',
        name: 'test',
        message: 'Enter value:'
      };
      
      const prompt = new Prompt(options, mockConfig);
      const result = await prompt.run();
      
      expect(result).toBe('mocked-answer');
    });
  });
  
  describe('createPrompt', () => {
    test('should create and return a prompt result', async () => {
      const options: PromptOptions = {
        type: 'input',
        name: 'test',
        message: 'Enter value:'
      };
      
      const result = await createPrompt(options, mockConfig);
      
      expect(result).toBe('mocked-answer');
      const logger = require('../../../src/utils/logger.js').logger;
      expect(logger.debug).toHaveBeenCalledWith('Creating prompt', expect.any(Object));
      expect(logger.debug).toHaveBeenCalledWith('Prompt result', expect.any(Object));
    });
    
    test('should add validation for required fields', async () => {
      const options: PromptOptions = {
        type: 'input',
        name: 'test',
        message: 'Enter value:',
        required: true
      };
      
      await createPrompt(options, mockConfig);
      
      const inquirer = require('inquirer');
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          validate: expect.any(Function)
        })
      ]);
    });
    
    test('should throw error for non-interactive terminals', async () => {
      // Mock non-TTY terminal
      Object.defineProperty(process.stdin, 'isTTY', { value: false });
      
      const options: PromptOptions = {
        type: 'input',
        name: 'test',
        message: 'Enter value:'
      };
      
      await expect(createPrompt(options, mockConfig)).rejects.toThrow(
        'Cannot prompt for input in non-interactive terminal'
      );
      
      // Reset TTY state
      Object.defineProperty(process.stdin, 'isTTY', { value: true });
    });
    
    test('should handle inquirer errors', async () => {
      const inquirer = require('inquirer');
      inquirer.prompt.mockRejectedValueOnce(new Error('Mock prompt error'));
      
      const options: PromptOptions = {
        type: 'input',
        name: 'test',
        message: 'Enter value:'
      };
      
      await expect(createPrompt(options, mockConfig)).rejects.toThrow(
        'Failed to prompt for test: Mock prompt error'
      );
    });
  });
  
  describe('Prompt utility functions', () => {
    test('promptText should create a text prompt', async () => {
      const result = await promptText('Enter your name:');
      
      expect(result).toBe('mocked-answer');
      const inquirer = require('inquirer');
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'input',
          name: 'input',
          message: 'Enter your name:'
        })
      ]);
    });
    
    test('promptPassword should create a password prompt', async () => {
      const result = await promptPassword('Enter password:', { mask: '#' });
      
      expect(result).toBe('mocked-answer');
      const inquirer = require('inquirer');
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'password',
          name: 'password',
          message: 'Enter password:',
          mask: '#'
        })
      ]);
    });
    
    test('promptConfirm should create a confirmation prompt', async () => {
      const result = await promptConfirm('Are you sure?', { default: false });
      
      expect(result).toBe(true);
      const inquirer = require('inquirer');
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure?',
          default: false
        })
      ]);
    });
    
    test('promptList should create a selection list prompt', async () => {
      const choices = ['Option 1', 'Option 2', { name: 'Option 3', value: 'opt3' }];
      const result = await promptList('Select an option:', choices);
      
      expect(result).toBeDefined();
      const inquirer = require('inquirer');
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          name: 'list',
          message: 'Select an option:',
          choices
        })
      ]);
    });
    
    test('promptCheckbox should create a multi-select prompt', async () => {
      const choices = [
        'Option 1',
        { name: 'Option 2', value: 'opt2', checked: true }
      ];
      const result = await promptCheckbox('Select options:', choices);
      
      expect(Array.isArray(result)).toBe(true);
      const inquirer = require('inquirer');
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'checkbox',
          name: 'checkbox',
          message: 'Select options:',
          choices
        })
      ]);
    });
    
    test('promptEditor should create an editor prompt', async () => {
      const result = await promptEditor('Edit content:', {
        default: 'Initial content'
      });
      
      expect(result).toBe('mocked-answer');
      const inquirer = require('inquirer');
      expect(inquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'editor',
          name: 'editor',
          message: 'Edit content:',
          default: 'Initial content'
        })
      ]);
    });
  });
});