/**
 * Integration tests for the command execution flow
 */

import { jest } from '@jest/globals';
import {
  commandRegistry,
  executeCommand
} from '../../../src/commands/index.js';
import { CommandCategory } from '../../../src/commands/types.js';
import type { UnifiedCommand, CommandContext } from '../../../src/commands/types.js';

// Mock dependencies
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Command Execution Flow Integration', () => {
  // Test state to verify command interactions
  const testState = {
    lastValue: null as any,
    callCount: 0,
    commands: [] as string[]
  };
  
  // Reset state before each test
  beforeEach(() => {
    jest.clearAllMocks();
    testState.lastValue = null;
    testState.callCount = 0;
    testState.commands = [];
    
    // Clear registry
    commandRegistry.clear();
    
    // Register test commands
    setupTestCommands();
  });
  
  /**
   * Setup a suite of interconnected test commands
   */
  function setupTestCommands() {
    // Command that stores a value in state
    commandRegistry.register({
      id: 'store',
      name: 'store',
      description: 'Store a value',
      category: CommandCategory.SYSTEM,
      parameters: [
        {
          name: 'value',
          description: 'Value to store',
          type: 'string',
          required: true
        }
      ],
      handler: async (context: CommandContext) => {
        const value = context.args.value;
        testState.lastValue = value;
        testState.callCount++;
        testState.commands.push('store');
        return {
          success: true,
          message: `Stored value: ${value}`,
          data: { value }
        };
      }
    });
    
    // Command that retrieves stored value
    commandRegistry.register({
      id: 'retrieve',
      name: 'retrieve',
      description: 'Retrieve the stored value',
      category: CommandCategory.SYSTEM,
      parameters: [],
      handler: async () => {
        testState.callCount++;
        testState.commands.push('retrieve');
        return {
          success: true,
          message: `Retrieved value: ${testState.lastValue}`,
          data: { value: testState.lastValue }
        };
      }
    });
    
    // Command that calls another command
    commandRegistry.register({
      id: 'chain',
      name: 'chain',
      description: 'Chain multiple commands',
      category: CommandCategory.SYSTEM,
      parameters: [
        {
          name: 'command',
          description: 'Command to execute',
          type: 'string',
          required: true
        }
      ],
      handler: async (context: CommandContext) => {
        testState.callCount++;
        testState.commands.push('chain');
        
        const commandToRun = context.args.command as string;
        
        // Execute the requested command
        const result = await executeCommand(commandToRun, []);
        
        return {
          success: result.success,
          message: `Chained command result: ${result.message}`,
          data: { originalResult: result.data }
        };
      }
    });
    
    // Command that conditionally calls another command
    commandRegistry.register({
      id: 'conditional',
      name: 'conditional',
      description: 'Conditionally execute a command',
      category: CommandCategory.SYSTEM,
      parameters: [
        {
          name: 'condition',
          description: 'Condition to check',
          type: 'string',
          required: true
        }
      ],
      handler: async (context: CommandContext) => {
        testState.callCount++;
        testState.commands.push('conditional');
        
        const condition = context.args.condition as string;
        
        if (condition === 'true') {
          // Execute retrieve command
          const result = await executeCommand('retrieve', []);
          return {
            success: true,
            message: `Condition was true, executed retrieve: ${result.message}`,
            data: { retrievedValue: result.data }
          };
        } else {
          return {
            success: true,
            message: 'Condition was false, did not execute command',
            data: { condition }
          };
        }
      }
    });
    
    // Command that fails
    commandRegistry.register({
      id: 'fail',
      name: 'fail',
      description: 'Always fails',
      category: CommandCategory.SYSTEM,
      parameters: [],
      handler: async () => {
        testState.callCount++;
        testState.commands.push('fail');
        throw new Error('Command failed intentionally');
      }
    });
  }
  
  describe('Command Chaining', () => {
    test('should execute commands in sequence', async () => {
      // First store a value
      const storeResult = await executeCommand('store', ['test-value']);
      expect(storeResult.success).toBe(true);
      expect(testState.lastValue).toBe('test-value');
      
      // Then retrieve it
      const retrieveResult = await executeCommand('retrieve', []);
      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data).toEqual({ value: 'test-value' });
      
      // Check execution order
      expect(testState.commands).toEqual(['store', 'retrieve']);
      expect(testState.callCount).toBe(2);
    });
    
    test('should chain commands together', async () => {
      // Store a value first
      await executeCommand('store', ['chained-value']);
      
      // Then chain to retrieve command
      const chainResult = await executeCommand('chain', ['retrieve']);
      
      expect(chainResult.success).toBe(true);
      expect(chainResult.message).toContain('Chained command result');
      expect(chainResult.data.originalResult).toEqual({ value: 'chained-value' });
      
      // Check execution order
      expect(testState.commands).toEqual(['store', 'chain', 'retrieve']);
      expect(testState.callCount).toBe(3);
    });
    
    test('should handle conditional command execution', async () => {
      // Store a value first
      await executeCommand('store', ['conditional-value']);
      
      // Run conditional with true condition
      const trueResult = await executeCommand('conditional', ['true']);
      
      expect(trueResult.success).toBe(true);
      expect(trueResult.message).toContain('Condition was true');
      expect(trueResult.data.retrievedValue).toEqual({ value: 'conditional-value' });
      
      // Check first execution order
      expect(testState.commands).toEqual(['store', 'conditional', 'retrieve']);
      expect(testState.callCount).toBe(3);
      
      // Reset for next test
      testState.commands = [];
      testState.callCount = 0;
      
      // Run conditional with false condition
      const falseResult = await executeCommand('conditional', ['false']);
      
      expect(falseResult.success).toBe(true);
      expect(falseResult.message).toContain('Condition was false');
      
      // Check that retrieve was not called this time
      expect(testState.commands).toEqual(['conditional']);
      expect(testState.callCount).toBe(1);
    });
  });
  
  describe('Error Handling in Command Chains', () => {
    test('should handle errors in command chains', async () => {
      // Chain to a failing command
      const chainResult = await executeCommand('chain', ['fail']);
      
      expect(chainResult.success).toBe(false);
      expect(chainResult.message).toContain('Chained command result');
      
      // Check execution order
      expect(testState.commands).toEqual(['chain', 'fail']);
      expect(testState.callCount).toBe(2);
    });
    
    test('should handle errors in nested command chains', async () => {
      // Register a command that chains to another command that fails
      commandRegistry.register({
        id: 'nested_chain',
        name: 'nested_chain',
        description: 'Nested chain command',
        category: CommandCategory.SYSTEM,
        parameters: [],
        handler: async () => {
          testState.callCount++;
          testState.commands.push('nested_chain');
          
          // Chain to the chain command that will call fail
          const result = await executeCommand('chain', ['fail']);
          
          return {
            success: result.success,
            message: `Nested chain result: ${result.message}`,
            data: { nestedResult: result.data }
          };
        }
      });
      
      // Execute the nested chain
      const nestedResult = await executeCommand('nested_chain', []);
      
      expect(nestedResult.success).toBe(false);
      expect(nestedResult.message).toContain('Nested chain result');
      
      // Check execution order through all three levels
      expect(testState.commands).toEqual(['nested_chain', 'chain', 'fail']);
      expect(testState.callCount).toBe(3);
    });
  });
  
  describe('Context Preservation', () => {
    test('should preserve and merge context between commands', async () => {
      // Create a test terminal with spy functions
      const terminal = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        success: jest.fn(),
        prompt: jest.fn().mockResolvedValue('test')
      };
      
      // Register a command that checks context
      commandRegistry.register({
        id: 'context_check',
        name: 'context_check',
        description: 'Check command context',
        category: CommandCategory.SYSTEM,
        parameters: [],
        handler: async (context: CommandContext) => {
          // Use the terminal from context
          context.terminal.info('Testing context preservation');
          testState.lastValue = 'context_accessed';
          
          return {
            success: true,
            message: 'Context checked',
            data: { contextProvided: !!context.terminal }
          };
        }
      });
      
      // Execute with custom context
      const customContext: Partial<CommandContext> = {
        terminal,
        config: { test: true } as any
      };
      
      await executeCommand('context_check', [], customContext);
      
      // Check that terminal was called
      expect(terminal.info).toHaveBeenCalledWith('Testing context preservation');
      expect(testState.lastValue).toBe('context_accessed');
      
      // Now chain command with same context
      commandRegistry.register({
        id: 'context_chain',
        name: 'context_chain',
        description: 'Chain with context',
        category: CommandCategory.SYSTEM,
        parameters: [],
        handler: async (context: CommandContext) => {
          // Should have same terminal
          context.terminal.info('In chained command');
          
          // Execute another command, passing context
          const result = await executeCommand('context_check', [], { terminal: context.terminal });
          
          return {
            success: true,
            message: 'Chained with context',
            data: { chainedResult: result.data }
          };
        }
      });
      
      await executeCommand('context_chain', [], customContext);
      
      // Check that terminal was called from both commands
      expect(terminal.info).toHaveBeenCalledWith('In chained command');
      expect(terminal.info).toHaveBeenCalledWith('Testing context preservation');
      
      // Terminal should have been called twice
      expect(terminal.info).toHaveBeenCalledTimes(2);
    });
  });
});