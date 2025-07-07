/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Specialized Tools Compatibility Layer
 * 
 * This file provides backwards compatibility for legacy code
 * that uses the old specialized tools API.
 */

import { getCoreInstance } from '../../initialization';
import { toolAPI } from '../../domain/tool/tool-api';

/**
 * Execute code search using ripgrep
 */
export async function searchCode(params: {
  pattern: string;
  path?: string;
  case_sensitive?: boolean;
  max_results?: number;
}): Promise<any> {
  try {
    const result = await toolAPI.executeTool('search_code', params);
    
    if (!result.success) {
      throw result.error;
    }
    
    return {
      success: true,
      result: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Execute code analysis
 */
export async function analyzeCode(params: {
  file_path: string;
  analysis_type?: string;
  include_suggestions?: boolean;
}): Promise<any> {
  try {
    const result = await toolAPI.executeTool('analyze_code', params);
    
    if (!result.success) {
      throw result.error;
    }
    
    return {
      success: true,
      result: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Take a screenshot
 */
export async function takeScreenshot(params: {
  type: 'terminal' | 'screen' | 'window';
  outputPath?: string;
  delay?: number;
  quality?: number;
  includeCursor?: boolean;
}): Promise<any> {
  try {
    const result = await toolAPI.executeTool('take_screenshot', params);
    
    if (!result.success) {
      throw result.error;
    }
    
    return {
      success: true,
      result: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}