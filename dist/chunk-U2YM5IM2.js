import {
  UserError,
  logger
} from "./chunk-3Y4ABCUV.js";

// src/commands/types.ts
var ArgType = /* @__PURE__ */ ((ArgType2) => {
  ArgType2["STRING"] = "string";
  ArgType2["NUMBER"] = "number";
  ArgType2["BOOLEAN"] = "boolean";
  ArgType2["ARRAY"] = "array";
  return ArgType2;
})(ArgType || {});
var CommandCategory = /* @__PURE__ */ ((CommandCategory2) => {
  CommandCategory2["AI"] = "AI";
  CommandCategory2["AUTH"] = "Auth";
  CommandCategory2["ASSISTANCE"] = "Assistance";
  CommandCategory2["CODE_GENERATION"] = "Code Generation";
  CommandCategory2["DEV"] = "Development";
  CommandCategory2["HELP"] = "Help";
  CommandCategory2["SESSION"] = "Session";
  CommandCategory2["SETTINGS"] = "Settings";
  CommandCategory2["SUPPORT"] = "Support";
  CommandCategory2["SYSTEM"] = "System";
  CommandCategory2["UTILITY"] = "Utility";
  return CommandCategory2;
})(CommandCategory || {});

// src/commands/index.ts
var CommandRegistry = class {
  commands = /* @__PURE__ */ new Map();
  aliases = /* @__PURE__ */ new Map();
  register(command) {
    if (this.commands.has(command.name)) {
      logger.warn(`Command ${command.name} is already registered. Overwriting.`);
    }
    this.commands.set(command.name, command);
    if (command.aliases) {
      command.aliases.forEach((alias) => {
        if (this.aliases.has(alias)) {
          logger.warn(`Alias ${alias} is already registered. Overwriting.`);
        }
        this.aliases.set(alias, command.name);
      });
    }
  }
  get(name) {
    const commandName = this.aliases.get(name) || name;
    return this.commands.get(commandName);
  }
  list() {
    return Array.from(this.commands.values());
  }
  getCategories() {
    const categories = /* @__PURE__ */ new Set();
    this.commands.forEach((cmd) => {
      if (cmd.category) {
        categories.add(cmd.category);
      }
    });
    return Array.from(categories).sort();
  }
  getByCategory(category) {
    return this.list().filter((cmd) => cmd.category === category);
  }
};
var commandRegistry = new CommandRegistry();
function generateCommandHelp(command) {
  let help = `Usage: ${command.name}`;
  if (command.args) {
    help += ` ${command.args.map((a) => `<${a.name}>`).join(" ")}`;
  }
  help += `

${command.description}
`;
  if (command.args && command.args.length > 0) {
    help += "\nArguments:\n";
    command.args.forEach((arg) => {
      help += `  ${arg.name}	${arg.description}
`;
    });
  }
  return help;
}
async function executeCommand(commandName, args) {
  const command = commandRegistry.get(commandName);
  if (!command) {
    throw new UserError(`Unknown command: ${commandName}`);
  }
  const parsedArgs = parseArguments(args, command.args || []);
  await command.handler(parsedArgs);
}
function parseArguments(args, argDefs) {
  const parsed = {};
  const positionalDefs = argDefs.filter((d) => d.position !== void 0).sort((a, b) => a.position - b.position);
  let positionalIndex = 0;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("-")) {
      const def = argDefs.find((d) => `-${d.shortFlag}` === arg || `--${d.name}` === arg);
      if (def) {
        if (def.type === "boolean" /* BOOLEAN */) {
          parsed[def.name] = true;
        } else {
          if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
            parsed[def.name] = convertArgumentType(args[i + 1], def.type);
            i++;
          } else {
            if (def.required) {
              throw new UserError(`Missing value for argument: ${def.name}`);
            }
          }
        }
      } else {
        throw new UserError(`Unknown option: ${arg}`);
      }
    } else {
      if (positionalIndex < positionalDefs.length) {
        const def = positionalDefs[positionalIndex];
        parsed[def.name] = convertArgumentType(arg, def.type);
        positionalIndex++;
      }
    }
  }
  for (const def of argDefs) {
    if (def.required && parsed[def.name] === void 0) {
      throw new UserError(`Missing required argument: ${def.name}`);
    }
  }
  return parsed;
}
function convertArgumentType(value, type) {
  switch (type) {
    case "string" /* STRING */:
      return value;
    case "number" /* NUMBER */:
      const numberValue = parseFloat(value);
      if (isNaN(numberValue)) {
        throw new UserError(`Invalid number provided for argument: ${value}`);
      }
      return numberValue;
    case "boolean" /* BOOLEAN */:
      return value.toLowerCase() === "true" || value === "1";
    case "array" /* ARRAY */:
      return value.split(",");
    default:
      return value;
  }
}

export {
  ArgType,
  CommandCategory,
  commandRegistry,
  generateCommandHelp,
  executeCommand
};
//# sourceMappingURL=chunk-U2YM5IM2.js.map