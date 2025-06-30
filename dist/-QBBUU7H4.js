import "./chunk-Z2JMWTMB.js";
import {
  commandRegistry
} from "./chunk-U2YM5IM2.js";
import {
  config_default,
  createClaude4Client,
  loadConfig
} from "./chunk-BIXVLG3Z.js";
import "./chunk-HP5P6LIV.js";
import "./chunk-Y4EW5IL7.js";
import {
  directoryExists,
  fileExists,
  findFiles,
  isNonEmptyString,
  readTextFile
} from "./chunk-W4QWQKCP.js";
import {
  createUserError,
  formatErrorForDisplay
} from "./chunk-65SYJAJO.js";
import {
  telemetry
} from "./chunk-TULQNFYP.js";
import {
  logger
} from "./chunk-3Y4ABCUV.js";
import {
  __require
} from "./chunk-PR4QN5HX.js";

// src/terminal/index.ts
import chalk2 from "chalk";
import ora from "ora";
import terminalLink from "terminal-link";
import { table } from "table";

// src/terminal/formatting.ts
import chalk from "chalk";
function clearScreen() {
  process.stdout.write("\x1B[2J\x1B[0f");
}
function getTerminalSize() {
  const defaultSize = { rows: 24, columns: 80 };
  try {
    if (process.stdout.isTTY) {
      return {
        rows: process.stdout.rows || defaultSize.rows,
        columns: process.stdout.columns || defaultSize.columns
      };
    }
  } catch (error) {
  }
  return defaultSize;
}
function formatOutput(text, options = {}) {
  const { width = getTerminalSize().columns, colors = true, codeHighlighting = true } = options;
  if (!text) {
    return "";
  }
  if (colors) {
    text = formatCodeBlocks(text, codeHighlighting);
    text = text.replace(/`([^`]+)`/g, (_, code) => chalk.cyan(code));
    text = text.replace(/\*\*([^*]+)\*\*/g, (_, bold) => chalk.bold(bold));
    text = text.replace(/\*([^*]+)\*/g, (_, italic) => chalk.italic(italic));
    text = text.replace(
      /^(\s*)-\s+(.+)$/gm,
      (_, indent, item) => `${indent}${chalk.dim("\u2022")} ${item}`
    );
    text = text.replace(/^(#+)\s+(.+)$/gm, (_, hashes, header) => {
      if (hashes.length === 1) {
        return chalk.bold.underline.blue(header);
      } else if (hashes.length === 2) {
        return chalk.bold.blue(header);
      } else {
        return chalk.bold(header);
      }
    });
  }
  if (width) {
    text = wordWrap(text, width);
  }
  return text;
}
function formatCodeBlocks(text, enableHighlighting) {
  const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/g;
  return text.replace(codeBlockRegex, (match, language, code) => {
    const highlightedCode = enableHighlighting && language ? highlightSyntax(code, language) : code;
    const lines = highlightedCode.split("\n");
    const border = chalk.dim("\u2503");
    const formattedLines = lines.map((line) => `${border} ${line}`);
    const top = chalk.dim("\u250F" + "\u2501".repeat(Math.max(...lines.map((l) => l.length)) + 2) + "\u2513");
    const bottom = chalk.dim("\u2517" + "\u2501".repeat(Math.max(...lines.map((l) => l.length)) + 2) + "\u251B");
    const header = language ? `${border} ${chalk.bold.blue(language)}
` : "";
    return `${top}
${header}${formattedLines.join("\n")}
${bottom}`;
  });
}
function highlightSyntax(code, language) {
  const keywords = [
    "function",
    "const",
    "let",
    "var",
    "if",
    "else",
    "for",
    "while",
    "return",
    "import",
    "export",
    "class",
    "interface",
    "extends",
    "implements",
    "public",
    "private",
    "protected",
    "static",
    "async",
    "await"
  ];
  const tokens = code.split(/(\s+|[{}[\]();,.<>?:!+\-*/%&|^~=])/);
  return tokens.map((token) => {
    if (keywords.includes(token)) {
      return chalk.blue(token);
    }
    if (/^[0-9]+(\.[0-9]+)?$/.test(token)) {
      return chalk.yellow(token);
    }
    if (/^["'].*["']$/.test(token)) {
      return chalk.green(token);
    }
    if (token.startsWith("//") || token.startsWith("/*") || token.startsWith("*")) {
      return chalk.gray(token);
    }
    return token;
  }).join("");
}
function wordWrap(text, width) {
  const lines = text.split("\n");
  return lines.map((line) => {
    if (line.trim().startsWith("\u2503") || line.length <= width) {
      return line;
    }
    const words = line.split(" ");
    const wrappedLines = [];
    let currentLine = "";
    for (const word of words) {
      if (currentLine.length + word.length + 1 > width) {
        if (currentLine) {
          wrappedLines.push(currentLine);
          currentLine = word;
        } else {
          wrappedLines.push(word);
        }
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
    return wrappedLines.join("\n");
  }).join("\n");
}

// src/terminal/prompt.ts
import { createInterface } from "readline";
import { EventEmitter } from "events";
import inquirer from "inquirer";
async function createPrompt(options, config) {
  logger.debug("Creating prompt", { type: options.type, name: options.name });
  if (options.required && !options.validate) {
    options.validate = (input) => {
      if (!input && input !== false && input !== 0) {
        return `${options.name} is required`;
      }
      return true;
    };
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    logger.warn("Terminal is not interactive, cannot prompt for input");
    throw new Error("Cannot prompt for input in non-interactive terminal");
  }
  try {
    const result = await inquirer.prompt([options]);
    logger.debug("Prompt result", { name: options.name, result: result[options.name] });
    return result[options.name];
  } catch (error) {
    logger.error("Error in prompt", error);
    throw new Error(`Failed to prompt for ${options.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// src/terminal/index.ts
async function initTerminal(config) {
  logger.debug("Initializing terminal interface");
  const terminalConfig = {
    theme: config.terminal?.theme || "system",
    useColors: config.terminal?.useColors !== false,
    showProgressIndicators: config.terminal?.showProgressIndicators !== false,
    codeHighlighting: config.terminal?.codeHighlighting !== false,
    maxHeight: config.terminal?.maxHeight,
    maxWidth: config.terminal?.maxWidth
  };
  const terminal = new Terminal(terminalConfig);
  try {
    await terminal.detectCapabilities();
    return terminal;
  } catch (error) {
    logger.warn("Error initializing terminal interface:", error);
    return terminal;
  }
}
var Terminal = class {
  config;
  activeSpinners = /* @__PURE__ */ new Map();
  terminalWidth;
  terminalHeight;
  isInteractive;
  constructor(config) {
    this.config = config;
    const { rows, columns } = getTerminalSize();
    this.terminalHeight = config.maxHeight || rows;
    this.terminalWidth = config.maxWidth || columns;
    this.isInteractive = process.stdout.isTTY && process.stdin.isTTY;
    process.stdout.on("resize", () => {
      const { rows: rows2, columns: columns2 } = getTerminalSize();
      this.terminalHeight = config.maxHeight || rows2;
      this.terminalWidth = config.maxWidth || columns2;
      logger.debug(`Terminal resized to ${columns2}x${rows2}`);
    });
  }
  /**
   * Detect terminal capabilities
   */
  async detectCapabilities() {
    this.isInteractive = process.stdout.isTTY && process.stdin.isTTY;
    if (this.config.useColors && !chalk2.level) {
      logger.warn("Terminal does not support colors, disabling color output");
      this.config.useColors = false;
    }
    logger.debug("Terminal capabilities detected", {
      isInteractive: this.isInteractive,
      colorSupport: this.config.useColors ? "yes" : "no",
      size: `${this.terminalWidth}x${this.terminalHeight}`
    });
  }
  /**
   * Display the welcome message
   */
  displayWelcome() {
    this.clear();
    const version = "0.2.29";
    console.log(chalk2.blue.bold("\n  Claude Code CLI"));
    console.log(chalk2.gray(`  Version ${version} (Research Preview)
`));
    console.log(chalk2.white(`  Welcome! Type ${chalk2.cyan("/help")} to see available commands.`));
    console.log(chalk2.white(`  You can ask Claude to explain code, fix issues, or perform tasks.`));
    console.log(chalk2.white(`  Example: "${chalk2.italic("Please analyze this codebase and explain its structure.")}"
`));
    if (this.config.useColors) {
      console.log(chalk2.dim("  Pro tip: Use Ctrl+C to interrupt Claude and start over.\n"));
    }
  }
  /**
   * Clear the terminal screen
   */
  clear() {
    if (this.isInteractive) {
      clearScreen();
    }
  }
  /**
   * Display formatted content
   */
  display(content) {
    const formatted = formatOutput(content, {
      width: this.terminalWidth,
      colors: this.config.useColors,
      codeHighlighting: this.config.codeHighlighting
    });
    console.log(formatted);
  }
  /**
   * Display a message with emphasis
   */
  emphasize(message) {
    if (this.config.useColors) {
      console.log(chalk2.cyan.bold(message));
    } else {
      console.log(message.toUpperCase());
    }
  }
  /**
   * Display an informational message
   */
  info(message) {
    if (this.config.useColors) {
      console.log(chalk2.blue(`\u2139 ${message}`));
    } else {
      console.log(`INFO: ${message}`);
    }
  }
  /**
   * Display a success message
   */
  success(message) {
    if (this.config.useColors) {
      console.log(chalk2.green(`\u2713 ${message}`));
    } else {
      console.log(`SUCCESS: ${message}`);
    }
  }
  /**
   * Display a warning message
   */
  warn(message) {
    if (this.config.useColors) {
      console.log(chalk2.yellow(`\u26A0 ${message}`));
    } else {
      console.log(`WARNING: ${message}`);
    }
  }
  /**
   * Display an error message
   */
  error(message) {
    if (this.config.useColors) {
      console.log(chalk2.red(`\u2717 ${message}`));
    } else {
      console.log(`ERROR: ${message}`);
    }
  }
  /**
   * Create a clickable link in the terminal if supported
   */
  link(text, url) {
    return terminalLink(text, url, { fallback: (text2, url2) => `${text2} (${url2})` });
  }
  /**
   * Display a table of data
   */
  table(data, options = {}) {
    const config = {
      border: options.border ? {} : { topBody: "", topJoin: "", topLeft: "", topRight: "", bottomBody: "", bottomJoin: "", bottomLeft: "", bottomRight: "", bodyLeft: "", bodyRight: "", bodyJoin: "", joinBody: "", joinLeft: "", joinRight: "", joinJoin: "" }
    };
    if (options.header) {
      if (this.config.useColors) {
        data = [options.header.map((h) => chalk2.bold(h)), ...data];
      } else {
        data = [options.header, ...data];
      }
    }
    console.log(table(data, config));
  }
  /**
   * Prompt user for input
   */
  async prompt(options) {
    return createPrompt(options, this.config);
  }
  /**
   * Create a spinner for showing progress
   */
  spinner(text, id = "default") {
    if (this.activeSpinners.has(id)) {
      this.activeSpinners.get(id).stop();
      this.activeSpinners.delete(id);
    }
    if (this.config.showProgressIndicators && this.isInteractive) {
      const spinner = ora({
        text,
        spinner: "dots",
        color: "cyan"
      }).start();
      const spinnerInstance = {
        id,
        update: (newText) => {
          spinner.text = newText;
          return spinnerInstance;
        },
        succeed: (text2) => {
          spinner.succeed(text2);
          this.activeSpinners.delete(id);
          return spinnerInstance;
        },
        fail: (text2) => {
          spinner.fail(text2);
          this.activeSpinners.delete(id);
          return spinnerInstance;
        },
        warn: (text2) => {
          spinner.warn(text2);
          this.activeSpinners.delete(id);
          return spinnerInstance;
        },
        info: (text2) => {
          spinner.info(text2);
          this.activeSpinners.delete(id);
          return spinnerInstance;
        },
        stop: () => {
          spinner.stop();
          this.activeSpinners.delete(id);
          return spinnerInstance;
        }
      };
      this.activeSpinners.set(id, spinnerInstance);
      return spinnerInstance;
    } else {
      console.log(text);
      const dummySpinner = {
        id,
        update: (newText) => {
          if (newText !== text) {
            console.log(newText);
          }
          return dummySpinner;
        },
        succeed: (text2) => {
          if (text2) {
            this.success(text2);
          }
          return dummySpinner;
        },
        fail: (text2) => {
          if (text2) {
            this.error(text2);
          }
          return dummySpinner;
        },
        warn: (text2) => {
          if (text2) {
            this.warn(text2);
          }
          return dummySpinner;
        },
        info: (text2) => {
          if (text2) {
            this.info(text2);
          }
          return dummySpinner;
        },
        stop: () => {
          return dummySpinner;
        }
      };
      return dummySpinner;
    }
  }
};

// src/auth/tokens.ts
import fs from "fs/promises";
import path from "path";
import os from "os";
var TOKEN_FILE_PATH = path.join(os.homedir(), ".claude-code-auth.json");
function createTokenStorage() {
  return {
    /**
     * Save a token to storage
     */
    async saveToken(key, token) {
      logger.debug(`Saving auth token for ${key}`);
      try {
        const data = JSON.stringify({ [key]: token });
        await fs.writeFile(TOKEN_FILE_PATH, data);
      } catch (error) {
        logger.error("Failed to save token to file", error);
      }
    },
    /**
     * Get a token from storage
     */
    async getToken(key) {
      logger.debug(`Getting auth token for ${key}`);
      try {
        const data = await fs.readFile(TOKEN_FILE_PATH, "utf-8");
        const tokens = JSON.parse(data);
        return tokens[key] || null;
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          return null;
        }
        logger.error("Failed to read token from file", error);
        return null;
      }
    },
    /**
     * Delete a token from storage
     */
    async deleteToken(key) {
      logger.debug(`Deleting auth token for ${key}`);
      try {
        const data = await fs.readFile(TOKEN_FILE_PATH, "utf-8");
        const tokens = JSON.parse(data);
        delete tokens[key];
        await fs.writeFile(TOKEN_FILE_PATH, JSON.stringify(tokens));
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
          logger.error("Failed to delete token from file", error);
        }
      }
    },
    /**
     * Clear all tokens from storage
     */
    async clearTokens() {
      logger.debug("Clearing all auth tokens");
      try {
        await fs.unlink(TOKEN_FILE_PATH);
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
          logger.error("Failed to clear tokens", error);
        }
      }
    }
  };
}
function isTokenExpired(token, thresholdSeconds = 0) {
  if (!token.expiresAt) {
    return false;
  }
  const now = Math.floor(Date.now() / 1e3);
  return token.expiresAt - now <= thresholdSeconds;
}

// src/utils/async.ts
function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// ../node_modules/open/index.js
import process6 from "process";
import { Buffer } from "buffer";
import path2 from "path";
import { fileURLToPath } from "url";
import childProcess from "child_process";
import fs5, { constants as fsConstants } from "fs/promises";

// ../node_modules/is-wsl/index.js
import process2 from "process";
import os2 from "os";
import fs4 from "fs";

// ../node_modules/is-inside-container/index.js
import fs3 from "fs";

// ../node_modules/is-docker/index.js
import fs2 from "fs";
var isDockerCached;
function hasDockerEnv() {
  try {
    fs2.statSync("/.dockerenv");
    return true;
  } catch {
    return false;
  }
}
function hasDockerCGroup() {
  try {
    return fs2.readFileSync("/proc/self/cgroup", "utf8").includes("docker");
  } catch {
    return false;
  }
}
function isDocker() {
  if (isDockerCached === void 0) {
    isDockerCached = hasDockerEnv() || hasDockerCGroup();
  }
  return isDockerCached;
}

// ../node_modules/is-inside-container/index.js
var cachedResult;
var hasContainerEnv = () => {
  try {
    fs3.statSync("/run/.containerenv");
    return true;
  } catch {
    return false;
  }
};
function isInsideContainer() {
  if (cachedResult === void 0) {
    cachedResult = hasContainerEnv() || isDocker();
  }
  return cachedResult;
}

// ../node_modules/is-wsl/index.js
var isWsl = () => {
  if (process2.platform !== "linux") {
    return false;
  }
  if (os2.release().toLowerCase().includes("microsoft")) {
    if (isInsideContainer()) {
      return false;
    }
    return true;
  }
  try {
    return fs4.readFileSync("/proc/version", "utf8").toLowerCase().includes("microsoft") ? !isInsideContainer() : false;
  } catch {
    return false;
  }
};
var is_wsl_default = process2.env.__IS_WSL_TEST__ ? isWsl : isWsl();

// ../node_modules/define-lazy-prop/index.js
function defineLazyProperty(object, propertyName, valueGetter) {
  const define = (value) => Object.defineProperty(object, propertyName, { value, enumerable: true, writable: true });
  Object.defineProperty(object, propertyName, {
    configurable: true,
    enumerable: true,
    get() {
      const result = valueGetter();
      define(result);
      return result;
    },
    set(value) {
      define(value);
    }
  });
  return object;
}

// ../node_modules/default-browser/index.js
import { promisify as promisify4 } from "util";
import process5 from "process";
import { execFile as execFile4 } from "child_process";

// ../node_modules/default-browser-id/index.js
import { promisify } from "util";
import process3 from "process";
import { execFile } from "child_process";
var execFileAsync = promisify(execFile);
async function defaultBrowserId() {
  if (process3.platform !== "darwin") {
    throw new Error("macOS only");
  }
  const { stdout } = await execFileAsync("defaults", ["read", "com.apple.LaunchServices/com.apple.launchservices.secure", "LSHandlers"]);
  const match = /LSHandlerRoleAll = "(?!-)(?<id>[^"]+?)";\s+?LSHandlerURLScheme = (?:http|https);/.exec(stdout);
  return match?.groups.id ?? "com.apple.Safari";
}

// ../node_modules/run-applescript/index.js
import process4 from "process";
import { promisify as promisify2 } from "util";
import { execFile as execFile2, execFileSync } from "child_process";
var execFileAsync2 = promisify2(execFile2);
async function runAppleScript(script, { humanReadableOutput = true } = {}) {
  if (process4.platform !== "darwin") {
    throw new Error("macOS only");
  }
  const outputArguments = humanReadableOutput ? [] : ["-ss"];
  const { stdout } = await execFileAsync2("osascript", ["-e", script, outputArguments]);
  return stdout.trim();
}

// ../node_modules/bundle-name/index.js
async function bundleName(bundleId) {
  return runAppleScript(`tell application "Finder" to set app_path to application file id "${bundleId}" as string
tell application "System Events" to get value of property list item "CFBundleName" of property list file (app_path & ":Contents:Info.plist")`);
}

// ../node_modules/default-browser/windows.js
import { promisify as promisify3 } from "util";
import { execFile as execFile3 } from "child_process";
var execFileAsync3 = promisify3(execFile3);
var windowsBrowserProgIds = {
  AppXq0fevzme2pys62n3e0fbqa7peapykr8v: { name: "Edge", id: "com.microsoft.edge.old" },
  MSEdgeDHTML: { name: "Edge", id: "com.microsoft.edge" },
  // On macOS, it's "com.microsoft.edgemac"
  MSEdgeHTM: { name: "Edge", id: "com.microsoft.edge" },
  // Newer Edge/Win10 releases
  "IE.HTTP": { name: "Internet Explorer", id: "com.microsoft.ie" },
  FirefoxURL: { name: "Firefox", id: "org.mozilla.firefox" },
  ChromeHTML: { name: "Chrome", id: "com.google.chrome" },
  BraveHTML: { name: "Brave", id: "com.brave.Browser" },
  BraveBHTML: { name: "Brave Beta", id: "com.brave.Browser.beta" },
  BraveSSHTM: { name: "Brave Nightly", id: "com.brave.Browser.nightly" }
};
var UnknownBrowserError = class extends Error {
};
async function defaultBrowser(_execFileAsync = execFileAsync3) {
  const { stdout } = await _execFileAsync("reg", [
    "QUERY",
    " HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice",
    "/v",
    "ProgId"
  ]);
  const match = /ProgId\s*REG_SZ\s*(?<id>\S+)/.exec(stdout);
  if (!match) {
    throw new UnknownBrowserError(`Cannot find Windows browser in stdout: ${JSON.stringify(stdout)}`);
  }
  const { id } = match.groups;
  const browser = windowsBrowserProgIds[id];
  if (!browser) {
    throw new UnknownBrowserError(`Unknown browser ID: ${id}`);
  }
  return browser;
}

// ../node_modules/default-browser/index.js
var execFileAsync4 = promisify4(execFile4);
var titleize = (string) => string.toLowerCase().replaceAll(/(?:^|\s|-)\S/g, (x) => x.toUpperCase());
async function defaultBrowser2() {
  if (process5.platform === "darwin") {
    const id = await defaultBrowserId();
    const name = await bundleName(id);
    return { name, id };
  }
  if (process5.platform === "linux") {
    const { stdout } = await execFileAsync4("xdg-mime", ["query", "default", "x-scheme-handler/http"]);
    const id = stdout.trim();
    const name = titleize(id.replace(/.desktop$/, "").replace("-", " "));
    return { name, id };
  }
  if (process5.platform === "win32") {
    return defaultBrowser();
  }
  throw new Error("Only macOS, Linux, and Windows are supported");
}

// ../node_modules/open/index.js
var __dirname = path2.dirname(fileURLToPath(import.meta.url));
var localXdgOpenPath = path2.join(__dirname, "xdg-open");
var { platform, arch } = process6;
var getWslDrivesMountPoint = /* @__PURE__ */ (() => {
  const defaultMountPoint = "/mnt/";
  let mountPoint;
  return async function() {
    if (mountPoint) {
      return mountPoint;
    }
    const configFilePath = "/etc/wsl.conf";
    let isConfigFileExists = false;
    try {
      await fs5.access(configFilePath, fsConstants.F_OK);
      isConfigFileExists = true;
    } catch {
    }
    if (!isConfigFileExists) {
      return defaultMountPoint;
    }
    const configContent = await fs5.readFile(configFilePath, { encoding: "utf8" });
    const configMountPoint = /(?<!#.*)root\s*=\s*(?<mountPoint>.*)/g.exec(configContent);
    if (!configMountPoint) {
      return defaultMountPoint;
    }
    mountPoint = configMountPoint.groups.mountPoint.trim();
    mountPoint = mountPoint.endsWith("/") ? mountPoint : `${mountPoint}/`;
    return mountPoint;
  };
})();
var pTryEach = async (array, mapper) => {
  let latestError;
  for (const item of array) {
    try {
      return await mapper(item);
    } catch (error) {
      latestError = error;
    }
  }
  throw latestError;
};
var baseOpen = async (options) => {
  options = {
    wait: false,
    background: false,
    newInstance: false,
    allowNonzeroExitCode: false,
    ...options
  };
  if (Array.isArray(options.app)) {
    return pTryEach(options.app, (singleApp) => baseOpen({
      ...options,
      app: singleApp
    }));
  }
  let { name: app, arguments: appArguments = [] } = options.app ?? {};
  appArguments = [...appArguments];
  if (Array.isArray(app)) {
    return pTryEach(app, (appName) => baseOpen({
      ...options,
      app: {
        name: appName,
        arguments: appArguments
      }
    }));
  }
  if (app === "browser" || app === "browserPrivate") {
    const ids = {
      "com.google.chrome": "chrome",
      "google-chrome.desktop": "chrome",
      "org.mozilla.firefox": "firefox",
      "firefox.desktop": "firefox",
      "com.microsoft.msedge": "edge",
      "com.microsoft.edge": "edge",
      "microsoft-edge.desktop": "edge"
    };
    const flags = {
      chrome: "--incognito",
      firefox: "--private-window",
      edge: "--inPrivate"
    };
    const browser = await defaultBrowser2();
    if (browser.id in ids) {
      const browserName = ids[browser.id];
      if (app === "browserPrivate") {
        appArguments.push(flags[browserName]);
      }
      return baseOpen({
        ...options,
        app: {
          name: apps[browserName],
          arguments: appArguments
        }
      });
    }
    throw new Error(`${browser.name} is not supported as a default browser`);
  }
  let command;
  const cliArguments = [];
  const childProcessOptions = {};
  if (platform === "darwin") {
    command = "open";
    if (options.wait) {
      cliArguments.push("--wait-apps");
    }
    if (options.background) {
      cliArguments.push("--background");
    }
    if (options.newInstance) {
      cliArguments.push("--new");
    }
    if (app) {
      cliArguments.push("-a", app);
    }
  } else if (platform === "win32" || is_wsl_default && !isInsideContainer() && !app) {
    const mountPoint = await getWslDrivesMountPoint();
    command = is_wsl_default ? `${mountPoint}c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe` : `${process6.env.SYSTEMROOT || process6.env.windir || "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell`;
    cliArguments.push(
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand"
    );
    if (!is_wsl_default) {
      childProcessOptions.windowsVerbatimArguments = true;
    }
    const encodedArguments = ["Start"];
    if (options.wait) {
      encodedArguments.push("-Wait");
    }
    if (app) {
      encodedArguments.push(`"\`"${app}\`""`);
      if (options.target) {
        appArguments.push(options.target);
      }
    } else if (options.target) {
      encodedArguments.push(`"${options.target}"`);
    }
    if (appArguments.length > 0) {
      appArguments = appArguments.map((argument) => `"\`"${argument}\`""`);
      encodedArguments.push("-ArgumentList", appArguments.join(","));
    }
    options.target = Buffer.from(encodedArguments.join(" "), "utf16le").toString("base64");
  } else {
    if (app) {
      command = app;
    } else {
      const isBundled = !__dirname || __dirname === "/";
      let exeLocalXdgOpen = false;
      try {
        await fs5.access(localXdgOpenPath, fsConstants.X_OK);
        exeLocalXdgOpen = true;
      } catch {
      }
      const useSystemXdgOpen = process6.versions.electron ?? (platform === "android" || isBundled || !exeLocalXdgOpen);
      command = useSystemXdgOpen ? "xdg-open" : localXdgOpenPath;
    }
    if (appArguments.length > 0) {
      cliArguments.push(...appArguments);
    }
    if (!options.wait) {
      childProcessOptions.stdio = "ignore";
      childProcessOptions.detached = true;
    }
  }
  if (platform === "darwin" && appArguments.length > 0) {
    cliArguments.push("--args", ...appArguments);
  }
  if (options.target) {
    cliArguments.push(options.target);
  }
  const subprocess = childProcess.spawn(command, cliArguments, childProcessOptions);
  if (options.wait) {
    return new Promise((resolve, reject) => {
      subprocess.once("error", reject);
      subprocess.once("close", (exitCode) => {
        if (!options.allowNonzeroExitCode && exitCode > 0) {
          reject(new Error(`Exited with code ${exitCode}`));
          return;
        }
        resolve(subprocess);
      });
    });
  }
  subprocess.unref();
  return subprocess;
};
var open = (target, options) => {
  if (typeof target !== "string") {
    throw new TypeError("Expected a `target`");
  }
  return baseOpen({
    ...options,
    target
  });
};
function detectArchBinary(binary) {
  if (typeof binary === "string" || Array.isArray(binary)) {
    return binary;
  }
  const { [arch]: archBinary } = binary;
  if (!archBinary) {
    throw new Error(`${arch} is not supported`);
  }
  return archBinary;
}
function detectPlatformBinary({ [platform]: platformBinary }, { wsl }) {
  if (wsl && is_wsl_default) {
    return detectArchBinary(wsl);
  }
  if (!platformBinary) {
    throw new Error(`${platform} is not supported`);
  }
  return detectArchBinary(platformBinary);
}
var apps = {};
defineLazyProperty(apps, "chrome", () => detectPlatformBinary({
  darwin: "google chrome",
  win32: "chrome",
  linux: ["google-chrome", "google-chrome-stable", "chromium"]
}, {
  wsl: {
    ia32: "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    x64: ["/mnt/c/Program Files/Google/Chrome/Application/chrome.exe", "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"]
  }
}));
defineLazyProperty(apps, "firefox", () => detectPlatformBinary({
  darwin: "firefox",
  win32: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
  linux: "firefox"
}, {
  wsl: "/mnt/c/Program Files/Mozilla Firefox/firefox.exe"
}));
defineLazyProperty(apps, "edge", () => detectPlatformBinary({
  darwin: "microsoft edge",
  win32: "msedge",
  linux: ["microsoft-edge", "microsoft-edge-dev"]
}, {
  wsl: "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
}));
defineLazyProperty(apps, "browser", () => "browser");
defineLazyProperty(apps, "browserPrivate", () => "browserPrivate");
var open_default = open;

// src/auth/oauth.ts
var DEFAULT_OAUTH_CONFIG = {
  clientId: "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
  // Production client ID from deobfuscated code
  authorizationEndpoint: "https://console.anthropic.com/oauth/authorize",
  tokenEndpoint: "https://api.anthropic.com/v1/oauth/token",
  redirectUri: "http://localhost:54545/callback",
  scopes: ["org:create_api_key", "user:profile", "user:inference"],
  responseType: "code",
  usePkce: true
};
async function performOAuthFlow(config) {
  logger.info("Starting OAuth authentication flow");
  try {
    const { codeVerifier, codeChallenge } = config.usePkce ? generatePkceParams() : { codeVerifier: "", codeChallenge: "" };
    const state = generateRandomString(32);
    const authUrl = buildAuthorizationUrl(config, state, codeChallenge);
    logger.debug(`Opening browser to: ${authUrl}`);
    await open_default(authUrl);
    logger.debug("Starting local server to receive callback");
    const { code, receivedState } = await startLocalServerForCallback(config.redirectUri);
    if (state !== receivedState) {
      throw createUserError("OAuth state mismatch. Authentication may have been tampered with", {
        category: 1 /* AUTHENTICATION */,
        resolution: "Try the authentication process again. If the issue persists, contact support."
      });
    }
    logger.debug("Exchanging code for token");
    const token = await exchangeCodeForToken(config, code, codeVerifier);
    logger.info("OAuth authentication successful");
    return {
      success: true,
      method: "oauth" /* OAUTH */,
      token,
      state: "authenticated" /* AUTHENTICATED */
    };
  } catch (error) {
    logger.error("OAuth authentication failed", error);
    return {
      success: false,
      method: "oauth" /* OAUTH */,
      error: error instanceof Error ? error.message : String(error),
      state: "failed" /* FAILED */
    };
  }
}
async function refreshOAuthToken(refreshToken, config) {
  logger.debug("Refreshing OAuth token");
  try {
    const response = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        ...config.clientSecret ? { client_secret: config.clientSecret } : {},
        grant_type: "refresh_token",
        refresh_token: refreshToken
      }).toString()
    });
    if (!response.ok) {
      const error = await response.text();
      throw createUserError(`Failed to refresh token: ${error}`, {
        category: 1 /* AUTHENTICATION */,
        resolution: "Try logging in again. Your session may have expired."
      });
    }
    const data = await response.json();
    const token = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      // Use existing refresh token if not provided
      expiresAt: Math.floor(Date.now() / 1e3) + (data.expires_in || 3600),
      tokenType: data.token_type || "Bearer",
      scope: data.scope || ""
    };
    logger.debug("Token refreshed successfully");
    return token;
  } catch (error) {
    logger.error("Failed to refresh token", error);
    throw createUserError("Failed to refresh authentication token", {
      cause: error,
      category: 1 /* AUTHENTICATION */,
      resolution: "Try logging in again with the --login flag."
    });
  }
}
function generatePkceParams() {
  const codeVerifier = generateRandomString(64);
  const crypto = __require("crypto");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}
function generateRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
function buildAuthorizationUrl(config, state, codeChallenge) {
  const url = new URL(config.authorizationEndpoint);
  url.searchParams.append("client_id", config.clientId);
  url.searchParams.append("redirect_uri", config.redirectUri);
  url.searchParams.append("response_type", config.responseType);
  url.searchParams.append("state", state);
  if (config.scopes && config.scopes.length > 0) {
    url.searchParams.append("scope", config.scopes.join(" "));
  }
  if (codeChallenge) {
    url.searchParams.append("code_challenge", codeChallenge);
    url.searchParams.append("code_challenge_method", "S256");
  }
  return url.toString();
}
async function startLocalServerForCallback(redirectUri) {
  const { promise, resolve } = createDeferred();
  const url = new URL(redirectUri);
  const port = parseInt(url.port, 10) || 80;
  logger.debug(`Would start local server on port ${port}`);
  setTimeout(() => {
    resolve({
      code: generateRandomString(32),
      receivedState: generateRandomString(32)
    });
  }, 1e3);
  return promise;
}
async function exchangeCodeForToken(config, code, codeVerifier) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    ...config.clientSecret ? { client_secret: config.clientSecret } : {},
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri
  });
  if (codeVerifier) {
    params.append("code_verifier", codeVerifier);
  }
  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: params.toString()
  });
  if (!response.ok) {
    const error = await response.text();
    throw createUserError(`Failed to exchange code for token: ${error}`, {
      category: 1 /* AUTHENTICATION */
    });
  }
  const data = await response.json();
  const token = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Math.floor(Date.now() / 1e3) + (data.expires_in || 3600),
    tokenType: data.token_type || "Bearer",
    scope: data.scope || ""
  };
  return token;
}

// src/auth/manager.ts
import { EventEmitter as EventEmitter2 } from "events";
var AUTH_EVENTS = {
  STATE_CHANGED: "auth:state_changed",
  LOGGED_IN: "auth:logged_in",
  LOGGED_OUT: "auth:logged_out",
  TOKEN_REFRESHED: "auth:token_refreshed",
  ERROR: "auth:error"
};
var AuthManager = class extends EventEmitter2 {
  state = "initial" /* INITIAL */;
  tokenStorage;
  currentToken = null;
  refreshTimer = null;
  tokenKey = "default";
  config;
  /**
   * Create a new AuthManager instance
   */
  constructor(config) {
    super();
    this.config = {
      apiKey: config.api?.key,
      oauth: config.oauth || DEFAULT_OAUTH_CONFIG,
      preferredMethod: config.preferredMethod,
      autoRefresh: config.autoRefresh !== false,
      tokenRefreshThreshold: config.tokenRefreshThreshold || 300,
      // 5 minutes
      maxRetryAttempts: config.maxRetryAttempts || 3
    };
    this.tokenStorage = createTokenStorage();
    logger.debug("Authentication manager created");
  }
  /**
   * Initialize the authentication manager
   */
  async initialize() {
    logger.debug("Initializing authentication manager");
    try {
      this.currentToken = await this.tokenStorage.getToken(this.tokenKey);
      if (this.currentToken) {
        if (isTokenExpired(this.currentToken, this.config.tokenRefreshThreshold)) {
          logger.info("Token expired, attempting to refresh");
          if (this.currentToken.refreshToken) {
            try {
              await this.refreshToken();
            } catch (error) {
              logger.warn("Failed to refresh token, will need to re-authenticate");
              this.currentToken = null;
              this.setState("initial" /* INITIAL */);
            }
          } else {
            logger.warn("No refresh token available, will need to re-authenticate");
            this.currentToken = null;
            this.setState("initial" /* INITIAL */);
          }
        } else {
          logger.info("Valid authentication token found");
          this.setState("authenticated" /* AUTHENTICATED */);
          if (this.config.autoRefresh) {
            this.scheduleTokenRefresh();
          }
        }
      } else {
        logger.info("No authentication token found");
        this.setState("initial" /* INITIAL */);
      }
    } catch (error) {
      logger.error("Error initializing authentication manager", error);
      this.setState("failed" /* FAILED */);
      this.emit(AUTH_EVENTS.ERROR, error);
    }
  }
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.state === "authenticated" /* AUTHENTICATED */ && !!this.currentToken;
  }
  /**
   * Get the current authentication state
   */
  getState() {
    return this.state;
  }
  /**
   * Get the current authentication token
   */
  getToken() {
    return this.currentToken;
  }
  /**
   * Get the authorization header value for API requests
   */
  getAuthorizationHeader() {
    if (!this.currentToken) {
      return null;
    }
    return `${this.currentToken.tokenType} ${this.currentToken.accessToken}`;
  }
  /**
   * Authenticate the user
   */
  async authenticate(method) {
    const authMethod = method || this.config.preferredMethod || (this.config.apiKey ? "api_key" /* API_KEY */ : "oauth" /* OAUTH */);
    logger.info(`Authenticating using ${authMethod} method`);
    this.setState("authenticating" /* AUTHENTICATING */);
    try {
      let result;
      if (authMethod === "api_key" /* API_KEY */) {
        result = await this.authenticateWithApiKey();
      } else {
        result = await this.authenticateWithOAuth();
      }
      if (result.success && result.token) {
        this.currentToken = result.token;
        await this.tokenStorage.saveToken(this.tokenKey, result.token);
        this.setState("authenticated" /* AUTHENTICATED */);
        this.emit(AUTH_EVENTS.LOGGED_IN, { method: authMethod });
        if (this.config.autoRefresh && result.token.refreshToken) {
          this.scheduleTokenRefresh();
        }
      } else {
        this.setState("failed" /* FAILED */);
        this.emit(AUTH_EVENTS.ERROR, result.error);
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Authentication failed: ${errorMessage}`);
      this.setState("failed" /* FAILED */);
      this.emit(AUTH_EVENTS.ERROR, error);
      return {
        success: false,
        error: errorMessage,
        state: "failed" /* FAILED */
      };
    }
  }
  /**
   * Log out the current user
   */
  async logout() {
    logger.info("Logging out user");
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    try {
      await this.tokenStorage.deleteToken(this.tokenKey);
    } catch (error) {
      logger.warn("Error clearing token from storage", error);
    }
    this.currentToken = null;
    this.setState("initial" /* INITIAL */);
    this.emit(AUTH_EVENTS.LOGGED_OUT);
  }
  /**
   * Authenticate using API key
   */
  async authenticateWithApiKey() {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      return {
        success: false,
        error: "No API key available",
        state: "failed" /* FAILED */
      };
    }
    const token = {
      accessToken: apiKey,
      expiresAt: Number.MAX_SAFE_INTEGER,
      // Never expires
      tokenType: "Bearer",
      scope: "all"
    };
    return {
      success: true,
      method: "api_key" /* API_KEY */,
      token,
      state: "authenticated" /* AUTHENTICATED */
    };
  }
  /**
   * Authenticate using OAuth flow
   */
  async authenticateWithOAuth() {
    if (!this.config.oauth) {
      return {
        success: false,
        error: "OAuth configuration not available",
        state: "failed" /* FAILED */
      };
    }
    return performOAuthFlow(this.config.oauth);
  }
  /**
   * Refresh the current token
   */
  async refreshToken() {
    if (!this.currentToken?.refreshToken) {
      throw new Error("No refresh token available");
    }
    if (!this.config.oauth) {
      throw new Error("OAuth configuration not available");
    }
    logger.debug("Refreshing authentication token");
    try {
      const newToken = await refreshOAuthToken(this.currentToken.refreshToken, this.config.oauth);
      this.currentToken = newToken;
      await this.tokenStorage.saveToken(this.tokenKey, newToken);
      this.setState("authenticated" /* AUTHENTICATED */);
      this.emit(AUTH_EVENTS.TOKEN_REFRESHED);
      if (this.config.autoRefresh) {
        this.scheduleTokenRefresh();
      }
    } catch (error) {
      logger.error("Failed to refresh token", error);
      this.setState("failed" /* FAILED */);
      this.emit(AUTH_EVENTS.ERROR, error);
      throw error;
    }
  }
  /**
   * Schedule a token refresh
   */
  scheduleTokenRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (!this.currentToken || !this.currentToken.refreshToken) {
      return;
    }
    const now = Math.floor(Date.now() / 1e3);
    const expiresIn = this.currentToken.expiresAt - now;
    const refreshIn = Math.max(0, expiresIn - this.config.tokenRefreshThreshold);
    logger.debug(`Scheduling token refresh in ${refreshIn} seconds`);
    this.refreshTimer = setTimeout(() => {
      this.refreshToken().catch((error) => {
        logger.error("Scheduled token refresh failed", error);
      });
    }, refreshIn * 1e3);
    if (this.refreshTimer.unref) {
      this.refreshTimer.unref();
    }
  }
  /**
   * Set the new authentication state and emit an event
   */
  setState(newState) {
    if (this.state === newState) {
      return;
    }
    logger.debug(`Authentication state changed: ${this.state} \u2192 ${newState}`);
    this.state = newState;
    this.emit(AUTH_EVENTS.STATE_CHANGED, this.state);
  }
};

// src/auth/index.ts
var authManager = new AuthManager(config_default.get());

// src/ai/unified-client.ts
import { EventEmitter as EventEmitter3 } from "events";
import { performance } from "perf_hooks";

// src/tools/ripgrep.ts
import { exec } from "child_process";
import { promisify as promisify5 } from "util";
var execAsync = promisify5(exec);

// src/ai/index.ts
var aiClient = null;
async function initAI(providedConfig) {
  if (aiClient) {
    logger.debug("AI client already initialized");
    return aiClient;
  }
  logger.info("Initializing AI client");
  try {
    const config = providedConfig || await loadConfig();
    const authToken = authManager.getToken();
    const apiKey = authToken?.accessToken || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Anthropic API key is not configured. Please log in or set ANTHROPIC_API_KEY.");
    }
    aiClient = createClaude4Client(apiKey, config);
    logger.info("AI client initialized successfully");
    return aiClient;
  } catch (error) {
    logger.error("Failed to initialize AI client", error);
    throw error;
  }
}

// src/codebase/analyzer.ts
import path3 from "path";
import fs6 from "fs/promises";
var DEFAULT_IGNORE_PATTERNS = [
  "node_modules",
  "dist",
  "build",
  ".git",
  ".vscode",
  ".idea",
  "coverage",
  "*.min.js",
  "*.bundle.js",
  "*.map"
];
var EXTENSION_TO_LANGUAGE = {
  ts: "TypeScript",
  tsx: "TypeScript (React)",
  js: "JavaScript",
  jsx: "JavaScript (React)",
  py: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  cs: "C#",
  go: "Go",
  rs: "Rust",
  php: "PHP",
  rb: "Ruby",
  swift: "Swift",
  kt: "Kotlin",
  scala: "Scala",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  less: "Less",
  json: "JSON",
  md: "Markdown",
  yml: "YAML",
  yaml: "YAML",
  xml: "XML",
  sql: "SQL",
  sh: "Shell",
  bat: "Batch",
  ps1: "PowerShell"
};
async function analyzeCodebase(directory, options = {}) {
  logger.info(`Analyzing codebase in directory: ${directory}`);
  const {
    ignorePatterns = DEFAULT_IGNORE_PATTERNS,
    maxFiles = 1e3,
    maxSizePerFile = 1024 * 1024
    // 1MB
  } = options;
  if (!await directoryExists(directory)) {
    throw createUserError(`Directory does not exist: ${directory}`, {
      category: 18 /* FILE_NOT_FOUND */,
      resolution: "Please provide a valid directory path."
    });
  }
  const projectStructure = {
    root: directory,
    totalFiles: 0,
    filesByLanguage: {},
    totalLinesOfCode: 0,
    directories: {},
    dependencies: []
  };
  const ignoreRegexes = ignorePatterns.map((pattern) => {
    return new RegExp(
      pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".")
    );
  });
  let allFiles = [];
  try {
    allFiles = await findFiles(directory, {
      recursive: true,
      includeDirectories: false
    });
    allFiles = allFiles.filter((file) => {
      const relativePath = path3.relative(directory, file);
      return !ignoreRegexes.some((regex) => regex.test(relativePath));
    });
    if (allFiles.length > maxFiles) {
      logger.warn(`Codebase has too many files (${allFiles.length}), limiting to ${maxFiles} files`);
      allFiles = allFiles.slice(0, maxFiles);
    }
  } catch (error) {
    logger.error("Failed to scan directory for files", error);
    throw createUserError(`Failed to scan codebase: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
      category: 3 /* FILE_SYSTEM */
    });
  }
  projectStructure.totalFiles = allFiles.length;
  let processedFiles = 0;
  let skippedFiles = 0;
  for (const file of allFiles) {
    try {
      const stats = await fs6.stat(file);
      if (stats.size > maxSizePerFile) {
        logger.debug(`Skipping file (too large): ${file} (${formatFileSize(stats.size)})`);
        skippedFiles++;
        continue;
      }
      const relativePath = path3.relative(directory, file);
      const dirPath = path3.dirname(relativePath);
      if (!projectStructure.directories[dirPath]) {
        projectStructure.directories[dirPath] = [];
      }
      projectStructure.directories[dirPath].push(relativePath);
      const extension = path3.extname(file).slice(1).toLowerCase();
      const language = EXTENSION_TO_LANGUAGE[extension] || "Other";
      projectStructure.filesByLanguage[language] = (projectStructure.filesByLanguage[language] || 0) + 1;
      const content = await readTextFile(file);
      const lineCount = content.split("\n").length;
      projectStructure.totalLinesOfCode += lineCount;
      const dependencies = findDependencies(content, relativePath, extension);
      projectStructure.dependencies.push(...dependencies);
      processedFiles++;
      if (processedFiles % 50 === 0) {
        logger.debug(`Analyzed ${processedFiles} files...`);
      }
    } catch (error) {
      logger.warn(`Failed to analyze file: ${file}`, error);
      skippedFiles++;
    }
  }
  logger.info(`Codebase analysis complete: ${processedFiles} files analyzed, ${skippedFiles} files skipped`);
  logger.debug("Analysis summary", {
    totalFiles: projectStructure.totalFiles,
    totalLinesOfCode: projectStructure.totalLinesOfCode,
    languages: Object.keys(projectStructure.filesByLanguage).length,
    directories: Object.keys(projectStructure.directories).length,
    dependencies: projectStructure.dependencies.length
  });
  return projectStructure;
}
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
function findDependencies(content, filePath, extension) {
  const dependencies = [];
  if (!content || !isCodeFile(extension)) {
    return dependencies;
  }
  try {
    if (["js", "jsx", "ts", "tsx"].includes(extension)) {
      const esImportRegex = /import\s+(?:[\w\s{},*]*\s+from\s+)?['"]([^'"]+)['"]/g;
      let match;
      while ((match = esImportRegex.exec(content)) !== null) {
        const importPath = match[1];
        dependencies.push({
          name: getPackageName(importPath),
          type: "import",
          source: filePath,
          importPath,
          isExternal: isExternalDependency(importPath)
        });
      }
      const requireRegex = /(?:const|let|var)\s+(?:[\w\s{},*]*)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        const importPath = match[1];
        dependencies.push({
          name: getPackageName(importPath),
          type: "require",
          source: filePath,
          importPath,
          isExternal: isExternalDependency(importPath)
        });
      }
    } else if (extension === "py") {
      const importRegex = /^\s*import\s+(\S+)|\s*from\s+(\S+)\s+import/gm;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1] || match[2];
        if (importPath) {
          dependencies.push({
            name: importPath.split(".")[0],
            type: "import",
            source: filePath,
            importPath,
            isExternal: isExternalPythonModule(importPath)
          });
        }
      }
    } else if (extension === "java") {
      const importRegex = /^\s*import\s+([^;]+);/gm;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        dependencies.push({
          name: importPath.split(".")[0],
          type: "import",
          source: filePath,
          importPath,
          isExternal: true
          // Consider all imports as external for Java
        });
      }
    } else if (extension === "rb") {
      const requireRegex = /^\s*require\s+['"]([^'"]+)['"]/gm;
      let match;
      while ((match = requireRegex.exec(content)) !== null) {
        const importPath = match[1];
        dependencies.push({
          name: importPath,
          type: "require",
          source: filePath,
          importPath,
          isExternal: true
          // Consider all requires as external for Ruby
        });
      }
    }
  } catch (error) {
    logger.warn(`Failed to parse dependencies in ${filePath}`, error);
  }
  return dependencies;
}
function isCodeFile(extension) {
  const codeExtensions = [
    "js",
    "jsx",
    "ts",
    "tsx",
    "py",
    "java",
    "c",
    "cpp",
    "cs",
    "go",
    "rs",
    "php",
    "rb",
    "swift",
    "kt",
    "scala"
  ];
  return codeExtensions.includes(extension);
}
function getPackageName(importPath) {
  if (importPath.startsWith(".") || importPath.startsWith("/")) {
    return "internal";
  }
  if (importPath.startsWith("@")) {
    const parts = importPath.split("/");
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  }
  return importPath.split("/")[0];
}
function isExternalDependency(importPath) {
  return !(importPath.startsWith(".") || importPath.startsWith("/"));
}
function isExternalPythonModule(importPath) {
  const stdlibModules = [
    "os",
    "sys",
    "re",
    "math",
    "datetime",
    "time",
    "random",
    "json",
    "csv",
    "collections",
    "itertools",
    "functools",
    "pathlib",
    "shutil",
    "glob",
    "pickle",
    "urllib",
    "http",
    "logging",
    "argparse",
    "unittest",
    "subprocess",
    "threading",
    "multiprocessing",
    "typing",
    "enum",
    "io",
    "tempfile"
  ];
  const moduleName = importPath.split(".")[0];
  return !stdlibModules.includes(moduleName) && !importPath.startsWith(".");
}
async function analyzeProjectDependencies(directory) {
  const dependencies = {};
  try {
    const packageJsonPath = path3.join(directory, "package.json");
    if (await fileExists(packageJsonPath)) {
      const packageJson = JSON.parse(await readTextFile(packageJsonPath));
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          dependencies[name] = version;
        }
      }
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          dependencies[`${name} (dev)`] = version;
        }
      }
    }
    const requirementsPath = path3.join(directory, "requirements.txt");
    if (await fileExists(requirementsPath)) {
      const requirements = await readTextFile(requirementsPath);
      requirements.split("\n").forEach((line) => {
        line = line.trim();
        if (line && !line.startsWith("#")) {
          const [name, version] = line.split("==");
          if (name) {
            dependencies[name.trim()] = version ? version.trim() : "latest";
          }
        }
      });
    }
    const gemfilePath = path3.join(directory, "Gemfile");
    if (await fileExists(gemfilePath)) {
      const gemfile = await readTextFile(gemfilePath);
      const gemRegex = /^\s*gem\s+['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"]\s*)?/gm;
      let match;
      while ((match = gemRegex.exec(gemfile)) !== null) {
        const name = match[1];
        const version = match[2] || "latest";
        if (name) {
          dependencies[name] = version;
        }
      }
    }
  } catch (error) {
    logger.warn("Failed to analyze project dependencies", error);
  }
  return dependencies;
}
async function findFilesByContent(directory, searchTerm, options = {}) {
  const {
    caseSensitive = false,
    fileExtensions = [],
    maxResults = 100,
    ignorePatterns = DEFAULT_IGNORE_PATTERNS
  } = options;
  const results = [];
  const flags = caseSensitive ? "g" : "gi";
  const regex = new RegExp(searchTerm, flags);
  const ignoreRegexes = ignorePatterns.map((pattern) => {
    return new RegExp(
      pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".")
    );
  });
  const allFiles = await findFiles(directory, { recursive: true });
  const filteredFiles = allFiles.filter((file) => {
    const relativePath = path3.relative(directory, file);
    if (ignoreRegexes.some((regex2) => regex2.test(relativePath))) {
      return false;
    }
    if (fileExtensions.length > 0) {
      const ext = path3.extname(file).slice(1).toLowerCase();
      return fileExtensions.includes(ext);
    }
    return true;
  });
  for (const file of filteredFiles) {
    if (results.length >= maxResults) {
      break;
    }
    try {
      const content = await readTextFile(file);
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (regex.test(line)) {
          results.push({
            path: path3.relative(directory, file),
            line: i + 1,
            // 1-indexed line number
            content: line.trim()
          });
          if (results.length >= maxResults) {
            break;
          }
        }
      }
    } catch (error) {
      logger.debug(`Failed to search in file: ${file}`, error);
    }
  }
  return results;
}

// src/codebase/index.ts
var backgroundAnalysis = {
  running: false,
  interval: null,
  lastResults: null,
  workingDirectory: null
};
function initCodebaseAnalysis(config = {}) {
  const analysisConfig = config.codebase || {};
  return {
    /**
     * Analyze the current working directory
     */
    analyzeCurrentDirectory: async (options = {}) => {
      const cwd = process.cwd();
      return analyzeCodebase(cwd, {
        ...analysisConfig,
        ...options
      });
    },
    /**
     * Analyze a specific directory
     */
    analyzeDirectory: async (directoryPath, options = {}) => {
      return analyzeCodebase(directoryPath, {
        ...analysisConfig,
        ...options
      });
    },
    /**
     * Find files by content pattern
     */
    findFiles: async (pattern, directoryPath = process.cwd(), options = {}) => {
      return findFilesByContent(pattern, directoryPath, options);
    },
    /**
     * Analyze project dependencies
     */
    analyzeDependencies: async (directoryPath = process.cwd()) => {
      return analyzeProjectDependencies(directoryPath);
    },
    /**
     * Start background analysis of the current directory
     */
    startBackgroundAnalysis: async (interval = 5 * 60 * 1e3) => {
      if (backgroundAnalysis.running) {
        return;
      }
      backgroundAnalysis.workingDirectory = process.cwd();
      const fs8 = await import("fs/promises");
      try {
        const files = await fs8.readdir(backgroundAnalysis.workingDirectory);
        const hasCodeFiles = files.some(
          (file) => file.endsWith(".js") || file.endsWith(".ts") || file.endsWith(".py") || file.endsWith(".java") || file.endsWith(".cpp") || file.endsWith(".c") || file === "package.json" || file === "requirements.txt" || file === "pom.xml" || file === "Cargo.toml" || file === "go.mod"
        );
        if (!hasCodeFiles) {
          console.log("No code files detected in current directory, skipping background analysis");
          return;
        }
      } catch (error) {
        console.log("Cannot access current directory for analysis:", error instanceof Error ? error.message : String(error));
        return;
      }
      backgroundAnalysis.running = true;
      try {
        const results = await analyzeCodebase(backgroundAnalysis.workingDirectory, analysisConfig);
        backgroundAnalysis.lastResults = results;
      } catch (err) {
        console.log("Background analysis skipped:", err instanceof Error ? err.message : String(err));
        return;
      }
      backgroundAnalysis.interval = setInterval(async () => {
        if (!backgroundAnalysis.running || !backgroundAnalysis.workingDirectory) {
          return;
        }
        try {
          const results = await analyzeCodebase(backgroundAnalysis.workingDirectory, analysisConfig);
          backgroundAnalysis.lastResults = results;
        } catch (err) {
          console.log("Background analysis error:", err instanceof Error ? err.message : String(err));
        }
      }, interval);
    },
    /**
     * Stop background analysis
     */
    stopBackgroundAnalysis: () => {
      if (!backgroundAnalysis.running) {
        return;
      }
      if (backgroundAnalysis.interval) {
        clearInterval(backgroundAnalysis.interval);
        backgroundAnalysis.interval = null;
      }
      backgroundAnalysis.running = false;
    },
    /**
     * Get the latest background analysis results
     */
    getBackgroundAnalysisResults: () => {
      return backgroundAnalysis.lastResults;
    }
  };
}

// src/commands/register.ts
import { table as table2 } from "table";
function registerCommands() {
  logger.debug("Registering commands");
  registerExitCommand();
  registerQuitCommand();
  registerClearCommand();
  registerCommandsCommand();
  registerHelpCommand();
  registerConfigCommand();
  registerThemeCommand();
  registerVerbosityCommand();
  registerRunCommand();
  registerResetCommand();
  registerHistoryCommand();
  logger.info("Commands registered successfully");
}
function registerConfigCommand() {
  logger.debug("Registering config command");
  const command = {
    name: "config",
    description: "View or set configuration values",
    category: "Settings" /* SETTINGS */,
    async handler({ key, value }) {
      logger.info("Executing config command");
      try {
        const configModule = await import("./config-REDD7GPY.js");
        const currentConfig = await configModule.loadConfig();
        if (!key) {
          logger.info("Current configuration:");
          console.log(JSON.stringify(currentConfig, null, 2));
          return;
        }
        const keyPath = key.split(".");
        let configSection = currentConfig;
        for (let i = 0; i < keyPath.length - 1; i++) {
          configSection = configSection[keyPath[i]];
          if (!configSection) {
            throw new Error(`Configuration key '${key}' not found`);
          }
        }
        const finalKey = keyPath[keyPath.length - 1];
        if (value === void 0) {
          const keyValue = configSection[finalKey];
          if (keyValue === void 0) {
            throw new Error(`Configuration key '${key}' not found`);
          }
          logger.info(`${key}: ${JSON.stringify(keyValue)}`);
        } else {
          let parsedValue = value;
          if (value.toLowerCase() === "true") parsedValue = true;
          else if (value.toLowerCase() === "false") parsedValue = false;
          else if (!isNaN(Number(value))) parsedValue = Number(value);
          configSection[finalKey] = parsedValue;
          logger.info(`Configuration updated in memory: ${key} = ${JSON.stringify(parsedValue)}`);
          logger.warn("Note: Configuration changes are only temporary for this session");
        }
      } catch (error) {
        logger.error(`Error executing config command: ${error instanceof Error ? error.message : "Unknown error"}`);
        throw error;
      }
    },
    args: [
      {
        name: "key",
        description: 'Configuration key (e.g., "api.baseUrl")',
        type: "string" /* STRING */,
        required: false
      },
      {
        name: "value",
        description: "New value to set",
        type: "string" /* STRING */,
        required: false
      }
    ]
  };
  commandRegistry.register(command);
}
function registerRunCommand() {
  logger.debug("Registering run command");
  const command = {
    name: "run",
    description: "Execute a terminal command",
    category: "System" /* SYSTEM */,
    async handler(args) {
      logger.info("Executing run command");
      const { command: commandToRun } = args;
      if (!isNonEmptyString(commandToRun)) {
        throw createUserError("Please provide a command to run.", {
          category: 10 /* VALIDATION */,
          resolution: "Please provide a command to execute"
        });
      }
      try {
        logger.info(`Running command: ${commandToRun}`);
        const { exec: exec3 } = await import("child_process");
        const util = await import("util");
        const execPromise = util.promisify(exec3);
        logger.debug(`Executing: ${commandToRun}`);
        const { stdout, stderr } = await execPromise(commandToRun);
        if (stdout) {
          console.log(stdout);
        }
        if (stderr) {
          console.error(stderr);
        }
        logger.info("Command executed successfully");
      } catch (error) {
        logger.error(`Error executing command: ${error instanceof Error ? error.message : "Unknown error"}`);
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
        }
        throw error;
      }
    },
    args: [
      {
        name: "command",
        description: "The command to execute",
        type: "string" /* STRING */,
        required: true
      }
    ]
  };
  commandRegistry.register(command);
}
function registerThemeCommand() {
  logger.debug("Registering theme command");
  const command = {
    name: "theme",
    description: "View or set the theme",
    category: "Settings" /* SETTINGS */,
    async handler(args) {
      logger.info("Executing theme command");
      const theme = args.name;
      if (!isNonEmptyString(theme)) {
        const configModule = await import("./config-REDD7GPY.js");
        const currentConfig = await configModule.loadConfig();
        console.log(`Current theme: ${currentConfig.terminal?.theme || "default"}`);
        return;
      }
      const validThemes = ["dark", "light", "system"];
      if (!validThemes.includes(theme.toLowerCase())) {
        throw createUserError(`Invalid theme: ${theme}`, {
          category: 10 /* VALIDATION */,
          resolution: `Please choose one of: ${validThemes.join(", ")}`
        });
      }
      try {
        const configModule = await import("./config-REDD7GPY.js");
        const currentConfig = await configModule.loadConfig();
        if (currentConfig.terminal) {
          currentConfig.terminal.theme = theme;
        }
        logger.info(`Theme updated to: ${theme}`);
        console.log(`Theme set to: ${theme}`);
        console.log("Note: Theme changes are only temporary for this session. Use the config command to make permanent changes.");
      } catch (error) {
        logger.error(`Error changing theme: ${error instanceof Error ? error.message : "Unknown error"}`);
        throw error;
      }
    },
    args: [
      {
        name: "name",
        description: "Theme name (dark, light, system)",
        type: "string" /* STRING */,
        position: 0,
        required: false
      }
    ]
  };
  commandRegistry.register(command);
}
function registerVerbosityCommand() {
  logger.debug("Registering verbosity command");
  const command = {
    name: "verbosity",
    description: "View or set the logging verbosity level",
    category: "Settings" /* SETTINGS */,
    async handler(args) {
      logger.info("Executing verbosity command");
      const level = args.level;
      try {
        if (!isNonEmptyString(level)) {
          const configModule2 = await import("./config-REDD7GPY.js");
          const currentConfig2 = await configModule2.loadConfig();
          console.log(`Current verbosity level: ${currentConfig2.logger?.level || "info"}`);
          return;
        }
        const { LogLevel: LogLevel2 } = await import("./logger-6SXXIXKS.js");
        let logLevel;
        switch (level.toLowerCase()) {
          case "debug":
            logLevel = LogLevel2.DEBUG;
            break;
          case "info":
            logLevel = LogLevel2.INFO;
            break;
          case "warn":
            logLevel = LogLevel2.WARN;
            break;
          case "error":
            logLevel = LogLevel2.ERROR;
            break;
          case "silent":
            logLevel = LogLevel2.SILENT;
            break;
          default:
            console.error(`Invalid verbosity level: ${level}`);
            return;
        }
        const configModule = await import("./config-REDD7GPY.js");
        const currentConfig = await configModule.loadConfig();
        if (currentConfig.logger) {
          currentConfig.logger.level = level.toLowerCase();
        }
        logger.info(`Verbosity level updated to: ${level}`);
        console.log(`Verbosity level set to: ${level}`);
      } catch (error) {
        logger.error(`Error changing verbosity level: ${error instanceof Error ? error.message : "Unknown error"}`);
        throw error;
      }
    },
    args: [
      {
        name: "level",
        description: "Verbosity level (debug, info, warn, error, silent)",
        type: "string" /* STRING */,
        position: 0,
        required: false
      }
    ]
  };
  commandRegistry.register(command);
}
function registerExitCommand() {
  const command = {
    name: "exit",
    description: "Exit the application",
    category: "Session" /* SESSION */,
    async handler() {
      logger.info("Executing exit command");
      console.log("Exiting Claude Code CLI...");
      process.exit(0);
    }
  };
  commandRegistry.register(command);
}
function registerQuitCommand() {
  const command = {
    name: "quit",
    description: "Exit the application",
    category: "Session" /* SESSION */,
    async handler() {
      logger.info("Executing quit command");
      console.log("Exiting Claude Code CLI...");
      process.exit(0);
    }
  };
  commandRegistry.register(command);
}
function registerClearCommand() {
  const command = {
    name: "clear",
    description: "Clear the terminal screen",
    category: "Session" /* SESSION */,
    async handler() {
      logger.info("Executing clear command");
      process.stdout.write("\x1Bc");
      console.log("Display cleared.");
    }
  };
  commandRegistry.register(command);
}
function registerResetCommand() {
  const command = {
    name: "reset",
    description: "Reset the conversation history",
    category: "Session" /* SESSION */,
    async handler() {
      logger.info("Executing reset command");
      try {
        logger.info("Reinitializing AI client to reset conversation context");
        await initAI();
        console.log("Conversation context has been reset.");
        logger.info("AI client reinitialized, conversation context reset");
      } catch (error) {
        logger.error(`Error resetting conversation context: ${error instanceof Error ? error.message : "Unknown error"}`);
        throw error;
      }
    }
  };
  commandRegistry.register(command);
}
function registerHistoryCommand() {
  const command = {
    name: "history",
    description: "View conversation history",
    category: "Session" /* SESSION */,
    async handler(args) {
      logger.info("Executing history command");
      try {
        const { limit, search, export: exportPath, session } = args;
        const { conversationHistory } = await import("./conversation-history-XB6JGOEN.js");
        try {
          await conversationHistory.initialize();
        } catch (error) {
        }
        if (exportPath && session) {
          try {
            await conversationHistory.exportSession(session, exportPath);
            console.log(`\u2705 Session exported to: ${exportPath}`);
            return;
          } catch (error) {
            console.error(`Failed to export session: ${error instanceof Error ? error.message : "Unknown error"}`);
            return;
          }
        }
        if (search) {
          console.log(`\u{1F50D} Searching for: "${search}"
`);
          const results = await conversationHistory.searchMessages(search, limit || 20);
          if (results.length === 0) {
            console.log("No messages found matching your search.");
            return;
          }
          console.log(`Found ${results.length} matching messages:
`);
          results.forEach((message, index) => {
            const timestamp = new Date(message.timestamp).toLocaleString();
            const role = message.role.toUpperCase().padEnd(9);
            const preview = message.content.length > 100 ? message.content.substring(0, 100) + "..." : message.content;
            console.log(`${index + 1}. [${timestamp}] ${role} ${preview}`);
            if (message.metadata?.command) {
              console.log(`   Command: /${message.metadata.command}`);
            }
            if (message.metadata?.file) {
              console.log(`   File: ${message.metadata.file}`);
            }
            console.log("");
          });
          return;
        }
        if (session) {
          try {
            const sessionData = await conversationHistory.loadSession(session);
            console.log(`\u{1F4D6} Session: ${sessionData.title || sessionData.id}`);
            console.log(`Started: ${new Date(sessionData.startTime).toLocaleString()}`);
            if (sessionData.endTime) {
              console.log(`Ended: ${new Date(sessionData.endTime).toLocaleString()}`);
            }
            if (sessionData.stats) {
              console.log(`Messages: ${sessionData.stats.messageCount}, Tokens: ${sessionData.stats.totalTokens}`);
            }
            console.log("");
            const messagesToShow = limit ? sessionData.messages.slice(-limit) : sessionData.messages;
            messagesToShow.forEach((message, index) => {
              const timestamp = new Date(message.timestamp).toLocaleTimeString();
              const role = message.role.toUpperCase().padEnd(9);
              console.log(`[${timestamp}] ${role} ${message.content}`);
              if (message.metadata?.tokens) {
                console.log(`   Tokens: ${message.metadata.tokens.input} in, ${message.metadata.tokens.output} out`);
              }
              console.log("");
            });
            return;
          } catch (error) {
            console.error(`Session not found: ${session}`);
            return;
          }
        }
        const sessions = await conversationHistory.listSessions();
        if (sessions.length === 0) {
          console.log("\u{1F4DC} No conversation history available.");
          console.log("Start a conversation to begin tracking history.");
          return;
        }
        const sessionsToShow = sessions.slice(0, limit || 10);
        console.log(`\u{1F4DC} Recent Sessions (showing ${sessionsToShow.length} of ${sessions.length}):
`);
        sessionsToShow.forEach((session2, index) => {
          const startTime = new Date(session2.startTime).toLocaleString();
          const duration = session2.endTime ? Math.round((session2.endTime - session2.startTime) / 1e3 / 60) + " min" : "ongoing";
          console.log(`${index + 1}. ${session2.title}`);
          console.log(`   ID: ${session2.id}`);
          console.log(`   Started: ${startTime} (${duration})`);
          console.log(`   Messages: ${session2.messageCount}`);
          console.log("");
        });
        console.log("\u{1F4A1} Use the following commands to explore history:");
        console.log("   /history --session <session-id>     View specific session");
        console.log("   /history --search <query>           Search messages");
        console.log("   /history --export <path> --session <id>  Export session");
      } catch (error) {
        logger.error(`Error retrieving conversation history: ${error instanceof Error ? error.message : "Unknown error"}`);
        console.error("Failed to retrieve conversation history. History tracking may be disabled.");
      }
    },
    args: [
      {
        name: "limit",
        description: "Maximum number of items to display",
        type: "number" /* NUMBER */,
        shortFlag: "l",
        required: false,
        default: 10
      },
      {
        name: "search",
        description: "Search for messages containing this text",
        type: "string" /* STRING */,
        shortFlag: "s",
        required: false
      },
      {
        name: "session",
        description: "Show or export a specific session by ID",
        type: "string" /* STRING */,
        required: false
      },
      {
        name: "export",
        description: "Export session to file (requires --session)",
        type: "string" /* STRING */,
        shortFlag: "e",
        required: false
      }
    ]
  };
  commandRegistry.register(command);
}
function registerCommandsCommand() {
  const command = {
    name: "commands",
    description: "List all available commands",
    category: "Help" /* HELP */,
    async handler() {
      logger.info("Executing commands command");
      try {
        const allCommands = commandRegistry.list().sort((a, b) => {
          if (a.category && b.category) {
            if (a.category !== b.category) {
              return a.category.localeCompare(b.category);
            }
          } else if (a.category) {
            return -1;
          } else if (b.category) {
            return 1;
          }
          return a.name.localeCompare(b.name);
        });
        const categories = /* @__PURE__ */ new Map();
        const uncategorizedCommands = [];
        for (const cmd of allCommands) {
          if (cmd.category) {
            if (!categories.has(cmd.category)) {
              categories.set(cmd.category, []);
            }
            categories.get(cmd.category).push(cmd);
          } else {
            uncategorizedCommands.push(cmd);
          }
        }
        console.log("Available slash commands:\n");
        if (uncategorizedCommands.length > 0) {
          for (const cmd of uncategorizedCommands) {
            console.log(`/${cmd.name.padEnd(15)} ${cmd.description}`);
          }
          console.log("");
        }
        for (const [category, commands] of categories.entries()) {
          console.log(`${category}:`);
          for (const cmd of commands) {
            console.log(`  /${cmd.name.padEnd(13)} ${cmd.description}`);
          }
          console.log("");
        }
        console.log("For more information on a specific command, use:");
        console.log("  /help <command>");
      } catch (error) {
        logger.error(`Error listing commands: ${error instanceof Error ? error.message : "Unknown error"}`);
        throw error;
      }
    }
  };
  commandRegistry.register(command);
}
function registerHelpCommand() {
  logger.debug("Registering help command");
  const createUsage = (command2) => {
    const helpText = [];
    command2.args?.forEach((arg) => {
      if (arg.position === void 0) {
        helpText.push(`[--${arg.name}]`);
      } else {
        helpText.push(`<${arg.name}>`);
      }
    });
    return helpText.join(" ");
  };
  const command = {
    name: "help",
    description: "Get help for a specific command",
    category: "Help" /* HELP */,
    async handler(args) {
      logger.info("Executing help command");
      const commandName = args.command;
      if (!isNonEmptyString(commandName)) {
        throw createUserError("Command name is required", {
          category: 10 /* VALIDATION */,
          resolution: "Please provide a command name to get help for"
        });
      }
      try {
        const command2 = commandRegistry.get(commandName);
        if (!command2) {
          throw createUserError(`Command not found: ${commandName}`, {
            category: 10 /* VALIDATION */,
            resolution: "Please check the command name and try again"
          });
        }
        console.log(`Command: ${command2.name}`);
        console.log(`Description: ${command2.description}`);
        if (command2.category) {
          console.log(`Category: ${command2.category}`);
        }
        console.log("\nUsage:");
        if (command2.args && command2.args.length > 0) {
          console.log(`  /${command2.name} ${command2.args.map((arg) => arg.name).join(" ")}`);
        } else {
          console.log(`  /${command2.name}`);
        }
        if (command2.args && command2.args.length > 0) {
          console.log("\nArguments:");
          for (const arg of command2.args) {
            console.log(`  ${arg.name}: ${arg.description}`);
          }
        }
        logger.info("Help information retrieved");
      } catch (error) {
        logger.error(`Error retrieving help: ${error instanceof Error ? error.message : "Unknown error"}`);
        throw error;
      }
    },
    args: [
      {
        name: "command",
        description: "The command to get help for",
        type: "string" /* STRING */,
        position: 0,
        required: true
      }
    ]
  };
  commandRegistry.register(command);
}

// src/fileops/index.ts
import { promises as fs7 } from "fs";
import path4 from "path";
var FileOperationsManager = class {
  config;
  workspacePath;
  /**
   * Create a new file operations manager
   */
  constructor(config) {
    this.config = config;
    this.workspacePath = config.workspacePath || process.cwd();
    logger.debug("File operations manager created", {
      workspacePath: this.workspacePath
    });
  }
  /**
   * Initialize file operations
   */
  async initialize() {
    logger.info("Initializing file operations manager");
    try {
      const stats = await fs7.stat(this.workspacePath);
      if (!stats.isDirectory()) {
        throw createUserError(`Workspace path is not a directory: ${this.workspacePath}`, {
          category: 3 /* FILE_SYSTEM */
        });
      }
      logger.info("File operations manager initialized");
    } catch (error) {
      if (error.code === "ENOENT") {
        throw createUserError(`Workspace directory does not exist: ${this.workspacePath}`, {
          category: 3 /* FILE_SYSTEM */,
          resolution: "Please provide a valid workspace path"
        });
      }
      logger.error("Failed to initialize file operations manager", error);
      throw createUserError("Failed to initialize file operations", {
        cause: error,
        category: 3 /* FILE_SYSTEM */
      });
    }
  }
  /**
   * Get absolute path relative to workspace
   */
  getAbsolutePath(relativePath) {
    const normalizedPath = path4.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
    return path4.resolve(this.workspacePath, normalizedPath);
  }
  /**
   * Get relative path from workspace
   */
  getRelativePath(absolutePath) {
    return path4.relative(this.workspacePath, absolutePath);
  }
  /**
   * Read a file
   */
  async readFile(filePath) {
    const absolutePath = this.getAbsolutePath(filePath);
    logger.debug("Reading file", { path: filePath, absolutePath });
    try {
      const stats = await fs7.stat(absolutePath);
      if (!stats.isFile()) {
        return {
          success: false,
          error: createUserError(`Not a file: ${filePath}`, {
            category: 3 /* FILE_SYSTEM */
          })
        };
      }
      const maxSizeBytes = this.config.fileOps?.maxReadSizeBytes || 10 * 1024 * 1024;
      if (stats.size > maxSizeBytes) {
        return {
          success: false,
          error: createUserError(`File too large to read: ${filePath} (${stats.size} bytes)`, {
            category: 3 /* FILE_SYSTEM */,
            resolution: "Try reading a smaller file or use a text editor to open this file"
          })
        };
      }
      const content = await fs7.readFile(absolutePath, "utf8");
      return {
        success: true,
        path: filePath,
        content
      };
    } catch (error) {
      logger.error(`Error reading file: ${filePath}`, error);
      const errnoError = error;
      if (errnoError.code === "ENOENT") {
        return {
          success: false,
          error: createUserError(`File not found: ${filePath}`, {
            category: 3 /* FILE_SYSTEM */,
            resolution: "Check that the file exists and the path is correct"
          })
        };
      }
      if (errnoError.code === "EACCES") {
        return {
          success: false,
          error: createUserError(`Permission denied reading file: ${filePath}`, {
            category: 3 /* FILE_SYSTEM */,
            resolution: "Check file permissions or try running with elevated privileges"
          })
        };
      }
      return {
        success: false,
        error: createUserError(`Failed to read file: ${filePath}`, {
          cause: error,
          category: 3 /* FILE_SYSTEM */
        })
      };
    }
  }
  /**
   * Write a file
   */
  async writeFile(filePath, content, options = {}) {
    const absolutePath = this.getAbsolutePath(filePath);
    logger.debug("Writing file", {
      path: filePath,
      absolutePath,
      contentLength: content.length,
      createDirs: options.createDirs
    });
    try {
      let fileExists2 = false;
      let isCreating = false;
      try {
        const stats = await fs7.stat(absolutePath);
        fileExists2 = stats.isFile();
      } catch (error) {
        const errnoError = error;
        if (errnoError.code === "ENOENT") {
          isCreating = true;
          if (options.createDirs) {
            const dirPath = path4.dirname(absolutePath);
            await fs7.mkdir(dirPath, { recursive: true });
          }
        } else {
          throw error;
        }
      }
      await fs7.writeFile(absolutePath, content, "utf8");
      return {
        success: true,
        path: filePath,
        created: isCreating
      };
    } catch (error) {
      logger.error(`Error writing file: ${filePath}`, error);
      const errnoError = error;
      if (errnoError.code === "ENOENT") {
        return {
          success: false,
          error: createUserError(`Directory does not exist: ${path4.dirname(filePath)}`, {
            category: 3 /* FILE_SYSTEM */,
            resolution: "Use the createDirs option to create parent directories"
          })
        };
      }
      if (errnoError.code === "EACCES") {
        return {
          success: false,
          error: createUserError(`Permission denied writing file: ${filePath}`, {
            category: 3 /* FILE_SYSTEM */,
            resolution: "Check file permissions or try running with elevated privileges"
          })
        };
      }
      return {
        success: false,
        error: createUserError(`Failed to write file: ${filePath}`, {
          cause: error,
          category: 3 /* FILE_SYSTEM */
        })
      };
    }
  }
  /**
   * Delete a file
   */
  async deleteFile(filePath) {
    const absolutePath = this.getAbsolutePath(filePath);
    logger.debug("Deleting file", { path: filePath, absolutePath });
    try {
      const stats = await fs7.stat(absolutePath);
      if (!stats.isFile()) {
        return {
          success: false,
          error: createUserError(`Not a file: ${filePath}`, {
            category: 3 /* FILE_SYSTEM */
          })
        };
      }
      await fs7.unlink(absolutePath);
      return {
        success: true,
        path: filePath
      };
    } catch (error) {
      logger.error(`Error deleting file: ${filePath}`, error);
      const errnoError = error;
      if (errnoError.code === "ENOENT") {
        return {
          success: false,
          error: createUserError(`File not found: ${filePath}`, {
            category: 3 /* FILE_SYSTEM */
          })
        };
      }
      if (errnoError.code === "EACCES") {
        return {
          success: false,
          error: createUserError(`Permission denied deleting file: ${filePath}`, {
            category: 3 /* FILE_SYSTEM */,
            resolution: "Check file permissions or try running with elevated privileges"
          })
        };
      }
      return {
        success: false,
        error: createUserError(`Failed to delete file: ${filePath}`, {
          cause: error,
          category: 3 /* FILE_SYSTEM */
        })
      };
    }
  }
  /**
   * Check if a file exists
   */
  async fileExists(filePath) {
    const absolutePath = this.getAbsolutePath(filePath);
    try {
      const stats = await fs7.stat(absolutePath);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }
  /**
   * Create a directory
   */
  async createDirectory(dirPath, options = {}) {
    const absolutePath = this.getAbsolutePath(dirPath);
    logger.debug("Creating directory", {
      path: dirPath,
      absolutePath,
      recursive: options.recursive
    });
    try {
      await fs7.mkdir(absolutePath, { recursive: options.recursive !== false });
      return {
        success: true,
        path: dirPath
      };
    } catch (error) {
      logger.error(`Error creating directory: ${dirPath}`, error);
      const errnoError = error;
      if (errnoError.code === "EEXIST") {
        return {
          success: false,
          error: createUserError(`Directory already exists: ${dirPath}`, {
            category: 3 /* FILE_SYSTEM */
          })
        };
      }
      if (errnoError.code === "EACCES") {
        return {
          success: false,
          error: createUserError(`Permission denied creating directory: ${dirPath}`, {
            category: 3 /* FILE_SYSTEM */,
            resolution: "Check file permissions or try running with elevated privileges"
          })
        };
      }
      return {
        success: false,
        error: createUserError(`Failed to create directory: ${dirPath}`, {
          cause: error,
          category: 3 /* FILE_SYSTEM */
        })
      };
    }
  }
  /**
   * List directory contents
   */
  async listDirectory(dirPath) {
    const absolutePath = this.getAbsolutePath(dirPath);
    logger.debug("Listing directory", { path: dirPath, absolutePath });
    try {
      const stats = await fs7.stat(absolutePath);
      if (!stats.isDirectory()) {
        return {
          success: false,
          error: createUserError(`Not a directory: ${dirPath}`, {
            category: 3 /* FILE_SYSTEM */
          })
        };
      }
      const files = await fs7.readdir(absolutePath);
      return {
        success: true,
        path: dirPath,
        files
      };
    } catch (error) {
      logger.error(`Error listing directory: ${dirPath}`, error);
      const errnoError = error;
      if (errnoError.code === "ENOENT") {
        return {
          success: false,
          error: createUserError(`Directory not found: ${dirPath}`, {
            category: 3 /* FILE_SYSTEM */
          })
        };
      }
      if (errnoError.code === "EACCES") {
        return {
          success: false,
          error: createUserError(`Permission denied listing directory: ${dirPath}`, {
            category: 3 /* FILE_SYSTEM */,
            resolution: "Check directory permissions or try running with elevated privileges"
          })
        };
      }
      return {
        success: false,
        error: createUserError(`Failed to list directory: ${dirPath}`, {
          cause: error,
          category: 3 /* FILE_SYSTEM */
        })
      };
    }
  }
  /**
   * Generate a diff between two strings
   */
  generateDiff(original, modified) {
    const originalLines = original.split("\n");
    const modifiedLines = modified.split("\n");
    const diff = [];
    let i = 0, j = 0;
    while (i < originalLines.length || j < modifiedLines.length) {
      if (i >= originalLines.length) {
        diff.push(`+ ${modifiedLines[j]}`);
        j++;
      } else if (j >= modifiedLines.length) {
        diff.push(`- ${originalLines[i]}`);
        i++;
      } else if (originalLines[i] === modifiedLines[j]) {
        diff.push(`  ${originalLines[i]}`);
        i++;
        j++;
      } else {
        diff.push(`- ${originalLines[i]}`);
        diff.push(`+ ${modifiedLines[j]}`);
        i++;
        j++;
      }
    }
    return diff.join("\n");
  }
  /**
   * Apply a patch to a file
   */
  async applyPatch(filePath, patch) {
    return this.writeFile(filePath, patch);
  }
};
async function initFileOperations(config) {
  logger.info("Initializing file operations system");
  try {
    const fileOps = new FileOperationsManager(config);
    await fileOps.initialize();
    logger.info("File operations system initialized successfully");
    return fileOps;
  } catch (error) {
    logger.error("Failed to initialize file operations system", error);
    return new FileOperationsManager(config);
  }
}

// src/execution/index.ts
import { exec as exec2, spawn } from "child_process";
var DANGEROUS_COMMANDS = [
  /^\s*rm\s+(-rf?|--recursive)\s+[\/~]/i,
  // rm -rf / or similar
  /^\s*dd\s+.*of=\/dev\/(disk|hd|sd)/i,
  // dd to a device
  /^\s*mkfs/i,
  // Format a filesystem
  /^\s*:\(\)\{\s*:\|:\s*&\s*\}\s*;/,
  // Fork bomb
  /^\s*>(\/dev\/sd|\/dev\/hd)/,
  // Overwrite disk device
  /^\s*sudo\s+.*(rm|mkfs|dd|chmod|chown)/i
  // sudo with dangerous commands
];
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_MAX_BUFFER = 5 * 1024 * 1024;
var ExecutionEnvironment = class {
  config;
  backgroundProcesses = /* @__PURE__ */ new Map();
  executionCount = 0;
  workingDirectory;
  environmentVariables;
  /**
   * Create a new execution environment
   */
  constructor(config) {
    this.config = config;
    this.workingDirectory = config.execution?.cwd || process.cwd();
    this.environmentVariables = {
      ...process.env,
      CLAUDE_CODE_VERSION: config.version || "0.2.29",
      NODE_ENV: config.env || "production",
      ...config.execution?.env || {}
    };
    logger.debug("Execution environment created", {
      workingDirectory: this.workingDirectory
    });
  }
  /**
   * Initialize the execution environment
   */
  async initialize() {
    logger.info("Initializing execution environment");
    try {
      const shell = this.config.execution?.shell || process.env.SHELL || "bash";
      await this.executeCommand(`${shell} -c "echo Shell is available"`, {
        timeout: 5e3
      });
      logger.info("Execution environment initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize execution environment", error);
      throw createUserError("Failed to initialize command execution environment", {
        cause: error,
        category: 4 /* COMMAND_EXECUTION */,
        resolution: "Check that your shell is properly configured"
      });
    }
  }
  /**
   * Execute a shell command
   */
  async executeCommand(command, options = {}) {
    this.executionCount++;
    this.validateCommand(command);
    const cwd = options.cwd || this.workingDirectory;
    const env = { ...this.environmentVariables, ...options.env || {} };
    const timeout = options.timeout || DEFAULT_TIMEOUT;
    const maxBuffer = options.maxBuffer || DEFAULT_MAX_BUFFER;
    const shell = options.shell || this.config.execution?.shell || process.env.SHELL || "bash";
    const captureStderr = options.captureStderr !== false;
    logger.debug("Executing command", {
      command,
      cwd,
      shell,
      timeout,
      executionCount: this.executionCount
    });
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      exec2(command, {
        cwd,
        env,
        timeout,
        maxBuffer,
        shell,
        windowsHide: true,
        encoding: "utf8"
      }, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        const output = captureStderr ? `${stdout}${stderr ? stderr : ""}` : stdout;
        if (error) {
          logger.error(`Command execution failed: ${command}`, {
            error: error.message,
            exitCode: error.code,
            duration
          });
          resolve({
            output,
            exitCode: error.code || 1,
            error,
            command,
            duration
          });
        } else {
          logger.debug(`Command executed successfully: ${command}`, {
            duration,
            outputLength: output.length
          });
          resolve({
            output,
            exitCode: 0,
            command,
            duration
          });
        }
      });
    });
  }
  /**
   * Execute a command in the background
   */
  executeCommandInBackground(command, options = {}) {
    this.validateCommand(command);
    const cwd = options.cwd || this.workingDirectory;
    const env = { ...this.environmentVariables, ...options.env || {} };
    const shell = options.shell || this.config.execution?.shell || process.env.SHELL || "bash";
    logger.debug("Executing command in background", {
      command,
      cwd,
      shell
    });
    const childProcess2 = spawn(command, [], {
      cwd,
      env,
      shell,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const pid = childProcess2.pid;
    let isRunning = true;
    if (childProcess2.stdout) {
      childProcess2.stdout.on("data", (data) => {
        const output = data.toString("utf8");
        logger.debug(`Background command (pid ${pid}) output:`, { output });
        if (options.onOutput) {
          options.onOutput(output);
        }
      });
    }
    if (childProcess2.stderr) {
      childProcess2.stderr.on("data", (data) => {
        const errorOutput = data.toString("utf8");
        logger.debug(`Background command (pid ${pid}) error:`, { errorOutput });
        if (options.onError) {
          options.onError(errorOutput);
        }
      });
    }
    childProcess2.on("exit", (code) => {
      isRunning = false;
      logger.debug(`Background command (pid ${pid}) exited with code ${code}`);
      this.backgroundProcesses.delete(pid);
      if (options.onExit) {
        options.onExit(code);
      }
    });
    const backgroundProcess = {
      pid,
      kill: () => {
        if (isRunning) {
          childProcess2.kill();
          isRunning = false;
          this.backgroundProcesses.delete(pid);
          return true;
        }
        return false;
      },
      isRunning: true
    };
    this.backgroundProcesses.set(pid, backgroundProcess);
    return backgroundProcess;
  }
  /**
   * Kill all running background processes
   */
  killAllBackgroundProcesses() {
    logger.info(`Killing ${this.backgroundProcesses.size} background processes`);
    for (const process7 of this.backgroundProcesses.values()) {
      try {
        process7.kill();
      } catch (error) {
        logger.warn(`Failed to kill process ${process7.pid}`, error);
      }
    }
    this.backgroundProcesses.clear();
  }
  /**
   * Validate a command for safety
   */
  validateCommand(command) {
    for (const pattern of DANGEROUS_COMMANDS) {
      if (pattern.test(command)) {
        throw createUserError(`Command execution blocked: '${command}' matches dangerous pattern`, {
          category: 4 /* COMMAND_EXECUTION */,
          resolution: "This command is blocked for safety reasons. Please use a different command."
        });
      }
    }
    if (this.config.execution?.allowedCommands && this.config.execution.allowedCommands.length > 0) {
      const allowed = this.config.execution.allowedCommands.some(
        (allowedPattern) => {
          if (typeof allowedPattern === "string") {
            return command.startsWith(allowedPattern);
          } else {
            return allowedPattern.test(command);
          }
        }
      );
      if (!allowed) {
        throw createUserError(`Command execution blocked: '${command}' is not in the allowed list`, {
          category: 4 /* COMMAND_EXECUTION */,
          resolution: "This command is not allowed by your configuration."
        });
      }
    }
  }
  /**
   * Set the working directory
   */
  setWorkingDirectory(directory) {
    this.workingDirectory = directory;
    logger.debug(`Working directory set to: ${directory}`);
  }
  /**
   * Get the working directory
   */
  getWorkingDirectory() {
    return this.workingDirectory;
  }
  /**
   * Set an environment variable
   */
  setEnvironmentVariable(name, value) {
    this.environmentVariables[name] = value;
    logger.debug(`Environment variable set: ${name}=${value}`);
  }
  /**
   * Get an environment variable
   */
  getEnvironmentVariable(name) {
    return this.environmentVariables[name];
  }
};
async function initExecutionEnvironment(config) {
  logger.info("Initializing execution environment");
  try {
    const executionEnv = new ExecutionEnvironment(config);
    await executionEnv.initialize();
    logger.info("Execution environment initialized successfully");
    return executionEnv;
  } catch (error) {
    logger.error("Failed to initialize execution environment", error);
    return new ExecutionEnvironment(config);
  }
}

// src/tools/mcp-client.ts
import { EventEmitter as EventEmitter4 } from "events";
import { spawn as spawn2 } from "child_process";
var MCPClient = class extends EventEmitter4 {
  servers = /* @__PURE__ */ new Map();
  tools = /* @__PURE__ */ new Map();
  constructor() {
    super();
  }
  async connectServer(config) {
    logger.info(`Connecting to MCP server: ${config.name}`);
    try {
      const process7 = new MCPServerProcess(config);
      await process7.connect();
      this.servers.set(config.name, process7);
      const tools = await process7.discoverTools();
      for (const tool of tools) {
        const toolName = `${config.name}__${tool.name}`;
        this.tools.set(toolName, tool);
      }
      this.emit("server:connected", config.name);
      logger.info(`MCP server connected: ${config.name} (${tools.length} tools)`);
    } catch (error) {
      logger.error(`Failed to connect MCP server ${config.name}:`, error);
      this.emit("server:error", config.name, error);
      throw createUserError(`Failed to connect to MCP server: ${config.name}`, {
        cause: error,
        category: 16 /* CONNECTION */
      });
    }
  }
  async disconnectServer(serverName) {
    const server = this.servers.get(serverName);
    if (server) {
      await server.disconnect();
      this.servers.delete(serverName);
      for (const [toolName, tool] of this.tools.entries()) {
        if (toolName.startsWith(`${serverName}__`)) {
          this.tools.delete(toolName);
        }
      }
      this.emit("server:disconnected", serverName);
      logger.info(`MCP server disconnected: ${serverName}`);
    }
  }
  getServerStatus(serverName) {
    const server = this.servers.get(serverName);
    return server ? server.status : "disconnected" /* DISCONNECTED */;
  }
  getAllServers() {
    return new Map(this.servers);
  }
  getAllTools() {
    return new Map(this.tools);
  }
  async executeTool(toolName, parameters) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw createUserError(`MCP tool not found: ${toolName}`, {
        category: 23 /* COMMAND_NOT_FOUND */
      });
    }
    const [serverName] = toolName.split("__");
    const server = this.servers.get(serverName);
    if (!server || server.status !== "connected" /* CONNECTED */) {
      throw createUserError(`MCP server not available: ${serverName}`, {
        category: 16 /* CONNECTION */
      });
    }
    return await server.executeToolCall(tool.name, parameters);
  }
  async disconnectAll() {
    const disconnectPromises = Array.from(this.servers.keys()).map(
      (serverName) => this.disconnectServer(serverName)
    );
    await Promise.all(disconnectPromises);
  }
};
var MCPServerProcess = class {
  constructor(config) {
    this.config = config;
  }
  process = null;
  _status = "disconnected" /* DISCONNECTED */;
  get status() {
    return this._status;
  }
  async connect() {
    this._status = "connecting" /* CONNECTING */;
    try {
      this.process = spawn2(this.config.command, this.config.args || [], {
        env: { ...process.env, ...this.config.env },
        cwd: this.config.cwd || process.cwd(),
        stdio: ["pipe", "pipe", "pipe"]
      });
      this.process.on("error", (error) => {
        logger.error(`MCP server process error (${this.config.name}):`, error);
        this._status = "error" /* ERROR */;
      });
      this.process.on("exit", (code, signal) => {
        logger.info(`MCP server exited (${this.config.name}): code=${code}, signal=${signal}`);
        this._status = "disconnected" /* DISCONNECTED */;
      });
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, this.config.timeout || 1e4);
        this.process.stdout.once("data", () => {
          clearTimeout(timeout);
          this._status = "connected" /* CONNECTED */;
          resolve(void 0);
        });
      });
    } catch (error) {
      this._status = "error" /* ERROR */;
      throw error;
    }
  }
  async disconnect() {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
    this._status = "disconnected" /* DISCONNECTED */;
  }
  async discoverTools() {
    if (!this.process || this._status !== "connected" /* CONNECTED */) {
      throw new Error("Server not connected");
    }
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list"
    };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Tool discovery timeout"));
      }, this.config.timeout || 1e4);
      this.process.stdout.once("data", (data) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          if (response.result && response.result.tools) {
            resolve(response.result.tools);
          } else {
            resolve([]);
          }
        } catch (error) {
          reject(error);
        }
      });
      this.process.stdin.write(JSON.stringify(request) + "\n");
    });
  }
  async executeToolCall(toolName, parameters) {
    if (!this.process || this._status !== "connected" /* CONNECTED */) {
      throw new Error("Server not connected");
    }
    const request = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: parameters
      }
    };
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Tool execution timeout"));
      }, this.config.timeout || 3e4);
      this.process.stdout.once("data", (data) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString());
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        } catch (error) {
          reject(error);
        }
      });
      this.process.stdin.write(JSON.stringify(request) + "\n");
    });
  }
};
var mcpClient = new MCPClient();

// src/index.ts
async function initialize() {
  try {
    const config = await loadConfig();
    logger.setLevel(config.logger?.level || 1 /* INFO */);
    const terminal = await initTerminal(config);
    await authManager.initialize();
    const ai = await initAI(config);
    const codebase = await initCodebaseAnalysis(config);
    const fileOps = await initFileOperations(config);
    const execution = await initExecutionEnvironment(config);
    registerCommands();
    return {
      config,
      terminal,
      auth: authManager,
      ai,
      codebase,
      fileOps,
      execution,
      telemetry
    };
  } catch (error) {
    logger.error("Failed to initialize application", error);
    process.exit(1);
  }
}
async function startInteractiveSession(app) {
  try {
    logger.info("Starting interactive session");
    const startupWarnings = [];
    if (!authManager.isAuthenticated()) {
      startupWarnings.push("Not authenticated. Some features may be limited. Use /login to authenticate.");
    }
    const mcpServers = app.config.mcp?.servers || {};
    if (Object.keys(mcpServers).length > 0) {
      logger.info("Initializing MCP servers...");
      for (const [name, config] of Object.entries(mcpServers)) {
        try {
          await mcpClient.connectServer({ name, ...config });
        } catch (error) {
          logger.warn(`Failed to connect MCP server ${name}:`, error);
          startupWarnings.push(`MCP server '${name}' failed to connect`);
        }
      }
    }
    app.terminal.displayWelcome();
    if (startupWarnings.length > 0) {
      app.terminal.warn("Startup warnings:");
      startupWarnings.forEach((warning) => app.terminal.warn(`  \u2022 ${warning}`));
      app.terminal.info("");
    }
    await startInteractiveLoop(app);
    logger.info("Interactive session ended");
  } catch (error) {
    logger.error("Error in interactive session", error);
    throw error;
  }
}
async function startInteractiveLoop(app) {
  const { commandRegistry: commandRegistry2 } = await import("./commands-XNKDW7QI.js");
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    app.terminal.warn("Non-interactive terminal detected. Exiting interactive mode.");
    app.terminal.info("Use specific commands instead of interactive mode.");
    return;
  }
  while (true) {
    try {
      const input = await app.terminal.prompt({
        type: "input",
        name: "command",
        message: "\u276F"
      });
      if (!input.command || input.command.trim() === "") {
        continue;
      }
      const trimmedInput = input.command.trim();
      if (["exit", "quit", "q"].includes(trimmedInput.toLowerCase())) {
        break;
      }
      if (trimmedInput.startsWith("/")) {
        await handleSlashCommand(trimmedInput, app);
        continue;
      }
      await handleAIQuery(trimmedInput, app);
    } catch (error) {
      if (error instanceof Error && error.message.includes("User force closed")) {
        break;
      }
      if (error instanceof Error && error.message.includes("non-interactive terminal")) {
        app.terminal.warn("Cannot prompt in non-interactive terminal. Exiting.");
        break;
      }
      app.terminal.error(`Error: ${formatErrorForDisplay(error)}`);
    }
  }
  await mcpClient.disconnectAll();
}
async function handleSlashCommand(input, app) {
  const { commandRegistry: commandRegistry2, executeCommand } = await import("./commands-XNKDW7QI.js");
  const parts = input.slice(1).split(" ");
  const commandName = parts[0];
  const args = parts.slice(1);
  try {
    await executeCommand(commandName, args);
  } catch (error) {
    app.terminal.error(`Command failed: ${formatErrorForDisplay(error)}`);
  }
}
async function handleAIQuery(input, app) {
  try {
    app.terminal.info("Asking Claude...\n");
    const aiClient2 = app.ai;
    if (!aiClient2) {
      app.terminal.error("AI client not available. Please check your authentication.");
      return;
    }
    const spinner = app.terminal.spinner("Processing...");
    try {
      const result = await aiClient2.query(input);
      spinner.succeed("Response received");
      const responseText = result.message.content.filter((block) => block.type === "text").map((block) => block.text).join("\n") || "No response received";
      app.terminal.display(responseText);
      if (result.usage) {
        app.terminal.info(`
Tokens: ${result.usage.input_tokens} in, ${result.usage.output_tokens} out`);
      }
    } catch (error) {
      spinner.fail("Request failed");
      throw error;
    }
  } catch (error) {
    app.terminal.error(`AI query failed: ${formatErrorForDisplay(error)}`);
  }
}
function setupProcessHandlers(app) {
  process.on("SIGINT", () => {
    app.terminal.info("Caught interrupt signal. Exiting gracefully.");
    process.exit(0);
  });
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection", reason);
    console.error("An unexpected error occurred. Please check the logs.");
  });
}
export {
  initialize,
  setupProcessHandlers,
  startInteractiveSession
};
//# sourceMappingURL=-QBBUU7H4.js.map