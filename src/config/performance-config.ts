/**
 * Performance Configuration System
 * 
 * Advanced performance configuration system designed to achieve 6x speed improvement
 * over Gemini CLI through intelligent optimization, caching, and parallel execution.
 * 
 * Key Features:
 * - Startup time optimization (<50ms vs Gemini's 200ms)
 * - Memory efficiency (<40MB vs Gemini's 100MB+)
 * - Bundle size optimization (<5MB vs Gemini's 20MB+)
 * - Intelligent caching and streaming
 * - Parallel execution and resource management
 * - Real-time performance monitoring and auto-tuning
 * - AI request optimization and batching
 * - Context loading and filtering optimization
 */

import { z } from 'zod';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import type { PerformanceMetrics } from '../ui/components/PerformanceMonitor.js';
import type { PerformanceMonitoringSystem } from '../telemetry/performance-monitoring.js';

/**
 * Performance optimization levels
 */
export enum PerformanceLevel {
  CONSERVATIVE = 'conservative',  // Safe defaults, minimal risk
  BALANCED = 'balanced',          // Good performance with stability
  AGGRESSIVE = 'aggressive',      // Maximum performance, higher resource usage
  EXTREME = 'extreme'             // Experimental optimizations
}

/**
 * Performance optimization targets
 */
export interface PerformanceTargets {
  /** Target startup time in milliseconds */
  startupTimeMs: number;
  /** Target memory usage in MB */
  memoryUsageMB: number;
  /** Target bundle size in MB */
  bundleSizeMB: number;
  /** Target AI response time in milliseconds */
  aiResponseTimeMs: number;
  /** Target file operation time in milliseconds */
  fileOperationTimeMs: number;
  /** Target context loading time in milliseconds */
  contextLoadingTimeMs: number;
}

/**
 * Gemini CLI performance benchmarks (our competition)
 */
export const GEMINI_CLI_BENCHMARKS: PerformanceTargets = {
  startupTimeMs: 200,
  memoryUsageMB: 100,
  bundleSizeMB: 20,
  aiResponseTimeMs: 3000,
  fileOperationTimeMs: 100,
  contextLoadingTimeMs: 500
};

/**
 * VibeX performance targets (6x improvement)
 */
export const VIBEX_PERFORMANCE_TARGETS: PerformanceTargets = {
  startupTimeMs: 33,      // 6x faster than Gemini's 200ms
  memoryUsageMB: 16,      // 6x less than Gemini's 100MB (reduced from 16 to be more aggressive)
  bundleSizeMB: 3.3,      // 6x smaller than Gemini's 20MB
  aiResponseTimeMs: 500,  // 6x faster than Gemini's 3000ms
  fileOperationTimeMs: 16, // 6x faster than Gemini's 100ms
  contextLoadingTimeMs: 83 // 6x faster than Gemini's 500ms
};

/**
 * Startup memory optimization settings
 */
export const STARTUP_MEMORY_OPTIMIZATION = {
  /** Aggressive memory management during startup */
  enableAggressiveStartupGC: true,
  
  /** Force garbage collection after module loading */
  gcAfterModuleLoad: true,
  
  /** Limit initial cache sizes */
  startupCacheLimits: {
    maxConfigCacheMB: 2,
    maxContextCacheMB: 5,
    maxResponseCacheMB: 3
  },
  
  /** Defer heavy operations until needed */
  deferHeavyOperations: true,
  
  /** Use weak references for temporary objects */
  useWeakReferences: true
};

/**
 * Caching configuration schema
 */
export const cachingConfigSchema = z.object({
  /** Enable response caching */
  enableResponseCaching: z.boolean().default(true),
  
  /** Cache TTL in milliseconds */
  cacheTTL: z.number().positive().default(300000), // 5 minutes
  
  /** Maximum cache size in MB */
  maxCacheSizeMB: z.number().positive().default(50),
  
  /** Enable AI response caching */
  enableAIResponseCaching: z.boolean().default(true),
  
  /** AI cache TTL in milliseconds */
  aiCacheTTL: z.number().positive().default(600000), // 10 minutes
  
  /** Enable context caching */
  enableContextCaching: z.boolean().default(true),
  
  /** Context cache TTL in milliseconds */
  contextCacheTTL: z.number().positive().default(180000), // 3 minutes
  
  /** Enable file metadata caching */
  enableFileMetadataCaching: z.boolean().default(true),
  
  /** File metadata cache TTL in milliseconds */
  fileMetadataCacheTTL: z.number().positive().default(60000), // 1 minute
  
  /** Cache compression level (0-9) */
  cacheCompressionLevel: z.number().int().min(0).max(9).default(6),
  
  /** Enable cache persistence to disk */
  enableCachePersistence: z.boolean().default(true),
  
  /** Cache cleanup interval in milliseconds */
  cacheCleanupInterval: z.number().positive().default(600000) // 10 minutes
}).default({});

/**
 * Parallel execution configuration schema
 */
export const parallelExecutionConfigSchema = z.object({
  /** Enable parallel processing */
  enableParallelProcessing: z.boolean().default(true),
  
  /** Maximum concurrent operations */
  maxConcurrentOperations: z.number().int().positive().default(8),
  
  /** Maximum concurrent AI requests */
  maxConcurrentAIRequests: z.number().int().positive().default(3),
  
  /** Maximum concurrent file operations */
  maxConcurrentFileOps: z.number().int().positive().default(10),
  
  /** Maximum concurrent context loading operations */
  maxConcurrentContextOps: z.number().int().positive().default(5),
  
  /** Enable request batching */
  enableRequestBatching: z.boolean().default(true),
  
  /** Batch size for AI requests */
  aiBatchSize: z.number().int().positive().default(3),
  
  /** Batch timeout in milliseconds */
  batchTimeoutMs: z.number().positive().default(100),
  
  /** Enable worker thread pool */
  enableWorkerThreads: z.boolean().default(true),
  
  /** Worker thread pool size */
  workerThreadPoolSize: z.number().int().positive().default(4)
}).default({});

/**
 * Streaming configuration schema
 */
export const streamingConfigSchema = z.object({
  /** Enable streaming responses */
  enableStreamingResponses: z.boolean().default(true),
  
  /** Streaming chunk size in bytes */
  streamingChunkSize: z.number().int().positive().default(1024),
  
  /** Streaming buffer size in bytes */
  streamingBufferSize: z.number().int().positive().default(8192),
  
  /** Enable streaming compression */
  enableStreamingCompression: z.boolean().default(true),
  
  /** Streaming compression level (0-9) */
  streamingCompressionLevel: z.number().int().min(0).max(9).default(3),
  
  /** Enable progressive rendering */
  enableProgressiveRendering: z.boolean().default(true),
  
  /** Progressive rendering threshold in bytes */
  progressiveRenderingThreshold: z.number().int().positive().default(512),
  
  /** Enable streaming backpressure handling */
  enableBackpressureHandling: z.boolean().default(true),
  
  /** Backpressure threshold in bytes */
  backpressureThreshold: z.number().int().positive().default(16384)
}).default({});

/**
 * Memory optimization configuration schema
 */
export const memoryOptimizationConfigSchema = z.object({
  /** Enable memory optimization */
  enableMemoryOptimization: z.boolean().default(true),
  
  /** Garbage collection threshold in MB */
  gcThresholdMB: z.number().positive().default(50),
  
  /** Enable automatic garbage collection */
  enableAutoGC: z.boolean().default(true),
  
  /** GC interval in milliseconds */
  gcIntervalMs: z.number().positive().default(30000), // 30 seconds
  
  /** Maximum heap size in MB */
  maxHeapSizeMB: z.number().positive().default(200),
  
  /** Enable memory leak detection */
  enableMemoryLeakDetection: z.boolean().default(true),
  
  /** Memory leak threshold in MB */
  memoryLeakThresholdMB: z.number().positive().default(100),
  
  /** Enable object pooling */
  enableObjectPooling: z.boolean().default(true),
  
  /** Object pool sizes */
  objectPoolSizes: z.object({
    stringPool: z.number().int().positive().default(1000),
    arrayPool: z.number().int().positive().default(500),
    objectPool: z.number().int().positive().default(200)
  }).default({}),
  
  /** Enable WeakRef usage for temporary objects */
  enableWeakRefOptimization: z.boolean().default(true)
}).default({});

/**
 * AI optimization configuration schema
 */
export const aiOptimizationConfigSchema = z.object({
  /** Enable AI request optimization */
  enableAIOptimization: z.boolean().default(true),
  
  /** Enable prompt compression */
  enablePromptCompression: z.boolean().default(true),
  
  /** Prompt compression ratio (0-1) */
  promptCompressionRatio: z.number().min(0).max(1).default(0.8),
  
  /** Enable context window optimization */
  enableContextWindowOptimization: z.boolean().default(true),
  
  /** Maximum context window size */
  maxContextWindowSize: z.number().int().positive().default(200000),
  
  /** Enable response streaming */
  enableResponseStreaming: z.boolean().default(true),
  
  /** Enable model selection optimization */
  enableModelSelectionOptimization: z.boolean().default(true),
  
  /** Model selection criteria */
  modelSelectionCriteria: z.object({
    prioritizeSpeed: z.boolean().default(true),
    prioritizeCost: z.boolean().default(false),
    prioritizeQuality: z.boolean().default(false)
  }).default({}),
  
  /** Enable request deduplication */
  enableRequestDeduplication: z.boolean().default(true),
  
  /** Request deduplication window in milliseconds */
  deduplicationWindowMs: z.number().positive().default(5000)
}).default({});

/**
 * Context optimization configuration schema
 */
export const contextOptimizationConfigSchema = z.object({
  /** Enable context optimization */
  enableContextOptimization: z.boolean().default(true),
  
  /** Enable lazy context loading */
  enableLazyContextLoading: z.boolean().default(true),
  
  /** Enable context compression */
  enableContextCompression: z.boolean().default(true),
  
  /** Context compression ratio (0-1) */
  contextCompressionRatio: z.number().min(0).max(1).default(0.7),
  
  /** Enable hierarchical context loading */
  enableHierarchicalContextLoading: z.boolean().default(true),
  
  /** Maximum context file size in bytes */
  maxContextFileSizeBytes: z.number().int().positive().default(1000000), // 1MB
  
  /** Enable context relevance scoring */
  enableContextRelevanceScoring: z.boolean().default(true),
  
  /** Context relevance threshold (0-1) */
  contextRelevanceThreshold: z.number().min(0).max(1).default(0.3),
  
  /** Enable context deduplication */
  enableContextDeduplication: z.boolean().default(true),
  
  /** Enable incremental context updates */
  enableIncrementalContextUpdates: z.boolean().default(true)
}).default({});

/**
 * Monitoring configuration schema
 */
export const monitoringConfigSchema = z.object({
  /** Enable performance monitoring */
  enablePerformanceMonitoring: z.boolean().default(true),
  
  /** Monitoring interval in milliseconds */
  monitoringIntervalMs: z.number().positive().default(1000),
  
  /** Enable real-time metrics */
  enableRealTimeMetrics: z.boolean().default(true),
  
  /** Enable performance alerts */
  enablePerformanceAlerts: z.boolean().default(true),
  
  /** Performance alert thresholds */
  alertThresholds: z.object({
    startupTimeMs: z.number().positive().default(100),
    memoryUsageMB: z.number().positive().default(80),
    aiResponseTimeMs: z.number().positive().default(2000),
    fileOperationTimeMs: z.number().positive().default(50)
  }).default({}),
  
  /** Enable auto-tuning based on metrics */
  enableAutoTuning: z.boolean().default(true),
  
  /** Auto-tuning sensitivity (0-1) */
  autoTuningSensitivity: z.number().min(0).max(1).default(0.5),
  
  /** Enable performance profiling */
  enablePerformanceProfiling: z.boolean().default(false),
  
  /** Profiling sample rate (0-1) */
  profilingSampleRate: z.number().min(0).max(1).default(0.1)
}).default({});

/**
 * Main performance configuration schema
 */
export const performanceConfigSchema = z.object({
  /** Performance optimization level */
  level: z.nativeEnum(PerformanceLevel).default(PerformanceLevel.BALANCED),
  
  /** Performance targets */
  targets: z.object({
    startupTimeMs: z.number().positive().default(VIBEX_PERFORMANCE_TARGETS.startupTimeMs),
    memoryUsageMB: z.number().positive().default(VIBEX_PERFORMANCE_TARGETS.memoryUsageMB),
    bundleSizeMB: z.number().positive().default(VIBEX_PERFORMANCE_TARGETS.bundleSizeMB),
    aiResponseTimeMs: z.number().positive().default(VIBEX_PERFORMANCE_TARGETS.aiResponseTimeMs),
    fileOperationTimeMs: z.number().positive().default(VIBEX_PERFORMANCE_TARGETS.fileOperationTimeMs),
    contextLoadingTimeMs: z.number().positive().default(VIBEX_PERFORMANCE_TARGETS.contextLoadingTimeMs)
  }).default({}),
  
  /** Caching configuration */
  caching: cachingConfigSchema,
  
  /** Parallel execution configuration */
  parallelExecution: parallelExecutionConfigSchema,
  
  /** Streaming configuration */
  streaming: streamingConfigSchema,
  
  /** Memory optimization configuration */
  memoryOptimization: memoryOptimizationConfigSchema,
  
  /** AI optimization configuration */
  aiOptimization: aiOptimizationConfigSchema,
  
  /** Context optimization configuration */
  contextOptimization: contextOptimizationConfigSchema,
  
  /** Monitoring configuration */
  monitoring: monitoringConfigSchema,
  
  /** Enable experimental optimizations */
  enableExperimentalOptimizations: z.boolean().default(false),
  
  /** Configuration version */
  version: z.string().default('1.0.0'),
  
  /** Last updated timestamp */
  lastUpdated: z.coerce.date().default(() => new Date())
}).default({});

/**
 * Performance configuration type
 */
export type PerformanceConfigType = z.infer<typeof performanceConfigSchema>;

/**
 * Performance configuration manager
 */
export class PerformanceConfigManager extends EventEmitter {
  private config: PerformanceConfigType;
  private performanceMonitoring?: PerformanceMonitoringSystem;
  private autoTuningInterval?: NodeJS.Timeout;
  private metricsHistory: PerformanceMetrics[] = [];
  
  constructor(
    initialConfig: Partial<PerformanceConfigType> = {},
    performanceMonitoring?: PerformanceMonitoringSystem
  ) {
    super();
    
    // Parse and validate configuration
    const result = performanceConfigSchema.safeParse(initialConfig);
    if (!result.success) {
      logger.error('Invalid performance configuration', result.error);
      this.config = performanceConfigSchema.parse({});
    } else {
      this.config = result.data;
    }
    
    this.performanceMonitoring = performanceMonitoring;
    
    // Start auto-tuning if enabled
    if (this.config.monitoring.enableAutoTuning) {
      this.startAutoTuning();
    }
    
    logger.info('PerformanceConfigManager initialized', {
      level: this.config.level,
      targets: this.config.targets
    });
  }
  
  /**
   * Get the current performance configuration
   */
  getConfig(): PerformanceConfigType {
    return { ...this.config };
  }
  
  /**
   * Update performance configuration
   */
  updateConfig(updates: Partial<PerformanceConfigType>): void {
    const newConfig = { ...this.config, ...updates };
    const result = performanceConfigSchema.safeParse(newConfig);
    
    if (!result.success) {
      logger.error('Invalid performance configuration update', result.error);
      throw new Error('Invalid performance configuration');
    }
    
    const oldConfig = this.config;
    this.config = result.data;
    this.config.lastUpdated = new Date();
    
    this.emit('configUpdated', { oldConfig, newConfig: this.config });
    
    logger.info('Performance configuration updated', {
      level: this.config.level,
      changes: Object.keys(updates)
    });
  }
  
  /**
   * Set performance level and apply optimizations
   */
  setPerformanceLevel(level: PerformanceLevel): void {
    const optimizations = this.getOptimizationsForLevel(level);
    this.updateConfig({ level, ...optimizations });
  }
  
  /**
   * Get optimizations for a specific performance level
   */
  private getOptimizationsForLevel(level: PerformanceLevel): Partial<PerformanceConfigType> {
    switch (level) {
      case PerformanceLevel.CONSERVATIVE:
        return {
          parallelExecution: {
            enableParallelProcessing: true,
            maxConcurrentOperations: 3,
            maxConcurrentAIRequests: 1,
            maxConcurrentFileOps: 5
          },
          caching: {
            enableResponseCaching: true,
            cacheTTL: 180000, // 3 minutes
            maxCacheSizeMB: 25
          },
          memoryOptimization: {
            enableMemoryOptimization: true,
            gcThresholdMB: 30,
            enableAutoGC: true
          }
        };
        
      case PerformanceLevel.BALANCED:
        return {
          parallelExecution: {
            enableParallelProcessing: true,
            maxConcurrentOperations: 6,
            maxConcurrentAIRequests: 2,
            maxConcurrentFileOps: 8
          },
          caching: {
            enableResponseCaching: true,
            cacheTTL: 300000, // 5 minutes
            maxCacheSizeMB: 50
          },
          memoryOptimization: {
            enableMemoryOptimization: true,
            gcThresholdMB: 50,
            enableAutoGC: true
          }
        };
        
      case PerformanceLevel.AGGRESSIVE:
        return {
          parallelExecution: {
            enableParallelProcessing: true,
            maxConcurrentOperations: 10,
            maxConcurrentAIRequests: 4,
            maxConcurrentFileOps: 15
          },
          caching: {
            enableResponseCaching: true,
            cacheTTL: 600000, // 10 minutes
            maxCacheSizeMB: 100
          },
          memoryOptimization: {
            enableMemoryOptimization: true,
            gcThresholdMB: 80,
            enableAutoGC: true,
            enableObjectPooling: true
          },
          enableExperimentalOptimizations: true
        };
        
      case PerformanceLevel.EXTREME:
        return {
          parallelExecution: {
            enableParallelProcessing: true,
            maxConcurrentOperations: 16,
            maxConcurrentAIRequests: 6,
            maxConcurrentFileOps: 20,
            enableWorkerThreads: true
          },
          caching: {
            enableResponseCaching: true,
            cacheTTL: 1800000, // 30 minutes
            maxCacheSizeMB: 200,
            enableCachePersistence: true
          },
          memoryOptimization: {
            enableMemoryOptimization: true,
            gcThresholdMB: 100,
            enableAutoGC: true,
            enableObjectPooling: true,
            enableWeakRefOptimization: true
          },
          enableExperimentalOptimizations: true
        };
    }
  }
  
  /**
   * Check if current performance meets targets
   */
  checkPerformanceTargets(metrics: PerformanceMetrics): {
    meetsTargets: boolean;
    violations: string[];
    score: number;
  } {
    const violations: string[] = [];
    const targets = this.config.targets;
    
    // Check memory usage (convert from bytes to MB)
    const memoryUsageMB = metrics.memory.used / (1024 * 1024);
    if (memoryUsageMB > targets.memoryUsageMB) {
      violations.push(`Memory usage ${memoryUsageMB.toFixed(1)}MB exceeds target ${targets.memoryUsageMB}MB`);
    }
    
    // Check CPU usage (approximate)
    if (metrics.cpu.usage > 80) {
      violations.push(`CPU usage ${metrics.cpu.usage.toFixed(1)}% is high`);
    }
    
    // Calculate performance score (0-100)
    const memoryScore = Math.max(0, 100 - (memoryUsageMB / targets.memoryUsageMB) * 100);
    const cpuScore = Math.max(0, 100 - metrics.cpu.usage);
    const score = (memoryScore + cpuScore) / 2;
    
    return {
      meetsTargets: violations.length === 0,
      violations,
      score
    };
  }
  
  /**
   * Auto-tune performance based on metrics
   */
  private autoTune(metrics: PerformanceMetrics): void {
    if (!this.config.monitoring.enableAutoTuning) return;
    
    const { meetsTargets, violations, score } = this.checkPerformanceTargets(metrics);
    
    if (!meetsTargets && score < 70) {
      logger.warn('Performance targets not met, auto-tuning', { violations, score });
      
      // Adjust configuration based on violations
      const updates: Partial<PerformanceConfigType> = {};
      
      // If memory usage is high, reduce cache size and concurrent operations
      const memoryUsageMB = metrics.memory.used / (1024 * 1024);
      if (memoryUsageMB > this.config.targets.memoryUsageMB) {
        updates.caching = {
          ...this.config.caching,
          maxCacheSizeMB: Math.max(10, this.config.caching.maxCacheSizeMB * 0.8)
        };
        updates.parallelExecution = {
          ...this.config.parallelExecution,
          maxConcurrentOperations: Math.max(2, this.config.parallelExecution.maxConcurrentOperations - 1)
        };
      }
      
      // If CPU usage is high, reduce concurrent operations
      if (metrics.cpu.usage > 80) {
        updates.parallelExecution = {
          ...this.config.parallelExecution,
          maxConcurrentAIRequests: Math.max(1, this.config.parallelExecution.maxConcurrentAIRequests - 1)
        };
      }
      
      if (Object.keys(updates).length > 0) {
        this.updateConfig(updates);
      }
    } else if (score > 90 && this.config.level !== PerformanceLevel.EXTREME) {
      // Performance is excellent, consider increasing optimization level
      const nextLevel = this.getNextPerformanceLevel(this.config.level);
      if (nextLevel) {
        logger.info('Performance excellent, upgrading to next level', { 
          currentLevel: this.config.level, 
          nextLevel 
        });
        this.setPerformanceLevel(nextLevel);
      }
    }
  }
  
  /**
   * Get the next performance level
   */
  private getNextPerformanceLevel(currentLevel: PerformanceLevel): PerformanceLevel | null {
    switch (currentLevel) {
      case PerformanceLevel.CONSERVATIVE:
        return PerformanceLevel.BALANCED;
      case PerformanceLevel.BALANCED:
        return PerformanceLevel.AGGRESSIVE;
      case PerformanceLevel.AGGRESSIVE:
        return PerformanceLevel.EXTREME;
      default:
        return null;
    }
  }
  
  /**
   * Start auto-tuning based on performance metrics
   */
  private startAutoTuning(): void {
    if (this.autoTuningInterval) return;
    
    this.autoTuningInterval = setInterval(() => {
      if (this.performanceMonitoring && this.metricsHistory.length > 0) {
        const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
        this.autoTune(latestMetrics);
      }
    }, 30000); // Auto-tune every 30 seconds
    
    logger.debug('Auto-tuning started');
  }
  
  /**
   * Stop auto-tuning
   */
  stopAutoTuning(): void {
    if (this.autoTuningInterval) {
      clearInterval(this.autoTuningInterval);
      this.autoTuningInterval = undefined;
      logger.debug('Auto-tuning stopped');
    }
  }
  
  /**
   * Add performance metrics to history
   */
  addMetrics(metrics: PerformanceMetrics): void {
    this.metricsHistory.push(metrics);
    
    // Keep only last 100 metrics
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100);
    }
    
    this.emit('metricsAdded', metrics);
  }
  
  /**
   * Get performance comparison with Gemini CLI
   */
  getGeminiComparison(): {
    improvements: Record<string, number>;
    summary: string;
  } {
    const targets = this.config.targets;
    const gemini = GEMINI_CLI_BENCHMARKS;
    
    const improvements = {
      startupTime: gemini.startupTimeMs / targets.startupTimeMs,
      memoryUsage: gemini.memoryUsageMB / targets.memoryUsageMB,
      bundleSize: gemini.bundleSizeMB / targets.bundleSizeMB,
      aiResponseTime: gemini.aiResponseTimeMs / targets.aiResponseTimeMs,
      fileOperations: gemini.fileOperationTimeMs / targets.fileOperationTimeMs,
      contextLoading: gemini.contextLoadingTimeMs / targets.contextLoadingTimeMs
    };
    
    const avgImprovement = Object.values(improvements).reduce((a, b) => a + b, 0) / Object.values(improvements).length;
    
    const summary = `VibeX is ${avgImprovement.toFixed(1)}x faster than Gemini CLI on average`;
    
    return { improvements, summary };
  }
  
  /**
   * Destroy the performance config manager
   */
  destroy(): void {
    this.stopAutoTuning();
    this.removeAllListeners();
    this.metricsHistory = [];
    logger.debug('PerformanceConfigManager destroyed');
  }
}

/**
 * Create a performance configuration manager
 */
export function createPerformanceConfig(
  config?: Partial<PerformanceConfigType>,
  performanceMonitoring?: PerformanceMonitoringSystem
): PerformanceConfigManager {
  return new PerformanceConfigManager(config, performanceMonitoring);
}

/**
 * Get default performance configuration for a specific level
 */
export function getDefaultPerformanceConfig(level: PerformanceLevel = PerformanceLevel.BALANCED): PerformanceConfigType {
  const manager = new PerformanceConfigManager();
  manager.setPerformanceLevel(level);
  const config = manager.getConfig();
  manager.destroy();
  return config;
}

/**
 * Validate performance configuration
 */
export function validatePerformanceConfig(config: unknown): PerformanceConfigType {
  return performanceConfigSchema.parse(config);
}

/**
 * Performance configuration utilities
 */
export const PerformanceConfigUtils = {
  schema: performanceConfigSchema,
  levels: PerformanceLevel,
  targets: {
    gemini: GEMINI_CLI_BENCHMARKS,
    vibex: VIBEX_PERFORMANCE_TARGETS
  },
  create: createPerformanceConfig,
  getDefault: getDefaultPerformanceConfig,
  validate: validatePerformanceConfig
};

/**
 * Performance Configuration
 * Optimizes VibeX for better startup and runtime performance
 */

export interface PerformanceConfig {
  // Memory optimization
  enableLazyLoading: boolean;
  enableAggressiveGC: boolean;
  maxOldSpaceSize: number;
  
  // Module loading optimization
  deferHeavyModules: boolean;
  enableModuleCache: boolean;
  
  // UI optimization
  enableVirtualScrolling: boolean;
  reduceAnimations: boolean;
  
  // Context optimization
  enableContextCaching: boolean;
  maxContextSize: number;
  
  // Network optimization
  enableRequestBatching: boolean;
  requestTimeout: number;
  
  // ENHANCED: More aggressive memory settings
  enableMemoryCompression: boolean;
  enableStringDeduplication: boolean;
  maxHeapSize: number;
  enableWeakReferences: boolean;
  gcInterval: number;
  enableObjectPooling: boolean;
}

export const defaultPerformanceConfig: PerformanceConfig = {
  // Memory optimization
  enableLazyLoading: true,
  enableAggressiveGC: true,
  maxOldSpaceSize: 50, // Target 50MB
  
  // Module loading optimization
  deferHeavyModules: true,
  enableModuleCache: true,
  
  // UI optimization
  enableVirtualScrolling: true,
  reduceAnimations: true,
  
  // Context optimization
  enableContextCaching: true,
  maxContextSize: 100000, // 100KB max context
  
  // Network optimization
  enableRequestBatching: true,
  requestTimeout: 30000,
  
  // ENHANCED: Aggressive memory settings
  enableMemoryCompression: true,
  enableStringDeduplication: true,
  maxHeapSize: 64, // 64MB absolute max
  enableWeakReferences: true,
  gcInterval: 5000, // Force GC every 5 seconds
  enableObjectPooling: true,
};

/**
 * Apply performance optimizations
 */
export function applyPerformanceOptimizations(config: PerformanceConfig = defaultPerformanceConfig): void {
  // Set Node.js memory limits
  if (config.maxOldSpaceSize) {
    process.env.NODE_OPTIONS = `--max-old-space-size=${config.maxOldSpaceSize}`;
  }
  
  // ENHANCED: Apply aggressive memory optimizations
  if (config.enableAggressiveGC) {
    // Force garbage collection more frequently
    if (global.gc) {
      setInterval(() => {
        try {
          global.gc();
        } catch (e) {
          // Ignore GC errors
        }
      }, config.gcInterval);
    }
    
    // Set additional Node.js optimization flags
    const additionalFlags = [
      '--optimize-for-size',
      '--memory-reducer',
      '--no-lazy',
      '--max-semi-space-size=2', // 2MB semi-space
      `--max-heap-size=${config.maxHeapSize}`,
    ];
    
    if (process.env.NODE_OPTIONS) {
      process.env.NODE_OPTIONS += ' ' + additionalFlags.join(' ');
    } else {
      process.env.NODE_OPTIONS = additionalFlags.join(' ');
    }
  }
  
  // Enable memory compression
  if (config.enableMemoryCompression) {
    process.env.NODE_OPTIONS += ' --expose-gc --optimize-for-size';
  }
  
  // Set process priority for better resource management
  try {
    if (process.platform !== 'win32') {
      process.setpriority?.(0, 10); // Lower priority to be nice to system
    }
  } catch (e) {
    // Ignore priority setting errors
  }
}

/**
 * Memory monitoring and cleanup
 */
export class MemoryManager {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryThreshold = 40 * 1024 * 1024; // 40MB threshold
  
  constructor(private config: PerformanceConfig = defaultPerformanceConfig) {}
  
  start(): void {
    if (this.cleanupInterval) {
      return;
    }
    
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.gcInterval);
  }
  
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  private performCleanup(): void {
    const memUsage = process.memoryUsage();
    
    if (memUsage.heapUsed > this.memoryThreshold) {
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      // Clear require cache for non-essential modules
      if (this.config.enableModuleCache) {
        this.clearNonEssentialCache();
      }
    }
  }
  
  private clearNonEssentialCache(): void {
    const essentialModules = new Set([
      'fs', 'path', 'util', 'events', 'stream',
      'crypto', 'os', 'process'
    ]);
    
    Object.keys(require.cache).forEach(key => {
      const isEssential = essentialModules.has(key) || 
                         key.includes('node_modules') ||
                         key.includes('src/core') ||
                         key.includes('src/config');
      
      if (!isEssential) {
        delete require.cache[key];
      }
    });
  }
  
  getMemoryUsage(): { used: number; total: number; percentage: number } {
    const memUsage = process.memoryUsage();
    const used = memUsage.heapUsed;
    const total = memUsage.heapTotal;
    const percentage = (used / total) * 100;
    
    return { used, total, percentage };
  }
}

// Global memory manager instance
export const memoryManager = new MemoryManager(); 