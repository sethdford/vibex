/**
 * Multi-Provider Authentication System
 * 
 * Authentication system supporting multiple providers with secure token management.
 */

import { EventEmitter } from 'events';
import { AuthManager } from './manager.js';
import { AuthMethod, AuthState, type AuthToken, type AuthResult, type OAuthConfig } from './types.js';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Auth provider types
 */
export enum AuthProviderType {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GOOGLE = 'google',
  AZURE = 'azure',
  CUSTOM = 'custom',
}

/**
 * Auth provider interface
 */
export interface AuthProvider {
  /**
   * Provider type
   */
  type: AuthProviderType;
  
  /**
   * Provider name
   */
  name: string;
  
  /**
   * Provider OAuth configuration
   */
  oauthConfig?: OAuthConfig;
  
  /**
   * Provider API key environment variable
   */
  apiKeyEnvVar?: string;
  
  /**
   * Provider token endpoint
   */
  tokenEndpoint?: string;
  
  /**
   * Custom authentication function
   */
  customAuthFn?: (params: Record<string, unknown>) => Promise<AuthResult>;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /**
   * Storage path for tokens
   */
  storagePath?: string;
  
  /**
   * Whether to encrypt stored tokens
   */
  encryptTokens?: boolean;
  
  /**
   * Auto-refresh tokens before expiry
   */
  autoRefresh?: boolean;
  
  /**
   * Token refresh threshold (in seconds)
   */
  tokenRefreshThreshold?: number;
  
  /**
   * Maximum retry attempts
   */
  maxRetryAttempts?: number;
  
  /**
   * Default provider
   */
  defaultProvider?: AuthProviderType;
  
  /**
   * Custom providers
   */
  customProviders?: AuthProvider[];
}

/**
 * Auth events
 */
export enum AuthEvent {
  LOGIN = 'auth:login',
  LOGOUT = 'auth:logout',
  PROVIDER_ADDED = 'auth:provider_added',
  PROVIDER_REMOVED = 'auth:provider_removed',
  TOKEN_REFRESHED = 'auth:token_refreshed',
  TOKEN_EXPIRED = 'auth:token_expired',
  ERROR = 'auth:error',
  STATE_CHANGED = 'auth:state_changed',
}

/**
 * Multi-provider authentication system
 */
export class MultiProviderAuth extends EventEmitter {
  private authManagers: Map<string, AuthManager> = new Map();
  private encryptionKey?: Buffer;
  private config: Required<AuthConfig>;
  private providers: Map<AuthProviderType, AuthProvider> = new Map();
  private defaultProviderType: AuthProviderType;
  
  constructor(config: AuthConfig = {}, encryptionSecret?: string) {
    super();
    
    this.config = {
      storagePath: path.join(os.homedir(), '.vibex', 'auth'),
      encryptTokens: !!encryptionSecret,
      autoRefresh: true,
      tokenRefreshThreshold: 300, // 5 minutes
      maxRetryAttempts: 3,
      defaultProvider: AuthProviderType.ANTHROPIC,
      customProviders: [],
      ...config
    };
    
    if (this.config.encryptTokens && encryptionSecret) {
      this.encryptionKey = crypto
        .createHash('sha256')
        .update(encryptionSecret)
        .digest();
    }
    
    this.defaultProviderType = this.config.defaultProvider;
    this.initializeProviders();
    
    logger.debug('Multi-provider authentication system initialized');
  }
  
  /**
   * Initialize the auth system
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing multi-provider authentication system');
    
    await fs.mkdir(this.config.storagePath, { recursive: true });
    
    const providers = Array.from(this.providers.values());
    for (const provider of providers) {
      try {
        await this.initializeProvider(provider);
      } catch (error) {
        logger.warn(`Failed to initialize provider ${provider.type}`, error);
      }
    }
    
    logger.info('Multi-provider authentication system initialized');
  }
  
  /**
   * Login with a specific provider
   */
  public async login(
    providerType: AuthProviderType = this.defaultProviderType,
    method?: AuthMethod,
    params?: Record<string, unknown>
  ): Promise<AuthResult> {
    const provider = this.providers.get(providerType);
    
    if (!provider) {
      throw createUserError(`Unknown auth provider: ${providerType}`, {
        category: ErrorCategory.AUTHENTICATION,
        resolution: 'Specify a valid provider or use the default.'
      });
    }
    
    logger.info(`Authenticating with provider: ${provider.name}`);
    
    const authManager = await this.getOrCreateAuthManager(provider);
    
    if (provider.customAuthFn && params) {
      try {
        const result = await provider.customAuthFn(params);
        
        if (result.success && result.token) {
          await this.saveToken(providerType, result.token);
          this.emit(AuthEvent.LOGIN, { provider: providerType, method: result.method });
        }
        
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Custom authentication failed: ${errorMessage}`);
        
        return {
          success: false,
          error: errorMessage,
          state: AuthState.FAILED
        };
      }
    }
    
    try {
      const result = await authManager.authenticate(method);
      
      if (result.success) {
        this.emit(AuthEvent.LOGIN, { provider: providerType, method: result.method });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Authentication failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        state: AuthState.FAILED
      };
    }
  }
  
  /**
   * Logout from a specific provider
   */
  public async logout(providerType: AuthProviderType = this.defaultProviderType): Promise<boolean> {
    const authManager = this.authManagers.get(providerType);
    
    if (!authManager) {
      return false;
    }
    
    try {
      await authManager.logout();
      this.emit(AuthEvent.LOGOUT, { provider: providerType });
      return true;
    } catch (error) {
      logger.error(`Logout failed for provider ${providerType}`, error);
      return false;
    }
  }
  
  /**
   * Logout from all providers
   */
  public async logoutAll(): Promise<boolean> {
    let success = true;
    
    for (const [providerType, authManager] of this.authManagers.entries()) {
      try {
        await authManager.logout();
        this.emit(AuthEvent.LOGOUT, { provider: providerType });
      } catch (error) {
        logger.error(`Logout failed for provider ${providerType}`, error);
        success = false;
      }
    }
    
    return success;
  }
  
  /**
   * Add a custom provider
   */
  public addProvider(provider: AuthProvider): void {
    if (this.providers.has(provider.type)) {
      throw new Error(`Provider type ${provider.type} already exists`);
    }
    
    this.providers.set(provider.type, provider);
    this.emit(AuthEvent.PROVIDER_ADDED, { provider: provider.type });
    logger.debug(`Added provider: ${provider.name} (${provider.type})`);
  }
  
  /**
   * Remove a provider
   */
  public async removeProvider(providerType: AuthProviderType): Promise<boolean> {
    const provider = this.providers.get(providerType);
    
    if (!provider) {
      return false;
    }
    
    await this.logout(providerType);
    
    this.providers.delete(providerType);
    this.authManagers.delete(providerType);
    
    try {
      await fs.unlink(this.getTokenPath(providerType));
    } catch (error) {
      // Ignore if file doesn't exist
    }
    
    this.emit(AuthEvent.PROVIDER_REMOVED, { provider: providerType });
    logger.debug(`Removed provider: ${providerType}`);
    
    return true;
  }
  
  /**
   * Check if user is authenticated with a provider
   */
  public isAuthenticated(providerType: AuthProviderType = this.defaultProviderType): boolean {
    const authManager = this.authManagers.get(providerType);
    return authManager ? authManager.isAuthenticated() : false;
  }
  
  /**
   * Get the authentication token for a provider
   */
  public getToken(providerType: AuthProviderType = this.defaultProviderType): AuthToken | null {
    const authManager = this.authManagers.get(providerType);
    return authManager ? authManager.getToken() : null;
  }
  
  /**
   * Get the authorization header for API requests
   */
  public getAuthorizationHeader(providerType: AuthProviderType = this.defaultProviderType): string | null {
    const authManager = this.authManagers.get(providerType);
    return authManager ? authManager.getAuthorizationHeader() : null;
  }
  
  /**
   * Set the default provider
   */
  public setDefaultProvider(providerType: AuthProviderType): void {
    if (!this.providers.has(providerType)) {
      throw new Error(`Unknown provider: ${providerType}`);
    }
    
    this.defaultProviderType = providerType;
    logger.debug(`Default provider set to: ${providerType}`);
  }
  
  /**
   * Get the current default provider
   */
  public getDefaultProvider(): AuthProviderType {
    return this.defaultProviderType;
  }
  
  /**
   * Get a list of available providers
   */
  public getAvailableProviders(): AuthProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Get a provider by type
   */
  public getProvider(providerType: AuthProviderType): AuthProvider | undefined {
    return this.providers.get(providerType);
  }
  
  /**
   * Initialize built-in providers
   */
  private initializeProviders(): void {
    // Anthropic provider
    this.providers.set(AuthProviderType.ANTHROPIC, {
      type: AuthProviderType.ANTHROPIC,
      name: 'Anthropic',
      apiKeyEnvVar: 'ANTHROPIC_API_KEY',
      oauthConfig: {
        clientId: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
        authorizationEndpoint: 'https://console.anthropic.com/oauth/authorize',
        tokenEndpoint: 'https://api.anthropic.com/v1/oauth/token',
        redirectUri: 'http://localhost:54545/callback',
        scopes: ['org:create_api_key', 'user:profile', 'user:inference'],
        responseType: 'code',
        usePkce: true
      }
    });
    
    // OpenAI provider
    this.providers.set(AuthProviderType.OPENAI, {
      type: AuthProviderType.OPENAI,
      name: 'OpenAI',
      apiKeyEnvVar: 'OPENAI_API_KEY'
    });
    
    // Google provider
    this.providers.set(AuthProviderType.GOOGLE, {
      type: AuthProviderType.GOOGLE,
      name: 'Google AI',
      apiKeyEnvVar: 'GOOGLE_API_KEY',
      oauthConfig: {
        clientId: 'google-client-id',
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        redirectUri: 'http://localhost:54546/callback',
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        responseType: 'code',
        usePkce: true
      }
    });
    
    // Azure provider
    this.providers.set(AuthProviderType.AZURE, {
      type: AuthProviderType.AZURE,
      name: 'Azure OpenAI',
      apiKeyEnvVar: 'AZURE_OPENAI_API_KEY'
    });
    
    // Add custom providers
    this.config.customProviders.forEach(provider => {
      this.providers.set(provider.type, provider);
    });
  }
  
  /**
   * Initialize a provider
   */
  private async initializeProvider(provider: AuthProvider): Promise<void> {
    const authManager = await this.getOrCreateAuthManager(provider);
    await authManager.initialize();
    
    authManager.on('auth:state_changed', state => {
      this.emit(AuthEvent.STATE_CHANGED, { provider: provider.type, state });
    });
    
    authManager.on('auth:token_refreshed', () => {
      this.emit(AuthEvent.TOKEN_REFRESHED, { provider: provider.type });
    });
    
    authManager.on('auth:error', error => {
      this.emit(AuthEvent.ERROR, { provider: provider.type, error });
    });
  }
  
  /**
   * Get or create an auth manager for a provider
   */
  private async getOrCreateAuthManager(provider: AuthProvider): Promise<AuthManager> {
    const providerType = provider.type;
    
    if (this.authManagers.has(providerType)) {
      return this.authManagers.get(providerType)!;
    }
    
    const managerConfig = {
      api: {
        key: process.env[provider.apiKeyEnvVar || '']
      },
      oauth: provider.oauthConfig,
      preferredMethod: provider.apiKeyEnvVar && process.env[provider.apiKeyEnvVar] 
        ? AuthMethod.API_KEY 
        : AuthMethod.OAUTH,
      autoRefresh: this.config.autoRefresh,
      tokenRefreshThreshold: this.config.tokenRefreshThreshold,
      maxRetryAttempts: this.config.maxRetryAttempts
    };
    
    const authManager = new AuthManager(managerConfig);
    this.authManagers.set(providerType, authManager);
    
    await this.loadSavedToken(providerType);
    
    return authManager;
  }
  
  /**
   * Save a token to secure storage
   */
  private async saveToken(providerType: AuthProviderType, token: AuthToken): Promise<void> {
    const tokenPath = this.getTokenPath(providerType);
    
    try {
      await fs.mkdir(path.dirname(tokenPath), { recursive: true });
      
      let serialized = JSON.stringify(token);
      
      if (this.config.encryptTokens && this.encryptionKey) {
        serialized = this.encrypt(serialized);
      }
      
      await fs.writeFile(tokenPath, serialized, 'utf-8');
      
      logger.debug(`Saved token for provider: ${providerType}`);
    } catch (error) {
      logger.error(`Failed to save token for provider: ${providerType}`, error);
      
      this.emit(AuthEvent.ERROR, {
        provider: providerType,
        error,
        operation: 'saveToken'
      });
    }
  }
  
  /**
   * Load a saved token for a provider
   */
  private async loadSavedToken(providerType: AuthProviderType): Promise<AuthToken | null> {
    const authManager = this.authManagers.get(providerType);
    
    if (!authManager) {
      return null;
    }
    
    const tokenPath = this.getTokenPath(providerType);
    
    try {
      try {
        await fs.access(tokenPath);
      } catch (_e) {
        return null;
      }
      
      const serialized = await fs.readFile(tokenPath, 'utf-8');
      
      let tokenData: string;
      if (this.config.encryptTokens && this.encryptionKey) {
        tokenData = this.decrypt(serialized);
      } else {
        tokenData = serialized;
      }
      
      const token = JSON.parse(tokenData) as AuthToken;
      
      const now = Math.floor(Date.now() / 1000);
      if (token.expiresAt <= now) {
        logger.info(`Token for provider ${providerType} is expired`);
        this.emit(AuthEvent.TOKEN_EXPIRED, { provider: providerType });
        return null;
      }
      
      return token;
    } catch (error) {
      logger.error(`Failed to load token for provider: ${providerType}`, error);
      
      this.emit(AuthEvent.ERROR, {
        provider: providerType,
        error,
        operation: 'loadToken'
      });
      
      return null;
    }
  }
  
  /**
   * Get the file path for a provider's token
   */
  private getTokenPath(providerType: AuthProviderType): string {
    return path.join(this.config.storagePath, `${providerType}.token`);
  }
  
  /**
   * Encrypt data
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return iv.toString('hex') + ':' + encrypted;
  }
  
  /**
   * Decrypt data
   */
  private decrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }
    
    const parts = data.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

/**
 * Create a multi-provider authentication system
 */
export function createMultiProviderAuth(
  config?: AuthConfig,
  encryptionSecret?: string
): MultiProviderAuth {
  return new MultiProviderAuth(config, encryptionSecret);
}

// Legacy exports for backward compatibility
export { MultiProviderAuth as EnhancedAuthSystem };
export type { AuthConfig as EnhancedAuthConfig };
export { AuthEvent as EnhancedAuthEvent };
export { createMultiProviderAuth as createEnhancedAuth };