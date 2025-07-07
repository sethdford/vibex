/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Configuration Migration Service
 * 
 * Handles migration from legacy configuration systems to the new infrastructure
 * configuration system. Provides backward compatibility and migration utilities.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { z } from 'zod';
import { ConfigManager, IConfigManager } from './config-manager.js';
import { VibexConfig, VibexConfigSchema, validateVibexConfig } from './vibex-config-schema.js';
import { logger } from '../../utils/logger.js';

/**
 * Legacy configuration interface for backward compatibility
 */
export interface LegacyConfig {
  // AI settings
  anthropicApiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  
  // UI settings
  theme?: string;
  fontSize?: number;
  showLineNumbers?: boolean;
  
  // Tool settings
  enabledTools?: string[];
  toolTimeout?: number;
  
  // Security settings
  enableSandbox?: boolean;
  allowedCommands?: string[];
  
  // Context settings
  projectMarkers?: string[];
  contextFileNames?: string[];
  maxDepth?: number;
  
  // Performance settings
  cacheEnabled?: boolean;
  maxCacheSize?: number;
  
  // Other legacy fields
  [key: string]: any;
}

/**
 * Configuration adapter that provides legacy interface while using new system
 */
export class ConfigAdapter {
  constructor(private configManager: IConfigManager) {}

  /**
   * Get configuration value using legacy key format
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    // Map legacy keys to new configuration structure
    const mappedKey = this.mapLegacyKey(key);
    return this.configManager.get(mappedKey, defaultValue);
  }

  /**
   * Set configuration value using legacy key format
   */
  set<T>(key: string, value: T): void {
    const mappedKey = this.mapLegacyKey(key);
    this.configManager.set(mappedKey, value);
  }

  /**
   * Check if configuration key exists
   */
  has(key: string): boolean {
    const mappedKey = this.mapLegacyKey(key);
    return this.configManager.has(mappedKey);
  }

  /**
   * Get all configuration as legacy format
   */
  getAll(): LegacyConfig {
    const newConfig = this.configManager.getAll() as VibexConfig;
    return this.transformToLegacy(newConfig);
  }

  /**
   * Map legacy key to new configuration structure
   */
  private mapLegacyKey(legacyKey: string): string {
    const keyMappings: Record<string, string> = {
      // AI mappings
      'anthropicApiKey': 'ai.anthropic.apiKey',
      'model': 'ai.anthropic.model',
      'maxTokens': 'ai.anthropic.maxTokens',
      'temperature': 'ai.anthropic.temperature',
      
      // UI mappings
      'theme': 'ui.theme',
      'fontSize': 'ui.fontSize',
      'showLineNumbers': 'ui.showLineNumbers',
      
      // Tool mappings
      'enabledTools': 'tools.enabledTools',
      'toolTimeout': 'tools.toolTimeout',
      
      // Security mappings
      'enableSandbox': 'security.enableSandbox',
      'allowedCommands': 'security.allowedCommands',
      
      // Context mappings
      'projectMarkers': 'context.projectMarkers',
      'contextFileNames': 'context.contextFileNames',
      'maxDepth': 'context.maxDepth',
      
      // Performance mappings
      'cacheEnabled': 'performance.cacheEnabled',
      'maxCacheSize': 'performance.maxCacheSize'
    };

    return keyMappings[legacyKey] || legacyKey;
  }

  /**
   * Transform new configuration to legacy format
   */
  private transformToLegacy(newConfig: VibexConfig): LegacyConfig {
    return {
      // AI settings
      anthropicApiKey: newConfig.ai?.anthropic?.apiKey,
      model: newConfig.ai?.anthropic?.model,
      maxTokens: newConfig.ai?.anthropic?.maxTokens,
      temperature: newConfig.ai?.anthropic?.temperature,
      
      // UI settings
      theme: newConfig.ui?.theme,
      fontSize: newConfig.ui?.fontSize,
      showLineNumbers: newConfig.ui?.showLineNumbers,
      
      // Tool settings
      enabledTools: newConfig.tools?.enabledTools,
      toolTimeout: newConfig.tools?.toolTimeout,
      
      // Security settings
      enableSandbox: newConfig.security?.enableSandbox,
      allowedCommands: newConfig.security?.allowedCommands,
      
      // Context settings
      projectMarkers: newConfig.context?.projectMarkers,
      contextFileNames: newConfig.context?.contextFileNames,
      maxDepth: newConfig.context?.maxDepth,
      
      // Performance settings
      cacheEnabled: newConfig.performance?.cacheEnabled,
      maxCacheSize: newConfig.performance?.maxCacheSize
    };
  }
}

/**
 * Configuration migration service
 */
export class ConfigMigrationService {
  private migrationVersion = '1.0.0';

  /**
   * Migrate from legacy configuration file
   */
  async migrateFromLegacy(legacyConfigPath: string): Promise<VibexConfig> {
    try {
      logger.info(`Migrating configuration from legacy file: ${legacyConfigPath}`);

      // Check if legacy config exists
      if (!existsSync(legacyConfigPath)) {
        logger.warn(`Legacy configuration file not found: ${legacyConfigPath}`);
        return validateVibexConfig({});
      }

      // Load legacy configuration
      const legacyContent = await fs.readFile(legacyConfigPath, 'utf-8');
      const legacyConfig: LegacyConfig = JSON.parse(legacyContent);

      // Transform to new configuration format
      const newConfig = this.transformLegacyConfig(legacyConfig);

      // Validate the migrated configuration
      const validatedConfig = validateVibexConfig(newConfig);

      logger.info('Configuration migration completed successfully');
      return validatedConfig;

    } catch (error) {
      logger.error('Failed to migrate legacy configuration', error);
      throw new Error(`Configuration migration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Migrate from multiple legacy configuration sources
   */
  async migrateFromMultipleSources(sources: {
    legacyConfig?: string;
    simpleConfig?: string;
    dpmConfig?: string;
    advancedConfig?: string;
  }): Promise<VibexConfig> {
    logger.info('Migrating configuration from multiple legacy sources');

    const mergedConfig: Partial<VibexConfig> = {};

    // Migrate from legacy config
    if (sources.legacyConfig && existsSync(sources.legacyConfig)) {
      const legacyMigrated = await this.migrateFromLegacy(sources.legacyConfig);
      this.mergeConfigs(mergedConfig, legacyMigrated);
    }

    // Migrate from simple config
    if (sources.simpleConfig && existsSync(sources.simpleConfig)) {
      const simpleMigrated = await this.migrateFromSimpleConfig(sources.simpleConfig);
      this.mergeConfigs(mergedConfig, simpleMigrated);
    }

    // Migrate from DPM config
    if (sources.dpmConfig && existsSync(sources.dpmConfig)) {
      const dpmMigrated = await this.migrateFromDPMConfig(sources.dpmConfig);
      this.mergeConfigs(mergedConfig, dpmMigrated);
    }

    // Migrate from advanced config
    if (sources.advancedConfig && existsSync(sources.advancedConfig)) {
      const advancedMigrated = await this.migrateFromAdvancedConfig(sources.advancedConfig);
      this.mergeConfigs(mergedConfig, advancedMigrated);
    }

    // Validate and return merged configuration
    return validateVibexConfig(mergedConfig);
  }

  /**
   * Create backward compatibility layer
   */
  async createBackwardCompatibilityLayer(configManager: IConfigManager): Promise<ConfigAdapter> {
    return new ConfigAdapter(configManager);
  }

  /**
   * Transform legacy configuration to new format
   */
  private transformLegacyConfig(legacyConfig: LegacyConfig): Partial<VibexConfig> {
    const newConfig: Partial<VibexConfig> = {
      migrationVersion: this.migrationVersion,
      legacyMode: false
    };

    // AI configuration
    if (legacyConfig.anthropicApiKey || legacyConfig.model || legacyConfig.maxTokens || legacyConfig.temperature) {
      newConfig.ai = {
        provider: 'anthropic' as const,
        anthropic: {
          apiKey: legacyConfig.anthropicApiKey,
          model: legacyConfig.model || 'claude-3-sonnet-20240229',
          maxTokens: legacyConfig.maxTokens || 4096,
          temperature: legacyConfig.temperature || 0.7,
          timeout: 30000,
          maxRetries: 3
        },
        openai: {
          model: 'gpt-4',
          maxTokens: 4096,
          temperature: 0.7,
          timeout: 30000,
          maxRetries: 3
        },
        google: {
          model: 'gemini-pro',
          maxTokens: 4096,
          temperature: 0.7,
          timeout: 30000,
          maxRetries: 3
        },
        mistral: {
          model: 'mistral-large',
          maxTokens: 4096,
          temperature: 0.7,
          timeout: 30000,
          maxRetries: 3
        },
        enableStreaming: true,
        enableFunctionCalling: true,
        enableVision: false,
        contextWindowSize: 100000,
        enableContentFilter: true,
        maxContentLength: 1000000,
        enableProfanityFilter: false
      };
    }

    // UI configuration
    if (legacyConfig.theme || legacyConfig.fontSize || legacyConfig.showLineNumbers !== undefined) {
      newConfig.ui = {
        theme: (legacyConfig.theme as any) || 'auto',
        accentColor: '#007acc',
        fontSize: legacyConfig.fontSize || 14,
        fontFamily: 'Monaco, Consolas, monospace',
        showLineNumbers: legacyConfig.showLineNumbers !== false,
        wordWrap: true,
        tabSize: 2,
        insertSpaces: true,
        terminalTheme: 'dark',
        terminalFontSize: 12,
        terminalScrollback: 1000,
        sidebarWidth: 300,
        panelHeight: 200,
        showMinimap: true,
        showStatusBar: true,
        enableAnimations: true,
        enableSmoothScrolling: true,
        renderWhitespace: 'selection' as const
      };
    }

    // Tool configuration
    if (legacyConfig.enabledTools || legacyConfig.toolTimeout) {
      newConfig.tools = {
        enabledTools: legacyConfig.enabledTools || [],
        disabledTools: [],
        toolTimeout: legacyConfig.toolTimeout || 30000,
        maxConcurrentTools: 5,
        autoDiscoverTools: true,
        toolSearchPaths: [],
        enableCustomTools: true,
        enableSandboxedExecution: true,
        allowSystemCommands: false,
        allowNetworkAccess: true,
        allowFileSystemAccess: true,
        validateToolInputs: true,
        validateToolOutputs: true,
        enableToolLogging: true,
        mcpServers: []
      };
    }

    // Security configuration
    if (legacyConfig.enableSandbox !== undefined || legacyConfig.allowedCommands) {
      newConfig.security = {
        enableSandbox: legacyConfig.enableSandbox !== false,
        sandboxTimeout: 30000,
        maxSandboxMemory: 512,
        allowedCommands: legacyConfig.allowedCommands || [],
        blockedCommands: ['rm', 'sudo', 'chmod'],
        enableCommandValidation: true,
        trustedDomains: [],
        blockedDomains: [],
        enableNetworkFiltering: true,
        maxRequestSize: 10485760,
        allowedPaths: [],
        blockedPaths: ['/etc', '/sys', '/proc'],
        enablePathValidation: true,
        maxFileSize: 104857600,
        enableEncryption: false,
        sessionTimeout: 3600000,
        enableApiKeyValidation: true
      };
    }

    // Context configuration
    if (legacyConfig.projectMarkers || legacyConfig.contextFileNames || legacyConfig.maxDepth) {
      newConfig.context = {
        contextFileNames: legacyConfig.contextFileNames || ['.context.md', 'context.md'],
        projectMarkers: legacyConfig.projectMarkers || ['.git', 'package.json', 'Cargo.toml'],
        maxDepth: legacyConfig.maxDepth || 10,
        encoding: 'utf-8',
        enableGlobalContext: true,
        enableProjectContext: true,
        enableDirectoryContext: true,
        enableVariableInterpolation: true,
        variablePatterns: {},
        customVariables: {},
        includeHeaders: true,
        includeSeparators: true,
        includeMetadata: false,
        maxContentLength: 100000,
        sortByPriority: true,
        ttlMs: 60000,
        maxEntries: 100,
        enableMemoryStorage: true,
        memoryImportance: 90,
        enableSubdirectoryDiscovery: false,
        enableRealTimeUpdates: false,
        autoStartWatching: false,
        watchPaths: []
      };
    }

    // Performance configuration
    if (legacyConfig.cacheEnabled !== undefined || legacyConfig.maxCacheSize) {
      newConfig.performance = {
        cacheEnabled: legacyConfig.cacheEnabled !== false,
        maxCacheSize: legacyConfig.maxCacheSize || 100,
        cacheTimeout: 3600000,
        cleanupInterval: 300000,
        maxMemoryUsage: 512,
        enableMemoryMonitoring: true,
        memoryWarningThreshold: 0.8,
        enableGarbageCollection: true,
        maxProcessingTime: 30000,
        maxConcurrentOperations: 10,
        enableOperationQueuing: true,
        queueMaxSize: 100,
        enableLazyLoading: true,
        enableCodeSplitting: true,
        enableMinification: true,
        enableCompression: true,
        enableMetrics: true,
        metricsInterval: 10000,
        enableProfiling: false,
        profileSampleRate: 0.1
      };
    }

    // Copy any other properties that might be relevant
    for (const [key, value] of Object.entries(legacyConfig)) {
      if (!this.isKnownLegacyKey(key) && value !== undefined) {
        // Store unknown legacy properties in userPreferences
        if (!newConfig.userPreferences) {
          newConfig.userPreferences = {};
        }
        newConfig.userPreferences[`legacy_${key}`] = value;
      }
    }

    return newConfig;
  }

  /**
   * Migrate from simple configuration
   */
  private async migrateFromSimpleConfig(simpleConfigPath: string): Promise<Partial<VibexConfig>> {
    try {
      const content = await fs.readFile(simpleConfigPath, 'utf-8');
      const simpleConfig = JSON.parse(content);
      
      // Simple config is usually just basic settings
      return {
        ai: {
          anthropic: {
            apiKey: simpleConfig.apiKey,
            model: simpleConfig.model || 'claude-3-sonnet-20240229',
            maxTokens: simpleConfig.maxTokens || 4096,
            temperature: simpleConfig.temperature || 0.7,
            timeout: 30000,
            maxRetries: 3
          }
        }
      } as Partial<VibexConfig>;
    } catch (error) {
      logger.warn(`Failed to migrate simple config: ${error}`);
      return {};
    }
  }

  /**
   * Migrate from DPM configuration
   */
  private async migrateFromDPMConfig(dpmConfigPath: string): Promise<Partial<VibexConfig>> {
    try {
      const content = await fs.readFile(dpmConfigPath, 'utf-8');
      const dpmConfig = JSON.parse(content);
      
      return {
        dpm: {
          enabled: dpmConfig.enabled || false,
          apiEndpoint: dpmConfig.apiEndpoint,
          apiKey: dpmConfig.apiKey,
          syncInterval: dpmConfig.syncInterval || 300000,
          enableAutoSync: dpmConfig.enableAutoSync !== false,
          syncOnStartup: dpmConfig.syncOnStartup !== false,
          enableAnalytics: dpmConfig.enableAnalytics !== false,
          analyticsEndpoint: dpmConfig.analyticsEndpoint,
          trackUserBehavior: dpmConfig.trackUserBehavior || false,
          enableTelemetry: dpmConfig.enableTelemetry !== false,
          enableRoadmapTracking: dpmConfig.enableRoadmapTracking !== false,
          enableUserResearch: dpmConfig.enableUserResearch !== false,
          enableMarketAnalysis: dpmConfig.enableMarketAnalysis !== false,
          enableBetaTesting: dpmConfig.enableBetaTesting || false,
          enableAIInsights: dpmConfig.enableAIInsights !== false,
          aiInsightsModel: dpmConfig.aiInsightsModel || 'claude-3-sonnet-20240229',
          enablePredictiveAnalytics: dpmConfig.enablePredictiveAnalytics || false,
          enableLifecycleTracking: dpmConfig.enableLifecycleTracking !== false,
          lifecycleStages: dpmConfig.lifecycleStages || ['concept', 'development', 'beta', 'launch', 'growth', 'maturity'],
          enableAutomatedTransitions: dpmConfig.enableAutomatedTransitions || false
        }
      } as Partial<VibexConfig>;
    } catch (error) {
      logger.warn(`Failed to migrate DPM config: ${error}`);
      return {};
    }
  }

  /**
   * Migrate from advanced hierarchical configuration
   */
  private async migrateFromAdvancedConfig(advancedConfigPath: string): Promise<Partial<VibexConfig>> {
    try {
      const content = await fs.readFile(advancedConfigPath, 'utf-8');
      const advancedConfig = JSON.parse(content);
      
      // Advanced config has hierarchical structure that we need to flatten
      const flattened = this.flattenHierarchicalConfig(advancedConfig);
      return this.transformLegacyConfig(flattened);
    } catch (error) {
      logger.warn(`Failed to migrate advanced config: ${error}`);
      return {};
    }
  }

  /**
   * Flatten hierarchical configuration structure
   */
  private flattenHierarchicalConfig(hierarchicalConfig: any): LegacyConfig {
    const flattened: LegacyConfig = {};
    
    const flatten = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, newKey);
        } else {
          flattened[newKey] = value;
        }
      }
    };
    
    flatten(hierarchicalConfig);
    return flattened;
  }

  /**
   * Merge configurations with deep merge
   */
  private mergeConfigs(target: Partial<VibexConfig>, source: Partial<VibexConfig>): void {
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key as keyof VibexConfig]) {
          (target as any)[key] = {};
        }
        this.mergeConfigs((target as any)[key], value);
      } else if (value !== undefined) {
        (target as any)[key] = value;
      }
    }
  }

  /**
   * Check if a key is a known legacy configuration key
   */
  private isKnownLegacyKey(key: string): boolean {
    const knownKeys = [
      'anthropicApiKey', 'model', 'maxTokens', 'temperature',
      'theme', 'fontSize', 'showLineNumbers',
      'enabledTools', 'toolTimeout',
      'enableSandbox', 'allowedCommands',
      'projectMarkers', 'contextFileNames', 'maxDepth',
      'cacheEnabled', 'maxCacheSize'
    ];
    
    return knownKeys.includes(key);
  }

  /**
   * Create migration backup
   */
  async createMigrationBackup(originalConfigPath: string): Promise<string> {
    const backupPath = `${originalConfigPath}.backup.${Date.now()}`;
    
    try {
      await fs.copyFile(originalConfigPath, backupPath);
      logger.info(`Configuration backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      logger.error(`Failed to create configuration backup: ${error}`);
      throw error;
    }
  }

  /**
   * Validate migration results
   */
  async validateMigration(
    originalConfig: LegacyConfig,
    migratedConfig: VibexConfig
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check that important settings were migrated
    if (originalConfig.anthropicApiKey && !migratedConfig.ai?.anthropic?.apiKey) {
      issues.push('Anthropic API key was not migrated');
    }

    if (originalConfig.model && migratedConfig.ai?.anthropic?.model !== originalConfig.model) {
      issues.push('AI model setting was not migrated correctly');
    }

    if (originalConfig.theme && migratedConfig.ui?.theme !== originalConfig.theme) {
      issues.push('Theme setting was not migrated correctly');
    }

    // Check for required fields
    try {
      validateVibexConfig(migratedConfig);
    } catch (error) {
      issues.push(`Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
} 