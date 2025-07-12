/**
 * UI Component Test Runner
 * Specialized runner to handle React/JSX tests in the UI directories
 */
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get root project directory
const PROJECT_ROOT = path.resolve(__dirname, '..');

// UI component tests to check - use absolute paths to avoid path resolution issues
const uiTests = [
  // UI Context tests
  `${PROJECT_ROOT}/src/ui/contexts/ThemeContext.test.tsx`,
  `${PROJECT_ROOT}/src/ui/contexts/ProgressContext.test.tsx`,
  // UI Component tests
  `${PROJECT_ROOT}/src/ui/components/Tips.test.tsx`,
];

// Run each UI test individually
console.log('\nRunning UI component tests with absolute paths...');

for (const testPath of uiTests) {
  try {
    console.log(`\nRunning test: ${path.relative(PROJECT_ROOT, testPath)}`);
    
    // Use absolute path for the test file and explicit config
    const command = `cd ${PROJECT_ROOT} && npx vitest run ${testPath} --config=${PROJECT_ROOT}/vitest.config.ts`;
    
    // Execute the command
    execSync(command, { 
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    
    console.log(`✅ Test passed: ${path.relative(PROJECT_ROOT, testPath)}`);
  } catch (error) {
    console.error(`❌ Test failed: ${path.relative(PROJECT_ROOT, testPath)}`);
  }
}

console.log('\nUI Test execution completed');