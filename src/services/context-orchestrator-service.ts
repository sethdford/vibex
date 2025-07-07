/**
 * Context Orchestrator Service - Clean Architecture like Gemini CLI
 * 
 * Single Responsibility: Orchestrate context operations using composed services
 * - Coordinate between loading, variable, merge, and cache services
 * - Provide unified API for context operations
 * - Handle errors and events
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { MemoryOrchestrator, createMemoryServices } from './memory-services/index.js';

// Services
import { 
  ContextLoadingService, 
  createContextLoadingService,
  type ContextLoadingConfig,
  type ContextEntry
} from './context-loading-service.js';
import { 
  ContextVariableService, 
  createContextVariableService,
  type VariableConfig 
} from './context-variable-service.js';
import { 
  ContextMergeService, 
  createContextMergeService,
  type MergeConfig,
  type ContextMergeResult 
} from './context-merge-service.js';
import { 
  ContextCacheService, 
  createContextCacheService,
  type CacheConfig 
} from './context-cache-service.js';

/**
 * Context events
 */
export enum ContextEvent {
  CONTEXT_LOADED = 'context:loaded',
  CONTEXT_UPDATED = 'context:updated', 
  CONTEXT_ERROR = 'context:error',
  VARIABLE_RESOLVED = 'variable:resolved'
}

/**
 * Unified context configuration
 */
export interface ContextOrchestratorConfig {
  loading?: Partial<ContextLoadingConfig>;
  variables?: Partial<VariableConfig>;
  merge?: Partial<MergeConfig>;
  cache?: Partial<CacheConfig>;
  enableSubdirectoryDiscovery?: boolean;
  enableRealTimeUpdates?: boolean;
}

/**
 * Context Orchestrator Service
 * 
 * Focused responsibility: Coordinate context operations across services
 */
export class ContextOrchestratorService extends EventEmitter {
  private readonly loadingService: ContextLoadingService;
  private readonly variableService: ContextVariableService;
  private readonly mergeService: ContextMergeService;
  private readonly cacheService: ContextCacheService;
  private lastResult: ContextMergeResult | null = null;

  constructor(
    config: ContextOrchestratorConfig = {},
    memorySystem?: MemoryOrchestrator
  ) {
    super();
    
    // Initialize services
    this.loadingService = createContextLoadingService(config.loading);
    this.variableService = createContextVariableService(config.variables);
    this.mergeService = createContextMergeService(config.merge);
    this.cacheService = createContextCacheService(config.cache, memorySystem);
  }

  /**
   * Load and merge all context files
   */
  public async loadContext(currentDir: string = process.cwd()): Promise<ContextMergeResult> {
    const startTime = Date.now();
    
    try {
      // Generate cache key
      const cacheKey = this.cacheService.generateCacheKey(currentDir);
      
      // Check cache first
      const cached = this.cacheService.get(cacheKey);
      if (cached) {
        logger.debug(`Context loaded from cache: ${cached.stats.totalFiles} files`);
        this.lastResult = cached;
        this.emit(ContextEvent.CONTEXT_LOADED, cached);
        return cached;
      }
      
      const entries: ContextEntry[] = [];
      const errors: string[] = [];
      
      // Load context from all sources
      try {
        const [globalEntries, projectEntries, directoryEntries] = await Promise.all([
          this.loadingService.loadGlobalContext(),
          this.loadingService.loadProjectContext(currentDir),
          this.loadingService.loadDirectoryContext(currentDir)
        ]);
        
        entries.push(...globalEntries, ...projectEntries, ...directoryEntries);
      } catch (error) {
        const errorMessage = `Context loading failed: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMessage);
        logger.error(errorMessage, error);
      }
      
      // Process variables
      let allVariables: Record<string, string> = {};
      try {
        allVariables = await this.variableService.processVariables(entries);
        this.emit(ContextEvent.VARIABLE_RESOLVED, allVariables);
      } catch (error) {
        const errorMessage = `Variable processing failed: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMessage);
        logger.warn(errorMessage, error);
      }
      
      // Apply variable interpolation
      try {
        await this.variableService.interpolateVariables(entries, allVariables);
      } catch (error) {
        const errorMessage = `Variable interpolation failed: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMessage);
        logger.warn(errorMessage, error);
      }
      
      // Create merge result
      const processingTime = Date.now() - startTime;
      const result = this.mergeService.createMergeResult(
        entries,
        allVariables,
        processingTime,
        errors
      );
      
      // Cache result
      await this.cacheService.set(cacheKey, result);
      this.lastResult = result;
      
      this.emit(ContextEvent.CONTEXT_LOADED, result);
      
      logger.info(`Context loaded: ${result.stats.totalFiles} files, ${result.stats.totalSize} chars, ${processingTime}ms`);
      
      return result;
      
    } catch (error) {
      logger.error('Context loading failed', error);
      this.emit(ContextEvent.CONTEXT_ERROR, error);
      throw error;
    }
  }

  /**
   * Refresh context (clear cache and reload)
   */
  public async refreshContext(currentDir: string = process.cwd()): Promise<ContextMergeResult> {
    this.cacheService.clear();
    return await this.loadContext(currentDir);
  }

  /**
   * Get last loaded context
   */
  public getLastContext(): ContextMergeResult | null {
    return this.lastResult;
  }

  /**
   * Add custom variable
   */
  public addVariable(name: string, value: string): void {
    this.variableService.addVariable(name, value);
    // Clear cache since variables changed
    this.cacheService.clear();
  }

  /**
   * Add variable pattern
   */
  public addVariablePattern(pattern: string, resolver: () => string): void {
    this.variableService.addVariablePattern(pattern, resolver);
    // Clear cache since variable patterns changed
    this.cacheService.clear();
  }

  /**
   * Get available variables
   */
  public getAvailableVariables(): Record<string, string> {
    return this.variableService.getAvailableVariables();
  }

  /**
   * Validate context file
   */
  public async validateContextFile(filePath: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return await this.loadingService.validateContextFile(filePath);
  }

  /**
   * Validate variable syntax in content
   */
  public validateVariableSyntax(content: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    return this.variableService.validateVariableSyntax(content);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * Get merge statistics
   */
  public getMergeStats(entries?: ContextEntry[]) {
    const contextEntries = entries || this.lastResult?.entries || [];
    return this.mergeService.getMergeStats(contextEntries);
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cacheService.clear();
  }

  /**
   * Clear cache for specific paths
   */
  public clearCacheForPaths(paths: string[]): void {
    this.cacheService.clearForPaths(paths);
  }

  /**
   * Clean expired cache entries
   */
  public cleanExpiredCache(): number {
    return this.cacheService.cleanExpired();
  }

  /**
   * Validate all configurations
   */
  public validateConfigurations(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // Validate merge configuration
    const mergeValidation = this.mergeService.validateConfig();
    if (!mergeValidation.isValid) {
      result.isValid = false;
      result.errors.push(...mergeValidation.errors);
    }
    result.warnings.push(...mergeValidation.warnings);

    // Validate cache configuration
    const cacheValidation = this.cacheService.validateCache();
    if (!cacheValidation.isValid) {
      result.isValid = false;
      result.errors.push(...cacheValidation.errors);
    }
    result.warnings.push(...cacheValidation.warnings);

    return result;
  }

  /**
   * Get service configurations
   */
  public getConfigurations() {
    return {
      loading: this.loadingService.getConfig(),
      variables: this.variableService.getConfig(),
      merge: this.mergeService.getConfig(),
      cache: this.cacheService.getConfig()
    };
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics() {
    const cacheStats = this.cacheService.getStats();
    const lastResult = this.getLastContext();
    
    return {
      cache: {
        hitRate: cacheStats.hitRate,
        totalRequests: cacheStats.totalRequests,
        entries: cacheStats.entries,
        totalSize: cacheStats.totalSize
      },
      lastLoad: lastResult ? {
        processingTime: lastResult.stats.processingTime,
        totalFiles: lastResult.stats.totalFiles,
        totalSize: lastResult.stats.totalSize,
        errorsCount: lastResult.errors.length
      } : null
    };
  }
}

/**
 * Create context orchestrator service
 */
export function createContextOrchestratorService(
  config?: ContextOrchestratorConfig,
  memorySystem?: MemoryOrchestrator
): ContextOrchestratorService {
  return new ContextOrchestratorService(config, memorySystem);
}

/**
 * Backward compatibility function
 */
export async function loadHierarchicalContext(
  currentDir: string = process.cwd(),
  config: ContextOrchestratorConfig = {}
): Promise<{
  content: string;
  globalFiles: any[];
  projectFiles: any[];
  currentFiles: any[];
  subdirectoryFiles: any[];
  totalFiles: number;
  totalCharCount: number;
  errors: any[];
}> {
  const orchestrator = createContextOrchestratorService(config);
  const result = await orchestrator.loadContext(currentDir);
  
  // Transform to legacy format
  const globalFiles = result.entries.filter(e => e.type === 'global');
  const projectFiles = result.entries.filter(e => e.type === 'project');
  const currentFiles = result.entries.filter(e => e.type === 'directory');
  const subdirectoryFiles: any[] = []; // Legacy field, now empty
  
  return {
    content: result.content,
    globalFiles,
    projectFiles,
    currentFiles,
    subdirectoryFiles,
    totalFiles: result.stats.totalFiles,
    totalCharCount: result.stats.totalSize,
    errors: result.errors
  };
} 