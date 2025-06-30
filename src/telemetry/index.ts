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
  CACHE_MISS = 'cache_miss'
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
}

// ... other interfaces from advanced-telemetry (TelemetryEvent, BreadcrumbEntry, etc.)
// These interfaces are detailed and provide rich context.

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
  extra?: Record<string, any>;
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
  data?: Record<string, any>;
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
  [key: string]: any;
}

interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, any>;
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
  private config: TelemetryConfig;
  private breadcrumbs: BreadcrumbEntry[] = [];
  private events: TelemetryEvent[] = [];
  private metrics: Map<string, MetricData> = new Map();
  private sessions: Map<string, SessionData> = new Map();
  private globalHandlersAttached = false;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: Partial<TelemetryConfig> = {}) {
    super();

    // Default configuration, respects environment variables
    const isEnabled = process.env.VIBEX_TELEMETRY !== 'false' && config.enabled !== false;

    this.config = {
      enabled: isEnabled,
      environment: process.env.NODE_ENV || 'production',
      maxBreadcrumbs: 100,
      maxEvents: 1000,
      flushInterval: 30000,
      captureUnhandledRejections: true,
      captureConsole: true,
      ...config,
    };

    if (!this.config.clientId && isEnabled) {
      this.config.clientId = uuidv4();
    }
    
    if (this.config.enabled) {
      this.initialize();
    } else {
      logger.debug('Telemetry service is disabled.');
    }
  }

  private initialize(): void {
    logger.debug('Telemetry service initializing...');
    if (this.config.captureUnhandledRejections) {
      this.attachGlobalHandlers();
    }
    if (this.config.captureConsole) {
      this.instrumentConsole();
    }
    this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
    this.setupExitHandlers();
    logger.debug('Telemetry service initialized.');
    this.trackEvent(TelemetryEventType.CLI_START);
  }

  // --------------------------------------------------------------------------
  // Public API - High-level Event Tracking
  // --------------------------------------------------------------------------

  /**
   * Tracks a generic, high-level event.
   */
  trackEvent(type: TelemetryEventType, properties: Record<string, any> = {}): void {
    if (!this.config.enabled) return;
    
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
  trackCommand(commandName: string, args: Record<string, any> = {}, successful: boolean, duration?: number): void {
    if (!this.config.enabled) return;
    if (commandName === 'login' || commandName === 'logout') return;

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
  trackError(error: unknown, context: Record<string, any> = {}): void {
    if (!this.config.enabled) return;

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
    if (!this.config.enabled) return undefined;

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
    if (!this.config.enabled) return undefined;

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
    if (!this.config.enabled) return;

    this.breadcrumbs.push({ ...breadcrumb, timestamp: Date.now() });
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  trackMetric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    if (!this.config.enabled) return;

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
    if (!this.config.enabled) return;
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
    if (!this.config.enabled) return undefined;
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
    if (!this.config.enabled) return;
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.status = status;
    this.emit('session:ended', session);
  }
  
  // --------------------------------------------------------------------------
  // Internal Methods
  // --------------------------------------------------------------------------

  private sanitizeArgs(args: Record<string, any>): Record<string, any> {
    const sanitizedArgs: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      if (key.includes('key') || key.includes('token') || key.includes('password') || key.includes('secret')) {
        continue;
      }
      if (typeof value === 'string') {
        sanitizedArgs[key] = value.length > 100 ? `${value.substring(0, 100)}...` : value;
      } else if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
        sanitizedArgs[key] = value;
      } else if (Array.isArray(value)) {
        sanitizedArgs[key] = `Array(${value.length})`;
      } else if (typeof value === 'object') {
        sanitizedArgs[key] = 'Object';
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
      console[method] = (...args: any[]) => {
        this.addBreadcrumb({
          category: 'console',
          message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
          level: method === 'error' ? 'error' : method === 'warn' ? 'warning' : 'info',
          data: { method }
        });
        original.apply(console, args);
      };
    });
  }

  private attachGlobalHandlers(): void {
    if (this.globalHandlersAttached) return;
    process.on('unhandledRejection', (reason, promise) => {
      this.captureException(reason, {
        tags: { type: 'unhandledRejection' },
        extra: { promise }
      });
    });
    process.on('uncaughtException', (error) => {
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
    // Basic stack trace processing
    return stack.split('\n').map(line => ({
        function: 'unknown',
        filename: line.trim(),
        lineno: 0,
        colno: 0,
        in_app: !line.includes('node_modules')
    })).slice(0, 50); // Limit frames
  }

  private generateEventId = () => uuidv4();
  private generateSessionId = () => `session_${uuidv4()}`;

  // --------------------------------------------------------------------------
  // Flushing Logic
  // --------------------------------------------------------------------------

  async flush(): Promise<void> {
    if (!this.config.enabled || this.events.length === 0) return;
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
    if (!this.config.enabled || this.events.length === 0) return;
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