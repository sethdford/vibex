/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool } from '../../domain/tool/tool-interfaces';
import { 
  Tool,
  ToolResult,
  ToolExecutionOptions,
  ToolConfirmationDetails
} from '../../domain/tool/tool-interfaces';
import { createCodeAnalyzerTool, executeCodeAnalysis } from '../../../tools/code-analyzer';

/**
 * Adapter for the Code Analyzer tool
 * 
 * This adapter wraps the code analyzer tool to fit into the Clean Architecture
 * tool interface. It provides advanced code analysis features including quality
 * metrics, security scanning, and optimization suggestions.
 */
export class CodeAnalyzerTool extends BaseTool {
  /**
   * Constructor
   */
  constructor() {
    // Get tool definition from legacy tool
    const codeAnalyzerTool = createCodeAnalyzerTool();
    
    super(
      'analyze_code',
      'Analyze code quality, security, and structure with suggestions for improvement',
      {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'Path to the code file to analyze'
          },
          analysis_type: {
            type: 'string',
            description: 'Type of analysis to perform: full, quality, security, or structure',
            enum: ['full', 'quality', 'security', 'structure'],
            default: 'full'
          },
          include_suggestions: {
            type: 'boolean',
            description: 'Include improvement suggestions',
            default: true
          }
        },
        required: ['file_path']
      }
    );
  }
  
  /**
   * Execute code analysis
   */
  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    try {
      // Report progress start
      if (options?.onProgress) {
        options.onProgress({
          message: 'Starting code analysis...'
        });
      }
      
      // Cast params to the right type
      const typedParams = params as {
        file_path: string;
        analysis_type?: string;
        include_suggestions?: boolean;
      };
      
      // Validate file path
      if (!typedParams.file_path) {
        throw new Error('File path is required');
      }
      
      // Report progress update
      if (options?.onProgress) {
        options.onProgress({
          message: `Analyzing file: ${typedParams.file_path}`,
          percentage: 25
        });
      }
      
      // Execute legacy code analysis
      const startTime = Date.now();
      const analysisResult = await executeCodeAnalysis(typedParams);
      const executionTime = Date.now() - startTime;
      
      if (options?.onProgress) {
        options.onProgress({
          message: 'Analysis completed',
          percentage: 100
        });
      }
      
      // Handle failed analysis
      if (!analysisResult.success) {
        return {
          success: false,
          error: new Error(analysisResult.error || 'Analysis failed'),
          callId: options?.callId || 'unknown',
          executionTime
        };
      }
      
      // Return successful result
      return {
        success: true,
        data: analysisResult.result,
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
    
    if (!typedParams.file_path) {
      return 'Missing required parameter: file_path';
    }
    
    if (typeof typedParams.file_path !== 'string') {
      return 'Parameter file_path must be a string';
    }
    
    if (typedParams.analysis_type !== undefined) {
      if (typeof typedParams.analysis_type !== 'string') {
        return 'Parameter analysis_type must be a string';
      }
      
      const validTypes = ['full', 'quality', 'security', 'structure'];
      if (!validTypes.includes(typedParams.analysis_type)) {
        return `Parameter analysis_type must be one of: ${validTypes.join(', ')}`;
      }
    }
    
    if (typedParams.include_suggestions !== undefined && 
        typeof typedParams.include_suggestions !== 'boolean') {
      return 'Parameter include_suggestions must be a boolean';
    }
    
    return null;
  }
  
  /**
   * Check if execution needs confirmation
   */
  async shouldConfirmExecute(params: unknown): Promise<ToolConfirmationDetails | null> {
    // Code analysis is safe and doesn't modify files
    return null;
  }
}

export default CodeAnalyzerTool;