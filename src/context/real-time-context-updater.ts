/**
 * Real-Time Context Updater
 * 
 * Optimizes real-time context updates with advanced debouncing, intelligent change detection,
 * and performance optimizations for large directory structures.
 * 
 * SUCCESS CRITERIA:
 * - Debounced reload logic with configurable intervals
 * - Intelligent change detection (only reload affected context)
 * - Optimized for large directory structures
 * - Minimal performance impact on file operations
 * - Smart caching and incremental updates
 */

import { EventEmitter } from 'events';
import { watch, FSWatcher } from 'fs';
import { access, stat } from 'fs/promises';
import { basename, dirname, relative, resolve, join } from 'path';
import { logger } from '../utils/logger.js';
import { ContextSystem, ContextMergeResult, ContextEntry, ContextEvent } from './context-system-refactored.js';

/**
 * File change event types
 */
export enum FileChangeType {
  CREATED = 'created',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  RENAMED = 'renamed'
}

/**
 * File change event
 */
export interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  filename: string;
  timestamp: number;
  size?: number;
  isDirectory?: boolean;
}

/**
 * Context update event
 */
export interface ContextUpdateEvent {
  trigger: FileChangeEvent;
  affectedEntries: string[];
  updateType: 'full' | 'incremental' | 'cached';
  processingTime: number;
  result?: ContextMergeResult;
  error?: Error;
}

/**
 * Real-time updater configuration
 */
export interface RealTimeUpdaterConfig {
  /**
   * Debounce delay in milliseconds
   */
  debounceDelay: number;
  
  /**
   * Maximum debounce delay for rapid changes
   */
  maxDebounceDelay: number;
  
  /**
   * Batch size for processing multiple changes
   */
  batchSize: number;
  
  /**
   * Enable intelligent change detection
   */
  enableIntelligentDetection: boolean;
  
  /**
   * Enable incremental updates
   */
  enableIncrementalUpdates: boolean;
  
  /**
   * Maximum file size to watch (bytes)
   */
  maxFileSize: number;
  
  /**
   * File patterns to ignore
   */
  ignorePatterns: string[];
  
  /**
   * Enable performance monitoring
   */
  enablePerformanceMonitoring: boolean;
  
  /**
   * Cache TTL in milliseconds
   */
  cacheTTL: number;
  
  /**
   * Maximum number of watchers
   */
  maxWatchers: number;
  
  /**
   * Enable adaptive debouncing
   */
  enableAdaptiveDebouncing: boolean;
  
  /**
   * Enable change coalescing
   */
  enableChangeCoalescing: boolean;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  totalUpdates: number;
  averageUpdateTime: number;
  cacheHitRate: number;
  incrementalUpdateRate: number;
  lastUpdateTime: number;
  watcherCount: number;
  memoryUsage: number;
}

/**
 * Watcher information
 */
interface WatcherInfo {
  watcher: FSWatcher;
  path: string;
  contextFiles: Set<string>;
  lastActivity: number;
  changeCount: number;
}

/**
 * Change batch for processing
 */
interface ChangeBatch {
  changes: FileChangeEvent[];
  timestamp: number;
  processingStarted: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RealTimeUpdaterConfig = {
  debounceDelay: 300,
  maxDebounceDelay: 2000,
  batchSize: 10,
  enableIntelligentDetection: true,
  enableIncrementalUpdates: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  ignorePatterns: [
    '**/.git/**',
    '**/node_modules/**',
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/*.tmp',
    '**/*.temp',
    '**/*.log'
  ],
  enablePerformanceMonitoring: true,
  cacheTTL: 60000, // 1 minute
  maxWatchers: 100,
  enableAdaptiveDebouncing: true,
  enableChangeCoalescing: true
};

/**
 * Real-Time Context Updater Events
 */
export enum RealTimeUpdaterEvent {
  FILE_CHANGED = 'file:changed',
  CONTEXT_UPDATED = 'context:updated',
  BATCH_PROCESSED = 'batch:processed',
  WATCHER_ADDED = 'watcher:added',
  WATCHER_REMOVED = 'watcher:removed',
  PERFORMANCE_UPDATE = 'performance:update',
  ERROR = 'error'
}

/**
 * Real-Time Context Updater
 */
export class RealTimeContextUpdater extends EventEmitter {
  private readonly config: RealTimeUpdaterConfig;
  private readonly contextSystem: ContextSystem;
  private readonly watchers = new Map<string, WatcherInfo>();
  private readonly pendingChanges = new Map<string, FileChangeEvent>();
  private readonly changeBatches: ChangeBatch[] = [];
  private readonly contextFileCache = new Map<string, { content: string; mtime: number; size: number }>();
  
  private debounceTimer: NodeJS.Timeout | null = null;
  private batchProcessingTimer: NodeJS.Timeout | null = null;
  private performanceMetrics: PerformanceMetrics;
  private isProcessing = false;
  private adaptiveDebounceDelay: number;
  private lastContextResult: ContextMergeResult | null = null;
  
  constructor(contextSystem: ContextSystem, config: Partial<RealTimeUpdaterConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.contextSystem = contextSystem;
    this.adaptiveDebounceDelay = this.config.debounceDelay;
    
    this.performanceMetrics = {
      totalUpdates: 0,
      averageUpdateTime: 0,
      cacheHitRate: 0,
      incrementalUpdateRate: 0,
      lastUpdateTime: 0,
      watcherCount: 0,
      memoryUsage: 0
    };
    
    // Listen to context system events
    this.contextSystem.on(ContextEvent.CONTEXT_LOADED, this.handleContextLoaded.bind(this));
    this.contextSystem.on(ContextEvent.CONTEXT_ERROR, this.handleContextError.bind(this));
    
    // Performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      setInterval(() => this.updatePerformanceMetrics(), 5000);
    }
  }
  
  /**
   * Start watching for context file changes
   */
  public async startWatching(rootPaths: string[]): Promise<void> {
    try {
      for (const rootPath of rootPaths) {
        await this.addWatcher(rootPath);
      }
      
      logger.info(`Real-time context updater started watching ${rootPaths.length} paths`);
    } catch (error) {
      logger.error('Failed to start real-time context watching', error);
      this.emit(RealTimeUpdaterEvent.ERROR, error);
      throw error;
    }
  }
  
  /**
   * Stop all watchers
   */
  public stopWatching(): void {
    // Clear timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    if (this.batchProcessingTimer) {
      clearTimeout(this.batchProcessingTimer);
      this.batchProcessingTimer = null;
    }
    
    // Close all watchers
    for (const [path, watcherInfo] of this.watchers) {
      try {
        watcherInfo.watcher.close();
        this.emit(RealTimeUpdaterEvent.WATCHER_REMOVED, { path });
      } catch (error) {
        logger.warn(`Failed to close watcher for ${path}`, error);
      }
    }
    
    this.watchers.clear();
    this.pendingChanges.clear();
    this.changeBatches.length = 0;
    
    logger.info('Real-time context updater stopped');
  }
  
  /**
   * Add a directory watcher
   */
  private async addWatcher(dirPath: string): Promise<void> {
    const resolvedPath = resolve(dirPath);
    
    // Check if already watching
    if (this.watchers.has(resolvedPath)) {
      return;
    }
    
    // Check watcher limit
    if (this.watchers.size >= this.config.maxWatchers) {
      logger.warn(`Maximum watcher limit reached (${this.config.maxWatchers}), skipping ${resolvedPath}`);
      return;
    }
    
    try {
      // Verify directory exists
      await access(resolvedPath);
      
      // Create watcher
      const watcher = watch(resolvedPath, { recursive: true }, (eventType, filename) => {
        if (filename) {
          this.handleFileChange(eventType, resolvedPath, filename);
        }
      });
      
      // Track context files in this directory
      const contextFiles = await this.discoverContextFiles(resolvedPath);
      
      const watcherInfo: WatcherInfo = {
        watcher,
        path: resolvedPath,
        contextFiles,
        lastActivity: Date.now(),
        changeCount: 0
      };
      
      this.watchers.set(resolvedPath, watcherInfo);
      this.emit(RealTimeUpdaterEvent.WATCHER_ADDED, { path: resolvedPath, contextFileCount: contextFiles.size });
      
      logger.debug(`Added watcher for ${resolvedPath} (${contextFiles.size} context files)`);
      
    } catch (error) {
      logger.error(`Failed to add watcher for ${resolvedPath}`, error);
      throw error;
    }
  }
  
  /**
   * Discover context files in a directory
   */
  private async discoverContextFiles(dirPath: string): Promise<Set<string>> {
    const contextFiles = new Set<string>();
    
    // Use context system's configuration to find context files
    const contextFilenames = ['VIBEX.md', 'CLAUDE.md', 'GEMINI.md', '.vibexrc', 'vibex.json'];
    
    try {
      const { readdir } = await import('fs/promises');
      const entries = await readdir(dirPath, { withFileTypes: true, recursive: true });
      
      for (const entry of entries) {
        if (entry.isFile() && contextFilenames.includes(entry.name)) {
          const fullPath = join(dirPath, entry.name);
          contextFiles.add(fullPath);
        }
      }
    } catch (error) {
      logger.debug(`Error discovering context files in ${dirPath}`, error);
    }
    
    return contextFiles;
  }
  
  /**
   * Handle file system change event
   */
  private handleFileChange(eventType: string, watcherPath: string, filename: string): void {
    const fullPath = join(watcherPath, filename);
    const changeEvent: FileChangeEvent = {
      type: this.mapEventType(eventType),
      path: fullPath,
      filename: basename(fullPath),
      timestamp: Date.now()
    };
    
    // Update watcher activity
    const watcherInfo = this.watchers.get(watcherPath);
    if (watcherInfo) {
      watcherInfo.lastActivity = Date.now();
      watcherInfo.changeCount++;
    }
    
    // Check if we should ignore this file
    if (this.shouldIgnoreFile(fullPath)) {
      return;
    }
    
    // Check if this affects context files
    if (!this.isContextRelevant(fullPath, watcherInfo)) {
      return;
    }
    
    this.emit(RealTimeUpdaterEvent.FILE_CHANGED, changeEvent);
    
    // Add to pending changes
    if (this.config.enableChangeCoalescing) {
      this.coalesceChange(changeEvent);
    } else {
      this.processSingleChange(changeEvent);
    }
  }
  
  /**
   * Map file system event type
   */
  private mapEventType(eventType: string): FileChangeType {
    switch (eventType) {
      case 'change':
        return FileChangeType.MODIFIED;
      case 'rename':
        return FileChangeType.RENAMED;
      default:
        return FileChangeType.MODIFIED;
    }
  }
  
  /**
   * Check if file should be ignored
   */
  private shouldIgnoreFile(filePath: string): boolean {
    const relativePath = relative(process.cwd(), filePath);
    
    return this.config.ignorePatterns.some(pattern => {
      // Simple glob-like pattern matching
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      return regex.test(relativePath);
    });
  }
  
  /**
   * Check if file change is relevant to context
   */
  private isContextRelevant(filePath: string, watcherInfo?: WatcherInfo): boolean {
    const filename = basename(filePath);
    
    // Context files
    const contextFilenames = ['VIBEX.md', 'CLAUDE.md', 'GEMINI.md', '.vibexrc', 'vibex.json'];
    if (contextFilenames.includes(filename)) {
      return true;
    }
    
    // Check if it's in a tracked context directory
    if (watcherInfo && watcherInfo.contextFiles.has(filePath)) {
      return true;
    }
    
    // Check for files that might contain context references
    if (filename.endsWith('.md') || filename.endsWith('.txt')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Coalesce similar changes
   */
  private coalesceChange(changeEvent: FileChangeEvent): void {
    const key = changeEvent.path;
    
    // Replace existing change for the same file
    this.pendingChanges.set(key, changeEvent);
    
    // Schedule debounced processing
    this.scheduleProcessing();
  }
  
  /**
   * Process a single change immediately
   */
  private processSingleChange(changeEvent: FileChangeEvent): void {
    this.pendingChanges.set(changeEvent.path, changeEvent);
    this.scheduleProcessing();
  }
  
  /**
   * Schedule debounced processing
   */
  private scheduleProcessing(): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Calculate adaptive debounce delay
    const delay = this.config.enableAdaptiveDebouncing 
      ? this.calculateAdaptiveDelay()
      : this.config.debounceDelay;
    
    // Schedule processing
    this.debounceTimer = setTimeout(() => {
      this.processPendingChanges();
    }, delay);
  }
  
  /**
   * Calculate adaptive debounce delay based on activity
   */
  private calculateAdaptiveDelay(): number {
    const totalActivity = Array.from(this.watchers.values())
      .reduce((sum, info) => sum + info.changeCount, 0);
    
    // Increase delay for high activity
    if (totalActivity > 50) {
      return Math.min(this.config.maxDebounceDelay, this.config.debounceDelay * 3);
    } else if (totalActivity > 20) {
      return Math.min(this.config.maxDebounceDelay, this.config.debounceDelay * 2);
    }
    
    return this.config.debounceDelay;
  }
  
  /**
   * Process pending changes
   */
  private async processPendingChanges(): Promise<void> {
    if (this.isProcessing || this.pendingChanges.size === 0) {
      return;
    }
    
    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      // Create batch from pending changes
      const changes = Array.from(this.pendingChanges.values());
      this.pendingChanges.clear();
      
      const batch: ChangeBatch = {
        changes,
        timestamp: Date.now(),
        processingStarted: true
      };
      
      this.changeBatches.push(batch);
      
      // Process the batch
      await this.processBatch(batch);
      
      // Update metrics
      this.performanceMetrics.totalUpdates++;
      this.performanceMetrics.lastUpdateTime = Date.now() - startTime;
      
      // Update average
      this.performanceMetrics.averageUpdateTime = 
        (this.performanceMetrics.averageUpdateTime * (this.performanceMetrics.totalUpdates - 1) + 
         this.performanceMetrics.lastUpdateTime) / this.performanceMetrics.totalUpdates;
      
    } catch (error) {
      logger.error('Error processing pending changes', error);
      this.emit(RealTimeUpdaterEvent.ERROR, error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Process a batch of changes
   */
  private async processBatch(batch: ChangeBatch): Promise<void> {
    const affectedPaths = new Set<string>();
    let updateType: 'full' | 'incremental' | 'cached' = 'full';
    
    // Analyze changes to determine update strategy
    for (const change of batch.changes) {
      affectedPaths.add(dirname(change.path));
      
      // Check if we can use cached content
      if (this.config.enableIncrementalUpdates && this.canUseIncrementalUpdate(change)) {
        updateType = 'incremental';
      }
    }
    
    try {
      let result: ContextMergeResult;
      
      if (updateType === 'incremental' && this.lastContextResult) {
        result = await this.performIncrementalUpdate(batch.changes, this.lastContextResult);
        this.performanceMetrics.incrementalUpdateRate = 
          (this.performanceMetrics.incrementalUpdateRate * 0.9) + (0.1 * 1);
      } else {
        // Full context reload
        result = await this.contextSystem.loadContext();
        this.performanceMetrics.incrementalUpdateRate = 
          (this.performanceMetrics.incrementalUpdateRate * 0.9) + (0.1 * 0);
      }
      
      this.lastContextResult = result;
      
      const updateEvent: ContextUpdateEvent = {
        trigger: batch.changes[0], // Use first change as trigger
        affectedEntries: Array.from(affectedPaths),
        updateType,
        processingTime: Date.now() - batch.timestamp,
        result
      };
      
      this.emit(RealTimeUpdaterEvent.CONTEXT_UPDATED, updateEvent);
      this.emit(RealTimeUpdaterEvent.BATCH_PROCESSED, { batch, updateEvent });
      
      logger.debug(`Processed batch of ${batch.changes.length} changes (${updateType} update)`);
      
    } catch (error) {
      const updateEvent: ContextUpdateEvent = {
        trigger: batch.changes[0],
        affectedEntries: Array.from(affectedPaths),
        updateType,
        processingTime: Date.now() - batch.timestamp,
        error: error as Error
      };
      
      this.emit(RealTimeUpdaterEvent.CONTEXT_UPDATED, updateEvent);
      throw error;
    }
  }
  
  /**
   * Check if incremental update is possible
   */
  private canUseIncrementalUpdate(change: FileChangeEvent): boolean {
    if (!this.lastContextResult) {
      return false;
    }
    
    // Only for modifications of existing context files
    if (change.type !== FileChangeType.MODIFIED) {
      return false;
    }
    
    // Check if the file is in our last result
    return this.lastContextResult.entries.some(entry => entry.path === change.path);
  }
  
  /**
   * Perform incremental update
   */
  private async performIncrementalUpdate(
    changes: FileChangeEvent[],
    lastResult: ContextMergeResult
  ): Promise<ContextMergeResult> {
    const updatedEntries = [...lastResult.entries];
    let hasChanges = false;
    
    for (const change of changes) {
      if (change.type === FileChangeType.MODIFIED) {
        const entryIndex = updatedEntries.findIndex(entry => entry.path === change.path);
        
        if (entryIndex >= 0) {
          try {
            // Read updated file content
            const { readFile } = await import('fs/promises');
            const newContent = await readFile(change.path, 'utf8');
            const stats = await stat(change.path);
            
            // Update entry
            updatedEntries[entryIndex] = {
              ...updatedEntries[entryIndex],
              content: newContent,
              lastModified: stats.mtime.getTime()
            };
            
            hasChanges = true;
            
          } catch (error) {
            logger.warn(`Failed to read updated file ${change.path}`, error);
          }
        }
      }
    }
    
    if (!hasChanges) {
      return lastResult;
    }
    
    // Recalculate merged content
    const mergedContent = updatedEntries
      .sort((a, b) => b.priority - a.priority)
      .map(entry => entry.content)
      .join('\n\n');
    
    const totalSize = updatedEntries.reduce((sum, entry) => sum + entry.content.length, 0);
    
    return {
      content: mergedContent,
      entries: updatedEntries,
      variables: lastResult.variables, // Keep existing variables for now
      stats: {
        totalFiles: updatedEntries.length,
        totalSize,
        processingTime: Date.now()
      },
      errors: []
    };
  }
  
  /**
   * Handle context loaded event
   */
  private handleContextLoaded(result: ContextMergeResult): void {
    this.lastContextResult = result;
  }
  
  /**
   * Handle context error event
   */
  private handleContextError(error: Error): void {
    logger.error('Context system error', error);
  }
  
  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    this.performanceMetrics.watcherCount = this.watchers.size;
    this.performanceMetrics.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    
    this.emit(RealTimeUpdaterEvent.PERFORMANCE_UPDATE, this.performanceMetrics);
  }
  
  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }
  
  /**
   * Get watcher information
   */
  public getWatcherInfo(): Array<{ path: string; contextFileCount: number; lastActivity: number; changeCount: number }> {
    return Array.from(this.watchers.entries()).map(([path, info]) => ({
      path,
      contextFileCount: info.contextFiles.size,
      lastActivity: info.lastActivity,
      changeCount: info.changeCount
    }));
  }
  
  /**
   * Force a context update
   */
  public async forceUpdate(): Promise<ContextMergeResult> {
    const result = await this.contextSystem.loadContext();
    this.lastContextResult = result;
    return result;
  }
}

/**
 * Create a real-time context updater
 */
export function createRealTimeContextUpdater(
  contextSystem: ContextSystem,
  config: Partial<RealTimeUpdaterConfig> = {}
): RealTimeContextUpdater {
  return new RealTimeContextUpdater(contextSystem, config);
}

export default RealTimeContextUpdater; 