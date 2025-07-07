/**
 * Simple Authentication System
 * 
 * Clean, focused authentication following Gemini CLI's proven approach.
 * Supports API key and basic OAuth without over-engineering.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';

/**
 * Simple auth types
 */
export enum SimpleAuthType {
  API_KEY = 'api-key',
  OAUTH = 'oauth'
}

/**
 * Simple auth configuration
 */
export interface SimpleAuthConfig {
  /**
   * Auth type to use
   */
  type: SimpleAuthType;
  
  /**
   * API key (for API_KEY type)
   */
  apiKey?: string;
  
  /**
   * OAuth access token (for OAUTH type)
   */
  accessToken?: string;
  
  /**
   * OAuth refresh token (for OAUTH type)
   */
  refreshToken?: string;
  
  /**
   * Token expiry time (for OAUTH type)
   */
  expiresAt?: number;
}

/**
 * Simple authentication manager
 */
export class SimpleAuth {
  private config: SimpleAuthConfig;
  private readonly credentialsPath: string;

  constructor() {
    // Default to API key auth
    this.config = {
      type: SimpleAuthType.API_KEY,
      apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || ''
    };
    
    // Set up credentials storage path
    const homeDir = os.homedir();
    this.credentialsPath = path.join(homeDir, '.vibex', 'credentials.json');
  }

  /**
   * Initialize authentication
   */
  async initialize(): Promise<boolean> {
    try {
      // Try to load cached credentials
      await this.loadCredentials();
      
      // Validate current auth
      return await this.isValid();
    } catch (error) {
      logger.debug('Failed to initialize auth, using environment variables');
      return this.hasApiKey();
    }
  }

  /**
   * Check if we have a valid API key
   */
  hasApiKey(): boolean {
    return !!(this.config.apiKey && this.config.apiKey.length > 0);
  }

  /**
   * Check if authentication is valid
   */
  async isValid(): Promise<boolean> {
    if (this.config.type === SimpleAuthType.API_KEY) {
      return this.hasApiKey();
    }
    
    if (this.config.type === SimpleAuthType.OAUTH) {
      // Check if token exists and is not expired
      if (!this.config.accessToken) {
        return false;
      }
      
      if (this.config.expiresAt && Date.now() > this.config.expiresAt * 1000) {
        // Token expired, try to refresh
        return await this.refreshToken();
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Get authorization header
   */
  getAuthHeader(): string {
    if (this.config.type === SimpleAuthType.API_KEY && this.config.apiKey) {
      return `Bearer ${this.config.apiKey}`;
    }
    
    if (this.config.type === SimpleAuthType.OAUTH && this.config.accessToken) {
      return `Bearer ${this.config.accessToken}`;
    }
    
    throw new Error('No valid authentication available');
  }

  /**
   * Get API key
   */
  getApiKey(): string {
    if (this.config.type === SimpleAuthType.API_KEY && this.config.apiKey) {
      return this.config.apiKey;
    }
    
    throw new Error('No API key available');
  }

  /**
   * Set API key
   */
  async setApiKey(apiKey: string): Promise<void> {
    this.config = {
      type: SimpleAuthType.API_KEY,
      apiKey
    };
    
    await this.saveCredentials();
    logger.debug('API key updated');
  }

  /**
   * Set OAuth tokens
   */
  async setOAuthTokens(accessToken: string, refreshToken?: string, expiresIn?: number): Promise<void> {
    const expiresAt = expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : undefined;
    
    this.config = {
      type: SimpleAuthType.OAUTH,
      accessToken,
      refreshToken,
      expiresAt
    };
    
    await this.saveCredentials();
    logger.debug('OAuth tokens updated');
  }

  /**
   * Refresh OAuth token
   */
  private async refreshToken(): Promise<boolean> {
    if (!this.config.refreshToken) {
      logger.warn('No refresh token available');
      return false;
    }
    
    try {
      // This would integrate with actual OAuth refresh flow
      // For now, just log that refresh is needed
      logger.warn('OAuth token refresh needed but not implemented');
      return false;
    } catch (error) {
      logger.error('Failed to refresh OAuth token:', error);
      return false;
    }
  }

  /**
   * Load credentials from file
   */
  private async loadCredentials(): Promise<void> {
    try {
      const credentialsData = await fs.readFile(this.credentialsPath, 'utf8');
      const savedConfig = JSON.parse(credentialsData) as SimpleAuthConfig;
      
      // Merge with environment variables (env vars take precedence)
      this.config = {
        ...savedConfig,
        ...(process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY ? {
          type: SimpleAuthType.API_KEY,
          apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
        } : {})
      };
      
      logger.debug('Loaded credentials from file');
    } catch (error) {
      // File doesn't exist or invalid JSON
      logger.debug('No saved credentials found');
    }
  }

  /**
   * Save credentials to file
   */
  private async saveCredentials(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.credentialsPath), { recursive: true });
      
      // Save credentials (don't save if it's from environment variable)
      const configToSave = { ...this.config };
      if (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY) {
        // Don't save API key if it comes from environment
        delete configToSave.apiKey;
      }
      
      await fs.writeFile(this.credentialsPath, JSON.stringify(configToSave, null, 2));
      logger.debug('Saved credentials to file');
    } catch (error) {
      logger.warn('Failed to save credentials:', error);
    }
  }

  /**
   * Clear saved credentials
   */
  async clearCredentials(): Promise<void> {
    try {
      await fs.unlink(this.credentialsPath);
      logger.debug('Cleared saved credentials');
    } catch (error) {
      // File doesn't exist, that's fine
      logger.debug('No credentials file to clear');
    }
    
    // Reset to environment variables only
    this.config = {
      type: SimpleAuthType.API_KEY,
      apiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || ''
    };
  }

  /**
   * Get current auth type
   */
  getAuthType(): SimpleAuthType {
    return this.config.type;
  }
}

/**
 * Create and initialize simple auth
 */
export async function createSimpleAuth(): Promise<SimpleAuth> {
  const auth = new SimpleAuth();
  await auth.initialize();
  return auth;
}

/**
 * Validate auth helper
 */
export async function validateAuth(): Promise<boolean> {
  const auth = await createSimpleAuth();
  return await auth.isValid();
} 