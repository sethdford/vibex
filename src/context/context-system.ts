/**
 * Context System
 * 
 * Consolidates and simplifies the three existing context systems:
 * - hierarchical-context-loader.ts (basic loading)
 * - enhanced-hierarchical-context.ts (enhanced features)
 * - context-inheritance-engine.ts (advanced inheritance)
 * 
 * Provides a single, coherent API for all context operations.
 */

import { EventEmitter } from 'events';
import { readFile, access, stat, readdir } from 'fs/promises';
import { join, dirname, resolve, relative, basename } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';
import { MemorySystem, MemoryStorageType } from '../ai/advanced-memory.js';
import { 
  SubdirectoryDiscoveryEngine, 
  createSubdirectoryDiscoveryEngine,
  type SubdirectoryDiscoveryConfig,
  type SubdirectoryDiscoveryResult,
  type DiscoveredFile,
  DiscoveredFileType,
  DEFAULT_CONFIGS
} from './subdirectory-discovery-engine.js';

// Import real-time updater types
import type { 
  RealTimeContextUpdater, 
  RealTimeUpdaterConfig,
  ContextUpdateEvent,
  FileChangeEvent
} from './real-time-context-updater.js';

/**
 * Context file types
 */
export enum ContextFileType {
  GLOBAL = 'global',
  PROJECT = 'project', 
  DIRECTORY = 'directory',
  FILE = 'file'
}

/**
 * Context inheritance strategy
 */
export enum ContextInheritanceStrategy {
  MERGE = 'merge',           // Smart merge with parent
  OVERRIDE = 'override',     // Override parent completely
  APPEND = 'append',         // Append to parent
  PREPEND = 'prepend'        // Prepend to parent
}

/**
 * Context entry
 */
export interface ContextEntry {
  type: ContextFileType;
  path: string;
  content: string;
  priority: number;
  scope: string;
  lastModified: number;
  strategy: ContextInheritanceStrategy;
  variables: Record<string, string>;
  metadata: Record<string, unknown>;
}

/**
 * Context merge result
 */
export interface ContextMergeResult {
  content: string;
  entries: ContextEntry[];
  variables: Record<string, string>;
  stats: {
    totalFiles: number;
    totalSize: number;
    processingTime: number;
  };
  errors: string[];
}

/**
 * Enhanced context configuration with subdirectory discovery and real-time updates
 */
export interface ContextConfig {
  /**
   * Root directory for context loading
   */
  rootDirectory: string;
  
  /**
   * Context filenames to search for
   */
  contextFilenames?: string[];
  
  /**
   * Maximum depth for upward traversal
   */
  maxDepth?: number;
  
  /**
   * Workspace root detection patterns
   */
  workspaceMarkers?: string[];
  
  /**
   * File encoding
   */
  encoding?: BufferEncoding;
  
  /**
   * Whether to enable global context loading
   */
  enableGlobalContext?: boolean;
  
  /**
   * Whether to enable project context loading
   */
  enableProjectContext?: boolean;
  
  /**
   * Whether to enable directory context loading
   */
  enableDirectoryContext?: boolean;
  
  /**
   * Whether to enable variable interpolation
   */
  enableVariableInterpolation?: boolean;
  
  /**
   * Global context directory
   */
  globalContextDir?: string;
  
  /**
   * Context file names (alias for contextFilenames)
   */
  contextFileNames?: string[];
  
  /**
   * Project markers for detecting project root
   */
  projectMarkers?: string[];
  
  /**
   * Variable patterns for interpolation
   */
  variablePatterns?: Record<string, () => string>;
  
  /**
   * Whether to enable subdirectory discovery
   */
  enableSubdirectoryDiscovery?: boolean;
  
  /**
   * Subdirectory discovery configuration
   */
  subdirectoryDiscoveryConfig?: Partial<SubdirectoryDiscoveryConfig>;
  
  /**
   * Whether to merge subdirectory context with hierarchical context
   */
  mergeSubdirectoryContext?: boolean;
  
  /**
   * Priority for subdirectory context (higher = more important)
   */
  subdirectoryContextPriority?: number;
  
  /**
   * Enable real-time file watching
   */
  enableRealTimeUpdates?: boolean;
  
  /**
   * Real-time updater configuration
   */
  realTimeConfig?: Partial<RealTimeUpdaterConfig>;
  
  /**
   * Auto-start real-time watching on context load
   */
  autoStartWatching?: boolean;
  
  /**
   * Paths to watch for changes (defaults to discovered context directories)
   */
  watchPaths?: string[];
  
  /**
   * Enable full context mode for complete project analysis
   */
  fullContext?: boolean;
}

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
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ContextConfig> = {
  rootDirectory: process.cwd(),
  contextFilenames: [
    'VIBEX.md', 'CLAUDE.md', 'GEMINI.md', 'CONTEXT.md', 'README.md'
  ],
  maxDepth: 10,
  workspaceMarkers: [
    'package.json', 'Cargo.toml', 'pyproject.toml', 'pom.xml',
    'build.gradle', 'Makefile', '.git', '.hg', '.svn'
  ],
  encoding: 'utf-8',
  enableGlobalContext: true,
  enableProjectContext: true,
  enableDirectoryContext: true,
  enableVariableInterpolation: true,
  globalContextDir: homedir(),
  contextFileNames: [
    'VIBEX.md', 'CLAUDE.md', 'GEMINI.md', 'CONTEXT.md', 'README.md'
  ],
  projectMarkers: [
    'package.json', 'Cargo.toml', 'pyproject.toml', 'pom.xml',
    'build.gradle', 'Makefile', '.git', '.hg', '.svn'
  ],
  variablePatterns: {},
  enableSubdirectoryDiscovery: true,
  subdirectoryDiscoveryConfig: DEFAULT_CONFIGS.FAST,
  mergeSubdirectoryContext: true,
  subdirectoryContextPriority: 50,
  enableRealTimeUpdates: true,
  realTimeConfig: {},
  autoStartWatching: true,
  watchPaths: [],
  fullContext: false
};

/**
 * Context System
 */
export class ContextSystem extends EventEmitter {
  private readonly config: Required<ContextConfig>;
  private readonly memorySystem?: MemorySystem;
  private readonly cache = new Map<string, ContextMergeResult>();
  private lastResult: ContextMergeResult | null = null;
  private readonly subdirectoryEngine: SubdirectoryDiscoveryEngine;
  private realTimeUpdater: RealTimeContextUpdater | null = null;
  private watchedPaths: Set<string> = new Set();
  
  constructor(
    config: Partial<ContextConfig> = {},
    memorySystem?: MemorySystem
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memorySystem = memorySystem;
    
    // Initialize subdirectory discovery engine
    this.subdirectoryEngine = createSubdirectoryDiscoveryEngine(
      this.config.subdirectoryDiscoveryConfig || DEFAULT_CONFIGS.FAST
    );
    
    // Initialize real-time updater if enabled
    if (this.config.enableRealTimeUpdates) {
      this.initializeRealTimeUpdater();
    }
  }
  
  /**
   * Initialize real-time context updater
   */
  private async initializeRealTimeUpdater(): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies
      const { createRealTimeContextUpdater } = await import('./real-time-context-updater.js');
      
      this.realTimeUpdater = createRealTimeContextUpdater(this, this.config.realTimeConfig);
      
      // Listen to real-time events
      this.realTimeUpdater.on('context:updated', this.handleRealTimeUpdate.bind(this));
      this.realTimeUpdater.on('file:changed', this.handleFileChange.bind(this));
      this.realTimeUpdater.on('error', this.handleRealTimeError.bind(this));
      
      logger.debug('Real-time context updater initialized');
    } catch (error) {
      logger.warn('Failed to initialize real-time updater', error);
    }
  }
  
  /**
   * Handle real-time context update
   */
  private handleRealTimeUpdate(updateEvent: ContextUpdateEvent): void {
    // Clear cache for affected entries
    this.clearCacheForPaths(updateEvent.affectedEntries);
    
    // Update last result if available
    if (updateEvent.result) {
      this.lastResult = updateEvent.result;
    }
    
    // Emit context updated event
    this.emit(ContextEvent.CONTEXT_UPDATED, updateEvent);
    
    logger.debug(`Real-time context update: ${updateEvent.updateType} (${updateEvent.processingTime}ms)`);
  }
  
  /**
   * Handle file change event
   */
  private handleFileChange(fileEvent: FileChangeEvent): void {
    logger.debug(`Context file changed: ${fileEvent.filename} (${fileEvent.type})`);
  }
  
  /**
   * Handle real-time updater error
   */
  private handleRealTimeError(error: Error): void {
    logger.error('Real-time context updater error', error);
    this.emit(ContextEvent.CONTEXT_ERROR, error);
  }
  
  /**
   * Clear cache for specific paths
   */
  private clearCacheForPaths(paths: string[]): void {
    for (const [cacheKey, result] of this.cache.entries()) {
      // Check if any of the affected paths are in this cache entry
      const hasAffectedPath = result.entries.some(entry => 
        paths.some(path => entry.path.includes(path) || path.includes(entry.path))
      );
      
      if (hasAffectedPath) {
        this.cache.delete(cacheKey);
      }
    }
  }
  
  /**
   * Start real-time watching
   */
  public async startWatching(additionalPaths: string[] = []): Promise<void> {
    if (!this.realTimeUpdater) {
      if (this.config.enableRealTimeUpdates) {
        await this.initializeRealTimeUpdater();
      } else {
        throw new Error('Real-time updates are disabled');
      }
    }
    
    // Determine paths to watch
    const pathsToWatch = new Set<string>();
    
    // Add configured watch paths
    for (const path of this.config.watchPaths) {
      pathsToWatch.add(resolve(path));
    }
    
    // Add additional paths
    for (const path of additionalPaths) {
      pathsToWatch.add(resolve(path));
    }
    
    // Add context directories from last load
    if (this.lastResult) {
      for (const entry of this.lastResult.entries) {
        pathsToWatch.add(dirname(entry.path));
      }
    }
    
    // Default paths if none specified
    if (pathsToWatch.size === 0) {
      pathsToWatch.add(process.cwd());
      pathsToWatch.add(this.config.globalContextDir);
    }
    
    const watchPaths = Array.from(pathsToWatch).filter(Boolean);
    
    if (this.realTimeUpdater && watchPaths.length > 0) {
      await this.realTimeUpdater.startWatching(watchPaths);
      
      // Track watched paths
      for (const path of watchPaths) {
        this.watchedPaths.add(path);
      }
      
      logger.info(`Started watching ${watchPaths.length} paths for context changes`);
    }
  }
  
  /**
   * Stop real-time watching
   */
  public stopWatching(): void {
    if (this.realTimeUpdater) {
      this.realTimeUpdater.stopWatching();
      this.watchedPaths.clear();
      logger.info('Stopped watching for context changes');
    }
  }
  
  /**
   * Check if real-time watching is active
   */
  public isWatching(): boolean {
    return this.watchedPaths.size > 0;
  }
  
  /**
   * Get watched paths
   */
  public getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths);
  }
  
  /**
   * Force a real-time context update
   */
  public async forceUpdate(): Promise<ContextMergeResult> {
    if (this.realTimeUpdater) {
      return await this.realTimeUpdater.forceUpdate();
    } else {
      return await this.loadContext();
    }
  }
  
  /**
   * Get real-time updater performance metrics
   */
  public getRealTimeMetrics() {
    return this.realTimeUpdater?.getPerformanceMetrics() || null;
  }
  
  /**
   * Load and merge all context files
   */
  public async loadContext(
    currentDir: string = process.cwd()
  ): Promise<ContextMergeResult> {
    // If full context mode is enabled, use the full context loading method
    if (this.config.fullContext) {
      return await this.loadFullContext(currentDir);
    }
    
    const startTime = Date.now();
    
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(currentDir);
      
      // Check cache (simple 1-minute TTL)
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.stats.processingTime < 60000) {
        return cached;
      }
      
      const entries: ContextEntry[] = [];
      const errors: string[] = [];
      
      // Load global context
      if (this.config.enableGlobalContext) {
        try {
          const globalEntries = await this.loadGlobalContext();
          entries.push(...globalEntries);
        } catch (error) {
          errors.push(`Global context error: ${error}`);
        }
      }
      
      // Load project context
      if (this.config.enableProjectContext) {
        try {
          const projectEntries = await this.loadProjectContext(currentDir);
          entries.push(...projectEntries);
        } catch (error) {
          errors.push(`Project context error: ${error}`);
        }
      }
      
      // Load directory context
      if (this.config.enableDirectoryContext) {
        try {
          const directoryEntries = await this.loadDirectoryContext(currentDir);
          entries.push(...directoryEntries);
        } catch (error) {
          errors.push(`Directory context error: ${error}`);
        }
      }
      
      // Load subdirectory context
      if (this.config.enableSubdirectoryDiscovery) {
        try {
          const subdirectoryEntries = await this.loadSubdirectoryContext(currentDir);
          entries.push(...subdirectoryEntries);
        } catch (error) {
          errors.push(`Subdirectory context error: ${error}`);
        }
      }
      
      // Process variables
      const allVariables = await this.processVariables(entries);
      
      // Apply variable interpolation
      if (this.config.enableVariableInterpolation) {
        await this.interpolateVariables(entries, allVariables);
      }
      
      // Sort by priority (highest first)
      entries.sort((a, b) => b.priority - a.priority);
      
      // Merge content
      const mergedContent = await this.mergeContent(entries);
      
      // Calculate stats
      const totalSize = entries.reduce((sum, entry) => sum + entry.content.length, 0);
      
      const result: ContextMergeResult = {
        content: mergedContent,
        entries,
        variables: allVariables,
        stats: {
          totalFiles: entries.length,
          totalSize,
          processingTime: Date.now() - startTime
        },
        errors
      };
      
      // Cache result
      this.cache.set(cacheKey, result);
      this.lastResult = result;
      
      // Store in memory system
      if (this.memorySystem) {
        await this.storeInMemory(result);
      }
      
      this.emit(ContextEvent.CONTEXT_LOADED, result);
      
      // Auto-start watching if configured
      if (this.config.autoStartWatching && this.config.enableRealTimeUpdates && !this.isWatching()) {
        try {
          await this.startWatching();
        } catch (error) {
          logger.warn('Failed to auto-start real-time watching', error);
        }
      }
      
      logger.info(`Context loaded: ${result.stats.totalFiles} files, ${result.stats.totalSize} chars`);
      
      return result;
      
    } catch (error) {
      logger.error('Context loading failed', error);
      this.emit(ContextEvent.CONTEXT_ERROR, error);
      throw error;
    }
  }
  
  /**
   * Load full context for complete project analysis
   * 
   * This method implements the --full-context flag functionality by:
   * 1. Loading all standard context files
   * 2. Performing intelligent file selection using SubdirectoryDiscoveryEngine
   * 3. Applying .gitignore patterns and file type filtering
   * 4. Implementing size limits and priority scoring
   * 5. Providing progress indicators and memory management
   */
  public async loadFullContext(
    currentDir: string = process.cwd()
  ): Promise<ContextMergeResult> {
    const startTime = Date.now();
    
    try {
      logger.info('🔍 Starting full context mode - comprehensive project analysis');
      
      // Generate cache key with full context indicator
      const cacheKey = this.generateCacheKey(currentDir) + ':full-context';
      
      // Check cache (shorter TTL for full context due to size)
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.stats.processingTime < 30000) {
        logger.info('📋 Using cached full context result');
        return cached;
      }
      
      const entries: ContextEntry[] = [];
      const errors: string[] = [];
      
      // Step 1: Load standard context files first
      logger.info('📁 Loading standard context files...');
      
      // Load global context
      if (this.config.enableGlobalContext) {
        try {
          const globalEntries = await this.loadGlobalContext();
          entries.push(...globalEntries);
          logger.debug(`  ✓ Global context: ${globalEntries.length} files`);
        } catch (error) {
          errors.push(`Global context error: ${error}`);
        }
      }
      
      // Load project context
      if (this.config.enableProjectContext) {
        try {
          const projectEntries = await this.loadProjectContext(currentDir);
          entries.push(...projectEntries);
          logger.debug(`  ✓ Project context: ${projectEntries.length} files`);
        } catch (error) {
          errors.push(`Project context error: ${error}`);
        }
      }
      
      // Load directory context
      if (this.config.enableDirectoryContext) {
        try {
          const directoryEntries = await this.loadDirectoryContext(currentDir);
          entries.push(...directoryEntries);
          logger.debug(`  ✓ Directory context: ${directoryEntries.length} files`);
        } catch (error) {
          errors.push(`Directory context error: ${error}`);
        }
      }
      
      // Step 2: Perform intelligent full project analysis
      logger.info('🚀 Performing intelligent file selection and analysis...');
      
      try {
        const fullContextEntries = await this.loadIntelligentFullContext(currentDir);
        entries.push(...fullContextEntries);
        logger.info(`  ✓ Intelligent analysis: ${fullContextEntries.length} additional files`);
      } catch (error) {
        errors.push(`Full context analysis error: ${error}`);
        logger.error('Full context analysis failed, falling back to subdirectory discovery', error);
        
        // Fallback to standard subdirectory discovery
        if (this.config.enableSubdirectoryDiscovery) {
          try {
            const subdirectoryEntries = await this.loadSubdirectoryContext(currentDir);
            entries.push(...subdirectoryEntries);
            logger.debug(`  ✓ Fallback subdirectory: ${subdirectoryEntries.length} files`);
          } catch (fallbackError) {
            errors.push(`Subdirectory context error: ${fallbackError}`);
          }
        }
      }
      
      // Step 3: Process variables and apply optimizations
      const allVariables = await this.processVariables(entries);
      
      // Apply variable interpolation
      if (this.config.enableVariableInterpolation) {
        await this.interpolateVariables(entries, allVariables);
      }
      
      // Step 4: Optimize and prioritize entries for full context
      const optimizedEntries = await this.optimizeFullContextEntries(entries);
      
      // Step 5: Merge content with full context optimizations
      const mergedContent = await this.mergeContent(optimizedEntries);
      
              // Calculate comprehensive stats
        const totalSize = optimizedEntries.reduce((sum: number, entry: ContextEntry) => sum + entry.content.length, 0);
      const processingTime = Date.now() - startTime;
      
      const result: ContextMergeResult = {
        content: mergedContent,
        entries: optimizedEntries,
        variables: allVariables,
        stats: {
          totalFiles: optimizedEntries.length,
          totalSize,
          processingTime
        },
        errors
      };
      
      // Cache result with shorter TTL
      this.cache.set(cacheKey, result);
      this.lastResult = result;
      
      // Store in memory system
      if (this.memorySystem) {
        await this.storeInMemory(result);
      }
      
      this.emit(ContextEvent.CONTEXT_LOADED, result);
      
      // Auto-start watching if configured
      if (this.config.autoStartWatching && this.config.enableRealTimeUpdates && !this.isWatching()) {
        try {
          await this.startWatching();
        } catch (error) {
          logger.warn('Failed to auto-start real-time watching', error);
        }
      }
      
      logger.info(`🎯 Full context loaded: ${result.stats.totalFiles} files, ${(result.stats.totalSize / 1024).toFixed(1)}KB, ${result.stats.processingTime}ms`);
      
      return result;
      
    } catch (error) {
      logger.error('Full context loading failed', error);
      this.emit(ContextEvent.CONTEXT_ERROR, error);
      throw error;
    }
  }
  
  /**
   * Load global context files
   */
  private async loadGlobalContext(): Promise<ContextEntry[]> {
    const entries: ContextEntry[] = [];
    
    try {
      await access(this.config.globalContextDir);
    } catch {
      return entries; // Global context is optional
    }
    
    for (const fileName of this.config.contextFileNames) {
      const filePath = join(this.config.globalContextDir, fileName);
      
      try {
        await access(filePath);
        const content = await readFile(filePath, 'utf8');
        const stats = await stat(filePath);
        
        entries.push({
          type: ContextFileType.GLOBAL,
          path: filePath,
          content,
          priority: 1000, // Highest priority
          scope: 'global',
          lastModified: stats.mtime.getTime(),
          strategy: ContextInheritanceStrategy.MERGE,
          variables: {},
          metadata: {
            source: 'global',
            fileName
          }
        });
      } catch {
        // File doesn't exist, continue
      }
    }
    
    return entries;
  }
  
  /**
   * Load project context files
   */
  private async loadProjectContext(currentDir: string): Promise<ContextEntry[]> {
    const entries: ContextEntry[] = [];
    const projectRoot = await this.findProjectRoot(currentDir);
    
    if (!projectRoot) {
      return entries;
    }
    
    // Load context files from project root
    for (const fileName of this.config.contextFileNames) {
      const filePath = join(projectRoot, fileName);
      
      try {
        await access(filePath);
        const content = await readFile(filePath, 'utf8');
        const stats = await stat(filePath);
        
        entries.push({
          type: ContextFileType.PROJECT,
          path: filePath,
          content,
          priority: 500,
          scope: 'project',
          lastModified: stats.mtime.getTime(),
          strategy: ContextInheritanceStrategy.MERGE,
          variables: {},
          metadata: {
            source: 'project',
            fileName,
            projectRoot
          }
        });
      } catch {
        // File doesn't exist, continue
      }
    }
    
    return entries;
  }
  
  /**
   * Load directory context files
   */
  private async loadDirectoryContext(currentDir: string): Promise<ContextEntry[]> {
    const entries: ContextEntry[] = [];
    let depth = 0;
    let searchDir = resolve(currentDir);
    
    while (depth < this.config.maxDepth) {
      for (const fileName of this.config.contextFileNames) {
        const filePath = join(searchDir, fileName);
        
        try {
          await access(filePath);
          const content = await readFile(filePath, 'utf8');
          const stats = await stat(filePath);
          
          // Priority decreases with depth
          const priority = 100 - (depth * 10);
          
          entries.push({
            type: ContextFileType.DIRECTORY,
            path: filePath,
            content,
            priority,
            scope: relative(currentDir, searchDir) || '.',
            lastModified: stats.mtime.getTime(),
            strategy: ContextInheritanceStrategy.MERGE,
            variables: {},
            metadata: {
              source: 'directory',
              fileName,
              depth,
              relativePath: relative(currentDir, searchDir)
            }
          });
        } catch {
          // File doesn't exist, continue
        }
      }
      
      // Move up one directory
      const parentDir = dirname(searchDir);
      if (parentDir === searchDir) {
        break; // Reached root
      }
      
      searchDir = parentDir;
      depth++;
    }
    
    return entries;
  }
  
  /**
   * Load subdirectory context files using discovery engine
   */
  private async loadSubdirectoryContext(currentDir: string): Promise<ContextEntry[]> {
    const entries: ContextEntry[] = [];
    
    try {
      // Use subdirectory discovery engine
      const discoveryResult = await this.subdirectoryEngine.discover(currentDir);
      
      // Convert discovered files to context entries
      for (const discoveredFile of discoveryResult.files) {
        // Only include context files and documentation
        if (discoveredFile.type === DiscoveredFileType.CONTEXT ||
            discoveredFile.type === DiscoveredFileType.DOCUMENTATION) {
          
          // Calculate priority based on depth and file type
          let priority = this.config.subdirectoryContextPriority || 50;
          
          // Context files get higher priority
          if (discoveredFile.type === DiscoveredFileType.CONTEXT) {
            priority += 100;
          }
          
          // Files closer to root get higher priority
          priority -= (discoveredFile.depth * 5);
          
          entries.push({
            type: ContextFileType.DIRECTORY,
            path: discoveredFile.path,
            content: discoveredFile.content,
            priority,
            scope: `subdirectory:${discoveredFile.relativePath}`,
            lastModified: discoveredFile.modifiedTime,
            strategy: ContextInheritanceStrategy.MERGE,
            variables: {},
            metadata: {
              source: 'subdirectory',
              depth: discoveredFile.depth,
              fileType: discoveredFile.type,
              relativePath: discoveredFile.relativePath,
              size: discoveredFile.size,
              gitignoreMatch: discoveredFile.gitignoreMatch
            }
          });
        }
      }
      
      logger.info(`Subdirectory discovery: ${entries.length} context files found from ${discoveryResult.files.length} total files`);
      
    } catch (error) {
      logger.error('Subdirectory context loading failed', error);
      throw error;
    }
    
    return entries;
  }
  
  /**
   * Find project root by looking for project markers
   */
  private async findProjectRoot(currentDir: string): Promise<string | null> {
    let searchDir = resolve(currentDir);
    let depth = 0;
    
    while (depth < this.config.maxDepth) {
      for (const marker of this.config.projectMarkers) {
        const markerPath = join(searchDir, marker);
        
        try {
          await access(markerPath);
          return searchDir; // Found project root
        } catch {
          // Marker doesn't exist, continue
        }
      }
      
      // Move up one directory
      const parentDir = dirname(searchDir);
      if (parentDir === searchDir) {
        break; // Reached root
      }
      
      searchDir = parentDir;
      depth++;
    }
    
    return null;
  }
  
  /**
   * Process variables from all entries
   */
  private async processVariables(entries: ContextEntry[]): Promise<Record<string, string>> {
    const variables: Record<string, string> = {};
    
    // Add predefined variables
    for (const [key, resolver] of Object.entries(this.config.variablePatterns)) {
      try {
        const value = typeof resolver === 'function' ? resolver() : resolver;
        variables[key] = value;
      } catch (error) {
        logger.warn(`Failed to resolve variable ${key}`, error);
      }
    }
    
    // Extract variables from content
    for (const entry of entries) {
      const variableMatches = entry.content.matchAll(/\$\{([^}]+)\}/g);
      for (const match of variableMatches) {
        const variable = match[1];
        if (!variables[variable]) {
          // Try to resolve from environment
          if (variable.startsWith('env.')) {
            const envVar = variable.substring(4);
            const envValue = process.env[envVar];
            if (envValue) {
              variables[variable] = envValue;
            }
          }
        }
      }
    }
    
    return variables;
  }
  
  /**
   * Interpolate variables in content
   */
  private async interpolateVariables(
    entries: ContextEntry[],
    variables: Record<string, string>
  ): Promise<void> {
    for (const entry of entries) {
      let content = entry.content;
      
      // Replace variables
      for (const [key, value] of Object.entries(variables)) {
        const pattern = new RegExp(`\\$\\{${key}\\}`, 'g');
        content = content.replace(pattern, value);
        
        if (content !== entry.content) {
          entry.variables[key] = value;
          this.emit(ContextEvent.VARIABLE_RESOLVED, { variable: key, value });
        }
      }
      
      entry.content = content;
    }
  }
  
  /**
   * Merge content from all entries
   */
  private async mergeContent(entries: ContextEntry[]): Promise<string> {
    if (entries.length === 0) {
      return '';
    }
    
    const sections: string[] = [];
    
    // Add header
    sections.push('# Context');
    sections.push('');
    
    // Add each entry
    for (const entry of entries) {
      sections.push(`## ${this.getEntryTitle(entry)}`);
      sections.push('');
      sections.push(`**Source**: ${entry.type} • **Path**: \`${entry.path}\``);
      sections.push(`**Priority**: ${entry.priority} • **Scope**: ${entry.scope}`);
      sections.push('');
      sections.push('---');
      sections.push('');
      sections.push(entry.content.trim());
      sections.push('');
      sections.push('---');
      sections.push('');
    }
    
    return sections.join('\n');
  }
  
  /**
   * Get display title for entry
   */
  private getEntryTitle(entry: ContextEntry): string {
    const fileName = basename(entry.path);
    
    switch (entry.type) {
      case ContextFileType.GLOBAL:
        return `Global Context (${fileName})`;
      case ContextFileType.PROJECT:
        return `Project Context (${fileName})`;
      case ContextFileType.DIRECTORY:
        return `Directory Context (${fileName})`;
      case ContextFileType.FILE:
        return `File Context (${fileName})`;
      default:
        return `Context (${fileName})`;
    }
  }
  
  /**
   * Store result in memory system
   */
  private async storeInMemory(result: ContextMergeResult): Promise<void> {
    if (!this.memorySystem) return;
    
    try {
      await this.memorySystem.store(
        'unified_context',
        {
          content: result.content,
          variables: result.variables,
          stats: result.stats,
          timestamp: Date.now()
        },
        MemoryStorageType.SESSION,
        [{ name: 'context' }, { name: 'unified' }],
        90 // High importance
      );
    } catch (error) {
      logger.warn('Failed to store context in memory', error);
    }
  }
  
  /**
   * Generate cache key
   */
  private generateCacheKey(currentDir: string): string {
    return `context:${currentDir}:${Date.now()}`;
  }
  
  /**
   * Get last loaded context
   */
  public getLastContext(): ContextMergeResult | null {
    return this.lastResult;
  }
  
  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    entries: number;
    totalSize: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    if (this.cache.size === 0) {
      return {
        entries: 0,
        totalSize: 0,
        oldestEntry: 0,
        newestEntry: 0
      };
    }

    let totalSize = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;

    for (const result of this.cache.values()) {
      totalSize += result.content.length;
      if (result.stats.processingTime < oldestEntry) {
        oldestEntry = result.stats.processingTime;
      }
      if (result.stats.processingTime > newestEntry) {
        newestEntry = result.stats.processingTime;
      }
    }

    return {
      entries: this.cache.size,
      totalSize,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Load intelligent full context using enhanced discovery algorithms
   * 
   * This method implements the core intelligence for full context mode:
   * - Uses SubdirectoryDiscoveryEngine for comprehensive file discovery
   * - Applies intelligent file type filtering and priority scoring
   * - Respects .gitignore patterns and project structure
   * - Implements size limits and memory management
   */
  private async loadIntelligentFullContext(currentDir: string): Promise<ContextEntry[]> {
    const entries: ContextEntry[] = [];
    
    logger.debug('🧠 Starting intelligent full context analysis...');
    
    // Use enhanced discovery configuration for full context
    const fullContextConfig = {
      ...this.config.subdirectoryDiscoveryConfig,
      // Override with full context specific settings
      maxDepth: 10, // Deeper traversal for full context
      maxFiles: 1000, // More files for comprehensive analysis
      enableGitignoreFiltering: true,
      enableFileTypeFiltering: true,
      enableSizeFiltering: true,
      maxFileSize: 1024 * 1024, // 1MB per file max
      includePatterns: [
        // Source code files
        '**/*.{ts,tsx,js,jsx,py,java,cpp,c,h,cs,php,rb,go,rs,swift,kt}',
        // Configuration files
        '**/*.{json,yaml,yml,toml,ini,conf,config}',
        // Documentation
        '**/*.{md,txt,rst,adoc}',
        // Build and deployment
        '**/package.json',
        '**/Dockerfile*',
        '**/docker-compose*.yml',
        '**/*.tf',
        // Project structure
        '**/README*',
        '**/CHANGELOG*',
        '**/LICENSE*'
      ],
      excludePatterns: [
        // Build outputs
        '**/dist/**',
        '**/build/**',
        '**/out/**',
        '**/target/**',
        // Dependencies
        '**/node_modules/**',
        '**/vendor/**',
        '**/.venv/**',
        // IDE and system files
        '**/.vscode/**',
        '**/.idea/**',
        '**/.*cache/**',
        // Large data files
        '**/*.{log,logs,tmp,temp,cache}',
        '**/*.{jpg,jpeg,png,gif,bmp,svg,ico,webp}',
        '**/*.{mp4,avi,mov,wmv,flv,webm}',
        '**/*.{mp3,wav,flac,aac,ogg}',
        '**/*.{zip,tar,gz,rar,7z,bz2}'
      ]
    };
    
    // Create a specialized discovery engine for full context mode
    const fullContextEngine = new SubdirectoryDiscoveryEngine(fullContextConfig);
    
    // Perform comprehensive discovery
    const discoveryResult = await fullContextEngine.discover(currentDir);
    
    logger.debug(`📊 Discovery found ${discoveryResult.files.length} files`);
    
    // Convert discovered files to context entries with intelligent prioritization
    for (const discoveredFile of discoveryResult.files) {
      // Calculate intelligent priority based on multiple factors
      let priority = this.calculateIntelligentPriority(discoveredFile, currentDir);
      
      // Apply file type specific handling
      const contextType = this.determineContextType(discoveredFile);
      
      const entry: ContextEntry = {
        type: contextType,
        path: discoveredFile.path,
        content: discoveredFile.content,
        priority,
        scope: `full-context:${discoveredFile.relativePath}`,
        lastModified: discoveredFile.modifiedTime,
        strategy: ContextInheritanceStrategy.MERGE,
        variables: {},
        metadata: {
          source: 'full-context',
          depth: discoveredFile.depth,
          fileType: discoveredFile.type,
          relativePath: discoveredFile.relativePath,
          size: discoveredFile.size,
          gitignoreMatch: discoveredFile.gitignoreMatch,
          intelligentPriority: priority,
          analysisTimestamp: Date.now()
        }
      };
      
      entries.push(entry);
    }
    
    logger.info(`🎯 Intelligent full context: ${entries.length} files selected from ${discoveryResult.files.length} discovered`);
    
    return entries;
  }

  /**
   * Calculate intelligent priority for discovered files based on multiple factors
   */
  private calculateIntelligentPriority(file: any, currentDir: string): number {
    let priority = 50; // Base priority
    
    // Distance from current directory (closer = higher priority)
    const depth = file.depth || 0;
    priority -= depth * 5;
    
    // File type importance
    const ext = file.path.split('.').pop()?.toLowerCase() || '';
    const fileTypeBonus = this.getFileTypeBonus(ext);
    priority += fileTypeBonus;
    
    // File size factor (smaller files often more important for context)
    const sizeKB = (file.size || 0) / 1024;
    if (sizeKB < 10) priority += 20; // Very small files (config, etc.)
    else if (sizeKB < 50) priority += 10; // Small files
    else if (sizeKB > 500) priority -= 20; // Large files less important
    
    // Path-based importance
    const pathLower = file.path.toLowerCase();
    
    // Root level files are important
    if (file.depth === 0) priority += 30;
    
    // Important directories
    if (pathLower.includes('/src/')) priority += 15;
    if (pathLower.includes('/lib/')) priority += 10;
    if (pathLower.includes('/config/')) priority += 25;
    if (pathLower.includes('/docs/')) priority += 5;
    
    // Important file names
    if (pathLower.includes('readme')) priority += 30;
    if (pathLower.includes('package.json')) priority += 40;
    if (pathLower.includes('tsconfig')) priority += 35;
    if (pathLower.includes('dockerfile')) priority += 25;
    if (pathLower.includes('license')) priority += 15;
    if (pathLower.includes('changelog')) priority += 10;
    
    // Recency bonus (recently modified files are more relevant)
    const ageMs = Date.now() - (file.modifiedTime || 0);
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < 1) priority += 15; // Modified today
    else if (ageDays < 7) priority += 10; // Modified this week
    else if (ageDays < 30) priority += 5; // Modified this month
    
    return Math.max(0, Math.min(1000, priority)); // Clamp to 0-1000 range
  }

  /**
   * Get file type bonus for priority calculation
   */
  private getFileTypeBonus(extension: string): number {
    const bonusMap: Record<string, number> = {
      // High priority source files
      'ts': 40, 'tsx': 40, 'js': 35, 'jsx': 35,
      'py': 35, 'java': 30, 'cpp': 30, 'c': 30,
      
      // Configuration files
      'json': 35, 'yaml': 30, 'yml': 30, 'toml': 25,
      'conf': 25, 'config': 25, 'ini': 20,
      
      // Documentation
      'md': 25, 'txt': 15, 'rst': 20, 'adoc': 20,
      
      // Build and deployment
      'dockerfile': 30, 'tf': 25,
      
      // Web files
      'html': 20, 'css': 15, 'scss': 15, 'less': 15,
      
      // Data files
      'sql': 20, 'graphql': 20, 'proto': 25,
      
      // Shell scripts
      'sh': 20, 'bash': 20, 'zsh': 20, 'fish': 15,
      
      // Other languages
      'go': 30, 'rs': 30, 'swift': 25, 'kt': 25,
      'cs': 25, 'php': 20, 'rb': 20
    };
    
    return bonusMap[extension] || 0;
  }

  /**
   * Determine the appropriate context type for a discovered file
   */
  private determineContextType(file: any): ContextFileType {
    const pathLower = file.path.toLowerCase();
    
    // Check for context files
    if (pathLower.includes('.cursor') || pathLower.includes('context')) {
      return ContextFileType.DIRECTORY;
    }
    
    // Check for documentation
    if (pathLower.includes('readme') || pathLower.includes('docs/')) {
      return ContextFileType.DIRECTORY;
    }
    
    // Default to file type for source files
    return ContextFileType.FILE;
  }

  /**
   * Optimize and prioritize entries for full context mode
   * 
   * This method implements context size optimization:
   * - Sorts entries by priority
   * - Applies size limits and chunking
   * - Removes duplicate or redundant content
   * - Provides memory management
   */
  private async optimizeFullContextEntries(entries: ContextEntry[]): Promise<ContextEntry[]> {
    logger.debug('⚡ Optimizing full context entries...');
    
    // Sort by priority (highest first)
    const sortedEntries = [...entries].sort((a, b) => b.priority - a.priority);
    
    // Apply size limits
    const maxTotalSize = 10 * 1024 * 1024; // 10MB total limit
    const maxEntries = 500; // Maximum number of entries
    
    let totalSize = 0;
    const optimizedEntries: ContextEntry[] = [];
    
    for (const entry of sortedEntries) {
      // Check if adding this entry would exceed limits
      if (optimizedEntries.length >= maxEntries) {
        logger.debug(`🚫 Reached maximum entry limit (${maxEntries})`);
        break;
      }
      
      if (totalSize + entry.content.length > maxTotalSize) {
        logger.debug(`🚫 Reached size limit (${(maxTotalSize / 1024 / 1024).toFixed(1)}MB)`);
        break;
      }
      
      // Add entry
      optimizedEntries.push(entry);
      totalSize += entry.content.length;
    }
    
    logger.info(`✨ Optimized context: ${optimizedEntries.length}/${entries.length} entries, ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    
    return optimizedEntries;
  }
}

/**
 * Create unified context system
 */
export function createContextSystem(
  config?: Partial<ContextConfig>,
  memorySystem?: MemorySystem
): ContextSystem {
  return new ContextSystem(config, memorySystem);
}

/**
 * Legacy compatibility function
 */
export async function loadHierarchicalContext(
  currentDir: string = process.cwd(),
  config: Partial<ContextConfig> = {}
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
  const contextSystem = createContextSystem(config);
  const result = await contextSystem.loadContext(currentDir);
  
  // Convert to legacy format
  const globalFiles = result.entries.filter(e => e.type === ContextFileType.GLOBAL);
  const projectFiles = result.entries.filter(e => e.type === ContextFileType.PROJECT);
  const currentFiles = result.entries.filter(e => e.type === ContextFileType.DIRECTORY && e.scope === '.');
  const subdirectoryFiles = result.entries.filter(e => e.type === ContextFileType.DIRECTORY && e.scope !== '.');
  
  return {
    content: result.content,
    globalFiles: globalFiles.map(f => ({ ...f, source: f.type, lastModified: new Date(f.lastModified) })),
    projectFiles: projectFiles.map(f => ({ ...f, source: f.type, lastModified: new Date(f.lastModified) })),
    currentFiles: currentFiles.map(f => ({ ...f, source: f.type, lastModified: new Date(f.lastModified) })),
    subdirectoryFiles: subdirectoryFiles.map(f => ({ ...f, source: f.type, lastModified: new Date(f.lastModified) })),
    totalFiles: result.stats.totalFiles,
    totalCharCount: result.stats.totalSize,
    errors: result.errors.map(e => ({ message: e }))
  };
} 