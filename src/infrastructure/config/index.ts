/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * VibeX Infrastructure Configuration System
 * 
 * Modern, type-safe, event-driven configuration management system
 * that replaces all legacy configuration systems in VibeX.
 * 
 * Features:
 * - Comprehensive Zod schema validation
 * - Multi-source configuration loading (files, env vars, CLI args)
 * - Hot reload and real-time updates
 * - Backward compatibility with legacy systems
 * - Migration utilities for existing configurations
 * - Environment-specific configuration management
 */

// Core configuration management
export {
  ConfigManager,
  FileConfigSource,
  EnvironmentConfigSource,
  ArgumentsConfigSource,
  ConfigFactory
} from './config-manager.js';

export type {
  IConfigManager,
  ConfigSource
} from './config-manager.js';

// Configuration schema and types
export {
  VibexConfigSchema,
  defaultVibexConfig,
  validateVibexConfig,
  validatePartialVibexConfig,
  ConfigSectionSchemas,
  validateConfigSection
} from './vibex-config-schema.js';

export type {
  VibexConfig,
  ConfigSectionName
} from './vibex-config-schema.js';

// Configuration factory
export {
  VibexConfigFactory,
  configFactory
} from './vibex-config-factory.js';

// Migration and backward compatibility
export {
  ConfigMigrationService,
  ConfigAdapter
} from './config-migration.js';

export type {
  LegacyConfig
} from './config-migration.js';

/**
 * Quick start functions for common use cases
 */

/**
 * Create a production-ready configuration manager
 * 
 * This is the recommended way to initialize configuration in production.
 * It automatically detects and migrates from legacy configuration files.
 */
export async function createProductionConfig(options?: {
  configDir?: string;
  workspaceDir?: string;
  enableMigration?: boolean;
}) {
  return VibexConfigFactory.createProductionConfig(options);
}

/**
 * Create a development configuration manager
 * 
 * Includes hot reload and development-specific settings.
 */
export async function createDevelopmentConfig(options?: {
  configDir?: string;
  workspaceDir?: string;
  enableHotReload?: boolean;
}) {
  return VibexConfigFactory.createDevelopmentConfig(options);
}

/**
 * Create a test configuration manager
 * 
 * Isolated configuration for testing with mock services enabled.
 */
export async function createTestConfig(options?: {
  testDataDir?: string;
  isolateConfig?: boolean;
}) {
  return VibexConfigFactory.createTestConfig(options);
}

/**
 * Create configuration manager with automatic environment detection
 * 
 * Automatically chooses the appropriate configuration based on NODE_ENV.
 */
export async function createAutoConfig(options?: {
  configDir?: string;
  workspaceDir?: string;
  testDataDir?: string;
  isolateConfig?: boolean;
}) {
  return VibexConfigFactory.createAutoConfig(options);
}

/**
 * Create a minimal configuration manager for CLI usage
 * 
 * Only loads from environment variables and command line arguments.
 */
export async function createMinimalConfig() {
  return VibexConfigFactory.createMinimalConfig();
}

/**
 * Create configuration manager from legacy configuration file
 * 
 * Migrates legacy configuration and creates a new manager.
 */
export async function createFromLegacy(
  legacyConfigPath: string,
  outputPath?: string
) {
  return VibexConfigFactory.createFromLegacy(legacyConfigPath, outputPath);
}

/**
 * Create backward-compatible adapter for legacy code
 * 
 * Provides the old configuration interface while using the new system.
 */
export async function createLegacyAdapter(configManager: ConfigManager) {
  return VibexConfigFactory.createLegacyAdapter(configManager);
}

/**
 * Validate configuration manager setup
 * 
 * Checks configuration for common issues and validation errors.
 */
export async function validateConfiguration(manager: ConfigManager) {
  return VibexConfigFactory.validateConfiguration(manager);
}

/**
 * Default configuration manager instance
 * 
 * Lazy-loaded singleton for simple use cases.
 * Use createAutoConfig() for more control over initialization.
 */
let defaultConfigManager: ConfigManager | null = null;

export async function getDefaultConfig(): Promise<ConfigManager> {
  if (!defaultConfigManager) {
    defaultConfigManager = await createAutoConfig();
  }
  return defaultConfigManager;
}

/**
 * Reset default configuration manager
 * 
 * Useful for testing or when you need to reinitialize configuration.
 */
export function resetDefaultConfig(): void {
  defaultConfigManager = null;
}

/**
 * Configuration migration utilities
 */
export const migration = {
  /**
   * Migrate from legacy configuration file
   */
  async fromLegacy(legacyConfigPath: string) {
    const service = new ConfigMigrationService();
    return service.migrateFromLegacy(legacyConfigPath);
  },

  /**
   * Migrate from multiple legacy sources
   */
  async fromMultipleSources(sources: {
    legacyConfig?: string;
    simpleConfig?: string;
    dpmConfig?: string;
    advancedConfig?: string;
  }) {
    const service = new ConfigMigrationService();
    return service.migrateFromMultipleSources(sources);
  },

  /**
   * Create migration backup
   */
  async createBackup(originalConfigPath: string) {
    const service = new ConfigMigrationService();
    return service.createMigrationBackup(originalConfigPath);
  },

  /**
   * Validate migration results
   */
  async validate(originalConfig: LegacyConfig, migratedConfig: VibexConfig) {
    const service = new ConfigMigrationService();
    return service.validateMigration(originalConfig, migratedConfig);
  }
};

/**
 * Configuration utilities
 */
export const utils = {
  /**
   * Deep merge configuration objects
   */
  mergeConfigs<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!result[key as keyof T]) {
          (result as any)[key] = {};
        }
        (result as any)[key] = this.mergeConfigs((result as any)[key], value);
      } else if (value !== undefined) {
        (result as any)[key] = value;
      }
    }
    
    return result;
  },

  /**
   * Get configuration value by dot notation path
   */
  getByPath<T = any>(config: Record<string, any>, path: string, defaultValue?: T): T | undefined {
    const keys = path.split('.');
    let current = config;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current as T;
  },

  /**
   * Set configuration value by dot notation path
   */
  setByPath(config: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.');
    let current = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  },

  /**
   * Check if configuration has value at path
   */
  hasPath(config: Record<string, any>, path: string): boolean {
    const keys = path.split('.');
    let current = config;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return false;
      }
    }
    
    return true;
  }
};

/**
 * All types are already exported above
 */ 