/**
 * Sandbox Test Script
 * 
 * This script tests the sandboxing functionality by initializing the sandbox
 * and attempting various operations.
 */

import { initSandbox } from './sandbox.js';
import path from 'path';
import fs from 'fs/promises';

// Test configuration
const testConfig = {
  security: {
    sandbox: {
      enabled: true,
      mode: 'restricted',
      containerCommand: process.platform === 'darwin' ? 'sandbox-exec' : undefined,
      allowedCommands: ['echo', 'ls', 'cat'],
      deniedCommands: ['rm', 'sudo'],
      readOnlyFilesystem: false,
      allowedPaths: ['.', './test', './tmp'],
      allowedNetworkHosts: ['localhost'],
      resourceLimits: {
        cpuLimit: 1,
        memoryLimit: '512m',
        processLimit: 10
      }
    },
    permissions: {
      allowFileWrite: true,
      allowCommandExecution: true,
      allowNetwork: true,
      promptForDangerousOperations: true
    }
  },
  workspacePath: process.cwd()
};

async function runTest() {
  console.log('Initializing sandbox...');
  const sandbox = await initSandbox(testConfig);
  
  console.log(`Sandbox created with mode: ${sandbox.config.mode}`);
  console.log(`Sandbox enabled: ${sandbox.config.enabled}`);
  
  // Test file access validation
  try {
    console.log('\nTesting file path validation:');
    const validPath = path.join(process.cwd(), 'test.txt');
    const invalidPath = '/etc/passwd';
    
    console.log(`Valid path (${validPath}): ${await sandbox.checkFileAccess(validPath)}`);
    console.log(`Invalid path (${invalidPath}): ${await sandbox.checkFileAccess(invalidPath)}`);
  } catch (error) {
    console.error('File validation test failed:', error);
  }
  
  // Test command execution validation
  try {
    console.log('\nTesting command validation:');
    
    // Should pass
    console.log('Validating allowed command: echo "Hello"');
    sandbox.validateCommand('echo "Hello"');
    console.log('✅ Command allowed');
    
    // Should fail
    try {
      console.log('Validating denied command: rm -rf /');
      sandbox.validateCommand('rm -rf /');
      console.log('❌ Command incorrectly allowed');
    } catch (error) {
      console.log('✅ Command correctly blocked:', error.message);
    }
  } catch (error) {
    console.error('Command validation test failed:', error);
  }
  
  // Test command execution
  try {
    console.log('\nTesting command execution:');
    
    // Execute a simple command
    const result = await sandbox.executeCommand('echo "Hello from sandbox"');
    console.log(`Command output: ${result.output.trim()}`);
    console.log(`Exit code: ${result.exitCode}`);
  } catch (error) {
    console.error('Command execution test failed:', error);
  }
  
  // Test sandboxed file operation
  try {
    console.log('\nTesting sandboxed file operation:');
    
    const tempFile = path.join(process.cwd(), 'sandbox-test-file.txt');
    
    // Write file through sandbox
    await sandbox.withSandboxedFs(
      () => fs.writeFile(tempFile, 'Hello from sandbox!', 'utf8'),
      tempFile,
      { writeAccess: true }
    );
    console.log('✅ File written successfully');
    
    // Read file through sandbox
    const content = await sandbox.withSandboxedFs(
      () => fs.readFile(tempFile, 'utf8'),
      tempFile
    );
    console.log(`File content: ${content}`);
    
    // Clean up
    await fs.unlink(tempFile).catch(() => {});
  } catch (error) {
    console.error('File operation test failed:', error);
  }
  
  console.log('\nSandbox tests completed.');
}

// Run the test
runTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});