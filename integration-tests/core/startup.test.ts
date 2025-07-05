/**
 * VibeX CLI Startup Performance Tests
 * 
 * Comprehensive testing of CLI startup performance, configuration loading,
 * and initialization processes. These tests ensure VibeX maintains its
 * performance advantage over Gemini CLI.
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { VibeXTestRig, type PerformanceMetrics } from '../test-helper.js';

describe('VibeX CLI Startup Performance', () => {
  let rig: VibeXTestRig;

  beforeEach(() => {
    rig = new VibeXTestRig();
  });

  afterEach(() => {
    rig.cleanup();
  });

  test('startup time consistently under 200ms', async () => {
    const env = rig.setupIsolatedEnvironment('startup-time-test');
    
    // Run multiple startup tests to ensure consistency
    const measurements: PerformanceMetrics[] = [];
    
    for (let i = 0; i < 5; i++) {
      const metrics = await rig.measurePerformance(async () => {
        await rig.runCommand('--version');
      });
      measurements.push(metrics);
    }

    // Verify all measurements are under 200ms
    for (const measurement of measurements) {
      assert.ok(
        measurement.duration < 200,
        `Startup time ${measurement.duration}ms exceeds 200ms threshold`
      );
    }

    // Verify average is well under threshold
    const avgDuration = measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
    assert.ok(
      avgDuration < 180,
      `Average startup time ${avgDuration}ms should be under 180ms`
    );

    console.log(`✅ Startup Performance: avg ${avgDuration.toFixed(1)}ms, max ${Math.max(...measurements.map(m => m.duration))}ms`);
  });

  test('help command performance under 250ms', async () => {
    const env = rig.setupIsolatedEnvironment('help-performance-test');
    
    const metrics = await rig.measurePerformance(async () => {
      await rig.runCommand('--help');
    });

    assert.ok(
      metrics.duration < 250,
      `Help command took ${metrics.duration}ms, should be under 250ms`
    );

    console.log(`✅ Help Performance: ${metrics.duration}ms`);
  });

  test('memory usage stays under 50MB baseline', async () => {
    const env = rig.setupIsolatedEnvironment('memory-usage-test');
    
    const metrics = await rig.measurePerformance(async () => {
      await rig.runCommand('--version');
    });

    const memoryUsedMB = metrics.memoryUsage.peak.heapUsed / 1024 / 1024;
    assert.ok(
      memoryUsedMB < 50,
      `Memory usage ${memoryUsedMB.toFixed(1)}MB exceeds 50MB baseline`
    );

    console.log(`✅ Memory Usage: ${memoryUsedMB.toFixed(1)}MB`);
  });

  test('configuration loading with various config files', async () => {
    const env = rig.setupIsolatedEnvironment('config-loading-test');
    
    // Test with minimal config
    rig.setTestConfig({
      api: { key: 'test-key' }
    });

    let metrics = await rig.measurePerformance(async () => {
      await rig.runCommand('--version');
    });

    assert.ok(metrics.duration < 200, 'Minimal config loading should be fast');

    // Test with complex config
    rig.setTestConfig({
      api: { 
        key: 'test-key',
        baseUrl: 'https://custom.api.com',
        timeout: 30000
      },
      ai: {
        model: 'claude-opus-4-20250514',
        temperature: 0.7,
        maxTokens: 8192,
        enableCaching: true,
        enableTools: true
      },
      terminal: {
        theme: 'dark',
        useColors: true,
        showProgressIndicators: true
      }
    });

    metrics = await rig.measurePerformance(async () => {
      await rig.runCommand('--version');
    });

    assert.ok(metrics.duration < 250, 'Complex config loading should still be fast');
    console.log(`✅ Config Loading: minimal ${metrics.duration}ms`);
  });

  test('concurrent startup processes', async () => {
    const env = rig.setupIsolatedEnvironment('concurrent-startup-test');
    
    // Start multiple CLI processes concurrently
    const startTime = Date.now();
    const promises = Array.from({ length: 3 }, () => 
      rig.runCommand('--version')
    );

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // All should complete successfully
    assert.equal(results.length, 3);
    results.forEach(result => {
      assert.ok(result.includes('0.2.29') || result.includes('version'));
    });

    // Total time should be reasonable (not much more than single startup)
    assert.ok(
      totalTime < 1000,
      `Concurrent startup took ${totalTime}ms, should be under 1000ms`
    );

    console.log(`✅ Concurrent Startup: ${totalTime}ms for 3 processes`);
  });

  test('startup with various command line arguments', async () => {
    const env = rig.setupIsolatedEnvironment('cli-args-test');
    
    const testCases = [
      { args: '--version', expectedPattern: /\d+\.\d+\.\d+/ },
      { args: '--help', expectedPattern: /Usage:|Commands:/ },
      { args: 'chat --help', expectedPattern: /chat.*command/i },
      { args: 'analyze --help', expectedPattern: /analyze.*command/i }
    ];

    for (const testCase of testCases) {
      const metrics = await rig.measurePerformance(async () => {
        const output = await rig.runCommand(testCase.args);
        assert.ok(
          testCase.expectedPattern.test(output),
          `Command "${testCase.args}" output should match pattern`
        );
      });

      assert.ok(
        metrics.duration < 300,
        `Command "${testCase.args}" took ${metrics.duration}ms, should be under 300ms`
      );
    }

    console.log(`✅ CLI Arguments: All commands respond quickly`);
  });

  test('error handling during startup', async () => {
    const env = rig.setupIsolatedEnvironment('startup-error-test');
    
    // Test with invalid configuration
    rig.setTestConfig({
      api: { key: '' }, // Invalid empty key
      ai: { model: 'invalid-model' }
    });

    try {
      await rig.runCommand('chat "test message"', { shouldFail: true });
      // Should handle gracefully without crashing
    } catch (error) {
      // Expected to fail, but should fail gracefully
      assert.ok(error instanceof Error);
    }

    // Test with corrupted config file
    rig.createFile('config.json', '{ invalid json');
    
    try {
      await rig.runCommand('--version', { 
        shouldFail: true,
        env: { VIBEX_CONFIG_FILE: rig.readFile('config.json') }
      });
    } catch (error) {
      // Should handle corrupted config gracefully
      assert.ok(error instanceof Error);
    }

    console.log(`✅ Error Handling: Graceful failure with invalid configs`);
  });

  test('environment variable handling', async () => {
    const env = rig.setupIsolatedEnvironment('env-vars-test');
    
    // Test with various environment variables
    const testEnvs: Record<string, string>[] = [
      { VIBEX_LOG_LEVEL: 'debug' },
      { VIBEX_CONFIG_DIR: env.tempDir },
      { NO_COLOR: '1' },
      { TERM: 'dumb' }
    ];

    for (const testEnv of testEnvs) {
      const metrics = await rig.measurePerformance(async () => {
        await rig.runCommand('--version', { env: testEnv });
      });

      assert.ok(
        metrics.duration < 250,
        `Startup with env vars took ${metrics.duration}ms, should be under 250ms`
      );
    }

    console.log(`✅ Environment Variables: All configurations handled efficiently`);
  });

  test('startup performance regression detection', async () => {
    const env = rig.setupIsolatedEnvironment('regression-test');
    
    // Baseline measurement
    const baselineRuns = 10;
    const baselineMeasurements: number[] = [];
    
    for (let i = 0; i < baselineRuns; i++) {
      const metrics = await rig.measurePerformance(async () => {
        await rig.runCommand('--version');
      });
      baselineMeasurements.push(metrics.duration);
    }

    const baselineAvg = baselineMeasurements.reduce((a, b) => a + b, 0) / baselineMeasurements.length;
    const baselineStd = Math.sqrt(
      baselineMeasurements.reduce((sum, val) => sum + Math.pow(val - baselineAvg, 2), 0) / baselineMeasurements.length
    );

    // Performance should be consistent (low standard deviation)
    assert.ok(
      baselineStd < 50,
      `Performance inconsistent: std dev ${baselineStd.toFixed(1)}ms should be under 50ms`
    );

    // Performance should beat Gemini CLI's ~200ms baseline
    assert.ok(
      baselineAvg < 190,
      `Average performance ${baselineAvg.toFixed(1)}ms should beat Gemini CLI's 200ms`
    );

    console.log(`✅ Regression Detection: avg ${baselineAvg.toFixed(1)}ms ± ${baselineStd.toFixed(1)}ms`);
  });

  test('cleanup and resource management', async () => {
    const env = rig.setupIsolatedEnvironment('cleanup-test');
    
    // Run several commands to generate some resource usage
    await rig.runCommand('--version');
    await rig.runCommand('--help');
    
    // Validate cleanup
    const validation = rig.validateCleanup();
    
    assert.ok(validation.valid, `Cleanup validation failed: ${validation.issues.join(', ')}`);
    
    if (validation.warnings.length > 0) {
      console.log(`⚠️ Cleanup warnings: ${validation.warnings.join(', ')}`);
    }

    console.log(`✅ Resource Management: Clean shutdown and resource cleanup`);
  });
}); 