/**
 * Default Configuration Values
 * 
 * This module defines the foundational default values for all application settings,
 * establishing the base configuration that applies when no overrides are present.
 * Key aspects include:
 * 
 * - Complete representation of the entire configuration tree
 * - Sensible defaults for all required settings
 * - Production-ready default values for critical settings
 * - Performance-optimized defaults for resource usage
 * - Security-focused defaults for authentication and API access
 * - User experience defaults for interface behavior
 * - Feature enablement flags with safe defaults
 * 
 * These defaults serve as both the fallback configuration and the reference
 * implementation of a complete configuration object structure.
 */

import type { AppConfigType } from './schema.js';
import { CLAUDE_4_MODELS } from './schema.js';

/**
 * Lightweight defaults for CLI startup - reduces memory usage
 * Full configuration is loaded on-demand when needed
 */
export const lightweightDefaults = {
  version: '0.2.29',
  debug: false,
  fullContext: false,
  
  api: {
    baseUrl: 'https://api.anthropic.com',
    version: 'v1',
    timeout: 60000,
    key: process.env.ANTHROPIC_API_KEY || ''
  },
  
  ai: {
    model: CLAUDE_4_MODELS.CLAUDE_4_SONNET,
    temperature: 0.5,
    maxTokens: 4096,
    maxHistoryLength: 20,
    enableCaching: true,
    enableTools: true,
    performanceMode: 'balanced' as const
  },
  
  terminal: {
    theme: 'system' as const,
    useColors: true,
    showProgressIndicators: true,
    codeHighlighting: true,
    streamingSpeed: 40
  }
};

/**
 * Full default configuration - loaded on-demand
 * Only use this when you need the complete configuration object
 */
export const defaults: AppConfigType = {
  // Core system configuration
  version: '0.2.29',
  debug: false,
  fullContext: false,
  
  // API configuration
  api: {
    baseUrl: 'https://api.anthropic.com',
    version: 'v1',
    timeout: 60000,
    key: process.env.ANTHROPIC_API_KEY || ''
  },
  
  // AI configuration optimized for Claude 4
  ai: {
    model: CLAUDE_4_MODELS.CLAUDE_4_SONNET,
    temperature: 0.5,
    maxTokens: 4096,
    maxHistoryLength: 20,
    enableCaching: true,
    enableTools: true,
    enableTelemetry: true,
    enableBetaFeatures: true,
    autoModelSelection: true,
    costBudget: 100,
    performanceMode: 'balanced' as const,
    systemPrompt: 'You are Claude, a helpful AI assistant. You are running in Claude Code, a CLI tool for software development.'
  },
  
  // Authentication configuration
  auth: {
    autoRefresh: true,
    tokenRefreshThreshold: 300,
    maxRetryAttempts: 3
  },
  
  // Terminal configuration
  terminal: {
    theme: 'system' as const,
    useColors: true,
    showProgressIndicators: true,
    codeHighlighting: true,
    useHighContrast: false,
    fontSizeAdjustment: 'normal' as const,
    reduceMotion: false,
    simplifyInterface: false,
    streamingSpeed: 40
  },
  
  // Accessibility configuration
  accessibility: {
    enabled: false,
    disableLoadingPhrases: false,
    screenReaderOptimized: false,
    keyboardNavigationEnhanced: false
  },
  
  // Telemetry configuration
  telemetry: {
    enabled: true,
    submissionInterval: 30 * 60 * 1000,
    maxQueueSize: 100,
    autoSubmit: true
  },
  
  // File operations configuration
  fileOps: {
    maxReadSizeBytes: 10 * 1024 * 1024
  },
  
  // Execution configuration
  execution: {
    shell: 'bash'
  },
  
  // Logger configuration
  logger: {
    level: 'info',
    timestamps: true,
    colors: true
  },
  
  // Claude 4 specific configuration
  claude4: {
    vision: false,
    visionEnhancements: { detail: 'low' as const },
    preferredModel: 'claude-4-sonnet-20240229',
    fallbackModel: 'claude-3-5-sonnet-20241022'
  },
  
  // Security configuration
  security: {
    sandbox: {
      enabled: false,
      mode: 'restricted' as const,
      allowedCommands: [],
      deniedCommands: [],
      readOnlyFilesystem: false,
      allowedPaths: [],
      allowedNetworkHosts: [],
      resourceLimits: {}
    },
    permissions: {
      allowFileWrite: true,
      allowCommandExecution: true,
      allowNetwork: true,
      promptForDangerousOperations: true
    }
  },
  
  // Claude optimized configuration
  claude: {
    conversation: {
      enableAdvancedReasoning: true,
      useContextCompression: true,
      enableStreamingWithThinking: true,
      maxContextLength: 200000,
      enableMultimodalProcessing: true,
      enableCanvasMode: true,
      persistConversationState: true,
      autoSaveCheckpoints: true,
      checkpointInterval: 10
    },
    ui: {
      defaultInterfaceMode: 'chat' as const,
      densityMode: 'normal' as const,
      enableProgressiveDisclosure: true,
      enableAdaptiveUI: true,
      enableStreamingIndicators: true,
      showThinkingBlocks: true,
      enableWorkflowOrchestration: true,
      theme: {
        colorScheme: 'auto' as const,
        accentColor: '#007acc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        enableAnimations: true,
        enableGradients: true
      },
      accessibility: {
        enableScreenReaderSupport: false,
        enableKeyboardNavigation: true,
        enableHighContrast: false,
        reduceMotion: false,
        enableVoiceAnnouncements: false
      }
    },
    performance: {
      enableParallelProcessing: true,
      maxConcurrentOperations: 5,
      enableResponseCaching: true,
      cacheTTL: 300000,
      enableStreamingOptimizations: true,
      streamingChunkSize: 1024,
      enableMemoryOptimization: true,
      gcThreshold: 100,
      enablePerformanceMonitoring: true,
      metricsInterval: 30000
    },
    context: {
      enableAutoContextLoading: true,
      discoveryPatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      maxContextFileSize: 1000000,
      enableHierarchicalLoading: true,
      precedenceRules: [],
      enableSmartFiltering: true,
      filteringRules: {
        includePatterns: [],
        excludePatterns: ['node_modules/**', 'dist/**', 'build/**'],
        respectGitIgnore: true,
        respectVibexIgnore: true
      },
      enableContextCompression: true,
      compressionRatio: 0.8
    },
    features: {
      workflowOrchestration: {
        enableRealTimeOrchestration: true,
        enableWorkflowTemplates: true,
        enableWorkflowSharing: false,
        maxConcurrentWorkflows: 3,
        enableWorkflowMetrics: true
      },
      multimodalContent: {
        enableImageAnalysis: true,
        enableAudioTranscription: false,
        enableVideoAnalysis: false,
        enableDocumentExtraction: true,
        maxFileSize: 10485760,
        supportedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf']
      },
      collaboration: {
        enableRealTimeCollaboration: false,
        enableSharedWorkspaces: false,
        enableConversationSharing: false,
        maxCollaborators: 5
      },
      toolExecution: {
        enableRealTimeToolFeedback: true,
        enableToolExecutionHistory: true,
        enableToolPerformanceMetrics: true,
        enableToolSuggestions: true,
        enableBatchToolExecution: true
      },
      atCommandProcessing: {
        enableSmartFileInjection: true,
        enableContentAnalysis: true,
        enableQueryPreprocessing: true,
        maxFilesPerCommand: 50,
        enableFileValidation: true
      }
    },
    model: 'claude-sonnet-4-20250514',
    version: '1.0.0',
    lastUpdated: new Date().toISOString()
  },
  
  // Modern UI configuration (enhanced)
  modernUI: {
    defaultInterfaceMode: 'streaming' as const,
    densityMode: 'normal' as const,
    enableProgressiveDisclosure: true,
    enableAdaptiveUI: true,
    enableStreamingIndicators: true,
    showThinkingBlocks: true,
    enableWorkflowOrchestration: true,
    interfaceModes: {},
    advancedTheme: {},
    accessibility: {},
    layout: {},
    globalPreferences: {
      autoSave: true,
      syncSettings: false,
      autoReset: true,
      enableAnalytics: false,
      enableSuggestions: true
    },
    configVersion: '1.0.0',
    lastModified: new Date().toISOString()
  },
  
  // Performance configuration
  performance: {
    enableParallelProcessing: true,
    maxConcurrentOperations: 5,
    enableResponseCaching: true,
    cacheTTL: 300000,
    enableStreamingOptimizations: true,
    streamingChunkSize: 1024,
    enableMemoryOptimization: true,
    gcThreshold: 100,
    enablePerformanceMonitoring: true,
    metricsInterval: 30000
  },
  
  // UI configuration (basic)
  ui: {
    defaultInterfaceMode: 'chat' as const,
    densityMode: 'normal' as const,
    enableProgressiveDisclosure: true,
    enableAdaptiveUI: true,
    enableStreamingIndicators: true,
    showThinkingBlocks: true,
    enableWorkflowOrchestration: true,
    theme: {
      colorScheme: 'auto' as const,
      accentColor: '#007acc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      enableAnimations: true,
      enableGradients: true
    },
    accessibility: {
      enableScreenReaderSupport: false,
      enableKeyboardNavigation: true,
      enableHighContrast: false,
      reduceMotion: false,
      enableVoiceAnnouncements: false
    }
  },
  
  // Integration metadata
  integration: {
    version: '1.0.0',
    lastIntegrated: new Date().toISOString(),
    activeOptimizations: [],
    performanceMetrics: {
      configLoadTime: 0,
      memoryUsage: 0,
      optimizationCount: 0
    }
  }
};