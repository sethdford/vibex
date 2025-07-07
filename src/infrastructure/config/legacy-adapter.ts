/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Legacy Configuration Adapter
 * 
 * Provides compatibility between the new infrastructure configuration system
 * and the legacy configuration format expected by the UI and other components.
 */

import type { VibexConfig } from './vibex-config-schema.js';
import type { AppConfigType } from '../../config/schema.js';

/**
 * Convert new VibexConfig to legacy AppConfigType format
 */
export function adaptVibexConfigToLegacy(vibexConfig: VibexConfig): AppConfigType {
  return {
    // Basic properties
    debug: vibexConfig.development?.enableDebugMode || false,
    version: vibexConfig.version || '1.0.0',
    
    // API configuration
    api: {
      baseUrl: vibexConfig.ai?.anthropic?.baseURL || 'https://api.anthropic.com',
      version: 'v1',
      timeout: vibexConfig.ai?.anthropic?.timeout || 30000,
      key: vibexConfig.ai?.anthropic?.apiKey
    },
    
    // AI configuration
    ai: {
      model: vibexConfig.ai?.anthropic?.model || 'claude-3-sonnet-20240229',
      temperature: vibexConfig.ai?.anthropic?.temperature || 0.7,
      maxTokens: vibexConfig.ai?.anthropic?.maxTokens || 4096,
      maxHistoryLength: 50,
      enableStreaming: vibexConfig.ai?.enableStreaming !== false,
      enableToolUse: vibexConfig.ai?.enableFunctionCalling !== false,
      enableContextAwareness: vibexConfig.context?.enableGlobalContext !== false,
      enableMemory: true,
      retryAttempts: vibexConfig.ai?.anthropic?.maxRetries || 3,
      retryDelay: 1000,
      enableCaching: vibexConfig.performance?.cacheEnabled !== false,
      systemPrompt: vibexConfig.ai?.systemPrompt || 'You are Claude, an AI assistant.'
    },
    
    // UI configuration
    ui: {
      theme: vibexConfig.ui?.theme || 'dark',
      enableColors: true, // Always enabled in new system
      enableAnimations: vibexConfig.ui?.enableAnimations !== false,
      showLineNumbers: vibexConfig.ui?.showLineNumbers !== false,
      fontSize: vibexConfig.ui?.fontSize || 14,
      fontFamily: vibexConfig.ui?.fontFamily || 'monospace',
      terminalWidth: 80, // Default, not configurable in new system
      terminalHeight: 24, // Default, not configurable in new system
      enableSyntaxHighlighting: true, // Always enabled
      enableAutoComplete: true, // Always enabled
      showTimestamps: true, // Always enabled
      compactMode: false, // Default
      enableKeyboardShortcuts: true, // Always enabled
      enableStatusBar: vibexConfig.ui?.showStatusBar !== false,
      showTokenCount: true // Always enabled
    },
    
    // Tools configuration
    tools: {
      enabledTools: vibexConfig.tools?.enabledTools || [],
      enableToolExecution: vibexConfig.tools?.enableToolExecution !== false,
      toolTimeout: vibexConfig.tools?.toolTimeout || 30000,
      enableSandbox: vibexConfig.security?.enableSandbox !== false,
      sandboxTimeout: vibexConfig.security?.sandboxTimeout || 30000,
      allowedCommands: vibexConfig.security?.allowedCommands || [],
      blockedCommands: vibexConfig.security?.blockedCommands || [],
      enableFileOperations: vibexConfig.tools?.enableFileOperations !== false,
      enableNetworkAccess: vibexConfig.tools?.enableNetworkAccess !== false,
      enableSystemCommands: vibexConfig.tools?.enableSystemCommands !== false,
      maxFileSize: vibexConfig.tools?.maxFileSize || 10485760,
      enableVersionControl: vibexConfig.tools?.enableVersionControl !== false,
      enablePackageManager: vibexConfig.tools?.enablePackageManager !== false,
      enableWebTools: vibexConfig.tools?.enableWebTools !== false,
      enableAdvancedTools: vibexConfig.tools?.enableAdvancedTools !== false
    },
    
    // Context configuration
    context: {
      projectMarkers: vibexConfig.context?.projectMarkers || ['.git', 'package.json'],
      contextFileNames: vibexConfig.context?.contextFileNames || ['.context.md'],
      maxDepth: vibexConfig.context?.maxDepth || 10,
      enableGlobalContext: vibexConfig.context?.enableGlobalContext !== false,
      enableProjectContext: vibexConfig.context?.enableProjectContext !== false,
      enableDirectoryContext: vibexConfig.context?.enableDirectoryContext !== false,
      maxContextSize: vibexConfig.context?.maxContentLength || 100000,
      enableContextCaching: vibexConfig.context?.enableMemoryStorage !== false,
      contextCacheTimeout: vibexConfig.context?.ttlMs || 60000,
      enableSmartContext: true,
      enableContextHistory: true,
      enableContextSearch: true,
      enableContextSummary: true,
      enableContextFiltering: true
    },
    
    // Performance configuration
    performance: {
      enableLazyLoading: vibexConfig.performance?.enableLazyLoading !== false,
      enableAggressiveGC: true,
      maxOldSpaceSize: vibexConfig.performance?.maxMemoryUsage || 512,
      deferHeavyModules: true,
      enableModuleCache: vibexConfig.performance?.cacheEnabled !== false,
      enableVirtualScrolling: true,
      reduceAnimations: false,
      enableContextCaching: vibexConfig.context?.enableMemoryStorage !== false,
      maxContextSize: vibexConfig.context?.maxContentLength || 100000,
      enableRequestBatching: true,
      requestTimeout: 30000,
      enableMemoryCompression: true,
      enableStringDeduplication: true,
      maxHeapSize: vibexConfig.performance?.maxMemoryUsage || 512,
      enableWeakReferences: true,
      gcInterval: 30000,
      enableObjectPooling: true
    },
    
    // Security configuration
    security: {
      enableSandbox: vibexConfig.security?.enableSandbox !== false,
      sandboxTimeout: vibexConfig.security?.sandboxTimeout || 30000,
      allowedCommands: vibexConfig.security?.allowedCommands || [],
      blockedCommands: vibexConfig.security?.blockedCommands || [],
      enableFileSystemAccess: vibexConfig.security?.enableFileSystemAccess !== false,
      enableNetworkAccess: vibexConfig.security?.enableNetworkAccess !== false,
      enableProcessExecution: vibexConfig.security?.enableProcessExecution !== false,
      maxFileSize: vibexConfig.security?.maxFileSize || 10485760,
      maxProcessTime: vibexConfig.security?.maxProcessTime || 30000,
      enableAuditLogging: vibexConfig.security?.enableAuditLogging !== false,
      enableEncryption: vibexConfig.security?.enableEncryption !== false,
      enableAccessControl: vibexConfig.security?.enableAccessControl !== false,
      enableRateLimiting: vibexConfig.security?.enableRateLimiting !== false,
      enableInputValidation: vibexConfig.security?.enableInputValidation !== false
    },
    
    // Logging configuration
    logging: {
      level: vibexConfig.logging?.level || 'info',
      enableConsoleLogging: vibexConfig.logging?.enableConsoleLogging !== false,
      enableFileLogging: vibexConfig.logging?.enableFileLogging || false,
      logFile: vibexConfig.logging?.logFile || 'vibex.log',
      maxLogFileSize: vibexConfig.logging?.maxLogFileSize || 10485760,
      maxLogFiles: vibexConfig.logging?.maxLogFiles || 5,
      enableTimestamps: vibexConfig.logging?.enableTimestamps !== false,
      enableColors: vibexConfig.logging?.enableColors !== false,
      enableStackTraces: vibexConfig.logging?.enableStackTraces !== false,
      logFormat: vibexConfig.logging?.logFormat || 'text',
      enableRotation: vibexConfig.logging?.enableLogRotation !== false,
      enableCompression: true,
      enableAsyncLogging: true,
      enableStructuredLogging: vibexConfig.logging?.logFormat === 'json',
      enableMetrics: true
    },
    
    // Development configuration
    development: {
      enableHotReload: vibexConfig.development?.enableHotReload || false,
      enableSourceMaps: vibexConfig.development?.enableSourceMaps !== false,
      enableDebugger: vibexConfig.development?.enableDebugMode || false,
      enableProfiling: false,
      enableExperimentalFeatures: vibexConfig.enableExperimentalFeatures || false,
      enableTestMode: vibexConfig.development?.enableTestMode || false,
      enableMockData: vibexConfig.development?.enableMockServices || false,
      enableDevTools: vibexConfig.development?.enableDevTools || false,
      enableLiveReload: vibexConfig.development?.enableLiveReload || false,
      enableAutoSave: vibexConfig.development?.enableAutoSave || false,
      devServerPort: vibexConfig.development?.devServerPort || 3000,
      debugPort: vibexConfig.development?.debugPort || 9229
    },
    
    // Accessibility configuration
    accessibility: {
      enableHighContrast: false,
      enableLargeText: false,
      enableScreenReader: false,
      enableKeyboardNavigation: true,
      enableVoiceCommands: false,
      enableColorBlindSupport: false,
      enableReducedMotion: false,
      enableFocusIndicators: true,
      enableAltText: true,
      enableAriaLabels: true
    },
    
    // Telemetry configuration
    telemetry: {
      enableTelemetry: vibexConfig.dpm?.enableTelemetry !== false,
      enableAnalytics: vibexConfig.dpm?.enableAnalytics !== false,
      enableErrorReporting: true,
      enablePerformanceMetrics: vibexConfig.performance?.enableMetrics !== false,
      enableUsageStats: false,
      enableCrashReports: true,
      telemetryEndpoint: vibexConfig.dpm?.analyticsEndpoint,
      enablePrivacyMode: false,
      dataRetentionDays: 30,
      enableDataExport: true
    },
    
    // Legacy properties that might be accessed
    fullContext: vibexConfig.context?.enableGlobalContext !== false,
    memory: undefined // Legacy property, not used in new system
  };
}

/**
 * Convert legacy AppConfigType to new VibexConfig format
 */
export function adaptLegacyToVibexConfig(legacyConfig: AppConfigType): Partial<VibexConfig> {
  return {
    version: legacyConfig.version || '1.0.0',
    environment: legacyConfig.development?.enableTestMode ? 'test' : 
                 legacyConfig.development?.enableDebugger ? 'development' : 'production',
    enableExperimentalFeatures: legacyConfig.development?.enableExperimentalFeatures || false,
    
    ai: {
      anthropic: {
        apiKey: legacyConfig.api?.key,
        model: legacyConfig.ai?.model || 'claude-3-sonnet-20240229',
        temperature: legacyConfig.ai?.temperature || 0.7,
        maxTokens: legacyConfig.ai?.maxTokens || 4096,
        enableStreaming: legacyConfig.ai?.enableStreaming !== false,
        retryAttempts: legacyConfig.ai?.retryAttempts || 3,
        systemPrompt: legacyConfig.ai?.systemPrompt
      }
    },
    
    ui: {
      theme: legacyConfig.ui?.theme || 'dark',
      enableColors: legacyConfig.ui?.enableColors !== false,
      enableAnimations: legacyConfig.ui?.enableAnimations !== false,
      showLineNumbers: legacyConfig.ui?.showLineNumbers !== false,
      fontSize: legacyConfig.ui?.fontSize || 14,
      fontFamily: legacyConfig.ui?.fontFamily || 'monospace',
      terminalWidth: legacyConfig.ui?.terminalWidth || 80,
      terminalHeight: legacyConfig.ui?.terminalHeight || 24,
      enableSyntaxHighlighting: legacyConfig.ui?.enableSyntaxHighlighting !== false,
      enableAutoComplete: legacyConfig.ui?.enableAutoComplete !== false,
      showTimestamps: legacyConfig.ui?.showTimestamps !== false,
      compactMode: legacyConfig.ui?.compactMode || false,
      enableKeyboardShortcuts: legacyConfig.ui?.enableKeyboardShortcuts !== false,
      enableStatusBar: legacyConfig.ui?.enableStatusBar !== false,
      showTokenCount: legacyConfig.ui?.showTokenCount !== false
    },
    
    tools: {
      enabledTools: legacyConfig.tools?.enabledTools || [],
      enableToolExecution: legacyConfig.tools?.enableToolExecution !== false,
      toolTimeout: legacyConfig.tools?.toolTimeout || 30000,
      enableFileOperations: legacyConfig.tools?.enableFileOperations !== false,
      enableNetworkAccess: legacyConfig.tools?.enableNetworkAccess !== false,
      enableSystemCommands: legacyConfig.tools?.enableSystemCommands !== false,
      maxFileSize: legacyConfig.tools?.maxFileSize || 10485760,
      enableVersionControl: legacyConfig.tools?.enableVersionControl !== false,
      enablePackageManager: legacyConfig.tools?.enablePackageManager !== false,
      enableWebTools: legacyConfig.tools?.enableWebTools !== false,
      enableAdvancedTools: legacyConfig.tools?.enableAdvancedTools !== false
    },
    
    context: {
      projectMarkers: legacyConfig.context?.projectMarkers || ['.git', 'package.json'],
      contextFileNames: legacyConfig.context?.contextFileNames || ['.context.md'],
      maxDepth: legacyConfig.context?.maxDepth || 10,
      enableGlobalContext: legacyConfig.context?.enableGlobalContext !== false,
      enableProjectContext: legacyConfig.context?.enableProjectContext !== false,
      enableDirectoryContext: legacyConfig.context?.enableDirectoryContext !== false,
      maxContentLength: legacyConfig.context?.maxContextSize || 100000,
      enableMemoryStorage: legacyConfig.context?.enableContextCaching !== false,
      ttlMs: legacyConfig.context?.contextCacheTimeout || 60000
    },
    
    performance: {
      cacheEnabled: legacyConfig.performance?.enableModuleCache !== false,
      maxMemoryUsage: legacyConfig.performance?.maxOldSpaceSize || 512,
      enableLazyLoading: legacyConfig.performance?.enableLazyLoading !== false,
      enableMetrics: legacyConfig.telemetry?.enablePerformanceMetrics !== false
    },
    
    security: {
      enableSandbox: legacyConfig.security?.enableSandbox !== false,
      sandboxTimeout: legacyConfig.security?.sandboxTimeout || 30000,
      allowedCommands: legacyConfig.security?.allowedCommands || [],
      blockedCommands: legacyConfig.security?.blockedCommands || [],
      enableFileSystemAccess: legacyConfig.security?.enableFileSystemAccess !== false,
      enableNetworkAccess: legacyConfig.security?.enableNetworkAccess !== false,
      enableProcessExecution: legacyConfig.security?.enableProcessExecution !== false,
      maxFileSize: legacyConfig.security?.maxFileSize || 10485760,
      maxProcessTime: legacyConfig.security?.maxProcessTime || 30000,
      enableAuditLogging: legacyConfig.security?.enableAuditLogging !== false,
      enableEncryption: legacyConfig.security?.enableEncryption !== false,
      enableAccessControl: legacyConfig.security?.enableAccessControl !== false,
      enableRateLimiting: legacyConfig.security?.enableRateLimiting !== false,
      enableInputValidation: legacyConfig.security?.enableInputValidation !== false
    },
    
    logging: {
      level: legacyConfig.logging?.level as any || 'info',
      enableConsoleLogging: legacyConfig.logging?.enableConsoleLogging !== false,
      enableFileLogging: legacyConfig.logging?.enableFileLogging || false,
      logFile: legacyConfig.logging?.logFile || 'vibex.log',
      maxLogFileSize: legacyConfig.logging?.maxLogFileSize || 10485760,
      maxLogFiles: legacyConfig.logging?.maxLogFiles || 5,
      enableTimestamps: legacyConfig.logging?.enableTimestamps !== false,
      enableColors: legacyConfig.logging?.enableColors !== false,
      enableStackTraces: legacyConfig.logging?.enableStackTraces !== false,
      logFormat: legacyConfig.logging?.logFormat as any || 'text',
      enableLogRotation: legacyConfig.logging?.enableRotation !== false
    },
    
    development: {
      isDevelopment: legacyConfig.debug || false,
      enableHotReload: legacyConfig.development?.enableHotReload || false,
      enableSourceMaps: legacyConfig.development?.enableSourceMaps !== false,
      enableDebugMode: legacyConfig.development?.enableDebugger || false,
      enableTestMode: legacyConfig.development?.enableTestMode || false,
      enableMockServices: legacyConfig.development?.enableMockData || false,
      enableDevTools: legacyConfig.development?.enableDevTools || false,
      enableLiveReload: legacyConfig.development?.enableLiveReload || false,
      enableAutoSave: legacyConfig.development?.enableAutoSave || false,
      devServerPort: legacyConfig.development?.devServerPort || 3000,
      debugPort: legacyConfig.development?.debugPort || 9229
    },
    
    dpm: {
      enabled: false,
      enableTelemetry: legacyConfig.telemetry?.enableTelemetry !== false,
      enableAnalytics: legacyConfig.telemetry?.enableAnalytics !== false,
      analyticsEndpoint: legacyConfig.telemetry?.telemetryEndpoint
    }
  };
} 