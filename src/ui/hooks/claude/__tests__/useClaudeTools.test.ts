/**
 * Tests for useClaudeTools hook
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useClaudeTools } from '../useClaudeTools.js';
import { MessageType } from '../../../types.js';

// Mock tool registry
vi.mock('../../../../tools/index.js', () => ({
  toolRegistry: {
    execute: vi.fn(),
    getAll: vi.fn(() => [
      {
        name: 'test_tool',
        description: 'Test tool',
        input_schema: { type: 'object', properties: {} }
      }
    ])
  }
}));

describe('useClaudeTools', () => {
  const mockAddItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract tool use blocks from content', () => {
    const { result } = renderHook(() => 
      useClaudeTools(mockAddItem, true, false)
    );

    const content = [
      { type: 'text', text: 'Some text' },
      { 
        type: 'tool_use', 
        id: 'tool-1', 
        name: 'test_tool', 
        input: { param: 'value' } 
      },
      { type: 'text', text: 'More text' }
    ];

    const toolUses = result.current.extractToolUseBlocks(content);

    expect(toolUses).toHaveLength(1);
    expect(toolUses[0]).toEqual({
      type: 'tool_use',
      id: 'tool-1',
      name: 'test_tool',
      input: { param: 'value' }
    });
  });

  it('should filter out invalid tool use blocks', () => {
    const { result } = renderHook(() => 
      useClaudeTools(mockAddItem, true, false)
    );

    const content = [
      { type: 'tool_use' }, // Missing required fields
      { type: 'tool_use', id: 'tool-1' }, // Missing name and input
      { 
        type: 'tool_use', 
        id: 'tool-2', 
        name: 'valid_tool', 
        input: { param: 'value' } 
      }
    ];

    const toolUses = result.current.extractToolUseBlocks(content);

    expect(toolUses).toHaveLength(1);
    expect(toolUses[0].id).toBe('tool-2');
  });

  it('should execute tool with real execution enabled', async () => {
    const { toolRegistry } = await import('../../../../tools/index.js');
    (toolRegistry.execute as any).mockResolvedValue({
      tool_use_id: 'tool-1',
      content: 'Tool executed successfully',
      is_error: false
    });

    const { result } = renderHook(() => 
      useClaudeTools(mockAddItem, true, false)
    );

    const toolUse = {
      type: 'tool_use' as const,
      id: 'tool-1',
      name: 'test_tool',
      input: { param: 'value' }
    };

    const toolResult = await result.current.executeTool(toolUse);

    expect(toolResult).toEqual({
      tool_use_id: 'tool-1',
      content: 'Tool executed successfully',
      is_error: false
    });

    expect(mockAddItem).toHaveBeenCalledTimes(2); // Tool use + tool result
    expect(mockAddItem).toHaveBeenNthCalledWith(1, {
      type: MessageType.TOOL_USE,
      text: 'Tool: test_tool',
      toolUse: {
        name: 'test_tool',
        input: { param: 'value' },
        id: 'tool-1'
      }
    }, expect.any(Number));
  });

  it('should execute tool with mock execution disabled', async () => {
    const { result } = renderHook(() => 
      useClaudeTools(mockAddItem, false, false)
    );

    const toolUse = {
      type: 'tool_use' as const,
      id: 'tool-1',
      name: 'test_tool',
      input: { param: 'value' }
    };

    const toolResult = await result.current.executeTool(toolUse);

    expect(toolResult.tool_use_id).toBe('tool-1');
    expect(toolResult.is_error).toBe(false);
    expect(JSON.parse(toolResult.content)).toMatchObject({
      success: true,
      message: 'Executed test_tool successfully'
    });
  });

  it('should handle tool execution errors', async () => {
    const { toolRegistry } = await import('../../../../tools/index.js');
    (toolRegistry.execute as any).mockRejectedValue(new Error('Tool failed'));

    const { result } = renderHook(() => 
      useClaudeTools(mockAddItem, true, false)
    );

    const toolUse = {
      type: 'tool_use' as const,
      id: 'tool-1',
      name: 'test_tool',
      input: { param: 'value' }
    };

    const toolResult = await result.current.executeTool(toolUse);

    expect(toolResult).toEqual({
      tool_use_id: 'tool-1',
      content: 'Tool failed',
      is_error: true
    });

    expect(mockAddItem).toHaveBeenCalledWith({
      type: MessageType.TOOL_OUTPUT,
      text: 'Tool failed',
      toolResult: {
        content: 'Tool failed',
        isError: true,
        toolUseId: 'tool-1'
      }
    }, expect.any(Number));
  });

  it('should handle multiple tool uses', async () => {
    const { toolRegistry } = await import('../../../../tools/index.js');
    (toolRegistry.execute as any)
      .mockResolvedValueOnce({
        tool_use_id: 'tool-1',
        content: 'First tool result',
        is_error: false
      })
      .mockResolvedValueOnce({
        tool_use_id: 'tool-2',
        content: 'Second tool result',
        is_error: false
      });

    const { result } = renderHook(() => 
      useClaudeTools(mockAddItem, true, false)
    );

    const toolUses = [
      {
        type: 'tool_use' as const,
        id: 'tool-1',
        name: 'first_tool',
        input: { param: 'value1' }
      },
      {
        type: 'tool_use' as const,
        id: 'tool-2',
        name: 'second_tool',
        input: { param: 'value2' }
      }
    ];

    const results = await result.current.handleToolUses(toolUses);

    expect(results).toHaveLength(2);
    expect(results[0].content).toBe('First tool result');
    expect(results[1].content).toBe('Second tool result');
  });

  it('should get available tools when real execution is enabled', () => {
    const { result } = renderHook(() => 
      useClaudeTools(mockAddItem, true, false)
    );

    const tools = result.current.getAvailableTools();

    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual({
      name: 'test_tool',
      description: 'Test tool',
      input_schema: { type: 'object', properties: {} }
    });
  });

  it('should return empty tools when real execution is disabled', () => {
    const { result } = renderHook(() => 
      useClaudeTools(mockAddItem, false, false)
    );

    const tools = result.current.getAvailableTools();

    expect(tools).toEqual([]);
  });
}); 