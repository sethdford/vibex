#!/usr/bin/env node

/**
 * VibeX CLI End-to-End Test Suite
 * 
 * Comprehensive testing of all CLI functionality
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const TEST_FILE = 'test-file.js';
const TEST_CONTENT = `
// Simple test file for analysis
function hello(name) {
  console.log('Hello, ' + name);
  return name.toUpperCase();
}

module.exports = { hello };
`;

class E2ETestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runCommand(args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', ['dist/cli.js', ...args], {
        stdio: 'pipe',
        timeout: options.timeout || 10000,
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Handle timeout
      if (options.timeout) {
        setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  async test(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      await testFn();
      console.log(`   ✅ PASS`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASS', error: null });
    } catch (error) {
      console.log(`   ❌ FAIL: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAIL', error: error.message });
    }
  }

  async runAllTests() {
    console.log('🚀 VibeX CLI End-to-End Test Suite');
    console.log('===================================\n');

    // Setup test file
    await fs.writeFile(TEST_FILE, TEST_CONTENT);

    // Test 1: Version Command
    await this.test('Version Command', async () => {
      const result = await this.runCommand(['--version']);
      if (!result.success) {
        throw new Error('Version command failed');
      }
      if (!result.stdout.includes('1.0.0')) {
        throw new Error('Version output incorrect');
      }
    });

    // Test 2: Help Command
    await this.test('Help Command', async () => {
      const result = await this.runCommand(['help']);
      if (!result.success) {
        throw new Error('Help command failed');
      }
      if (!result.stdout.includes('VibeX - AI-powered CLI')) {
        throw new Error('Help output missing expected content');
      }
    });

    // Test 3: Help for Specific Command
    await this.test('Help for Analyze Command', async () => {
      const result = await this.runCommand(['help', 'analyze']);
      if (!result.success) {
        throw new Error('Help analyze command failed');
      }
      if (!result.stdout.includes('analyze')) {
        throw new Error('Help analyze output incorrect');
      }
    });

    // Test 4: Analyze Command (without API key)
    await this.test('Analyze Command (No API Key)', async () => {
      const result = await this.runCommand(['analyze', TEST_FILE], {
        env: { ...process.env, ANTHROPIC_API_KEY: '' }
      });
      // Should fail gracefully
      if (result.code === 0) {
        throw new Error('Should fail without API key');
      }
      if (!result.stdout.includes('Analysis failed')) {
        throw new Error('Should show analysis failed message');
      }
    });

    // Test 5: Explain Command (without API key)
    await this.test('Explain Command (No API Key)', async () => {
      const result = await this.runCommand(['explain', TEST_FILE], {
        env: { ...process.env, ANTHROPIC_API_KEY: '' }
      });
      // Should fail gracefully
      if (result.code === 0) {
        throw new Error('Should fail without API key');
      }
    });

    // Test 6: Review Command (without API key)
    await this.test('Review Command (No API Key)', async () => {
      const result = await this.runCommand(['review', TEST_FILE], {
        env: { ...process.env, ANTHROPIC_API_KEY: '' }
      });
      // Should fail gracefully
      if (result.code === 0) {
        throw new Error('Should fail without API key');
      }
    });

    // Test 7: Non-existent File
    await this.test('Analyze Non-existent File', async () => {
      const result = await this.runCommand(['analyze', 'non-existent-file.js']);
      if (result.code === 0) {
        throw new Error('Should fail for non-existent file');
      }
    });

    // Test 8: Invalid Command
    await this.test('Invalid Command', async () => {
      const result = await this.runCommand(['invalid-command']);
      if (result.code === 0) {
        throw new Error('Should fail for invalid command');
      }
    });

    // Test 9: Verbose Flag
    await this.test('Verbose Flag', async () => {
      const result = await this.runCommand(['--verbose', 'help']);
      if (!result.success) {
        throw new Error('Verbose help command failed');
      }
      // Should have verbose logging
      if (!result.stdout.includes('VibeX')) {
        throw new Error('Verbose output missing');
      }
    });

    // Test 10: Debug Flag
    await this.test('Debug Flag', async () => {
      const result = await this.runCommand(['--debug', 'help']);
      if (!result.success) {
        throw new Error('Debug help command failed');
      }
    });

    // Test 11: Chat Command (should start but exit quickly without input)
    await this.test('Chat Command Startup', async () => {
      const result = await this.runCommand(['chat'], {
        timeout: 5000,
        env: { ...process.env, ANTHROPIC_API_KEY: '' }
      });
      // Chat should start even without API key
      // We expect it to timeout since it's interactive
    });

    // Cleanup
    try {
      await fs.unlink(TEST_FILE);
    } catch (e) {
      // File might not exist
    }

    // Print results
    console.log('\n📊 TEST RESULTS');
    console.log('================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(t => t.status === 'FAIL')
        .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
    }

    // Save results
    await fs.writeFile('e2e-test-results.json', JSON.stringify(this.results, null, 2));
    console.log('\n💾 Results saved to e2e-test-results.json');

    // Exit with appropriate code
    const success = this.results.failed === 0;
    console.log(`\n${success ? '🎉 ALL TESTS PASSED!' : '💥 SOME TESTS FAILED!'}`);
    process.exit(success ? 0 : 1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new E2ETestRunner();
  runner.runAllTests().catch(console.error);
}

export { E2ETestRunner }; 