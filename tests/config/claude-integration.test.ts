/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createIntegratedClaudeConfig, validateClaudeIntegration, loadClaudeConfigFromApp } from '../../src/config/claude-integration.js';
import { ClaudeOptimizedConfigManager } from '../../src/config/claude-optimized-config.js';
import { EnhancedModernUIConfigManager } from '../../src/config/enhanced-modern-ui-config.js';
import { loadConfig } from '../../src/config/index.js';

describe('Claude Integration Configuration', () => {
  let configManager: ClaudeOptimizedConfigManager;
  let uiConfigManager: EnhancedModernUIConfigManager;

  beforeEach(() => {
    configManager = new ClaudeOptimizedConfigManager();
    uiConfigManager = new EnhancedModernUIConfigManager();
  });

  describe('createIntegratedClaudeConfig', () => {
    test('should create integrated configuration successfully', () => {
      const baseConfig = {
        claude: undefined,
        modernUI: undefined,
        performance: undefined,
        ui: undefined,
        integration: undefined
      };
      
      const config = createIntegratedClaudeConfig(baseConfig);
      
      expect(config).toBeDefined();
      expect(config.conversation).toBeDefined();
      expect(config.conversation.maxContextLength).toBe(200000);
      expect(config.conversation.enableAdvancedReasoning).toBe(true);
    });

    test('should have Claude-optimized conversation settings', () => {
      const baseConfig = {
        claude: undefined,
        modernUI: undefined,
        performance: undefined,
        ui: undefined,
        integration: undefined
      };
      
      const config = createIntegratedClaudeConfig(baseConfig);
      
      expect(config.conversation.enableStreamingWithThinking).toBe(true);
      expect(config.conversation.enableMultimodalProcessing).toBe(true);
      expect(config.conversation.enableCanvasMode).toBe(true);
    });

    test('should have modern UI configuration', () => {
      const baseConfig = {
        claude: undefined,
        modernUI: undefined,
        performance: undefined,
        ui: undefined,
        integration: undefined
      };
      
      const config = createIntegratedClaudeConfig(baseConfig);
      
      expect(config.ui).toBeDefined();
      expect(config.ui.theme).toBeDefined();
      expect(config.ui.defaultInterfaceMode).toBe('chat');
    });

    test('should apply overrides correctly', () => {
      const baseConfig = {
        claude: undefined,
        modernUI: undefined,
        performance: undefined,
        ui: undefined,
        integration: undefined
      };
      
      const overrides: Partial<any> = {
        conversation: {
          enableAdvancedReasoning: false,
          maxContextLength: 100000
        }
      };
      
      const config = createIntegratedClaudeConfig(baseConfig, overrides);
      
      expect(config.conversation.enableAdvancedReasoning).toBe(false);
      expect(config.conversation.maxContextLength).toBe(100000);
    });
  });

  describe('validateClaudeIntegration', () => {
    test('should validate configuration with claude config', () => {
      const config = {
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
              fontFamily: 'system-ui',
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
            discoveryPatterns: ['**/*.ts'],
            maxContextFileSize: 1000000,
            enableHierarchicalLoading: true,
            precedenceRules: [],
            enableSmartFiltering: true,
            filteringRules: {
              includePatterns: [],
              excludePatterns: ['node_modules/**'],
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
              supportedFormats: ['png', 'jpg']
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
        }
      };
      
      const validation = validateClaudeIntegration(config);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should fail validation without claude config', () => {
      const config = {
        claude: undefined
      };
      
      const validation = validateClaudeIntegration(config);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Claude configuration is missing');
    });
  });

  describe('ClaudeOptimizedConfigManager', () => {
    test('should create manager and get current config', () => {
      const config = configManager.getConfig();
      
      expect(config).toBeDefined();
      expect(config.conversation).toBeDefined();
      expect(config.ui).toBeDefined();
      expect(config.performance).toBeDefined();
    });

    test('should validate configuration successfully', () => {
      const validation = configManager.validateConfig();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should export and import configuration', async () => {
      const exported = configManager.exportConfig();
      expect(typeof exported).toBe('string');
      
      // Should not throw
      await configManager.importConfig(exported);
    });

    test('should get optimized performance settings', () => {
      const optimizedSettings = configManager.getOptimizedPerformanceSettings();
      
      expect(optimizedSettings).toBeDefined();
      expect(typeof optimizedSettings.maxConcurrentOperations).toBe('number');
      expect(typeof optimizedSettings.streamingChunkSize).toBe('number');
    });
  });

  describe('Configuration Integration with App Config', () => {
    test('should load configuration from app config', async () => {
      const appConfig = await loadConfig();
      const claudeConfig = loadClaudeConfigFromApp(appConfig);
      
      expect(claudeConfig).toBeDefined();
      expect(claudeConfig.conversation).toBeDefined();
      expect(claudeConfig.conversation.maxContextLength).toBe(200000);
    });

    test('should load configuration without errors', async () => {
      // This should not throw an error
      const appConfig = await loadConfig();
      expect(appConfig).toBeDefined();
      expect(typeof appConfig).toBe('object');
    });

    test('should handle configuration errors gracefully', async () => {
      // This should not throw an error
      const appConfig = await loadConfig();
      const claudeConfig = loadClaudeConfigFromApp(appConfig);
      expect(claudeConfig).toBeDefined();
    });
  });
}); 