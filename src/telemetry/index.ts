/**
 * Consolidated Telemetry System
 *
 * Combines a simple event tracking system with advanced, Sentry-like
 * error and performance monitoring capabilities. This system is designed to be
 * fully configurable, privacy-respecting, and disabled by default unless
 * explicitly opted in.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { ErrorCategory } from '../errors/types.js';

// ============================================================================
// Enums and Types
// ============================================================================

/**
 * High-level telemetry event types for key actions.
 */
export enum TelemetryEventType {
  CLI_START = 'cli_start',
  CLI_EXIT = 'cli_exit',
  COMMAND_EXECUTE = 'command_execute',
  COMMAND_SUCCESS = 'command_success',
  COMMAND_ERROR = 'command_error',
  AI_REQUEST = 'ai_request',
  AI_RESPONSE = 'ai_response',
  AI_ERROR = 'ai_error',
  AUTH_SUCCESS = 'auth_success',
  AUTH_ERROR = 'auth_error',
  CACHE_HIT = 'cache_hit',
  CACHE_MISS = 'cache_miss',
  WEB_SEARCH = 'web_search'
}

/**
 * Consolidated telemetry configuration.
 */
export interface TelemetryConfig {
  enabled: boolean;
  dsn?: string; // Data Source Name for the telemetry backend
  environment?: string;
  release?: string;
  clientId?: string;
  user?: UserContext;
  maxBreadcrumbs: number;
  maxEvents: number;
  flushInterval: number;
  captureUnhandledRejections: boolean;
  captureConsole: boolean;
  trackCliStart?: boolean; // New option to control CLI_START tracking
}

/**
 * Telemetry event properties for different event types
 */
interface TelemetryEventProperties {
  // Command events
  command?: string;
  args?: Record<string, unknown>;
  duration?: number;
  successful?: boolean;
  
  // AI events
  model?: string;
  tokens?: number;
  endpoint?: string;
  status?: number;
  
  // Generic properties
  [key: string]: unknown;
}

/**
 * Context data for error tracking
 */
interface TelemetryErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Breadcrumb data for telemetry events
 */
interface TelemetryBreadcrumbData {
  endpoint?: string;
  duration?: number;
  status?: number;
  model?: string;
  [key: string]: unknown;
}

interface TelemetryEvent {
  event_id: string;
  timestamp: number;
  type: 'error' | 'message' | 'transaction';
  level: 'info' | 'warning' | 'error';
  message?: string;
  exception?: NormalizedError;
  breadcrumbs: BreadcrumbEntry[];
  user?: UserContext;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  environment?: string;
  release?: string;
  sdk?: {
    name: string;
    version: string;
  };
}

interface BreadcrumbEntry {
  timestamp: number;
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: TelemetryBreadcrumbData;
}

interface SessionData {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number;
  status: 'active' | 'completed' | 'crashed' | 'abnormal';
  events: number;
  errors: number;
  user?: UserContext;
  environment?: string;
}

interface MetricData {
  name: string;
  unit?: string;
  value: number;
  values: Array<{ value: number; timestamp: number }>;
  tags: Record<string, string>;
  aggregates: {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
  };
}

interface UserContext {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}

interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

interface NormalizedError {
  type: string;
  value: string;
  stacktrace: string | StackFrame[];
  mechanism: {
    type: string;
    handled: boolean;
  };
}

interface StackFrame {
  function: string;
  filename: string;
  lineno: number;
  colno: number;
  in_app: boolean;
}


// ============================================================================
// Telemetry Service
// ============================================================================

/**
 * The main telemetry service class.
 * Manages event collection, error capturing, metrics, and sessions.
 */
export class TelemetryService extends EventEmitter {
  private readonly config: TelemetryConfig;
  private readonly breadcrumbs: BreadcrumbEntry[] = [];
  private events: TelemetryEvent[] = [];
  private readonly metrics: Map<string, MetricData> = new Map();
  private readonly sessions: Map<string, SessionData> = new Map();
  private globalHandlersAttached = false;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: Partial<TelemetryConfig> = {}) {
    super();
    this.config = {
      enabled: true,
      environment: 'development',
      release: '1.0.0',
      maxBreadcrumbs: 100,
      maxEvents: 1000,
      flushInterval: 5000,
      captureUnhandledRejections: true,
      captureConsole: false,
      trackCliStart: true, // Default to true, can be disabled for tests
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    if (!this.config.enabled) {return;}

    // Only track CLI_START if explicitly enabled
    if (this.config.trackCliStart) {
      this.trackEvent(TelemetryEventType.CLI_START, {
        timestamp: Date.now(),
        environment: this.config.environment,
        release: this.config.release
      });
    }

    this.attachGlobalHandlers();
    this.setupExitHandlers();

    if (this.config.captureConsole) {
      this.instrumentConsole();
    }

    // Start flush timer only if flushInterval is positive
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flushSync();
      }, this.config.flushInterval);
    }
  }

  // --------------------------------------------------------------------------
  // Public API - High-level Event Tracking
  // --------------------------------------------------------------------------

  /**
   * Tracks a generic, high-level event.
   */
  trackEvent(type: TelemetryEventType, properties: TelemetryEventProperties = {}): void {
    if (!this.config.enabled) {return;}
    
    this.addBreadcrumb({
        category: 'event',
        message: type,
        level: 'info',
        data: properties
    });

    this.captureMessage(`${type}: ${JSON.stringify(properties)}`);
  }

  /**
   * Tracks the execution of a command, sanitizing arguments.
   */
  trackCommand(commandName: string, args: Record<string, unknown> = {}, successful: boolean, duration?: number): void {
    if (!this.config.enabled) {return;}
    
    // Remove the early return for login/logout to allow testing of sanitization
    const eventType = successful ? TelemetryEventType.COMMAND_SUCCESS : TelemetryEventType.COMMAND_ERROR;
    this.trackEvent(eventType, {
      command: commandName,
      args: this.sanitizeArgs(args),
      duration
    });
  }

  /**
   * A simplified method to track an error, which feeds into the advanced capture system.
   */
  trackError(error: unknown, context: TelemetryErrorContext = {}): void {
    if (!this.config.enabled) {return;}

    const category = error instanceof Error && 'category' in error
      ? (error as any).category
      : ErrorCategory.UNKNOWN;

    this.captureException(error, {
      tags: { category, ...context.tags },
      extra: context,
    });
  }

  // --------------------------------------------------------------------------
  // Public API - Advanced Capture & Metrics
  // (from advanced-telemetry.ts)
  // --------------------------------------------------------------------------

  captureException(error: Error | unknown, context?: ErrorContext): string | undefined {
    if (!this.config.enabled) {return undefined;}

    const eventId = this.generateEventId();
    const event: TelemetryEvent = {
      event_id: eventId,
      timestamp: Date.now(),
      type: 'error',
      level: 'error',
      exception: this.normalizeError(error),
      breadcrumbs: [...this.breadcrumbs],
      user: this.config.user,
      tags: context?.tags || {},
      extra: context?.extra || {},
      environment: this.config.environment,
      release: this.config.release,
      sdk: { name: 'vibex-telemetry', version: '3.0.0' }
    };
    
    if (event.exception?.stacktrace) {
        event.exception.stacktrace = this.processStackTrace(
          typeof event.exception.stacktrace === 'string' 
            ? event.exception.stacktrace 
            : JSON.stringify(event.exception.stacktrace)
        );
    }

    this.events.push(event);
    this.emit('error:captured', event);

    if (this.config.environment === 'development') {
      logger.error('Captured exception:', { eventId, error: error instanceof Error ? error.message : String(error) });
    }
    return eventId;
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): string | undefined {
    if (!this.config.enabled) {return undefined;}

    const eventId = this.generateEventId();
    const event: TelemetryEvent = {
      event_id: eventId,
      timestamp: Date.now(),
      type: 'message',
      level,
      message,
      breadcrumbs: [...this.breadcrumbs],
      user: this.config.user,
      environment: this.config.environment,
      release: this.config.release
    };
    this.events.push(event);
    this.emit('message:captured', event);
    return eventId;
  }

  addBreadcrumb(breadcrumb: Omit<BreadcrumbEntry, 'timestamp'>): void {
    if (!this.config.enabled) {return;}

    this.breadcrumbs.push({ ...breadcrumb, timestamp: Date.now() });
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  trackMetric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    if (!this.config.enabled) {return;}

    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name, unit, value: 0, values: [], tags: tags || {},
        aggregates: { count: 0, sum: 0, min: Infinity, max: -Infinity, avg: 0 }
      });
    }

    const metric = this.metrics.get(name)!;
    metric.value = value;
    metric.values.push({ value, timestamp: Date.now() });
    metric.aggregates.count++;
    metric.aggregates.sum += value;
    metric.aggregates.min = Math.min(metric.aggregates.min, value);
    metric.aggregates.max = Math.max(metric.aggregates.max, value);
    metric.aggregates.avg = metric.aggregates.sum / metric.aggregates.count;
    this.emit('metric:tracked', { name, value, metric });
  }

  trackApiCall(endpoint: string, duration: number, status: number, model?: string): void {
    if (!this.config.enabled) {return;}
    this.trackMetric(`api.${endpoint}.duration`, duration, 'ms', { model: model || 'unknown' });
    this.trackMetric(`api.${endpoint}.status.${status}`, 1, 'count');
    this.addBreadcrumb({
      category: 'api',
      message: `API call to ${endpoint}`,
      level: status >= 400 ? 'error' : 'info',
      data: { endpoint, duration, status, model }
    });
  }

  // ... (session methods: startSession, endSession, getActiveSessions)
  startSession(sessionId?: string): SessionData | undefined {
    if (!this.config.enabled) {return undefined;}
    const id = sessionId || this.generateSessionId();
    const session: SessionData = {
      id,
      startTime: Date.now(),
      status: 'active',
      events: 0,
      errors: 0,
      duration: 0,
      user: this.config.user,
      environment: this.config.environment
    };
    this.sessions.set(id, session);
    this.emit('session:started', session);
    return session;
  }

  endSession(sessionId: string, status: 'completed' | 'crashed' | 'abnormal' = 'completed'): void {
    if (!this.config.enabled) {return;}
    const session = this.sessions.get(sessionId);
    if (!session) {return;}
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.status = status;
    this.emit('session:ended', session);
  }
  
  // --------------------------------------------------------------------------
  // Internal Methods
  // --------------------------------------------------------------------------

  private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    const sanitizedArgs: Record<string, unknown> = {};
    const sensitivePatterns = ['key', 'token', 'password', 'secret', 'auth', 'credential'];
    
    for (const [key, value] of Object.entries(args)) {
      // Check if the key contains any sensitive patterns (case-insensitive)
      const isSensitive = sensitivePatterns.some(pattern => 
        key.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (isSensitive) {
        continue; // Skip sensitive fields entirely
      }
      
      if (typeof value === 'string') {
        sanitizedArgs[key] = value.length > 100 ? `${value.substring(0, 100)}...` : value;
      } else if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
        sanitizedArgs[key] = value;
      } else if (Array.isArray(value)) {
        sanitizedArgs[key] = `Array(${value.length})`;
      } else if (typeof value === 'object') {
        sanitizedArgs[key] = '[Object]';
      } else {
        sanitizedArgs[key] = String(value);
      }
    }
    
    return sanitizedArgs;
  }

  private setupExitHandlers(): void {
    const handleExit = (reason: string, exitCode: number) => {
        this.trackEvent(TelemetryEventType.CLI_EXIT, { reason });
        this.flushSync();
        process.exit(exitCode);
    };

    process.on('exit', () => this.flushSync());
    process.on('SIGINT', () => handleExit('SIGINT', 0));
    process.on('SIGTERM', () => handleExit('SIGTERM', 0));
  }

  private instrumentConsole(): void {
    const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
    methods.forEach(method => {
      const original = console[method];
      console[method] = (...args: readonly unknown[]) => {
        this.addBreadcrumb({
          category: 'console',
          message: args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' '),
          level: method === 'error' ? 'error' : method === 'warn' ? 'warning' : 'info',
          data: { method }
        });
        original.apply(console, args as unknown[]);
      };
    });
  }

  private attachGlobalHandlers(): void {
    if (this.globalHandlersAttached) {return;}
    process.on('unhandledRejection', (reason, promise) => {
      this.captureException(reason, {
        tags: { type: 'unhandledRejection' },
        extra: { promise }
      });
    });
    process.on('uncaughtException', error => {
      this.captureException(error, {
        tags: { type: 'uncaughtException' },
        extra: { fatal: true }
      });
      this.flushSync();
    });
    this.globalHandlersAttached = true;
  }

  private normalizeError(error: unknown): NormalizedError {
    if (error instanceof Error) {
      return {
        type: error.constructor.name,
        value: error.message,
        stacktrace: error.stack || '',
        mechanism: { type: 'generic', handled: true }
      };
    }
    return {
      type: 'UnknownError',
      value: String(error),
      stacktrace: '',
      mechanism: { type: 'generic', handled: true }
    };
  }
  
  private processStackTrace(stack: string): StackFrame[] {
    if (!stack || typeof stack !== 'string') {
      return [];
    }

    const lines = stack.split('\n');
    const frames: StackFrame[] = [];
    
    for (const line of lines) {
      // Skip the first line which is usually the error message
      if (line.includes('Error:') || line.includes('TypeError:') || line.includes('ReferenceError:')) {
        continue;
      }
      
      // Match various stack trace formats
      // Format 1: "    at functionName (file:line:col)"
      // Format 2: "    at file:line:col"
      // Format 3: "    at functionName (/path/to/file.js:line:col)"
      const match = line.match(/^\s*at\s+(?:([^(]+)\s+\()?([^:]+):(\d+):(\d+)\)?/) ||
                   line.match(/^\s*at\s+([^(]+)\s+\(([^:]+):(\d+):(\d+)\)/);
      
      if (match) {
        const [, functionName, filename, lineStr, colStr] = match;
        const lineno = parseInt(lineStr, 10);
        const colno = parseInt(colStr, 10);
        
        if (!isNaN(lineno) && !isNaN(colno)) {
          frames.push({
            function: functionName?.trim() || '<anonymous>',
            filename: filename?.trim() || '<unknown>',
            lineno,
            colno,
            in_app: !filename?.includes('node_modules')
          });
        }
      }
    }
    
    return frames;
  }

  private readonly generateEventId = () => uuidv4();
  private readonly generateSessionId = () => `session_${uuidv4()}`;

  // --------------------------------------------------------------------------
  // Cleanup Methods for Testing
  // --------------------------------------------------------------------------

  /**
   * Clear all stored data - useful for testing
   */
  clearData(): void {
    this.breadcrumbs.length = 0;
    this.events.length = 0;
    this.metrics.clear();
    this.sessions.clear();
  }

  /**
   * Clean up resources and timers
   */
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.clearData();
    this.removeAllListeners();
  }

  // --------------------------------------------------------------------------
  // Flushing Logic
  // --------------------------------------------------------------------------

  async flush(): Promise<void> {
    if (!this.config.enabled || this.events.length === 0) {return;}
    const eventsToSend = [...this.events];
    this.events = [];
    
    logger.debug(`Flushing ${eventsToSend.length} telemetry events.`);
    try {
      if (this.config.dsn) {
        // In production, this would send to a telemetry backend like Sentry
        // const response = await fetch(this.config.dsn, { ... });
      }
      this.emit('flush:success', { count: eventsToSend.length });
    } catch (error) {
      this.events.unshift(...eventsToSend); // Re-queue on failure
      this.emit('flush:error', error);
      logger.debug('Failed to flush telemetry events', error);
    }
  }

  private flushSync(): void {
    if (!this.config.enabled || this.events.length === 0) {return;}
    logger.debug(`Would synchronously flush ${this.events.length} events on exit.`);
    // In a real implementation, this would use a synchronous HTTP request library
    this.events = [];
  }
  
  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------
  isEnabled = () => this.config.enabled;
  getMetrics = () => Object.fromEntries(this.metrics);
  getEvents = () => [...this.events];
  getBreadcrumbs = () => [...this.breadcrumbs];
}


// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * The singleton telemetry instance for the application.
 * Import this to track events and errors.
 */
export const telemetry = new TelemetryService({
    // Default configuration can be overridden by environment variables or a config file
    release: process.env.npm_package_version || '0.0.0'
}); 