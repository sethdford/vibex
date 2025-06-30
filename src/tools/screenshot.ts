/**
 * Screenshot Tool
 * 
 * Provides functionality to capture terminal output and screen content
 * for feedback, debugging, and documentation purposes.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';

const execAsync = promisify(exec);

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
  /**
   * Output file path (optional, will generate one if not provided)
   */
  outputPath?: string;
  
  /**
   * Screenshot type
   */
  type: 'terminal' | 'screen' | 'window';
  
  /**
   * Quality (1-100, higher is better quality)
   */
  quality?: number;
  
  /**
   * Include cursor in screenshot
   */
  includeCursor?: boolean;
  
  /**
   * Delay before taking screenshot (in milliseconds)
   */
  delay?: number;
}

/**
 * Screenshot result
 */
export interface ScreenshotResult {
  /**
   * Path to the saved screenshot
   */
  filePath: string;
  
  /**
   * File size in bytes
   */
  fileSize: number;
  
  /**
   * Timestamp when screenshot was taken
   */
  timestamp: number;
  
  /**
   * Screenshot dimensions
   */
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Take a screenshot
 */
export async function takeScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
  const platform = os.platform();
  
  // Generate output path if not provided
  const outputPath = options.outputPath || generateScreenshotPath();
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  
  try {
    // Add delay if specified
    if (options.delay && options.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }
    
    let command: string;
    
    switch (platform) {
      case 'darwin': // macOS
        command = await buildMacOSCommand(options, outputPath);
        break;
      case 'linux':
        command = await buildLinuxCommand(options, outputPath);
        break;
      case 'win32':
        command = await buildWindowsCommand(options, outputPath);
        break;
      default:
        throw createUserError(`Screenshot not supported on platform: ${platform}`, {
          category: ErrorCategory.UNKNOWN,
          resolution: 'Screenshots are supported on macOS, Linux, and Windows'
        });
    }
    
    logger.debug(`Executing screenshot command: ${command}`);
    
    // Execute the screenshot command
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('Warning')) {
      logger.warn(`Screenshot command stderr: ${stderr}`);
    }
    
    // Verify the file was created
    const stats = await fs.stat(outputPath);
    
    const result: ScreenshotResult = {
      filePath: outputPath,
      fileSize: stats.size,
      timestamp: Date.now()
    };
    
    // Try to get dimensions (if possible)
    try {
      const dimensions = await getImageDimensions(outputPath);
      if (dimensions) {
        result.dimensions = dimensions;
      }
    } catch (error) {
      // Dimensions are optional, don't fail if we can't get them
      logger.debug('Could not get image dimensions:', error);
    }
    
    logger.info(`Screenshot saved: ${outputPath} (${stats.size} bytes)`);
    return result;
    
  } catch (error) {
    throw createUserError(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
      category: ErrorCategory.COMMAND_EXECUTION,
      resolution: 'Check that screenshot tools are installed and permissions are correct'
    });
  }
}

/**
 * Build macOS screenshot command
 */
async function buildMacOSCommand(options: ScreenshotOptions, outputPath: string): Promise<string> {
  const args: string[] = [];
  
  switch (options.type) {
    case 'screen':
      // Full screen
      break;
    case 'window':
      args.push('-w'); // Interactive window selection
      break;
    case 'terminal':
      // Try to capture the current terminal window
      args.push('-w');
      break;
  }
  
  if (!options.includeCursor) {
    args.push('-C'); // Don't include cursor
  }
  
  if (options.delay && options.delay > 0) {
    args.push('-T', String(options.delay / 1000)); // Convert to seconds
  }
  
  args.push(outputPath);
  
  return `screencapture ${args.join(' ')}`;
}

/**
 * Build Linux screenshot command
 */
async function buildLinuxCommand(options: ScreenshotOptions, outputPath: string): Promise<string> {
  // Try different screenshot tools in order of preference
  const tools = ['gnome-screenshot', 'scrot', 'import'];
  
  for (const tool of tools) {
    try {
      await execAsync(`which ${tool}`);
      return buildLinuxCommandForTool(tool, options, outputPath);
    } catch {
      // Tool not found, try next one
    }
  }
  
  throw createUserError('No screenshot tool found. Please install gnome-screenshot, scrot, or ImageMagick', {
    category: ErrorCategory.COMMAND_NOT_FOUND,
    resolution: 'Install a screenshot tool: sudo apt install gnome-screenshot'
  });
}

/**
 * Build Linux command for specific tool
 */
function buildLinuxCommandForTool(tool: string, options: ScreenshotOptions, outputPath: string): string {
  switch (tool) {
    case 'gnome-screenshot':
      const gnomeArgs: string[] = ['-f', outputPath];
      if (options.type === 'window') {
        gnomeArgs.push('-w');
      }
      if (options.delay && options.delay > 0) {
        gnomeArgs.push('-d', String(options.delay / 1000));
      }
      return `gnome-screenshot ${gnomeArgs.join(' ')}`;
      
    case 'scrot':
      const scrotArgs: string[] = [outputPath];
      if (options.type === 'window') {
        scrotArgs.unshift('-s'); // Select window/area
      }
      if (options.delay && options.delay > 0) {
        scrotArgs.unshift('-d', String(options.delay / 1000));
      }
      if (options.quality) {
        scrotArgs.unshift('-q', String(options.quality));
      }
      return `scrot ${scrotArgs.join(' ')}`;
      
    case 'import':
      const importArgs: string[] = [];
      if (options.type === 'window') {
        importArgs.push('-window', 'root'); // This will need refinement
      } else {
        importArgs.push('-window', 'root');
      }
      importArgs.push(outputPath);
      return `import ${importArgs.join(' ')}`;
      
    default:
      throw new Error(`Unsupported tool: ${tool}`);
  }
}

/**
 * Build Windows screenshot command
 */
async function buildWindowsCommand(options: ScreenshotOptions, outputPath: string): Promise<string> {
  // Use PowerShell for Windows screenshots
  const script = `
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms
    
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bitmap.Save('${outputPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
  `;
  
  return `powershell -Command "${script.replace(/\n\s*/g, '; ')}"`;
}

/**
 * Generate a unique screenshot file path
 */
function generateScreenshotPath(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screenshot-${timestamp}.png`;
  
  // Save to user's home directory or temp directory
  const homeDir = os.homedir();
  const screenshotDir = path.join(homeDir, '.claude-code', 'screenshots');
  
  return path.join(screenshotDir, filename);
}

/**
 * Get image dimensions (if possible)
 */
async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number } | null> {
  try {
    // Try using ImageMagick's identify command
    const { stdout } = await execAsync(`identify -format "%wx%h" "${imagePath}"`);
    const match = stdout.trim().match(/^(\d+)x(\d+)$/);
    if (match) {
      return {
        width: parseInt(match[1], 10),
        height: parseInt(match[2], 10)
      };
    }
  } catch {
    // ImageMagick not available or failed
  }
  
  try {
    // Try using file command (less reliable but more widely available)
    const { stdout } = await execAsync(`file "${imagePath}"`);
    const match = stdout.match(/(\d+)\s*x\s*(\d+)/);
    if (match) {
      return {
        width: parseInt(match[1], 10),
        height: parseInt(match[2], 10)
      };
    }
  } catch {
    // file command failed
  }
  
  return null;
}

/**
 * Capture terminal output as text
 */
export async function captureTerminalOutput(lines: number = 50): Promise<string> {
  const platform = os.platform();
  
  try {
    let command: string;
    
    switch (platform) {
      case 'darwin':
        // Use script command to capture terminal history
        command = `script -q /dev/null history | tail -${lines}`;
        break;
      case 'linux':
        // Use history command
        command = `history ${lines}`;
        break;
      default:
        // Fallback: capture recent commands from shell history
        command = `tail -${lines} ~/.bash_history || tail -${lines} ~/.zsh_history || echo "No shell history available"`;
    }
    
    const { stdout } = await execAsync(command);
    return stdout;
    
  } catch (error) {
    logger.warn('Could not capture terminal output:', error);
    return 'Terminal output capture not available';
  }
}

/**
 * Create screenshot tool definition for the tool registry
 */
export function createScreenshotTool() {
  return {
    name: 'take_screenshot',
    description: 'Take a screenshot for feedback or documentation',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['terminal', 'screen', 'window'],
          description: 'Type of screenshot to take'
        },
        outputPath: {
          type: 'string',
          description: 'Path where to save the screenshot (optional)'
        },
        delay: {
          type: 'number',
          description: 'Delay in milliseconds before taking screenshot'
        },
        quality: {
          type: 'number',
          description: 'Image quality (1-100)'
        }
      },
      required: ['type']
    }
  };
}

/**
 * Execute screenshot tool
 */
export async function executeScreenshot(input: any) {
  try {
    const options: ScreenshotOptions = {
      type: input.type || 'screen',
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