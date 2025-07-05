/**
 * Unit tests for the ToolRegistry class
 */

import { jest } from '@jest/globals';
import { 
  toolRegistry, 
  getToolRegistry,
  getAllTools,
  executeTool,
  getToolStats,
  clearToolStats,
  registerBuiltInTools,
  type ToolDefinition,
  type ToolHandler,
  type ToolUseBlock,
  type InternalToolResult
} from '../../../src/tools/index.js';
import type { ToolOperation } from '../../../src/ui/components/LiveToolFeedback.js';

// Mock dependencies
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock web-fetch and code-analyzer modules
jest.mock('../../../src/tools/web-fetch.js', () => ({
  createWebFetchTool: jest.fn(() => ({
    name: 'web_fetch',
    description: 'Fetch content from web',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string' }
      },
      required: ['url']
    }
  })),
  executeWebFetch: jest.fn(() => Promise.resolve({
    success: true,
    result: 'Web content'
  }))
}));

jest.mock('../../../src/tools/code-analyzer.js', () => ({
  createCodeAnalyzerTool: jest.fn(() => ({
    name: 'analyze_code',
    description: 'Analyze code structure',
    input_schema: {
      type: 'object',
      properties: {
        file_path: { type: 'string' }
      },
      required: ['file_path']
    }
  })),
  executeCodeAnalysis: jest.fn(() => Promise.resolve({
    success: true,
    result: 'Code analysis'
  }))
}));

describe('Tool Registry', () => {
  // Test tool definition
  const testTool: ToolDefinition = {
    name: 'test_tool',
    description: 'Test tool for unit testing',
    input_schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Test input'
        }
      },
      required: ['text']
    }
  };

  // Test tool handler
  const testToolHandler: ToolHandler = jest.fn(async (input) => {
    return {
      success: true,
      result: `Processed: ${input.text}`
    };
  });

  // Clear registry before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear the registry
    const registry = getToolRegistry();
    clearToolStats();
    
    // Re-register the test tool for each test
    registry.register(testTool, testToolHandler);
  });

  describe('Tool Registration', () => {
    test('should register a tool correctly', () => {
      // Tool is already registered in beforeEach
      const tools = getAllTools();
      expect(tools).toContainEqual(testTool);
    });

    test('should register multiple tools', () => {
      const registry = getToolRegistry();
      registry.register({
        name: 'another_tool',
        description: 'Another test tool',
        input_schema: {
          type: 'object',
          properties: {
            number: { type: 'number' }
          },
          required: ['number']
        }
      }, async () => ({ success: true, result: 'Success' }));

      const tools = getAllTools();
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('test_tool');
      expect(tools[1].name).toBe('another_tool');
    });

    test('should get a specific tool by name', () => {
      const registry = getToolRegistry();
      const tool = registry.get('test_tool');
      expect(tool).toBeDefined();
      expect(tool?.definition.name).toBe('test_tool');
      expect(tool?.handler).toBe(testToolHandler);
    });

    test('should return undefined for non-existent tool', () => {
      const registry = getToolRegistry();
      const tool = registry.get('non_existent_tool');
      expect(tool).toBeUndefined();
    });
  });

  describe('Tool Execution', () => {
    test('should execute a tool successfully', async () => {
      const toolUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'test123',
        name: 'test_tool',
        input: { text: 'Hello World' }
      };

      const result = await executeTool(toolUse);
      
      expect(testToolHandler).toHaveBeenCalledWith(
        { text: 'Hello World' },
        expect.anything()
      );
      expect(result.tool_use_id).toBe('test123');
      expect(result.content).toBe(JSON.stringify('Processed: Hello World'));
      expect(result.is_error).toBeUndefined();
    });

    test('should handle tool execution errors', async () => {
      const errorHandler: ToolHandler = jest.fn(async () => {
        throw new Error('Test error');
      });

      const registry = getToolRegistry();
      registry.register({
        name: 'error_tool',
        description: 'Tool that throws an error',
        input_schema: { type: 'object', properties: {} }
      }, errorHandler);

      const toolUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'error123',
        name: 'error_tool',
        input: {}
      };

      const result = await executeTool(toolUse);
      
      expect(errorHandler).toHaveBeenCalled();
      expect(result.tool_use_id).toBe('error123');
      expect(result.is_error).toBe(true);
      expect(result.content).toBe('Test error');
    });

    test('should handle non-existent tools', async () => {
      const toolUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'missing123',
        name: 'non_existent_tool',
        input: {}
      };

      const result = await executeTool(toolUse);
      
      expect(result.tool_use_id).toBe('missing123');
      expect(result.is_error).toBe(true);
      expect(result.content).toContain('not found');
    });

    test('should handle failed tool execution result', async () => {
      const failureHandler: ToolHandler = jest.fn(async () => {
        return {
          success: false,
          error: 'Failed to process'
        };
      });

      const registry = getToolRegistry();
      registry.register({
        name: 'failing_tool',
        description: 'Tool that returns failure',
        input_schema: { type: 'object', properties: {} }
      }, failureHandler);

      const toolUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'failure123',
        name: 'failing_tool',
        input: {}
      };

      const result = await executeTool(toolUse);
      
      expect(failureHandler).toHaveBeenCalled();
      expect(result.tool_use_id).toBe('failure123');
      expect(result.is_error).toBe(true);
      expect(result.content).toBe('Failed to process');
    });
  });

  describe('Feedback Support', () => {
    test('should call feedback handlers during execution', async () => {
      const onStart = jest.fn((op: ToolOperation, target?: string) => 'feedback123');
      const onProgress = jest.fn();
      const onComplete = jest.fn();

      const feedbackHandler: ToolHandler = jest.fn(async (input, feedback) => {
        feedback?.onStart?.('read_file', 'test.txt');
        feedback?.onProgress?.('feedback123', { status: 'processing', message: 'Working...' });
        feedback?.onComplete?.('feedback123', { success: true, result: 'Complete' });
        return { success: true, result: 'Success with feedback' };
      });

      const registry = getToolRegistry();
      registry.register({
        name: 'feedback_tool',
        description: 'Tool with feedback',
        input_schema: { type: 'object', properties: {} }
      }, feedbackHandler);

      const toolUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'feedback123',
        name: 'feedback_tool',
        input: {}
      };

      const result = await executeTool(toolUse, {
        onStart,
        onProgress,
        onComplete
      });
      
      expect(feedbackHandler).toHaveBeenCalled();
      expect(onStart).toHaveBeenCalledWith('read_file', 'test.txt', undefined);
      expect(onProgress).toHaveBeenCalledWith('feedback123', expect.objectContaining({
        status: 'processing',
        message: 'Working...'
      }));
      expect(onComplete).toHaveBeenCalledWith('feedback123', expect.objectContaining({
        success: true
      }));
      expect(result.content).toBe(JSON.stringify('Success with feedback'));
    });
  });

  describe('Statistics Tracking', () => {
    test('should track execution statistics', async () => {
      const toolUse1: ToolUseBlock = {
        type: 'tool_use',
        id: 'stats1',
        name: 'test_tool',
        input: { text: 'First call' }
      };

      const toolUse2: ToolUseBlock = {
        type: 'tool_use',
        id: 'stats2',
        name: 'test_tool',
        input: { text: 'Second call' }
      };

      await executeTool(toolUse1);
      await executeTool(toolUse2);
      
      const stats = getToolStats();
      expect(stats['test_tool']).toBeDefined();
      expect(stats['test_tool'].count).toBe(2);
      expect(stats['test_tool'].successRate).toBe(100);
      expect(stats['test_tool'].avgTime).toBeGreaterThan(0);
    });

    test('should track failed executions in statistics', async () => {
      const registry = getToolRegistry();
      
      const failingHandler: ToolHandler = jest.fn(async () => {
        return { success: false, error: 'Intentional failure' };
      });
      
      registry.register({
        name: 'mixed_tool',
        description: 'Tool with mixed results',
        input_schema: { type: 'object', properties: {} }
      }, failingHandler);

      const successUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'success1',
        name: 'test_tool',
        input: { text: 'This succeeds' }
      };

      const failureUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'fail1',
        name: 'mixed_tool',
        input: {}
      };

      await executeTool(successUse);
      await executeTool(failureUse);
      
      const stats = getToolStats();
      expect(stats['test_tool'].count).toBe(1);
      expect(stats['test_tool'].successRate).toBe(100);
      
      expect(stats['mixed_tool'].count).toBe(1);
      expect(stats['mixed_tool'].successRate).toBe(0);
    });

    test('should clear statistics', async () => {
      const toolUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'clear1',
        name: 'test_tool',
        input: { text: 'Before clear' }
      };

      await executeTool(toolUse);
      
      // Check stats exist
      let stats = getToolStats();
      expect(stats['test_tool'].count).toBe(1);
      
      // Clear stats
      clearToolStats();
      
      // Check stats are cleared
      stats = getToolStats();
      expect(stats['test_tool'].count).toBe(0);
      expect(stats['test_tool'].successRate).toBe(0);
    });
  });

  describe('Built-in Tools', () => {
    test('should register built-in tools', async () => {
      // Clear registry first
      const registry = getToolRegistry();
      clearToolStats();
      
      // Register built-in tools
      await registerBuiltInTools();
      
      // Check tools were registered
      const tools = getAllTools();
      
      expect(tools.length).toBeGreaterThan(2); // Should have several built-in tools
      expect(tools.some(tool => tool.name === 'read_file')).toBe(true);
      expect(tools.some(tool => tool.name === 'write_file')).toBe(true);
      expect(tools.some(tool => tool.name === 'execute_command')).toBe(true);
      expect(tools.some(tool => tool.name === 'web_fetch')).toBe(true);
      expect(tools.some(tool => tool.name === 'analyze_code')).toBe(true);
    });
  });
});