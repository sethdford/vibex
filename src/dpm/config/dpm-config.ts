// Digital Product Management Configuration
// Centralized configuration management

import { HierarchicalConfigManager } from '../../config/advanced-config';
import { 
  DEFAULT_ANALYTICS_CONFIG, 
  PERFORMANCE_TARGETS, 
  SECURITY_CONFIG,
  AI_CONFIG,
  EXPERIMENT_CONFIG
} from '../constants/dpm-constants';

export interface DPMConfig {
  analytics: AnalyticsConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  ai: AIConfig;
  experimentation: ExperimentationConfig;
  integrations: IntegrationsConfig;
  ui: UIConfig;
  notifications: NotificationsConfig;
}

export interface AnalyticsConfig {
  retentionPeriodDays: number;
  samplingRate: number;
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  enableRealTime: boolean;
  enablePredictive: boolean;
  dataExportEnabled: boolean;
}

export interface PerformanceConfig {
  apiResponseTimeMs: number;
  uiLoadTimeMs: number;
  databaseQueryTimeMs: number;
  cacheHitRatio: number;
  uptimePercentage: number;
  enableCaching: boolean;
  enableCompression: boolean;
  enableLazyLoading: boolean;
}

export interface SecurityConfig {
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  mfaRequiredRoles: string[];
  apiRateLimitPerMinute: number;
  maxFileUploadSizeMB: number;
  enableAuditLog: boolean;
  enableEncryption: boolean;
  enableTwoFactor: boolean;
}

export interface AIConfig {
  claudeModel: string;
  maxTokens: number;
  temperature: number;
  embeddingDimensions: number;
  similarityThreshold: number;
  enableAutoAnalysis: boolean;
  enablePredictions: boolean;
  enableRecommendations: boolean;
}

export interface ExperimentationConfig {
  minSampleSize: number;
  defaultConfidenceLevel: number;
  defaultPower: number;
  minEffectSize: number;
  maxExperimentDurationDays: number;
  minExperimentDurationDays: number;
  enableAutoStop: boolean;
  enableBayesian: boolean;
}

export interface IntegrationsConfig {
  slack: {
    enabled: boolean;
    botToken?: string;
    webhookUrl?: string;
    defaultChannel?: string;
  };
  jira: {
    enabled: boolean;
    serverUrl?: string;
    username?: string;
    apiToken?: string;
    projectKey?: string;
  };
  analytics: {
    googleAnalytics?: {
      enabled: boolean;
      trackingId?: string;
      viewId?: string;
    };
    mixpanel?: {
      enabled: boolean;
      projectToken?: string;
    };
  };
  crm: {
    salesforce?: {
      enabled: boolean;
      instanceUrl?: string;
      clientId?: string;
      clientSecret?: string;
    };
  };
}

export interface UIConfig {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  enableAnimations: boolean;
  enableTooltips: boolean;
  dashboardRefreshInterval: number;
}

export interface NotificationsConfig {
  enableInApp: boolean;
  enableEmail: boolean;
  enableSlack: boolean;
  enableSms: boolean;
  defaultFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

export class DPMConfigManager {
  private config: HierarchicalConfigManager;
  private defaultConfig: DPMConfig;

  constructor(config: HierarchicalConfigManager) {
    this.config = config;
    this.defaultConfig = this.getDefaultConfig();
  }

  private getDefaultConfig(): DPMConfig {
    return {
      analytics: {
        retentionPeriodDays: DEFAULT_ANALYTICS_CONFIG.RETENTION_PERIOD_DAYS,
        samplingRate: DEFAULT_ANALYTICS_CONFIG.SAMPLING_RATE,
        batchSize: DEFAULT_ANALYTICS_CONFIG.BATCH_SIZE,
        flushIntervalMs: DEFAULT_ANALYTICS_CONFIG.FLUSH_INTERVAL_MS,
        maxQueueSize: DEFAULT_ANALYTICS_CONFIG.MAX_QUEUE_SIZE,
        enableRealTime: true,
        enablePredictive: true,
        dataExportEnabled: true
      },
      performance: {
        apiResponseTimeMs: PERFORMANCE_TARGETS.API_RESPONSE_TIME_MS,
        uiLoadTimeMs: PERFORMANCE_TARGETS.UI_LOAD_TIME_MS,
        databaseQueryTimeMs: PERFORMANCE_TARGETS.DATABASE_QUERY_TIME_MS,
        cacheHitRatio: PERFORMANCE_TARGETS.CACHE_HIT_RATIO,
        uptimePercentage: PERFORMANCE_TARGETS.UPTIME_PERCENTAGE,
        enableCaching: true,
        enableCompression: true,
        enableLazyLoading: true
      },
      security: {
        sessionTimeoutMinutes: SECURITY_CONFIG.SESSION_TIMEOUT_MINUTES,
        passwordMinLength: SECURITY_CONFIG.PASSWORD_MIN_LENGTH,
        mfaRequiredRoles: [...SECURITY_CONFIG.MFA_REQUIRED_ROLES],
        apiRateLimitPerMinute: SECURITY_CONFIG.API_RATE_LIMIT_PER_MINUTE,
        maxFileUploadSizeMB: SECURITY_CONFIG.MAX_FILE_UPLOAD_SIZE_MB,
        enableAuditLog: true,
        enableEncryption: true,
        enableTwoFactor: true
      },
      ai: {
        claudeModel: AI_CONFIG.CLAUDE_MODEL,
        maxTokens: AI_CONFIG.MAX_TOKENS,
        temperature: AI_CONFIG.TEMPERATURE,
        embeddingDimensions: AI_CONFIG.EMBEDDING_DIMENSIONS,
        similarityThreshold: AI_CONFIG.SIMILARITY_THRESHOLD,
        enableAutoAnalysis: true,
        enablePredictions: true,
        enableRecommendations: true
      },
      experimentation: {
        minSampleSize: EXPERIMENT_CONFIG.MIN_SAMPLE_SIZE,
        defaultConfidenceLevel: EXPERIMENT_CONFIG.DEFAULT_CONFIDENCE_LEVEL,
        defaultPower: EXPERIMENT_CONFIG.DEFAULT_POWER,
        minEffectSize: EXPERIMENT_CONFIG.MIN_EFFECT_SIZE,
        maxExperimentDurationDays: EXPERIMENT_CONFIG.MAX_EXPERIMENT_DURATION_DAYS,
        minExperimentDurationDays: EXPERIMENT_CONFIG.MIN_EXPERIMENT_DURATION_DAYS,
        enableAutoStop: true,
        enableBayesian: false
      },
      integrations: {
        slack: { enabled: false },
        jira: { enabled: false },
        analytics: {},
        crm: {}
      },
      ui: {
        theme: 'auto',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        currency: 'USD',
        enableAnimations: true,
        enableTooltips: true,
        dashboardRefreshInterval: 30000
      },
      notifications: {
        enableInApp: true,
        enableEmail: true,
        enableSlack: false,
        enableSms: false,
        defaultFrequency: 'immediate',
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC'
        }
      }
    };
  }

  async getDPMConfig(): Promise<DPMConfig> {
    try {
      const storedConfig = await this.config.get('dpm', this.defaultConfig);
      return { ...this.defaultConfig, ...storedConfig };
    } catch (error) {
      console.warn('Failed to load DPM config, using defaults:', error);
      return this.defaultConfig;
    }
  }

  async updateDPMConfig(updates: Partial<DPMConfig>): Promise<void> {
    try {
      const currentConfig = await this.getDPMConfig();
      const newConfig = this.mergeConfig(currentConfig, updates);
      await this.config.set('dpm', newConfig);
    } catch (error) {
      console.error('Failed to update DPM config:', error);
      throw error;
    }
  }

  private mergeConfig(current: DPMConfig, updates: Partial<DPMConfig>): DPMConfig {
    const merged = { ...current };
    
    for (const [key, value] of Object.entries(updates)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key as keyof DPMConfig] = {
          ...merged[key as keyof DPMConfig],
          ...value
        } as any;
      } else {
        (merged as any)[key] = value;
      }
    }
    
    return merged;
  }

  async getAnalyticsConfig(): Promise<AnalyticsConfig> {
    const config = await this.getDPMConfig();
    return config.analytics;
  }

  async getPerformanceConfig(): Promise<PerformanceConfig> {
    const config = await this.getDPMConfig();
    return config.performance;
  }

  async getSecurityConfig(): Promise<SecurityConfig> {
    const config = await this.getDPMConfig();
    return config.security;
  }

  async getAIConfig(): Promise<AIConfig> {
    const config = await this.getDPMConfig();
    return config.ai;
  }

  async getExperimentationConfig(): Promise<ExperimentationConfig> {
    const config = await this.getDPMConfig();
    return config.experimentation;
  }

  async getIntegrationsConfig(): Promise<IntegrationsConfig> {
    const config = await this.getDPMConfig();
    return config.integrations;
  }

  async getUIConfig(): Promise<UIConfig> {
    const config = await this.getDPMConfig();
    return config.ui;
  }

  async getNotificationsConfig(): Promise<NotificationsConfig> {
    const config = await this.getDPMConfig();
    return config.notifications;
  }

  // Validation methods
  validateAnalyticsConfig(config: Partial<AnalyticsConfig>): string[] {
    const errors: string[] = [];
    
    if (config.retentionPeriodDays !== undefined && config.retentionPeriodDays < 1) {
      errors.push('Retention period must be at least 1 day');
    }
    
    if (config.samplingRate !== undefined && (config.samplingRate < 0 || config.samplingRate > 1)) {
      errors.push('Sampling rate must be between 0 and 1');
    }
    
    if (config.batchSize !== undefined && config.batchSize < 1) {
      errors.push('Batch size must be at least 1');
    }
    
    return errors;
  }

  validatePerformanceConfig(config: Partial<PerformanceConfig>): string[] {
    const errors: string[] = [];
    
    if (config.apiResponseTimeMs !== undefined && config.apiResponseTimeMs < 1) {
      errors.push('API response time must be at least 1ms');
    }
    
    if (config.cacheHitRatio !== undefined && (config.cacheHitRatio < 0 || config.cacheHitRatio > 1)) {
      errors.push('Cache hit ratio must be between 0 and 1');
    }
    
    return errors;
  }

  validateSecurityConfig(config: Partial<SecurityConfig>): string[] {
    const errors: string[] = [];
    
    if (config.sessionTimeoutMinutes !== undefined && config.sessionTimeoutMinutes < 1) {
      errors.push('Session timeout must be at least 1 minute');
    }
    
    if (config.passwordMinLength !== undefined && config.passwordMinLength < 8) {
      errors.push('Password minimum length must be at least 8 characters');
    }
    
    return errors;
  }

  // Configuration reset
  async resetToDefaults(): Promise<void> {
    await this.config.set('dpm', this.defaultConfig);
  }

  // Configuration export/import
  async exportConfig(): Promise<string> {
    const config = await this.getDPMConfig();
    return JSON.stringify(config, null, 2);
  }

  async importConfig(configJson: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configJson) as Partial<DPMConfig>;
      await this.updateDPMConfig(importedConfig);
    } catch (error) {
      throw new Error('Invalid configuration JSON');
    }
  }
} 