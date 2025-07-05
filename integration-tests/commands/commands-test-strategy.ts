/**
 * Commands Module Testing Strategy
 * 
 * Comprehensive testing approach to validate commands module functionality
 * during refactoring phases. Ensures no regressions and validates improvements.
 */

import { commandRegistry } from '../../src/commands/index.js';
import type { UnifiedCommand, CommandContext, CommandResult } from '../../src/commands/types.js';
import { CommandCategory } from '../../src/commands/types.js';
import { logger } from '../../src/utils/logger.js';

/**
 * Test Context Builder - Creates mock CommandContext for testing
 */
export function createTestContext(overrides: Partial<CommandContext> = {}): CommandContext {
  const mockTerminal = {
    info: (msg: string) => console.log(`[INFO] ${msg}`),
    success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
    warn: (msg: string) => console.warn(`[WARN] ${msg}`),
    error: (msg: string) => console.error(`[ERROR] ${msg}`),
    prompt: async (msg: string) => {
      console.log(`[PROMPT] ${msg}`);
      return 'test-input';
    }
  };

  return {
    config: {} as any,
    terminal: mockTerminal,
    args: {},
    rawArgs: [],
    flags: {},
    options: {},
    ...overrides
  };
}

/**
 * Command Registration Tests
 */
export async function testCommandRegistration(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // Test 1: Registry should be empty initially
    const initialCount = commandRegistry.size();
    console.log(`Initial command count: ${initialCount}`);
    
    // Test 2: Register a test command
    const testCommand: UnifiedCommand = {
      id: 'test-cmd',
      name: 'test',
      description: 'Test command for validation',
      category: CommandCategory.SYSTEM,
      parameters: [
        {
          name: 'message',
          description: 'Test message',
          type: 'string',
          required: false
        }
      ],
      async handler(context: CommandContext): Promise<CommandResult> {
        const message = context.args.message as string || 'Hello Test!';
        context.terminal.info(`Test command executed: ${message}`);
        return { success: true, message: 'Test command completed' };
      },
      examples: ['/test', '/test --message "Hello World"']
    };
    
    commandRegistry.register(testCommand);
    
    // Test 3: Verify command was registered
    const registeredCommand = commandRegistry.get('test');
    if (!registeredCommand) {
      errors.push('Failed to register test command');
    } else {
      console.log('✅ Command registration successful');
    }
    
    // Test 4: Test command execution
    const context = createTestContext({
      args: { message: 'Integration test message' }
    });
    
    const result = await testCommand.handler(context);
    if (!result.success) {
      errors.push(`Command execution failed: ${result.message}`);
    } else {
      console.log('✅ Command execution successful');
    }
    
    // Test 5: Test with aliases
    if (testCommand.aliases) {
      for (const alias of testCommand.aliases) {
        const aliasCommand = commandRegistry.findByAlias(alias);
        if (!aliasCommand) {
          errors.push(`Alias '${alias}' not found`);
        }
      }
    }
    
    // Cleanup
    commandRegistry.unregister('test-cmd');
    
    return { success: errors.length === 0, errors };
    
  } catch (error) {
    errors.push(`Registration test failed: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, errors };
  }
}

/**
 * Command Execution Tests
 */
export async function testCommandExecution(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // Get all registered commands
    const commands = commandRegistry.list();
    console.log(`Testing ${commands.length} registered commands`);
    
    for (const command of commands) {
      try {
        // Create test context with minimal args
        const context = createTestContext({
          args: {}
        });
        
        // Execute command
        const result = await command.handler(context);
        
        // Validate result structure
        if (typeof result.success !== 'boolean') {
          errors.push(`Command '${command.name}' returned invalid result structure`);
        }
        
        console.log(`✅ Command '${command.name}' executed successfully`);
        
      } catch (error) {
        errors.push(`Command '${command.name}' execution failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return { success: errors.length === 0, errors };
    
  } catch (error) {
    errors.push(`Execution test failed: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, errors };
  }
}

/**
 * Performance Benchmarks
 */
export async function testPerformanceBenchmarks(): Promise<{ success: boolean; metrics: Record<string, number>; errors: string[] }> {
  const errors: string[] = [];
  const metrics: Record<string, number> = {};
  
  try {
    // Test 1: Command registration performance
    const registrationStart = performance.now();
    const testCommand: UnifiedCommand = {
      id: 'perf-test',
      name: 'perftest',
      description: 'Performance test command',
      category: CommandCategory.SYSTEM,
      parameters: [],
      async handler(): Promise<CommandResult> {
        return { success: true, message: 'Performance test' };
      }
    };
    
    commandRegistry.register(testCommand);
    const registrationTime = performance.now() - registrationStart;
    metrics.registrationTime = registrationTime;
    
    // Test 2: Command lookup performance
    const lookupStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      commandRegistry.get('perftest');
    }
    const lookupTime = (performance.now() - lookupStart) / 1000;
    metrics.averageLookupTime = lookupTime;
    
    // Test 3: Command execution performance
    const executionStart = performance.now();
    const context = createTestContext();
    await testCommand.handler(context);
    const executionTime = performance.now() - executionStart;
    metrics.executionTime = executionTime;
    
    // Cleanup
    commandRegistry.unregister('perf-test');
    
    // Validate performance thresholds
    if (registrationTime > 10) {
      errors.push(`Command registration too slow: ${registrationTime}ms (max: 10ms)`);
    }
    
    if (lookupTime > 0.1) {
      errors.push(`Command lookup too slow: ${lookupTime}ms (max: 0.1ms)`);
    }
    
    if (executionTime > 100) {
      errors.push(`Command execution too slow: ${executionTime}ms (max: 100ms)`);
    }
    
    console.log('📊 Performance Metrics:');
    console.log(`  Registration: ${registrationTime.toFixed(2)}ms`);
    console.log(`  Lookup: ${lookupTime.toFixed(4)}ms`);
    console.log(`  Execution: ${executionTime.toFixed(2)}ms`);
    
    return { success: errors.length === 0, metrics, errors };
    
  } catch (error) {
    errors.push(`Performance test failed: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, metrics, errors };
  }
}

/**
 * Integration Test Suite
 */
export async function runCommandsIntegrationTests(): Promise<{ success: boolean; results: Record<string, any> }> {
  console.log('🧪 Running Commands Module Integration Tests...\n');
  
  const results: Record<string, any> = {};
  let overallSuccess = true;
  
  // Test 1: Command Registration
  console.log('1️⃣ Testing Command Registration...');
  const registrationResult = await testCommandRegistration();
  results.registration = registrationResult;
  if (!registrationResult.success) {
    overallSuccess = false;
    console.error('❌ Registration tests failed:', registrationResult.errors);
  } else {
    console.log('✅ Registration tests passed\n');
  }
  
  // Test 2: Command Execution
  console.log('2️⃣ Testing Command Execution...');
  const executionResult = await testCommandExecution();
  results.execution = executionResult;
  if (!executionResult.success) {
    overallSuccess = false;
    console.error('❌ Execution tests failed:', executionResult.errors);
  } else {
    console.log('✅ Execution tests passed\n');
  }
  
  // Test 3: Performance Benchmarks
  console.log('3️⃣ Testing Performance Benchmarks...');
  const performanceResult = await testPerformanceBenchmarks();
  results.performance = performanceResult;
  if (!performanceResult.success) {
    overallSuccess = false;
    console.error('❌ Performance tests failed:', performanceResult.errors);
  } else {
    console.log('✅ Performance tests passed\n');
  }
  
  // Summary
  console.log('📋 Test Summary:');
  console.log(`Overall Success: ${overallSuccess ? '✅' : '❌'}`);
  console.log(`Registration: ${results.registration.success ? '✅' : '❌'}`);
  console.log(`Execution: ${results.execution.success ? '✅' : '❌'}`);
  console.log(`Performance: ${results.performance.success ? '✅' : '❌'}`);
  
  return { success: overallSuccess, results };
}

/**
 * Continuous Validation Function
 * Run this after each phase to ensure no regressions
 */
export async function validateCommandsModule(): Promise<boolean> {
  try {
    const testResults = await runCommandsIntegrationTests();
    return testResults.success;
  } catch (error) {
    console.error('❌ Commands module validation failed:', error);
    return false;
  }
} 