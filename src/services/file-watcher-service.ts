/**
 * File Watcher Service
 * 
 * Single Responsibility: Handle file system watching and change events
 * Following Gemini CLI's clean architecture patterns
 */

import { EventEmitter } from 'events';
import { watch, FSWatcher } from 'fs';
import { join, relative } from 'path';
import { stat } from 'fs/promises';
import { logger } from '../utils/logger.js';

export interface FileWatcherConfig {
  recursive?: boolean;
  ignored?: string[];
  debounceMs?: number;
  maxWatchers?: number;
}

export enum FileChangeType {
  CREATED = 'created',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  RENAMED = 'renamed'
}

export interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  relativePath?: string;
  timestamp: number;
  stats?: {
    size: number;
    modified: Date;
  };
}

export interface WatcherInfo {
  path: string;
  recursive: boolean;
  created: number;
  eventCount: number;
  lastEvent?: number;
}

/**
 * File Watcher Service - Clean Architecture
 * Focus: File system watching and change event management
 */
export class FileWatcherService extends EventEmitter {
  private config: Required<FileWatcherConfig>;
  private watchers: Map<string, FSWatcher> = new Map();
  private watcherInfo: Map<string, WatcherInfo> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: FileWatcherConfig = {}) {
    super();
    
    this.config = {
      recursive: config.recursive ?? true,
      ignored: config.ignored || [
        'node_modules',
        '.git',
        'dist',
        'build',
        '.DS_Store',
        'Thumbs.db',
        '*.tmp',
        '*.log'
      ],
      debounceMs: config.debounceMs || 100,
      maxWatchers: config.maxWatchers || 50
    };

    logger.debug('File watcher service initialized', {
      config: this.config
    });
  }

  /**
   * Start watching a directory or file
   */
  watch(path: string, recursive?: boolean): boolean {
    try {
      // Check if already watching
      if (this.watchers.has(path)) {
        logger.debug(`Already watching: ${path}`);
        return true;
      }

      // Check watcher limit
      if (this.watchers.size >= this.config.maxWatchers) {
        logger.warn(`Maximum watchers reached (${this.config.maxWatchers})`);
        return false;
      }

      const useRecursive = recursive ?? this.config.recursive;

      // Create watcher
      const watcher = watch(
        path,
        { recursive: useRecursive },
        (eventType: string, filename: string | null) => {
          if (filename) {
            this.handleFileSystemEvent(path, eventType, filename);
          }
        }
      );

      // Handle watcher errors
      watcher.on('error', (error) => {
        logger.error(`Watcher error for ${path}`, error);
        this.emit('error', { path, error });
        this.unwatch(path);
      });

      this.watchers.set(path, watcher);
      this.watcherInfo.set(path, {
        path,
        recursive: useRecursive,
        created: Date.now(),
        eventCount: 0
      });

      logger.debug(`Started watching: ${path}`, {
        recursive: useRecursive,
        totalWatchers: this.watchers.size
      });

      this.emit('watcherAdded', { path, recursive: useRecursive });
      return true;
    } catch (error) {
      logger.error(`Failed to watch: ${path}`, error);
      this.emit('error', { path, error });
      return false;
    }
  }

  /**
   * Stop watching a directory or file
   */
  unwatch(path: string): boolean {
    try {
      const watcher = this.watchers.get(path);
      
      if (watcher) {
        watcher.close();
        this.watchers.delete(path);
        this.watcherInfo.delete(path);

        // Clear any pending debounce timers for this path
        this.clearDebounceTimers(path);

        logger.debug(`Stopped watching: ${path}`, {
          remainingWatchers: this.watchers.size
        });

        this.emit('watcherRemoved', { path });
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to unwatch: ${path}`, error);
      return false;
    }
  }

  /**
   * Stop watching all paths
   */
  unwatchAll(): void {
    const paths = Array.from(this.watchers.keys());
    
    for (const path of paths) {
      this.unwatch(path);
    }

    logger.debug('Stopped watching all paths');
  }

  /**
   * Get list of watched paths
   */
  getWatchedPaths(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * Get watcher information
   */
  getWatcherInfo(path?: string): WatcherInfo[] {
    if (path) {
      const info = this.watcherInfo.get(path);
      return info ? [info] : [];
    }

    return Array.from(this.watcherInfo.values());
  }

  /**
   * Check if path is being watched
   */
  isWatching(path: string): boolean {
    return this.watchers.has(path);
  }

  /**
   * Get watcher statistics
   */
  getStats(): {
    totalWatchers: number;
    maxWatchers: number;
    totalEvents: number;
    watchedPaths: string[];
  } {
    const infos = Array.from(this.watcherInfo.values());
    const totalEvents = infos.reduce((sum, info) => sum + info.eventCount, 0);

    return {
      totalWatchers: this.watchers.size,
      maxWatchers: this.config.maxWatchers,
      totalEvents,
      watchedPaths: this.getWatchedPaths()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<FileWatcherConfig>): void {
    this.config = { ...this.config, ...updates };
    
    logger.debug('File watcher configuration updated', {
      config: this.config
    });
  }

  /**
   * Destroy all watchers and clean up
   */
  destroy(): void {
    this.unwatchAll();
    this.clearAllDebounceTimers();
    this.removeAllListeners();
    
    logger.debug('File watcher service destroyed');
  }

  /**
   * Handle file system events
   */
  private handleFileSystemEvent(watchPath: string, eventType: string, filename: string): void {
    const fullPath = join(watchPath, filename);
    const relativePath = relative(watchPath, fullPath);

    // Check if file should be ignored
    if (this.shouldIgnore(relativePath)) {
      return;
    }

    // Update watcher info
    const info = this.watcherInfo.get(watchPath);
    if (info) {
      info.eventCount++;
      info.lastEvent = Date.now();
    }

    // Debounce rapid events
    this.debounceEvent(fullPath, () => {
      this.processFileEvent(watchPath, eventType, fullPath, relativePath);
    });
  }

  /**
   * Process file system event after debouncing
   */
  private async processFileEvent(
    watchPath: string,
    eventType: string,
    fullPath: string,
    relativePath: string
  ): Promise<void> {
    try {
      let changeType: FileChangeType;
      let stats: { size: number; modified: Date } | undefined;

      switch (eventType) {
        case 'change':
          changeType = FileChangeType.MODIFIED;
          break;
        case 'rename':
          // Check if file exists to determine if it's create or delete
          try {
            const fileStat = await stat(fullPath);
            changeType = FileChangeType.CREATED;
            stats = {
              size: fileStat.size,
              modified: fileStat.mtime
            };
          } catch {
            changeType = FileChangeType.DELETED;
          }
          break;
        default:
          changeType = FileChangeType.MODIFIED;
      }

      // Get file stats for existing files
      if (changeType !== FileChangeType.DELETED && !stats) {
        try {
          const fileStat = await stat(fullPath);
          stats = {
            size: fileStat.size,
            modified: fileStat.mtime
          };
        } catch (error) {
          logger.warn(`Failed to get stats for ${fullPath}`, error);
        }
      }

      const event: FileChangeEvent = {
        type: changeType,
        path: fullPath,
        relativePath,
        timestamp: Date.now(),
        stats
      };

      logger.debug(`File event: ${changeType}`, {
        path: fullPath,
        relativePath,
        stats
      });

      // Emit specific event type
      this.emit(changeType, event);
      
      // Emit general change event
      this.emit('change', event);
    } catch (error) {
      logger.error(`Failed to process file event: ${fullPath}`, error);
      this.emit('error', { path: fullPath, error });
    }
  }

  /**
   * Debounce rapid file events
   */
  private debounceEvent(path: string, callback: () => void): void {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(path);
      callback();
    }, this.config.debounceMs);

    this.debounceTimers.set(path, timer);
  }

  /**
   * Check if file should be ignored
   */
  private shouldIgnore(relativePath: string): boolean {
    return this.config.ignored.some(pattern => {
      // Simple pattern matching (could be enhanced with glob patterns)
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(relativePath);
      }
      
      return relativePath.includes(pattern);
    });
  }

  /**
   * Clear debounce timers for a specific path
   */
  private clearDebounceTimers(path: string): void {
    for (const [timerPath, timer] of this.debounceTimers.entries()) {
      if (timerPath.startsWith(path)) {
        clearTimeout(timer);
        this.debounceTimers.delete(timerPath);
      }
    }
  }

  /**
   * Clear all debounce timers
   */
  private clearAllDebounceTimers(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}

// Factory function for creating file watcher service
export function createFileWatcherService(config?: FileWatcherConfig): FileWatcherService {
  return new FileWatcherService(config);
} 