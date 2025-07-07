/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Security Manager for VibeX
 * 
 * Provides authentication, authorization, audit logging,
 * and security policy enforcement.
 */

import { EventEmitter } from 'events';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { logger } from '../../utils/logger.js';

/**
 * Security context interface
 */
export interface SecurityContext {
  readonly userId?: string;
  readonly sessionId: string;
  readonly permissions: Set<string>;
  readonly roles: Set<string>;
  readonly metadata: Record<string, any>;
  readonly createdAt: number;
  readonly expiresAt?: number;
}

/**
 * Security policy interface
 */
export interface SecurityPolicy {
  readonly name: string;
  readonly description: string;
  readonly rules: SecurityRule[];
  readonly enabled: boolean;
  readonly priority: number;
}

/**
 * Security rule interface
 */
export interface SecurityRule {
  readonly id: string;
  readonly condition: (context: SecurityContext, resource: string, action: string) => boolean;
  readonly effect: 'allow' | 'deny';
  readonly description: string;
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly userId?: string;
  readonly sessionId: string;
  readonly action: string;
  readonly resource: string;
  readonly result: 'success' | 'failure' | 'denied';
  readonly metadata?: Record<string, any>;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

/**
 * Authentication result interface
 */
export interface AuthenticationResult {
  readonly success: boolean;
  readonly context?: SecurityContext;
  readonly error?: string;
  readonly requiresAdditionalAuth?: boolean;
}

/**
 * Authorization result interface
 */
export interface AuthorizationResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly appliedRules: string[];
}

/**
 * Security manager interface
 */
export interface ISecurityManager {
  authenticate(credentials: Record<string, any>): Promise<AuthenticationResult>;
  authorize(context: SecurityContext, resource: string, action: string): Promise<AuthorizationResult>;
  createSession(userId?: string, metadata?: Record<string, any>): SecurityContext;
  validateSession(sessionId: string): SecurityContext | undefined;
  revokeSession(sessionId: string): boolean;
  addPolicy(policy: SecurityPolicy): void;
  removePolicy(policyName: string): void;
  audit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void;
  getAuditLog(filters?: Partial<AuditLogEntry>): AuditLogEntry[];
  hashSensitiveData(data: string, salt?: string): { hash: string; salt: string };
  verifySensitiveData(data: string, hash: string, salt: string): boolean;
  generateSecureToken(length?: number): string;
  sanitizeInput(input: string, allowedChars?: RegExp): string;
}

/**
 * Security manager implementation
 */
export class SecurityManager extends EventEmitter implements ISecurityManager {
  private sessions = new Map<string, SecurityContext>();
  private policies = new Map<string, SecurityPolicy>();
  private auditLog: AuditLogEntry[] = [];
  private maxAuditLogSize = 10000;
  private sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

  constructor(options: {
    maxAuditLogSize?: number;
    sessionTimeout?: number;
  } = {}) {
    super();
    this.maxAuditLogSize = options.maxAuditLogSize || 10000;
    this.sessionTimeout = options.sessionTimeout || 24 * 60 * 60 * 1000;

    // Start session cleanup timer
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Authenticate a user with provided credentials
   */
  async authenticate(credentials: Record<string, any>): Promise<AuthenticationResult> {
    try {
      // Basic authentication logic - extend as needed
      const { username, password, apiKey } = credentials;

      if (apiKey) {
        // API key authentication
        const isValid = await this.validateApiKey(apiKey);
        if (isValid) {
          const context = this.createSession(username || 'api-user', { authMethod: 'apiKey' });
          this.audit({
            sessionId: context.sessionId,
            userId: context.userId,
            action: 'authenticate',
            resource: 'api',
            result: 'success',
            metadata: { method: 'apiKey' }
          });
          return { success: true, context };
        }
      }

      if (username && password) {
        // Username/password authentication
        const isValid = await this.validateCredentials(username, password);
        if (isValid) {
          const context = this.createSession(username, { authMethod: 'password' });
          this.audit({
            sessionId: context.sessionId,
            userId: username,
            action: 'authenticate',
            resource: 'user',
            result: 'success',
            metadata: { method: 'password' }
          });
          return { success: true, context };
        }
      }

      // Authentication failed
      this.audit({
        sessionId: 'anonymous',
        action: 'authenticate',
        resource: 'user',
        result: 'failure',
        metadata: { reason: 'invalid_credentials' }
      });

      return { success: false, error: 'Invalid credentials' };

    } catch (error) {
      logger.error('Authentication error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Authorize an action on a resource
   */
  async authorize(
    context: SecurityContext,
    resource: string,
    action: string
  ): Promise<AuthorizationResult> {
    const appliedRules: string[] = [];
    
    try {
      // Check session validity
      if (context.expiresAt && Date.now() > context.expiresAt) {
        this.audit({
          sessionId: context.sessionId,
          userId: context.userId,
          action,
          resource,
          result: 'denied',
          metadata: { reason: 'session_expired' }
        });
        return { allowed: false, reason: 'Session expired', appliedRules };
      }

      // Apply security policies
      const policies = Array.from(this.policies.values())
        .filter(p => p.enabled)
        .sort((a, b) => b.priority - a.priority);

      for (const policy of policies) {
        for (const rule of policy.rules) {
          try {
            const matches = rule.condition(context, resource, action);
            if (matches) {
              appliedRules.push(`${policy.name}:${rule.id}`);
              
              if (rule.effect === 'deny') {
                this.audit({
                  sessionId: context.sessionId,
                  userId: context.userId,
                  action,
                  resource,
                  result: 'denied',
                  metadata: { 
                    reason: 'policy_denied',
                    policy: policy.name,
                    rule: rule.id
                  }
                });
                return { 
                  allowed: false, 
                  reason: `Denied by policy: ${policy.name}`,
                  appliedRules 
                };
              }
            }
          } catch (error) {
            logger.error('Security rule evaluation error', {
              policy: policy.name,
              rule: rule.id,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }

      // Default allow if no deny rules matched
      this.audit({
        sessionId: context.sessionId,
        userId: context.userId,
        action,
        resource,
        result: 'success',
        metadata: { appliedRules }
      });

      return { allowed: true, appliedRules };

    } catch (error) {
      logger.error('Authorization error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return { allowed: false, reason: 'Authorization failed', appliedRules };
    }
  }

  /**
   * Create a new security session
   */
  createSession(userId?: string, metadata: Record<string, any> = {}): SecurityContext {
    const sessionId = this.generateSecureToken(32);
    const now = Date.now();
    
    const context: SecurityContext = {
      userId,
      sessionId,
      permissions: new Set(this.getDefaultPermissions(userId)),
      roles: new Set(this.getDefaultRoles(userId)),
      metadata,
      createdAt: now,
      expiresAt: now + this.sessionTimeout
    };

    this.sessions.set(sessionId, context);
    
    this.emit('sessionCreated', context);
    logger.debug('Security session created', {
      sessionId,
      userId,
      expiresAt: context.expiresAt
    });

    return context;
  }

  /**
   * Validate and retrieve a security session
   */
  validateSession(sessionId: string): SecurityContext | undefined {
    const context = this.sessions.get(sessionId);
    if (!context) return undefined;

    // Check expiration
    if (context.expiresAt && Date.now() > context.expiresAt) {
      this.sessions.delete(sessionId);
      this.emit('sessionExpired', context);
      return undefined;
    }

    return context;
  }

  /**
   * Revoke a security session
   */
  revokeSession(sessionId: string): boolean {
    const context = this.sessions.get(sessionId);
    if (context) {
      this.sessions.delete(sessionId);
      this.emit('sessionRevoked', context);
      this.audit({
        sessionId,
        userId: context.userId,
        action: 'revoke_session',
        resource: 'session',
        result: 'success'
      });
      return true;
    }
    return false;
  }

  /**
   * Add a security policy
   */
  addPolicy(policy: SecurityPolicy): void {
    this.policies.set(policy.name, policy);
    this.emit('policyAdded', policy);
    logger.debug('Security policy added', { name: policy.name });
  }

  /**
   * Remove a security policy
   */
  removePolicy(policyName: string): void {
    const policy = this.policies.get(policyName);
    if (policy) {
      this.policies.delete(policyName);
      this.emit('policyRemoved', policy);
      logger.debug('Security policy removed', { name: policyName });
    }
  }

  /**
   * Record an audit log entry
   */
  audit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const auditEntry: AuditLogEntry = {
      id: this.generateSecureToken(16),
      timestamp: Date.now(),
      ...entry
    };

    this.auditLog.push(auditEntry);

    // Limit audit log size
    if (this.auditLog.length > this.maxAuditLogSize) {
      this.auditLog.shift(); // Remove oldest entry
    }

    this.emit('auditEntry', auditEntry);
    
    logger.info('Security audit entry', {
      id: auditEntry.id,
      action: auditEntry.action,
      resource: auditEntry.resource,
      result: auditEntry.result,
      userId: auditEntry.userId
    });
  }

  /**
   * Get audit log entries with optional filtering
   */
  getAuditLog(filters: Partial<AuditLogEntry> = {}): AuditLogEntry[] {
    return this.auditLog.filter(entry => {
      return Object.entries(filters).every(([key, value]) => {
        const entryValue = entry[key as keyof AuditLogEntry];
        return entryValue === value;
      });
    });
  }

  /**
   * Hash sensitive data with salt
   */
  hashSensitiveData(data: string, salt?: string): { hash: string; salt: string } {
    const useSalt = salt || randomBytes(16).toString('hex');
    const hash = createHash('sha256')
      .update(data + useSalt)
      .digest('hex');
    
    return { hash, salt: useSalt };
  }

  /**
   * Verify sensitive data against hash
   */
  verifySensitiveData(data: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashSensitiveData(data, salt);
    
    // Use timing-safe comparison to prevent timing attacks
    const hashBuffer = Buffer.from(hash, 'hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');
    
    if (hashBuffer.length !== computedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(hashBuffer, computedBuffer);
  }

  /**
   * Generate a cryptographically secure token
   */
  generateSecureToken(length = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  sanitizeInput(input: string, allowedChars = /[a-zA-Z0-9\s\-_.]/g): string {
    return input.match(allowedChars)?.join('') || '';
  }

  private async validateApiKey(apiKey: string): Promise<boolean> {
    // Basic API key validation - extend as needed
    // In a real implementation, this would check against a database
    return apiKey.length >= 32 && /^[a-zA-Z0-9]+$/.test(apiKey);
  }

  private async validateCredentials(username: string, password: string): Promise<boolean> {
    // Basic credential validation - extend as needed
    // In a real implementation, this would check against a user database
    return username.length > 0 && password.length >= 8;
  }

  private getDefaultPermissions(userId?: string): string[] {
    // Return default permissions based on user
    if (!userId) return ['read'];
    return ['read', 'write'];
  }

  private getDefaultRoles(userId?: string): string[] {
    // Return default roles based on user
    if (!userId) return ['guest'];
    return ['user'];
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [sessionId, context] of this.sessions) {
      if (context.expiresAt && now > context.expiresAt) {
        expired.push(sessionId);
      }
    }

    for (const sessionId of expired) {
      const context = this.sessions.get(sessionId);
      this.sessions.delete(sessionId);
      if (context) {
        this.emit('sessionExpired', context);
      }
    }

    if (expired.length > 0) {
      logger.debug('Expired sessions cleaned up', { count: expired.length });
    }
  }
}

/**
 * Built-in security policies
 */
export class DefaultSecurityPolicies {
  static createBasicPolicy(): SecurityPolicy {
    return {
      name: 'basic',
      description: 'Basic security policy with common protections',
      enabled: true,
      priority: 100,
      rules: [
        {
          id: 'deny_system_files',
          effect: 'deny',
          description: 'Deny access to system files',
          condition: (context, resource) => {
            return resource.includes('/etc/') || 
                   resource.includes('/sys/') || 
                   resource.includes('/proc/');
          }
        },
        {
          id: 'require_auth_for_write',
          effect: 'deny',
          description: 'Require authentication for write operations',
          condition: (context, resource, action) => {
            return action.includes('write') && !context.userId;
          }
        }
      ]
    };
  }

  static createAdminPolicy(): SecurityPolicy {
    return {
      name: 'admin',
      description: 'Administrative security policy',
      enabled: true,
      priority: 200,
      rules: [
        {
          id: 'admin_only_system',
          effect: 'deny',
          description: 'Only admins can access system resources',
          condition: (context, resource) => {
            return resource.startsWith('system.') && 
                   !context.roles.has('admin');
          }
        }
      ]
    };
  }
}

/**
 * Security manager factory
 */
export class SecurityManagerFactory {
  static create(options?: {
    maxAuditLogSize?: number;
    sessionTimeout?: number;
  }): SecurityManager {
    return new SecurityManager(options);
  }

  static createWithDefaultPolicies(options?: {
    maxAuditLogSize?: number;
    sessionTimeout?: number;
  }): SecurityManager {
    const manager = new SecurityManager(options);
    
    // Add default policies
    manager.addPolicy(DefaultSecurityPolicies.createBasicPolicy());
    manager.addPolicy(DefaultSecurityPolicies.createAdminPolicy());
    
    return manager;
  }

  static createForDevelopment(): SecurityManager {
    const manager = new SecurityManager({
      maxAuditLogSize: 1000,
      sessionTimeout: 60 * 60 * 1000 // 1 hour
    });

    // Add permissive development policy
    manager.addPolicy({
      name: 'development',
      description: 'Permissive policy for development',
      enabled: true,
      priority: 50,
      rules: [
        {
          id: 'allow_all_dev',
          effect: 'allow',
          description: 'Allow all operations in development',
          condition: () => true
        }
      ]
    });

    return manager;
  }
} 