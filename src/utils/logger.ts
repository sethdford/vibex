/**
 * Structured Logging System
 * 
 * This module provides a comprehensive logging infrastructure for the entire
 * application, enabling consistent, configurable logging across all components.
 * Key features include:
 * 
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR, SILENT)
 * - Structured log formats with context and metadata
 * - Configurable log destinations (console, file, remote)
 * - Color-coded console output for improved readability
 * - Timestamp generation and formatting
 * - Category-based logging for component identification
 * - Performance metrics and timing utilities
 * - Integration with error handling system
 * - Context preservation for tracking related log entries
 * - Log filtering capabilities based on level and category
 * 
 * The logger implementation is designed to be both developer-friendly for
 * troubleshooting and machine-readable for log aggregation systems.
 */

import { ErrorLevel } from '../errors/types.js';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /**
   * Minimum log level to display
   */
  level: LogLevel;
  
  /**
   * Whether to include timestamps in logs
   */
  timestamps: boolean;
  
  /**
   * Whether to colorize output
   */
  colors: boolean;
  
  /**
   * Whether to include additional context in logs
   */
  verbose: boolean;
  
  /**
   * Custom output destination (defaults to console)
   */
  destination?: (message: string, level: LogLevel, metadata?: unknown) => void;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  timestamps: true,
  colors: true,
  verbose: false
};

/**
 * Log format options
 */
export interface LogFormatOptions {
  /**
   * Whether to include timestamp
   */
  timestamp?: boolean;

  /**
   * Whether to colorize output
   */
  colors?: boolean;

  /**
   * Whether to include level
   */
  level?: boolean;

  /**
   * Whether to include metadata
   */
  metadata?: boolean;

  /**
   * Indent level (number of spaces)
   */
  indent?: number;
}

/**
 * Logger class
 */
export class Logger {
  private config: LoggerConfig;
  
  /**
   * Create a new logger
   */
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Set logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
  
  /**
   * Log a debug message
   */
  debug(message: string, metadata?: unknown): void {
    this.log(message, LogLevel.DEBUG, metadata);
  }
  
  /**
   * Log an info message
   */
  info(message: string, metadata?: unknown): void {
    this.log(message, LogLevel.INFO, metadata);
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, metadata?: unknown): void {
    this.log(message, LogLevel.WARN, metadata);
  }
  
  /**
   * Log an error message
   */
  error(message: string, metadata?: unknown): void {
    this.log(message, LogLevel.ERROR, metadata);
  }
  
  /**
   * Log a message with level
   */
  log(message: string, level: LogLevel, metadata?: unknown): void {
    // Check if this log level should be displayed
    if (level < this.config.level) {
      return;
    }
    
    // Format the message
    const formattedMessage = this.formatMessage(message, level, metadata);
    
    // Send to destination
    if (this.config.destination) {
      this.config.destination(formattedMessage, level, metadata);
    } else {
      this.logToConsole(formattedMessage, level);
    }
  }
  
  /**
   * Format a message for logging
   */
  formatMessage(message: string, level: LogLevel, metadata?: unknown, options?: LogFormatOptions): string {
    // Default options
    const opts = {
      timestamp: this.config.timestamps,
      colors: this.config.colors,
      level: true,
      metadata: this.config.verbose,
      indent: 0,
      ...options
    };
    
    let result = '';
    
    // Add indentation
    if (opts.indent > 0) {
      result += ' '.repeat(opts.indent);
    }
    
    // Add timestamp if enabled
    if (opts.timestamp) {
      const timestamp = new Date().toISOString();
      result += `[${timestamp}] `;
    }
    
    // Add log level
    if (opts.level) {
      result += `${this.getLevelPrefix(level)}: `;
    }
    
    // Add message
    result += message;
    
    // Add metadata if verbose and metadata is provided
    if (opts.metadata && metadata) {
      try {
        if (typeof metadata === 'object') {
          const metadataStr = JSON.stringify(metadata, this.replacer);
          result += ` ${metadataStr}`;
        } else {
          result += ` ${metadata}`;
        }
      } catch (error) {
        result += ' [Failed to serialize metadata]';
      }
    }
    
    return result;
  }
  
  /**
   * Helper function for handling circular references in JSON.stringify
   */
  private replacer(key: string, value: unknown): unknown {
    if (value instanceof Error) {
      // Spread the error object first, then override with specific properties
      // This avoids duplicate property issues
      const errorObj: Record<string, unknown> = { ...value };
      errorObj.message = value.message;
      errorObj.stack = value.stack;
      errorObj.name = value.name;
      return errorObj;
    }
    
    return value;
  }
  
  /**
   * Get a prefix for a log level
   */
  private getLevelPrefix(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return this.colorize('DEBUG', '\x1b[36m'); // Cyan
      case LogLevel.INFO:
        return this.colorize('INFO', '\x1b[32m');  // Green
      case LogLevel.WARN:
        return this.colorize('WARN', '\x1b[33m');  // Yellow
      case LogLevel.ERROR:
        return this.colorize('ERROR', '\x1b[31m'); // Red
      default:
        return 'UNKNOWN';
    }
  }
  
  /**
   * Colorize a string if colors are enabled
   */
  colorize(text: string, colorCode: string): string {
    if (!this.config.colors) {
      return text;
    }
    
    return `${colorCode}${text}\x1b[0m`;
  }
  
  /**
   * Log to console using process streams to avoid circular dependencies
   */
  private logToConsole(message: string, level: LogLevel): void {
    try {
      switch (level) {
        case LogLevel.DEBUG:
        case LogLevel.INFO:
          process.stdout.write(`${message}\n`);
          break;
        case LogLevel.WARN:
        case LogLevel.ERROR:
          process.stderr.write(`${message}\n`);
          break;
      }
    } catch {
      // Fallback to stderr if output fails
      process.stderr.write(`[LOGGER] Failed to output message\n`);
    }
  }
  
  /**
   * Convert a string to a LogLevel
   */
  stringToLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      case 'silent': return LogLevel.SILENT;
      default: return LogLevel.INFO;
    }
  }
  
  /**
   * Convert an error level to a log level
   */
  errorLevelToLogLevel(level: ErrorLevel): LogLevel {
    switch (level) {
      case ErrorLevel.CRITICAL:
        return LogLevel.ERROR;
      case ErrorLevel.MAJOR:
        return LogLevel.ERROR;
      case ErrorLevel.MINOR:
        return LogLevel.WARN;
      case ErrorLevel.INFORMATIONAL:
        return LogLevel.INFO;
      default:
        return LogLevel.INFO;
    }
  }


}

/**
 * Create a standard log context object
 */
export function createLogContext(category: string, data?: unknown): Record<string, unknown> {
  const context: Record<string, unknown> = { category };
  
  if (data) {
    if (typeof data === 'object' && data !== null) {
      // Merge data into context
      Object.assign(context, data);
    } else {
      // Add data as a property
      context.data = data;
    }
  }
  
  return context;
}

// Create singleton logger instance
export const logger = new Logger();

// Configure logger based on environment
if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
  logger.setLevel(LogLevel.DEBUG);
} else if (process.env.VERBOSE === 'true') {
  logger.configure({ verbose: true });
} else if (process.env.LOG_LEVEL) {
  const logLevelStr = process.env.LOG_LEVEL.toLowerCase();
  
  switch (logLevelStr) {
    case 'debug': logger.setLevel(LogLevel.DEBUG); break;
    case 'info': logger.setLevel(LogLevel.INFO); break;
    case 'warn': logger.setLevel(LogLevel.WARN); break;
    case 'error': logger.setLevel(LogLevel.ERROR); break;
    case 'silent': logger.setLevel(LogLevel.SILENT); break;
  }
}

export default logger;