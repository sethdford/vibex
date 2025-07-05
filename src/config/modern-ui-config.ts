/**
 * Modern UI Configuration - Enhanced UI modes and settings
 * 
 * Provides comprehensive configuration for Claude's modern UI system including
 * interface modes, progressive disclosure, theming, and accessibility.
 */

import { EventEmitter } from 'events';

/**
 * Progressive disclosure level definition
 */
export interface ProgressiveDisclosureLevel {
  level: number;
  name: string;
  description: string;
  features: string[];
  requiredExperience?: number;
  autoUnlock?: boolean;
}

/**
 * Basic Modern UI Configuration
 */
export interface ModernUIConfig {
  defaultInterfaceMode: 'chat' | 'canvas' | 'multimodal' | 'analysis' | 'collaboration' | 'compact' | 'streaming';
  densityMode: 'ultra-compact' | 'compact' | 'normal' | 'spacious';
  enableProgressiveDisclosure: boolean;
  enableAdaptiveUI: boolean;
  enableStreamingIndicators: boolean;
  showThinkingBlocks: boolean;
  enableWorkflowOrchestration: boolean;
  theme: {
    colorScheme: 'auto' | 'light' | 'dark' | 'high-contrast';
    accentColor: string;
    fontFamily: string;
    enableAnimations: boolean;
    enableGradients: boolean;
  };
  accessibility?: {
    enableScreenReaderSupport?: boolean;
    enableKeyboardNavigation?: boolean;
    enableHighContrast?: boolean;
    reduceMotion?: boolean;
    enableVoiceAnnouncements?: boolean;
  };
}

/**
 * Interface mode configuration
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
 * Advanced theme configuration
 */
export interface AdvancedThemeConfig {
  colorScheme: 'auto' | 'light' | 'dark' | 'high-contrast' | 'custom';
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    thinking: string;
    streaming: string;
    canvas: string;
    collaboration: string;
  };
  typography: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    fontWeight: 'normal' | 'medium' | 'bold';
    letterSpacing: number;
    codeFontFamily: string;
    codeFontSize: number;
    codeLineHeight: number;
  };
  effects: {
    enableAnimations: boolean;
    animationSpeed: 'slow' | 'normal' | 'fast';
    enableGradients: boolean;
    enableShadows: boolean;
    enableBlur: boolean;
    borderRadius: number;
    enableThinkingAnimations: boolean;
    enableStreamingEffects: boolean;
    enableCanvasTransitions: boolean;
  };
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
    ultrawide: number;
  };
  modeOverrides?: Record<string, Partial<AdvancedThemeConfig>>;
  dynamic?: {
    autoTimeOfDay: boolean;
    autoAmbientLight: boolean;
    autoContentAdaptation: boolean;
    transitionDuration: number;
  };
}

/**
 * Accessibility configuration
 */
export interface AccessibilityConfig {
  screenReader: {
    enabled: boolean;
    announceChanges: boolean;
    announceErrors: boolean;
    announceProgress: boolean;
    verbosity: 'minimal' | 'normal' | 'verbose';
  };
  keyboard: {
    enabled: boolean;
    showFocusIndicators: boolean;
    trapFocus: boolean;
    skipLinks: boolean;
    customShortcuts: Record<string, string>;
  };
  visual: {
    highContrast: boolean;
    reduceMotion: boolean;
    increaseFontSize: boolean;
    increaseLineSpacing: boolean;
    showCaptions: boolean;
    colorBlindSupport: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
  };
  motor: {
    stickyKeys: boolean;
    slowKeys: boolean;
    bounceKeys: boolean;
    mouseKeys: boolean;
    clickAssist: boolean;
    dwellClick: boolean;
    dwellTime: number;
  };
  cognitive: {
    simplifiedUI: boolean;
    consistentNavigation: boolean;
    clearLabels: boolean;
    helpText: boolean;
    confirmActions: boolean;
    timeoutWarnings: boolean;
    pauseAnimations: boolean;
  };
}

/**
 * Layout configuration
 */
export interface LayoutConfig {
  defaultLayouts: Record<string, {
    panels: Array<{
      id: string;
      position: { x: number; y: number; width: number; height: number };
      visible: boolean;
      minimized: boolean;
    }>;
    splitPanes: Array<{
      orientation: 'horizontal' | 'vertical';
      sizes: number[];
      minSizes: number[];
    }>;
  }>;
  persistence: {
    saveLayouts: boolean;
    autoRestore: boolean;
    maxSavedLayouts: number;
  };
  responsive: {
    autoCollapse: boolean;
    collapseBreakpoint: number;
    stackOnSmallScreens: boolean;
    hideSecondaryPanels: boolean;
  };
}

/**
 * Enhanced Modern UI Configuration
 */
export interface EnhancedModernUIConfig {
  defaultInterfaceMode: 'chat' | 'canvas' | 'multimodal' | 'analysis' | 'collaboration' | 'compact' | 'streaming';
  densityMode: 'ultra-compact' | 'compact' | 'normal' | 'spacious';
  enableProgressiveDisclosure: boolean;
  enableAdaptiveUI: boolean;
  enableStreamingIndicators: boolean;
  showThinkingBlocks: boolean;
  enableWorkflowOrchestration: boolean;
  theme: {
    colorScheme: 'auto' | 'light' | 'dark' | 'high-contrast';
    accentColor: string;
    fontFamily: string;
    enableAnimations: boolean;
    enableGradients: boolean;
  };
  interfaceModes: Record<string, InterfaceModeConfig>;
  advancedTheme: AdvancedThemeConfig;
  accessibility: AccessibilityConfig;
  layout: LayoutConfig;
  globalPreferences: {
    autoSave: boolean;
    syncSettings: boolean;
    autoReset: boolean;
    enableAnalytics: boolean;
    enableSuggestions: boolean;
  };
  configVersion: string;
  lastModified: Date;
}

/**
 * Create default progressive disclosure level
 */
function createProgressiveDisclosureLevel(
  level: number,
  features: string[],
  description: string,
  name?: string
): ProgressiveDisclosureLevel {
  return {
    level,
    name: name || `Level ${level}`,
    description,
    features,
    requiredExperience: level * 2,
    autoUnlock: true
  };
}

/**
 * Create default interface mode configuration
 */
function createInterfaceModeConfig(
  mode: 'chat' | 'canvas' | 'multimodal' | 'analysis' | 'collaboration' | 'compact' | 'streaming',
  displayName: string,
  description: string,
  shortcut: string
): InterfaceModeConfig {
  return {
    mode,
    displayName,
    description,
    shortcut,
    enabled: true,
    defaultDensity: 'normal',
    progressiveDisclosure: {
      initialComplexity: 2,
      complexityLevels: [
        createProgressiveDisclosureLevel(1, ['basic'], 'Basic functionality'),
        createProgressiveDisclosureLevel(2, ['basic', 'intermediate'], 'Intermediate features'),
        createProgressiveDisclosureLevel(3, ['basic', 'intermediate', 'advanced'], 'Advanced features'),
        createProgressiveDisclosureLevel(4, ['basic', 'intermediate', 'advanced', 'expert'], 'Expert mode'),
        createProgressiveDisclosureLevel(5, ['basic', 'intermediate', 'advanced', 'expert', 'master'], 'Master level')
      ],
      autoAdvance: true,
      currentLevel: 1,
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
      showMetrics: false,
      showHints: true,
      showContextPanel: false,
      showToolFeed: false,
      customPanels: []
    },
    performance: {
      updateFrequency: 50,
      enableAnimations: true,
      maxConcurrentOps: 10,
      memoryOptimization: 'basic',
      renderOptimization: {
        enableVirtualScrolling: true,
        enableLazyLoading: true,
        batchUpdates: true,
        debounceInterval: 100
      }
    },
    features: {
      customFeatures: {}
    },
    contextAdaptation: {
      autoSwitchOnContent: false,
      autoOptimizeForProject: true,
      adaptationRules: []
    }
  };
}

/**
 * Default interface modes configuration
 */
export const DEFAULT_INTERFACE_MODES: Record<string, InterfaceModeConfig> = {
  chat: createInterfaceModeConfig('chat', 'Chat Mode', 'Standard conversational interface', 'Ctrl+1'),
  canvas: createInterfaceModeConfig('canvas', 'Canvas Mode', 'Visual editing and collaboration', 'Ctrl+2'),
  multimodal: createInterfaceModeConfig('multimodal', 'Multimodal Mode', 'Text, images, and rich content', 'Ctrl+3'),
  analysis: createInterfaceModeConfig('analysis', 'Analysis Mode', 'Data analysis and visualization', 'Ctrl+4'),
  collaboration: createInterfaceModeConfig('collaboration', 'Collaboration Mode', 'Team workflows and sharing', 'Ctrl+5'),
  compact: createInterfaceModeConfig('compact', 'Compact Mode', 'High-density interface', 'Ctrl+6'),
  streaming: createInterfaceModeConfig('streaming', 'Streaming Mode', 'Real-time streaming interface', 'Ctrl+7')
};

/**
 * Default theme configuration
 */
export const DEFAULT_THEME_CONFIG: AdvancedThemeConfig = {
  colorScheme: 'auto',
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 'normal',
    letterSpacing: 0,
    codeFontFamily: 'monospace',
    codeFontSize: 12,
    codeLineHeight: 1.2
  },
  effects: {
    enableAnimations: true,
    animationSpeed: 'normal',
    enableGradients: true,
    enableShadows: true,
    enableBlur: false,
    borderRadius: 8,
    enableThinkingAnimations: true,
    enableStreamingEffects: true,
    enableCanvasTransitions: true
  },
  breakpoints: {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    ultrawide: 1440
  }
};

/**
 * Default accessibility configuration
 */
export const DEFAULT_ACCESSIBILITY_CONFIG: AccessibilityConfig = {
  screenReader: {
    enabled: false,
    announceChanges: true,
    announceErrors: true,
    announceProgress: true,
    verbosity: 'normal'
  },
  keyboard: {
    enabled: true,
    showFocusIndicators: true,
    trapFocus: true,
    skipLinks: true,
    customShortcuts: {}
  },
  visual: {
    highContrast: false,
    reduceMotion: false,
    increaseFontSize: false,
    increaseLineSpacing: false,
    showCaptions: false,
    colorBlindSupport: 'none'
  },
  motor: {
    stickyKeys: false,
    slowKeys: false,
    bounceKeys: false,
    mouseKeys: false,
    clickAssist: false,
    dwellClick: false,
    dwellTime: 1000
  },
  cognitive: {
    simplifiedUI: false,
    consistentNavigation: true,
    clearLabels: true,
    helpText: true,
    confirmActions: false,
    timeoutWarnings: true,
    pauseAnimations: false
  }
};

/**
 * Default layout configuration
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  defaultLayouts: {},
  persistence: {
    saveLayouts: true,
    autoRestore: true,
    maxSavedLayouts: 10
  },
  responsive: {
    autoCollapse: true,
    collapseBreakpoint: 768,
    stackOnSmallScreens: true,
    hideSecondaryPanels: true
  }
};

/**
 * Modern UI Configuration Manager
 */
export class ModernUIConfigManager extends EventEmitter {
  private config: EnhancedModernUIConfig;
  private configPath: string;
  private isInitialized = false;

  constructor(configPath?: string) {
    super();
    this.configPath = configPath || '.vibex/modern-ui-config.json';
    this.config = this.createDefaultConfig();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.loadConfig();
      this.isInitialized = true;
      this.emit('initialized', this.config);
    } catch (error) {
      // Use default config if loading fails
      this.config = this.createDefaultConfig();
      this.isInitialized = true;
      this.emit('initialized', this.config);
    }
  }

  getConfig(): EnhancedModernUIConfig {
    return { ...this.config };
  }

  async updateConfig(updates: Partial<EnhancedModernUIConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates, lastModified: new Date() };
    
    const validation = this.validateConfig(this.config);
    if (!validation.isValid) {
      this.config = oldConfig;
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    await this.saveConfig();
    this.emit('configUpdated', this.config, oldConfig);
  }

  getInterfaceModeConfig(mode: string): InterfaceModeConfig | null {
    return this.config.interfaceModes[mode] || null;
  }

  async updateInterfaceModeConfig(mode: string, updates: Partial<InterfaceModeConfig>): Promise<void> {
    if (!this.config.interfaceModes[mode]) {
      throw new Error(`Interface mode '${mode}' not found`);
    }
    
    const oldModeConfig = { ...this.config.interfaceModes[mode] };
    this.config.interfaceModes[mode] = { 
      ...this.config.interfaceModes[mode], 
      ...updates 
    };
    
    await this.saveConfig();
    this.emit('interfaceModeUpdated', mode, this.config.interfaceModes[mode], oldModeConfig);
  }

  getThemeConfig(): AdvancedThemeConfig {
    return { ...this.config.advancedTheme };
  }

  async updateThemeConfig(updates: Partial<AdvancedThemeConfig>): Promise<void> {
    const oldTheme = { ...this.config.advancedTheme };
    this.config.advancedTheme = { ...this.config.advancedTheme, ...updates };
    this.config.lastModified = new Date();
    
    await this.saveConfig();
    this.emit('themeUpdated', this.config.advancedTheme, oldTheme);
  }

  getAccessibilityConfig(): AccessibilityConfig {
    return { ...this.config.accessibility };
  }

  async updateAccessibilityConfig(updates: Partial<AccessibilityConfig>): Promise<void> {
    const oldAccessibility = { ...this.config.accessibility };
    this.config.accessibility = { ...this.config.accessibility, ...updates };
    this.config.lastModified = new Date();
    
    await this.saveConfig();
    this.emit('accessibilityUpdated', this.config.accessibility, oldAccessibility);
  }

  async resetToDefaults(): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = this.createDefaultConfig();
    
    await this.saveConfig();
    this.emit('configReset', this.config, oldConfig);
  }

  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  async importConfig(configData: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configData) as Partial<EnhancedModernUIConfig>;
      const validation = this.validateConfig(importedConfig);
      
      if (!validation.isValid) {
        throw new Error(`Invalid imported configuration: ${validation.errors.join(', ')}`);
      }
      
      await this.updateConfig(importedConfig);
      this.emit('configImported', this.config);
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateConfig(config: Partial<EnhancedModernUIConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic validation - can be extended
    if (config.defaultInterfaceMode && 
        !['chat', 'canvas', 'multimodal', 'analysis', 'collaboration', 'compact', 'streaming'].includes(config.defaultInterfaceMode)) {
      errors.push('Invalid default interface mode');
    }
    
    if (config.densityMode && 
        !['ultra-compact', 'compact', 'normal', 'spacious'].includes(config.densityMode)) {
      errors.push('Invalid density mode');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private createDefaultConfig(): EnhancedModernUIConfig {
    return {
      defaultInterfaceMode: 'chat',
      densityMode: 'normal',
      enableProgressiveDisclosure: true,
      enableAdaptiveUI: true,
      enableStreamingIndicators: true,
      showThinkingBlocks: true,
      enableWorkflowOrchestration: false,
      theme: {
        colorScheme: 'auto',
        accentColor: '#007acc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        enableAnimations: true,
        enableGradients: true
      },
      interfaceModes: DEFAULT_INTERFACE_MODES,
      advancedTheme: DEFAULT_THEME_CONFIG,
      accessibility: DEFAULT_ACCESSIBILITY_CONFIG,
      layout: DEFAULT_LAYOUT_CONFIG,
      globalPreferences: {
        autoSave: true,
        syncSettings: false,
        autoReset: false,
        enableAnalytics: false,
        enableSuggestions: true
      },
      configVersion: '1.0.0',
      lastModified: new Date()
    };
  }

  private async loadConfig(): Promise<void> {
    // Implementation would load from file system
    // For now, use default config
    this.config = this.createDefaultConfig();
  }

  private async saveConfig(): Promise<void> {
    // Implementation would save to file system
    // For now, just validate the config
    const validation = this.validateConfig(this.config);
    if (!validation.isValid) {
      throw new Error(`Cannot save invalid configuration: ${validation.errors.join(', ')}`);
    }
  }
}

// Global instance
let globalConfigManager: ModernUIConfigManager | null = null;

export async function initializeModernUIConfig(): Promise<void> {
  if (!globalConfigManager) {
    globalConfigManager = new ModernUIConfigManager();
    await globalConfigManager.initialize();
  }
}

export function getModernUIConfig(): EnhancedModernUIConfig {
  if (!globalConfigManager) {
    throw new Error('Modern UI config not initialized. Call initializeModernUIConfig() first.');
  }
  return globalConfigManager.getConfig();
}

export async function updateModernUIConfig(updates: Partial<EnhancedModernUIConfig>): Promise<void> {
  if (!globalConfigManager) {
    throw new Error('Modern UI config not initialized. Call initializeModernUIConfig() first.');
  }
  return globalConfigManager.updateConfig(updates);
} 