/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Integration Tests for the Complete Tool System
 * 
 * These tests verify that the entire tool system works together correctly,
 * including core services, adapters, and communication between components.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeCore, getCoreInstance } from '../../../src/core/initialization';
import { toolAPI } from '../../../src/core/domain/tool/tool-api';
import { ToolConfirmationOutcome } from '../../../src/core/domain/tool/tool-interfaces';
import { InMemoryEventBus } from '../../../src/core/domain/tool/tool-events';

// Mock the tool execution
vi.mock('../../../src/core/domain/tool/execution', () => {
  return {
    createToolExecutionService: () => ({
      execute: async (tool, params, signal, feedbackCallback) => {
        // Simulate progress updates
        if (feedbackCallback) {
          feedbackCallback('Starting execution...');
          
          // Simulate a delay
          await new Promise(resolve => setTimeout(resolve, 10));
          
          feedbackCallback('50% complete', 50);
          
          // Another delay
          await new Promise(resolve => setTimeout(resolve, 10));
          
          feedbackCallback('Completed', 100);
        }
        
        // Return success or error based on params
        if (params.error) {
          return {
            success: false,
            error: new Error('Execution failed'),
            callId: 'test-call-id',
            executionTime: 20
          };
        }
        
        return {
          success: true,
          data: { message: `Executed ${tool.name} with ${JSON.stringify(params)}` },
          callId: 'test-call-id',
          executionTime: 20
        };
      },
      getExecutionStats: () => ({
        totalExecutions: 1,
        successfulExecutions: 1,
        failedExecutions: 0,
        averageExecutionTime: 20,
        byTool: {}
      }),
      clearStats: () => {}
    })
  };
});

// Mock the confirmation service to auto-confirm
vi.mock('../../../src/core/domain/tool/confirmation', () => {
  return {
    createConfirmationService: () => ({
      requestConfirmation: async () => ToolConfirmationOutcome.ProceedOnce,
      isTrusted: () => false,
      markAsTrusted: () => {}
    })
  };
});

describe('Tool System Integration', () => {
  let core;
  let eventBus;
  let eventLog = [];
  
  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    eventLog = [];
    
    // Initialize the core with test configuration
    const config = {
      git: {
        enableCheckpoints: false
      }
    };
    
    core = await initializeCore(config);
    eventBus = core.eventBus;
    
    // Set up event listeners
    eventBus.subscribe('*', (event) => {
      eventLog.push(event);
    });
  });
  
  it('should register and initialize core tools correctly', () => {
    expect(core).toBeDefined();
    expect(core.tools).toBeDefined();
    
    // Check that key tools are registered
    expect(Object.keys(core.tools)).toContain('readFileTool');
    expect(Object.keys(core.tools)).toContain('writeFileTool');
    expect(Object.keys(core.tools)).toContain('shellTool');
  });
  
  it('should execute a core tool through the tool API', async () => {
    // Execute a tool
    const result = await toolAPI.executeTool('read_file', {
      file_path: '/test/file.txt'
    });
    
    // Verify result
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.message).toContain('read_file');
    expect(result.data.message).toContain('/test/file.txt');
    
    // Verify events
    const executionEvents = eventLog.filter(e => 
      e.type === 'tool_execution_requested' || 
      e.type === 'tool_execution_started' || 
      e.type === 'tool_execution_completed'
    );
    expect(executionEvents.length).toBe(3);
  });
  
  it('should handle tool execution errors gracefully', async () => {
    // Execute a tool with error flag
    const result = await toolAPI.executeTool('read_file', {
      file_path: '/test/file.txt',
      error: true
    });
    
    // Verify error handling
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    
    // Verify events
    const failureEvent = eventLog.find(e => e.type === 'tool_execution_failed');
    expect(failureEvent).toBeDefined();
  });
  
  it('should provide progress feedback during tool execution', async () => {
    let progressUpdates = [];
    
    // Execute a tool with progress callback
    const result = await toolAPI.executeTool('read_file', {
      file_path: '/test/file.txt'
    }, {
      onProgress: (progress) => {
        progressUpdates.push(progress);
      }
    });
    
    // Verify progress updates
    expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
    expect(progressUpdates[0]).toContain('Starting');
    expect(progressUpdates[progressUpdates.length - 1]).toContain('Completed');
  });
  
  it('should maintain tool registry across multiple initializations', async () => {
    // Get another instance
    const instance = await getCoreInstance();
    
    // Should be the same instance
    expect(instance).toBe(core);
    
    // Tools should be registered
    expect(Object.keys(instance.tools)).toContain('readFileTool');
  });
  
  it('should integrate all services correctly', async () => {
    // Get services from core
    const { eventBus, services, tools } = core;
    
    // Services should be registered
    expect(services.mcpService).toBeDefined();
    
    // Event bus should be working
    eventBus.publish({ type: 'test_event', data: 'test' });
    expect(eventLog).toContainEqual(expect.objectContaining({ 
      type: 'test_event', 
      data: 'test' 
    }));
  });
});