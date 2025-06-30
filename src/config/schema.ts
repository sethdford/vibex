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
import { CLAUDE_4_MODELS } from '../ai/claude4-client.js';

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
    vision: z.boolean().default(true),
    visionEnhancements: z.object({
      detail: z.enum(['low', 'high']).default('high')
    }).default({}),
    preferredModel: z.enum([
      CLAUDE_4_MODELS.CLAUDE_4_SONNET, 
      CLAUDE_4_MODELS.CLAUDE_4_HAIKU, 
      CLAUDE_4_MODELS.CLAUDE_4_OPUS
    ]).default(CLAUDE_4_MODELS.CLAUDE_4_SONNET),
    fallbackModel: z.string().default(CLAUDE_4_MODELS.CLAUDE_4_HAIKU)
  }).default({}),
  
  // Version
  version: z.string().default('0.3.0')
});

// Type definition generated from schema
export type AppConfigType = z.infer<typeof appConfigSchema>;

/**
 * Schema validator class
 */
export class SchemaValidator<T> {
  private schema: z.ZodType<T>;
  
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