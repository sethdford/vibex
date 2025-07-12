/**
 * Simple test runner for running tests from the tests directory
 */
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get root project directory
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Run tests with the correct setup path
try {
  console.log('Running tests with correct setup path configuration...');
  
  // Use explicit config path and setup path to avoid path resolution issues
  const command = `cd ${PROJECT_ROOT} && npx vitest run --config=./vitest.config.ts`;
  
  // Execute the command
  execSync(command, { 
    encoding: 'utf-8',
    stdio: 'inherit'
  });
  
  console.log('Tests completed successfully');
  process.exit(0);
} catch (error) {
  console.error('Test execution failed:', error.message);
  process.exit(1);
}