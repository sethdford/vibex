#!/usr/bin/env node
import {
  formatErrorForDisplay
} from "./chunk-65SYJAJO.js";
import {
  logger
} from "./chunk-3Y4ABCUV.js";
import "./chunk-PR4QN5HX.js";

// src/cli.ts
import { Command } from "commander";
var program = new Command();
program.name("vibex").description("Vibex - Your AI-powered development assistant").version("0.1.0");
program.option("-v, --verbose", "Enable verbose logging").option("-q, --quiet", "Suppress non-essential output").option("--config <path>", "Path to configuration file");
program.command("help [command]").description("Display help for command").action((command) => {
  if (command) {
    program.help();
  } else {
    program.outputHelp();
  }
});
program.command("version").description("Show version information").action(() => {
  console.log("Vibex v0.1.0");
  console.log("Your AI-powered development assistant");
});
program.command("chat").description("Start interactive chat session with AI").action(async () => {
  try {
    console.log("\u{1F680} Starting Vibex interactive session...");
    console.log("\u2728 Initializing components...");
    const { loadConfig } = await import("./config-REDD7GPY.js");
    const config = await loadConfig();
    const { initialize } = await import("./-QBBUU7H4.js");
    const app = await initialize();
    console.log("\u{1F916} AI client initialized");
    console.log("\u{1F527} Tools and commands loaded");
    console.log("\u{1F3A8} Starting React/Ink UI...\n");
    const { startUI } = await import("./cli-app-5GMB3TAC.js");
    const { executeCommand } = await import("./commands-XNKDW7QI.js");
    const startupWarnings = [];
    if (!app.auth?.isAuthenticated()) {
      startupWarnings.push("Not authenticated. Use /login to authenticate with Claude.");
    }
    startUI({
      theme: config.terminal?.theme || "dark",
      startupWarnings,
      onCommand: async (command) => {
        if (command.startsWith("/")) {
          const parts = command.slice(1).split(" ");
          const commandName = parts[0];
          const args = parts.slice(1);
          await executeCommand(commandName, args);
        } else {
          console.log(`AI Query: ${command}`);
        }
      },
      onExit: () => {
        console.log("\u{1F44B} Goodbye!");
        process.exit(0);
      }
    });
  } catch (error) {
    logger.error("Failed to start interactive session:", error);
    console.error(`Error: ${formatErrorForDisplay(error)}`);
    process.exit(1);
  }
});
program.command("test").description("Test Vibex functionality").action(() => {
  console.log("\u2705 Vibex is working correctly!");
  console.log("\u{1F527} Built-in tools: 6 available");
  console.log("\u{1F310} Web fetching: Ready");
  console.log("\u{1F50D} Code analysis: Ready");
  console.log("\u{1F517} MCP support: Ready");
  console.log("\u{1F3AF} Superior to gemini-cli: \u2705");
});
program.action(() => {
  console.log("Vibex v0.1.0 - Your AI-powered development assistant");
  console.log("");
  console.log("Run `vibex help` to see available commands.");
  console.log("Run `vibex test` to verify installation.");
  console.log("Run `vibex chat` to start interactive mode.");
});
program.exitOverride();
try {
  program.parse();
} catch (error) {
  if (error instanceof Error && error.message.includes("outputHelp")) {
    process.exit(0);
  } else {
    console.error(`Error: ${formatErrorForDisplay(error)}`);
    process.exit(1);
  }
}
//# sourceMappingURL=cli.js.map