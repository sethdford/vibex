/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Comprehensive Configuration Schema
 * 
 * Unified schema that includes all configuration options from existing systems:
 * - Legacy ConfigManager (src/config/index.ts)
 * - Advanced HierarchicalConfigManager (src/config/advanced-config.ts)
 * - DPM Config (src/dpm/config/dpm-config.ts)
 * - Simple Config (src/config/simple-config.ts)
 */

import { z } from 'zod';

/**
 * AI Provider Configuration
 */
const AIProviderSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string(),
  maxTokens: z.number().min(1).max(200000).default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  timeout: z.number().min(1000).default(30000),
  maxRetries: z.number().min(0).default(3),
  baseURL: z.string().url().optional()
});

/**
 * AI Configuration
 */
const AIConfigSchema = z.object({
  // Primary AI provider
  provider: z.enum(['anthropic', 'openai', 'google', 'mistral']).default('anthropic'),
  
  // Provider-specific configurations
  anthropic: AIProviderSchema.extend({
    model: z.string().default('claude-3-sonnet-20240229'),
    apiKey: z.string().optional(),
    maxTokens: z.number().default(4096)
  }),
  
  openai: AIProviderSchema.extend({
    model: z.string().default('gpt-4'),
    apiKey: z.string().optional(),
    organization: z.string().optional()
  }),
  
  google: AIProviderSchema.extend({
    model: z.string().default('gemini-pro'),
    apiKey: z.string().optional()
  }),
  
  mistral: AIProviderSchema.extend({
    model: z.string().default('mistral-large'),
    apiKey: z.string().optional()
  }),
  
  // Global AI settings
  enableStreaming: z.boolean().default(true),
  enableFunctionCalling: z.boolean().default(true),
  enableVision: z.boolean().default(false),
  contextWindowSize: z.number().min(1000).default(100000),
  systemPrompt: z.string().optional(),
  
  // Safety and content filtering
  enableContentFilter: z.boolean().default(true),
  maxContentLength: z.number().min(1000).default(1000000),
  enableProfanityFilter: z.boolean().default(false)
});

/**
 * UI Configuration
 */
const UIConfigSchema = z.object({
  // Theme settings
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  accentColor: z.string().default('#007acc'),
  
  // Editor settings
  fontSize: z.number().min(8).max(24).default(14),
  fontFamily: z.string().default('Monaco, Consolas, monospace'),
  showLineNumbers: z.boolean().default(true),
  wordWrap: z.boolean().default(true),
  tabSize: z.number().min(1).max(8).default(2),
  insertSpaces: z.boolean().default(true),
  
  // Terminal settings
  terminalTheme: z.string().default('dark'),
  terminalFontSize: z.number().min(8).max(24).default(12),
  terminalScrollback: z.number().min(100).max(10000).default(1000),
  
  // Layout settings
  sidebarWidth: z.number().min(200).max(600).default(300),
  panelHeight: z.number().min(100).max(500).default(200),
  showMinimap: z.boolean().default(true),
  showStatusBar: z.boolean().default(true),
  
  // Animation and performance
  enableAnimations: z.boolean().default(true),
  enableSmoothScrolling: z.boolean().default(true),
  renderWhitespace: z.enum(['none', 'boundary', 'selection', 'all']).default('selection')
});

/**
 * Tool Configuration
 */
const ToolConfigSchema = z.object({
  // Tool management
  enabledTools: z.array(z.string()).default([]),
  disabledTools: z.array(z.string()).default([]),
  toolTimeout: z.number().min(1000).default(30000),
  maxConcurrentTools: z.number().min(1).max(20).default(5),
  
  // Tool discovery
  autoDiscoverTools: z.boolean().default(true),
  toolSearchPaths: z.array(z.string()).default([]),
  enableCustomTools: z.boolean().default(true),
  
  // Tool execution
  enableSandboxedExecution: z.boolean().default(true),
  allowSystemCommands: z.boolean().default(false),
  allowNetworkAccess: z.boolean().default(true),
  allowFileSystemAccess: z.boolean().default(true),
  
  // Tool validation
  validateToolInputs: z.boolean().default(true),
  validateToolOutputs: z.boolean().default(true),
  enableToolLogging: z.boolean().default(true),
  
  // MCP (Model Context Protocol) settings
  mcpServers: z.array(z.object({
    name: z.string(),
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    enabled: z.boolean().default(true)
  })).default([])
});

/**
 * Security Configuration
 */
const SecurityConfigSchema = z.object({
  // Sandbox settings
  enableSandbox: z.boolean().default(true),
  sandboxTimeout: z.number().min(1000).default(30000),
  maxSandboxMemory: z.number().min(64).default(512), // MB
  
  // Command restrictions
  allowedCommands: z.array(z.string()).default([]),
  blockedCommands: z.array(z.string()).default(['rm', 'sudo', 'chmod']),
  enableCommandValidation: z.boolean().default(true),
  
  // Network restrictions
  trustedDomains: z.array(z.string()).default([]),
  blockedDomains: z.array(z.string()).default([]),
  enableNetworkFiltering: z.boolean().default(true),
  maxRequestSize: z.number().min(1024).default(10485760), // 10MB
  
  // File system restrictions
  allowedPaths: z.array(z.string()).default([]),
  blockedPaths: z.array(z.string()).default(['/etc', '/sys', '/proc']),
  enablePathValidation: z.boolean().default(true),
  maxFileSize: z.number().min(1024).default(104857600), // 100MB
  
  // Authentication and encryption
  enableEncryption: z.boolean().default(false),
  encryptionKey: z.string().optional(),
  sessionTimeout: z.number().min(300000).default(3600000), // 1 hour
  enableApiKeyValidation: z.boolean().default(true)
});

/**
 * DPM (Digital Product Manager) Configuration
 */
const DPMConfigSchema = z.object({
  // Core DPM settings
  enabled: z.boolean().default(false),
  apiEndpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  
  // Sync settings
  syncInterval: z.number().min(60000).default(300000), // 5 minutes
  enableAutoSync: z.boolean().default(true),
  syncOnStartup: z.boolean().default(true),
  
  // Analytics settings
  enableAnalytics: z.boolean().default(true),
  analyticsEndpoint: z.string().url().optional(),
  trackUserBehavior: z.boolean().default(false),
  enableTelemetry: z.boolean().default(true),
  
  // Product management features
  enableRoadmapTracking: z.boolean().default(true),
  enableUserResearch: z.boolean().default(true),
  enableMarketAnalysis: z.boolean().default(true),
  enableBetaTesting: z.boolean().default(false),
  
  // AI intelligence settings
  enableAIInsights: z.boolean().default(true),
  aiInsightsModel: z.string().default('claude-3-sonnet-20240229'),
  enablePredictiveAnalytics: z.boolean().default(false),
  
  // Lifecycle management
  enableLifecycleTracking: z.boolean().default(true),
  lifecycleStages: z.array(z.string()).default(['concept', 'development', 'beta', 'launch', 'growth', 'maturity']),
  enableAutomatedTransitions: z.boolean().default(false)
});

/**
 * Performance Configuration
 */
const PerformanceConfigSchema = z.object({
  // Caching settings
  cacheEnabled: z.boolean().default(true),
  maxCacheSize: z.number().min(10).default(100), // Number of items
  cacheTimeout: z.number().min(60000).default(3600000), // 1 hour
  cleanupInterval: z.number().min(60000).default(300000), // 5 minutes
  
  // Memory management
  maxMemoryUsage: z.number().min(64).default(512), // MB
  enableMemoryMonitoring: z.boolean().default(true),
  memoryWarningThreshold: z.number().min(0.5).max(0.95).default(0.8),
  enableGarbageCollection: z.boolean().default(true),
  
  // Processing limits
  maxProcessingTime: z.number().min(1000).default(30000),
  maxConcurrentOperations: z.number().min(1).default(10),
  enableOperationQueuing: z.boolean().default(true),
  queueMaxSize: z.number().min(10).default(100),
  
  // Optimization settings
  enableLazyLoading: z.boolean().default(true),
  enableCodeSplitting: z.boolean().default(true),
  enableMinification: z.boolean().default(true),
  enableCompression: z.boolean().default(true),
  
  // Monitoring and metrics
  enableMetrics: z.boolean().default(true),
  metricsInterval: z.number().min(1000).default(10000),
  enableProfiling: z.boolean().default(false),
  profileSampleRate: z.number().min(0.01).max(1).default(0.1)
});

/**
 * Context System Configuration
 */
const ContextConfigSchema = z.object({
  // Context loading
  globalContextDir: z.string().optional(),
  contextFileNames: z.array(z.string()).default(['.context.md', 'context.md']),
  projectMarkers: z.array(z.string()).default(['.git', 'package.json', 'Cargo.toml']),
  maxDepth: z.number().min(1).default(10),
  encoding: z.string().default('utf-8'),
  
  // Context features
  enableGlobalContext: z.boolean().default(true),
  enableProjectContext: z.boolean().default(true),
  enableDirectoryContext: z.boolean().default(true),
  enableVariableInterpolation: z.boolean().default(true),
  
  // Variable patterns
  variablePatterns: z.record(z.string()).default({}),
  customVariables: z.record(z.string()).default({}),
  
  // Merge settings
  includeHeaders: z.boolean().default(true),
  includeSeparators: z.boolean().default(true),
  includeMetadata: z.boolean().default(false),
  maxContentLength: z.number().min(1000).default(100000),
  sortByPriority: z.boolean().default(true),
  
  // Cache settings
  ttlMs: z.number().min(10000).default(60000),
  maxEntries: z.number().min(10).default(100),
  enableMemoryStorage: z.boolean().default(true),
  memoryImportance: z.number().min(0).max(100).default(90),
  
  // Discovery settings
  enableSubdirectoryDiscovery: z.boolean().default(false),
  enableRealTimeUpdates: z.boolean().default(false),
  autoStartWatching: z.boolean().default(false),
  watchPaths: z.array(z.string()).default([])
});

/**
 * Logging Configuration
 */
const LoggingConfigSchema = z.object({
  // Log levels
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  enableConsoleLogging: z.boolean().default(true),
  enableFileLogging: z.boolean().default(false),
  
  // File logging settings
  logFile: z.string().default('vibex.log'),
  maxLogFileSize: z.number().min(1024).default(10485760), // 10MB
  maxLogFiles: z.number().min(1).default(5),
  enableLogRotation: z.boolean().default(true),
  
  // Log formatting
  enableTimestamps: z.boolean().default(true),
  enableColors: z.boolean().default(true),
  enableStackTraces: z.boolean().default(true),
  logFormat: z.enum(['json', 'text']).default('text'),
  
  // Component-specific logging
  componentLevels: z.record(z.enum(['debug', 'info', 'warn', 'error'])).default({}),
  enableComponentFiltering: z.boolean().default(false),
  
  // Performance logging
  enablePerformanceLogging: z.boolean().default(false),
  performanceThreshold: z.number().min(100).default(1000)
});

/**
 * Development Configuration
 */
const DevelopmentConfigSchema = z.object({
  // Development mode
  isDevelopment: z.boolean().default(false),
  enableHotReload: z.boolean().default(false),
  enableDevTools: z.boolean().default(false),
  
  // Debugging
  enableDebugMode: z.boolean().default(false),
  debugPort: z.number().min(1024).max(65535).default(9229),
  enableSourceMaps: z.boolean().default(true),
  
  // Testing
  enableTestMode: z.boolean().default(false),
  testDataPath: z.string().optional(),
  enableMockServices: z.boolean().default(false),
  
  // Development server
  devServerPort: z.number().min(1024).max(65535).default(3000),
  enableLiveReload: z.boolean().default(true),
  enableAutoSave: z.boolean().default(true)
});

/**
 * Main VibeX Configuration Schema
 */
export const VibexConfigSchema = z.object({
  // Core configuration sections
  ai: AIConfigSchema.optional().default(AIConfigSchema.parse({})),
  ui: UIConfigSchema.optional().default(UIConfigSchema.parse({})),
  tools: ToolConfigSchema.optional().default(ToolConfigSchema.parse({})),
  security: SecurityConfigSchema.optional().default(SecurityConfigSchema.parse({})),
  dpm: DPMConfigSchema.optional().default(DPMConfigSchema.parse({})),
  performance: PerformanceConfigSchema.optional().default(PerformanceConfigSchema.parse({})),
  context: ContextConfigSchema.optional().default(ContextConfigSchema.parse({})),
  logging: LoggingConfigSchema.optional().default(LoggingConfigSchema.parse({})),
  development: DevelopmentConfigSchema.optional().default(DevelopmentConfigSchema.parse({})),
  
  // Global settings
  version: z.string().default('1.0.0'),
  environment: z.enum(['development', 'production', 'test']).default('production'),
  enableExperimentalFeatures: z.boolean().default(false),
  
  // User preferences
  firstRun: z.boolean().default(true),
  userId: z.string().optional(),
  userPreferences: z.record(z.any()).default({}),
  
  // Legacy compatibility
  legacyMode: z.boolean().default(false),
  migrationVersion: z.string().default('1.0.0')
});

/**
 * Inferred TypeScript type from the schema
 */
export type VibexConfig = z.infer<typeof VibexConfigSchema>;

/**
 * Default configuration values
 */
export const defaultVibexConfig: VibexConfig = VibexConfigSchema.parse({});

/**
 * Configuration validation function
 */
export function validateVibexConfig(config: unknown): VibexConfig {
  return VibexConfigSchema.parse(config);
}

/**
 * Partial configuration validation for updates
 */
export function validatePartialVibexConfig(config: unknown): Partial<VibexConfig> {
  return VibexConfigSchema.partial().parse(config);
}

/**
 * Configuration schema for specific sections
 */
export const ConfigSectionSchemas = {
  ai: AIConfigSchema,
  ui: UIConfigSchema,
  tools: ToolConfigSchema,
  security: SecurityConfigSchema,
  dpm: DPMConfigSchema,
  performance: PerformanceConfigSchema,
  context: ContextConfigSchema,
  logging: LoggingConfigSchema,
  development: DevelopmentConfigSchema
} as const;

/**
 * Type for configuration section names
 */
export type ConfigSectionName = keyof typeof ConfigSectionSchemas;

/**
 * Helper function to validate specific configuration sections
 */
export function validateConfigSection<T extends ConfigSectionName>(
  section: T,
  config: unknown
): any {
  return ConfigSectionSchemas[section].parse(config);
} 