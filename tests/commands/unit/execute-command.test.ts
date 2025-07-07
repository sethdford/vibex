/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Unit tests for executeCommand function
 */

import { jest } from 'vitest';
import { executeCommand, commandRegistry } from '../../../src/commands/index.js';
import { CommandCategory } from '../../../src/commands/types.js';
import type { UnifiedCommand, CommandContext, CommandResult } from '../../../src/commands/types.js';

// Mock dependencies
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('executeCommand', () => {
  // Mock command handlers
  const successHandler = vi.fn().mockResolvedValue({
    success: true,
    message: 'Command executed successfully',
    data: { value: 'result' }
  });
  
  const errorHandler = vi.fn().mockImplementation(() => {
    throw new Error('Command execution failed');
  });
  
  const failureHandler = vi.fn().mockResolvedValue({
    success: false,
    message: 'Command failed but did not throw',
    error: new Error('Failure error')
  });

  // Test commands
  const successCommand: UnifiedCommand = {
    id: 'success_cmd',
    name: 'success',
    description: 'Successful command',
    category: CommandCategory.SYSTEM,
    parameters: [
      {
        name: 'arg',
        description: 'Test argument',
        type: 'string',
        required: false
      }
    ],
    handler: successHandler
  };
  
  const errorCommand: UnifiedCommand = {
    id: 'error_cmd',
    name: 'error',
    description: 'Command that throws an error',
    category: CommandCategory.SYSTEM,
    parameters: [],
    handler: errorHandler
  };
  
  const failureCommand: UnifiedCommand = {
    id: 'failure_cmd',
    name: 'failure',
    description: 'Command that returns a failure result',
    category: CommandCategory.SYSTEM,
    parameters: [],
    handler: failureHandler
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear and register test commands
    commandRegistry.clear();
    commandRegistry.register(successCommand);
    commandRegistry.register(errorCommand);
    commandRegistry.register(failureCommand);
  });

  test('should execute command successfully', async () => {
    const result = await executeCommand('success', ['test-arg']);
    
    expect(successHandler).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.message).toBe('Command executed successfully');
    expect(result.data).toEqual({ value: 'result' });
    expect(result.command).toBe('success');
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('should handle command execution errors', async () => {
    const result = await executeCommand('error', []);
    
    expect(errorHandler).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Command execution failed');
    expect(result.command).toBe('error');
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('should handle command failure results', async () => {
    const result = await executeCommand('failure', []);
    
    expect(failureHandler).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.message).toBe('Command failed but did not throw');
    expect(result.error).toBeInstanceOf(Error);
    expect(result.command).toBe('failure');
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('should handle non-existent command', async () => {
    const result = await executeCommand('non_existent', []);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Command not found');
    expect(result.command).toBe('non_existent');
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  test('should pass context to command handler', async () => {
    const customContext: Partial<CommandContext> = {
      config: { key: 'value' } as any,
      terminal: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn(),
        prompt: vi.fn().mockResolvedValue('test')
      }
    };
    
    await executeCommand('success', ['arg1', '--flag'], customContext);
    
    // Check that handler was called with merged context
    const handlerContext = successHandler.mock.calls[0][0];
    expect(handlerContext.config).toBe(customContext.config);
    expect(handlerContext.terminal).toBe(customContext.terminal);
    expect(handlerContext.rawArgs).toEqual(['arg1', '--flag']);
  });

  test('should create default context if not provided', async () => {
    await executeCommand('success', []);
    
    // Check that handler was called with default context
    const handlerContext = successHandler.mock.calls[0][0];
    expect(handlerContext.config).toBeDefined();
    expect(handlerContext.terminal).toBeDefined();
    expect(handlerContext.terminal.info).toBeDefined();
    expect(handlerContext.terminal.error).toBeDefined();
    expect(handlerContext.terminal.warn).toBeDefined();
    expect(handlerContext.terminal.success).toBeDefined();
    expect(handlerContext.terminal.prompt).toBeDefined();
  });
});