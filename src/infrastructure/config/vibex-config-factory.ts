/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * VibeX Configuration Factory
 * 
 * Creates and configures ConfigManager instances for different environments
 * with appropriate sources and validation.
 */

import { join } from 'path';
import { homedir } from 'os';
import { 
  ConfigManager, 
  FileConfigSource, 
  EnvironmentConfigSource, 
  ArgumentsConfigSource 
} from './config-manager.js';
import { VibexConfigSchema, VibexConfig } from './vibex-config-schema.js';
import { ConfigMigrationService, ConfigAdapter } from './config-migration.js';
import { logger } from '../../utils/logger.js';

/**
 * Configuration factory for creating properly configured managers
 */
export class VibexConfigFactory {
  private static migrationService = new ConfigMigrationService();

  /**
   * Create production configuration manager
   */
  static async createProductionConfig(options: {
    configDir?: string;
    workspaceDir?: string;
    enableMigration?: boolean;
  } = {}): Promise<ConfigManager> {
    const {
      configDir = join(homedir(), '.vibex'),
      workspaceDir = process.cwd(),
      enableMigration = true
    } = options;

    logger.info('Creating production configuration manager');

    const manager = new ConfigManager(VibexConfigSchema);

    // Add configuration sources in priority order (higher priority = later in list)
    
    // 1. Global configuration file (lowest priority)
    const globalConfigPath = join(configDir, 'config.json');
    manager.addSource(new FileConfigSource(globalConfigPath, 10, 'global-config'));

    // 2. Workspace configuration file
    const workspaceConfigPath = join(workspaceDir, 'vibex.config.json');
    manager.addSource(new FileConfigSource(workspaceConfigPath, 20, 'workspace-config'));

    // 3. Alternative workspace configuration
    const altWorkspaceConfigPath = join(workspaceDir, '.vibex', 'config.json');
    manager.addSource(new FileConfigSource(altWorkspaceConfigPath, 25, 'alt-workspace-config'));

    // 4. Environment variables (higher priority)
    manager.addSource(new EnvironmentConfigSource('VIBEX_', 100));

    // 5. Command line arguments (highest priority)
    manager.addSource(new ArgumentsConfigSource(process.argv, 200));

    // Perform migration if enabled
    if (enableMigration) {
      await this.performMigrationIfNeeded(manager, configDir, workspaceDir);
    }

    // Initial configuration load
    await manager.reload();

    logger.info('Production configuration manager created successfully');
    return manager;
  }

  /**
   * Create development configuration manager
   */
  static async createDevelopmentConfig(options: {
    configDir?: string;
    workspaceDir?: string;
    enableHotReload?: boolean;
  } = {}): Promise<ConfigManager> {
    const {
      configDir = join(process.cwd(), '.vibex-dev'),
      workspaceDir = process.cwd(),
      enableHotReload = true
    } = options;

    logger.info('Creating development configuration manager');

    const manager = new ConfigManager(VibexConfigSchema);

    // Development-specific configuration sources
    
    // 1. Development defaults
    const devConfigPath = join(configDir, 'dev-config.json');
    manager.addSource(new FileConfigSource(devConfigPath, 10, 'dev-config'));

    // 2. Local development overrides
    const localConfigPath = join(workspaceDir, 'vibex.dev.json');
    manager.addSource(new FileConfigSource(localConfigPath, 20, 'local-dev-config'));

    // 3. Environment variables with DEV prefix
    manager.addSource(new EnvironmentConfigSource('VIBEX_DEV_', 90));
    manager.addSource(new EnvironmentConfigSource('VIBEX_', 100));

    // 4. Command line arguments
    manager.addSource(new ArgumentsConfigSource(process.argv, 200));

    // Enable hot reload for development
    if (enableHotReload) {
      manager.on('configReloaded', (config) => {
        logger.debug('Development configuration reloaded', { 
          sections: Object.keys(config) 
        });
      });
    }

    // Initial load
    await manager.reload();

    // Set development-specific defaults
    manager.set('development.isDevelopment', true);
    manager.set('development.enableHotReload', enableHotReload);
    manager.set('development.enableDevTools', true);
    manager.set('logging.level', 'debug');
    manager.set('logging.enableConsoleLogging', true);

    logger.info('Development configuration manager created successfully');
    return manager;
  }

  /**
   * Create test configuration manager
   */
  static async createTestConfig(options: {
    testDataDir?: string;
    isolateConfig?: boolean;
  } = {}): Promise<ConfigManager> {
    const {
      testDataDir = join(process.cwd(), 'test-data'),
      isolateConfig = true
    } = options;

    logger.info('Creating test configuration manager');

    const manager = new ConfigManager(VibexConfigSchema);

    if (isolateConfig) {
      // Isolated test configuration - no file sources, only in-memory
      manager.addSource(new EnvironmentConfigSource('VIBEX_TEST_', 100));
    } else {
      // Test configuration with file sources
      const testConfigPath = join(testDataDir, 'test-config.json');
      manager.addSource(new FileConfigSource(testConfigPath, 10, 'test-config'));
      manager.addSource(new EnvironmentConfigSource('VIBEX_TEST_', 100));
    }

    // Initial load
    await manager.reload();

    // Set test-specific defaults
    manager.set('development.enableTestMode', true);
    manager.set('development.testDataPath', testDataDir);
    manager.set('development.enableMockServices', true);
    manager.set('logging.level', 'warn');
    manager.set('logging.enableConsoleLogging', false);
    manager.set('performance.cacheEnabled', false);
    manager.set('security.enableSandbox', false);
    manager.set('ai.anthropic.apiKey', 'test-key');

    logger.info('Test configuration manager created successfully');
    return manager;
  }

  /**
   * Create configuration manager with custom sources
   */
  static async createCustomConfig(
    sources: Array<{
      type: 'file' | 'environment' | 'arguments';
      config: any;
      priority?: number;
      name?: string;
    }>,
    schema = VibexConfigSchema
  ): Promise<ConfigManager> {
    logger.info('Creating custom configuration manager');

    const manager = new ConfigManager(schema);

    // Add custom sources
    for (const sourceConfig of sources) {
      const { type, config, priority = 50, name } = sourceConfig;

      switch (type) {
        case 'file':
          manager.addSource(new FileConfigSource(config.path, priority, name));
          break;
        case 'environment':
          manager.addSource(new EnvironmentConfigSource(config.prefix, priority));
          break;
        case 'arguments':
          manager.addSource(new ArgumentsConfigSource(config.args, priority));
          break;
        default:
          logger.warn(`Unknown source type: ${type}`);
      }
    }

    // Initial load
    await manager.reload();

    logger.info('Custom configuration manager created successfully');
    return manager;
  }

  /**
   * Create backward-compatible configuration adapter
   */
  static async createLegacyAdapter(
    configManager: ConfigManager
  ): Promise<ConfigAdapter> {
    return this.migrationService.createBackwardCompatibilityLayer(configManager);
  }

  /**
   * Create configuration manager from legacy configuration
   */
  static async createFromLegacy(
    legacyConfigPath: string,
    outputPath?: string
  ): Promise<ConfigManager> {
    logger.info(`Creating configuration manager from legacy config: ${legacyConfigPath}`);

    // Migrate legacy configuration
    const migratedConfig = await this.migrationService.migrateFromLegacy(legacyConfigPath);

    // Create manager
    const manager = new ConfigManager(VibexConfigSchema);

    // Add environment and arguments sources
    manager.addSource(new EnvironmentConfigSource('VIBEX_', 100));
    manager.addSource(new ArgumentsConfigSource(process.argv, 200));

    // Load initial configuration
    await manager.reload();

    // Apply migrated configuration
    for (const [key, value] of Object.entries(migratedConfig)) {
      if (value !== undefined) {
        manager.set(key, value);
      }
    }

    // Save migrated configuration if output path provided
    if (outputPath) {
      await this.saveConfiguration(manager, outputPath);
    }

    logger.info('Configuration manager created from legacy config successfully');
    return manager;
  }

  /**
   * Create minimal configuration manager for CLI usage
   */
  static async createMinimalConfig(): Promise<ConfigManager> {
    logger.debug('Creating minimal configuration manager');

    const manager = new ConfigManager(VibexConfigSchema);

    // Only environment variables and command line arguments
    manager.addSource(new EnvironmentConfigSource('VIBEX_', 100));
    manager.addSource(new ArgumentsConfigSource(process.argv, 200));

    // Load configuration
    await manager.reload();

    return manager;
  }

  /**
   * Perform migration from legacy configuration files if needed
   */
  private static async performMigrationIfNeeded(
    manager: ConfigManager,
    configDir: string,
    workspaceDir: string
  ): Promise<void> {
    try {
      // Check for legacy configuration files
      const legacyPaths = {
        legacyConfig: join(configDir, 'config.json'),
        simpleConfig: join(workspaceDir, 'simple-config.json'),
        dpmConfig: join(configDir, 'dpm-config.json'),
        advancedConfig: join(configDir, 'advanced-config.json')
      };

      // Check if any legacy files exist
      const hasLegacyFiles = Object.values(legacyPaths).some(path => {
        try {
          require('fs').accessSync(path);
          return true;
        } catch {
          return false;
        }
      });

      if (hasLegacyFiles) {
        logger.info('Legacy configuration files detected, performing migration');

        // Migrate from multiple sources
        const migratedConfig = await this.migrationService.migrateFromMultipleSources(legacyPaths);

        // Apply migrated configuration to manager
        for (const [key, value] of Object.entries(migratedConfig)) {
          if (value !== undefined) {
            manager.set(key, value);
          }
        }

        // Save migrated configuration
        const newConfigPath = join(configDir, 'config.json');
        await this.saveConfiguration(manager, newConfigPath);

        logger.info('Configuration migration completed successfully');
      }
    } catch (error) {
      logger.warn('Configuration migration failed, continuing with default configuration', error);
    }
  }

  /**
   * Save configuration to file
   */
  private static async saveConfiguration(
    manager: ConfigManager,
    outputPath: string
  ): Promise<void> {
    try {
      const config = manager.getAll();
      const configJson = JSON.stringify(config, null, 2);
      
      // Ensure directory exists
      const fs = await import('fs/promises');
      const path = await import('path');
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      
      // Write configuration
      await fs.writeFile(outputPath, configJson, 'utf-8');
      
      logger.info(`Configuration saved to: ${outputPath}`);
    } catch (error) {
      logger.error(`Failed to save configuration: ${error}`);
      throw error;
    }
  }

  /**
   * Validate configuration manager setup
   */
  static async validateConfiguration(manager: ConfigManager): Promise<{
    isValid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate configuration against schema
      await manager.validate();
    } catch (error) {
      issues.push(`Schema validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Check for required configuration
    const config = manager.getAll() as VibexConfig;

    // Check AI configuration
    if (!config.ai?.anthropic?.apiKey && !process.env.ANTHROPIC_API_KEY) {
      warnings.push('No Anthropic API key configured');
    }

    // Check for development vs production settings
    if (config.development?.isDevelopment && config.environment === 'production') {
      warnings.push('Development mode enabled in production environment');
    }

    // Check security settings
    if (!config.security?.enableSandbox && config.environment === 'production') {
      warnings.push('Sandbox disabled in production environment');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Create configuration manager with environment detection
   */
  static async createAutoConfig(options: {
    configDir?: string;
    workspaceDir?: string;
    testDataDir?: string;
    isolateConfig?: boolean;
  } = {}): Promise<ConfigManager> {
    const environment = process.env.NODE_ENV || 'production';

    switch (environment) {
      case 'development':
        return this.createDevelopmentConfig(options);
      case 'test':
        return this.createTestConfig({
          testDataDir: options.testDataDir,
          isolateConfig: options.isolateConfig
        });
      default:
        return this.createProductionConfig(options);
    }
  }
}

/**
 * Default configuration factory instance
 */
export const configFactory = VibexConfigFactory; 