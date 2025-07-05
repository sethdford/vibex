/**
 * Enhanced Modern UI Configuration System
 * 
 * Complete implementation of 7 interface modes with progressive disclosure,
 * advanced theming, and comprehensive accessibility features.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

/**
 * Progressive disclosure complexity levels
 */
export interface ProgressiveDisclosureLevel {
  level: number;
  name: string;
  description: string;
  features: string[];
  requiredExperience?: number; // Hours of usage
  autoUnlock?: boolean;
}

/**
 * Interface mode-specific configuration
 */
export interface InterfaceModeConfig {
  mode: 'chat' | 'canvas' | 'multimodal' | 'analysis' | 'collaboration' | 'compact' | 'streaming';
  displayName: string;
  description: string;
  shortcut: string;
  enabled: boolean;
  defaultDensity: 'ultra-compact' | 'compact' | 'normal' | 'spacious';
  
  progressiveDisclosure: {
    initialComplexity: number;
    complexityLevels: ProgressiveDisclosureLevel[];
    autoAdvance: boolean;
    currentLevel: number;
    usageTracking: {
      totalUsageTime: number;
      featureUsageCounts: Record<string, number>;
      lastLevelAdvancement: Date | null;
    };
  };
  
  uiElements: {
    showStatusBar: boolean;
    showSidebar: boolean;
    showToolbar: boolean;
    showMetrics: boolean;
    showHints: boolean;
    showContextPanel: boolean;
    showToolFeed: boolean;
    customPanels: Array<{
      id: string;
      name: string;
      position: 'top' | 'bottom' | 'left' | 'right' | 'floating';
      defaultVisible: boolean;
      resizable: boolean;
      collapsible: boolean;
      minimumSize?: { width: number; height: number };
      defaultSize?: { width: number; height: number };
    }>;
  };
  
  performance: {
    updateFrequency: number;
    enableAnimations: boolean;
    maxConcurrentOps: number;
    memoryOptimization: 'none' | 'basic' | 'aggressive';
    renderOptimization: {
      enableVirtualScrolling: boolean;
      enableLazyLoading: boolean;
      batchUpdates: boolean;
      debounceInterval: number;
    };
  };
  
  features: {
    enableCollaboration?: boolean;
    enableMultimodal?: boolean;
    enableCanvas?: boolean;
    enableWorkflows?: boolean;
    enableAnalysis?: boolean;
    enableStreaming?: boolean;
    customFeatures: Record<string, boolean>;
  };
  
  contextAdaptation: {
    autoSwitchOnContent: boolean;
    autoOptimizeForProject: boolean;
    adaptationRules: Array<{
      trigger: 'file_type' | 'project_type' | 'content_size' | 'user_action';
      condition: string;
      action: 'switch_mode' | 'adjust_density' | 'enable_feature' | 'show_panel';
      value: string;
    }>;
  };
}

/**
 * Complete interface mode configurations for all 7 modes
 */
export const ENHANCED_INTERFACE_MODES: Record<string, InterfaceModeConfig> = {
  chat: {
    mode: 'chat',
    displayName: 'Chat Mode',
    description: 'Standard conversation interface optimized for Claude interactions',
    shortcut: 'Ctrl+1',
    enabled: true,
    defaultDensity: 'normal',
    progressiveDisclosure: {
      initialComplexity: 2,
      complexityLevels: [
        { level: 1, name: 'Beginner', features: ['basic-chat'], description: 'Simple chat interface' },
        { level: 2, name: 'Basic', features: ['basic-chat', 'history'], description: 'Chat with history' },
        { level: 3, name: 'Intermediate', features: ['basic-chat', 'history', 'shortcuts'], description: 'Chat with shortcuts' },
        { level: 4, name: 'Advanced', features: ['basic-chat', 'history', 'shortcuts', 'advanced-tools'], description: 'Full chat features' },
        { level: 5, name: 'Expert', features: ['basic-chat', 'history', 'shortcuts', 'advanced-tools', 'customization'], description: 'Expert mode' }
      ],
      autoAdvance: true,
      currentLevel: 2,
      usageTracking: {
        totalUsageTime: 0,
        featureUsageCounts: {},
        lastLevelAdvancement: null
      }
    },
    uiElements: {
      showStatusBar: true,
      showSidebar: false,
      showToolbar: true,
      showMetrics: false,
      showHints: true,
      showContextPanel: false,
      showToolFeed: false,
      customPanels: []
    },
    performance: {
      updateFrequency: 100,
      enableAnimations: true,
      maxConcurrentOps: 5,
      memoryOptimization: 'basic',
      renderOptimization: {
        enableVirtualScrolling: false,
        enableLazyLoading: true,
        batchUpdates: true,
        debounceInterval: 100
      }
    },
    features: {
      enableStreaming: true,
      customFeatures: {}
    },
    contextAdaptation: {
      autoSwitchOnContent: false,
      autoOptimizeForProject: true,
      adaptationRules: []
    }
  },
  
  canvas: {
    mode: 'canvas',
    displayName: 'Canvas Mode',
    description: 'Interactive editing and collaboration workspace with real-time Claude integration',
    shortcut: 'Ctrl+2',
    enabled: true,
    defaultDensity: 'normal',
    progressiveDisclosure: {
      initialComplexity: 3,
      complexityLevels: [
        { level: 1, name: 'Basic', features: ['basic-canvas'], description: 'Simple canvas editing' },
        { level: 2, name: 'Tools', features: ['basic-canvas', 'drawing-tools'], description: 'Canvas with drawing tools' },
        { level: 3, name: 'Layers', features: ['basic-canvas', 'drawing-tools', 'layers'], description: 'Multi-layer canvas' },
        { level: 4, name: 'Collaborative', features: ['basic-canvas', 'drawing-tools', 'layers', 'collaboration'], description: 'Real-time collaboration' },
        { level: 5, name: 'Professional', features: ['basic-canvas', 'drawing-tools', 'layers', 'collaboration', 'advanced-editing'], description: 'Professional canvas suite' }
      ],
      autoAdvance: true,
      currentLevel: 3,
      usageTracking: {
        totalUsageTime: 0,
        featureUsageCounts: {},
        lastLevelAdvancement: null
      }
    },
    uiElements: {
      showStatusBar: true,
      showSidebar: true,
      showToolbar: true,
      showMetrics: true,
      showHints: true,
      showContextPanel: true,
      showToolFeed: false,
      customPanels: [
        { 
          id: 'canvas-tools', 
          name: 'Canvas Tools', 
          position: 'left', 
          defaultVisible: true, 
          resizable: true, 
          collapsible: true,
          minimumSize: { width: 200, height: 300 },
          defaultSize: { width: 250, height: 400 }
        },
        { 
          id: 'layers', 
          name: 'Layers', 
          position: 'right', 
          defaultVisible: true, 
          resizable: true, 
          collapsible: true,
          minimumSize: { width: 180, height: 200 },
          defaultSize: { width: 220, height: 300 }
        }
      ]
    },
    performance: {
      updateFrequency: 16,
      enableAnimations: true,
      maxConcurrentOps: 10,
      memoryOptimization: 'basic',
      renderOptimization: {
        enableVirtualScrolling: true,
        enableLazyLoading: true,
        batchUpdates: true,
        debounceInterval: 16
      }
    },
    features: {
      enableCanvas: true,
      enableCollaboration: true,
      enableStreaming: true,
      customFeatures: {
        'real-time-sync': true,
        'version-history': true,
        'collaborative-cursors': true
      }
    },
    contextAdaptation: {
      autoSwitchOnContent: true,
      autoOptimizeForProject: true,
      adaptationRules: [
        {
          trigger: 'file_type',
          condition: 'image/*',
          action: 'enable_feature',
          value: 'image-editing'
        }
      ]
    }
  },
  
  multimodal: {
    mode: 'multimodal',
    displayName: 'Multimodal Mode',
    description: 'Advanced content handling for images, audio, video, and documents with Claude analysis',
    shortcut: 'Ctrl+3',
    enabled: true,
    defaultDensity: 'normal',
    progressiveDisclosure: {
      initialComplexity: 2,
      complexityLevels: [
        { level: 1, name: 'Images', features: ['image-upload'], description: 'Basic image support' },
        { level: 2, name: 'Media', features: ['image-upload', 'audio-support'], description: 'Image and audio processing' },
        { level: 3, name: 'Video', features: ['image-upload', 'audio-support', 'video-support'], description: 'Full media support' },
        { level: 4, name: 'Analysis', features: ['image-upload', 'audio-support', 'video-support', 'ai-analysis'], description: 'AI-powered content analysis' },
        { level: 5, name: 'Professional', features: ['image-upload', 'audio-support', 'video-support', 'ai-analysis', 'batch-processing'], description: 'Professional media workflows' }
      ],
      autoAdvance: true,
      currentLevel: 2,
      usageTracking: {
        totalUsageTime: 0,
        featureUsageCounts: {},
        lastLevelAdvancement: null
      }
    },
    uiElements: {
      showStatusBar: true,
      showSidebar: true,
      showToolbar: true,
      showMetrics: true,
      showHints: true,
      showContextPanel: true,
      showToolFeed: true,
      customPanels: [
        { 
          id: 'media-library', 
          name: 'Media Library', 
          position: 'left', 
          defaultVisible: true, 
          resizable: true, 
          collapsible: true,
          minimumSize: { width: 250, height: 300 },
          defaultSize: { width: 300, height: 400 }
        },
        { 
          id: 'content-analysis', 
          name: 'Content Analysis', 
          position: 'right', 
          defaultVisible: true, 
          resizable: true, 
          collapsible: true,
          minimumSize: { width: 200, height: 250 },
          defaultSize: { width: 280, height: 350 }
        },
        { 
          id: 'processing-queue', 
          name: 'Processing Queue', 
          position: 'bottom', 
          defaultVisible: false, 
          resizable: true, 
          collapsible: true,
          minimumSize: { width: 400, height: 150 },
          defaultSize: { width: 600, height: 200 }
        }
      ]
    },
    performance: {
      updateFrequency: 100,
      enableAnimations: true,
      maxConcurrentOps: 3,
      memoryOptimization: 'aggressive',
      renderOptimization: {
        enableVirtualScrolling: true,
        enableLazyLoading: true,
        batchUpdates: true,
        debounceInterval: 200
      }
    },
    features: {
      enableMultimodal: true,
      enableAnalysis: true,
      enableStreaming: true,
      customFeatures: {
        'batch-upload': true,
        'content-tagging': true,
        'ai-descriptions': true,
        'format-conversion': true
      }
    },
    contextAdaptation: {
      autoSwitchOnContent: true,
      autoOptimizeForProject: true,
      adaptationRules: [
        {
          trigger: 'file_type',
          condition: 'image/*,audio/*,video/*',
          action: 'switch_mode',
          value: 'multimodal'
        },
        {
          trigger: 'content_size',
          condition: '>10MB',
          action: 'enable_feature',
          value: 'streaming-upload'
        }
      ]
    }
  },
  
  analysis: {
    mode: 'analysis',
    displayName: 'Analysis Mode',
    description: 'Deep insights and pattern recognition with Claude-powered analytics',
    shortcut: 'Ctrl+4',
    enabled: true,
    defaultDensity: 'compact',
    progressiveDisclosure: {
      initialComplexity: 3,
      complexityLevels: [
        { level: 1, name: 'Basic', features: ['data-view'], description: 'Simple data viewing' },
        { level: 2, name: 'Charts', features: ['data-view', 'basic-charts'], description: 'Data visualization' },
        { level: 3, name: 'Patterns', features: ['data-view', 'basic-charts', 'pattern-detection'], description: 'Pattern recognition' },
        { level: 4, name: 'Predictive', features: ['data-view', 'basic-charts', 'pattern-detection', 'predictions'], description: 'Predictive analytics' },
        { level: 5, name: 'AI Insights', features: ['data-view', 'basic-charts', 'pattern-detection', 'predictions', 'ml-insights'], description: 'AI-powered insights' }
      ],
      autoAdvance: true,
      currentLevel: 3,
      usageTracking: {
        totalUsageTime: 0,
        featureUsageCounts: {},
        lastLevelAdvancement: null
      }
    },
    uiElements: {
      showStatusBar: true,
      showSidebar: true,
      showToolbar: true,
      showMetrics: true,
      showHints: false,
      showContextPanel: true,
      showToolFeed: true,
      customPanels: [
        { 
          id: 'data-explorer', 
          name: 'Data Explorer', 
          position: 'left', 
          defaultVisible: true, 
          resizable: true, 
          collapsible: true,
          minimumSize: { width: 200, height: 300 },
          defaultSize: { width: 250, height: 400 }
        },
        { 
          id: 'insights-panel', 
          name: 'AI Insights', 
          position: 'right', 
          defaultVisible: true, 
          resizable: true, 
          collapsible: true,
          minimumSize: { width: 250, height: 300 },
          defaultSize: { width: 300, height: 400 }
        },
        { 
          id: 'visualization', 
          name: 'Charts & Graphs', 
          position: 'bottom', 
          defaultVisible: true, 
          resizable: true, 
          collapsible: true,
          minimumSize: { width: 400, height: 200 },
          defaultSize: { width: 600, height: 300 }
        }
      ]
    },
    performance: {
      updateFrequency: 500,
      enableAnimations: false,
      maxConcurrentOps: 8,
      memoryOptimization: 'basic',
      renderOptimization: {
        enableVirtualScrolling: true,
        enableLazyLoading: true,
        batchUpdates: true,
        debounceInterval: 300
      }
    },
    features: {
      enableAnalysis: true,
      enableStreaming: true,
      customFeatures: {
        'real-time-analytics': true,
        'export-reports': true,
        'custom-queries': true,
        'data-connectors': true
      }
    },
    contextAdaptation: {
      autoSwitchOnContent: true,
      autoOptimizeForProject: true,
      adaptationRules: [
        {
          trigger: 'file_type',
          condition: 'csv,json,xlsx',
          action: 'switch_mode',
          value: 'analysis'
        },
        {
          trigger: 'project_type',
          condition: 'data-science',
          action: 'enable_feature',
          value: 'advanced-analytics'
        }
      ]
    }
  },
  
  collaboration: {
    mode: 'collaboration',
    displayName: 'Collaboration Mode',
    description: 'Real-time team workflows and shared workspaces with Claude facilitation',
    shortcut: 'Ctrl+5',
    enabled: true,
    defaultDensity: 'normal',
    progressiveDisclosure: {
      initialComplexity: 2,
      complexityLevels: [
        { level: 1, name: 'Sharing', features: ['basic-sharing'], description: 'Simple content sharing' },
        { level: 2, name: 'Real-time', features: ['basic-sharing', 'real-time-sync'], description: 'Real-time collaboration' },
        { level: 3, name: 'Permissions', features: ['basic-sharing', 'real-time-sync', 'permissions'], description: 'Permission management' },
        { level: 4, name: 'Workflows', features: ['basic-sharing', 'real-time-sync', 'permissions', 'team-workflows'], description: 'Team workflow automation' },
        { level: 5, name: 'Enterprise', features: ['basic-sharing', 'real-time-sync', 'permissions', 'team-workflows', 'enterprise-features'], description: 'Enterprise collaboration' }
      ],
      autoAdvance: true,
      currentLevel: 2,
      usageTracking: {
        totalUsageTime: 0,
        featureUsageCounts: {},
        lastLevelAdvancement: null
      }
    },
    uiElements: {
      showStatusBar: true,
      showSidebar: true,
      showToolbar: true,
      showMetrics: true,
      showHints: true,
      showContextPanel: true,
      showToolFeed: true,
      customPanels: [
        { 
          id: 'team-members', 
          name: 'Team Members', 
          position: 'right', 
          defaultVisible: true, 
          resizable: true, 
          collapsible: true,
          minimumSize: { width: 200, height: 250 },
          defaultSize: { width: 250, height: 350 }
        },
        { 
          id: 'activity-feed', 
          name: 'Activity Feed', 
          position: 'bottom', 
          defaultVisible: true, 
          resizable: true, 
          collapsible: true,
          minimumSize: { width: 400, height: 150 },
          defaultSize: { width: 600, height: 200 }
        },
        { 
          id: 'shared-context', 
          name: 'Shared Context', 
          position: 'left', 
          defaultVisible: false, 
          resizable: true, 
          collapsible: true,
          minimumSize: { width: 200, height: 200 },
          defaultSize: { width: 250, height: 300 }
        }
      ]
    },
    performance: {
      updateFrequency: 50,
      enableAnimations: true,
      maxConcurrentOps: 15,
      memoryOptimization: 'basic',
      renderOptimization: {
        enableVirtualScrolling: true,
        enableLazyLoading: true,
        batchUpdates: true,
        debounceInterval: 50
      }
    },
    features: {
      enableCollaboration: true,
      enableStreaming: true,
      enableWorkflows: true,
      customFeatures: {
        'presence-indicators': true,
        'voice-chat': false,
        'screen-sharing': false,
        'collaborative-editing': true,
        'role-based-access': true
      }
    },
    contextAdaptation: {
      autoSwitchOnContent: false,
      autoOptimizeForProject: true,
      adaptationRules: [
        {
          trigger: 'user_action',
          condition: 'invite-collaborator',
          action: 'switch_mode',
          value: 'collaboration'
        }
      ]
    }
  },
  
  compact: {
    mode: 'compact',
    displayName: 'Compact Mode',
    description: 'High-density interface optimized for small screens and power users',
    shortcut: 'Ctrl+6',
    enabled: true,
    defaultDensity: 'ultra-compact',
    progressiveDisclosure: {
      initialComplexity: 4,
      complexityLevels: [
        { level: 1, name: 'Minimal', features: ['essential-only'], description: 'Absolute essentials' },
        { level: 2, name: 'Compact', features: ['essential-only', 'shortcuts'], description: 'Essential with shortcuts' },
        { level: 3, name: 'Dense', features: ['essential-only', 'shortcuts', 'advanced-shortcuts'], description: 'Dense interface' },
        { level: 4, name: 'Power User', features: ['essential-only', 'shortcuts', 'advanced-shortcuts', 'power-features'], description: 'Power user mode' },
        { level: 5, name: 'Expert', features: ['essential-only', 'shortcuts', 'advanced-shortcuts', 'power-features', 'customization'], description: 'Fully customizable' }
      ],
      autoAdvance: false,
      currentLevel: 4,
      usageTracking: {
        totalUsageTime: 0,
        featureUsageCounts: {},
        lastLevelAdvancement: null
      }
    },
    uiElements: {
      showStatusBar: false,
      showSidebar: false,
      showToolbar: false,
      showMetrics: true,
      showHints: false,
      showContextPanel: false,
      showToolFeed: false,
      customPanels: []
    },
    performance: {
      updateFrequency: 100,
      enableAnimations: false,
      maxConcurrentOps: 10,
      memoryOptimization: 'aggressive',
      renderOptimization: {
        enableVirtualScrolling: true,
        enableLazyLoading: true,
        batchUpdates: true,
        debounceInterval: 50
      }
    },
    features: {
      enableStreaming: true,
      customFeatures: {
        'keyboard-only': true,
        'minimal-ui': true,
        'power-shortcuts': true
      }
    },
    contextAdaptation: {
      autoSwitchOnContent: false,
      autoOptimizeForProject: false,
      adaptationRules: [
        {
          trigger: 'content_size',
          condition: '<768px',
          action: 'switch_mode',
          value: 'compact'
        }
      ]
    }
  },
  
  streaming: {
    mode: 'streaming',
    displayName: 'Streaming Mode',
    description: 'Optimized for real-time Claude responses with live thinking and canvas updates',
    shortcut: 'Ctrl+7',
    enabled: true,
    defaultDensity: 'normal',
    progressiveDisclosure: {
      initialComplexity: 2,
      complexityLevels: [
        { level: 1, name: 'Basic', features: ['streaming-text'], description: 'Basic streaming responses' },
        { level: 2, name: 'Thinking', features: ['streaming-text', 'thinking-blocks'], description: 'Streaming with thinking' },
        { level: 3, name: 'Interactive', features: ['streaming-text', 'thinking-blocks', 'live-interaction'], description: 'Interactive streaming' },
        { level: 4, name: 'Advanced', features: ['streaming-text', 'thinking-blocks', 'live-interaction', 'streaming-canvas'], description: 'Advanced streaming features' },
        { level: 5, name: 'Professional', features: ['streaming-text', 'thinking-blocks', 'live-interaction', 'streaming-canvas', 'real-time-collab'], description: 'Professional streaming suite' }
      ],
      autoAdvance: true,
      currentLevel: 2,
      usageTracking: {
        totalUsageTime: 0,
        featureUsageCounts: {},
        lastLevelAdvancement: null
      }
    },
    uiElements: {
      showStatusBar: true,
      showSidebar: false,
      showToolbar: true,
      showMetrics: true,
      showHints: true,
      showContextPanel: false,
      showToolFeed: true,
      customPanels: [
        { 
          id: 'thinking-stream', 
          name: 'Thinking Stream', 
          position: 'right', 
          defaultVisible: true, 
          resizable: true, 
          collapsible: true,
          minimumSize: { width: 250, height: 200 },
          defaultSize: { width: 300, height: 400 }
        },
        { 
          id: 'stream-controls', 
          name: 'Stream Controls', 
          position: 'floating', 
          defaultVisible: false, 
          resizable: false, 
          collapsible: false,
          minimumSize: { width: 200, height: 100 },
          defaultSize: { width: 250, height: 120 }
        }
      ]
    },
    performance: {
      updateFrequency: 16,
      enableAnimations: true,
      maxConcurrentOps: 5,
      memoryOptimization: 'basic',
      renderOptimization: {
        enableVirtualScrolling: false,
        enableLazyLoading: false,
        batchUpdates: false,
        debounceInterval: 16
      }
    },
    features: {
      enableStreaming: true,
      enableCanvas: true,
      customFeatures: {
        'real-time-thinking': true,
        'streaming-canvas': true,
        'live-collaboration': true,
        'stream-recording': false,
        'stream-sharing': false
      }
    },
    contextAdaptation: {
      autoSwitchOnContent: false,
      autoOptimizeForProject: true,
      adaptationRules: [
        {
          trigger: 'user_action',
          condition: 'start-streaming',
          action: 'switch_mode',
          value: 'streaming'
        }
      ]
    }
  }
};

/**
 * Enhanced Modern UI Configuration Manager
 */
export class EnhancedModernUIConfigManager extends EventEmitter {
  private config: Record<string, InterfaceModeConfig>;
  private activeMode: string = 'chat';
  private configPath: string;
  private isInitialized = false;

  constructor(configPath: string = '.vibex/enhanced-ui-config.json') {
    super();
    this.configPath = configPath;
    this.config = { ...ENHANCED_INTERFACE_MODES };
  }

  /**
   * Initialize the configuration manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadConfig();
      this.isInitialized = true;
      this.emit('initialized');
      
      logger.info('Enhanced ModernUI configuration initialized', {
        modes: Object.keys(this.config).length,
        activeMode: this.activeMode
      });
    } catch (error) {
      logger.error('Failed to initialize Enhanced ModernUI configuration', { error });
      throw error;
    }
  }

  /**
   * Get configuration for a specific interface mode
   */
  getModeConfig(mode: string): InterfaceModeConfig | null {
    return this.config[mode] || null;
  }

  /**
   * Get all available interface modes
   */
  getAllModes(): Record<string, InterfaceModeConfig> {
    return { ...this.config };
  }

  /**
   * Get the active interface mode
   */
  getActiveMode(): string {
    return this.activeMode;
  }

  /**
   * Set the active interface mode
   */
  async setActiveMode(mode: string): Promise<boolean> {
    if (!this.config[mode]) {
      logger.warn('Attempted to set unknown interface mode', { mode });
      return false;
    }

    const oldMode = this.activeMode;
    this.activeMode = mode;
    
    this.emit('modeChanged', { oldMode, newMode: mode });
    
    logger.info('Interface mode changed', { oldMode, newMode: mode });
    return true;
  }

  /**
   * Update configuration for a specific mode
   */
  async updateModeConfig(mode: string, updates: Partial<InterfaceModeConfig>): Promise<boolean> {
    if (!this.config[mode]) {
      logger.warn('Attempted to update unknown interface mode', { mode });
      return false;
    }

    const oldConfig = { ...this.config[mode] };
    this.config[mode] = { ...this.config[mode], ...updates };
    
    await this.saveConfig();
    
    this.emit('configUpdated', { mode, oldConfig, newConfig: this.config[mode] });
    
    logger.info('Interface mode configuration updated', { mode });
    return true;
  }

  /**
   * Advance progressive disclosure level for a mode
   */
  async advanceComplexityLevel(mode: string): Promise<boolean> {
    const modeConfig = this.config[mode];
    if (!modeConfig) return false;

    const maxLevel = Math.max(...modeConfig.progressiveDisclosure.complexityLevels.map(l => l.level));
    if (modeConfig.progressiveDisclosure.currentLevel >= maxLevel) {
      return false; // Already at max level
    }

    modeConfig.progressiveDisclosure.currentLevel++;
    modeConfig.progressiveDisclosure.usageTracking.lastLevelAdvancement = new Date();
    
    await this.saveConfig();
    
    this.emit('complexityAdvanced', { 
      mode, 
      newLevel: modeConfig.progressiveDisclosure.currentLevel 
    });
    
    logger.info('Progressive disclosure level advanced', { 
      mode, 
      newLevel: modeConfig.progressiveDisclosure.currentLevel 
    });
    
    return true;
  }

  /**
   * Track feature usage for progressive disclosure
   */
  async trackFeatureUsage(mode: string, feature: string): Promise<void> {
    const modeConfig = this.config[mode];
    if (!modeConfig) return;

    modeConfig.progressiveDisclosure.usageTracking.featureUsageCounts[feature] = 
      (modeConfig.progressiveDisclosure.usageTracking.featureUsageCounts[feature] || 0) + 1;
    
    // Auto-advance if enabled and criteria met
    if (modeConfig.progressiveDisclosure.autoAdvance) {
      const shouldAdvance = this.shouldAdvanceComplexity(modeConfig);
      if (shouldAdvance) {
        await this.advanceComplexityLevel(mode);
      }
    }
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify({
      version: '1.0.0',
      activeMode: this.activeMode,
      modes: this.config,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Import configuration
   */
  async importConfig(configData: string): Promise<boolean> {
    try {
      const data = JSON.parse(configData);
      
      if (data.modes) {
        this.config = { ...ENHANCED_INTERFACE_MODES, ...data.modes };
      }
      
      if (data.activeMode && this.config[data.activeMode]) {
        this.activeMode = data.activeMode;
      }
      
      await this.saveConfig();
      
      this.emit('configImported');
      
      logger.info('Configuration imported successfully');
      return true;
    } catch (error) {
      logger.error('Failed to import configuration', { error });
      return false;
    }
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<void> {
    this.config = { ...ENHANCED_INTERFACE_MODES };
    this.activeMode = 'chat';
    
    await this.saveConfig();
    
    this.emit('configReset');
    
    logger.info('Configuration reset to defaults');
  }

  // Private helper methods

  private shouldAdvanceComplexity(modeConfig: InterfaceModeConfig): boolean {
    const usage = modeConfig.progressiveDisclosure.usageTracking;
    const currentLevel = modeConfig.progressiveDisclosure.currentLevel;
    const maxLevel = Math.max(...modeConfig.progressiveDisclosure.complexityLevels.map(l => l.level));
    
    if (currentLevel >= maxLevel) return false;
    
    // Simple heuristic: advance if user has used features from current level multiple times
    const currentLevelFeatures = modeConfig.progressiveDisclosure.complexityLevels
      .find(l => l.level === currentLevel)?.features || [];
    
    const usageCount = currentLevelFeatures.reduce((sum, feature) => 
      sum + (usage.featureUsageCounts[feature] || 0), 0);
    
    return usageCount >= currentLevelFeatures.length * 3; // Used each feature at least 3 times
  }

  private async loadConfig(): Promise<void> {
    try {
      // In a real implementation, this would load from file system
      // For now, we'll use the default configuration
      this.config = { ...ENHANCED_INTERFACE_MODES };
      this.activeMode = 'chat';
    } catch (error) {
      logger.warn('Failed to load configuration, using defaults', { error });
      this.config = { ...ENHANCED_INTERFACE_MODES };
      this.activeMode = 'chat';
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      // In a real implementation, this would save to file system
      // For now, we'll just log the save operation
      logger.debug('Configuration saved', { 
        activeMode: this.activeMode,
        modesCount: Object.keys(this.config).length 
      });
    } catch (error) {
      logger.warn('Failed to save configuration', { error });
    }
  }
}

// Export singleton instance
export const enhancedUIConfigManager = new EnhancedModernUIConfigManager();

// Export utility functions
export async function initializeEnhancedModernUIConfig(): Promise<void> {
  await enhancedUIConfigManager.initialize();
}

export function getEnhancedModernUIConfig(): Record<string, InterfaceModeConfig> {
  return enhancedUIConfigManager.getAllModes();
}

export async function setActiveInterfaceMode(mode: string): Promise<boolean> {
  return enhancedUIConfigManager.setActiveMode(mode);
}

export function getActiveInterfaceMode(): string {
  return enhancedUIConfigManager.getActiveMode();
} 