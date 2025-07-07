/**
 * Context Merge Service - Clean Architecture like Gemini CLI
 * 
 * Single Responsibility: Merge and format context content
 * - Content merging strategies
 * - Priority-based ordering
 * - Content formatting and presentation
 */

import { basename } from 'path';
import { logger } from '../utils/logger.js';
import { ContextEntry, ContextFileType } from './context-loading-service.js';

/**
 * Context merge result
 */
export interface ContextMergeResult {
  content: string;
  entries: ContextEntry[];
  variables: Record<string, string>;
  stats: {
    totalFiles: number;
    totalSize: number;
    processingTime: number;
  };
  errors: string[];
}

/**
 * Merge configuration
 */
export interface MergeConfig {
  includeHeaders: boolean;
  includeSeparators: boolean;
  includeMetadata: boolean;
  maxContentLength: number;
  sortByPriority: boolean;
}

/**
 * Default merge configuration
 */
const DEFAULT_MERGE_CONFIG: MergeConfig = {
  includeHeaders: true,
  includeSeparators: true,
  includeMetadata: false,
  maxContentLength: 100000, // 100KB
  sortByPriority: true
};

/**
 * Context Merge Service
 * 
 * Focused responsibility: Merge context content with proper formatting
 */
export class ContextMergeService {
  private readonly config: MergeConfig;

  constructor(config: Partial<MergeConfig> = {}) {
    this.config = { ...DEFAULT_MERGE_CONFIG, ...config };
  }

  /**
   * Merge context entries into formatted content
   */
  public async mergeContent(entries: ContextEntry[]): Promise<string> {
    if (entries.length === 0) {
      return '';
    }

    // Sort by priority if enabled
    const sortedEntries = this.config.sortByPriority
      ? [...entries].sort((a, b) => b.priority - a.priority)
      : entries;

    const contentParts: string[] = [];
    let totalLength = 0;

    for (const entry of sortedEntries) {
      // Check content length limit
      if (totalLength >= this.config.maxContentLength) {
        logger.warn(`Content length limit reached (${this.config.maxContentLength}), truncating`);
        break;
      }

      const formattedEntry = this.formatEntry(entry);
      const entryLength = formattedEntry.length;

      // Check if adding this entry would exceed limit
      if (totalLength + entryLength > this.config.maxContentLength) {
        const remainingSpace = this.config.maxContentLength - totalLength;
        const truncatedContent = formattedEntry.substring(0, remainingSpace - 50) + '\n\n[Content truncated...]';
        contentParts.push(truncatedContent);
        break;
      }

      contentParts.push(formattedEntry);
      totalLength += entryLength;
    }

    return contentParts.join('\n\n');
  }

  /**
   * Format a single context entry
   */
  private formatEntry(entry: ContextEntry): string {
    const parts: string[] = [];

    // Add header if enabled
    if (this.config.includeHeaders) {
      const title = this.getEntryTitle(entry);
      parts.push(`# ${title}`);
      
      if (this.config.includeMetadata) {
        parts.push(this.formatMetadata(entry));
      }
    }

    // Add separator if enabled
    if (this.config.includeSeparators && this.config.includeHeaders) {
      parts.push('---');
    }

    // Add content
    const trimmedContent = entry.content.trim();
    if (trimmedContent) {
      parts.push(trimmedContent);
    }

    return parts.join('\n');
  }

  /**
   * Get display title for entry
   */
  private getEntryTitle(entry: ContextEntry): string {
    const fileName = basename(entry.path);
    
    switch (entry.type) {
      case ContextFileType.GLOBAL:
        return `Global Context (${fileName})`;
      case ContextFileType.PROJECT:
        return `Project Context (${fileName})`;
      case ContextFileType.DIRECTORY:
        return `Directory Context (${fileName})`;
      case ContextFileType.FILE:
        return `File Context (${fileName})`;
      default:
        return `Context (${fileName})`;
    }
  }

  /**
   * Format metadata for display
   */
  private formatMetadata(entry: ContextEntry): string {
    const metadata: string[] = [];
    
    metadata.push(`Path: ${entry.path}`);
    metadata.push(`Priority: ${entry.priority}`);
    metadata.push(`Scope: ${entry.scope}`);
    metadata.push(`Last Modified: ${new Date(entry.lastModified).toISOString()}`);
    
    if (entry.metadata.source) {
      metadata.push(`Source: ${entry.metadata.source}`);
    }
    
    if (entry.metadata.depth !== undefined) {
      metadata.push(`Depth: ${entry.metadata.depth}`);
    }

    return metadata.map(line => `> ${line}`).join('\n');
  }

  /**
   * Create merge result
   */
  public createMergeResult(
    entries: ContextEntry[],
    variables: Record<string, string>,
    processingTime: number,
    errors: string[] = []
  ): ContextMergeResult {
    const content = this.mergeContentSync(entries);
    const totalSize = entries.reduce((sum, entry) => sum + entry.content.length, 0);

    return {
      content,
      entries,
      variables,
      stats: {
        totalFiles: entries.length,
        totalSize,
        processingTime
      },
      errors
    };
  }

  /**
   * Synchronous version of mergeContent for result creation
   */
  private mergeContentSync(entries: ContextEntry[]): string {
    if (entries.length === 0) {
      return '';
    }

    // Sort by priority if enabled
    const sortedEntries = this.config.sortByPriority
      ? [...entries].sort((a, b) => b.priority - a.priority)
      : entries;

    const contentParts: string[] = [];
    let totalLength = 0;

    for (const entry of sortedEntries) {
      // Check content length limit
      if (totalLength >= this.config.maxContentLength) {
        break;
      }

      const formattedEntry = this.formatEntry(entry);
      const entryLength = formattedEntry.length;

      // Check if adding this entry would exceed limit
      if (totalLength + entryLength > this.config.maxContentLength) {
        const remainingSpace = this.config.maxContentLength - totalLength;
        const truncatedContent = formattedEntry.substring(0, remainingSpace - 50) + '\n\n[Content truncated...]';
        contentParts.push(truncatedContent);
        break;
      }

      contentParts.push(formattedEntry);
      totalLength += entryLength;
    }

    return contentParts.join('\n\n');
  }

  /**
   * Validate merge configuration
   */
  public validateConfig(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // Validate max content length
    if (this.config.maxContentLength <= 0) {
      result.isValid = false;
      result.errors.push('maxContentLength must be greater than 0');
    }

    if (this.config.maxContentLength < 1000) {
      result.warnings.push('maxContentLength is very small, may truncate content aggressively');
    }

    return result;
  }

  /**
   * Get merge statistics
   */
  public getMergeStats(entries: ContextEntry[]): {
    totalEntries: number;
    entriesByType: Record<ContextFileType, number>;
    totalContentLength: number;
    averageContentLength: number;
    priorityRange: { min: number; max: number };
  } {
    const stats = {
      totalEntries: entries.length,
      entriesByType: {} as Record<ContextFileType, number>,
      totalContentLength: 0,
      averageContentLength: 0,
      priorityRange: { min: Infinity, max: -Infinity }
    };

    if (entries.length === 0) {
      return stats;
    }

    // Initialize type counts
    for (const type of Object.values(ContextFileType)) {
      stats.entriesByType[type] = 0;
    }

    // Calculate statistics
    for (const entry of entries) {
      stats.entriesByType[entry.type]++;
      stats.totalContentLength += entry.content.length;
      stats.priorityRange.min = Math.min(stats.priorityRange.min, entry.priority);
      stats.priorityRange.max = Math.max(stats.priorityRange.max, entry.priority);
    }

    stats.averageContentLength = Math.round(stats.totalContentLength / entries.length);

    return stats;
  }

  /**
   * Get configuration
   */
  public getConfig(): MergeConfig {
    return { ...this.config };
  }
}

/**
 * Create context merge service
 */
export function createContextMergeService(config?: Partial<MergeConfig>): ContextMergeService {
  return new ContextMergeService(config);
} 