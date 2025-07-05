/**
 * Claude Integration Configuration
 * 
 * Provides specialized configuration handling for Claude AI integration
 * with VibeX CLI, including optimized settings for different use cases.
 */

import { logger } from '../utils/logger.js';
import type { AppConfigType } from './schema.js';
import type { 
  ClaudeOptimizedConfig,
  ClaudeConversationConfig,
  PerformanceConfig,
  IntelligentContextConfig,
  AdvancedFeatureConfig
} from './claude-optimized-config.js';
import type { ModernUIConfig } from './modern-ui-config.js';

/**
 * Integrated configuration interface
 */
export interface IntegratedConfig {
  claude?: ClaudeOptimizedConfig;
  modernUI?: AppConfigType['modernUI'];
  performance?: PerformanceConfig;
  ui?: ModernUIConfig;
  integration?: AppConfigType['integration'];
}

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Create an integrated Claude configuration
 * 
 * @param baseConfig - Base integrated configuration
 * @param overrides - Optional configuration overrides
 * @returns Optimized Claude configuration
 */
export function createIntegratedClaudeConfig(
  baseConfig: IntegratedConfig,
  overrides: Partial<ClaudeOptimizedConfig> = {}
): ClaudeOptimizedConfig {
  // Create basic configuration from the base
  const optimized: ClaudeOptimizedConfig = {
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
      maxConcurrentOperations: 3,
      enableResponseCaching: true,
      cacheTTL: 300000,
      enableStreamingOptimizations: true,
      streamingChunkSize: 1024,
      enableMemoryOptimization: true,
      gcThreshold: 50,
      enablePerformanceMonitoring: false,
      metricsInterval: 5000
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
      compressionRatio: 0.7
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
    version: '1.0.0',
    lastUpdated: new Date()
  };

  // Set default model
  optimized.model = 'claude-sonnet-4-20250514';

  // Merge with base config if claude config exists
  if (baseConfig.claude) {
    Object.assign(optimized, baseConfig.claude);
  }

  // Apply overrides
  Object.assign(optimized, overrides);

  return optimized;
}

/**
 * Validate Claude integration configuration
 * 
 * @param config - Configuration to validate
 * @returns Validation result with errors and warnings
 */
export function validateClaudeIntegration(config: IntegratedConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate claude config exists
  if (!config.claude) {
    errors.push('Claude configuration is missing');
    return { isValid: false, errors, warnings };
  }

  // Validate conversation settings
  if (config.claude.conversation) {
    if (config.claude.conversation.maxContextLength > 300000) {
      warnings.push('Very large context length may impact performance');
    }
  }

  // Validate performance settings
  if (config.claude.performance) {
    if (config.claude.performance.maxConcurrentOperations > 10) {
      warnings.push('High concurrent operations may impact performance');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Load Claude integration configuration from app config
 * 
 * @param appConfig - Application configuration
 * @returns Claude optimized configuration
 */
export function loadClaudeConfigFromApp(appConfig: AppConfigType): ClaudeOptimizedConfig {
  const integratedConfig: IntegratedConfig = {
    claude: appConfig.claude,
    modernUI: appConfig.modernUI,
    performance: appConfig.performance,
    ui: appConfig.ui,
    integration: appConfig.integration
  };

  return createIntegratedClaudeConfig(integratedConfig);
}

/**
 * Export types for external use
 */
export type {
  ClaudeOptimizedConfig,
  ClaudeConversationConfig,
  PerformanceConfig,
  IntelligentContextConfig,
  AdvancedFeatureConfig,
  ModernUIConfig,
  ValidationResult
}; 