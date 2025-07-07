/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Unit tests for PerformanceConfigManager class
 * 
 * Tests the functionality of the PerformanceConfigManager class, including
 * configuration management, auto-tuning, and performance tracking.
 */

import { jest } from 'vitest';
import { 
  PerformanceConfigManager,
  PerformanceLevel,
  createPerformanceConfig,
  getDefaultPerformanceConfig,
  validatePerformanceConfig,
  PerformanceConfigUtils,
  VIBEX_PERFORMANCE_TARGETS
} from '../../../src/config/performance-config.js';
import type { PerformanceMetrics } from '../../../src/ui/components/PerformanceMonitor.js';

// Mock dependencies
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock EventEmitter methods
vi.mock('events', () => {
  const actualEvents = jest.requireActual('events');
  return {
    EventEmitter: vi.fn(() => ({
      on: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
      removeListener: vi.fn()
    }))
  };
});

describe('PerformanceConfigManager', () => {
  // Sample mock metrics for testing
  const mockMetrics: PerformanceMetrics = {
    timestamp: Date.now(),
    memory: {
      total: 200 * 1024 * 1024, // 200MB
      used: 50 * 1024 * 1024,   // 50MB
      free: 150 * 1024 * 1024,  // 150MB
      heapSize: 100 * 1024 * 1024, // 100MB
      heapUsed: 40 * 1024 * 1024   // 40MB
    },
    cpu: {
      usage: 25,              // 25% CPU usage
      cores: 8,
      processes: 2
    },
    io: {
      reads: 100,
      writes: 50,
      readBytes: 1024 * 1024, // 1MB
      writeBytes: 512 * 1024  // 512KB
    },
    network: {
      requests: 10,
      responses: 10,
      bytes: 2 * 1024 * 1024  // 2MB
    }
  };

  // Mock performance monitoring system
  const mockPerformanceMonitoring = {
    trackMetric: vi.fn(),
    trackOperation: vi.fn(),
    trackFunction: vi.fn(),
    markEvent: vi.fn(),
    getMetrics: vi.fn().mockReturnValue(mockMetrics),
    startMarker: vi.fn(),
    endMarker: vi.fn(),
    detectBottlenecks: vi.fn(),
    trackComponentRender: vi.fn()
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default config when none provided', () => {
      const manager = new PerformanceConfigManager();
      const config = manager.getConfig();
      
      expect(config.level).toBe(PerformanceLevel.BALANCED);
      expect(config.targets.startupTimeMs).toBe(VIBEX_PERFORMANCE_TARGETS.startupTimeMs);
      expect(config.caching).toBeDefined();
      expect(config.monitoring).toBeDefined();
    });

    test('should initialize with provided config', () => {
      const initialConfig = {
        level: PerformanceLevel.AGGRESSIVE,
        targets: {
          startupTimeMs: 20,
          memoryUsageMB: 10
        }
      };
      
      const manager = new PerformanceConfigManager(initialConfig);
      const config = manager.getConfig();
      
      expect(config.level).toBe(PerformanceLevel.AGGRESSIVE);
      expect(config.targets.startupTimeMs).toBe(20);
      expect(config.targets.memoryUsageMB).toBe(10);
      // Default values should still be present
      expect(config.caching).toBeDefined();
      expect(config.monitoring).toBeDefined();
    });

    test('should handle invalid config gracefully', () => {
      // Cast to any to bypass TypeScript type checking for this test
      const invalidConfig = {
        level: 'super-extreme' // Invalid performance level
      } as any;
      
      const manager = new PerformanceConfigManager(invalidConfig);
      const config = manager.getConfig();
      
      // Should fall back to default config
      expect(config.level).toBe(PerformanceLevel.BALANCED);
    });
  });

  describe('getConfig', () => {
    test('should return a copy of the config, not a reference', () => {
      const manager = new PerformanceConfigManager();
      const config1 = manager.getConfig();
      const config2 = manager.getConfig();
      
      // Should be equivalent but not the same object
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
      
      // Modifying the returned config should not affect the internal state
      config1.level = PerformanceLevel.AGGRESSIVE;
      const config3 = manager.getConfig();
      expect(config3.level).toBe(PerformanceLevel.BALANCED); // Still default
    });
  });

  describe('updateConfig', () => {
    test('should update config with new values', () => {
      const manager = new PerformanceConfigManager();
      
      const updates = {
        level: PerformanceLevel.AGGRESSIVE,
        targets: {
          startupTimeMs: 20,
          memoryUsageMB: 10
        }
      };
      
      manager.updateConfig(updates);
      const config = manager.getConfig();
      
      expect(config.level).toBe(PerformanceLevel.AGGRESSIVE);
      expect(config.targets.startupTimeMs).toBe(20);
      expect(config.targets.memoryUsageMB).toBe(10);
      // Other values should remain unchanged
      expect(config.targets.bundleSizeMB).toBe(VIBEX_PERFORMANCE_TARGETS.bundleSizeMB);
    });

    test('should throw error for invalid updates', () => {
      const manager = new PerformanceConfigManager();
      
      // Cast to any to bypass TypeScript type checking for this test
      const invalidUpdates = {
        targets: {
          startupTimeMs: -10 // Invalid negative value
        }
      } as any;
      
      expect(() => {
        manager.updateConfig(invalidUpdates);
      }).toThrow('Invalid performance configuration');
    });

    test('should update lastUpdated timestamp when config changes', () => {
      const manager = new PerformanceConfigManager();
      const beforeUpdate = manager.getConfig().lastUpdated;
      
      // Wait a small amount to ensure timestamp changes
      vi.advanceTimersByTime(10);
      
      manager.updateConfig({ level: PerformanceLevel.AGGRESSIVE });
      const afterUpdate = manager.getConfig().lastUpdated;
      
      expect(beforeUpdate).not.toBe(afterUpdate);
    });
  });

  describe('setPerformanceLevel', () => {
    test('should set the appropriate configuration for each level', () => {
      const manager = new PerformanceConfigManager();
      
      // Check CONSERVATIVE level
      manager.setPerformanceLevel(PerformanceLevel.CONSERVATIVE);
      let config = manager.getConfig();
      expect(config.level).toBe(PerformanceLevel.CONSERVATIVE);
      expect(config.parallelExecution.maxConcurrentOperations).toBe(3); // Conservative value
      
      // Check BALANCED level
      manager.setPerformanceLevel(PerformanceLevel.BALANCED);
      config = manager.getConfig();
      expect(config.level).toBe(PerformanceLevel.BALANCED);
      expect(config.parallelExecution.maxConcurrentOperations).toBe(6); // Balanced value
      
      // Check AGGRESSIVE level
      manager.setPerformanceLevel(PerformanceLevel.AGGRESSIVE);
      config = manager.getConfig();
      expect(config.level).toBe(PerformanceLevel.AGGRESSIVE);
      expect(config.parallelExecution.maxConcurrentOperations).toBe(10); // Aggressive value
      expect(config.enableExperimentalOptimizations).toBe(true);
      
      // Check EXTREME level
      manager.setPerformanceLevel(PerformanceLevel.EXTREME);
      config = manager.getConfig();
      expect(config.level).toBe(PerformanceLevel.EXTREME);
      expect(config.parallelExecution.maxConcurrentOperations).toBe(16); // Extreme value
      expect(config.enableExperimentalOptimizations).toBe(true);
    });
  });

  describe('checkPerformanceTargets', () => {
    test('should detect when performance meets targets', () => {
      const manager = new PerformanceConfigManager({
        targets: {
          memoryUsageMB: 60, // Target is 60MB
          // Other targets use defaults
        }
      });
      
      // Mock metrics showing 40MB usage (below target)
      const metrics = { ...mockMetrics };
      
      const result = manager.checkPerformanceTargets(metrics);
      
      expect(result.meetsTargets).toBe(true);
      expect(result.violations.length).toBe(0);
      expect(result.score).toBeGreaterThan(50); // Score should be good
    });

    test('should detect when performance exceeds targets', () => {
      const manager = new PerformanceConfigManager({
        targets: {
          memoryUsageMB: 30, // Target is 30MB
          // Other targets use defaults
        }
      });
      
      // Mock metrics showing 50MB usage (above target)
      const metrics = { ...mockMetrics };
      
      const result = manager.checkPerformanceTargets(metrics);
      
      expect(result.meetsTargets).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('Memory usage');
      expect(result.score).toBeLessThan(50); // Score should be lower
    });

    test('should detect high CPU usage', () => {
      const manager = new PerformanceConfigManager();
      
      // Mock metrics showing high CPU usage
      const metrics = { 
        ...mockMetrics,
        cpu: {
          ...mockMetrics.cpu,
          usage: 90 // 90% CPU usage
        }
      };
      
      const result = manager.checkPerformanceTargets(metrics);
      
      expect(result.meetsTargets).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('CPU usage');
    });
  });

  describe('autoTune', () => {
    test('should not adjust config when performance is good', () => {
      const manager = new PerformanceConfigManager({
        monitoring: {
          enableAutoTuning: true
        }
      });
      
      // Spy on updateConfig
      const updateConfigSpy = vi.spyOn(manager, 'updateConfig');
      
      // Mock private methods using any type to access them
      const managerAny = manager as any;
      const checkPerformanceTargetsOrig = managerAny.checkPerformanceTargets;
      managerAny.checkPerformanceTargets = vi.fn().mockReturnValue({
        meetsTargets: true,
        violations: [],
        score: 95 // Excellent score
      });
      
      // Call private autoTune method
      managerAny.autoTune(mockMetrics);
      
      // Restore original method
      managerAny.checkPerformanceTargets = checkPerformanceTargetsOrig;
      
      expect(updateConfigSpy).not.toHaveBeenCalled();
    });

    test('should adjust config when performance is poor', () => {
      const manager = new PerformanceConfigManager({
        monitoring: {
          enableAutoTuning: true
        },
        level: PerformanceLevel.BALANCED,
        caching: {
          maxCacheSizeMB: 100
        },
        parallelExecution: {
          maxConcurrentOperations: 8,
          maxConcurrentAIRequests: 3
        }
      });
      
      // Spy on updateConfig
      const updateConfigSpy = vi.spyOn(manager, 'updateConfig');
      
      // Mock private methods using any type to access them
      const managerAny = manager as any;
      const checkPerformanceTargetsOrig = managerAny.checkPerformanceTargets;
      managerAny.checkPerformanceTargets = vi.fn().mockReturnValue({
        meetsTargets: false,
        violations: [
          'Memory usage 100MB exceeds target 50MB',
          'CPU usage 90% is high'
        ],
        score: 40 // Poor score
      });
      
      // Call private autoTune method
      managerAny.autoTune({
        ...mockMetrics,
        memory: {
          ...mockMetrics.memory,
          used: 100 * 1024 * 1024 // 100MB
        },
        cpu: {
          ...mockMetrics.cpu,
          usage: 90 // 90% CPU usage
        }
      });
      
      // Restore original method
      managerAny.checkPerformanceTargets = checkPerformanceTargetsOrig;
      
      expect(updateConfigSpy).toHaveBeenCalled();
      
      // Should have reduced cache size and concurrent operations
      const updateCall = updateConfigSpy.mock.calls[0][0];
      expect(updateCall.caching?.maxCacheSizeMB).toBeLessThan(100);
      expect(updateCall.parallelExecution?.maxConcurrentOperations).toBeLessThan(8);
      expect(updateCall.parallelExecution?.maxConcurrentAIRequests).toBeLessThan(3);
    });

    test('should upgrade performance level when performance is excellent', () => {
      const manager = new PerformanceConfigManager({
        monitoring: {
          enableAutoTuning: true
        },
        level: PerformanceLevel.BALANCED
      });
      
      // Spy on setPerformanceLevel
      const setPerformanceLevelSpy = vi.spyOn(manager, 'setPerformanceLevel');
      
      // Mock private methods using any type to access them
      const managerAny = manager as any;
      const checkPerformanceTargetsOrig = managerAny.checkPerformanceTargets;
      managerAny.checkPerformanceTargets = vi.fn().mockReturnValue({
        meetsTargets: true,
        violations: [],
        score: 95 // Excellent score
      });
      
      // Call private autoTune method
      managerAny.autoTune(mockMetrics);
      
      // Restore original method
      managerAny.checkPerformanceTargets = checkPerformanceTargetsOrig;
      
      expect(setPerformanceLevelSpy).toHaveBeenCalledWith(PerformanceLevel.AGGRESSIVE);
    });

    test('should not auto-tune when disabled', () => {
      const manager = new PerformanceConfigManager({
        monitoring: {
          enableAutoTuning: false
        }
      });
      
      // Spy on updateConfig
      const updateConfigSpy = vi.spyOn(manager, 'updateConfig');
      
      // Mock private methods using any type to access them
      const managerAny = manager as any;
      
      // Call private autoTune method
      managerAny.autoTune(mockMetrics);
      
      expect(updateConfigSpy).not.toHaveBeenCalled();
    });
  });

  describe('getGeminiComparison', () => {
    test('should calculate performance improvements correctly', () => {
      const manager = new PerformanceConfigManager();
      const comparison = manager.getGeminiComparison();
      
      expect(comparison.improvements.startupTime).toBeCloseTo(6, 0);
      expect(comparison.improvements.memoryUsage).toBeCloseTo(6, 0);
      expect(comparison.improvements.bundleSize).toBeCloseTo(6, 0);
      expect(comparison.improvements.aiResponseTime).toBeCloseTo(6, 0);
      expect(comparison.improvements.fileOperations).toBeCloseTo(6, 0);
      expect(comparison.improvements.contextLoading).toBeCloseTo(6, 0);
      
      expect(comparison.summary).toContain('VibeX is');
      expect(comparison.summary).toContain('faster than Gemini CLI');
    });
  });

  describe('startAutoTuning and stopAutoTuning', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    
    afterEach(() => {
      vi.useRealTimers();
    });

    test('should start auto-tuning interval', () => {
      const manager = new PerformanceConfigManager({
        monitoring: {
          enableAutoTuning: true
        }
      }, mockPerformanceMonitoring);
      
      // Mock private methods using any type to access them
      const managerAny = manager as any;
      const autoTuneSpy = vi.spyOn(managerAny, 'autoTune');
      
      // Add metrics to history
      managerAny.addMetrics(mockMetrics);
      
      // Start auto-tuning by calling the private method
      managerAny.startAutoTuning();
      
      // Advance timers
      vi.advanceTimersByTime(30000); // 30 seconds
      
      expect(autoTuneSpy).toHaveBeenCalled();
      
      // Stop auto-tuning
      manager.stopAutoTuning();
      
      // Clear spy
      autoTuneSpy.mockClear();
      
      // Advance timers again
      vi.advanceTimersByTime(30000); // Another 30 seconds
      
      // Should not have been called again
      expect(autoTuneSpy).not.toHaveBeenCalled();
    });
  });

  describe('addMetrics', () => {
    test('should add metrics to history and limit size', () => {
      const manager = new PerformanceConfigManager();
      const managerAny = manager as any;
      
      // Add 150 metrics to history
      for (let i = 0; i < 150; i++) {
        manager.addMetrics({
          ...mockMetrics,
          timestamp: mockMetrics.timestamp + i
        });
      }
      
      // History should be limited to last 100 metrics
      expect(managerAny.metricsHistory.length).toBe(100);
      
      // Should have the most recent metrics
      expect(managerAny.metricsHistory[99].timestamp).toBe(mockMetrics.timestamp + 149);
    });
  });

  describe('utility functions', () => {
    test('createPerformanceConfig should create a valid manager', () => {
      const config = {
        level: PerformanceLevel.AGGRESSIVE
      };
      
      const manager = createPerformanceConfig(config, mockPerformanceMonitoring);
      
      expect(manager).toBeInstanceOf(PerformanceConfigManager);
      expect(manager.getConfig().level).toBe(PerformanceLevel.AGGRESSIVE);
    });

    test('getDefaultPerformanceConfig should return config for specified level', () => {
      const config = getDefaultPerformanceConfig(PerformanceLevel.EXTREME);
      
      expect(config.level).toBe(PerformanceLevel.EXTREME);
      expect(config.parallelExecution.maxConcurrentOperations).toBe(16); // Extreme value
    });

    test('validatePerformanceConfig should validate and return valid config', () => {
      const validConfig = {
        level: PerformanceLevel.AGGRESSIVE,
        targets: {
          startupTimeMs: 20
        }
      };
      
      const result = validatePerformanceConfig(validConfig);
      
      expect(result.level).toBe(PerformanceLevel.AGGRESSIVE);
      expect(result.targets.startupTimeMs).toBe(20);
    });

    test('validatePerformanceConfig should throw error for invalid config', () => {
      const invalidConfig = {
        level: 'invalid-level'
      };
      
      expect(() => {
        validatePerformanceConfig(invalidConfig);
      }).toThrow();
    });
  });

  describe('PerformanceConfigUtils', () => {
    test('should expose all utility functions and constants', () => {
      expect(PerformanceConfigUtils.schema).toBeDefined();
      expect(PerformanceConfigUtils.levels).toBeDefined();
      expect(PerformanceConfigUtils.targets.gemini).toBeDefined();
      expect(PerformanceConfigUtils.targets.vibex).toBeDefined();
      expect(PerformanceConfigUtils.create).toBeDefined();
      expect(PerformanceConfigUtils.getDefault).toBeDefined();
      expect(PerformanceConfigUtils.validate).toBeDefined();
    });
  });

  describe('cleanup', () => {
    test('destroy should clean up resources', () => {
      const manager = new PerformanceConfigManager();
      const managerAny = manager as any;
      
      // Add some metrics to history
      for (let i = 0; i < 10; i++) {
        manager.addMetrics(mockMetrics);
      }
      
      // Spy on stopAutoTuning and removeAllListeners
      const stopAutoTuningSpy = vi.spyOn(manager, 'stopAutoTuning');
      
      // Call destroy
      manager.destroy();
      
      expect(stopAutoTuningSpy).toHaveBeenCalled();
      expect(managerAny.metricsHistory.length).toBe(0);
    });
  });
});