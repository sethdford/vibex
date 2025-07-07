/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { WebFetchTool } from './web-fetch-adapter';
import { WebSearchTool } from './web-search-adapter';
import { WebSearchManager, initWebSearch } from '../../../tools/web-search';

/**
 * Factory for creating web tools with proper configuration
 */
export class WebToolsFactory {
  /**
   * Create a WebFetchTool instance
   */
  createWebFetchTool(): WebFetchTool {
    return new WebFetchTool();
  }
  
  /**
   * Create a WebSearchTool instance
   */
  async createWebSearchTool(config: Record<string, unknown> = {}): Promise<WebSearchTool> {
    const searchManager = await initWebSearch(config);
    return new WebSearchTool(searchManager);
  }
  
  /**
   * Create all web tools
   */
  async createWebTools(config: Record<string, unknown> = {}): Promise<{
    webFetchTool: WebFetchTool;
    webSearchTool: WebSearchTool;
  }> {
    const webFetchTool = this.createWebFetchTool();
    const webSearchTool = await this.createWebSearchTool(config);
    
    return {
      webFetchTool,
      webSearchTool
    };
  }
}

/**
 * Create a factory for web tools
 */
export function createWebToolsFactory(): WebToolsFactory {
  return new WebToolsFactory();
}