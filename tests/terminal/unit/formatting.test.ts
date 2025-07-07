/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Unit tests for terminal formatting utilities
 */

import { jest } from 'vitest';
import { clearScreen, getTerminalSize, formatOutput, wordWrap } from '../../../src/terminal/formatting.js';

// Mock dependencies
vi.mock('chalk', () => ({
  default: {
    dim: vi.fn().mockImplementation((text) => `dim(${text})`),
    cyan: vi.fn().mockImplementation((text) => `cyan(${text})`),
    bold: Object.assign(
      vi.fn().mockImplementation((text) => `bold(${text})`),
      {
        blue: vi.fn().mockImplementation((text) => `bold.blue(${text})`),
        underline: {
          blue: vi.fn().mockImplementation((text) => `bold.underline.blue(${text})`)
        }
      }
    ),
    italic: vi.fn().mockImplementation((text) => `italic(${text})`),
    gray: vi.fn().mockImplementation((text) => `gray(${text})`),
    blue: vi.fn().mockImplementation((text) => `blue(${text})`),
    yellow: vi.fn().mockImplementation((text) => `yellow(${text})`),
    green: vi.fn().mockImplementation((text) => `green(${text})`)
  }
}));

describe('Terminal Formatting', () => {
  const mockStdout = {
    write: vi.fn(),
    isTTY: true,
    columns: 100,
    rows: 40,
    on: vi.fn()
  };
  
  const originalStdout = process.stdout;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('clearScreen', () => {
    test('should write ANSI escape codes to stdout', () => {
      // Replace stdout temporarily
      Object.defineProperty(process, 'stdout', {
        value: mockStdout,
        writable: true
      });
      
      clearScreen();
      
      expect(mockStdout.write).toHaveBeenCalledWith('\x1b[2J\x1b[0f');
      
      // Restore stdout
      Object.defineProperty(process, 'stdout', {
        value: originalStdout,
        writable: true
      });
    });
  });
  
  describe('getTerminalSize', () => {
    test('should get size from TTY if available', () => {
      // Replace stdout temporarily
      Object.defineProperty(process, 'stdout', {
        value: mockStdout,
        writable: true
      });
      
      const size = getTerminalSize();
      
      expect(size).toEqual({ columns: 100, rows: 40 });
      
      // Restore stdout
      Object.defineProperty(process, 'stdout', {
        value: originalStdout,
        writable: true
      });
    });
    
    test('should return default size if TTY not available', () => {
      // Replace stdout temporarily with non-TTY version
      Object.defineProperty(process, 'stdout', {
        value: { ...mockStdout, isTTY: false },
        writable: true
      });
      
      const size = getTerminalSize();
      
      expect(size).toEqual({ columns: 80, rows: 24 });
      
      // Restore stdout
      Object.defineProperty(process, 'stdout', {
        value: originalStdout,
        writable: true
      });
    });
    
    test('should return default size if error occurs', () => {
      // Replace stdout temporarily with one that throws errors
      Object.defineProperty(process, 'stdout', {
        value: {
          get isTTY() {
            throw new Error('Test error');
          }
        },
        writable: true
      });
      
      const size = getTerminalSize();
      
      expect(size).toEqual({ columns: 80, rows: 24 });
      
      // Restore stdout
      Object.defineProperty(process, 'stdout', {
        value: originalStdout,
        writable: true
      });
    });
  });
  
  describe('formatOutput', () => {
    test('should return empty string for empty input', () => {
      const result = formatOutput('');
      expect(result).toBe('');
    });
    
    test('should format markdown-style text with colors enabled', () => {
      const input = 'This is **bold** and *italic* text with `code`';
      const result = formatOutput(input, { colors: true });
      
      // Each style should be processed
      const chalk = require('chalk');
      expect(chalk.bold).toHaveBeenCalledWith('bold');
      expect(chalk.italic).toHaveBeenCalledWith('italic');
      expect(chalk.cyan).toHaveBeenCalledWith('code');
    });
    
    test('should not format text when colors are disabled', () => {
      const input = 'This is **bold** and *italic* text with `code`';
      const result = formatOutput(input, { colors: false });
      
      // Text should remain unchanged
      expect(result).toBe(input);
    });
    
    test('should format lists', () => {
      const input = '- Item 1\n- Item 2\n  - Nested item';
      const result = formatOutput(input, { colors: true });
      
      // Bullet points should be formatted
      const chalk = require('chalk');
      expect(chalk.dim).toHaveBeenCalledWith('•');
    });
    
    test('should format headers', () => {
      const input = '# Header 1\n## Header 2\n### Header 3';
      const result = formatOutput(input, { colors: true });
      
      // Headers should be formatted with different styles
      const chalk = require('chalk');
      expect(chalk.bold.underline.blue).toHaveBeenCalledWith('Header 1');
      // Check the other header formats too
    });
    
    test('should wrap text to specified width', () => {
      const longText = 'This is a very long line that should be wrapped to a specific width when displayed in the terminal';
      const result = formatOutput(longText, { width: 20 });
      
      // Should contain newlines for wrapping
      expect(result.includes('\n')).toBe(true);
    });
  });
  
  describe('wordWrap', () => {
    test('should wrap text to specified width', () => {
      const longText = 'This is a long line that should be wrapped';
      const result = wordWrap(longText, 10);
      
      // Should split into multiple lines
      expect(result.split('\n').length).toBeGreaterThan(1);
    });
    
    test('should not wrap lines that are already short enough', () => {
      const shortText = 'Short line';
      const result = wordWrap(shortText, 20);
      
      // Should remain a single line
      expect(result).toBe(shortText);
    });
    
    test('should preserve existing line breaks', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      const result = wordWrap(multilineText, 20);
      
      // Should have the same number of lines
      expect(result.split('\n').length).toBe(3);
    });
    
    test('should not wrap code block lines', () => {
      const codeLine = '┃ const x = 1; // This is a very long line with code that should not be wrapped';
      const result = wordWrap(codeLine, 20);
      
      // Code line should not be wrapped
      expect(result).toBe(codeLine);
    });
    
    test('should handle words longer than the specified width', () => {
      const longWordText = 'This supercalifragilisticexpialidocious word is very long';
      const result = wordWrap(longWordText, 10);
      
      // The long word should be on its own line
      expect(result.includes('supercalifragilisticexpialidocious')).toBe(true);
    });
  });
});