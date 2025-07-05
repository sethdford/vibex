/**
 * Auth Session Management
 * 
 * Handles user sessions, multi-provider authentication coordination,
 * and secure credential management.
 */

import { MultiProviderAuth, AuthProviderType, AuthEvent, type AuthConfig } from './enhanced-auth.js';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { AuthState } from './types.js';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

/**
 * Session events
 */
export enum SessionEvent {
  STARTED = 'session:started',
  ENDED = 'session:ended',
  ACTIVE_PROVIDER_CHANGED = 'session:provider_changed',
  AUTH_STATUS_CHANGED = 'session:auth_status_changed',
  ERROR = 'session:error',
  RENEWED = 'session:renewed',
  EXPIRED = 'session:expired',
}

/**
 * Session configuration
 */
export interface SessionConfig {
  /**
   * Session expiration time in minutes
   */
  expirationMinutes?: number;
  
  /**
   * Session auto-renewal
   */
  autoRenew?: boolean;
  
  /**
   * Session token encryption
   */
  encryptTokens?: boolean;
  
  /**
   * Path to session storage
   */
  sessionStoragePath?: string;
  
  /**
   * Default provider
   */
  defaultProvider?: AuthProviderType;
  
  /**
   * Authentication configuration
   */
  authConfig?: AuthConfig;
}

/**
 * Session info
 */
export interface SessionInfo {
  /**
   * Session ID
   */
  id: string;
  
  /**
   * Session start time
   */
  startTime: number;
  
  /**
   * Session expiration time
   */
  expiresAt: number;
  
  /**
   * Current active provider
   */
  activeProvider: AuthProviderType;
  
  /**
   * Authenticated providers
   */
  authenticatedProviders: AuthProviderType[];
  
  /**
   * User info
   */
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

/**
 * Auth Session Manager
 */
export class AuthSessionManager extends EventEmitter {
  private readonly auth: MultiProviderAuth;
  private readonly config: Required<SessionConfig>;
  private session: SessionInfo | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;
  private encryptionSecret?: string;
  
  constructor(
    config: SessionConfig = {},
    encryptionSecret?: string
  ) {
    super();
    
    this.config = {
      expirationMinutes: 60, // 1 hour
      autoRenew: true,
      encryptTokens: !!encryptionSecret,
      sessionStoragePath: path.join(os.homedir(), '.vibex', 'sessions'),
      defaultProvider: AuthProviderType.ANTHROPIC,
      authConfig: {},
      ...config
    };
    
    this.encryptionSecret = encryptionSecret;
    
    // Create multi-provider auth system
    this.auth = new MultiProviderAuth(
      this.config.authConfig,
      encryptionSecret
    );
    
    // Set up event listeners
    this.setupEventListeners();
    
    logger.debug('Auth session manager created');
  }
  
  /**
   * Initialize the session manager
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing auth session manager');
    
    // Initialize auth system
    await this.auth.initialize();
    
    // Check if any provider is already authenticated
    const providers = this.auth.getAvailableProviders();
    const authenticatedProviders = providers
      .filter(provider => this.auth.isAuthenticated(provider.type))
      .map(provider => provider.type);
    
    if (authenticatedProviders.length > 0) {
      // Create session with the authenticated provider
      this.createSession(authenticatedProviders[0]);
    }
    
    logger.info('Auth session manager initialized');
  }
  
  /**
   * Start a new session
   */
  public async startSession(
    provider: AuthProviderType = this.config.defaultProvider
  ): Promise<SessionInfo | null> {
    // End any existing session
    if (this.session) {
      await this.endSession();
    }
    
    // Check if provider is authenticated
    if (!this.auth.isAuthenticated(provider)) {
      logger.info(`Provider ${provider} not authenticated, attempting login`);
      
      const result = await this.auth.login(provider);
      if (!result.success) {
        logger.error(`Failed to authenticate with provider ${provider}: ${result.error}`);
        
        this.emit(SessionEvent.ERROR, {
          error: result.error,
          provider
        });
        
        return null;
      }
    }
    
    // Create new session
    this.createSession(provider);
    
    return this.session;
  }
  
  /**
   * End the current session
   */
  public async endSession(): Promise<void> {
    if (!this.session) {
      return;
    }
    
    logger.debug('Ending session');
    
    // Clear session timer
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    
    // Emit event
    this.emit(SessionEvent.ENDED, {
      sessionId: this.session.id,
      duration: Date.now() - this.session.startTime
    });
    
    this.session = null;
  }
  
  /**
   * Switch active provider
   */
  public async switchProvider(provider: AuthProviderType): Promise<boolean> {
    if (!this.session) {
      logger.warn('Cannot switch provider: no active session');
      return false;
    }
    
    // Check if provider is already active
    if (this.session.activeProvider === provider) {
      return true;
    }
    
    // Check if provider is authenticated
    if (!this.auth.isAuthenticated(provider)) {
      logger.info(`Provider ${provider} not authenticated, attempting login`);
      
      const result = await this.auth.login(provider);
      if (!result.success) {
        logger.error(`Failed to authenticate with provider ${provider}: ${result.error}`);
        
        this.emit(SessionEvent.ERROR, {
          error: result.error,
          provider
        });
        
        return false;
      }
    }
    
    // Update active provider
    const previousProvider = this.session.activeProvider;
    this.session.activeProvider = provider;
    
    // Update authenticated providers
    if (!this.session.authenticatedProviders.includes(provider)) {
      this.session.authenticatedProviders.push(provider);
    }
    
    // Emit event
    this.emit(SessionEvent.ACTIVE_PROVIDER_CHANGED, {
      previousProvider,
      newProvider: provider
    });
    
    return true;
  }
  
  /**
   * Get current session info
   */
  public getSession(): SessionInfo | null {
    return this.session;
  }
  
  /**
   * Get auth system
   */
  public getAuthSystem(): MultiProviderAuth {
    return this.auth;
  }
  
  /**
   * Check if session is active
   */
  public isSessionActive(): boolean {
    if (!this.session) {
      return false;
    }
    
    return Date.now() < this.session.expiresAt;
  }
  
  /**
   * Get token for active provider
   */
  public getActiveToken(): string | null {
    if (!this.session) {
      return null;
    }
    
    const token = this.auth.getToken(this.session.activeProvider);
    return token?.accessToken || null;
  }
  
  /**
   * Get authorization header for active provider
   */
  public getAuthorizationHeader(): string | null {
    if (!this.session) {
      return null;
    }
    
    return this.auth.getAuthorizationHeader(this.session.activeProvider);
  }
  
  /**
   * Renew the current session
   */
  public renewSession(durationMinutes?: number): boolean {
    if (!this.session) {
      return false;
    }
    
    const expirationMs = (durationMinutes || this.config.expirationMinutes) * 60 * 1000;
    this.session.expiresAt = Date.now() + expirationMs;
    
    // Reset session timer
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    
    this.setupSessionTimer();
    
    // Emit event
    this.emit(SessionEvent.RENEWED, {
      sessionId: this.session.id,
      expiresAt: this.session.expiresAt
    });
    
    return true;
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for auth events
    this.auth.on(AuthEvent.LOGIN, (data: any) => {
      logger.debug('Auth login event', data);
      
      if (this.session) {
        // Update session with new provider
        if (!this.session.authenticatedProviders.includes(data.provider)) {
          this.session.authenticatedProviders.push(data.provider);
        }
        
        this.emit(SessionEvent.AUTH_STATUS_CHANGED, {
          sessionId: this.session.id,
          provider: data.provider,
          authenticated: true
        });
      }
    });
    
    this.auth.on(AuthEvent.LOGOUT, (data: any) => {
      logger.debug('Auth logout event', data);
      
      if (this.session) {
        // Remove provider from authenticated list
        this.session.authenticatedProviders = this.session.authenticatedProviders
          .filter(provider => provider !== data.provider);
        
        // If this was the active provider, end session
        if (this.session.activeProvider === data.provider) {
          this.endSession();
        } else {
          this.emit(SessionEvent.AUTH_STATUS_CHANGED, {
            sessionId: this.session.id,
            provider: data.provider,
            authenticated: false
          });
        }
      }
    });
    
    this.auth.on(AuthEvent.ERROR, (data: any) => {
      logger.error('Auth error event', data);
      
      this.emit(SessionEvent.ERROR, {
        error: data.error,
        provider: data.provider
      });
    });
  }
  
  /**
   * Create a new session
   */
  private createSession(provider: AuthProviderType): void {
    const expirationMs = this.config.expirationMinutes * 60 * 1000;
    
    // Create session object
    this.session = {
      id: crypto.randomUUID(),
      startTime: Date.now(),
      expiresAt: Date.now() + expirationMs,
      activeProvider: provider,
      authenticatedProviders: [provider]
    };
    
    // Set up session timer
    this.setupSessionTimer();
    
    // Emit event
    this.emit(SessionEvent.STARTED, {
      sessionId: this.session.id,
      provider
    });
    
    logger.info(`Session started with provider: ${provider}`);
  }
  
  /**
   * Set up session expiration timer
   */
  private setupSessionTimer(): void {
    if (!this.session) {
      return;
    }
    
    // Clear existing timer
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    
    // Calculate time to expiry
    const timeToExpiry = this.session.expiresAt - Date.now();
    
    // Set up timer
    this.sessionTimer = setTimeout(() => {
      if (!this.session) {
        return;
      }
      
      // Session expired
      logger.info('Session expired');
      
      // Emit event
      this.emit(SessionEvent.EXPIRED, {
        sessionId: this.session.id
      });
      
      // Auto-renew if configured
      if (this.config.autoRenew) {
        this.renewSession();
      } else {
        this.endSession();
      }
    }, timeToExpiry);
    
    // Make sure timer doesn't prevent Node.js from exiting
    if (this.sessionTimer.unref) {
      this.sessionTimer.unref();
    }
  }
}

/**
 * Create an auth session manager
 */
export function createAuthSession(
  config?: SessionConfig,
  encryptionSecret?: string
): AuthSessionManager {
  return new AuthSessionManager(config, encryptionSecret);
}