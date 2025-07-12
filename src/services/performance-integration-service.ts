/**
 * Performance Integration Service
 * 
 * Integrates the advanced PerformanceConfig system into the main VibeX application
 * to achieve 6x speed improvement over Gemini CLI through comprehensive optimization.
 * 
 * Key Integration Points:
 * - Application startup optimization
 * - Configuration system integration
 * - AI client performance optimization
 * - Memory management integration
 * - Real-time monitoring and auto-tuning
 */

import { EventEmitter } from 'events';
import { 
  PerformanceConfigManager,
  PerformanceLevel,
  type PerformanceConfigType,
  VIBEX_PERFORMANCE_TARGETS,
  GEMINI_CLI_BENCHMARKS,
  applyPerformanceOptimizations,
  memoryManager
} from '../config/performance-config.js';
import { PerformanceMonitoringSystem } from '../telemetry/performance-monitoring.js';
import { logger } from '../utils/logger.js';
import type { AppConfigType } from '../config/schema.js';

/**
 * Performance integration configuration
 */
export interface PerformanceIntegrationConfig {
  /** Enable performance integration */
  enabled: boolean;
  /** Performance level to apply */
  level: PerformanceLevel;
  /** Enable auto-tuning */
  enableAutoTuning: boolean;
  /** Enable startup optimizations */
  enableStartupOptimizations: boolean;
  /** Enable runtime optimizations */
  enableRuntimeOptimizations: boolean;
  /** Enable AI optimization integration */
  enableAIOptimization: boolean;
  /** Enable memory management integration */
  enableMemoryManagement: boolean;
}

/**
 * Performance integration service
 */
export class PerformanceIntegrationService extends EventEmitter {
  private performanceConfig: PerformanceConfigManager;
  private performanceMonitoring: PerformanceMonitoringSystem;
  private config: PerformanceIntegrationConfig;
  private startupTime: number = Date.now();
  private initialized: boolean = false;

  constructor(
    appConfig: AppConfigType,
    integrationConfig: Partial<PerformanceIntegrationConfig> = {}
  ) {
    super();

    // Default integration configuration
    this.config = {
      enabled: true,
      level: PerformanceLevel.BALANCED,
      enableAutoTuning: true,
      enableStartupOptimizations: true,
      enableRuntimeOptimizations: true,
      enableAIOptimization: true,
      enableMemoryManagement: true,
      ...integrationConfig
    };

    // Initialize performance monitoring
    this.performanceMonitoring = new PerformanceMonitoringSystem({
      enabled: this.config.enabled,
      trackComponentRendering: true,
      trackFunctionCalls: true,
      slowThresholdMs: 100,
      automaticBottleneckDetection: true
    });

    // Initialize performance configuration manager
    this.performanceConfig = new PerformanceConfigManager(
      {
        level: this.config.level,
        monitoring: {
          enablePerformanceMonitoring: this.config.enabled,
          enableAutoTuning: this.config.enableAutoTuning,
          monitoringIntervalMs: 1000,
          enableRealTimeMetrics: true,
          enablePerformanceAlerts: true,
          alertThresholds: {
            startupTimeMs: 100,
            memoryUsageMB: 80,
            aiResponseTimeMs: 2000,
            fileOperationTimeMs: 50
          },
          autoTuningSensitivity: 0.5,
          enablePerformanceProfiling: false,
          profilingSampleRate: 0.1
        }
      },
      this.performanceMonitoring
    );

    logger.info('PerformanceIntegrationService initialized', {
      level: this.config.level,
      enabled: this.config.enabled,
      targets: VIBEX_PERFORMANCE_TARGETS
    });
  }

  /**
   * Initialize performance optimizations during application startup
   */
  async initializeStartupOptimizations(): Promise<void> {
    if (!this.config.enableStartupOptimizations) {
      return;
    }

    try {
      logger.debug('Applying startup performance optimizations');

      // Apply Node.js optimizations
      const nodeOptimizations = this.performanceConfig.getConfig();
      applyPerformanceOptimizations({
        enableLazyLoading: true,
        enableAggressiveGC: nodeOptimizations.memoryOptimization.enableAutoGC,
        maxOldSpaceSize: nodeOptimizations.memoryOptimization.maxHeapSizeMB,
        deferHeavyModules: true,
        enableModuleCache: true,
        enableVirtualScrolling: true,
        reduceAnimations: false,
        enableContextCaching: nodeOptimizations.contextOptimization.enableContextOptimization,
        maxContextSize: nodeOptimizations.contextOptimization.maxContextFileSizeBytes,
        enableRequestBatching: nodeOptimizations.parallelExecution.enableRequestBatching,
        requestTimeout: 30000,
        enableMemoryCompression: true,
        enableStringDeduplication: true,
        maxHeapSize: nodeOptimizations.memoryOptimization.maxHeapSizeMB,
        enableWeakReferences: nodeOptimizations.memoryOptimization.enableWeakRefOptimization,
        gcInterval: nodeOptimizations.memoryOptimization.gcIntervalMs,
        enableObjectPooling: nodeOptimizations.memoryOptimization.enableObjectPooling
      });

      // Start memory management
      if (this.config.enableMemoryManagement) {
        memoryManager.start();
      }

      logger.info('Startup performance optimizations applied successfully');
    } catch (error) {
      logger.error('Failed to apply startup optimizations', error);
      throw error;
    }
  }

  /**
   * Initialize runtime performance optimizations
   */
  async initializeRuntimeOptimizations(): Promise<void> {
    if (!this.config.enableRuntimeOptimizations) {
      return;
    }

    try {
      logger.debug('Initializing runtime performance optimizations');

      // Set up performance event listeners
      this.performanceConfig.on('configUpdated', (data) => {
        logger.debug('Performance configuration changed', data);
        this.emit('configurationChanged', data);
      });

      // Monitor startup time using performance markers
      const startupDuration = Date.now() - this.startupTime;
      const markerId = this.performanceMonitoring.startMarker('startup_time');
      this.performanceMonitoring.endMarker(markerId);

      if (startupDuration > VIBEX_PERFORMANCE_TARGETS.startupTimeMs) {
        logger.warn('Startup time exceeded target', {
          actual: startupDuration,
          target: VIBEX_PERFORMANCE_TARGETS.startupTimeMs,
          geminiBaseline: GEMINI_CLI_BENCHMARKS.startupTimeMs
        });
      } else {
        const improvement = ((GEMINI_CLI_BENCHMARKS.startupTimeMs - startupDuration) / GEMINI_CLI_BENCHMARKS.startupTimeMs) * 100;
        logger.info('Startup performance target achieved', {
          actual: startupDuration,
          target: VIBEX_PERFORMANCE_TARGETS.startupTimeMs,
          improvement: `${improvement.toFixed(1)}% faster than Gemini CLI`
        });
      }

      this.initialized = true;
      logger.info('Runtime performance optimizations initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize runtime optimizations', error);
      throw error;
    }
  }

  /**
   * Get performance metrics and comparison with Gemini CLI
   */
  getPerformanceComparison(): {
    current: Record<string, number>;
    targets: Record<string, number>;
    geminiBaseline: Record<string, number>;
    improvements: Record<string, string>;
  } {
    const comparison = this.performanceConfig.getGeminiComparison();
    const profile = this.performanceMonitoring.getProfile();
    
    return {
      current: {
        startupTime: Date.now() - this.startupTime,
        memoryUsage: process.memoryUsage().heapUsed / (1024 * 1024),
        startupTimeFromProfile: profile.startupTime || 0
      },
      targets: VIBEX_PERFORMANCE_TARGETS as unknown as Record<string, number>,
      geminiBaseline: GEMINI_CLI_BENCHMARKS as unknown as Record<string, number>,
      improvements: Object.fromEntries(
        Object.entries(comparison.improvements).map(([k, v]) => [k, v.toString()])
      )
    };
  }

  /**
   * Update performance level and apply optimizations
   */
  async setPerformanceLevel(level: PerformanceLevel): Promise<void> {
    try {
      logger.info('Updating performance level', { from: this.config.level, to: level });
      
      this.config.level = level;
      this.performanceConfig.setPerformanceLevel(level);
      
      // Re-apply optimizations for new level
      if (this.initialized) {
        await this.initializeRuntimeOptimizations();
      }
      
      logger.info('Performance level updated successfully', { level });
      this.emit('performanceLevelChanged', level);
    } catch (error) {
      logger.error('Failed to update performance level', error);
      throw error;
    }
  }

  /**
   * Get current performance configuration
   */
  getPerformanceConfig(): PerformanceConfigType {
    return this.performanceConfig.getConfig();
  }

  /**
   * Update performance configuration
   */
  updatePerformanceConfig(updates: Partial<PerformanceConfigType>): void {
    this.performanceConfig.updateConfig(updates);
  }

  /**
   * Get performance monitoring system
   */
  getPerformanceMonitoring(): PerformanceMonitoringSystem {
    return this.performanceMonitoring;
  }

  /**
   * Check if performance targets are being met
   */
  checkPerformanceTargets(): {
    meetsTargets: boolean;
    violations: string[];
    score: number;
    recommendations: string[];
  } {
    const profile = this.performanceMonitoring.getProfile();
    // Create mock metrics from profile data for compatibility
    const mockMetrics = {
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage().heapUsed / (1024 * 1024),
      startupTime: profile.startupTime || (Date.now() - this.startupTime)
    };
    const result = this.performanceConfig.checkPerformanceTargets(mockMetrics as any);
    
    // Add recommendations based on violations
    const recommendations: string[] = [];
    
    result.violations.forEach(violation => {
      if (violation.includes('Memory usage')) {
        recommendations.push('Consider reducing cache sizes or enabling aggressive garbage collection');
      }
      if (violation.includes('CPU usage')) {
        recommendations.push('Consider reducing concurrent operations or enabling worker threads');
      }
    });

    if (result.score > 90) {
      recommendations.push('Performance excellent - consider upgrading to next optimization level');
    } else if (result.score < 50) {
      recommendations.push('Performance issues detected - consider downgrading optimization level');
    }

    return {
      ...result,
      recommendations
    };
  }

  /**
   * Enable or disable AI optimization integration
   */
  setAIOptimizationEnabled(enabled: boolean): void {
    this.config.enableAIOptimization = enabled;
    
    const aiConfig = this.performanceConfig.getConfig().aiOptimization;
    this.performanceConfig.updateConfig({
      aiOptimization: {
        ...aiConfig,
        enableAIOptimization: enabled
      }
    });
    
    logger.info('AI optimization integration updated', { enabled });
    this.emit('aiOptimizationChanged', enabled);
  }

  /**
   * Get performance statistics for reporting
   */
  getPerformanceStats(): {
    uptime: number;
    startupTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    performanceLevel: PerformanceLevel;
    targetsMetric: boolean;
    improvementOverGemini: Record<string, string>;
  } {
    const comparison = this.getPerformanceComparison();
    const targets = this.checkPerformanceTargets();
    
    return {
      uptime: Date.now() - this.startupTime,
      startupTime: Date.now() - this.startupTime,
      memoryUsage: process.memoryUsage(),
      performanceLevel: this.config.level,
      targetsMetric: targets.meetsTargets,
      improvementOverGemini: comparison.improvements
    };
  }

  /**
   * Shutdown performance integration service
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down performance integration service');
      
      // Stop memory management
      if (this.config.enableMemoryManagement) {
        memoryManager.stop();
      }
      
      // Destroy performance config manager
      this.performanceConfig.destroy();
      
      // Remove all listeners
      this.removeAllListeners();
      
      logger.info('Performance integration service shutdown complete');
    } catch (error) {
      logger.error('Error during performance integration service shutdown', error);
      throw error;
    }
  }
}

/**
 * Create performance integration service
 */
export function createPerformanceIntegrationService(
  appConfig: AppConfigType,
  integrationConfig?: Partial<PerformanceIntegrationConfig>
): PerformanceIntegrationService {
  return new PerformanceIntegrationService(appConfig, integrationConfig);
}

/**
 * Global performance integration service instance
 */
let globalPerformanceService: PerformanceIntegrationService | null = null;

/**
 * Get or create global performance integration service
 */
export function getPerformanceIntegrationService(
  appConfig?: AppConfigType,
  integrationConfig?: Partial<PerformanceIntegrationConfig>
): PerformanceIntegrationService {
  if (!globalPerformanceService && appConfig) {
    globalPerformanceService = createPerformanceIntegrationService(appConfig, integrationConfig);
  }
  
  if (!globalPerformanceService) {
    throw new Error('Performance integration service not initialized. Call with appConfig first.');
  }
  
  return globalPerformanceService;
}

/**
 * Shutdown global performance integration service
 */
export async function shutdownPerformanceIntegrationService(): Promise<void> {
  if (globalPerformanceService) {
    await globalPerformanceService.shutdown();
    globalPerformanceService = null;
  }
} 