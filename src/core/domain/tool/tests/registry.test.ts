/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistryServiceImpl } from '../registry';
import { BaseTool } from '../tool-interfaces';

class TestTool extends BaseTool {
  async execute(params: unknown): Promise<any> {
    return {
      callId: 'test',
      success: true,
      data: params
    };
  }
}

describe('ToolRegistryService', () => {
  let registry: ToolRegistryServiceImpl;
  let testTool: TestTool;

  beforeEach(() => {
    registry = new ToolRegistryServiceImpl();
    testTool = new TestTool('test_tool', 'Test tool', { type: 'object' });
  });

  it('should register a tool in the default namespace', () => {
    registry.registerTool(testTool);
    
    const retrievedTool = registry.getTool('test_tool');
    expect(retrievedTool).toBe(testTool);
  });

  it('should register a tool in a custom namespace', () => {
    registry.registerTool(testTool, 'custom');
    
    const retrievedTool = registry.getTool('test_tool', 'custom');
    expect(retrievedTool).toBe(testTool);
  });

  it('should return undefined for non-existent tools', () => {
    const nonExistentTool = registry.getTool('non_existent_tool');
    expect(nonExistentTool).toBeUndefined();
  });

  it('should list all tools', () => {
    const testTool2 = new TestTool('test_tool2', 'Test tool 2', { type: 'object' });
    
    registry.registerTool(testTool);
    registry.registerTool(testTool2);
    
    const allTools = registry.getAllTools();
    expect(allTools).toHaveLength(2);
    expect(allTools).toContain(testTool);
    expect(allTools).toContain(testTool2);
  });

  it('should list tools by namespace', () => {
    const customTool = new TestTool('custom_tool', 'Custom tool', { type: 'object' });
    
    registry.registerTool(testTool);
    registry.registerTool(customTool, 'custom');
    
    const defaultTools = registry.getToolsByNamespace('default');
    const customTools = registry.getToolsByNamespace('custom');
    
    expect(defaultTools).toHaveLength(1);
    expect(defaultTools[0]).toBe(testTool);
    
    expect(customTools).toHaveLength(1);
    expect(customTools[0]).toBe(customTool);
  });

  it('should list all namespaces', () => {
    registry.registerTool(testTool);
    registry.registerTool(new TestTool('custom_tool', 'Custom tool', { type: 'object' }), 'custom');
    registry.registerTool(new TestTool('system_tool', 'System tool', { type: 'object' }), 'system');
    
    const namespaces = registry.getNamespaces();
    expect(namespaces).toHaveLength(3);
    expect(namespaces).toContain('default');
    expect(namespaces).toContain('custom');
    expect(namespaces).toContain('system');
  });

  it('should handle tools with MCP-style names (namespace__name)', () => {
    registry.registerTool(testTool, 'mcp');
    
    // Should be able to retrieve by full name
    const toolByFullName = registry.getTool('mcp__test_tool');
    expect(toolByFullName).toBe(testTool);
    
    // Should also be able to retrieve by name and namespace
    const toolByNamespace = registry.getTool('test_tool', 'mcp');
    expect(toolByNamespace).toBe(testTool);
  });
});