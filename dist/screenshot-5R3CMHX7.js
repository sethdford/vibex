import {
  createUserError
} from "./chunk-65SYJAJO.js";
import {
  logger
} from "./chunk-3Y4ABCUV.js";
import "./chunk-PR4QN5HX.js";

// src/tools/screenshot.ts
import { exec } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
var execAsync = promisify(exec);
async function takeScreenshot(options) {
  const platform = os.platform();
  const outputPath = options.outputPath || generateScreenshotPath();
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  try {
    if (options.delay && options.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }
    let command;
    switch (platform) {
      case "darwin":
        command = await buildMacOSCommand(options, outputPath);
        break;
      case "linux":
        command = await buildLinuxCommand(options, outputPath);
        break;
      case "win32":
        command = await buildWindowsCommand(options, outputPath);
        break;
      default:
        throw createUserError(`Screenshot not supported on platform: ${platform}`, {
          category: 8 /* UNKNOWN */,
          resolution: "Screenshots are supported on macOS, Linux, and Windows"
        });
    }
    logger.debug(`Executing screenshot command: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes("Warning")) {
      logger.warn(`Screenshot command stderr: ${stderr}`);
    }
    const stats = await fs.stat(outputPath);
    const result = {
      filePath: outputPath,
      fileSize: stats.size,
      timestamp: Date.now()
    };
    try {
      const dimensions = await getImageDimensions(outputPath);
      if (dimensions) {
        result.dimensions = dimensions;
      }
    } catch (error) {
      logger.debug("Could not get image dimensions:", error);
    }
    logger.info(`Screenshot saved: ${outputPath} (${stats.size} bytes)`);
    return result;
  } catch (error) {
    throw createUserError(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
      category: 4 /* COMMAND_EXECUTION */,
      resolution: "Check that screenshot tools are installed and permissions are correct"
    });
  }
}
async function buildMacOSCommand(options, outputPath) {
  const args = [];
  switch (options.type) {
    case "screen":
      break;
    case "window":
      args.push("-w");
      break;
    case "terminal":
      args.push("-w");
      break;
  }
  if (!options.includeCursor) {
    args.push("-C");
  }
  if (options.delay && options.delay > 0) {
    args.push("-T", String(options.delay / 1e3));
  }
  args.push(outputPath);
  return `screencapture ${args.join(" ")}`;
}
async function buildLinuxCommand(options, outputPath) {
  const tools = ["gnome-screenshot", "scrot", "import"];
  for (const tool of tools) {
    try {
      await execAsync(`which ${tool}`);
      return buildLinuxCommandForTool(tool, options, outputPath);
    } catch {
    }
  }
  throw createUserError("No screenshot tool found. Please install gnome-screenshot, scrot, or ImageMagick", {
    category: 23 /* COMMAND_NOT_FOUND */,
    resolution: "Install a screenshot tool: sudo apt install gnome-screenshot"
  });
}
function buildLinuxCommandForTool(tool, options, outputPath) {
  switch (tool) {
    case "gnome-screenshot":
      const gnomeArgs = ["-f", outputPath];
      if (options.type === "window") {
        gnomeArgs.push("-w");
      }
      if (options.delay && options.delay > 0) {
        gnomeArgs.push("-d", String(options.delay / 1e3));
      }
      return `gnome-screenshot ${gnomeArgs.join(" ")}`;
    case "scrot":
      const scrotArgs = [outputPath];
      if (options.type === "window") {
        scrotArgs.unshift("-s");
      }
      if (options.delay && options.delay > 0) {
        scrotArgs.unshift("-d", String(options.delay / 1e3));
      }
      if (options.quality) {
        scrotArgs.unshift("-q", String(options.quality));
      }
      return `scrot ${scrotArgs.join(" ")}`;
    case "import":
      const importArgs = [];
      if (options.type === "window") {
        importArgs.push("-window", "root");
      } else {
        importArgs.push("-window", "root");
      }
      importArgs.push(outputPath);
      return `import ${importArgs.join(" ")}`;
    default:
      throw new Error(`Unsupported tool: ${tool}`);
  }
}
async function buildWindowsCommand(options, outputPath) {
  const script = `
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms
    
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bitmap.Save('${outputPath.replace(/\\/g, "\\\\")}', [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
  `;
  return `powershell -Command "${script.replace(/\n\s*/g, "; ")}"`;
}
function generateScreenshotPath() {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const filename = `screenshot-${timestamp}.png`;
  const homeDir = os.homedir();
  const screenshotDir = path.join(homeDir, ".claude-code", "screenshots");
  return path.join(screenshotDir, filename);
}
async function getImageDimensions(imagePath) {
  try {
    const { stdout } = await execAsync(`identify -format "%wx%h" "${imagePath}"`);
    const match = stdout.trim().match(/^(\d+)x(\d+)$/);
    if (match) {
      return {
        width: parseInt(match[1], 10),
        height: parseInt(match[2], 10)
      };
    }
  } catch {
  }
  try {
    const { stdout } = await execAsync(`file "${imagePath}"`);
    const match = stdout.match(/(\d+)\s*x\s*(\d+)/);
    if (match) {
      return {
        width: parseInt(match[1], 10),
        height: parseInt(match[2], 10)
      };
    }
  } catch {
  }
  return null;
}
async function captureTerminalOutput(lines = 50) {
  const platform = os.platform();
  try {
    let command;
    switch (platform) {
      case "darwin":
        command = `script -q /dev/null history | tail -${lines}`;
        break;
      case "linux":
        command = `history ${lines}`;
        break;
      default:
        command = `tail -${lines} ~/.bash_history || tail -${lines} ~/.zsh_history || echo "No shell history available"`;
    }
    const { stdout } = await execAsync(command);
    return stdout;
  } catch (error) {
    logger.warn("Could not capture terminal output:", error);
    return "Terminal output capture not available";
  }
}
function createScreenshotTool() {
  return {
    name: "take_screenshot",
    description: "Take a screenshot for feedback or documentation",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["terminal", "screen", "window"],
          description: "Type of screenshot to take"
        },
        outputPath: {
          type: "string",
          description: "Path where to save the screenshot (optional)"
        },
        delay: {
          type: "number",
          description: "Delay in milliseconds before taking screenshot"
        },
        quality: {
          type: "number",
          description: "Image quality (1-100)"
        }
      },
      required: ["type"]
    }
  };
}
async function executeScreenshot(input) {
  try {
    const options = {
      type: input.type || "screen",
      outputPath: input.outputPath,
      delay: input.delay || 0,
      quality: input.quality || 85,
      includeCursor: input.includeCursor !== false
    };
    const result = await takeScreenshot(options);
    return {
      success: true,
      result: {
        message: `Screenshot saved to ${result.filePath}`,
        filePath: result.filePath,
        fileSize: result.fileSize,
        dimensions: result.dimensions
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
export {
  captureTerminalOutput,
  createScreenshotTool,
  executeScreenshot,
  takeScreenshot
};
//# sourceMappingURL=screenshot-5R3CMHX7.js.map