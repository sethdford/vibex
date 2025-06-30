// src/errors/types.ts
var UserError = class _UserError extends Error {
  /**
   * Original error that caused this error
   */
  cause;
  /**
   * Error category
   */
  category;
  /**
   * Error level
   */
  level;
  /**
   * Hint on how to resolve the error
   */
  resolution;
  /**
   * Additional details about the error
   */
  details;
  /**
   * Error code
   */
  code;
  /**
   * Create a new user error
   */
  constructor(message, options = {}) {
    super(message);
    this.name = "UserError";
    this.cause = options.cause;
    this.category = options.category ?? 8 /* UNKNOWN */;
    this.level = options.level ?? 2 /* MINOR */;
    this.resolution = options.resolution;
    this.details = options.details ?? {};
    this.code = options.code;
    Error.captureStackTrace?.(this, _UserError);
  }
};

// src/utils/logger.ts
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 3] = "ERROR";
  LogLevel2[LogLevel2["SILENT"] = 4] = "SILENT";
  return LogLevel2;
})(LogLevel || {});
var DEFAULT_CONFIG = {
  level: 1 /* INFO */,
  timestamps: true,
  colors: true,
  verbose: false
};
var Logger = class {
  config;
  /**
   * Create a new logger
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  /**
   * Set logger configuration
   */
  configure(config) {
    this.config = { ...this.config, ...config };
  }
  /**
   * Set log level
   */
  setLevel(level) {
    this.config.level = level;
  }
  /**
   * Log a debug message
   */
  debug(message, metadata) {
    this.log(message, 0 /* DEBUG */, metadata);
  }
  /**
   * Log an info message
   */
  info(message, metadata) {
    this.log(message, 1 /* INFO */, metadata);
  }
  /**
   * Log a warning message
   */
  warn(message, metadata) {
    this.log(message, 2 /* WARN */, metadata);
  }
  /**
   * Log an error message
   */
  error(message, metadata) {
    this.log(message, 3 /* ERROR */, metadata);
  }
  /**
   * Log a message with level
   */
  log(message, level, metadata) {
    if (level < this.config.level) {
      return;
    }
    const formattedMessage = this.formatMessage(message, level, metadata);
    if (this.config.destination) {
      this.config.destination(formattedMessage, level, metadata);
    } else {
      this.logToConsole(formattedMessage, level);
    }
  }
  /**
   * Format a message for logging
   */
  formatMessage(message, level, metadata, options) {
    const opts = {
      timestamp: this.config.timestamps,
      colors: this.config.colors,
      level: true,
      metadata: this.config.verbose,
      indent: 0,
      ...options
    };
    let result = "";
    if (opts.indent > 0) {
      result += " ".repeat(opts.indent);
    }
    if (opts.timestamp) {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      result += `[${timestamp}] `;
    }
    if (opts.level) {
      result += `${this.getLevelPrefix(level)}: `;
    }
    result += message;
    if (opts.metadata && metadata) {
      try {
        if (typeof metadata === "object") {
          const metadataStr = JSON.stringify(metadata, this.replacer);
          result += ` ${metadataStr}`;
        } else {
          result += ` ${metadata}`;
        }
      } catch (error) {
        result += " [Failed to serialize metadata]";
      }
    }
    return result;
  }
  /**
   * Helper function for handling circular references in JSON.stringify
   */
  replacer(key, value) {
    if (value instanceof Error) {
      const errorObj = { ...value };
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
  getLevelPrefix(level) {
    switch (level) {
      case 0 /* DEBUG */:
        return this.colorize("DEBUG", "\x1B[36m");
      // Cyan
      case 1 /* INFO */:
        return this.colorize("INFO", "\x1B[32m");
      // Green
      case 2 /* WARN */:
        return this.colorize("WARN", "\x1B[33m");
      // Yellow
      case 3 /* ERROR */:
        return this.colorize("ERROR", "\x1B[31m");
      // Red
      default:
        return "UNKNOWN";
    }
  }
  /**
   * Colorize a string if colors are enabled
   */
  colorize(text, colorCode) {
    if (!this.config.colors) {
      return text;
    }
    return `${colorCode}${text}\x1B[0m`;
  }
  /**
   * Log to console
   */
  logToConsole(message, level) {
    switch (level) {
      case 0 /* DEBUG */:
        console.debug(message);
        break;
      case 1 /* INFO */:
        console.info(message);
        break;
      case 2 /* WARN */:
        console.warn(message);
        break;
      case 3 /* ERROR */:
        console.error(message);
        break;
    }
  }
  /**
   * Convert a string to a LogLevel
   */
  stringToLogLevel(level) {
    switch (level.toLowerCase()) {
      case "debug":
        return 0 /* DEBUG */;
      case "info":
        return 1 /* INFO */;
      case "warn":
        return 2 /* WARN */;
      case "error":
        return 3 /* ERROR */;
      case "silent":
        return 4 /* SILENT */;
      default:
        return 1 /* INFO */;
    }
  }
  /**
   * Convert an error level to a log level
   */
  errorLevelToLogLevel(level) {
    switch (level) {
      case 0 /* CRITICAL */:
        return 3 /* ERROR */;
      case 1 /* MAJOR */:
        return 3 /* ERROR */;
      case 2 /* MINOR */:
        return 2 /* WARN */;
      case 3 /* INFORMATIONAL */:
        return 1 /* INFO */;
      default:
        return 1 /* INFO */;
    }
  }
};
function createLogContext(category, data) {
  const context = { category };
  if (data) {
    if (typeof data === "object" && data !== null) {
      Object.assign(context, data);
    } else {
      context.data = data;
    }
  }
  return context;
}
var logger = new Logger();
if (process.env.NODE_ENV === "development" || process.env.DEBUG === "true") {
  logger.setLevel(0 /* DEBUG */);
} else if (process.env.VERBOSE === "true") {
  logger.configure({ verbose: true });
} else if (process.env.LOG_LEVEL) {
  const logLevelStr = process.env.LOG_LEVEL.toLowerCase();
  switch (logLevelStr) {
    case "debug":
      logger.setLevel(0 /* DEBUG */);
      break;
    case "info":
      logger.setLevel(1 /* INFO */);
      break;
    case "warn":
      logger.setLevel(2 /* WARN */);
      break;
    case "error":
      logger.setLevel(3 /* ERROR */);
      break;
    case "silent":
      logger.setLevel(4 /* SILENT */);
      break;
  }
}
var logger_default = logger;

export {
  UserError,
  LogLevel,
  Logger,
  createLogContext,
  logger,
  logger_default
};
//# sourceMappingURL=chunk-3Y4ABCUV.js.map