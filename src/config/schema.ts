/**
 * Configuration Schema and Validation System
 * 
 * This module defines the comprehensive schema for the application's configuration,
 * establishing both the structure and validation rules for all settings. Key features:
 * 
 * - Complete type definitions for the entire configuration tree
 * - Strong validation rules with customized error messages
 * - Default values for all configuration options
 * - Nested configuration objects with logical organization
 * - TypeScript type inference from Zod schemas
 * - Schema validation utilities for runtime type checking
 * - Safe parsing with structured error handling
 * 
 * The defined schema acts as the single source of truth for configuration
 * structure across the application, ensuring type safety and consistency.
 */

import { z } from 'zod';

// Claude 4 model definitions
export const CLAUDE_4_MODELS = {
  CLAUDE_4_SONNET: 'claude-sonnet-4-20250514',
  CLAUDE_4_OPUS: 'claude-opus-4-20250514'
} as const;

export const CLAUDE_4_MODEL_LIST = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514'
] as const;

// Claude optimized configuration schemas
const claudeConversationConfigSchema = z.object({
  enableAdvancedReasoning: z.boolean().default(true),
  useContextCompression: z.boolean().default(true),
  enableStreamingWithThinking: z.boolean().default(true),
  maxContextLength: z.number().default(200000),
  enableMultimodalProcessing: z.boolean().default(true),
  enableCanvasMode: z.boolean().default(true),
  persistConversationState: z.boolean().default(true),
  autoSaveCheckpoints: z.boolean().default(true),
  checkpointInterval: z.number().default(10)
}).default({});

const modernUIConfigSchema = z.object({
  defaultInterfaceMode: z.enum(['chat', 'canvas', 'multimodal', 'analysis', 'collaboration', 'compact', 'streaming']).default('chat'),
  densityMode: z.enum(['ultra-compact', 'compact', 'normal', 'spacious']).default('normal'),
  enableProgressiveDisclosure: z.boolean().default(true),
  enableAdaptiveUI: z.boolean().default(true),
  enableStreamingIndicators: z.boolean().default(true),
  showThinkingBlocks: z.boolean().default(true),
  enableWorkflowOrchestration: z.boolean().default(true),
  theme: z.object({
    colorScheme: z.enum(['auto', 'light', 'dark', 'high-contrast']).default('auto'),
    accentColor: z.string().default('#007acc'),
    fontFamily: z.string().default('system-ui, -apple-system, sans-serif'),
    enableAnimations: z.boolean().default(true),
    enableGradients: z.boolean().default(true)
  }).default({}),
  accessibility: z.object({
    enableScreenReaderSupport: z.boolean().default(false),
    enableKeyboardNavigation: z.boolean().default(true),
    enableHighContrast: z.boolean().default(false),
    reduceMotion: z.boolean().default(false),
    enableVoiceAnnouncements: z.boolean().default(false)
  }).default({})
}).default({});

const performanceConfigSchema = z.object({
  enableParallelProcessing: z.boolean().default(true),
  maxConcurrentOperations: z.number().default(5),
  enableResponseCaching: z.boolean().default(true),
  cacheTTL: z.number().default(300000),
  enableStreamingOptimizations: z.boolean().default(true),
  streamingChunkSize: z.number().default(1024),
  enableMemoryOptimization: z.boolean().default(true),
  gcThreshold: z.number().default(100),
  enablePerformanceMonitoring: z.boolean().default(true),
  metricsInterval: z.number().default(30000)
}).default({});

const intelligentContextConfigSchema = z.object({
  enableAutoContextLoading: z.boolean().default(true),
  discoveryPatterns: z.array(z.string()).default(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']),
  maxContextFileSize: z.number().default(1000000),
  enableHierarchicalLoading: z.boolean().default(true),
  precedenceRules: z.array(z.object({
    pattern: z.string(),
    priority: z.number(),
    scope: z.enum(['global', 'project', 'directory'])
  })).default([]),
  enableSmartFiltering: z.boolean().default(true),
  filteringRules: z.object({
    includePatterns: z.array(z.string()).default([]),
    excludePatterns: z.array(z.string()).default(['node_modules/**', 'dist/**', 'build/**']),
    respectGitIgnore: z.boolean().default(true),
    respectVibexIgnore: z.boolean().default(true)
  }).default({}),
  enableContextCompression: z.boolean().default(true),
  compressionRatio: z.number().default(0.8)
}).default({});

const advancedFeatureConfigSchema = z.object({
  workflowOrchestration: z.object({
    enableRealTimeOrchestration: z.boolean().default(true),
    enableWorkflowTemplates: z.boolean().default(true),
    enableWorkflowSharing: z.boolean().default(false),
    maxConcurrentWorkflows: z.number().default(3),
    enableWorkflowMetrics: z.boolean().default(true)
  }).default({}),
  multimodalContent: z.object({
    enableImageAnalysis: z.boolean().default(true),
    enableAudioTranscription: z.boolean().default(false),
    enableVideoAnalysis: z.boolean().default(false),
    enableDocumentExtraction: z.boolean().default(true),
    maxFileSize: z.number().default(10485760),
    supportedFormats: z.array(z.string()).default(['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'])
  }).default({}),
  collaboration: z.object({
    enableRealTimeCollaboration: z.boolean().default(false),
    enableSharedWorkspaces: z.boolean().default(false),
    enableConversationSharing: z.boolean().default(false),
    maxCollaborators: z.number().default(5)
  }).default({}),
  toolExecution: z.object({
    enableRealTimeToolFeedback: z.boolean().default(true),
    enableToolExecutionHistory: z.boolean().default(true),
    enableToolPerformanceMetrics: z.boolean().default(true),
    enableToolSuggestions: z.boolean().default(true),
    enableBatchToolExecution: z.boolean().default(true)
  }).default({}),
  atCommandProcessing: z.object({
    enableSmartFileInjection: z.boolean().default(true),
    enableContentAnalysis: z.boolean().default(true),
    enableQueryPreprocessing: z.boolean().default(true),
    maxFilesPerCommand: z.number().default(50),
    enableFileValidation: z.boolean().default(true)
  }).default({})
}).default({});

const claudeOptimizedConfigSchema = z.object({
  conversation: claudeConversationConfigSchema,
  ui: modernUIConfigSchema,
  performance: performanceConfigSchema,
  context: intelligentContextConfigSchema,
  features: advancedFeatureConfigSchema,
  model: z.string().default('claude-sonnet-4-20250514'),
  version: z.string().default('1.0.0'),
  lastUpdated: z.date().default(() => new Date())
}).default({});

// Main application configuration schema
export const appConfigSchema = z.object({
  // API configuration
  api: z.object({
    baseUrl: z.string().url().default('https://api.anthropic.com'),
    version: z.string().default('v1'),
    timeout: z.number().positive().default(60000),
    key: z.string().optional()
  }).default({}),
  
  // AI configuration
  ai: z.object({
    model: z.string().default(CLAUDE_4_MODELS.CLAUDE_4_SONNET),
    temperature: z.number().min(0).max(1).default(0.5),
    maxTokens: z.number().int().positive().default(4096),
    maxHistoryLength: z.number().int().positive().default(20),
    enableCaching: z.boolean().default(true),
    enableTools: z.boolean().default(true),
    enableTelemetry: z.boolean().default(true),
    enableBetaFeatures: z.boolean().default(true),
    autoModelSelection: z.boolean().default(true),
    costBudget: z.number().positive().default(100),
    performanceMode: z.enum(['speed', 'balanced', 'quality']).default('balanced'),
    systemPrompt: z.string().default(
      'You are Claude, a helpful AI assistant. You are running in Claude Code, a CLI tool for software development.' +
      'You help users with programming tasks, code generation, debugging, and other software development activities.' +
      'Respond in a concise, direct manner appropriate for a command-line interface.'
    )
  }).default({}),
  
  // Authentication configuration
  auth: z.object({
    autoRefresh: z.boolean().default(true),
    tokenRefreshThreshold: z.number().positive().default(300),
    maxRetryAttempts: z.number().int().positive().default(3)
  }).default({}),
  
  // Terminal configuration
  terminal: z.object({
    theme: z.enum(['dark', 'light', 'system']).default('system'),
    useColors: z.boolean().default(true),
    showProgressIndicators: z.boolean().default(true),
    codeHighlighting: z.boolean().default(true),
    useHighContrast: z.boolean().default(false),
    fontSizeAdjustment: z.enum(['small', 'normal', 'large']).default('normal'),
    reduceMotion: z.boolean().default(false),
    simplifyInterface: z.boolean().default(false),
    streamingSpeed: z.number().positive().default(40)
  }).default({}),
  
  // Accessibility configuration
  accessibility: z.object({
    enabled: z.boolean().default(false),
    disableLoadingPhrases: z.boolean().default(false),
    screenReaderOptimized: z.boolean().default(false),
    keyboardNavigationEnhanced: z.boolean().default(false)
  }).default({}),
  
  // Telemetry configuration
  telemetry: z.object({
    enabled: z.boolean().default(true),
    submissionInterval: z.number().positive().default(30 * 60 * 1000),
    maxQueueSize: z.number().int().positive().default(100),
    autoSubmit: z.boolean().default(true)
  }).default({}),
  
  // File operation configuration
  fileOps: z.object({
    maxReadSizeBytes: z.number().positive().default(10 * 1024 * 1024)
  }).default({}),
  
  // Execution configuration
  execution: z.object({
    shell: z.string().default('bash')
  }).default({}),
  
  // Logger configuration
  logger: z.object({
    level: z.string().default('info'),
    timestamps: z.boolean().default(true),
    colors: z.boolean().default(true)
  }).default({}),
  
  // Claude 4 specific configuration
  claude4: z.object({
    vision: z.boolean().default(false),
    visionEnhancements: z.object({
      detail: z.enum(['low', 'high']).default('low')
    }).default({ detail: 'low' }),
    preferredModel: z.string().default('claude-4-sonnet-20240229'),
    fallbackModel: z.string().default('claude-3-5-sonnet-20241022')
  }).default({
    vision: false,
    visionEnhancements: { detail: 'low' },
    preferredModel: 'claude-4-sonnet-20240229',
    fallbackModel: 'claude-3-5-sonnet-20241022'
  }),
  
  // Claude optimized configuration
  claude: claudeOptimizedConfigSchema,
  
  // Modern UI configuration (enhanced)
  modernUI: z.object({
    defaultInterfaceMode: z.enum(['chat', 'canvas', 'multimodal', 'analysis', 'collaboration', 'compact', 'streaming']).default('chat'),
    densityMode: z.enum(['ultra-compact', 'compact', 'normal', 'spacious']).default('normal'),
    enableProgressiveDisclosure: z.boolean().default(true),
    enableAdaptiveUI: z.boolean().default(true),
    enableStreamingIndicators: z.boolean().default(true),
    showThinkingBlocks: z.boolean().default(true),
    enableWorkflowOrchestration: z.boolean().default(true),
    interfaceModes: z.record(z.any()).default({}),
    advancedTheme: z.any().default({}),
    accessibility: z.any().default({}),
    layout: z.any().default({}),
    globalPreferences: z.object({
      autoSave: z.boolean().default(true),
      syncSettings: z.boolean().default(false),
      autoReset: z.boolean().default(true),
      enableAnalytics: z.boolean().default(false),
      enableSuggestions: z.boolean().default(true)
    }).default({}),
    configVersion: z.string().default('1.0.0'),
    lastModified: z.date().default(() => new Date())
  }).default({}),
  
  // Performance configuration
  performance: performanceConfigSchema,
  
  // UI configuration (basic)
  ui: modernUIConfigSchema,
  
  // Integration metadata
  integration: z.object({
    version: z.string().default('1.0.0'),
    lastIntegrated: z.date().default(() => new Date()),
    activeOptimizations: z.array(z.string()).default([]),
    performanceMetrics: z.object({
      configLoadTime: z.number().default(0),
      memoryUsage: z.number().default(0),
      optimizationCount: z.number().default(0)
    }).default({})
  }).default({}),
  
  // Memory configuration (optional)
  memory: z.unknown().optional(),
  
  // Security configuration
  security: z.object({
    sandbox: z.object({
      enabled: z.boolean().default(false),
      mode: z.enum(['restricted', 'container']).default('restricted'),
      containerImage: z.string().optional(),
      containerCommand: z.enum(['docker', 'podman', 'sandbox-exec']).optional(),
      allowedCommands: z.array(z.string()).default([]),
      deniedCommands: z.array(z.string()).default([]),
      readOnlyFilesystem: z.boolean().default(false),
      allowedPaths: z.array(z.string()).default([]),
      allowedNetworkHosts: z.array(z.string()).default([]),
      resourceLimits: z.object({
        cpuLimit: z.number().optional(),
        memoryLimit: z.string().optional(),
        processLimit: z.number().optional()
      }).default({})
    }).default({}),
    permissions: z.object({
      allowFileWrite: z.boolean().default(true),
      allowCommandExecution: z.boolean().default(true),
      allowNetwork: z.boolean().default(true),
      promptForDangerousOperations: z.boolean().default(true)
    }).default({})
  }).default({}),
  
  // Version
  version: z.string().default('0.2.29'),
  
  // Full context mode for complete project analysis
  fullContext: z.boolean().default(false),
  
  // Debug mode
  debug: z.boolean().default(false)
});

// Type definition generated from schema
export type AppConfigType = z.infer<typeof appConfigSchema>;

/**
 * Schema validator class
 */
export class SchemaValidator<T> {
  private readonly schema: z.ZodType<T>;
  
  constructor(schema: z.ZodType<T>) {
    this.schema = schema;
  }
  
  /**
   * Validate data against schema
   */
  validate(data: unknown): T {
    return this.schema.parse(data);
  }
  
  /**
   * Validate data against schema with safe error handling
   */
  validateSafe(data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
    const result = this.schema.safeParse(data);
    return result;
  }
}