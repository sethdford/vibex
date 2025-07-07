/**
 * Context System (Refactored) - Clean Architecture like Gemini CLI
 * 
 * Single Responsibility: Provide unified context API using composed services
 * This replaces the massive 1,455-line context-system.ts with clean composition
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { MemoryOrchestrator } from '../services/memory-orchestrator.js';

// Import our focused services
import { 
  ContextOrchestratorService,
  createContextOrchestratorService,
  type ContextOrchestratorConfig,
  ContextEvent
} from '../services/context-orchestrator-service.js';

// Re-export types for backward compatibility
export { 
  ContextFileType, 
  ContextInheritanceStrategy,
  type ContextEntry 
} from '../services/context-loading-service.js';
export { 
  type ContextMergeResult 
} from '../services/context-merge-service.js';
export { ContextEvent };

/**
 * Context configuration (backward compatibility)
 */
export interface ContextConfig extends ContextOrchestratorConfig {
  // Legacy fields for backward compatibility
  rootDirectory?: string;
  contextFilenames?: string[];
  maxDepth?: number;
  workspaceMarkers?: string[];
  encoding?: BufferEncoding;
  enableGlobalContext?: boolean;
  enableProjectContext?: boolean;
  enableDirectoryContext?: boolean;
  enableVariableInterpolation?: boolean;
  globalContextDir?: string;
  contextFileNames?: string[];
  projectMarkers?: string[];
  variablePatterns?: Record<string, () => string>;
  enableSubdirectoryDiscovery?: boolean;
  subdirectoryDiscoveryConfig?: any;
  mergeSubdirectoryContext?: boolean;
  subdirectoryContextPriority?: number;
  enableRealTimeUpdates?: boolean;
  realTimeConfig?: any;
  autoStartWatching?: boolean;
  watchPaths?: string[];
  fullContext?: boolean;
}

/**
 * Context System (Refactored)
 * 
 * Now a thin wrapper around our focused services - 90% reduction in complexity!
 */
export class ContextSystem extends EventEmitter {
  private readonly orchestrator: ContextOrchestratorService;

  constructor(
    config: Partial<ContextConfig> = {},
    memorySystem?: MemoryOrchestrator
  ) {
    super();
    
    // Transform legacy config to new format
    const orchestratorConfig = this.transformLegacyConfig(config);
    
    // Create orchestrator with our focused services
    this.orchestrator = createContextOrchestratorService(orchestratorConfig, memorySystem);
    
    // Forward events
    this.orchestrator.on(ContextEvent.CONTEXT_LOADED, (result) => {
      this.emit(ContextEvent.CONTEXT_LOADED, result);
    });
    
    this.orchestrator.on(ContextEvent.CONTEXT_UPDATED, (result) => {
      this.emit(ContextEvent.CONTEXT_UPDATED, result);
    });
    
    this.orchestrator.on(ContextEvent.CONTEXT_ERROR, (error) => {
      this.emit(ContextEvent.CONTEXT_ERROR, error);
    });
    
    this.orchestrator.on(ContextEvent.VARIABLE_RESOLVED, (variables) => {
      this.emit(ContextEvent.VARIABLE_RESOLVED, variables);
    });
  }

  /**
   * Load and merge all context files
   */
  public async loadContext(currentDir: string = process.cwd()) {
    return await this.orchestrator.loadContext(currentDir);
  }

  /**
   * Load full context (legacy method)
   */
  public async loadFullContext(currentDir: string = process.cwd()) {
    // For now, just delegate to regular load context
    // Full context intelligence can be added later as a separate service
    return await this.orchestrator.loadContext(currentDir);
  }

  /**
   * Start watching for changes (placeholder)
   */
  public async startWatching(additionalPaths: string[] = []): Promise<void> {
    logger.info('Real-time watching not yet implemented in refactored version');
  }

  /**
   * Stop watching for changes (placeholder)
   */
  public stopWatching(): void {
    logger.info('Real-time watching not yet implemented in refactored version');
  }

  /**
   * Check if watching is active (placeholder)
   */
  public isWatching(): boolean {
    return false;
  }

  /**
   * Get watched paths (placeholder)
   */
  public getWatchedPaths(): string[] {
    return [];
  }

  /**
   * Force update (refresh context)
   */
  public async forceUpdate() {
    return await this.orchestrator.refreshContext();
  }

  /**
   * Get real-time metrics (placeholder)
   */
  public getRealTimeMetrics() {
    return null;
  }

  /**
   * Get last loaded context
   */
  public getLastContext() {
    return this.orchestrator.getLastContext();
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.orchestrator.clearCache();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return this.orchestrator.getCacheStats();
  }

  /**
   * Transform legacy configuration to new service-based format
   */
  private transformLegacyConfig(config: Partial<ContextConfig>): ContextOrchestratorConfig {
    return {
      loading: {
        globalContextDir: config.globalContextDir,
        contextFileNames: config.contextFileNames || config.contextFilenames,
        projectMarkers: config.projectMarkers || config.workspaceMarkers || [],
        maxDepth: config.maxDepth,
        encoding: config.encoding,
        enableGlobalContext: config.enableGlobalContext,
        enableProjectContext: config.enableProjectContext,
        enableDirectoryContext: config.enableDirectoryContext
      },
      variables: {
        enableInterpolation: config.enableVariableInterpolation,
        variablePatterns: config.variablePatterns,
        customVariables: {}
      },
      merge: {
        includeHeaders: true,
        includeSeparators: true,
        includeMetadata: false,
        maxContentLength: 100000,
        sortByPriority: true
      },
      cache: {
        ttlMs: 60000,
        maxEntries: 100,
        enableMemoryStorage: true,
        memoryImportance: 90
      },
      enableSubdirectoryDiscovery: config.enableSubdirectoryDiscovery,
      enableRealTimeUpdates: config.enableRealTimeUpdates
    };
  }
}

/**
 * Create unified context system (backward compatibility)
 */
export function createContextSystem(
  config?: Partial<ContextConfig>,
  memorySystem?: MemoryOrchestrator
): ContextSystem {
  return new ContextSystem(config, memorySystem);
}

/**
 * Load hierarchical context (backward compatibility)
 */
export async function loadHierarchicalContext(
  currentDir: string = process.cwd(),
  config: Partial<ContextConfig> = {}
) {
  const system = createContextSystem(config);
  const result = await system.loadContext(currentDir);
  
  // Transform to legacy format for backward compatibility
  const globalFiles = result.entries.filter(e => e.type === 'global');
  const projectFiles = result.entries.filter(e => e.type === 'project');
  const currentFiles = result.entries.filter(e => e.type === 'directory');
  const subdirectoryFiles: any[] = []; // Legacy field
  
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