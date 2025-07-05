/**
 * Advanced Configuration System
 * External store, environment hierarchy, real-time updates
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { z } from 'zod';

// Configuration Scope Hierarchy
export enum ConfigScope {
  SYSTEM = 'system',
  USER = 'user', 
  WORKSPACE = 'workspace',
  RUNTIME = 'runtime'
}

// Configuration Change Event
export interface ConfigChangeEvent {
  scope: ConfigScope;
  key: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: Date;
  source: string;
}

// Configuration Store Interface
export interface ConfigStore {
  get<T>(scope: ConfigScope, key: string): Promise<T | undefined>;
  set<T>(scope: ConfigScope, key: string, value: T): Promise<void>;
  delete(scope: ConfigScope, key: string): Promise<boolean>;
  list(scope: ConfigScope): Promise<Record<string, unknown>>;
  watch(scope: ConfigScope, key: string, callback: (event: ConfigChangeEvent) => void): () => void;
  backup(scope: ConfigScope): Promise<string>; // Returns backup ID
  restore(scope: ConfigScope, backupId: string): Promise<void>;
  clear(scope: ConfigScope): Promise<void>;
}

// File-based Configuration Store
export class FileConfigStore implements ConfigStore {
  private configDir: string;
  private eventEmitter = new EventEmitter();
  private watchers = new Map<string, Set<(event: ConfigChangeEvent) => void>>();

  constructor(configDir: string) {
    this.configDir = configDir;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.configDir, { recursive: true });
    
    // Create scope directories
    for (const scope of Object.values(ConfigScope)) {
      await fs.mkdir(join(this.configDir, scope), { recursive: true });
    }
  }

  private getConfigPath(scope: ConfigScope, key?: string): string {
    const scopePath = join(this.configDir, scope);
    return key ? join(scopePath, `${key}.json`) : scopePath;
  }

  private getBackupPath(scope: ConfigScope, backupId: string): string {
    return join(this.configDir, 'backups', scope, `${backupId}.json`);
  }

  async get<T>(scope: ConfigScope, key: string): Promise<T | undefined> {
    try {
      const configPath = this.getConfigPath(scope, key);
      const data = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.value as T;
    } catch {
      return undefined;
    }
  }

  async set<T>(scope: ConfigScope, key: string, value: T): Promise<void> {
    await this.initialize();
    
    const configPath = this.getConfigPath(scope, key);
    const oldValue = await this.get(scope, key);
    
    const configData = {
      value,
      timestamp: new Date().toISOString(),
      scope,
      key
    };

    await fs.writeFile(configPath, JSON.stringify(configData, null, 2));

    // Emit change event
    const event: ConfigChangeEvent = {
      scope,
      key,
      oldValue,
      newValue: value,
      timestamp: new Date(),
      source: 'file-store'
    };

    this.emitChange(event);
  }

  async delete(scope: ConfigScope, key: string): Promise<boolean> {
    try {
      const configPath = this.getConfigPath(scope, key);
      const oldValue = await this.get(scope, key);
      
      await fs.unlink(configPath);

      // Emit change event
      const event: ConfigChangeEvent = {
        scope,
        key,
        oldValue,
        newValue: undefined,
        timestamp: new Date(),
        source: 'file-store'
      };

      this.emitChange(event);
      return true;
    } catch {
      return false;
    }
  }

  async list(scope: ConfigScope): Promise<Record<string, unknown>> {
    try {
      const scopePath = this.getConfigPath(scope);
      const files = await fs.readdir(scopePath);
      const configs: Record<string, unknown> = {};

      for (const file of files) {
        if (file.endsWith('.json')) {
          const key = file.replace('.json', '');
          const value = await this.get(scope, key);
          if (value !== undefined) {
            configs[key] = value;
          }
        }
      }

      return configs;
    } catch {
      return {};
    }
  }

  watch(scope: ConfigScope, key: string, callback: (event: ConfigChangeEvent) => void): () => void {
    const watchKey = `${scope}:${key}`;
    
    if (!this.watchers.has(watchKey)) {
      this.watchers.set(watchKey, new Set());
    }
    
    this.watchers.get(watchKey)!.add(callback);

    // Return unwatch function
    return () => {
      const callbacks = this.watchers.get(watchKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.watchers.delete(watchKey);
        }
      }
    };
  }

  async backup(scope: ConfigScope): Promise<string> {
    await this.initialize();
    
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const backupPath = this.getBackupPath(scope, backupId);
    
    // Ensure backup directory exists
    await fs.mkdir(dirname(backupPath), { recursive: true });
    
    // Get all configurations for the scope
    const configs = await this.list(scope);
    
    const backupData = {
      scope,
      timestamp: new Date().toISOString(),
      configs
    };

    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
    return backupId;
  }

  async restore(scope: ConfigScope, backupId: string): Promise<void> {
    const backupPath = this.getBackupPath(scope, backupId);
    
    try {
      const backupData = JSON.parse(await fs.readFile(backupPath, 'utf-8'));
      
      // Validate backup data structure
      if (!backupData || typeof backupData !== 'object' || !backupData.configs) {
        throw new Error('Invalid backup data structure');
      }
      
      // Clear current scope
      await this.clear(scope);
      
      // Restore configurations
      for (const [key, value] of Object.entries(backupData.configs)) {
        await this.set(scope, key, value);
      }
    } catch (error) {
      throw new Error(`Failed to restore backup ${backupId}: ${error}`);
    }
  }

  async clear(scope: ConfigScope): Promise<void> {
    try {
      const scopePath = this.getConfigPath(scope);
      const files = await fs.readdir(scopePath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(join(scopePath, file));
        }
      }
    } catch {
      // Directory doesn't exist or is empty
    }
  }

  private emitChange(event: ConfigChangeEvent): void {
    const watchKey = `${event.scope}:${event.key}`;
    const callbacks = this.watchers.get(watchKey);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in config change callback:', error);
        }
      });
    }

    // Also emit global change event
    this.eventEmitter.emit('change', event);
  }
}

// Hierarchical Configuration Manager
export class HierarchicalConfigManager {
  private store: ConfigStore;
  private cache = new Map<string, { value: unknown; timestamp: number; scope: ConfigScope }>();
  private watchers = new Map<string, Set<(value: unknown) => void>>();
  private cacheTimeout = 5000; // 5 seconds

  constructor(store: ConfigStore) {
    this.store = store;
  }

  /**
   * Get configuration value with scope hierarchy
   * Priority: runtime > workspace > user > system
   */
  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    // Check cache first
    const cached = this.getCached<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Search through hierarchy
    const scopes = [ConfigScope.RUNTIME, ConfigScope.WORKSPACE, ConfigScope.USER, ConfigScope.SYSTEM];
    
    for (const scope of scopes) {
      const value = await this.store.get<T>(scope, key);
      if (value !== undefined) {
        this.setCache(key, value, scope);
        return value;
      }
    }

    return defaultValue;
  }

  /**
   * Set configuration value at specific scope
   */
  async set<T>(key: string, value: T, scope: ConfigScope = ConfigScope.USER): Promise<void> {
    await this.store.set(scope, key, value);
    this.setCache(key, value, scope);
    this.notifyWatchers(key, value);
  }

  /**
   * Delete configuration at specific scope
   */
  async delete(key: string, scope: ConfigScope): Promise<boolean> {
    const result = await this.store.delete(scope, key);
    if (result) {
      this.invalidateCache(key);
      // Get new value from hierarchy
      const newValue = await this.get(key);
      this.notifyWatchers(key, newValue);
    }
    return result;
  }

  /**
   * Get all configurations at a specific scope
   */
  async getScope(scope: ConfigScope): Promise<Record<string, unknown>> {
    return await this.store.list(scope);
  }

  /**
   * Watch for configuration changes
   */
  watch<T>(key: string, callback: (value: T | undefined) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    
    this.watchers.get(key)!.add(callback as (value: unknown) => void);

    // Return unwatch function
    return () => {
      const callbacks = this.watchers.get(key);
      if (callbacks) {
        callbacks.delete(callback as (value: unknown) => void);
        if (callbacks.size === 0) {
          this.watchers.delete(key);
        }
      }
    };
  }

  /**
   * Create backup of specific scope
   */
  async backup(scope: ConfigScope): Promise<string> {
    return await this.store.backup(scope);
  }

  /**
   * Restore from backup
   */
  async restore(scope: ConfigScope, backupId: string): Promise<void> {
    await this.store.restore(scope, backupId);
    this.clearCache();
  }

  /**
   * Clear all configurations at scope
   */
  async clear(scope: ConfigScope): Promise<void> {
    await this.store.clear(scope);
    this.clearCache();
  }

  // Cache management
  private getCached<T>(key: string): T | undefined {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value as T;
    }
    return undefined;
  }

  private setCache(key: string, value: unknown, scope: ConfigScope): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      scope
    });
  }

  private invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private notifyWatchers(key: string, value: unknown): void {
    const callbacks = this.watchers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error('Error in config watcher callback:', error);
        }
      });
    }
  }
}

// Factory function
export function createAdvancedConfigManager(configDir: string): HierarchicalConfigManager {
  const store = new FileConfigStore(configDir);
  return new HierarchicalConfigManager(store);
} 