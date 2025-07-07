/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Enhanced Logging System for VibeX
 * 
 * Provides structured logging with multiple output formats,
 * log levels, filtering, and performance optimizations.
 */

import { EventEmitter } from 'events';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

/**
 * Log levels enum
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

/**
 * Log entry interface
 */
export interface LogEntry {
  readonly timestamp: number;
  readonly level: LogLevel;
  readonly message: string;
  readonly metadata?: Record<string, any>;
  readonly error?: Error;
  readonly source?: string;
  readonly requestId?: string;
  readonly userId?: string;
  readonly sessionId?: string;
}

/**
 * Log formatter interface
 */
export interface ILogFormatter {
  format(entry: LogEntry): string;
}

/**
 * Log appender interface
 */
export interface ILogAppender {
  append(entry: LogEntry): Promise<void>;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level: LogLevel;
  appenders: ILogAppender[];
  formatters?: Record<string, ILogFormatter>;
  enablePerformanceLogging?: boolean;
  maxLogEntrySize?: number;
  bufferSize?: number;
  flushInterval?: number;
}

/**
 * Enhanced logger interface
 */
export interface IEnhancedLogger {
  trace(message: string, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, metadata?: Record<string, any>): void;
  fatal(message: string, metadata?: Record<string, any>): void;
  log(level: LogLevel, message: string, metadata?: Record<string, any>): void;
  setLevel(level: LogLevel): void;
  addAppender(appender: ILogAppender): void;
  removeAppender(appender: ILogAppender): void;
  flush(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Enhanced logger implementation
 */
export class EnhancedLogger extends EventEmitter implements IEnhancedLogger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private closed = false;

  constructor(config: LoggerConfig) {
    super();
    this.config = { ...config };
    
    // Start flush timer if configured
    if (config.flushInterval && config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush().catch(error => {
          this.emit('error', error);
        });
      }, config.flushInterval);
    }
  }

  trace(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  fatal(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, metadata);
  }

  log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (this.closed || level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: this.truncateMessage(message),
      metadata: this.sanitizeMetadata(metadata),
      source: this.getSource(),
      requestId: this.getRequestId(),
      userId: this.getUserId(),
      sessionId: this.getSessionId()
    };

    // Add to buffer
    this.buffer.push(entry);

    // Emit log event
    this.emit('log', entry);

    // Auto-flush if buffer is full
    if (this.config.bufferSize && this.buffer.length >= this.config.bufferSize) {
      this.flush().catch(error => {
        this.emit('error', error);
      });
    }
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.emit('levelChanged', level);
  }

  addAppender(appender: ILogAppender): void {
    this.config.appenders.push(appender);
    this.emit('appenderAdded', appender);
  }

  removeAppender(appender: ILogAppender): void {
    const index = this.config.appenders.indexOf(appender);
    if (index >= 0) {
      this.config.appenders.splice(index, 1);
      this.emit('appenderRemoved', appender);
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    const promises = this.config.appenders.map(async appender => {
      try {
        for (const entry of entries) {
          await appender.append(entry);
        }
        if (appender.flush) {
          await appender.flush();
        }
      } catch (error) {
        this.emit('appenderError', appender, error);
      }
    });

    await Promise.allSettled(promises);
    this.emit('flushed', entries.length);
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;

    // Clear flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Flush remaining entries
    await this.flush();

    // Close appenders
    const promises = this.config.appenders.map(async appender => {
      try {
        if (appender.close) {
          await appender.close();
        }
      } catch (error) {
        this.emit('appenderError', appender, error);
      }
    });

    await Promise.allSettled(promises);
    this.emit('closed');
  }

  private truncateMessage(message: string): string {
    const maxSize = this.config.maxLogEntrySize || 10000;
    if (message.length <= maxSize) {
      return message;
    }
    return message.substring(0, maxSize - 3) + '...';
  }

  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) {
      return undefined;
    }

    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      try {
        // Avoid circular references and non-serializable values
        JSON.stringify(value);
        sanitized[key] = value;
      } catch {
        sanitized[key] = '[Non-serializable]';
      }
    }

    return sanitized;
  }

  private getSource(): string {
    // Simple source detection from stack trace
    const stack = new Error().stack;
    if (stack) {
      const lines = stack.split('\n');
      for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('vibex') && !line.includes('enhanced-logger')) {
          const match = line.match(/\((.+):(\d+):(\d+)\)/);
          if (match) {
            return `${match[1]}:${match[2]}`;
          }
        }
      }
    }
    return 'unknown';
  }

  private getRequestId(): string | undefined {
    // In a real implementation, this would get the request ID from context
    return undefined;
  }

  private getUserId(): string | undefined {
    // In a real implementation, this would get the user ID from context
    return undefined;
  }

  private getSessionId(): string | undefined {
    // In a real implementation, this would get the session ID from context
    return undefined;
  }
}

/**
 * JSON log formatter
 */
export class JSONFormatter implements ILogFormatter {
  format(entry: LogEntry): string {
    const formatted = {
      timestamp: new Date(entry.timestamp).toISOString(),
      level: LogLevel[entry.level],
      message: entry.message,
      source: entry.source,
      ...(entry.metadata && { metadata: entry.metadata }),
      ...(entry.requestId && { requestId: entry.requestId }),
      ...(entry.userId && { userId: entry.userId }),
      ...(entry.sessionId && { sessionId: entry.sessionId }),
      ...(entry.error && { 
        error: {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack
        }
      })
    };

    return JSON.stringify(formatted);
  }
}

/**
 * Human-readable log formatter
 */
export class HumanFormatter implements ILogFormatter {
  format(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    const source = entry.source ? `[${entry.source}]` : '';
    
    let formatted = `${timestamp} ${level} ${source} ${entry.message}`;
    
    if (entry.metadata) {
      const metadataStr = Object.entries(entry.metadata)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      formatted += ` {${metadataStr}}`;
    }
    
    if (entry.error) {
      formatted += `\nError: ${entry.error.message}\n${entry.error.stack}`;
    }
    
    return formatted;
  }
}

/**
 * Console log appender
 */
export class ConsoleAppender implements ILogAppender {
  private formatter: ILogFormatter;

  constructor(formatter: ILogFormatter = new HumanFormatter()) {
    this.formatter = formatter;
  }

  async append(entry: LogEntry): Promise<void> {
    const formatted = this.formatter.format(entry);
    
    switch (entry.level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted);
        break;
    }
  }
}

/**
 * File log appender
 */
export class FileAppender implements ILogAppender {
  private formatter: ILogFormatter;
  private filePath: string;
  private buffer: string[] = [];
  private maxBufferSize: number;

  constructor(
    filePath: string,
    formatter: ILogFormatter = new JSONFormatter(),
    maxBufferSize = 100
  ) {
    this.filePath = filePath;
    this.formatter = formatter;
    this.maxBufferSize = maxBufferSize;
  }

  async append(entry: LogEntry): Promise<void> {
    const formatted = this.formatter.format(entry);
    this.buffer.push(formatted);

    if (this.buffer.length >= this.maxBufferSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const content = this.buffer.join('\n') + '\n';
    this.buffer = [];

    try {
      // Ensure directory exists
      await mkdir(dirname(this.filePath), { recursive: true });
      
      // Append to file
      await writeFile(this.filePath, content, { flag: 'a' });
    } catch (error) {
      // Re-add to buffer if write failed
      this.buffer.unshift(...content.split('\n').filter(line => line.trim()));
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.flush();
  }
}

/**
 * Rotating file appender
 */
export class RotatingFileAppender implements ILogAppender {
  private fileAppender: FileAppender;
  private basePath: string;
  private maxFileSize: number;
  private maxFiles: number;
  private currentSize = 0;

  constructor(
    basePath: string,
    formatter: ILogFormatter = new JSONFormatter(),
    maxFileSize = 10 * 1024 * 1024, // 10MB
    maxFiles = 5
  ) {
    this.basePath = basePath;
    this.maxFileSize = maxFileSize;
    this.maxFiles = maxFiles;
    this.fileAppender = new FileAppender(this.getCurrentFilePath(), formatter);
  }

  async append(entry: LogEntry): Promise<void> {
    const formatted = this.fileAppender['formatter'].format(entry);
    this.currentSize += Buffer.byteLength(formatted, 'utf8');

    if (this.currentSize >= this.maxFileSize) {
      await this.rotate();
    }

    await this.fileAppender.append(entry);
  }

  async flush(): Promise<void> {
    await this.fileAppender.flush();
  }

  async close(): Promise<void> {
    await this.fileAppender.close();
  }

  private getCurrentFilePath(): string {
    return this.basePath;
  }

  private async rotate(): Promise<void> {
    await this.fileAppender.close();

    // Rotate existing files
    for (let i = this.maxFiles - 1; i > 0; i--) {
      const oldPath = i === 1 ? this.basePath : `${this.basePath}.${i - 1}`;
      const newPath = `${this.basePath}.${i}`;
      
      try {
        const fs = await import('fs/promises');
        await fs.rename(oldPath, newPath);
      } catch {
        // File doesn't exist, continue
      }
    }

    // Create new file appender
    this.currentSize = 0;
    this.fileAppender = new FileAppender(
      this.getCurrentFilePath(),
      this.fileAppender['formatter']
    );
  }
}

/**
 * Logger factory
 */
export class LoggerFactory {
  static createConsoleLogger(level = LogLevel.INFO): EnhancedLogger {
    return new EnhancedLogger({
      level,
      appenders: [new ConsoleAppender()],
      bufferSize: 10,
      flushInterval: 1000
    });
  }

  static createFileLogger(
    filePath: string,
    level = LogLevel.INFO,
    useRotation = true
  ): EnhancedLogger {
    const appender = useRotation
      ? new RotatingFileAppender(filePath)
      : new FileAppender(filePath);

    return new EnhancedLogger({
      level,
      appenders: [appender],
      bufferSize: 100,
      flushInterval: 5000
    });
  }

  static createComboLogger(
    filePath: string,
    level = LogLevel.INFO
  ): EnhancedLogger {
    return new EnhancedLogger({
      level,
      appenders: [
        new ConsoleAppender(new HumanFormatter()),
        new RotatingFileAppender(filePath, new JSONFormatter())
      ],
      bufferSize: 50,
      flushInterval: 2000
    });
  }

  static createProductionLogger(logDir: string): EnhancedLogger {
    return new EnhancedLogger({
      level: LogLevel.INFO,
      appenders: [
        new RotatingFileAppender(
          join(logDir, 'vibex.log'),
          new JSONFormatter(),
          50 * 1024 * 1024, // 50MB
          10
        ),
        new RotatingFileAppender(
          join(logDir, 'vibex-error.log'),
          new JSONFormatter(),
          10 * 1024 * 1024, // 10MB
          5
        )
      ],
      bufferSize: 200,
      flushInterval: 10000,
      enablePerformanceLogging: true
    });
  }

  static createDevelopmentLogger(): EnhancedLogger {
    return new EnhancedLogger({
      level: LogLevel.DEBUG,
      appenders: [
        new ConsoleAppender(new HumanFormatter()),
        new FileAppender('./logs/vibex-dev.log', new JSONFormatter())
      ],
      bufferSize: 10,
      flushInterval: 1000
    });
  }
} 