/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { useToolProgress } from '../useToolProgress';
import { ToolCall } from '../../../core/domain/tool/tool-interfaces';

describe('useToolProgress', () => {
  it('should initialize with empty maps', () => {
    const { result } = renderHook(() => useToolProgress());
    
    expect(result.current.progressItems.size).toBe(0);
    expect(result.current.toolCalls.size).toBe(0);
  });
  
  it('should register a tool call correctly', () => {
    const { result } = renderHook(() => useToolProgress());
    
    const mockToolCall = {
      request: {
        callId: 'test-call-id',
        name: 'test-tool'
      },
      status: 'executing'
    } as unknown as ToolCall;
    
    act(() => {
      result.current.registerToolCall(mockToolCall);
    });
    
    // Check that tool call is registered
    expect(result.current.toolCalls.size).toBe(1);
    expect(result.current.toolCalls.get('test-call-id')).toBe(mockToolCall);
    
    // Check that progress item is created
    expect(result.current.progressItems.size).toBe(1);
    expect(result.current.progressItems.get('test-call-id')).toBeDefined();
    expect(result.current.progressItems.get('test-call-id')?.status).toBe('executing');
  });
  
  it('should update progress for a tool call', () => {
    const { result } = renderHook(() => useToolProgress());
    
    const mockToolCall = {
      request: {
        callId: 'test-call-id',
        name: 'test-tool'
      },
      status: 'executing'
    } as unknown as ToolCall;
    
    act(() => {
      result.current.registerToolCall(mockToolCall);
    });
    
    // Update progress
    act(() => {
      result.current.updateProgress('test-call-id', {
        percentage: 50,
        message: 'Half done!'
      });
    });
    
    // Check that progress is updated
    expect(result.current.progressItems.get('test-call-id')?.percentage).toBe(50);
    expect(result.current.progressItems.get('test-call-id')?.message).toBe('Half done!');
    expect(result.current.progressItems.get('test-call-id')?.status).toBe('executing');
  });
  
  it('should update a tool call status', () => {
    const { result } = renderHook(() => useToolProgress());
    
    // Register initial tool call
    const mockToolCall = {
      request: {
        callId: 'test-call-id',
        name: 'test-tool'
      },
      status: 'executing'
    } as unknown as ToolCall;
    
    act(() => {
      result.current.registerToolCall(mockToolCall);
    });
    
    // Update tool call
    const updatedToolCall = {
      ...mockToolCall,
      status: 'completed'
    } as unknown as ToolCall;
    
    act(() => {
      result.current.updateToolCall(updatedToolCall);
    });
    
    // Check that tool call is updated
    expect(result.current.toolCalls.get('test-call-id')).toBe(updatedToolCall);
    expect(result.current.progressItems.get('test-call-id')?.status).toBe('completed');
  });
  
  it('should clear progress for a tool call', () => {
    const { result } = renderHook(() => useToolProgress());
    
    const mockToolCall = {
      request: {
        callId: 'test-call-id',
        name: 'test-tool'
      },
      status: 'executing'
    } as unknown as ToolCall;
    
    act(() => {
      result.current.registerToolCall(mockToolCall);
    });
    
    // Clear progress
    act(() => {
      result.current.clearProgress('test-call-id');
    });
    
    // Check that progress is cleared
    expect(result.current.toolCalls.size).toBe(0);
    expect(result.current.progressItems.size).toBe(0);
  });
  
  it('should clear all progress data', () => {
    const { result } = renderHook(() => useToolProgress());
    
    // Register multiple tool calls
    const mockToolCall1 = {
      request: {
        callId: 'call-id-1',
        name: 'tool-1'
      },
      status: 'executing'
    } as unknown as ToolCall;
    
    const mockToolCall2 = {
      request: {
        callId: 'call-id-2',
        name: 'tool-2'
      },
      status: 'validating'
    } as unknown as ToolCall;
    
    act(() => {
      result.current.registerToolCall(mockToolCall1);
      result.current.registerToolCall(mockToolCall2);
    });
    
    // Verify both are registered
    expect(result.current.toolCalls.size).toBe(2);
    expect(result.current.progressItems.size).toBe(2);
    
    // Clear all progress
    act(() => {
      result.current.clearAllProgress();
    });
    
    // Check that all progress is cleared
    expect(result.current.toolCalls.size).toBe(0);
    expect(result.current.progressItems.size).toBe(0);
  });
  
  it('should handle the registration callback correctly', () => {
    const { result } = renderHook(() => useToolProgress());
    
    const mockToolCall = {
      request: {
        callId: 'test-call-id',
        name: 'test-tool'
      },
      status: 'executing'
    } as unknown as ToolCall;
    
    let updateCallback: (data: any) => void;
    
    act(() => {
      updateCallback = result.current.registerToolCall(mockToolCall);
    });
    
    // Use the callback
    act(() => {
      updateCallback({ percentage: 75, message: 'Almost done!' });
    });
    
    // Check that progress is updated
    expect(result.current.progressItems.get('test-call-id')?.percentage).toBe(75);
    expect(result.current.progressItems.get('test-call-id')?.message).toBe('Almost done!');
  });
});