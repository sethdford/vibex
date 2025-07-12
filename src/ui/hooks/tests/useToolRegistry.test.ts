/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useToolRegistry, setGlobalToolOrchestrationService } from '../useToolRegistry';
import { BaseTool } from '../../../core/domain/tool/tool-interfaces';
import { ToolOrchestrationService } from '../../../core/domain/tool/tool-services';

// Mock tool class for testing
class MockTool extends BaseTool {
  async execute() {
    return { success: true, data: 'mock result' };
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      namespace: this.metadata.namespace,
      tags: this.metadata.tags || [],
      version: '1.0.0'
    };
  }
}

// Mock orchestration service
const createMockOrchestrationService = (): ToolOrchestrationService => {
  const tools = [
    new MockTool('tool1', 'Test tool 1', {}, { namespace: 'test', tags: ['file'] }),
    new MockTool('tool2', 'Test tool 2', {}, { namespace: 'test', tags: ['network'] }),
    new MockTool('tool3', 'Test tool 3', {}, { namespace: 'other', tags: ['system'] }),
  ];
  
  return {
    executeTools: jest.fn().mockResolvedValue(undefined),
    registerTools: jest.fn(),
    getTool: jest.fn().mockImplementation((name, namespace) => {
      return tools.find(t => t.name === name && (!namespace || t.getMetadata().namespace === namespace));
    }),
    getAllTools: jest.fn().mockReturnValue(tools),
    configure: jest.fn(),
  };
};

describe('useToolRegistry hook', () => {
  // Reset global service before each test
  beforeEach(() => {
    setGlobalToolOrchestrationService(null as any);
  });
  
  it('returns empty array when no service is available', async () => {
    const { result } = renderHook(() => useToolRegistry());
    
    // Wait for effect to run
    await act(async () => {
      // Just waiting
    });
    
    expect(result.current.tools).toEqual([]);
    expect(result.current.error).toBeTruthy();
    expect(result.current.isLoading).toBe(false);
  });
  
  it('loads tools from orchestration service', async () => {
    const mockService = createMockOrchestrationService();
    
    const { result } = renderHook(() => useToolRegistry({ 
      orchestrationService: mockService 
    }));
    
    // Wait for effect to run
    await act(async () => {
      // Just waiting
    });
    
    expect(result.current.tools.length).toBe(3);
    expect(result.current.error).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(mockService.getAllTools).toHaveBeenCalled();
  });
  
  it('groups tools by namespace', async () => {
    const mockService = createMockOrchestrationService();
    
    const { result } = renderHook(() => useToolRegistry({ 
      orchestrationService: mockService 
    }));
    
    // Wait for effect to run
    await act(async () => {
      // Just waiting
    });
    
    const groups = result.current.getToolGroups();
    expect(groups.length).toBe(2); // 'test' and 'other' namespaces
    expect(groups.find(g => g.name === 'test')?.tools.length).toBe(2);
    expect(groups.find(g => g.name === 'other')?.tools.length).toBe(1);
  });
  
  it('groups tools by tags', async () => {
    const mockService = createMockOrchestrationService();
    
    const { result } = renderHook(() => useToolRegistry({ 
      orchestrationService: mockService 
    }));
    
    // Wait for effect to run
    await act(async () => {
      // Just waiting
    });
    
    const groups = result.current.getToolGroupsByTag();
    expect(groups.length).toBe(3); // 'file', 'network', and 'system' tags
    expect(groups.find(g => g.name === 'file')?.tools.length).toBe(1);
    expect(groups.find(g => g.name === 'network')?.tools.length).toBe(1);
    expect(groups.find(g => g.name === 'system')?.tools.length).toBe(1);
  });
  
  it('gets a specific tool by name and namespace', async () => {
    const mockService = createMockOrchestrationService();
    
    const { result } = renderHook(() => useToolRegistry({ 
      orchestrationService: mockService 
    }));
    
    // Wait for effect to run
    await act(async () => {
      // Just waiting
    });
    
    const tool = result.current.getTool('tool1', 'test');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('tool1');
    expect(tool?.getMetadata().namespace).toBe('test');
  });
  
  it('executes a tool request', async () => {
    const mockService = createMockOrchestrationService();
    
    const { result } = renderHook(() => useToolRegistry({ 
      orchestrationService: mockService 
    }));
    
    // Wait for effect to run
    await act(async () => {
      // Just waiting
    });
    
    await act(async () => {
      await result.current.executeTool({
        callId: '123',
        name: 'tool1',
        namespace: 'test',
        params: {}
      });
    });
    
    expect(mockService.executeTools).toHaveBeenCalled();
  });
  
  it('uses global service when provided', async () => {
    const mockService = createMockOrchestrationService();
    setGlobalToolOrchestrationService(mockService);
    
    const { result } = renderHook(() => useToolRegistry());
    
    // Wait for effect to run
    await act(async () => {
      // Just waiting
    });
    
    expect(result.current.tools.length).toBe(3);
    expect(mockService.getAllTools).toHaveBeenCalled();
  });
});