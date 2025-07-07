/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Property tests for performance configuration validation
 * 
 * Uses property-based testing to verify that the performance configuration
 * schemas correctly validate all possible input combinations.
 */

import { jest } from 'vitest';
import fc from 'fast-check';
import { 
  performanceConfigSchema,
  cachingConfigSchema,
  parallelExecutionConfigSchema,
  streamingConfigSchema,
  memoryOptimizationConfigSchema, 
  PerformanceLevel,
  validatePerformanceConfig,
  PerformanceConfigManager
} from '../../../src/config/performance-config.js';
import { z } from 'zod';

// Mock dependencies
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Performance Config Validation Properties', () => {
  describe('Property: Schema validates all valid configurations', () => {
    test('cachingConfigSchema should accept all valid configurations', () => {
      fc.assert(
        fc.property(
          // Generate valid caching configurations
          fc.record({
            enableResponseCaching: fc.boolean(),
            cacheTTL: fc.integer(1, 3600000),  // 1ms to 1 hour
            maxCacheSizeMB: fc.integer(1, 1000), // 1MB to 1GB
            enableAIResponseCaching: fc.boolean(),
            aiCacheTTL: fc.integer(1, 3600000),
            enableContextCaching: fc.boolean(),
            contextCacheTTL: fc.integer(1, 3600000),
            enableFileMetadataCaching: fc.boolean(),
            fileMetadataCacheTTL: fc.integer(1, 3600000),
            cacheCompressionLevel: fc.integer(0, 9),
            enableCachePersistence: fc.boolean(),
            cacheCleanupInterval: fc.integer(1, 3600000)
          }, { withDeletedKeys: true }),  // Allow some keys to be missing
          
          // Property: The schema should validate valid configs
          (config) => {
            const result = cachingConfigSchema.safeParse(config);
            return result.success;
          }
        )
      );
    });

    test('parallelExecutionConfigSchema should accept all valid configurations', () => {
      fc.assert(
        fc.property(
          // Generate valid parallel execution configurations
          fc.record({
            enableParallelProcessing: fc.boolean(),
            maxConcurrentOperations: fc.integer(1, 32),
            maxConcurrentAIRequests: fc.integer(1, 10),
            maxConcurrentFileOps: fc.integer(1, 50),
            maxConcurrentContextOps: fc.integer(1, 20),
            enableRequestBatching: fc.boolean(),
            aiBatchSize: fc.integer(1, 10),
            batchTimeoutMs: fc.integer(10, 1000),
            enableWorkerThreads: fc.boolean(),
            workerThreadPoolSize: fc.integer(1, 16)
          }, { withDeletedKeys: true }),  // Allow some keys to be missing
          
          // Property: The schema should validate valid configs
          (config) => {
            const result = parallelExecutionConfigSchema.safeParse(config);
            return result.success;
          }
        )
      );
    });

    test('streamingConfigSchema should accept all valid configurations', () => {
      fc.assert(
        fc.property(
          // Generate valid streaming configurations
          fc.record({
            enableStreamingResponses: fc.boolean(),
            streamingChunkSize: fc.integer(64, 8192),
            streamingBufferSize: fc.integer(1024, 65536),
            enableStreamingCompression: fc.boolean(),
            streamingCompressionLevel: fc.integer(0, 9),
            enableProgressiveRendering: fc.boolean(),
            progressiveRenderingThreshold: fc.integer(64, 4096),
            enableBackpressureHandling: fc.boolean(),
            backpressureThreshold: fc.integer(1024, 65536)
          }, { withDeletedKeys: true }),  // Allow some keys to be missing
          
          // Property: The schema should validate valid configs
          (config) => {
            const result = streamingConfigSchema.safeParse(config);
            return result.success;
          }
        )
      );
    });

    test('memoryOptimizationConfigSchema should accept all valid configurations', () => {
      fc.assert(
        fc.property(
          // Generate valid memory optimization configurations
          fc.record({
            enableMemoryOptimization: fc.boolean(),
            gcThresholdMB: fc.integer(1, 1000),
            enableAutoGC: fc.boolean(),
            gcIntervalMs: fc.integer(100, 60000),
            maxHeapSizeMB: fc.integer(50, 2000),
            enableMemoryLeakDetection: fc.boolean(),
            memoryLeakThresholdMB: fc.integer(10, 1000),
            enableObjectPooling: fc.boolean(),
            objectPoolSizes: fc.record({
              stringPool: fc.integer(100, 10000),
              arrayPool: fc.integer(100, 5000),
              objectPool: fc.integer(50, 2000)
            }, { withDeletedKeys: true }),
            enableWeakRefOptimization: fc.boolean()
          }, { withDeletedKeys: true }),  // Allow some keys to be missing
          
          // Property: The schema should validate valid configs
          (config) => {
            const result = memoryOptimizationConfigSchema.safeParse(config);
            return result.success;
          }
        )
      );
    });
  });

  describe('Property: Schema rejects all invalid configurations', () => {
    test('cachingConfigSchema should reject negative values', () => {
      fc.assert(
        fc.property(
          // Generate invalid caching configurations with negative values
          fc.record({
            cacheTTL: fc.integer(-10000, -1),
            maxCacheSizeMB: fc.integer(-1000, -1),
            aiCacheTTL: fc.integer(-10000, -1),
            contextCacheTTL: fc.integer(-10000, -1),
            fileMetadataCacheTTL: fc.integer(-10000, -1),
            cacheCompressionLevel: fc.integer(-10, -1),
            cacheCleanupInterval: fc.integer(-10000, -1)
          }, { withDeletedKeys: true, requiredKeys: ['cacheTTL'] }),  // At least one negative value
          
          // Property: The schema should reject invalid configs
          (config) => {
            const result = cachingConfigSchema.safeParse(config);
            return !result.success;
          }
        )
      );
    });

    test('parallelExecutionConfigSchema should reject invalid compression levels', () => {
      fc.assert(
        fc.property(
          // Generate valid base config
          fc.record({
            enableParallelProcessing: fc.boolean(),
            maxConcurrentOperations: fc.integer(1, 32),
            enableRequestBatching: fc.boolean(),
          }, { withDeletedKeys: true }),
          
          // Generate invalid values for key fields
          fc.oneof(
            fc.record({ maxConcurrentOperations: fc.integer(-10, 0) }),
            fc.record({ maxConcurrentAIRequests: fc.integer(-10, 0) }),
            fc.record({ maxConcurrentFileOps: fc.integer(-10, 0) }),
            fc.record({ aiBatchSize: fc.integer(-10, 0) }),
            fc.record({ batchTimeoutMs: fc.integer(-1000, 0) }),
            fc.record({ workerThreadPoolSize: fc.integer(-10, 0) })
          ),
          
          // Property: The schema should reject configs with any invalid fields
          (baseConfig, invalidField) => {
            const config = { ...baseConfig, ...invalidField };
            const result = parallelExecutionConfigSchema.safeParse(config);
            return !result.success;
          }
        )
      );
    });
  });

  describe('Property: Performance levels are well-defined', () => {
    test('Each performance level should produce a valid configuration', () => {
      // Test all performance levels
      const allLevels = Object.values(PerformanceLevel);
      
      for (const level of allLevels) {
        // Create a manager with this level
        const manager = new PerformanceConfigManager();
        manager.setPerformanceLevel(level as PerformanceLevel);
        const config = manager.getConfig();
        
        // The config should be valid according to the schema
        const result = performanceConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
        
        // The config should have the correct level
        if (result.success) {
          expect(result.data.level).toBe(level);
        }
      }
    });

    test('Higher performance levels should allow more concurrency', () => {
      // Create managers for different levels
      const conservativeManager = new PerformanceConfigManager();
      conservativeManager.setPerformanceLevel(PerformanceLevel.CONSERVATIVE);
      const conservativeConfig = conservativeManager.getConfig();
      
      const aggressiveManager = new PerformanceConfigManager();
      aggressiveManager.setPerformanceLevel(PerformanceLevel.AGGRESSIVE);
      const aggressiveConfig = aggressiveManager.getConfig();
      
      const extremeManager = new PerformanceConfigManager();
      extremeManager.setPerformanceLevel(PerformanceLevel.EXTREME);
      const extremeConfig = extremeManager.getConfig();
      
      // Higher levels should have higher concurrency
      expect(conservativeConfig.parallelExecution.maxConcurrentOperations)
        .toBeLessThan(aggressiveConfig.parallelExecution.maxConcurrentOperations);
      
      expect(aggressiveConfig.parallelExecution.maxConcurrentOperations)
        .toBeLessThan(extremeConfig.parallelExecution.maxConcurrentOperations);
      
      // Higher levels should have higher cache sizes
      expect(conservativeConfig.caching.maxCacheSizeMB)
        .toBeLessThan(aggressiveConfig.caching.maxCacheSizeMB);
      
      expect(aggressiveConfig.caching.maxCacheSizeMB)
        .toBeLessThan(extremeConfig.caching.maxCacheSizeMB);
    });
  });

  describe('Property: Schema handles edge cases properly', () => {
    test('validatePerformanceConfig should handle empty objects', () => {
      // Empty config should use defaults
      const result = validatePerformanceConfig({});
      
      // Check default values
      expect(result.level).toBe(PerformanceLevel.BALANCED);
      expect(result.caching.enableResponseCaching).toBe(true);
      expect(result.parallelExecution.enableParallelProcessing).toBe(true);
    });

    test('validatePerformanceConfig should enforce caching compression level range', () => {
      // Test out-of-range compression level
      expect(() => {
        validatePerformanceConfig({
          caching: {
            cacheCompressionLevel: 10 // Out of range (0-9)
          }
        });
      }).toThrow();
      
      // Test valid compression levels
      for (let i = 0; i <= 9; i++) {
        const result = validatePerformanceConfig({
          caching: {
            cacheCompressionLevel: i
          }
        });
        expect(result.caching.cacheCompressionLevel).toBe(i);
      }
    });

    test('validatePerformanceConfig should enforce streaming compression level range', () => {
      // Test out-of-range compression level
      expect(() => {
        validatePerformanceConfig({
          streaming: {
            streamingCompressionLevel: 10 // Out of range (0-9)
          }
        });
      }).toThrow();
      
      // Test valid compression levels
      for (let i = 0; i <= 9; i++) {
        const result = validatePerformanceConfig({
          streaming: {
            streamingCompressionLevel: i
          }
        });
        expect(result.streaming.streamingCompressionLevel).toBe(i);
      }
    });
  });

  describe('Property: Schema preserves data invariants', () => {
    test('Performance targets should have positive values', () => {
      fc.assert(
        fc.property(
          // Generate random positive values for performance targets
          fc.record({
            startupTimeMs: fc.integer(1, 1000),
            memoryUsageMB: fc.integer(1, 1000),
            bundleSizeMB: fc.float(0.1, 100).map(n => Number(n.toFixed(1))),
            aiResponseTimeMs: fc.integer(1, 5000),
            fileOperationTimeMs: fc.integer(1, 500),
            contextLoadingTimeMs: fc.integer(1, 1000)
          }),
          
          // Property: The schema should preserve these values
          (targets) => {
            const result = performanceConfigSchema.safeParse({
              targets
            });
            
            if (!result.success) return false;
            
            // Check that all target values are preserved
            for (const key of Object.keys(targets) as Array<keyof typeof targets>) {
              if (result.data.targets[key] !== targets[key]) {
                return false;
              }
            }
            
            return true;
          }
        )
      );
    });

    test('Performance config should be immutable via getConfig', () => {
      // Create a manager
      const manager = new PerformanceConfigManager({
        level: PerformanceLevel.BALANCED,
        targets: {
          startupTimeMs: 30,
          memoryUsageMB: 15
        }
      });
      
      // Get the config and try to modify it
      const config = manager.getConfig();
      config.level = PerformanceLevel.AGGRESSIVE;
      config.targets.startupTimeMs = 20;
      
      // Get the config again and check that it's unchanged
      const newConfig = manager.getConfig();
      expect(newConfig.level).toBe(PerformanceLevel.BALANCED);
      expect(newConfig.targets.startupTimeMs).toBe(30);
    });

    test('PerformanceConfigManager should enforce schema on updateConfig', () => {
      // Create a manager
      const manager = new PerformanceConfigManager({
        level: PerformanceLevel.BALANCED
      });
      
      // Generate random valid updates and apply them
      fc.assert(
        fc.property(
          // Generate valid updates
          fc.record({
            level: fc.constantFrom(...Object.values(PerformanceLevel)),
            targets: fc.record({
              startupTimeMs: fc.integer(1, 1000),
              memoryUsageMB: fc.integer(1, 1000)
            }, { withDeletedKeys: true })
          }, { withDeletedKeys: true }),
          
          // Property: The update should succeed and preserve values
          (updates) => {
            try {
              manager.updateConfig(updates);
              const config = manager.getConfig();
              
              // Check that updates were applied
              if (updates.level && config.level !== updates.level) {
                return false;
              }
              
              if (updates.targets?.startupTimeMs && 
                  config.targets.startupTimeMs !== updates.targets.startupTimeMs) {
                return false;
              }
              
              if (updates.targets?.memoryUsageMB && 
                  config.targets.memoryUsageMB !== updates.targets.memoryUsageMB) {
                return false;
              }
              
              return true;
            } catch (error) {
              return false;
            }
          }
        )
      );
    });
  });
});