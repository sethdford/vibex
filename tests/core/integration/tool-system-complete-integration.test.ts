/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Complete Tool System Integration Test
 * 
 * This test verifies that the entire tool system works together correctly,
 * including all tool types: core, advanced file tools, specialized tools,
 * web tools, and MCP tools. It ensures the tool lifecycle (registration,
 * validation, confirmation, execution, and progress reporting) functions
 * correctly for all tool types.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { initializeCore } from '../../../src/core/initialization';
import { toolAPI } from '../../../src/core/domain/tool/tool-api';
import { InMemoryEventBus } from '../../../src/core/domain/tool/tool-events';

// Mock all external tool implementations
vi.mock('../../../src/tools/ripgrep', () => ({
  createRipgrepTool: () => ({
    name: 'search_code',
    description: 'Search for text patterns in files',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Pattern to search for' }
      },
      required: ['pattern']
    },
    handler: vi.fn().mockImplementation(async (input) => {
      return `Search Results for ${input.pattern}`;
    })
  })
}));

vi.mock('../../../src/tools/code-analyzer', () => ({
  createCodeAnalyzerTool: () => ({
    name: 'analyze_code',
    description: 'Analyze code',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'File path' }
      },
      required: ['file_path']
    }
  }),
  executeCodeAnalysis: vi.fn().mockImplementation(async (input) => {
    return {
      success: true,
      result: `Analysis for ${input.file_path}`
    };
  })
}));

vi.mock('../../../src/tools/screenshot', () => ({
  createScreenshotTool: () => ({
    name: 'take_screenshot',
    description: 'Take screenshots',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Screenshot type' }
      },
      required: ['type']
    }
  }),
  executeScreenshot: vi.fn().mockImplementation(async (input) => {
    return {
      success: true,
      result: {
        message: `Screenshot of type ${input.type}`,
        filePath: '/tmp/screenshot.png',
        fileSize: 12345
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

describe('Complete Tool System Integration', () => {
  let core;
  let eventBus: InMemoryEventBus;
  let eventLog: any[] = [];
  
  beforeAll(async () => {
    // Initialize the core with test configuration
    core = await initializeCore();
    eventBus = core.eventBus;
    
    // Set up event listener to track all events
    eventBus.subscribe('*', (event) => {
      eventLog.push(event);
    });
  });
  
  beforeEach(() => {
    // Clear the event log before each test
    eventLog = [];
  });
  
  it('should have all tool types registered', () => {
    const allTools = toolAPI.getAllTools();
    const toolNames = allTools.map(t => t.name);
    
    // Core tools
    expect(toolNames).toContain('read_file');
    expect(toolNames).toContain('write_file');
    expect(toolNames).toContain('shell');
    
    // Advanced file tools
    expect(toolNames).toContain('list_directory');
    expect(toolNames).toContain('glob');
    
    // Specialized tools
    expect(toolNames).toContain('search_code');
    expect(toolNames).toContain('analyze_code');
    expect(toolNames).toContain('take_screenshot');
    
    // Web tools
    expect(toolNames).toContain('web_fetch');
    expect(toolNames).toContain('web_search');
    
    // The total number of tools should be at least 10
    expect(allTools.length).toBeGreaterThanOrEqual(10);
  });
  
  it('should execute all tool types through the tool API', async () => {
    // Define a function to execute a tool and check events
    const executeAndCheck = async (name: string, params: any) => {
      const initialEventCount = eventLog.length;
      
      // Execute the tool
      const result = await toolAPI.executeTool(name, params);
      
      // Check for success
      expect(result.success).toBe(true);
      
      // Check that events were fired
      const toolEvents = eventLog.slice(initialEventCount).filter(e => 
        e.type.startsWith('tool_') && e.detail?.request?.name === name
      );
      
      expect(toolEvents.length).toBeGreaterThan(0);
      
      return result;
    };
    
    // Core tool
    const readResult = await executeAndCheck('read_file', { file_path: '/test/file.txt' });
    expect(readResult.data).toBeDefined();
    
    // Advanced file tool
    const globResult = await executeAndCheck('glob', { pattern: '*.ts' });
    expect(globResult.data).toBeDefined();
    
    // Specialized tools
    const searchResult = await executeAndCheck('search_code', { pattern: 'function' });
    expect(searchResult.data).toContain('function');
    
    const analyzeResult = await executeAndCheck('analyze_code', { file_path: '/test/file.ts' });
    expect(analyzeResult.data).toContain('file.ts');
    
    const screenshotResult = await executeAndCheck('take_screenshot', { type: 'screen' });
    expect(screenshotResult.data.message).toContain('screen');
    
    // Web tools
    const fetchResult = await executeAndCheck('web_fetch', { 
      url: 'https://example.com', 
      prompt: 'Analyze this content' 
    });
    expect(fetchResult.data).toBeDefined();
  });
  
  it('should handle parameter validation correctly for all tool types', async () => {
    // Test with missing required parameters
    const validateAndCheckError = async (name: string, params: any) => {
      const result = await toolAPI.executeTool(name, params);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      return result;
    };
    
    // Core tool with missing parameters
    await validateAndCheckError('read_file', {});
    
    // Specialized tool with missing parameters
    await validateAndCheckError('search_code', {});
    
    // Web tool with missing parameters
    await validateAndCheckError('web_fetch', {});
  });
  
  it('should handle progress reporting for all tool types', async () => {
    const progressUpdates: any[] = [];
    
    const executeWithProgress = async (name: string, params: any) => {
      progressUpdates.length = 0;
      
      const result = await toolAPI.executeTool(name, params, {
        onProgress: (progress) => {
          progressUpdates.push(progress);
        }
      });
      
      return result;
    };
    
    // Test progress reporting for specialized tools
    await executeWithProgress('analyze_code', { file_path: '/test/file.ts' });
    expect(progressUpdates.length).toBeGreaterThan(0);
    
    progressUpdates.length = 0;
    await executeWithProgress('take_screenshot', { type: 'screen' });
    expect(progressUpdates.length).toBeGreaterThan(0);
  });
  
  it('should handle concurrent tool executions correctly', async () => {
    // Execute multiple tools concurrently
    const promises = [
      toolAPI.executeTool('search_code', { pattern: 'class' }),
      toolAPI.executeTool('analyze_code', { file_path: '/test/file1.ts' }),
      toolAPI.executeTool('take_screenshot', { type: 'window' }),
      toolAPI.executeTool('read_file', { file_path: '/test/file2.txt' })
    ];
    
    // All should complete without errors
    const results = await Promise.all(promises);
    
    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    }
    
    // Check that all tool execution events were fired
    const executionEvents = eventLog.filter(e => 
      e.type === 'tool_execution_completed' || e.type === 'tool_execution_failed'
    );
    
    expect(executionEvents.length).toBeGreaterThanOrEqual(promises.length);
  });
  
  it('should maintain consistent API across all tool types', () => {
    // Get all tools
    const allTools = toolAPI.getAllTools();
    
    // Verify common interface properties across all tools
    for (const tool of allTools) {
      // Name and description
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
      
      // Parameters
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.properties).toBeDefined();
      
      // Methods
      expect(typeof tool.execute).toBe('function');
      expect(typeof tool.validateParams).toBe('function');
      expect(typeof tool.shouldConfirmExecute).toBe('function');
      expect(typeof tool.getMetadata).toBe('function');
    }
  });
});