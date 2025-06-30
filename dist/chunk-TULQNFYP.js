import {
  logger
} from "./chunk-3Y4ABCUV.js";

// src/telemetry/index.ts
import { EventEmitter } from "events";

// node_modules/uuid/dist/esm-node/rng.js
import crypto from "crypto";
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    crypto.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// node_modules/uuid/dist/esm-node/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}

// node_modules/uuid/dist/esm-node/native.js
import crypto2 from "crypto";
var native_default = {
  randomUUID: crypto2.randomUUID
};

// node_modules/uuid/dist/esm-node/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// src/telemetry/index.ts
var TelemetryEventType = /* @__PURE__ */ ((TelemetryEventType2) => {
  TelemetryEventType2["CLI_START"] = "cli_start";
  TelemetryEventType2["CLI_EXIT"] = "cli_exit";
  TelemetryEventType2["COMMAND_EXECUTE"] = "command_execute";
  TelemetryEventType2["COMMAND_SUCCESS"] = "command_success";
  TelemetryEventType2["COMMAND_ERROR"] = "command_error";
  TelemetryEventType2["AI_REQUEST"] = "ai_request";
  TelemetryEventType2["AI_RESPONSE"] = "ai_response";
  TelemetryEventType2["AI_ERROR"] = "ai_error";
  TelemetryEventType2["AUTH_SUCCESS"] = "auth_success";
  TelemetryEventType2["AUTH_ERROR"] = "auth_error";
  TelemetryEventType2["CACHE_HIT"] = "cache_hit";
  TelemetryEventType2["CACHE_MISS"] = "cache_miss";
  return TelemetryEventType2;
})(TelemetryEventType || {});
var TelemetryService = class extends EventEmitter {
  config;
  breadcrumbs = [];
  events = [];
  metrics = /* @__PURE__ */ new Map();
  sessions = /* @__PURE__ */ new Map();
  globalHandlersAttached = false;
  flushTimer;
  constructor(config = {}) {
    super();
    const isEnabled = process.env.VIBEX_TELEMETRY !== "false" && config.enabled !== false;
    this.config = {
      enabled: isEnabled,
      environment: process.env.NODE_ENV || "production",
      maxBreadcrumbs: 100,
      maxEvents: 1e3,
      flushInterval: 3e4,
      captureUnhandledRejections: true,
      captureConsole: true,
      ...config
    };
    if (!this.config.clientId && isEnabled) {
      this.config.clientId = v4_default();
    }
    if (this.config.enabled) {
      this.initialize();
    } else {
      logger.debug("Telemetry service is disabled.");
    }
  }
  initialize() {
    logger.debug("Telemetry service initializing...");
    if (this.config.captureUnhandledRejections) {
      this.attachGlobalHandlers();
    }
    if (this.config.captureConsole) {
      this.instrumentConsole();
    }
    this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
    this.setupExitHandlers();
    logger.debug("Telemetry service initialized.");
    this.trackEvent("cli_start" /* CLI_START */);
  }
  // --------------------------------------------------------------------------
  // Public API - High-level Event Tracking
  // --------------------------------------------------------------------------
  /**
   * Tracks a generic, high-level event.
   */
  trackEvent(type, properties = {}) {
    if (!this.config.enabled) return;
    this.addBreadcrumb({
      category: "event",
      message: type,
      level: "info",
      data: properties
    });
    this.captureMessage(`${type}: ${JSON.stringify(properties)}`);
  }
  /**
   * Tracks the execution of a command, sanitizing arguments.
   */
  trackCommand(commandName, args = {}, successful, duration) {
    if (!this.config.enabled) return;
    if (commandName === "login" || commandName === "logout") return;
    const eventType = successful ? "command_success" /* COMMAND_SUCCESS */ : "command_error" /* COMMAND_ERROR */;
    this.trackEvent(eventType, {
      command: commandName,
      args: this.sanitizeArgs(args),
      duration
    });
  }
  /**
   * A simplified method to track an error, which feeds into the advanced capture system.
   */
  trackError(error, context = {}) {
    if (!this.config.enabled) return;
    const category = error instanceof Error && "category" in error ? error.category : 8 /* UNKNOWN */;
    this.captureException(error, {
      tags: { category, ...context.tags },
      extra: context
    });
  }
  // --------------------------------------------------------------------------
  // Public API - Advanced Capture & Metrics
  // (from advanced-telemetry.ts)
  // --------------------------------------------------------------------------
  captureException(error, context) {
    if (!this.config.enabled) return void 0;
    const eventId = this.generateEventId();
    const event = {
      event_id: eventId,
      timestamp: Date.now(),
      type: "error",
      level: "error",
      exception: this.normalizeError(error),
      breadcrumbs: [...this.breadcrumbs],
      user: this.config.user,
      tags: context?.tags || {},
      extra: context?.extra || {},
      environment: this.config.environment,
      release: this.config.release,
      sdk: { name: "vibex-telemetry", version: "3.0.0" }
    };
    if (event.exception?.stacktrace) {
      event.exception.stacktrace = this.processStackTrace(
        typeof event.exception.stacktrace === "string" ? event.exception.stacktrace : JSON.stringify(event.exception.stacktrace)
      );
    }
    this.events.push(event);
    this.emit("error:captured", event);
    if (this.config.environment === "development") {
      logger.error("Captured exception:", { eventId, error: error instanceof Error ? error.message : String(error) });
    }
    return eventId;
  }
  captureMessage(message, level = "info") {
    if (!this.config.enabled) return void 0;
    const eventId = this.generateEventId();
    const event = {
      event_id: eventId,
      timestamp: Date.now(),
      type: "message",
      level,
      message,
      breadcrumbs: [...this.breadcrumbs],
      user: this.config.user,
      environment: this.config.environment,
      release: this.config.release
    };
    this.events.push(event);
    this.emit("message:captured", event);
    return eventId;
  }
  addBreadcrumb(breadcrumb) {
    if (!this.config.enabled) return;
    this.breadcrumbs.push({ ...breadcrumb, timestamp: Date.now() });
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }
  trackMetric(name, value, unit, tags) {
    if (!this.config.enabled) return;
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        unit,
        value: 0,
        values: [],
        tags: tags || {},
        aggregates: { count: 0, sum: 0, min: Infinity, max: -Infinity, avg: 0 }
      });
    }
    const metric = this.metrics.get(name);
    metric.value = value;
    metric.values.push({ value, timestamp: Date.now() });
    metric.aggregates.count++;
    metric.aggregates.sum += value;
    metric.aggregates.min = Math.min(metric.aggregates.min, value);
    metric.aggregates.max = Math.max(metric.aggregates.max, value);
    metric.aggregates.avg = metric.aggregates.sum / metric.aggregates.count;
    this.emit("metric:tracked", { name, value, metric });
  }
  trackApiCall(endpoint, duration, status, model) {
    if (!this.config.enabled) return;
    this.trackMetric(`api.${endpoint}.duration`, duration, "ms", { model: model || "unknown" });
    this.trackMetric(`api.${endpoint}.status.${status}`, 1, "count");
    this.addBreadcrumb({
      category: "api",
      message: `API call to ${endpoint}`,
      level: status >= 400 ? "error" : "info",
      data: { endpoint, duration, status, model }
    });
  }
  // ... (session methods: startSession, endSession, getActiveSessions)
  startSession(sessionId) {
    if (!this.config.enabled) return void 0;
    const id = sessionId || this.generateSessionId();
    const session = {
      id,
      startTime: Date.now(),
      status: "active",
      events: 0,
      errors: 0,
      duration: 0,
      user: this.config.user,
      environment: this.config.environment
    };
    this.sessions.set(id, session);
    this.emit("session:started", session);
    return session;
  }
  endSession(sessionId, status = "completed") {
    if (!this.config.enabled) return;
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.status = status;
    this.emit("session:ended", session);
  }
  // --------------------------------------------------------------------------
  // Internal Methods
  // --------------------------------------------------------------------------
  sanitizeArgs(args) {
    const sanitizedArgs = {};
    for (const [key, value] of Object.entries(args)) {
      if (key.includes("key") || key.includes("token") || key.includes("password") || key.includes("secret")) {
        continue;
      }
      if (typeof value === "string") {
        sanitizedArgs[key] = value.length > 100 ? `${value.substring(0, 100)}...` : value;
      } else if (typeof value === "number" || typeof value === "boolean" || value === null || value === void 0) {
        sanitizedArgs[key] = value;
      } else if (Array.isArray(value)) {
        sanitizedArgs[key] = `Array(${value.length})`;
      } else if (typeof value === "object") {
        sanitizedArgs[key] = "Object";
      }
    }
    return sanitizedArgs;
  }
  setupExitHandlers() {
    const handleExit = (reason, exitCode) => {
      this.trackEvent("cli_exit" /* CLI_EXIT */, { reason });
      this.flushSync();
      process.exit(exitCode);
    };
    process.on("exit", () => this.flushSync());
    process.on("SIGINT", () => handleExit("SIGINT", 0));
    process.on("SIGTERM", () => handleExit("SIGTERM", 0));
  }
  instrumentConsole() {
    const methods = ["log", "info", "warn", "error", "debug"];
    methods.forEach((method) => {
      const original = console[method];
      console[method] = (...args) => {
        this.addBreadcrumb({
          category: "console",
          message: args.map((arg) => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" "),
          level: method === "error" ? "error" : method === "warn" ? "warning" : "info",
          data: { method }
        });
        original.apply(console, args);
      };
    });
  }
  attachGlobalHandlers() {
    if (this.globalHandlersAttached) return;
    process.on("unhandledRejection", (reason, promise) => {
      this.captureException(reason, {
        tags: { type: "unhandledRejection" },
        extra: { promise }
      });
    });
    process.on("uncaughtException", (error) => {
      this.captureException(error, {
        tags: { type: "uncaughtException" },
        extra: { fatal: true }
      });
      this.flushSync();
    });
    this.globalHandlersAttached = true;
  }
  normalizeError(error) {
    if (error instanceof Error) {
      return {
        type: error.constructor.name,
        value: error.message,
        stacktrace: error.stack || "",
        mechanism: { type: "generic", handled: true }
      };
    }
    return {
      type: "UnknownError",
      value: String(error),
      stacktrace: "",
      mechanism: { type: "generic", handled: true }
    };
  }
  processStackTrace(stack) {
    return stack.split("\n").map((line) => ({
      function: "unknown",
      filename: line.trim(),
      lineno: 0,
      colno: 0,
      in_app: !line.includes("node_modules")
    })).slice(0, 50);
  }
  generateEventId = () => v4_default();
  generateSessionId = () => `session_${v4_default()}`;
  // --------------------------------------------------------------------------
  // Flushing Logic
  // --------------------------------------------------------------------------
  async flush() {
    if (!this.config.enabled || this.events.length === 0) return;
    const eventsToSend = [...this.events];
    this.events = [];
    logger.debug(`Flushing ${eventsToSend.length} telemetry events.`);
    try {
      if (this.config.dsn) {
      }
      this.emit("flush:success", { count: eventsToSend.length });
    } catch (error) {
      this.events.unshift(...eventsToSend);
      this.emit("flush:error", error);
      logger.debug("Failed to flush telemetry events", error);
    }
  }
  flushSync() {
    if (!this.config.enabled || this.events.length === 0) return;
    logger.debug(`Would synchronously flush ${this.events.length} events on exit.`);
    this.events = [];
  }
  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------
  isEnabled = () => this.config.enabled;
  getMetrics = () => Object.fromEntries(this.metrics);
  getEvents = () => [...this.events];
  getBreadcrumbs = () => [...this.breadcrumbs];
};
var telemetry = new TelemetryService({
  // Default configuration can be overridden by environment variables or a config file
  release: process.env.npm_package_version || "0.0.0"
});

export {
  TelemetryEventType,
  TelemetryService,
  telemetry
};
//# sourceMappingURL=chunk-TULQNFYP.js.map