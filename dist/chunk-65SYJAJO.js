import {
  UserError,
  logger
} from "./chunk-3Y4ABCUV.js";

// src/errors/formatter.ts
function createUserError(message, options = {}) {
  const userError = new UserError(message, options);
  const level = "warn";
  logger[level](`User error: ${message}`, {
    category: userError.category,
    details: userError.details,
    resolution: userError.resolution
  });
  return userError;
}
function formatErrorForDisplay(error) {
  if (typeof error === "object" && error !== null) {
    console.error("Caught object:", JSON.stringify(error, null, 2));
  }
  if (error instanceof UserError) {
    return formatUserError(error);
  }
  if (error instanceof Error) {
    return formatSystemError(error);
  }
  return `Unknown error: ${String(error)}`;
}
function formatUserError(error) {
  let message = `Error: ${error.message}`;
  if (error.resolution) {
    const resolutionSteps = Array.isArray(error.resolution) ? error.resolution : [error.resolution];
    message += "\n\nTo resolve this:";
    resolutionSteps.forEach((step) => {
      message += `
\u2022 ${step}`;
    });
  }
  if (error.details && Object.keys(error.details).length > 0) {
    message += "\n\nDetails:";
    for (const [key, value] of Object.entries(error.details)) {
      const formattedValue = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
      message += `
${key}: ${formattedValue}`;
    }
  }
  return message;
}
function formatSystemError(error) {
  let message = `System error: ${error.message}`;
  if (process.env.DEBUG === "true") {
    message += `

Stack trace:
${error.stack || "No stack trace available"}`;
  }
  return message;
}

export {
  createUserError,
  formatErrorForDisplay
};
//# sourceMappingURL=chunk-65SYJAJO.js.map