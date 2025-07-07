/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Integration Tests for Specialized Tools
 * 
 * These tests verify that the specialized tools (ripgrep, code analyzer, screenshot)
 * work correctly with the overall tool system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeCore } from '../../../src/core/initialization';
import { toolAPI } from '../../../src/core/domain/tool/tool-api';
import { searchCode, analyzeCode, takeScreenshot } from '../../../src/core/adapters/compat';

// Mock ripgrep tool
vi.mock('../../../src/tools/ripgrep', () => ({
  createRipgrepTool: () => ({
    name: 'search_code',
    description: 'Search for text patterns in files using ripgrep',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'The text pattern to search for' },
        path: { type: 'string', description: 'Directory to search in', default: '.' }
      },
      required: ['pattern']
    },
    handler: vi.fn().mockImplementation(async (input) => {
      if (!input.pattern) {
        throw new Error('Pattern is required');
      }
      return `Search Results:\n\nfile1.ts:10: match for ${input.pattern}\nfile2.ts:25: another match for ${input.pattern}`;
    })
  })
}));

// Mock code analyzer tool
vi.mock('../../../src/tools/code-analyzer', () => ({
  createCodeAnalyzerTool: () => ({
    name: 'analyze_code',
    description: 'Perform comprehensive code analysis',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path to the code file' },
        analysis_type: { type: 'string', description: 'Analysis type' }
      },
      required: ['file_path']
    }
  }),
  executeCodeAnalysis: vi.fn().mockImplementation(async (input) => {
    if (!input.file_path) {
      return { success: false, error: 'File path is required' };
    }
    
    if (input.file_path.includes('error')) {
      return { success: false, error: 'Failed to analyze file' };
    }
    
    return {
      success: true,
      result: `# Code Analysis Report\n\n**File:** ${input.file_path}\n**Score:** 85/100\n\n## Quality Metrics\n- Good structure\n- Well documented`
    };
  })
}));

// Mock screenshot tool
vi.mock('../../../src/tools/screenshot', () => ({
  createScreenshotTool: () => ({
    name: 'take_screenshot',
    description: 'Take a screenshot',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Type of screenshot' },
        outputPath: { type: 'string', description: 'Output path' }
      },
      required: ['type']
    }
  }),
  executeScreenshot: vi.fn().mockImplementation(async (input) => {
    if (!input.type) {
      return { success: false, error: 'Type is required' };
    }
    
    const outputPath = input.outputPath || '/tmp/screenshot.png';
    
    return {
      success: true,
      result: {
        message: `Screenshot saved to ${outputPath}`,
        filePath: outputPath,
        fileSize: 12345,
        dimensions: { width: 1920, height: 1080 }
      }
    };
  })
}));

// Mock the confirmation service to auto-confirm
vi.mock('../../../src/core/domain/tool/confirmation', () => {
  return {
    createConfirmationService: () => ({
      requestConfirmation: async () => 'proceed_once',
      isTrusted: () => false,
      markAsTrusted: () => {}
    })
  };
});

describe('Specialized Tools Integration', () => {
  let core;
  let eventLog = [];
  
  beforeEach(async () => {
    // Reset mocks and event log
    vi.clearAllMocks();
    eventLog = [];
    
    // Initialize the core
    core = await initializeCore();
    
    // Set up event listener
    core.eventBus.subscribe('*', (event) => {
      eventLog.push(event);
    });
  });
  
  describe('Ripgrep Tool Integration', () => {
    it('should be registered and available', () => {
      const tools = toolAPI.getAllTools();
      const ripgrepTool = tools.find(t => t.name === 'search_code');
      
      expect(ripgrepTool).toBeDefined();
      expect(ripgrepTool?.description).toContain('ripgrep');
    });
    
    it('should execute through toolAPI', async () => {
      const result = await toolAPI.executeTool('search_code', {
        pattern: 'function',
        path: './src',
        case_sensitive: false
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('function');
      
      // Check for execution events
      const executionEvents = eventLog.filter(e => 
        e.type === 'tool_execution_requested' || 
        e.type === 'tool_execution_started' || 
        e.type === 'tool_execution_completed'
      );
      expect(executionEvents.length).toBe(3);
    });
    
    it('should execute through compatibility layer', async () => {
      const result = await searchCode({
        pattern: 'class',
        path: './src'
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toContain('class');
    });
  });
  
  describe('Code Analyzer Integration', () => {
    it('should be registered and available', () => {
      const tools = toolAPI.getAllTools();
      const codeAnalyzerTool = tools.find(t => t.name === 'analyze_code');
      
      expect(codeAnalyzerTool).toBeDefined();
      expect(codeAnalyzerTool?.description).toContain('code');
    });
    
    it('should execute through toolAPI', async () => {
      const result = await toolAPI.executeTool('analyze_code', {
        file_path: './src/main.ts',
        analysis_type: 'full',
        include_suggestions: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toContain('Code Analysis Report');
      expect(result.data).toContain('./src/main.ts');
    });
    
    it('should execute through compatibility layer', async () => {
      const result = await analyzeCode({
        file_path: './src/utils.ts'
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toContain('Code Analysis Report');
      expect(result.result).toContain('./src/utils.ts');
    });
    
    it('should handle analysis errors', async () => {
      const result = await analyzeCode({
        file_path: './src/error.ts'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('Screenshot Tool Integration', () => {
    it('should be registered and available', () => {
      const tools = toolAPI.getAllTools();
      const screenshotTool = tools.find(t => t.name === 'take_screenshot');
      
      expect(screenshotTool).toBeDefined();
      expect(screenshotTool?.description).toContain('screenshot');
    });
    
    it('should execute through toolAPI', async () => {
      const result = await toolAPI.executeTool('take_screenshot', {
        type: 'screen',
        quality: 90
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain('Screenshot saved');
    });
    
    it('should execute through compatibility layer', async () => {
      const result = await takeScreenshot({
        type: 'window',
        delay: 1000
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.message).toContain('Screenshot saved');
    });
  });
});