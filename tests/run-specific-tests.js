/**
 * Simple test runner for running specific tests
 */
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get root project directory
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Tests to check
const testsToCheck = [
  '../src/ui/contexts/ThemeContext.test.tsx', 
  '../src/ui/contexts/ProgressContext.test.tsx',
  '../src/ui/components/Tips.test.tsx',
  './terminal/unit/formatting.test.ts',
  './memory/import-processor.test.ts',
  './memory/hierarchical-memory-integration.test.ts'
];

// Run each test individually
for (const testPath of testsToCheck) {
  try {
    console.log(`\nRunning test: ${testPath}`);
    
    // Use explicit config path and run specific test
    const command = `cd ${PROJECT_ROOT} && npx vitest run ${testPath} --config=./vitest.config.ts`;
    
    // Execute the command
    execSync(command, { 
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    
    console.log(`✅ Test passed: ${testPath}`);
  } catch (error) {
    console.error(`❌ Test failed: ${testPath}`);
  }
}

console.log('\nTest execution completed');