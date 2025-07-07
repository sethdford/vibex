/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Unit tests for performance configuration schemas
 * 
 * Tests the validation logic and defaults for all performance config schemas.
 */

import { jest } from 'vitest';
import { 
  performanceConfigSchema, 
  cachingConfigSchema,
  parallelExecutionConfigSchema,
  streamingConfigSchema,
  memoryOptimizationConfigSchema,
  aiOptimizationConfigSchema,
  contextOptimizationConfigSchema,
  monitoringConfigSchema,
  PerformanceLevel,
  VIBEX_PERFORMANCE_TARGETS,
  GEMINI_CLI_BENCHMARKS
} from '../../../src/config/performance-config.js';

describe('Performance Config Schemas', () => {
  describe('cachingConfigSchema', () => {
    test('should validate with defaults', () => {
      const result = cachingConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enableResponseCaching).toBe(true);
        expect(result.data.cacheTTL).toBe(300000); // 5 minutes
        expect(result.data.maxCacheSizeMB).toBe(50);
        expect(result.data.enableAIResponseCaching).toBe(true);
      }
    });

    test('should validate with custom values', () => {
      const customConfig = {
        enableResponseCaching: false,
        cacheTTL: 600000, // 10 minutes
        maxCacheSizeMB: 100,
        cacheCompressionLevel: 9
      };
      
      const result = cachingConfigSchema.safeParse(customConfig);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enableResponseCaching).toBe(false);
        expect(result.data.cacheTTL).toBe(600000);
        expect(result.data.maxCacheSizeMB).toBe(100);
        expect(result.data.cacheCompressionLevel).toBe(9);
        // Default values should still be present
        expect(result.data.enableAIResponseCaching).toBe(true);
      }
    });

    test('should reject invalid values', () => {
      const invalidConfig = {
        cacheTTL: -1, // Negative time
        maxCacheSizeMB: 0, // Zero size
        cacheCompressionLevel: 10 // Out of range
      };
      
      const result = cachingConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.errors;
        const errorPaths = errors.map(e => e.path.join('.'));
        
        expect(errorPaths).toContain('cacheTTL');
        expect(errorPaths).toContain('maxCacheSizeMB');
        expect(errorPaths).toContain('cacheCompressionLevel');
      }
    });
  });

  describe('parallelExecutionConfigSchema', () => {
    test('should validate with defaults', () => {
      const result = parallelExecutionConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enableParallelProcessing).toBe(true);
        expect(result.data.maxConcurrentOperations).toBe(8);
        expect(result.data.maxConcurrentAIRequests).toBe(3);
        expect(result.data.enableRequestBatching).toBe(true);
      }
    });

    test('should validate with custom values', () => {
      const customConfig = {
        enableParallelProcessing: false,
        maxConcurrentOperations: 16,
        maxConcurrentFileOps: 20,
        enableWorkerThreads: true
      };
      
      const result = parallelExecutionConfigSchema.safeParse(customConfig);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enableParallelProcessing).toBe(false);
        expect(result.data.maxConcurrentOperations).toBe(16);
        expect(result.data.maxConcurrentFileOps).toBe(20);
        expect(result.data.enableWorkerThreads).toBe(true);
        // Default values should still be present
        expect(result.data.maxConcurrentAIRequests).toBe(3);
      }
    });

    test('should reject invalid values', () => {
      const invalidConfig = {
        maxConcurrentOperations: -5, // Negative
        maxConcurrentAIRequests: 0, // Zero
        workerThreadPoolSize: -1 // Negative
      };
      
      const result = parallelExecutionConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.errors;
        const errorPaths = errors.map(e => e.path.join('.'));
        
        expect(errorPaths).toContain('maxConcurrentOperations');
        expect(errorPaths).toContain('maxConcurrentAIRequests');
        expect(errorPaths).toContain('workerThreadPoolSize');
      }
    });
  });

  describe('streamingConfigSchema', () => {
    test('should validate with defaults', () => {
      const result = streamingConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enableStreamingResponses).toBe(true);
        expect(result.data.streamingChunkSize).toBe(1024);
        expect(result.data.streamingBufferSize).toBe(8192);
        expect(result.data.enableStreamingCompression).toBe(true);
      }
    });

    test('should validate with custom values', () => {
      const customConfig = {
        enableStreamingResponses: false,
        streamingChunkSize: 512,
        enableProgressiveRendering: false
      };
      
      const result = streamingConfigSchema.safeParse(customConfig);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enableStreamingResponses).toBe(false);
        expect(result.data.streamingChunkSize).toBe(512);
        expect(result.data.enableProgressiveRendering).toBe(false);
        // Default values should still be present
        expect(result.data.streamingBufferSize).toBe(8192);
      }
    });

    test('should reject invalid values', () => {
      const invalidConfig = {
        streamingChunkSize: 0, // Zero
        streamingCompressionLevel: 15, // Out of range
        progressiveRenderingThreshold: -100 // Negative
      };
      
      const result = streamingConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.errors;
        const errorPaths = errors.map(e => e.path.join('.'));
        
        expect(errorPaths).toContain('streamingChunkSize');
        expect(errorPaths).toContain('streamingCompressionLevel');
        expect(errorPaths).toContain('progressiveRenderingThreshold');
      }
    });
  });

  describe('memoryOptimizationConfigSchema', () => {
    test('should validate with defaults', () => {
      const result = memoryOptimizationConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enableMemoryOptimization).toBe(true);
        expect(result.data.gcThresholdMB).toBe(50);
        expect(result.data.enableAutoGC).toBe(true);
        expect(result.data.maxHeapSizeMB).toBe(200);
      }
    });

    test('should validate with custom values', () => {
      const customConfig = {
        enableMemoryOptimization: false,
        gcThresholdMB: 100,
        maxHeapSizeMB: 300,
        objectPoolSizes: {
          stringPool: 5000,
          arrayPool: 2000,
          objectPool: 1000
        }
      };
      
      const result = memoryOptimizationConfigSchema.safeParse(customConfig);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enableMemoryOptimization).toBe(false);
        expect(result.data.gcThresholdMB).toBe(100);
        expect(result.data.maxHeapSizeMB).toBe(300);
        expect(result.data.objectPoolSizes.stringPool).toBe(5000);
        // Default values should still be present
        expect(result.data.enableAutoGC).toBe(true);
      }
    });

    test('should reject invalid values', () => {
      const invalidConfig = {
        gcThresholdMB: 0, // Zero
        gcIntervalMs: -1000, // Negative
        objectPoolSizes: {
          stringPool: -500, // Negative
        }
      };
      
      const result = memoryOptimizationConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.errors;
        const errorPaths = errors.map(e => e.path.join('.'));
        
        expect(errorPaths).toContain('gcThresholdMB');
        expect(errorPaths).toContain('gcIntervalMs');
        expect(errorPaths).toContain('objectPoolSizes.stringPool');
      }
    });
  });

  describe('aiOptimizationConfigSchema', () => {
    test('should validate with defaults', () => {
      const result = aiOptimizationConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enableAIOptimization).toBe(true);
        expect(result.data.enablePromptCompression).toBe(true);
        expect(result.data.promptCompressionRatio).toBe(0.8);
        expect(result.data.maxContextWindowSize).toBe(200000);
      }
    });

    test('should validate with custom values', () => {
      const customConfig = {
        enableAIOptimization: false,
        promptCompressionRatio: 0.5,
        maxContextWindowSize: 100000,
        modelSelectionCriteria: {
          prioritizeSpeed: false,
          prioritizeCost: true,
          prioritizeQuality: true
        }
      };
      
      const result = aiOptimizationConfigSchema.safeParse(customConfig);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enableAIOptimization).toBe(false);
        expect(result.data.promptCompressionRatio).toBe(0.5);
        expect(result.data.maxContextWindowSize).toBe(100000);
        expect(result.data.modelSelectionCriteria.prioritizeSpeed).toBe(false);
        expect(result.data.modelSelectionCriteria.prioritizeCost).toBe(true);
        // Default values should still be present
        expect(result.data.enablePromptCompression).toBe(true);
      }
    });

    test('should reject invalid values', () => {
      const invalidConfig = {
        promptCompressionRatio: 1.5, // Out of range
        maxContextWindowSize: 0, // Zero
        deduplicationWindowMs: -1000 // Negative
      };
      
      const result = aiOptimizationConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.errors;
        const errorPaths = errors.map(e => e.path.join('.'));
        
        expect(errorPaths).toContain('promptCompressionRatio');
        expect(errorPaths).toContain('maxContextWindowSize');
        expect(errorPaths).toContain('deduplicationWindowMs');
      }
    });
  });

  describe('contextOptimizationConfigSchema', () => {
    test('should validate with defaults', () => {
      const result = contextOptimizationConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enableContextOptimization).toBe(true);
        expect(result.data.enableLazyContextLoading).toBe(true);
        expect(result.data.enableContextCompression).toBe(true);
        expect(result.data.contextCompressionRatio).toBe(0.7);
      }
    });

    test('should validate with custom values', () => {
      const customConfig = {
        enableContextOptimization: false,
        contextCompressionRatio: 0.5,
        maxContextFileSizeBytes: 500000,
        enableContextRelevanceScoring: false
      };
      
      const result = contextOptimizationConfigSchema.safeParse(customConfig);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enableContextOptimization).toBe(false);
        expect(result.data.contextCompressionRatio).toBe(0.5);
        expect(result.data.maxContextFileSizeBytes).toBe(500000);
        expect(result.data.enableContextRelevanceScoring).toBe(false);
        // Default values should still be present
        expect(result.data.enableLazyContextLoading).toBe(true);
      }
    });

    test('should reject invalid values', () => {
      const invalidConfig = {
        contextCompressionRatio: 2.0, // Out of range
        maxContextFileSizeBytes: -1000, // Negative
        contextRelevanceThreshold: 1.5 // Out of range
      };
      
      const result = contextOptimizationConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.errors;
        const errorPaths = errors.map(e => e.path.join('.'));
        
        expect(errorPaths).toContain('contextCompressionRatio');
        expect(errorPaths).toContain('maxContextFileSizeBytes');
        expect(errorPaths).toContain('contextRelevanceThreshold');
      }
    });
  });

  describe('monitoringConfigSchema', () => {
    test('should validate with defaults', () => {
      const result = monitoringConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enablePerformanceMonitoring).toBe(true);
        expect(result.data.monitoringIntervalMs).toBe(1000);
        expect(result.data.enableRealTimeMetrics).toBe(true);
        expect(result.data.enablePerformanceAlerts).toBe(true);
      }
    });

    test('should validate with custom values', () => {
      const customConfig = {
        enablePerformanceMonitoring: false,
        monitoringIntervalMs: 2000,
        enableAutoTuning: false,
        alertThresholds: {
          startupTimeMs: 200,
          memoryUsageMB: 150
        }
      };
      
      const result = monitoringConfigSchema.safeParse(customConfig);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.enablePerformanceMonitoring).toBe(false);
        expect(result.data.monitoringIntervalMs).toBe(2000);
        expect(result.data.enableAutoTuning).toBe(false);
        expect(result.data.alertThresholds.startupTimeMs).toBe(200);
        expect(result.data.alertThresholds.memoryUsageMB).toBe(150);
        // Default values should still be present
        expect(result.data.enableRealTimeMetrics).toBe(true);
      }
    });

    test('should reject invalid values', () => {
      const invalidConfig = {
        monitoringIntervalMs: 0, // Zero
        autoTuningSensitivity: 2.0, // Out of range
        alertThresholds: {
          startupTimeMs: -10, // Negative
          memoryUsageMB: 0 // Zero
        }
      };
      
      const result = monitoringConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.errors;
        const errorPaths = errors.map(e => e.path.join('.'));
        
        expect(errorPaths).toContain('monitoringIntervalMs');
        expect(errorPaths).toContain('autoTuningSensitivity');
        expect(errorPaths).toContain('alertThresholds.startupTimeMs');
        expect(errorPaths).toContain('alertThresholds.memoryUsageMB');
      }
    });
  });

  describe('performanceConfigSchema (main schema)', () => {
    test('should validate with defaults', () => {
      const result = performanceConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.level).toBe(PerformanceLevel.BALANCED);
        expect(result.data.targets.startupTimeMs).toBe(VIBEX_PERFORMANCE_TARGETS.startupTimeMs);
        expect(result.data.targets.memoryUsageMB).toBe(VIBEX_PERFORMANCE_TARGETS.memoryUsageMB);
        expect(result.data.enableExperimentalOptimizations).toBe(false);
        expect(result.data.version).toBe('1.0.0');
        
        // Sub-schemas should be present
        expect(result.data.caching).toBeDefined();
        expect(result.data.parallelExecution).toBeDefined();
        expect(result.data.streaming).toBeDefined();
        expect(result.data.memoryOptimization).toBeDefined();
        expect(result.data.aiOptimization).toBeDefined();
        expect(result.data.contextOptimization).toBeDefined();
        expect(result.data.monitoring).toBeDefined();
      }
    });

    test('should validate with custom values', () => {
      const customConfig = {
        level: PerformanceLevel.AGGRESSIVE,
        targets: {
          startupTimeMs: 20,
          memoryUsageMB: 10,
          bundleSizeMB: 2.5
        },
        enableExperimentalOptimizations: true,
        version: '1.1.0',
        // Just one sub-schema with custom values
        memoryOptimization: {
          gcThresholdMB: 100,
          maxHeapSizeMB: 300
        }
      };
      
      const result = performanceConfigSchema.safeParse(customConfig);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.level).toBe(PerformanceLevel.AGGRESSIVE);
        expect(result.data.targets.startupTimeMs).toBe(20);
        expect(result.data.targets.memoryUsageMB).toBe(10);
        expect(result.data.targets.bundleSizeMB).toBe(2.5);
        expect(result.data.enableExperimentalOptimizations).toBe(true);
        expect(result.data.version).toBe('1.1.0');
        
        // Custom memoryOptimization values
        expect(result.data.memoryOptimization.gcThresholdMB).toBe(100);
        expect(result.data.memoryOptimization.maxHeapSizeMB).toBe(300);
        
        // Other sub-schemas should have defaults
        expect(result.data.caching.enableResponseCaching).toBe(true);
        expect(result.data.parallelExecution.enableParallelProcessing).toBe(true);
      }
    });

    test('should reject invalid performance level', () => {
      const invalidConfig = {
        level: 'super-extreme' // Invalid performance level
      };
      
      const result = performanceConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.errors;
        const errorPaths = errors.map(e => e.path.join('.'));
        
        expect(errorPaths).toContain('level');
      }
    });

    test('should reject invalid target values', () => {
      const invalidConfig = {
        targets: {
          startupTimeMs: -10, // Negative
          memoryUsageMB: 0, // Zero
          aiResponseTimeMs: 'fast' // Wrong type
        }
      };
      
      const result = performanceConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.errors;
        const errorPaths = errors.map(e => e.path.join('.'));
        
        expect(errorPaths).toContain('targets.startupTimeMs');
        expect(errorPaths).toContain('targets.memoryUsageMB');
        expect(errorPaths).toContain('targets.aiResponseTimeMs');
      }
    });
  });

  describe('Performance benchmarks', () => {
    test('GEMINI_CLI_BENCHMARKS should have the correct structure', () => {
      expect(GEMINI_CLI_BENCHMARKS).toHaveProperty('startupTimeMs');
      expect(GEMINI_CLI_BENCHMARKS).toHaveProperty('memoryUsageMB');
      expect(GEMINI_CLI_BENCHMARKS).toHaveProperty('bundleSizeMB');
      expect(GEMINI_CLI_BENCHMARKS).toHaveProperty('aiResponseTimeMs');
      expect(GEMINI_CLI_BENCHMARKS).toHaveProperty('fileOperationTimeMs');
      expect(GEMINI_CLI_BENCHMARKS).toHaveProperty('contextLoadingTimeMs');
      
      expect(typeof GEMINI_CLI_BENCHMARKS.startupTimeMs).toBe('number');
      expect(GEMINI_CLI_BENCHMARKS.startupTimeMs).toBeGreaterThan(0);
    });
    
    test('VIBEX_PERFORMANCE_TARGETS should have 6x better values than Gemini', () => {
      expect(VIBEX_PERFORMANCE_TARGETS.startupTimeMs * 6).toBeCloseTo(GEMINI_CLI_BENCHMARKS.startupTimeMs);
      expect(VIBEX_PERFORMANCE_TARGETS.memoryUsageMB * 6).toBeCloseTo(GEMINI_CLI_BENCHMARKS.memoryUsageMB, 0);
      expect(VIBEX_PERFORMANCE_TARGETS.bundleSizeMB * 6).toBeCloseTo(GEMINI_CLI_BENCHMARKS.bundleSizeMB, 0);
      expect(VIBEX_PERFORMANCE_TARGETS.aiResponseTimeMs * 6).toBeCloseTo(GEMINI_CLI_BENCHMARKS.aiResponseTimeMs);
      expect(VIBEX_PERFORMANCE_TARGETS.fileOperationTimeMs * 6).toBeCloseTo(GEMINI_CLI_BENCHMARKS.fileOperationTimeMs, 0);
      expect(VIBEX_PERFORMANCE_TARGETS.contextLoadingTimeMs * 6).toBeCloseTo(GEMINI_CLI_BENCHMARKS.contextLoadingTimeMs, 0);
    });
  });
});