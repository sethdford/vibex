/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool, ToolConfirmationOutcome } from '../../domain/tool/tool-interfaces';
import {
  Tool,
  ToolResult,
  ToolExecutionOptions,
  ToolConfirmationDetails
} from '../../domain/tool/tool-interfaces';
import { createScreenshotTool, executeScreenshot } from '../../../tools/screenshot';

/**
 * Adapter for the Screenshot tool
 * 
 * This adapter wraps the screenshot tool to fit into the Clean Architecture
 * tool interface. It provides functionality to capture terminal output and
 * screen content for feedback, debugging, and documentation.
 */
export class ScreenshotTool extends BaseTool {
  /**
   * Constructor
   */
  constructor() {
    // Get tool definition from legacy tool
    const screenshotTool = createScreenshotTool();
    
    super(
      'take_screenshot',
      'Take a screenshot of the screen, a window, or terminal for documentation and debugging',
      {
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
            description: 'Delay in milliseconds before taking screenshot (useful for UI setup)',
            default: 0
          },
          quality: {
            type: 'number',
            description: 'Image quality (1-100)',
            default: 85
          },
          includeCursor: {
            type: 'boolean',
            description: 'Whether to include the cursor in the screenshot',
            default: true
          }
        },
        required: ['type']
      }
    );
  }
  
  /**
   * Execute screenshot capture
   */
  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    try {
      // Cast params to the right type
      const typedParams = params as {
        type: string;
        outputPath?: string;
        delay?: number;
        quality?: number;
        includeCursor?: boolean;
      };
      
      // Report progress start
      if (options?.onProgress) {
        options.onProgress({
          message: 'Preparing to take screenshot...'
        });
      }
      
      // Handle delay with progress updates
      const delay = typedParams.delay || 0;
      if (delay > 0 && options?.onProgress) {
        options.onProgress({
          message: `Waiting ${delay}ms before capture...`,
          percentage: 25
        });
        
        // We don't actually need to wait here since the screenshot tool handles delay
      }
      
      // Report progress update
      if (options?.onProgress) {
        options.onProgress({
          message: `Taking ${typedParams.type} screenshot...`,
          percentage: 50
        });
      }
      
      // Execute screenshot capture
      const startTime = Date.now();
      const screenshotResult = await executeScreenshot(typedParams);
      const executionTime = Date.now() - startTime;
      
      if (options?.onProgress) {
        options.onProgress({
          message: 'Screenshot captured',
          percentage: 100
        });
      }
      
      // Handle failed screenshot
      if (!screenshotResult.success) {
        return {
          success: false,
          error: new Error(screenshotResult.error || 'Screenshot failed'),
          callId: options?.callId || 'unknown',
          executionTime
        };
      }
      
      // Return successful result
      if (!screenshotResult.result) {
        return {
          success: false,
          error: new Error('Screenshot result is empty'),
          callId: options?.callId || 'unknown',
          executionTime
        };
      }

      return {
        success: true,
        data: {
          message: screenshotResult.result.message,
          filePath: screenshotResult.result.filePath,
          fileSize: screenshotResult.result.fileSize,
          dimensions: screenshotResult.result.dimensions
        },
        callId: options?.callId || 'unknown',
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        callId: options?.callId || 'unknown',
        executionTime: 0
      };
    }
  }
  
  /**
   * Validate input parameters
   */
  validateParams(params: unknown): string | null {
    if (!params || typeof params !== 'object') {
      return 'Parameters must be an object';
    }
    
    const typedParams = params as Record<string, unknown>;
    
    if (!typedParams.type) {
      return 'Missing required parameter: type';
    }
    
    if (typeof typedParams.type !== 'string') {
      return 'Parameter type must be a string';
    }
    
    const validTypes = ['terminal', 'screen', 'window'];
    if (!validTypes.includes(typedParams.type)) {
      return `Parameter type must be one of: ${validTypes.join(', ')}`;
    }
    
    if (typedParams.outputPath !== undefined && typeof typedParams.outputPath !== 'string') {
      return 'Parameter outputPath must be a string';
    }
    
    if (typedParams.delay !== undefined) {
      if (typeof typedParams.delay !== 'number') {
        return 'Parameter delay must be a number';
      }
      
      if (typedParams.delay < 0 || typedParams.delay > 30000) {
        return 'Parameter delay must be between 0 and 30000 milliseconds';
      }
    }
    
    if (typedParams.quality !== undefined) {
      if (typeof typedParams.quality !== 'number') {
        return 'Parameter quality must be a number';
      }
      
      if (typedParams.quality < 1 || typedParams.quality > 100) {
        return 'Parameter quality must be between 1 and 100';
      }
    }
    
    if (typedParams.includeCursor !== undefined && typeof typedParams.includeCursor !== 'boolean') {
      return 'Parameter includeCursor must be a boolean';
    }
    
    return null;
  }
  
  /**
   * Check if execution needs confirmation
   * Screenshot tool requires confirmation since it can capture sensitive data
   */
  async shouldConfirmExecute(params: unknown): Promise<ToolConfirmationDetails | null> {
    const typedParams = params as { type: string };
    
    return {
      type: 'warning',
      title: 'Screenshot Permission',
      description: `Do you want to allow taking a ${typedParams.type || 'screen'} screenshot?`,
      params: typedParams as Record<string, unknown>
    };
  }
}

export default ScreenshotTool;