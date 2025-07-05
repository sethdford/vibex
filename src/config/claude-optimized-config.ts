/**
 * Claude-Optimized Configuration System
 * 
 * Advanced configuration system specifically optimized for Claude 4 Sonnet
 * with features that surpass Gemini CLI capabilities.
 */

import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';
import type { ModernUIConfig } from './modern-ui-config.js';

/**
 * Claude-specific conversation optimization settings
 */
export interface ClaudeConversationConfig {
  /**
   * Enable Claude's advanced reasoning capabilities
   */
  enableAdvancedReasoning: boolean;
  
  /**
   * Use Claude's enhanced context compression
   */
  useContextCompression: boolean;
  
  /**
   * Enable streaming responses with thinking blocks
   */
  enableStreamingWithThinking: boolean;
  
  /**
   * Maximum conversation context length (Claude 4 supports up to 200K tokens)
   */
  maxContextLength: number;
  
  /**
   * Enable multimodal content processing
   */
  enableMultimodalProcessing: boolean;
  
  /**
   * Enable canvas mode for collaborative editing
   */
  enableCanvasMode: boolean;
  
  /**
   * Conversation state persistence
   */
  persistConversationState: boolean;
  
  /**
   * Auto-save conversation checkpoints
   */
  autoSaveCheckpoints: boolean;
  
  /**
   * Checkpoint interval in messages
   */
  checkpointInterval: number;
}

/**
 * Performance optimization configuration
 */
export interface PerformanceConfig {
  /**
   * Enable parallel processing
   */
  enableParallelProcessing: boolean;
  
  /**
   * Maximum concurrent operations
   */
  maxConcurrentOperations: number;
  
  /**
   * Enable response caching
   */
  enableResponseCaching: boolean;
  
  /**
   * Cache TTL in milliseconds
   */
  cacheTTL: number;
  
  /**
   * Enable streaming optimizations
   */
  enableStreamingOptimizations: boolean;
  
  /**
   * Chunk size for streaming
   */
  streamingChunkSize: number;
  
  /**
   * Enable memory optimization
   */
  enableMemoryOptimization: boolean;
  
  /**
   * Garbage collection threshold
   */
  gcThreshold: number;
  
  /**
   * Enable performance monitoring
   */
  enablePerformanceMonitoring: boolean;
  
  /**
   * Performance metrics interval
   */
  metricsInterval: number;
}

/**
 * Intelligent context management configuration
 */
export interface IntelligentContextConfig {
  /**
   * Enable auto-context loading
   */
  enableAutoContextLoading: boolean;
  
  /**
   * Context discovery patterns
   */
  discoveryPatterns: string[];
  
  /**
   * Maximum context file size
   */
  maxContextFileSize: number;
  
  /**
   * Enable hierarchical context loading
   */
  enableHierarchicalLoading: boolean;
  
  /**
   * Context precedence rules
   */
  precedenceRules: Array<{
    pattern: string;
    priority: number;
    scope: 'global' | 'project' | 'directory';
  }>;
  
  /**
   * Enable smart file filtering
   */
  enableSmartFiltering: boolean;
  
  /**
   * File filtering rules
   */
  filteringRules: {
    includePatterns: string[];
    excludePatterns: string[];
    respectGitIgnore: boolean;
    respectVibexIgnore: boolean;
  };
  
  /**
   * Enable context compression
   */
  enableContextCompression: boolean;
  
  /**
   * Context compression ratio
   */
  compressionRatio: number;
}

/**
 * Advanced feature configuration
 */
export interface AdvancedFeatureConfig {
  /**
   * Workflow orchestration settings
   */
  workflowOrchestration: {
    enableRealTimeOrchestration: boolean;
    enableWorkflowTemplates: boolean;
    enableWorkflowSharing: boolean;
    maxConcurrentWorkflows: number;
    enableWorkflowMetrics: boolean;
  };
  
  /**
   * Multimodal content settings
   */
  multimodalContent: {
    enableImageAnalysis: boolean;
    enableAudioTranscription: boolean;
    enableVideoAnalysis: boolean;
    enableDocumentExtraction: boolean;
    maxFileSize: number;
    supportedFormats: string[];
  };
  
  /**
   * Collaboration features
   */
  collaboration: {
    enableRealTimeCollaboration: boolean;
    enableSharedWorkspaces: boolean;
    enableConversationSharing: boolean;
    maxCollaborators: number;
  };
  
  /**
   * Tool execution enhancements
   */
  toolExecution: {
    enableRealTimeToolFeedback: boolean;
    enableToolExecutionHistory: boolean;
    enableToolPerformanceMetrics: boolean;
    enableToolSuggestions: boolean;
    enableBatchToolExecution: boolean;
  };
  
  /**
   * @ Command processing
   */
  atCommandProcessing: {
    enableSmartFileInjection: boolean;
    enableContentAnalysis: boolean;
    enableQueryPreprocessing: boolean;
    maxFilesPerCommand: number;
    enableFileValidation: boolean;
  };
}

/**
 * Complete Claude-optimized configuration
 */
export interface ClaudeOptimizedConfig {
  conversation: ClaudeConversationConfig;
  ui: ModernUIConfig;
  performance: PerformanceConfig;
  context: IntelligentContextConfig;
  features: AdvancedFeatureConfig;
  model?: string;
  version: string;
  lastUpdated: Date;
}

/**
 * Default configuration optimized for Claude 4 Sonnet
 */
export const DEFAULT_CLAUDE_CONFIG: ClaudeOptimizedConfig = {
  conversation: {
    enableAdvancedReasoning: true,
    useContextCompression: true,
    enableStreamingWithThinking: true,
    maxContextLength: 200000,
    enableMultimodalProcessing: true,
    enableCanvasMode: true,
    persistConversationState: true,
    autoSaveCheckpoints: true,
    checkpointInterval: 10,
  },
  ui: {
    defaultInterfaceMode: 'chat',
    densityMode: 'normal',
    enableProgressiveDisclosure: true,
    enableAdaptiveUI: true,
    enableStreamingIndicators: true,
    showThinkingBlocks: true,
    enableWorkflowOrchestration: true,
    theme: {
      colorScheme: 'auto',
      accentColor: '#3B82F6',
      fontFamily: 'SF Mono, Monaco, Consolas, monospace',
      enableAnimations: true,
      enableGradients: true,
    },
    accessibility: {
      enableScreenReaderSupport: true,
      enableKeyboardNavigation: true,
      enableHighContrast: false,
      reduceMotion: false,
      enableVoiceAnnouncements: false,
    },
  },
  performance: {
    enableParallelProcessing: true,
    maxConcurrentOperations: 4,
    enableResponseCaching: true,
    cacheTTL: 300000, // 5 minutes
    enableStreamingOptimizations: true,
    streamingChunkSize: 1024,
    enableMemoryOptimization: true,
    gcThreshold: 100 * 1024 * 1024, // 100MB
    enablePerformanceMonitoring: true,
    metricsInterval: 1000,
  },
  context: {
    enableAutoContextLoading: true,
    discoveryPatterns: [
      'VIBEX.md',
      'CLAUDE.md',
      '.vibex/**/*.md',
      'docs/**/*.md',
      'README.md',
      'CONTRIBUTING.md',
    ],
    maxContextFileSize: 1024 * 1024, // 1MB
    enableHierarchicalLoading: true,
    precedenceRules: [
      { pattern: 'VIBEX.md', priority: 100, scope: 'global' },
      { pattern: '.vibex/VIBEX.md', priority: 90, scope: 'project' },
      { pattern: './VIBEX.md', priority: 80, scope: 'directory' },
      { pattern: 'CLAUDE.md', priority: 70, scope: 'project' },
    ],
    enableSmartFiltering: true,
    filteringRules: {
      includePatterns: ['**/*.md', '**/*.txt', '**/*.json'],
      excludePatterns: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      respectGitIgnore: true,
      respectVibexIgnore: true,
    },
    enableContextCompression: true,
    compressionRatio: 0.8,
  },
  features: {
    workflowOrchestration: {
      enableRealTimeOrchestration: true,
      enableWorkflowTemplates: true,
      enableWorkflowSharing: true,
      maxConcurrentWorkflows: 3,
      enableWorkflowMetrics: true,
    },
    multimodalContent: {
      enableImageAnalysis: true,
      enableAudioTranscription: true,
      enableVideoAnalysis: true,
      enableDocumentExtraction: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      supportedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'wav', 'mp4', 'pdf', 'txt', 'md'],
    },
    collaboration: {
      enableRealTimeCollaboration: true,
      enableSharedWorkspaces: true,
      enableConversationSharing: true,
      maxCollaborators: 5,
    },
    toolExecution: {
      enableRealTimeToolFeedback: true,
      enableToolExecutionHistory: true,
      enableToolPerformanceMetrics: true,
      enableToolSuggestions: true,
      enableBatchToolExecution: true,
    },
    atCommandProcessing: {
      enableSmartFileInjection: true,
      enableContentAnalysis: true,
      enableQueryPreprocessing: true,
      maxFilesPerCommand: 20,
      enableFileValidation: true,
    },
  },
  model: 'claude-sonnet-4-20250514',
  version: '1.0.0',
  lastUpdated: new Date(),
};

/**
 * Claude-optimized configuration manager
 */
export class ClaudeOptimizedConfigManager extends EventEmitter {
  private config: ClaudeOptimizedConfig;
  private configPath: string;
  private isInitialized = false;

  constructor(configPath: string = '.vibex/config.json') {
    super();
    this.configPath = configPath;
    this.config = { ...DEFAULT_CLAUDE_CONFIG };
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      this.isInitialized = true;
      this.emit('initialized', this.config);
      
      logger.info('Claude-optimized configuration initialized', {
        version: this.config.version,
        features: {
          advancedReasoning: this.config.conversation.enableAdvancedReasoning,
          multimodal: this.config.conversation.enableMultimodalProcessing,
          canvasMode: this.config.conversation.enableCanvasMode,
          workflowOrchestration: this.config.ui.enableWorkflowOrchestration,
          parallelProcessing: this.config.performance.enableParallelProcessing,
        }
      });
    } catch (error) {
      logger.error('Failed to initialize Claude-optimized configuration', { error });
      throw error;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): ClaudeOptimizedConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<ClaudeOptimizedConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    
    this.config = {
      ...this.config,
      ...updates,
      lastUpdated: new Date(),
    };

    await this.saveConfig();
    this.emit('configUpdated', this.config, oldConfig);
    
    logger.info('Claude-optimized configuration updated', {
      changes: Object.keys(updates),
      version: this.config.version,
    });
  }

  /**
   * Get configuration for specific feature
   */
  getFeatureConfig<T extends keyof ClaudeOptimizedConfig>(feature: T): ClaudeOptimizedConfig[T] {
    return this.config[feature];
  }

  /**
   * Update feature-specific configuration
   */
  async updateFeatureConfig<T extends keyof ClaudeOptimizedConfig>(
    feature: T,
    updates: Partial<ClaudeOptimizedConfig[T]>
  ): Promise<void> {
    const featureConfig = {
      ...this.config[feature] as object,
      ...updates as object,
    };

    await this.updateConfig({ [feature]: featureConfig } as Partial<ClaudeOptimizedConfig>);
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<void> {
    this.config = { ...DEFAULT_CLAUDE_CONFIG };
    await this.saveConfig();
    this.emit('configReset', this.config);
    
    logger.info('Configuration reset to Claude-optimized defaults');
  }

  /**
   * Validate configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate conversation config
    if (this.config.conversation.maxContextLength > 200000) {
      errors.push('Max context length exceeds Claude 4 Sonnet limit (200K tokens)');
    }

    if (this.config.conversation.checkpointInterval < 1) {
      errors.push('Checkpoint interval must be at least 1 message');
    }

    // Validate performance config
    if (this.config.performance.maxConcurrentOperations < 1) {
      errors.push('Max concurrent operations must be at least 1');
    }

    if (this.config.performance.cacheTTL < 0) {
      errors.push('Cache TTL cannot be negative');
    }

    // Validate context config
    if (this.config.context.maxContextFileSize < 1024) {
      errors.push('Max context file size must be at least 1KB');
    }

    // Validate feature config
    if (this.config.features.collaboration.maxCollaborators < 1) {
      errors.push('Max collaborators must be at least 1');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  async importConfig(configData: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configData) as ClaudeOptimizedConfig;
      
      // Validate imported config
      const tempConfig = this.config;
      this.config = importedConfig;
      const validation = this.validateConfig();
      
      if (!validation.isValid) {
        this.config = tempConfig;
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      await this.saveConfig();
      this.emit('configImported', this.config);
      
      logger.info('Configuration imported successfully');
    } catch (error) {
      logger.error('Failed to import configuration', { error });
      throw error;
    }
  }

  /**
   * Get performance-optimized settings for current system
   */
  getOptimizedPerformanceSettings(): Partial<PerformanceConfig> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    
    // Optimize based on available memory
    const optimizedSettings: Partial<PerformanceConfig> = {};
    
    if (totalMemory > 1024 * 1024 * 1024) { // > 1GB
      optimizedSettings.maxConcurrentOperations = 6;
      optimizedSettings.streamingChunkSize = 2048;
      optimizedSettings.gcThreshold = 200 * 1024 * 1024; // 200MB
    } else if (totalMemory > 512 * 1024 * 1024) { // > 512MB
      optimizedSettings.maxConcurrentOperations = 4;
      optimizedSettings.streamingChunkSize = 1024;
      optimizedSettings.gcThreshold = 100 * 1024 * 1024; // 100MB
    } else {
      optimizedSettings.maxConcurrentOperations = 2;
      optimizedSettings.streamingChunkSize = 512;
      optimizedSettings.gcThreshold = 50 * 1024 * 1024; // 50MB
    }

    return optimizedSettings;
  }

  /**
   * Auto-optimize configuration based on usage patterns
   */
  async autoOptimize(): Promise<void> {
    const performanceSettings = this.getOptimizedPerformanceSettings();
    
    await this.updateFeatureConfig('performance', performanceSettings);
    
    logger.info('Configuration auto-optimized', { optimizations: performanceSettings });
  }

  // Private methods

  private async loadConfig(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const loadedConfig = JSON.parse(configData) as ClaudeOptimizedConfig;
      
      // Merge with defaults to ensure all properties exist
      this.config = {
        ...DEFAULT_CLAUDE_CONFIG,
        ...loadedConfig,
        lastUpdated: new Date(),
      };
      
      logger.debug('Configuration loaded from file', { path: this.configPath });
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, use defaults
        await this.saveConfig();
        logger.debug('Created default configuration file', { path: this.configPath });
      } else {
        logger.warn('Failed to load configuration, using defaults', { error });
      }
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      
      // Save configuration
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
      
      logger.debug('Configuration saved to file', { path: this.configPath });
    } catch (error) {
      logger.error('Failed to save configuration', { error });
    }
  }
}

// Export singleton instance
export const claudeConfigManager = new ClaudeOptimizedConfigManager(); 