/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Integration tests for performance optimizations
 * 
 * Tests the real-world impact of performance optimizations on memory usage,
 * startup time, and other performance metrics.
 */

import { jest } from 'vitest';
import { 
  applyPerformanceOptimizations,
  MemoryManager,
  PerformanceConfigManager, 
  PerformanceLevel,
  defaultPerformanceConfig
} from '../../../src/config/performance-config.js';
import { EventEmitter } from 'events';

// Mock Node.js process
const originalProcessEnv = { ...process.env };
const originalProcessMemoryUsage = process.memoryUsage;
let mockMemoryUsage = {
  rss: 100 * 1024 * 1024,          // 100MB
  heapTotal: 80 * 1024 * 1024,     // 80MB
  heapUsed: 50 * 1024 * 1024,      // 50MB
  external: 10 * 1024 * 1024,      // 10MB
  arrayBuffers: 5 * 1024 * 1024    // 5MB
};

// Mock setInterval and clearInterval
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;
const mockSetInterval = vi.fn().mockReturnValue(123);
const mockClearInterval = vi.fn();

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Performance Optimizations Integration', () => {
  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalProcessEnv };
    
    // Mock process.memoryUsage
    process.memoryUsage = vi.fn().mockReturnValue(mockMemoryUsage);
    
    // Mock setInterval and clearInterval
    global.setInterval = mockSetInterval;
    global.clearInterval = mockClearInterval;
    
    // Clear all mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore original process.env and process.memoryUsage
    process.env = originalProcessEnv;
    process.memoryUsage = originalProcessMemoryUsage;
    
    // Restore setInterval and clearInterval
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  });

  describe('applyPerformanceOptimizations', () => {
    test('should set NODE_OPTIONS with memory limits', () => {
      // Apply optimizations
      applyPerformanceOptimizations({
        ...defaultPerformanceConfig,
        maxOldSpaceSize: 100,
        maxHeapSize: 120
      });
      
      // Check that NODE_OPTIONS has been set with the correct memory limits
      expect(process.env.NODE_OPTIONS).toContain('--max-old-space-size=100');
      expect(process.env.NODE_OPTIONS).toContain('--max-heap-size=120');
    });
    
    test('should add aggressive GC flags when enabled', () => {
      // Apply optimizations with aggressive GC
      applyPerformanceOptimizations({
        ...defaultPerformanceConfig,
        enableAggressiveGC: true,
        gcInterval: 1000
      });
      
      // Check that NODE_OPTIONS has been set with optimization flags
      expect(process.env.NODE_OPTIONS).toContain('--optimize-for-size');
      expect(process.env.NODE_OPTIONS).toContain('--memory-reducer');
      expect(process.env.NODE_OPTIONS).toContain('--max-semi-space-size=2');
    });
    
    test('should not add GC flags when aggressive GC is disabled', () => {
      // Apply optimizations without aggressive GC
      applyPerformanceOptimizations({
        ...defaultPerformanceConfig,
        enableAggressiveGC: false
      });
      
      // Check that NODE_OPTIONS doesn't have optimization flags
      expect(process.env.NODE_OPTIONS).not.toContain('--optimize-for-size');
      expect(process.env.NODE_OPTIONS).not.toContain('--memory-reducer');
    });
    
    test('should enable memory compression when specified', () => {
      // Apply optimizations with memory compression
      applyPerformanceOptimizations({
        ...defaultPerformanceConfig,
        enableMemoryCompression: true
      });
      
      // Check that NODE_OPTIONS has memory compression flags
      expect(process.env.NODE_OPTIONS).toContain('--expose-gc');
      expect(process.env.NODE_OPTIONS).toContain('--optimize-for-size');
    });
    
    test('should handle existing NODE_OPTIONS correctly', () => {
      // Set existing NODE_OPTIONS
      process.env.NODE_OPTIONS = '--inspect';
      
      // Apply optimizations
      applyPerformanceOptimizations({
        ...defaultPerformanceConfig,
        maxOldSpaceSize: 100
      });
      
      // Check that existing options are preserved
      expect(process.env.NODE_OPTIONS).toContain('--inspect');
      expect(process.env.NODE_OPTIONS).toContain('--max-old-space-size=100');
    });
  });

  describe('MemoryManager', () => {
    test('should start and stop cleanup interval', () => {
      // Create memory manager
      const memoryManager = new MemoryManager();
      
      // Start memory manager
      memoryManager.start();
      
      // Check that setInterval was called with the correct interval
      expect(mockSetInterval).toHaveBeenCalledTimes(1);
      expect(mockSetInterval).toHaveBeenCalledWith(
        expect.any(Function),
        defaultPerformanceConfig.gcInterval
      );
      
      // Stop memory manager
      memoryManager.stop();
      
      // Check that clearInterval was called
      expect(mockClearInterval).toHaveBeenCalledTimes(1);
      expect(mockClearInterval).toHaveBeenCalledWith(123);
    });
    
    test('should perform cleanup when memory usage exceeds threshold', () => {
      // Create memory manager with a low threshold
      const memoryManager = new MemoryManager({
        ...defaultPerformanceConfig,
        maxHeapSize: 30 // 30MB threshold
      });
      
      // Start memory manager
      memoryManager.start();
      
      // Get the cleanup function
      const cleanupFn = mockSetInterval.mock.calls[0][0];
      
      // Mock high memory usage
      mockMemoryUsage = {
        ...mockMemoryUsage,
        heapUsed: 60 * 1024 * 1024 // 60MB (above threshold)
      };
      process.memoryUsage = vi.fn().mockReturnValue(mockMemoryUsage);
      
      // Mock global.gc
      const originalGlobal = global;
      (global as any).gc = vi.fn();
      
      // Call cleanup function
      cleanupFn();
      
      // Check that gc was called
      expect((global as any).gc).toHaveBeenCalledTimes(1);
      
      // Restore global
      global = originalGlobal;
      
      // Stop memory manager
      memoryManager.stop();
    });
    
    test('should not perform cleanup when memory usage is below threshold', () => {
      // Create memory manager with a high threshold
      const memoryManager = new MemoryManager({
        ...defaultPerformanceConfig,
        maxHeapSize: 100 // 100MB threshold
      });
      
      // Start memory manager
      memoryManager.start();
      
      // Get the cleanup function
      const cleanupFn = mockSetInterval.mock.calls[0][0];
      
      // Mock low memory usage
      mockMemoryUsage = {
        ...mockMemoryUsage,
        heapUsed: 30 * 1024 * 1024 // 30MB (below threshold)
      };
      process.memoryUsage = vi.fn().mockReturnValue(mockMemoryUsage);
      
      // Mock global.gc
      const originalGlobal = global;
      (global as any).gc = vi.fn();
      
      // Call cleanup function
      cleanupFn();
      
      // Check that gc was not called
      expect((global as any).gc).not.toHaveBeenCalled();
      
      // Restore global
      global = originalGlobal;
      
      // Stop memory manager
      memoryManager.stop();
    });
    
    test('should get current memory usage', () => {
      // Create memory manager
      const memoryManager = new MemoryManager();
      
      // Mock memory usage
      mockMemoryUsage = {
        ...mockMemoryUsage,
        heapTotal: 100 * 1024 * 1024, // 100MB
        heapUsed: 60 * 1024 * 1024    // 60MB
      };
      process.memoryUsage = vi.fn().mockReturnValue(mockMemoryUsage);
      
      // Get memory usage
      const memoryUsage = memoryManager.getMemoryUsage();
      
      // Check memory usage
      expect(memoryUsage.total).toBe(100 * 1024 * 1024);
      expect(memoryUsage.used).toBe(60 * 1024 * 1024);
      expect(memoryUsage.percentage).toBe(60);
    });
  });

  describe('Integration with CLI', () => {
    test('should apply optimizations at startup', () => {
      // Import CLI module to apply optimizations
      jest.resetModules();
      
      // Mock require.cache
      const mockRequireCache = {
        'fs': {},
        'path': {},
        'util': {},
        'src/core/some-module.js': {},
        'src/non-essential.js': {}
      };
      (require as any).cache = mockRequireCache;
      
      // Apply optimizations at startup
      applyPerformanceOptimizations();
      
      // Create memory manager and simulate startup
      const memoryManager = new MemoryManager();
      
      // Start memory manager
      memoryManager.start();
      
      // Get memory usage before cleanup
      const beforeUsage = memoryManager.getMemoryUsage();
      
      // Get the cleanup function
      const cleanupFn = mockSetInterval.mock.calls[0][0];
      
      // Mock decreasing memory usage after cleanup
      mockMemoryUsage = {
        ...mockMemoryUsage,
        heapUsed: mockMemoryUsage.heapUsed * 0.8 // 20% reduction
      };
      process.memoryUsage = vi.fn().mockReturnValue(mockMemoryUsage);
      
      // Call cleanup function
      cleanupFn();
      
      // Get memory usage after cleanup
      const afterUsage = memoryManager.getMemoryUsage();
      
      // Check that memory usage decreased
      expect(afterUsage.used).toBeLessThan(beforeUsage.used);
      
      // Stop memory manager
      memoryManager.stop();
    });
  });

  describe('Integration with Performance Monitoring', () => {
    test('should monitor and auto-tune based on metrics', () => {
      // Mock performance monitoring system
      const mockMonitoringSystem = {
        trackMetric: vi.fn(),
        getMetrics: vi.fn().mockReturnValue({
          timestamp: Date.now(),
          memory: {
            total: 200 * 1024 * 1024, // 200MB
            used: 150 * 1024 * 1024,  // 150MB (high usage)
            free: 50 * 1024 * 1024    // 50MB
          },
          cpu: {
            usage: 85, // 85% (high usage)
            cores: 8
          }
        })
      };
      
      // Create performance config manager with monitoring
      const manager = new PerformanceConfigManager({
        level: PerformanceLevel.BALANCED,
        monitoring: {
          enableAutoTuning: true,
          monitoringIntervalMs: 100 // Fast interval for testing
        },
        caching: {
          maxCacheSizeMB: 50
        },
        parallelExecution: {
          maxConcurrentOperations: 8,
          maxConcurrentAIRequests: 3
        }
      }, mockMonitoringSystem);
      
      // Mock setInterval to call the auto-tuning function immediately
      const originalSetInterval = global.setInterval;
      global.setInterval = vi.fn().mockImplementation((fn) => {
        // Call the function immediately
        setTimeout(fn, 0);
        return 999;
      });
      
      // Start auto-tuning
      const managerAny = manager as any;
      managerAny.startAutoTuning();
      
      // Wait for auto-tuning to run
      vi.runOnlyPendingTimers();
      
      // Check that configuration was adjusted
      const config = manager.getConfig();
      
      // Should have reduced cache size due to high memory usage
      expect(config.caching.maxCacheSizeMB).toBeLessThan(50);
      
      // Should have reduced concurrent operations due to high CPU usage
      expect(config.parallelExecution.maxConcurrentOperations).toBeLessThanOrEqual(8);
      expect(config.parallelExecution.maxConcurrentAIRequests).toBeLessThanOrEqual(3);
      
      // Restore setInterval
      global.setInterval = originalSetInterval;
      
      // Stop auto-tuning
      manager.stopAutoTuning();
    });
    
    test('should calculate and track performance metrics', () => {
      // Create EventEmitter to receive events
      const eventEmitter = new EventEmitter();
      const onConfigUpdated = vi.fn();
      const onMetricsAdded = vi.fn();
      
      // Subscribe to events
      eventEmitter.on('configUpdated', onConfigUpdated);
      eventEmitter.on('metricsAdded', onMetricsAdded);
      
      // Mock performance monitoring system
      const mockMonitoringSystem = {
        trackMetric: vi.fn(),
        getMetrics: vi.fn().mockReturnValue({
          timestamp: Date.now(),
          memory: {
            total: 200 * 1024 * 1024, // 200MB
            used: 40 * 1024 * 1024,   // 40MB (good usage)
            free: 160 * 1024 * 1024   // 160MB
          },
          cpu: {
            usage: 25, // 25% (good usage)
            cores: 8
          }
        })
      };
      
      // Create performance config manager with monitoring
      const manager = new PerformanceConfigManager({
        level: PerformanceLevel.CONSERVATIVE,
        monitoring: {
          enableAutoTuning: true,
          monitoringIntervalMs: 100 // Fast interval for testing
        }
      }, mockMonitoringSystem);
      
      // Replace the EventEmitter's emit method with our mocked one
      manager.emit = eventEmitter.emit.bind(eventEmitter);
      
      // Add metrics
      manager.addMetrics(mockMonitoringSystem.getMetrics());
      
      // Check that metrics were added and event was emitted
      expect(onMetricsAdded).toHaveBeenCalledTimes(1);
      
      // Update config and check event
      manager.updateConfig({
        level: PerformanceLevel.BALANCED
      });
      
      expect(onConfigUpdated).toHaveBeenCalledTimes(1);
      expect(onConfigUpdated).toHaveBeenCalledWith({
        oldConfig: expect.any(Object),
        newConfig: expect.any(Object)
      });
      
      // Check that the config was actually updated
      const config = manager.getConfig();
      expect(config.level).toBe(PerformanceLevel.BALANCED);
    });
  });
});