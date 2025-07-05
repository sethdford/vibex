#!/usr/bin/env node
/**
 * Commands Module Test Runner
 * 
 * Standalone test runner for validating commands module functionality.
 * Can be run during development to ensure changes don't break functionality.
 */

import { runCommandsIntegrationTests } from './commands-test-strategy.js';

async function main() {
  console.log('🚀 Starting Commands Module Test Runner...\n');
  
  try {
    // Import and register commands
    console.log('📦 Loading commands module...');
    const { registerCommands } = await import('../../src/commands/register.js');
    await registerCommands();
    console.log('✅ Commands loaded successfully\n');
    
    // Run integration tests
    const testResults = await runCommandsIntegrationTests();
    
    // Exit with appropriate code
    if (testResults.success) {
      console.log('\n🎉 All tests passed! Commands module is functional.');
      process.exit(0);
    } else {
      console.error('\n💥 Some tests failed! Commands module has issues.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 