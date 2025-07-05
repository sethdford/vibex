/**
 * VibeX Environment Simulation Tests
 * 
 * A comprehensive test suite that verifies VibeX's robustness across different operating environments:
 * - Tests VibeX in different OS environments (simulated)
 * - Tests with different terminal types and capabilities
 * - Tests with different network conditions (slow, unreliable)
 * - Tests with various resource constraints (low memory, CPU limits)
 * - Tests handling of environment variables and configurations
 * - Tests with different permission scenarios
 *
 * The goal is to ensure VibeX performs consistently across a wide range of environments,
 * not just ideal development environments. This helps identify issues that might only
 * appear in specific customer environments.
 */

import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { VibeXTestRig, type PerformanceMetrics, type TestEnvironment } from '../test-helper.js';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { setTimeout as sleep } from 'timers/promises';
import { cpus, totalmem, freemem } from 'os';

// Test configurations
const TERMINAL_TYPES = [
  { name: 'xterm-256color', colors: 256, width: 120, height: 40 },
  { name: 'xterm', colors: 16, width: 80, height: 24 },
  { name: 'vt100', colors: 8, width: 80, height: 24 },
  { name: 'dumb', colors: 0, width: 80, height: 24 },
  { name: 'screen', colors: 256, width: 100, height: 30 },
];

const SIMULATED_OS_ENVIRONMENTS = [
  { name: 'Linux', platform: 'linux', homedir: '/home/user', pathSep: '/' },
  { name: 'macOS', platform: 'darwin', homedir: '/Users/user', pathSep: '/' },
  { name: 'Windows', platform: 'win32', homedir: 'C:\\Users\\user', pathSep: '\\' },
];

const NETWORK_CONDITIONS = [
  { name: 'Fast', latency: 10, packetLoss: 0, bandwidth: 100 }, // 10ms latency, 100Mbps
  { name: 'Average', latency: 100, packetLoss: 0.01, bandwidth: 10 }, // 100ms latency, 1% packet loss, 10Mbps
  { name: 'Slow', latency: 300, packetLoss: 0.05, bandwidth: 1 }, // 300ms latency, 5% packet loss, 1Mbps
  { name: 'Very slow', latency: 1000, packetLoss: 0.1, bandwidth: 0.5 }, // 1s latency, 10% packet loss, 0.5Mbps
  { name: 'Unstable', latency: 500, packetLoss: 0.2, bandwidth: 5, jitter: 200 }, // 500ms latency with 200ms jitter, 20% packet loss, 5Mbps
  { name: 'Offline', latency: 0, packetLoss: 1, bandwidth: 0 }, // No connectivity
];

const RESOURCE_CONSTRAINTS = [
  { name: 'Abundant', memoryLimit: 0.9, cpuLimit: 0.9 },   // 90% of available resources
  { name: 'Normal', memoryLimit: 0.5, cpuLimit: 0.5 },     // 50% of available resources
  { name: 'Constrained', memoryLimit: 0.2, cpuLimit: 0.3 }, // 20% memory, 30% CPU
  { name: 'Minimal', memoryLimit: 0.1, cpuLimit: 0.2 },     // 10% memory, 20% CPU
  { name: 'Critical', memoryLimit: 0.05, cpuLimit: 0.1 },   // 5% memory, 10% CPU
];

const PERMISSION_SCENARIOS = [
  { name: 'Full', fileRead: true, fileWrite: true, networkAccess: true, envAccess: true },
  { name: 'Read-only', fileRead: true, fileWrite: false, networkAccess: true, envAccess: true },
  { name: 'No-network', fileRead: true, fileWrite: true, networkAccess: false, envAccess: true },
  { name: 'No-env', fileRead: true, fileWrite: true, networkAccess: true, envAccess: false },
  { name: 'Minimal', fileRead: true, fileWrite: false, networkAccess: false, envAccess: false },
];

/**
 * Main test suite for environment simulations
 */
describe('VibeX Environment Simulation Tests', () => {
  let rig: VibeXTestRig;
  let testEnv: TestEnvironment;
  
  beforeEach(() => {
    rig = new VibeXTestRig();
    testEnv = rig.setupIsolatedEnvironment('env-simulation-test');
  });
  
  afterEach(() => {
    rig.cleanup();
  });
  
  /**
   * OS Environment Tests
   * 
   * Tests VibeX functionality in simulated OS environments
   * by modifying environment variables and process properties
   */
  describe('OS Environment Tests', () => {
    for (const os of SIMULATED_OS_ENVIRONMENTS) {
      test(`should operate correctly in ${os.name} environment`, async () => {
        // Set up OS-specific environment variables
        const envVars = {
          OS: os.name,
          PATH_SEPARATOR: os.pathSep,
          HOME: os.homedir,
          PLATFORM: os.platform,
          VIBEX_SIMULATED_OS: os.platform,
        };
        
        // Create OS-specific configuration
        rig.setTestConfig({
          system: {
            platform: os.platform,
            homedir: os.homedir,
            pathSep: os.pathSep,
          },
          paths: {
            configDir: os.platform === 'win32' 
              ? `C:\\Users\\user\\AppData\\Local\\VibeX` 
              : `${os.homedir}/.config/vibex`
          }
        });
        
        // Run basic functionality tests
        const metrics = await rig.measurePerformance(async () => {
          try {
            // Test version command which should work in any environment
            const output = await rig.runCommand('--version', { env: envVars });
            assert.ok(output.includes('0.') || output.includes('version'), 
              `Version command should work in ${os.name} environment`);
            
            // Test help command
            const helpOutput = await rig.runCommand('--help', { env: envVars });
            assert.ok(helpOutput.includes('Usage:') || helpOutput.includes('Commands:'), 
              `Help command should work in ${os.name} environment`);
              
            // Verify file paths are handled correctly for the OS
            const configOutput = await rig.runCommand('config get paths', { env: envVars });
            
            // Check that path separator usage is consistent with the OS
            if (os.platform === 'win32') {
              assert.ok(!configOutput.includes('/'), 'Windows paths should use backslashes');
            } else {
              assert.ok(!configOutput.includes('\\'), 'Unix paths should use forward slashes');
            }
          } catch (error) {
            assert.fail(`Failed in ${os.name} environment: ${error}`);
          }
        });
        
        console.log(`✓ ${os.name} environment test completed in ${metrics.duration}ms`);
      });
    }
    
    test('should handle cross-platform file paths correctly', async () => {
      // Create test directory structure with platform-specific paths
      for (const os of SIMULATED_OS_ENVIRONMENTS) {
        // Create a directory structure that would be valid on the current OS
        const dirPath = join(testEnv.testDir, 'platform_tests', os.name);
        await fs.mkdir(dirPath, { recursive: true });
        
        // Create a file with a path format that would be specific to the OS
        const fileName = os.platform === 'win32' ? 'windows_style.txt' : 'unix_style.txt';
        await fs.writeFile(join(dirPath, fileName), `Test file for ${os.name}`, 'utf-8');
      }
      
      // Test that VibeX correctly handles paths across all environments
      for (const os of SIMULATED_OS_ENVIRONMENTS) {
        const envVars = {
          VIBEX_SIMULATED_OS: os.platform,
          PATH_SEPARATOR: os.pathSep,
        };
        
        // Test path normalization
        const pathTestCommand = `test normalize-path "${join(testEnv.testDir, 'platform_tests', os.name)}"`;
        const output = await rig.runCommand(pathTestCommand, { env: envVars });
        
        assert.ok(!output.includes('Error'), `Path handling should work in ${os.name} environment`);
      }
      
      console.log('✓ Cross-platform path handling tests completed');
    });
  });

  /**
   * Terminal Capability Tests
   * 
   * Tests VibeX functionality with different terminal types and capabilities
   * to ensure the CLI works well in various terminal environments
   */
  describe('Terminal Capability Tests', () => {
    for (const terminal of TERMINAL_TYPES) {
      test(`should adapt to ${terminal.name} terminal with ${terminal.colors} colors`, async () => {
        // Configure environment for specific terminal type
        const envVars = {
          TERM: terminal.name,
          COLUMNS: terminal.width.toString(),
          LINES: terminal.height.toString(),
          COLORTERM: terminal.colors > 16 ? 'truecolor' : terminal.colors > 8 ? '16color' : '',
          FORCE_COLOR: terminal.colors > 0 ? '1' : '0',
          NO_COLOR: terminal.colors === 0 ? '1' : '',
        };
        
        // Run with terminal-specific configuration
        const metrics = await rig.measurePerformance(async () => {
          // Test basic output formatting
          const output = await rig.runCommand('--help', { env: envVars });
          
          // If terminal is dumb, no color codes should be present
          if (terminal.colors === 0) {
            assert.ok(!output.includes('\u001b['), 'Dumb terminals should not receive color codes');
          }
          
          // Test terminal width awareness (no line should exceed terminal width)
          const lines = output.split('\n');
          for (const line of lines) {
            // Strip ANSI color codes for width calculation
            const cleanLine = line.replace(/\u001b\[\d+(;\d+)*m/g, '');
            assert.ok(cleanLine.length <= terminal.width, 
              `Output exceeds terminal width (${cleanLine.length} > ${terminal.width})`);
          }
          
          // Test progress display
          // Note: This assumes the VibeX CLI has a progress or spinner feature
          const progressOutput = await rig.runCommand('test progress-display', { env: envVars });
          
          // No errors should occur, regardless of terminal capability
          assert.ok(!progressOutput.includes('Error'), 'Progress display should adapt to terminal');
        });
        
        console.log(`✓ Terminal ${terminal.name} test completed in ${metrics.duration}ms`);
      });
    }
    
    test('should handle terminal resizing', async () => {
      // Initial size
      let envVars = {
        TERM: 'xterm-256color',
        COLUMNS: '80',
        LINES: '24',
      };
      
      // Start a long-running command
      const longRunningCommand = 'test long-running-operation';
      
      // Run the command in a separate process
      const process = rig.runCommandInBackground(longRunningCommand, { env: envVars });
      
      // Wait for command to start
      await sleep(500);
      
      // Change terminal size
      process.send({ type: 'resize', columns: 120, rows: 40 });
      
      // Wait for resize to be processed
      await sleep(500);
      
      // Check if the process is still running (didn't crash on resize)
      assert.ok(process.connected, 'Process should remain running after terminal resize');
      
      // Clean up
      process.kill();
      
      console.log('✓ Terminal resize handling test completed');
    });
    
    test('should support non-TTY environments', async () => {
      const envVars = {
        TERM: 'dumb',
        NO_COLOR: '1',
        VIBEX_IS_TTY: 'false',
      };
      
      // Test basic functionality in non-TTY mode
      const output = await rig.runCommand('--help', { env: envVars });
      
      // Should not contain interactive elements or color codes
      assert.ok(!output.includes('\u001b['), 'Non-TTY output should not contain color codes');
      
      // Test a command that would normally be interactive
      try {
        const interactiveOutput = await rig.runCommand('test interactive-prompt', { env: envVars });
        assert.ok(!interactiveOutput.includes('Error'), 'Interactive features should gracefully degrade');
      } catch (error) {
        assert.fail('Interactive command should not fail in non-TTY mode');
      }
      
      console.log('✓ Non-TTY environment test completed');
    });
  });

  /**
   * Network Condition Tests
   * 
   * Tests VibeX functionality under various network conditions
   * to ensure reliability even with poor connectivity
   */
  describe('Network Condition Tests', () => {
    for (const network of NETWORK_CONDITIONS) {
      test(`should handle ${network.name} network conditions`, async () => {
        // Configure simulated network conditions
        rig.setTestConfig({
          network: {
            simulatedConditions: {
              latency: network.latency,
              packetLoss: network.packetLoss,
              bandwidth: network.bandwidth,
              jitter: network.jitter || 0,
            },
            enableSimulation: true
          }
        });
        
        // Set environment variables for network conditions
        const envVars = {
          VIBEX_NETWORK_LATENCY: network.latency.toString(),
          VIBEX_NETWORK_PACKET_LOSS: network.packetLoss.toString(),
          VIBEX_NETWORK_BANDWIDTH: network.bandwidth.toString(),
          VIBEX_NETWORK_JITTER: (network.jitter || 0).toString(),
        };
        
        // Skip certain tests in offline mode
        if (network.packetLoss >= 1) {
          // For offline tests, verify proper error handling
          try {
            await rig.runCommand('chat "test message"', { 
              env: envVars, 
              shouldFail: true,
              timeout: 10000 // Allow more time for timeout detection
            });
            assert.fail('Should fail in offline mode');
          } catch (error) {
            // Expected failure
            assert.ok(error instanceof Error);
            console.log('✓ Offline mode correctly handled with proper error message');
          }
          return;
        }
        
        // Test commands with network requests
        const metrics = await rig.measurePerformance(async () => {
          try {
            // Network status check
            const statusOutput = await rig.runCommand('status', { 
              env: envVars,
              timeout: network.latency * 10 // Adjust timeout based on latency
            });
            
            // Should either complete successfully or provide meaningful error
            if (statusOutput.includes('Error')) {
              assert.ok(statusOutput.includes('network') || statusOutput.includes('timeout'), 
                'Should provide meaningful network error message');
            }
            
            // Test retry mechanism with unstable network
            if (network.packetLoss > 0.05) {
              // Higher timeout for unreliable conditions
              const retryOutput = await rig.runCommand('test retry-mechanism', { 
                env: envVars,
                timeout: 30000 // Longer timeout for retry tests
              });
              
              assert.ok(retryOutput.includes('retry') || retryOutput.includes('attempt'), 
                'Should indicate retry attempts under unstable network');
            }
          } catch (error) {
            // Only fail the test if we're not expecting network issues
            if (network.packetLoss < 0.1) {
              assert.fail(`Should handle ${network.name} conditions: ${error}`);
            }
          }
        });
        
        console.log(`✓ ${network.name} network test completed in ${metrics.duration}ms`);
      });
    }
    
    test('should implement exponential backoff for retries', async () => {
      // Configure flaky network that improves over time
      const flakyNetworkProfile = {
        // Will fail first attempts but succeed later
        initialPacketLoss: 0.9,
        finalPacketLoss: 0.1,
        improvementRate: 0.2,
      };
      
      // Mock network simulator that improves with each attempt
      let attemptCount = 0;
      const mockNetworkConditions = () => {
        attemptCount++;
        const currentPacketLoss = Math.max(
          flakyNetworkProfile.finalPacketLoss,
          flakyNetworkProfile.initialPacketLoss - 
          (flakyNetworkProfile.improvementRate * attemptCount)
        );
        
        return {
          VIBEX_NETWORK_PACKET_LOSS: currentPacketLoss.toString(),
          VIBEX_NETWORK_LATENCY: '300',
          VIBEX_SIMULATED_ATTEMPT: attemptCount.toString(),
        };
      };
      
      // Set up test config
      rig.setTestConfig({
        network: {
          retryStrategy: {
            maxRetries: 5,
            initialDelay: 100,
            maxDelay: 5000,
            factor: 2,
            jitter: true
          },
          enableSimulation: true
        }
      });
      
      // Track timing of retry attempts
      const retryTimings: number[] = [];
      const startTime = Date.now();
      
      try {
        // Run command that will retry multiple times
        await rig.runCommand('test exponential-backoff', { 
          env: mockNetworkConditions(),
          timeout: 30000 // Allow time for multiple retries
        });
        
        const totalTime = Date.now() - startTime;
        console.log(`Succeeded after ${attemptCount} attempts in ${totalTime}ms`);
        
        // Should have made multiple attempts
        assert.ok(attemptCount > 1, 'Should make multiple retry attempts');
        
      } catch (error) {
        assert.fail(`Retry mechanism failed: ${error}`);
      }
      
      console.log('✓ Exponential backoff test completed');
    });
  });
  
  /**
   * Resource Constraint Tests
   * 
   * Tests VibeX performance under various resource constraints
   * to ensure it can operate in resource-limited environments
   */
  describe('Resource Constraint Tests', () => {
    for (const resource of RESOURCE_CONSTRAINTS) {
      test(`should operate under ${resource.name} resource constraints`, async () => {
        // Calculate resource limits based on the actual system
        const systemMemory = totalmem();
        const systemCpus = cpus().length;
        
        const memoryLimit = Math.floor(systemMemory * resource.memoryLimit);
        const cpuLimit = Math.max(1, Math.floor(systemCpus * resource.cpuLimit));
        
        // Set environment variables for resource constraints
        const envVars = {
          VIBEX_MEMORY_LIMIT: memoryLimit.toString(),
          VIBEX_CPU_LIMIT: cpuLimit.toString(),
          NODE_OPTIONS: `--max-old-space-size=${Math.floor(memoryLimit / (1024 * 1024))}`,
        };
        
        // Configure test with resource limits
        rig.setTestConfig({
          performance: {
            resourceConstraints: {
              memoryLimit,
              cpuLimit
            },
            enableConstraints: true
          }
        });
        
        // Run basic performance tests under constraints
        const metrics = await rig.measurePerformance(async () => {
          try {
            // Test version command (should work under any constraint)
            await rig.runCommand('--version', { env: envVars });
            
            // Only run more intensive tests if we have enough resources
            if (resource.memoryLimit >= 0.1) {
              // Run a memory-intensive operation
              await rig.runCommand('test memory-usage', { env: envVars });
            }
            
            if (resource.cpuLimit >= 0.2) {
              // Run a CPU-intensive operation
              await rig.runCommand('test cpu-usage', { env: envVars });
            }
          } catch (error) {
            // Only fail for resource scenarios where we expect success
            if (resource.memoryLimit >= 0.2 && resource.cpuLimit >= 0.3) {
              assert.fail(`Should operate under ${resource.name} constraints: ${error}`);
            } else {
              console.log(`Expected failure under ${resource.name} constraints: ${error.message}`);
            }
          }
        });
        
        // Verify memory usage stayed within limits
        const memoryUsed = metrics.memoryUsage.peak.heapUsed;
        console.log(`${resource.name}: Memory peak: ${(memoryUsed / (1024 * 1024)).toFixed(1)}MB, ` +
                    `Limit: ${(memoryLimit / (1024 * 1024)).toFixed(1)}MB`);
        
        // Only enforce limit check for non-critical scenarios
        if (resource.memoryLimit > 0.1) {
          assert.ok(memoryUsed < memoryLimit, 
            `Memory usage (${memoryUsed}) should stay under limit (${memoryLimit})`);
        }
        
        console.log(`✓ ${resource.name} resource test completed in ${metrics.duration}ms`);
      });
    }
    
    test('should handle sudden memory pressure gracefully', async () => {
      // Test how the application responds to sudden memory pressure
      // by simulating another process consuming memory
      
      // Start with normal resources
      const envVars = {
        VIBEX_SIMULATE_MEMORY_PRESSURE: 'true',
        VIBEX_MEMORY_PRESSURE_DELAY: '2000', // ms before pressure kicks in
        VIBEX_MEMORY_PRESSURE_LEVEL: '0.7',  // 70% memory consumed by other processes
      };
      
      try {
        // Run a moderately memory-intensive operation that will encounter pressure
        const output = await rig.runCommand('test long-running-operation', { 
          env: envVars,
          timeout: 10000
        });
        
        // Should either complete successfully or exit gracefully with a clear error
        assert.ok(
          !output.includes('OutOfMemory') && !output.includes('FATAL ERROR'), 
          'Should handle memory pressure without crashing'
        );
        
        if (output.includes('Warning') || output.includes('memory')) {
          console.log('✓ Memory pressure properly detected and reported');
        }
      } catch (error) {
        // Check if error indicates proper handling
        if (error.message && error.message.includes('insufficient memory')) {
          console.log('✓ Memory pressure properly detected with clean exit');
        } else {
          assert.fail(`Failed to handle memory pressure gracefully: ${error}`);
        }
      }
      
      console.log('✓ Sudden memory pressure test completed');
    });
    
    test('should optimize performance based on available resources', async () => {
      // Test the application's ability to adapt to available resources
      const scenarios = [
        { name: 'High-end', memory: 0.8, cpu: 0.8 },
        { name: 'Low-end', memory: 0.2, cpu: 0.3 }
      ];
      
      const results = [];
      
      for (const scenario of scenarios) {
        const systemMemory = totalmem();
        const systemCpus = cpus().length;
        
        const memoryLimit = Math.floor(systemMemory * scenario.memory);
        const cpuLimit = Math.max(1, Math.floor(systemCpus * scenario.cpu));
        
        // Set environment variables for resource scenario
        const envVars = {
          VIBEX_MEMORY_LIMIT: memoryLimit.toString(),
          VIBEX_CPU_LIMIT: cpuLimit.toString(),
          VIBEX_AUTO_OPTIMIZE: 'true', // Enable auto-optimization
        };
        
        // Configure test with resource limits
        rig.setTestConfig({
          performance: {
            resourceConstraints: {
              memoryLimit,
              cpuLimit
            },
            enableConstraints: true,
            autoOptimize: true
          }
        });
        
        // Run standardized performance test
        const metrics = await rig.measurePerformance(async () => {
          await rig.runCommand('test standard-benchmark', { env: envVars });
        });
        
        results.push({
          scenario: scenario.name,
          duration: metrics.duration,
          memoryUsed: metrics.memoryUsage.peak.heapUsed,
          cpuTime: metrics.cpuUsage.after.user + metrics.cpuUsage.after.system
        });
      }
      
      console.table(results);
      
      // The low-end system should use less memory
      assert.ok(
        results[1].memoryUsed < results[0].memoryUsed,
        'Should use less memory on resource-constrained systems'
      );
      
      console.log('✓ Resource optimization test completed');
    });
  });

  /**
   * Environment Variable Tests
   * 
   * Tests VibeX's handling of different environment variables and configurations
   */
  describe('Environment Variable Tests', () => {
    test('should properly handle configuration from environment variables', async () => {
      // Define various environment configurations to test
      const envConfigurations = [
        {
          name: 'Default',
          vars: {}
        },
        {
          name: 'Custom API',
          vars: {
            VIBEX_API_URL: 'https://custom-api.example.com',
            VIBEX_API_KEY: 'test-api-key-from-env',
            VIBEX_API_VERSION: 'v2'
          }
        },
        {
          name: 'Debug Mode',
          vars: {
            VIBEX_DEBUG: 'true',
            VIBEX_LOG_LEVEL: 'debug',
            VIBEX_TRACE: '1'
          }
        },
        {
          name: 'International',
          vars: {
            LANG: 'fr_FR.UTF-8',
            LC_ALL: 'fr_FR.UTF-8',
            TZ: 'Europe/Paris'
          }
        },
        {
          name: 'CI Environment',
          vars: {
            CI: 'true',
            GITHUB_ACTIONS: 'true',
            VIBEX_NON_INTERACTIVE: 'true'
          }
        }
      ];
      
      for (const config of envConfigurations) {
        // Run basic tests with this environment configuration
        try {
          const output = await rig.runCommand('config show', { env: config.vars });
          
          // For each variable set, verify it's reflected in the config output
          for (const [key, value] of Object.entries(config.vars)) {
            // Skip non-config variables
            if (!key.startsWith('VIBEX_') && !['CI', 'GITHUB_ACTIONS'].includes(key)) {
              continue;
            }
            
            // Convert env var name to config property (VIBEX_API_URL -> api.url)
            const configKey = key.startsWith('VIBEX_') 
              ? key.replace('VIBEX_', '').toLowerCase().replace(/_/g, '.') 
              : key.toLowerCase();
              
            assert.ok(
              output.includes(configKey) || output.includes(value),
              `Config should reflect environment variable ${key}`
            );
          }
          
          console.log(`✓ ${config.name} environment configuration test passed`);
        } catch (error) {
          assert.fail(`Failed with ${config.name} environment configuration: ${error}`);
        }
      }
    });
    
    test('should handle conflicting configuration sources', async () => {
      // Create conflicting configurations between config file, env vars, and CLI flags
      
      // 1. Set base configuration in config file
      rig.setTestConfig({
        api: {
          url: 'https://config-file.example.com',
          key: 'config-file-key',
          timeout: 5000
        }
      });
      
      // 2. Set conflicting environment variables
      const envVars = {
        VIBEX_API_URL: 'https://env-var.example.com',
        VIBEX_API_TIMEOUT: '10000'
      };
      
      // 3. Add command line arguments that also specify options
      const command = 'config show --api-key cli-flag-key';
      
      // Run the command and check which values take precedence
      const output = await rig.runCommand(command, { env: envVars });
      
      // CLI flags should override env vars which should override config file
      assert.ok(output.includes('env-var.example.com'), 'Environment variables should override config file');
      assert.ok(output.includes('cli-flag-key'), 'CLI flags should override environment variables');
      assert.ok(output.includes('10000'), 'Environment variable timeout should be used');
      
      console.log('✓ Configuration precedence test passed');
    });
    
    test('should support configuration profiles', async () => {
      // Test the application's ability to switch between configuration profiles
      
      // Create multiple configuration profiles
      await fs.mkdir(join(testEnv.testDir, '.vibex', 'profiles'), { recursive: true });
      
      // Development profile
      await fs.writeFile(
        join(testEnv.testDir, '.vibex', 'profiles', 'development.json'),
        JSON.stringify({
          api: { url: 'https://dev-api.example.com', key: 'dev-key' },
          logging: { level: 'debug', verbose: true }
        }),
        'utf-8'
      );
      
      // Production profile
      await fs.writeFile(
        join(testEnv.testDir, '.vibex', 'profiles', 'production.json'),
        JSON.stringify({
          api: { url: 'https://prod-api.example.com', key: 'prod-key' },
          logging: { level: 'info', verbose: false }
        }),
        'utf-8'
      );
      
      // Test each profile
      for (const profile of ['development', 'production']) {
        const envVars = {
          VIBEX_CONFIG_DIR: join(testEnv.testDir, '.vibex'),
          VIBEX_PROFILE: profile
        };
        
        const output = await rig.runCommand('config show', { env: envVars });
        
        assert.ok(
          output.includes(`${profile}-api.example.com`) && output.includes(`${profile}-key`),
          `Configuration should reflect ${profile} profile settings`
        );
        
        console.log(`✓ ${profile} profile test passed`);
      }
    });
  });

  /**
   * Permission Scenario Tests
   * 
   * Tests VibeX's handling of different permission scenarios
   */
  describe('Permission Scenario Tests', () => {
    for (const scenario of PERMISSION_SCENARIOS) {
      test(`should handle ${scenario.name} permissions correctly`, async () => {
        // Configure test environment with appropriate permissions
        const envVars = {
          VIBEX_FILE_READ: scenario.fileRead.toString(),
          VIBEX_FILE_WRITE: scenario.fileWrite.toString(),
          VIBEX_NETWORK_ACCESS: scenario.networkAccess.toString(),
          VIBEX_ENV_ACCESS: scenario.envAccess.toString(),
          VIBEX_PERMISSION_TEST: 'true'
        };
        
        // Create test files for read/write operations
        const testFilePath = join(testEnv.testDir, 'permission-test.txt');
        await fs.writeFile(testFilePath, 'Test content for permission testing', 'utf-8');
        
        if (scenario.name === 'Read-only') {
          // Make the file read-only
          await fs.chmod(testFilePath, 0o444);
        }
        
        // Test file operations based on permissions
        if (scenario.fileRead) {
          // Test read operation
          const readCommand = `test file-read "${testFilePath}"`;
          const readOutput = await rig.runCommand(readCommand, { env: envVars });
          assert.ok(!readOutput.includes('Error'), 'File read should succeed when permitted');
        }
        
        if (scenario.fileWrite) {
          // Test write operation
          const writeCommand = `test file-write "${testFilePath}" "Updated content"`;
          try {
            await rig.runCommand(writeCommand, { 
              env: envVars,
              shouldFail: !scenario.fileWrite
            });
            
            if (!scenario.fileWrite) {
              assert.fail('Write operation should fail when not permitted');
            }
          } catch (error) {
            if (scenario.fileWrite) {
              assert.fail(`Write operation failed despite permissions: ${error}`);
            }
            // Otherwise, expected failure
          }
        }
        
        // Test network operations based on permissions
        if (scenario.networkAccess) {
          const networkCommand = 'test network-access';
          const networkOutput = await rig.runCommand(networkCommand, { 
            env: envVars,
            shouldFail: !scenario.networkAccess
          });
          
          if (scenario.networkAccess) {
            assert.ok(!networkOutput.includes('Error'), 'Network access should succeed when permitted');
          }
        } else {
          try {
            await rig.runCommand('test network-access', { 
              env: envVars,
              shouldFail: true
            });
            assert.fail('Network operation should fail when not permitted');
          } catch (error) {
            // Expected failure
          }
        }
        
        // Restore permissions for cleanup
        if (scenario.name === 'Read-only') {
          await fs.chmod(testFilePath, 0o644);
        }
        
        console.log(`✓ ${scenario.name} permissions test completed`);
      });
    }
    
    test('should handle permission changes during execution', async () => {
      // Start with full permissions
      const initialEnvVars = {
        VIBEX_FILE_READ: 'true',
        VIBEX_FILE_WRITE: 'true',
        VIBEX_NETWORK_ACCESS: 'true',
        VIBEX_ENV_ACCESS: 'true',
        VIBEX_DYNAMIC_PERMISSIONS: 'true'
      };
      
      // Start a long-running process
      const process = rig.runCommandInBackground('test long-running-with-permissions', { 
        env: initialEnvVars
      });
      
      // Wait for process to start
      await sleep(1000);
      
      // Signal permission changes during execution
      process.send({ 
        type: 'permission-change',
        permissions: { 
          fileWrite: false,
          networkAccess: false
        }
      });
      
      // Wait for permission changes to take effect
      await sleep(2000);
      
      // Check if the process is still running (should adapt, not crash)
      assert.ok(process.connected, 'Process should remain running after permission changes');
      
      // Verify the process received and acknowledged the permission changes
      const output = await rig.getProcessOutput(process);
      assert.ok(
        output.includes('permission change') || output.includes('restricted'),
        'Process should acknowledge permission changes'
      );
      
      // Clean up
      process.kill();
      
      console.log('✓ Dynamic permission changes test completed');
    });
  });

  /**
   * Integration Tests with Multiple Environment Factors
   * 
   * Tests combinations of different environment factors to ensure
   * VibeX works well in complex, real-world scenarios
   */
  describe('Integration Tests with Multiple Environment Factors', () => {
    test('should handle resource-constrained environment with poor network', async () => {
      // Combine resource constraints with poor network conditions
      const envVars = {
        // Resource constraints
        VIBEX_MEMORY_LIMIT: Math.floor(totalmem() * 0.2).toString(),
        VIBEX_CPU_LIMIT: '1',
        
        // Poor network conditions
        VIBEX_NETWORK_LATENCY: '500',
        VIBEX_NETWORK_PACKET_LOSS: '0.1',
        VIBEX_NETWORK_BANDWIDTH: '1',
        
        // Enable auto-optimization
        VIBEX_AUTO_OPTIMIZE: 'true'
      };
      
      // Configure test
      rig.setTestConfig({
        performance: {
          resourceConstraints: {
            memoryLimit: Math.floor(totalmem() * 0.2),
            cpuLimit: 1
          },
          enableConstraints: true,
          autoOptimize: true
        },
        network: {
          simulatedConditions: {
            latency: 500,
            packetLoss: 0.1,
            bandwidth: 1,
          },
          enableSimulation: true,
          retryStrategy: {
            maxRetries: 3,
            initialDelay: 1000
          }
        }
      });
      
      try {
        // Run a network-dependent operation
        const metrics = await rig.measurePerformance(async () => {
          await rig.runCommand('test network-operation', { 
            env: envVars,
            timeout: 30000 // Allow extra time for retries and slow network
          });
        });
        
        console.log(`Network operation completed in ${metrics.duration}ms under constraints`);
        console.log(`Memory used: ${(metrics.memoryUsage.peak.heapUsed / (1024 * 1024)).toFixed(1)}MB`);
        
        // Expect operation to take longer due to constraints, but still succeed
        assert.ok(metrics.duration > 1000, 'Operation should take longer under constraints');
      } catch (error) {
        // Given the constraints, we might accept some failures, but should have retry evidence
        const errorLog = rig.captureErrors();
        const hasRetryAttempts = errorLog.some(entry => 
          entry.message.includes('retry') || entry.message.includes('attempt')
        );
        
        if (!hasRetryAttempts) {
          assert.fail('Should attempt retries under poor conditions');
        }
      }
      
      console.log('✓ Combined constraints test completed');
    });
    
    test('should operate in minimal Windows console with restricted permissions', async () => {
      // Simulate a restrictive Windows environment
      const envVars = {
        // Windows console
        VIBEX_SIMULATED_OS: 'win32',
        TERM: 'windows',
        COLUMNS: '80',
        LINES: '24',
        COLORTERM: '',
        
        // Limited permissions
        VIBEX_FILE_WRITE: 'false',
        VIBEX_NETWORK_ACCESS: 'true',
        VIBEX_ENV_ACCESS: 'true',
        
        // Windows-specific variables
        ComSpec: 'C:\\Windows\\system32\\cmd.exe',
        SystemRoot: 'C:\\Windows',
        USERPROFILE: 'C:\\Users\\user',
        TEMP: 'C:\\Users\\user\\AppData\\Local\\Temp'
      };
      
      // Configure Windows-specific paths
      rig.setTestConfig({
        system: {
          platform: 'win32',
          homedir: 'C:\\Users\\user',
          pathSep: '\\'
        },
        paths: {
          configDir: 'C:\\Users\\user\\AppData\\Local\\VibeX',
          tempDir: 'C:\\Users\\user\\AppData\\Local\\Temp\\VibeX'
        }
      });
      
      try {
        // Run several commands that should work in this environment
        const results = [];
        
        // Basic version check
        const versionOutput = await rig.runCommand('--version', { env: envVars });
        results.push({ command: 'version', success: !versionOutput.includes('Error') });
        
        // Help command
        const helpOutput = await rig.runCommand('--help', { env: envVars });
        results.push({ command: 'help', success: !helpOutput.includes('Error') });
        
        // Network-dependent operation
        const networkOutput = await rig.runCommand('status', { env: envVars });
        results.push({ command: 'status', success: !networkOutput.includes('Error') });
        
        // Attempt a file write operation (should fail)
        try {
          await rig.runCommand('test file-write "test.txt" "content"', { 
            env: envVars, 
            shouldFail: true 
          });
          results.push({ command: 'file-write', success: false, note: 'Should have failed but succeeded' });
        } catch (error) {
          results.push({ command: 'file-write', success: true, note: 'Correctly failed due to permissions' });
        }
        
        console.table(results);
        
        // Basic operations should succeed
        assert.ok(
          results[0].success && results[1].success,
          'Basic operations should succeed in restricted Windows environment'
        );
      } catch (error) {
        assert.fail(`Failed in Windows environment: ${error}`);
      }
      
      console.log('✓ Restricted Windows environment test completed');
    });
    
    test('should work in CI environment with minimal permissions', async () => {
      // Simulate a typical CI environment
      const envVars = {
        // CI environment variables
        CI: 'true',
        GITHUB_ACTIONS: 'true',
        CI_COMMIT_REF_NAME: 'main',
        
        // Minimal environment
        TERM: 'dumb',
        NO_COLOR: '1',
        
        // Limited permissions
        VIBEX_FILE_READ: 'true',
        VIBEX_FILE_WRITE: 'true',
        VIBEX_NETWORK_ACCESS: 'false',
        
        // Non-interactive
        VIBEX_NON_INTERACTIVE: 'true',
      };
      
      // Run commands typical in CI environment
      const output = await rig.runCommand('test ci-validation', { env: envVars });
      
      assert.ok(!output.includes('fatal'), 'CI validation should not fail fatally');
      
      // Should detect CI environment
      assert.ok(
        output.includes('CI') || output.includes('continuous integration'),
        'Should detect CI environment'
      );
      
      // Should respect non-interactive mode
      assert.ok(
        !output.includes('prompt') && !output.includes('input required'),
        'Should respect non-interactive mode in CI'
      );
      
      console.log('✓ CI environment test completed');
    });
  });

  /**
   * Summary Test
   * 
   * Runs a comprehensive test with varying conditions to measure overall adaptability
   */
  describe('Environment Adaptability Summary', () => {
    test('should adapt to changing environments during operation', async () => {
      // Test the application's ability to adapt to changing environments
      // by shifting conditions during execution
      
      // Start with favorable conditions
      const initialConfig = {
        network: {
          simulatedConditions: {
            latency: 10,
            packetLoss: 0,
            bandwidth: 100,
          },
          enableSimulation: true
        },
        performance: {
          resourceConstraints: {
            memoryLimit: Math.floor(totalmem() * 0.8),
            cpuLimit: Math.max(1, Math.floor(cpus().length * 0.8))
          },
          enableConstraints: true
        }
      };
      
      rig.setTestConfig(initialConfig);
      
      // Start a long-running process
      const process = rig.runCommandInBackground('test long-running-adaptive', { 
        timeout: 60000
      });
      
      // Wait for process to start
      await sleep(2000);
      
      // Change network conditions to poor
      process.send({ 
        type: 'environment-change',
        changes: {
          network: {
            latency: 500,
            packetLoss: 0.1,
            bandwidth: 1
          }
        }
      });
      
      // Wait for adaptation
      await sleep(5000);
      
      // Reduce available memory
      process.send({ 
        type: 'environment-change',
        changes: {
          resources: {
            memoryLimit: Math.floor(totalmem() * 0.2),
            cpuLimit: 1
          }
        }
      });
      
      // Wait for adaptation
      await sleep(5000);
      
      // Check if the process is still running (should adapt, not crash)
      assert.ok(process.connected, 'Process should remain running after environment changes');
      
      // Get output from the process
      const output = await rig.getProcessOutput(process);
      
      // Verify adaptation occurred
      assert.ok(
        output.includes('network') && output.includes('adapting') || 
        output.includes('adjusted') || output.includes('resource'),
        'Process should report environment adaptation'
      );
      
      // Clean up
      process.kill();
      
      console.log('✓ Adaptive environment test completed');
      
      // Generate summary of all environment tests
      const summary = rig.getPerformanceSummary();
      
      console.log('\nEnvironment Simulation Test Summary:');
      console.log('----------------------------------');
      console.log(`Total test operations: ${summary.totalOperations}`);
      console.log(`Average operation duration: ${summary.averageDuration.toFixed(1)}ms`);
      console.log(`Maximum operation duration: ${summary.maxDuration}ms`);
      console.log(`Average memory usage: ${(summary.averageMemoryUsage / (1024 * 1024)).toFixed(1)}MB`);
      console.log(`Maximum memory usage: ${(summary.maxMemoryUsage / (1024 * 1024)).toFixed(1)}MB`);
    });
  });
});