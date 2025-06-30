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

/**
 * Default configuration values
 */
export const defaults: AppConfigType = {
  // API configuration
  api: {
    baseUrl: 'https://api.anthropic.com',
    version: 'v1',
    timeout: 60000, // 60 seconds
    key: ''
  },
  
  // AI configuration
  ai: {
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.5,
    maxTokens: 4096,
    maxHistoryLength: 20,
    enableCaching: true,
    enableTools: true,
    enableTelemetry: true,
    enableBetaFeatures: true,
    autoModelSelection: true,
    costBudget: 10,
    performanceMode: 'balanced'
  },
  
  // Authentication configuration
  auth: {
    autoRefresh: true,
    tokenRefreshThreshold: 300, // 5 minutes
    maxRetryAttempts: 3
  },
  
  // Terminal configuration
  terminal: {
    theme: 'system',
    useColors: true,
    showProgressIndicators: true,
    codeHighlighting: true
  },
  
  // Telemetry configuration
  telemetry: {
    enabled: true,
    submissionInterval: 30 * 60 * 1000, // 30 minutes
    maxQueueSize: 100,
    autoSubmit: true
  },
  
  // File operation configuration
  fileOps: {
    maxReadSizeBytes: 10 * 1024 * 1024 // 10MB
  },
  
  // Execution configuration
  execution: {
    shell: process.env.SHELL || 'bash'
  },
  
  // Logger configuration
  logger: {
    level: 'info',
    timestamps: true,
    colors: true
  },
  
  // Version
  version: '0.2.29'
};