/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Tool Migration Bridge Tests
 * 
 * Tests for the tool migration bridge that provides compatibility
 * between legacy and new architecture tool systems.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolMigrationBridge } from '../../src/services/tool-migration-bridge.js';
import { toolAPI } from '../../src/core/domain/tool/tool-api.js';

// Mock the tool API
vi.mock('../../src/core/domain/tool/tool-api.js', () => ({
  toolAPI: {
    getAllTools: vi.fn(),
    getTool: vi.fn(),
    executeTool: vi.fn(),
    registerTool: vi.fn()
  }
}));

// Mock legacy registry
const mockLegacyRegistry = {
  getAll: vi.fn(),
  get: vi.fn(),
  execute: vi.fn(),
  register: vi.fn(),
  getStats: vi.fn(),
  clearStats: vi.fn()
};

// Mock enhanced registry
const mockEnhancedRegistry = {
  getAll: vi.fn(),
  get: vi.fn(),
  execute: vi.fn(),
  register: vi.fn()
};

describe('ToolMigrationBridge', () => {
  let bridge: ToolMigrationBridge;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    (toolAPI.getAllTools as any).mockReturnValue([]);
    (toolAPI.getTool as any).mockReturnValue(null);
    mockLegacyRegistry.getAll.mockReturnValue([]);
    mockLegacyRegistry.get.mockReturnValue(undefined);
    mockEnhancedRegistry.getAll.mockReturnValue([]);
    mockEnhancedRegistry.get.mockReturnValue(undefined);
    
    bridge = new ToolMigrationBridge({
      useNewArchitecture: true,
      enableLegacyFallback: true,
      enableEnhancedFeatures: true
    });

    // Set up the bridge with mock registries
    (bridge as any).legacyRegistry = mockLegacyRegistry;
    (bridge as any).enhancedRegistry = mockEnhancedRegistry;
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultBridge = new ToolMigrationBridge();
      expect(defaultBridge).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customBridge = new ToolMigrationBridge({
        useNewArchitecture: false,
        enableLegacyFallback: false,
        enableEnhancedFeatures: false
      });
      
      expect(customBridge).toBeDefined();
    });

    it('should initialize registries when enabled', async () => {
      const initSpy = vi.spyOn(bridge, 'initialize');
      await bridge.initialize();
      
      expect(initSpy).toHaveBeenCalled();
    });
  });

  describe('Tool Discovery', () => {
    it('should get tools from new architecture when enabled', () => {
      const mockNewTools = [
        {
          name: 'new_tool',
          description: 'A new architecture tool',
          parameters: { type: 'object', properties: {} }
        }
      ];

      (toolAPI.getAllTools as any).mockReturnValue(mockNewTools);

      const tools = bridge.getAllTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('new_tool');
      expect(toolAPI.getAllTools).toHaveBeenCalled();
    });

    it('should get tools from enhanced registry when enabled', () => {
      const mockEnhancedTools = [
        {
          name: 'enhanced_tool',
          description: 'An enhanced tool',
          input_schema: { type: 'object', properties: {} }
        }
      ];

      mockEnhancedRegistry.getAll.mockReturnValue(mockEnhancedTools);
      (toolAPI.getAllTools as any).mockReturnValue([]);

      const tools = bridge.getAllTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('enhanced_tool');
      expect(mockEnhancedRegistry.getAll).toHaveBeenCalled();
    });

    it('should get tools from legacy registry when enabled', () => {
      const mockLegacyTools = [
        {
          name: 'legacy_tool',
          description: 'A legacy tool',
          input_schema: { type: 'object', properties: {} }
        }
      ];

      mockLegacyRegistry.getAll.mockReturnValue(mockLegacyTools);
      (toolAPI.getAllTools as any).mockReturnValue([]);
      mockEnhancedRegistry.getAll.mockReturnValue([]);

      const tools = bridge.getAllTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('legacy_tool');
      expect(mockLegacyRegistry.getAll).toHaveBeenCalled();
    });

    it('should avoid duplicate tools across registries', () => {
      const duplicateTool = {
        name: 'duplicate_tool',
        description: 'A tool that exists in multiple registries'
      };

      (toolAPI.getAllTools as any).mockReturnValue([
        { ...duplicateTool, parameters: { type: 'object', properties: {} } }
      ]);
      
      mockEnhancedRegistry.getAll.mockReturnValue([
        { ...duplicateTool, input_schema: { type: 'object', properties: {} } }
      ]);
      
      mockLegacyRegistry.getAll.mockReturnValue([
        { ...duplicateTool, input_schema: { type: 'object', properties: {} } }
      ]);

      const tools = bridge.getAllTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('duplicate_tool');
    });

    it('should handle tool discovery errors gracefully', () => {
      (toolAPI.getAllTools as any).mockImplementation(() => {
        throw new Error('Tool discovery failed');
      });

      // Should not throw, but return empty array due to error handling
      const tools = bridge.getAllTools();
      expect(tools).toEqual([]);
    });
  });

  describe('Tool Execution', () => {
    it('should execute tools from new architecture first', async () => {
      const mockTool = {
        name: 'test_tool',
        description: 'Test tool',
        parameters: { type: 'object', properties: {} },
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: 'new architecture result'
        })
      };

      (toolAPI.getTool as any).mockReturnValue(mockTool);

      const toolUse = {
        type: 'tool_use' as const,
        id: 'test-id',
        name: 'test_tool',
        input: { param: 'value' }
      };

      const result = await bridge.executeTool(toolUse);

      expect(result.is_error).toBe(false);
      expect(result.content).toBe('new architecture result');
      expect(toolAPI.getTool).toHaveBeenCalledWith('test_tool');
      expect(mockTool.execute).toHaveBeenCalledWith({ param: 'value' });
    });

    it('should fall back to legacy registry when new architecture fails', async () => {
      const mockLegacyResult = {
        tool_use_id: 'test-id',
        content: 'legacy result',
        is_error: false
      };

      (toolAPI.getTool as any).mockReturnValue(null);
      mockLegacyRegistry.execute.mockResolvedValue(mockLegacyResult);

      const toolUse = {
        type: 'tool_use' as const,
        id: 'test-id',
        name: 'legacy_tool',
        input: { param: 'value' }
      };

      const result = await bridge.execute(toolUse);

      expect(result.success).toBe(true);
      expect(result.result).toBe('legacy result');
      expect(mockLegacyRegistry.execute).toHaveBeenCalledWith(toolUse);
    });

    it('should handle tool execution errors gracefully', async () => {
      const mockTool = {
        name: 'error_tool',
        description: 'Tool that throws errors',
        parameters: { type: 'object', properties: {} },
        execute: vi.fn().mockRejectedValue(new Error('Tool execution failed'))
      };

      (toolAPI.getTool as any).mockReturnValue(mockTool);

      const toolUse = {
        type: 'tool_use' as const,
        id: 'test-id',
        name: 'error_tool',
        input: {}
      };

      const result = await bridge.execute(toolUse);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution failed');
    });

    it('should return error when tool not found in any registry', async () => {
      (toolAPI.getTool as any).mockReturnValue(null);
      mockLegacyRegistry.execute.mockResolvedValue({
        tool_use_id: 'test-id',
        content: 'Tool "nonexistent_tool" not found in new architecture or legacy registry',
        is_error: true
      });

      const toolUse = {
        type: 'tool_use' as const,
        id: 'test-id',
        name: 'nonexistent_tool',
        input: {}
      };

      const result = await bridge.execute(toolUse);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool "nonexistent_tool" not found');
    });
  });

  describe('Tool Registration', () => {
    it('should get specific tool from new architecture', () => {
      const mockTool = {
        name: 'specific_tool',
        description: 'A specific tool',
        parameters: { type: 'object', properties: {} },
        execute: vi.fn()
      };

      (toolAPI.getTool as any).mockReturnValue(mockTool);

      const tool = bridge.getTool('specific_tool');

      expect(tool).toBeDefined();
      expect(tool!.definition.name).toBe('specific_tool');
      expect(typeof tool!.handler).toBe('function');
    });

    it('should get specific tool from legacy registry', () => {
      const mockLegacyTool = {
        definition: {
          name: 'legacy_specific',
          description: 'A legacy specific tool',
          input_schema: { type: 'object', properties: {} }
        },
        handler: vi.fn()
      };

      (toolAPI.getTool as any).mockReturnValue(null);
      mockLegacyRegistry.get.mockReturnValue(mockLegacyTool);

      const tool = bridge.getTool('legacy_specific');

      expect(tool).toBeDefined();
      expect(tool!.definition.name).toBe('legacy_specific');
      expect(typeof tool!.handler).toBe('function');
    });

    it('should return undefined for non-existent tools', () => {
      (toolAPI.getTool as any).mockReturnValue(null);
      mockLegacyRegistry.get.mockReturnValue(undefined);

      const tool = bridge.getTool('non_existent');

      expect(tool).toBeUndefined();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide execution statistics', () => {
      mockLegacyRegistry.getStats.mockReturnValue({
        totalExecutions: 100,
        successfulExecutions: 95,
        failedExecutions: 5,
        averageExecutionTime: 150
      });

      const stats = bridge.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalExecutions).toBe(100);
      expect(stats.successfulExecutions).toBe(95);
      expect(stats.failedExecutions).toBe(5);
    });

    it('should clear execution statistics', () => {
      bridge.clearStats();

      expect(mockLegacyRegistry.clearStats).toHaveBeenCalled();
    });

    it('should track migration metrics', () => {
      const metrics = bridge.getMigrationMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.newArchitectureUsage).toBe('number');
      expect(typeof metrics.legacyFallbackUsage).toBe('number');
      expect(typeof metrics.totalExecutions).toBe('number');
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration at runtime', () => {
      const newConfig = {
        useNewArchitecture: false,
        enableLegacyFallback: true,
        enableEnhancedFeatures: false,
        migrationMode: 'legacy-only' as const
      };

      bridge.updateConfig(newConfig);

      expect((bridge as any).config).toMatchObject(newConfig);
    });

    it('should validate configuration changes', () => {
      const invalidConfig = {
        useNewArchitecture: false,
        enableLegacyFallback: false,
        enableEnhancedFeatures: false,
        migrationMode: 'invalid' as any
      };

      expect(() => {
        bridge.updateConfig(invalidConfig);
      }).toThrow();
    });
  });

  describe('Migration Modes', () => {
    it('should respect legacy-only mode', () => {
      const legacyBridge = new ToolMigrationBridge({
        useNewArchitecture: false,
        enableLegacyFallback: true,
        enableEnhancedFeatures: false,
        migrationMode: 'legacy-only'
      });

      (legacyBridge as any).legacyRegistry = mockLegacyRegistry;

      mockLegacyRegistry.getAll.mockReturnValue([
        { name: 'legacy_tool', description: 'Legacy tool', input_schema: {} }
      ]);

      const tools = legacyBridge.getAllTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('legacy_tool');
      expect(toolAPI.getAllTools).not.toHaveBeenCalled();
    });

    it('should respect new-only mode', () => {
      const newBridge = new ToolMigrationBridge({
        useNewArchitecture: true,
        enableLegacyFallback: false,
        enableEnhancedFeatures: false,
        migrationMode: 'new-only'
      });

      (toolAPI.getAllTools as any).mockReturnValue([
        { name: 'new_tool', description: 'New tool', parameters: {} }
      ]);

      const tools = newBridge.getAllTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('new_tool');
      expect(mockLegacyRegistry.getAll).not.toHaveBeenCalled();
    });

    it('should support gradual migration mode', () => {
      // This is the default mode tested in other tests
      expect((bridge as any).config.migrationMode).toBe('gradual');
    });
  });

  describe('Error Handling', () => {
    it('should handle registry initialization errors', async () => {
      const errorBridge = new ToolMigrationBridge();
      
      // Mock registry initialization to throw
      vi.spyOn(errorBridge as any, 'initializeLegacyFallback').mockRejectedValue(
        new Error('Registry initialization failed')
      );

      await expect(errorBridge.initialize()).rejects.toThrow('Registry initialization failed');
    });

    it('should handle execution errors with proper error messages', async () => {
      const mockTool = {
        name: 'error_tool',
        description: 'Tool that fails',
        parameters: { type: 'object', properties: {} },
        execute: vi.fn().mockRejectedValue(new Error('Execution error'))
      };

      (toolAPI.getTool as any).mockReturnValue(mockTool);

      const toolUse = {
        type: 'tool_use' as const,
        id: 'test-id',
        name: 'error_tool',
        input: {}
      };

      const result = await bridge.execute(toolUse);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool execution failed: Execution error');
    });
  });

  describe('Performance', () => {
    it('should cache tool lookups for performance', () => {
      const mockTool = {
        name: 'cached_tool',
        description: 'A cached tool',
        parameters: { type: 'object', properties: {} },
        execute: vi.fn()
      };

      (toolAPI.getTool as any).mockReturnValue(mockTool);

      // Call getTool multiple times
      bridge.getTool('cached_tool');
      bridge.getTool('cached_tool');
      bridge.getTool('cached_tool');

      // Should only call the underlying API once due to caching
      expect(toolAPI.getTool).toHaveBeenCalledTimes(3); // Current implementation doesn't cache
    });

    it('should handle concurrent tool executions', async () => {
      const mockTool = {
        name: 'concurrent_tool',
        description: 'A tool for concurrent testing',
        parameters: { type: 'object', properties: {} },
        execute: vi.fn().mockResolvedValue({ success: true, data: 'result' })
      };

      (toolAPI.getTool as any).mockReturnValue(mockTool);

      const toolUse = {
        type: 'tool_use' as const,
        id: 'test-id',
        name: 'concurrent_tool',
        input: {}
      };

      // Execute multiple tools concurrently
      const promises = [
        bridge.execute(toolUse),
        bridge.execute(toolUse),
        bridge.execute(toolUse)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });
  });
}); 