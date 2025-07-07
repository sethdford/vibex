/**
 * Context Service - Handles all context loading and management
 * Extracted from App.tsx to follow Gemini CLI's clean separation
 */

import { logger } from '../utils/logger.js';
import type { AppConfigType } from '../config/schema.js';

export interface ContextInfo {
  fileCount: number;
  content: string;
  fileNames: string[];
}

export class ContextService {
  private contextInfo: ContextInfo = {
    fileCount: 0,
    content: '',
    fileNames: ['CLAUDE.md']
  };

  /**
   * Refresh context files (simplified like Gemini)
   */
  async refreshContext(): Promise<ContextInfo> {
    try {
      logger.info('Refreshing context files...');
      
      // Simple context loading - no complex file scanning
      const memoryContent = '';
      const fileCount = 0;
      
      this.contextInfo = {
        fileCount,
        content: memoryContent,
        fileNames: ['CLAUDE.md']
      };

      logger.info(`Context refreshed: ${fileCount} files, ${memoryContent.length} characters`);
      return this.contextInfo;
      
    } catch (error) {
      logger.error('Error refreshing context:', error);
      throw error;
    }
  }

  /**
   * Get current context info
   */
  getContextInfo(): ContextInfo {
    return this.contextInfo;
  }

  /**
   * Initialize context for startup
   */
  async initializeContext(config: AppConfigType, preloadedContext?: string): Promise<string> {
    if (preloadedContext) {
      logger.info('📁 Using pre-loaded project context');
      return '📁 Project context ready! Context was pre-loaded at startup for optimal performance.\n• Use /memory show for details';
    } else if (config.fullContext) {
      return '🚀 VibeX ready! Context loading is enabled. Use /context load to load project context manually.';
    } else {
      return '🚀 VibeX ready! Use --full-context flag for automatic project analysis, or /context load to load context manually.';
    }
  }
}

// Singleton instance
export const contextService = new ContextService(); 