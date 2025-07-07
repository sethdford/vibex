/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Configuration Management System
 * 
 * Provides centralized configuration management with validation,
 * hot-reload support, and environment-specific overrides.
 */

import { EventEmitter } from 'events';
import { z } from 'zod';
import { logger } from '../../utils/logger.js';

/**
 * Configuration source interface
 */
export interface ConfigSource {
  name: string;
  priority: number;
  load(): Promise<Record<string, any>>;
  watch?(callback: () => void): void;
  unwatch?(): void;
}

/**
 * Configuration manager interface
 */
export interface IConfigManager {
  get<T>(key: string, defaultValue?: T): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  getAll(): Record<string, any>;
  reload(): Promise<void>;
  validate(): Promise<boolean>;
  on(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
}

/**
 * Configuration validation schema
 */
export interface ConfigSchema {
  [key: string]: z.ZodType<any> | ConfigSchema;
}

/**
 * Configuration manager implementation
 */
export class ConfigManager extends EventEmitter implements IConfigManager {
  private config: Record<string, any> = {};
  private sources: ConfigSource[] = [];
  private schema?: z.ZodType<any>;
  private watchers: Array<() => void> = [];

  constructor(schema?: z.ZodType<any>) {
    super();
    this.schema = schema;
  }

  /**
   * Add a configuration source
   */
  addSource(source: ConfigSource): void {
    this.sources.push(source);
    this.sources.sort((a, b) => b.priority - a.priority); // Higher priority first

    // Setup watcher if supported
    if (source.watch) {
      const watcher = () => {
        this.reload().catch(error => {
          this.emit('error', error);
        });
      };
      source.watch(watcher);
      this.watchers.push(watcher);
    }

    logger.debug(`Configuration source added`, {
      name: source.name,
      priority: source.priority
    });
  }

  /**
   * Remove a configuration source
   */
  removeSource(sourceName: string): void {
    const index = this.sources.findIndex(s => s.name === sourceName);
    if (index >= 0) {
      const source = this.sources[index];
      if (source.unwatch) {
        source.unwatch();
      }
      this.sources.splice(index, 1);
      
      logger.debug(`Configuration source removed`, { name: sourceName });
    }
  }

  /**
   * Load configuration from all sources
   */
  async reload(): Promise<void> {
    const newConfig: Record<string, any> = {};

    // Load from all sources in priority order
    for (const source of this.sources) {
      try {
        const sourceConfig = await source.load();
        this.mergeConfig(newConfig, sourceConfig);
        
        logger.debug(`Configuration loaded from source`, {
          name: source.name,
          keys: Object.keys(sourceConfig).length
        });
      } catch (error) {
        logger.error(`Failed to load configuration from source`, {
          name: source.name,
          error: error instanceof Error ? error.message : String(error)
        });
        this.emit('sourceError', source.name, error);
      }
    }

    // Validate configuration
    if (this.schema) {
      try {
        this.schema.parse(newConfig);
      } catch (error) {
        logger.error('Configuration validation failed', { error });
        this.emit('validationError', error);
        throw error;
      }
    }

    const oldConfig = this.config;
    this.config = newConfig;

    // Emit change events
    this.emitChanges(oldConfig, newConfig);
    this.emit('configReloaded', newConfig);

    logger.info('Configuration reloaded successfully');
  }

  /**
   * Get configuration value
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.getNestedValue(this.config, key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set configuration value
   */
  set<T>(key: string, value: T): void {
    const oldValue = this.get(key);
    this.setNestedValue(this.config, key, value);
    
    if (oldValue !== value) {
      this.emit('configChanged', key, value, oldValue);
    }

    logger.debug(`Configuration value set`, { key, value });
  }

  /**
   * Check if configuration key exists
   */
  has(key: string): boolean {
    return this.getNestedValue(this.config, key) !== undefined;
  }

  /**
   * Get all configuration
   */
  getAll(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Validate current configuration
   */
  async validate(): Promise<boolean> {
    if (!this.schema) {
      return true;
    }

    try {
      this.schema.parse(this.config);
      return true;
    } catch (error) {
      logger.error('Configuration validation failed', { error });
      return false;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Unwatch all sources
    for (const source of this.sources) {
      if (source.unwatch) {
        source.unwatch();
      }
    }

    this.sources = [];
    this.watchers = [];
    this.removeAllListeners();

    logger.debug('Configuration manager disposed');
  }

  private mergeConfig(target: Record<string, any>, source: Record<string, any>): void {
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        this.mergeConfig(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  private emitChanges(oldConfig: Record<string, any>, newConfig: Record<string, any>): void {
    const allKeys = new Set([
      ...this.getAllKeys(oldConfig),
      ...this.getAllKeys(newConfig)
    ]);

    for (const key of allKeys) {
      const oldValue = this.getNestedValue(oldConfig, key);
      const newValue = this.getNestedValue(newConfig, key);

      if (oldValue !== newValue) {
        this.emit('configChanged', key, newValue, oldValue);
      }
    }
  }

  private getAllKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys.push(...this.getAllKeys(value, fullKey));
      }
    }

    return keys;
  }
}

/**
 * File-based configuration source
 */
export class FileConfigSource implements ConfigSource {
  public readonly name: string;
  public readonly priority: number;
  private watcher?: import('fs').FSWatcher;
  private watchCallback?: () => void;

  constructor(
    private filePath: string,
    priority = 0,
    name?: string
  ) {
    this.name = name || `file:${filePath}`;
    this.priority = priority;
  }

  async load(): Promise<Record<string, any>> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.filePath, 'utf-8');
      
      if (this.filePath.endsWith('.json')) {
        return JSON.parse(content);
      } else if (this.filePath.endsWith('.yaml') || this.filePath.endsWith('.yml')) {
        // Dynamic import for yaml parsing - optional dependency
        try {
          // Use require to avoid TypeScript module resolution issues
          const yaml = eval('require')('yaml');
          return yaml.parse(content);
        } catch (importError) {
          throw new Error(`YAML support requires 'yaml' package. Install with: npm install yaml`);
        }
      } else {
        throw new Error(`Unsupported file format: ${this.filePath}`);
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        logger.debug(`Configuration file not found: ${this.filePath}`);
        return {};
      }
      throw error;
    }
  }

  watch(callback: () => void): void {
    this.watchCallback = callback;
    
    import('fs').then(fs => {
      this.watcher = fs.watch(this.filePath, () => {
        if (this.watchCallback) {
          // Debounce file changes
          setTimeout(this.watchCallback, 100);
        }
      });
    });
  }

  unwatch(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
    this.watchCallback = undefined;
  }
}

/**
 * Environment variables configuration source
 */
export class EnvironmentConfigSource implements ConfigSource {
  public readonly name = 'environment';
  public readonly priority: number;

  constructor(
    private prefix = '',
    priority = 100
  ) {
    this.priority = priority;
  }

  async load(): Promise<Record<string, any>> {
    const config: Record<string, any> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (!this.prefix || key.startsWith(this.prefix)) {
        const configKey = this.prefix ? key.slice(this.prefix.length) : key;
        const normalizedKey = this.normalizeKey(configKey);
        
        if (normalizedKey) {
          config[normalizedKey] = this.parseValue(value);
        }
      }
    }

    return config;
  }

  private normalizeKey(key: string): string {
    // Convert SCREAMING_SNAKE_CASE to nested.object.notation
    return key
      .toLowerCase()
      .replace(/_/g, '.')
      .replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots
  }

  private parseValue(value: string | undefined): any {
    if (value === undefined) {
      return undefined;
    }

    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // Return as string if not valid JSON
      return value;
    }
  }
}

/**
 * Command line arguments configuration source
 */
export class ArgumentsConfigSource implements ConfigSource {
  public readonly name = 'arguments';
  public readonly priority: number;

  constructor(private args: string[] = process.argv.slice(2), priority = 200) {
    this.priority = priority;
  }

  async load(): Promise<Record<string, any>> {
    const config: Record<string, any> = {};

    for (let i = 0; i < this.args.length; i++) {
      const arg = this.args[i];
      
      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        let value: any = true;

        // Check if next argument is a value
        if (i + 1 < this.args.length && !this.args[i + 1].startsWith('-')) {
          value = this.parseValue(this.args[i + 1]);
          i++; // Skip the value argument
        }

        const normalizedKey = key.replace(/-/g, '.');
        this.setNestedValue(config, normalizedKey, value);
      }
    }

    return config;
  }

  private parseValue(value: string): any {
    // Try to parse as number
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // Try to parse as boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }
}

/**
 * Configuration factory
 */
export class ConfigFactory {
  static createManager(schema?: z.ZodType<any>): ConfigManager {
    return new ConfigManager(schema);
  }

  static createFileSource(filePath: string, priority = 0, name?: string): FileConfigSource {
    return new FileConfigSource(filePath, priority, name);
  }

  static createEnvironmentSource(prefix = '', priority = 100): EnvironmentConfigSource {
    return new EnvironmentConfigSource(prefix, priority);
  }

  static createArgumentsSource(args?: string[], priority = 200): ArgumentsConfigSource {
    return new ArgumentsConfigSource(args, priority);
  }

  static async createDefaultManager(
    configFile?: string,
    schema?: z.ZodType<any>
  ): Promise<ConfigManager> {
    const manager = new ConfigManager(schema);

    // Add default sources
    if (configFile) {
      manager.addSource(new FileConfigSource(configFile, 0));
    }
    
    manager.addSource(new EnvironmentConfigSource('VIBEX_', 100));
    manager.addSource(new ArgumentsConfigSource(undefined, 200));

    // Initial load
    await manager.reload();

    return manager;
  }
} 