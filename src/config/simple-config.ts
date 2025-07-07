/**
 * Simple Configuration System
 * 
 * Clean, simple config loading following Gemini CLI's proven approach.
 * No over-engineering, just what's needed to work reliably.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';

/**
 * Simple configuration parameters
 */
export interface SimpleConfigParams {
  /**
   * Claude API key
   */
  apiKey?: string;
  
  /**
   * Claude model to use
   */
  model?: string;
  
  /**
   * Working directory
   */
  targetDir?: string;
  
  /**
   * Debug mode
   */
  debug?: boolean;
  
  /**
   * Full context mode
   */
  fullContext?: boolean;
  
  /**
   * Temperature for AI responses
   */
  temperature?: number;
  
  /**
   * Max tokens for responses
   */
  maxTokens?: number;
}

/**
 * Simple configuration class
 */
export class SimpleConfig {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly targetDir: string;
  private readonly debug: boolean;
  private readonly fullContext: boolean;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(params: SimpleConfigParams) {
    // Load from environment variables with fallbacks
    this.apiKey = params.apiKey || process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    this.model = params.model || process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
    this.targetDir = path.resolve(params.targetDir || process.cwd());
    this.debug = params.debug ?? (process.env.CLAUDE_DEBUG === 'true');
    this.fullContext = params.fullContext ?? (process.env.CLAUDE_FULL_CONTEXT === 'true');
    this.temperature = params.temperature ?? parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7');
    this.maxTokens = params.maxTokens ?? parseInt(process.env.CLAUDE_MAX_TOKENS || '4000');
  }

  /**
   * Get API key
   */
  getApiKey(): string {
    return this.apiKey;
  }

  /**
   * Get model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get target directory
   */
  getTargetDir(): string {
    return this.targetDir;
  }

  /**
   * Get debug mode
   */
  getDebug(): boolean {
    return this.debug;
  }

  /**
   * Get full context mode
   */
  getFullContext(): boolean {
    return this.fullContext;
  }

  /**
   * Get temperature
   */
  getTemperature(): number {
    return this.temperature;
  }

  /**
   * Get max tokens
   */
  getMaxTokens(): number {
    return this.maxTokens;
  }

  /**
   * Validate configuration
   */
  isValid(): boolean {
    if (!this.apiKey) {
      logger.error('Claude API key is required. Set CLAUDE_API_KEY or ANTHROPIC_API_KEY environment variable.');
      return false;
    }
    
    if (this.temperature < 0 || this.temperature > 1) {
      logger.error('Temperature must be between 0 and 1');
      return false;
    }
    
    if (this.maxTokens < 1 || this.maxTokens > 200000) {
      logger.error('Max tokens must be between 1 and 200000');
      return false;
    }
    
    return true;
  }
}

/**
 * Load simple configuration from file and environment
 */
export async function loadSimpleConfig(configPath?: string): Promise<SimpleConfig> {
  const configPaths = [
    configPath,
    path.join(process.cwd(), '.vibex.json'),
    path.join(os.homedir(), '.vibex', 'config.json'),
    path.join(os.homedir(), '.vibex.json')
  ].filter(Boolean) as string[];

  let fileConfig: SimpleConfigParams = {};

  // Try to load from file
  for (const filePath of configPaths) {
    try {
      const configFile = await fs.readFile(filePath, 'utf8');
      fileConfig = JSON.parse(configFile);
      logger.debug(`Loaded config from: ${filePath}`);
      break;
    } catch (error) {
      // File doesn't exist or invalid JSON, continue
      logger.debug(`Could not load config from: ${filePath}`);
    }
  }

  // Create config with file + environment variables
  const config = new SimpleConfig(fileConfig);

  // Validate
  if (!config.isValid()) {
    throw new Error('Invalid configuration');
  }

  logger.debug('Configuration loaded successfully');
  return config;
}

/**
 * Create default config file
 */
export async function createDefaultConfig(configPath?: string): Promise<void> {
  const defaultPath = configPath || path.join(os.homedir(), '.vibex', 'config.json');
  const defaultConfig: SimpleConfigParams = {
    model: 'claude-sonnet-4-20250514',
    debug: false,
    fullContext: false,
    temperature: 0.7,
    maxTokens: 4000
  };

  // Ensure directory exists
  await fs.mkdir(path.dirname(defaultPath), { recursive: true });

  // Write config file
  await fs.writeFile(defaultPath, JSON.stringify(defaultConfig, null, 2));
  
  logger.info(`Created default config at: ${defaultPath}`);
  logger.info('Please set your CLAUDE_API_KEY environment variable');
} 