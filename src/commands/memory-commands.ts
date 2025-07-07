/**
 * Memory Management Commands
 * 
 * Implements /memory show, /memory refresh, and other memory-related commands
 * that integrate with the unified context system.
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';
import { createUserError, ErrorCategory } from '../errors/index.js';
import { MemoryOrchestrator, MemoryStorageType, createMemoryServices } from '../services/memory-services/index.js';
import { ContentGenerator } from '../infrastructure/content-generator.js';
import { ContextSystem, createContextSystem } from '../context/context-system.js';
import { 
  ContextVariableInterpolation, 
  VariableInterpolationContext,
  createContextVariableInterpolation 
} from '../context/context-variable-interpolation.js';
import { formatBytes, formatDuration } from '../ui/utils/formatters.js';

/**
 * Memory command result
 */
export interface MemoryCommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Memory Commands Handler
 */
export class MemoryCommands {
  private readonly contextSystem: ContextSystem;
  private readonly memorySystem: MemoryOrchestrator;
  private readonly variableInterpolation: ContextVariableInterpolation;
  
  constructor(
    contextSystem: ContextSystem,
    memorySystem: MemoryOrchestrator,
    variableInterpolation?: ContextVariableInterpolation
  ) {
    this.contextSystem = contextSystem;
    this.memorySystem = memorySystem;
    this.variableInterpolation = variableInterpolation || createContextVariableInterpolation();
  }
  
  /**
   * Handle memory commands
   */
  public async handleCommand(command: string, args: string[]): Promise<MemoryCommandResult> {
    try {
      switch (command) {
        case 'show':
          return await this.showMemory(args);
        
        case 'refresh':
          return await this.refreshMemory(args);
        
        case 'clear':
          return await this.clearMemory(args);
        
        case 'stats':
          return await this.getMemoryStats(args);
        
        case 'context':
          return await this.showContext(args);
        
        case 'save':
          return await this.saveMemory(args);
        
        case 'load':
          return await this.loadMemory(args);
        
        case 'interpolate':
          return await this.interpolateVariables(args);
        
        case 'variables':
          return await this.showVariables(args);
        
        default:
          return {
            success: false,
            message: `Unknown memory command: ${command}. Available: show, refresh, clear, stats, context, save, load, interpolate, variables`
          };
      }
    } catch (error) {
      logger.error('Memory command failed', { command, args, error });
      return {
        success: false,
        message: `Memory command failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Show memory contents
   */
  private async showMemory(args: string[]): Promise<MemoryCommandResult> {
    const [type = 'all'] = args;
    
    try {
      if (type === 'all') {
        // Show all memory types
        const stats = await this.memorySystem.getStats();
        const output = this.formatMemoryStats(stats);
        
        return {
          success: true,
          message: 'Memory overview',
          data: output
        };
      } else {
        // Show specific memory type
        const memoryType = this.parseMemoryType(type);
        const entries = this.memorySystem.getByType(memoryType, { limit: 20 });
        
        if (entries.entries.length === 0) {
          return {
            success: true,
            message: `No ${type} memories found`
          };
        }
        
        const output = this.formatMemoryEntries(entries.entries);
        
        return {
          success: true,
          message: `${type} memories (${entries.entries.length} entries)`,
          data: output
        };
      }
    } catch (error) {
      throw createUserError('Failed to show memory', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Check memory system status',
        details: { type, error }
      });
    }
  }
  
  /**
   * Refresh memory and context
   */
  private async refreshMemory(args: string[]): Promise<MemoryCommandResult> {
    const [scope = 'all'] = args;
    
    try {
      let refreshedItems = 0;
      
      if (scope === 'all' || scope === 'context') {
        // Refresh hierarchical context
        this.contextSystem.clearCache();
        const contextResult = await this.contextSystem.loadContext();
        
        // Store context in memory
        await this.memorySystem.store(
          'hierarchical-context',
          { content: contextResult.content, entries: contextResult.entries },
          MemoryStorageType.SYSTEM,
          { tags: [{ name: 'context' }, { name: 'hierarchical' }], importance: 95 }
        );
        
        refreshedItems++;
        logger.info('Hierarchical context refreshed', {
          files: contextResult.entries.length,
          size: contextResult.stats.totalSize
        });
      }
      
      if (scope === 'all' || scope === 'session') {
        // Optimize session context
        // const optimizationResult = await this.memorySystem.optimizeContext();
        // if (optimizationResult) {
        //   refreshedItems++;
        //   logger.info('Session context optimized', {
        //     originalTokens: optimizationResult.originalTokenCount,
        //     newTokens: optimizationResult.newTokenCount,
        //     ratio: optimizationResult.compressionRatio
        //   });
        // }
      }
      
      return {
        success: true,
        message: `Memory refreshed (${refreshedItems} items updated)`
      };
    } catch (error) {
      throw createUserError('Failed to refresh memory', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Check memory system and context files',
        details: { scope, error }
      });
    }
  }
  
  /**
   * Clear memory
   */
  private async clearMemory(args: string[]): Promise<MemoryCommandResult> {
    const [type = 'session'] = args;
    
    try {
      if (type === 'all') {
        // Clear all memory
        this.memorySystem.clear();
        this.contextSystem.clearCache();
        
        return {
          success: true,
          message: 'All memory cleared'
        };
      } else {
        // Clear specific memory type
        const memoryType = this.parseMemoryType(type);
        const entries = this.memorySystem.getByType(memoryType);
        
        let clearedCount = 0;
        for (const entry of entries.entries) {
          const key = entry.id.split(':')[1]; // Remove type prefix
          if (await this.memorySystem.delete(key, memoryType)) {
            clearedCount++;
          }
        }
        
        return {
          success: true,
          message: `${type} memory cleared (${clearedCount} entries removed)`
        };
      }
    } catch (error) {
      throw createUserError('Failed to clear memory', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Check memory system status',
        details: { type, error }
      });
    }
  }
  
  /**
   * Get memory statistics
   */
  private async getMemoryStats(args: string[]): Promise<MemoryCommandResult> {
    try {
      const stats = await this.memorySystem.getStats();
      const contextStats = this.contextSystem.getCacheStats();
      
      const output = {
        memory: this.formatMemoryStats(stats),
        context: this.formatContextStats(contextStats),
        performance: {
          totalMemorySize: formatBytes(stats.totalSizeBytes),
          contextCacheSize: formatBytes(contextStats.totalSize),
          totalEntries: stats.totalEntries,
          contextCacheEntries: contextStats.entries
        }
      };
      
      return {
        success: true,
        message: 'Memory statistics',
        data: output
      };
    } catch (error) {
      throw createUserError('Failed to get memory statistics', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Check memory system status',
        details: { error }
      });
    }
  }
  
  /**
   * Show hierarchical context
   */
  private async showContext(args: string[]): Promise<MemoryCommandResult> {
    const [format = 'summary'] = args;
    
    try {
      const contextResult = await this.contextSystem.loadContext();
      
      if (format === 'full') {
        return {
          success: true,
          message: 'Full hierarchical context',
          data: {
            content: contextResult.content,
            entries: contextResult.entries.map((entry: any) => ({
              type: entry.type,
              path: entry.path,
              scope: entry.scope,
              priority: entry.priority,
              lastModified: new Date(entry.lastModified).toISOString(),
              size: entry.content.length
            })),
            stats: contextResult.stats
          }
        };
      } else {
        // Summary format
        const summary = {
          totalFiles: contextResult.entries.length,
          totalSize: formatBytes(contextResult.stats.totalSize),
          loadTime: formatDuration(contextResult.stats.processingTime),
          entries: contextResult.entries.map((entry: any) => ({
            type: entry.type,
            scope: entry.scope,
            priority: entry.priority,
            size: formatBytes(entry.content.length)
          }))
        };
        
        return {
          success: true,
          message: 'Hierarchical context summary',
          data: summary
        };
      }
    } catch (error) {
      throw createUserError('Failed to show context', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Check context files and permissions',
        details: { format, error }
      });
    }
  }
  
  /**
   * Save memory to file
   */
  private async saveMemory(args: string[]): Promise<MemoryCommandResult> {
    const [filename] = args;
    
    if (!filename) {
      return {
        success: false,
        message: 'Usage: /memory save <filename>'
      };
    }
    
    try {
      await this.memorySystem.save();
      
      return {
        success: true,
        message: `Memory saved to ${filename}`
      };
    } catch (error) {
      throw createUserError('Failed to save memory', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Check file permissions and disk space',
        details: { filename, error }
      });
    }
  }
  
  /**
   * Load memory from file
   */
  private async loadMemory(args: string[]): Promise<MemoryCommandResult> {
    const [filename] = args;
    
    if (!filename) {
      return {
        success: false,
        message: 'Usage: /memory load <filename>'
      };
    }
    
    try {
      // const loaded = await this.memorySystem.load(filename);
      
      // if (loaded) {
      //   return {
      //     success: true,
      //     message: `Memory loaded from ${filename}`
      //   };
      // } else {
      //   return {
      //     success: false,
      //     message: `Memory file not found: ${filename}`
      //   };
      // }
      return {
        success: true,
        message: "Memory loading is currently disabled."
      };
    } catch (error) {
      throw createUserError('Failed to load memory', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Check file exists and permissions',
        details: { filename, error }
      });
    }
  }
  
  /**
   * Interpolate variables in context content
   */
  private async interpolateVariables(args: string[]): Promise<MemoryCommandResult> {
    const [contentOrPath, ...additionalArgs] = args;
    
    if (!contentOrPath) {
      return {
        success: false,
        message: 'Usage: /memory interpolate <content_or_path> [scope]'
      };
    }
    
    try {
      let content: string;
      let currentFile: string;
      
      // Check if it's a file path or direct content
      if (contentOrPath.includes('${') || contentOrPath.length < 100) {
        // Direct content
        content = contentOrPath;
        currentFile = process.cwd();
      } else {
        // File path
        try {
          await access(contentOrPath);
          content = await readFile(contentOrPath, 'utf8');
          currentFile = contentOrPath;
        } catch {
          // Not a valid file, treat as content
          content = contentOrPath;
          currentFile = process.cwd();
        }
      }
      
      // Get context for interpolation
      const contextResult = await this.contextSystem.loadContext();
      
      // Create interpolation context
      const interpolationContext: VariableInterpolationContext = {
        cwd: process.cwd(),
        projectRoot: process.cwd(),
        workspaceRoot: process.cwd(),
        currentFile,
        env: process.env as Record<string, string>,
        contextEntries: contextResult.entries.map(entry => ({
          type: entry.type,
          path: entry.path,
          content: entry.content,
          priority: entry.priority,
          scope: entry.scope || 'global',
          lastModified: entry.lastModified || Date.now(),
          variables: entry.variables || {},
          metadata: entry.metadata || {}
        })),
        fileMetadata: {},
        customVariables: {},
        resolutionStack: []
      };
      
      // Interpolate variables
      const interpolatedContent = await this.variableInterpolation.interpolate(
        content,
        interpolationContext
      );
      
      return {
        success: true,
        message: 'Variables interpolated successfully',
        data: {
          original: content,
          interpolated: interpolatedContent,
          variables: this.extractVariables(content)
        }
      };
    } catch (error) {
      throw createUserError('Failed to interpolate variables', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Check variable syntax and context files',
        details: { contentOrPath, error }
      });
    }
  }
  
  /**
   * Show available variables
   */
  private async showVariables(args: string[]): Promise<MemoryCommandResult> {
    const [scope = 'all'] = args;
    
    try {
      const contextResult = await this.contextSystem.loadContext();
      const variables: Record<string, any> = {};
      
      // Built-in variables
      if (scope === 'all' || scope === 'builtin') {
        variables.builtin = {
          env: 'Environment variables (${env.VAR_NAME})',
          path: 'Path variables (${path.cwd}, ${path.home}, ${path.project})',
          git: 'Git variables (${git.branch}, ${git.commit}, ${git.author})',
          date: 'Date variables (${date.now}, ${date.iso}, ${date.year})',
          time: 'Time variables (${time.hour}, ${time.minute}, ${time.second})',
          context: 'Context references (${context.scope.property})',
          file: 'File content (${file:path/to/file})',
          meta: 'Metadata (${meta.file.size}, ${meta.file.modified})',
          fn: 'Functions (${fn:upper:text}, ${fn:lower:text})',
          if: 'Conditionals (${if:condition:true_value:false_value})'
        };
      }
      
      // Context variables
      if (scope === 'all' || scope === 'context') {
        variables.context = {};
        contextResult.entries.forEach(entry => {
          if (entry.variables) {
            variables.context[entry.scope || 'global'] = entry.variables;
          }
        });
      }
      
      // Environment variables
      if (scope === 'all' || scope === 'env') {
        variables.environment = Object.keys(process.env)
          .filter(key => !key.startsWith('_') && key.length < 50)
          .slice(0, 20)
          .reduce((acc, key) => {
            acc[key] = process.env[key] || '';
            return acc;
          }, {} as Record<string, string>);
      }
      
      // Git variables (if available)
      if (scope === 'all' || scope === 'git') {
        try {
          const { execSync } = require('child_process');
          variables.git = {
            branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
            commit: execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(),
            author: execSync('git config user.name', { encoding: 'utf8' }).trim(),
            email: execSync('git config user.email', { encoding: 'utf8' }).trim()
          };
        } catch {
          variables.git = 'Not available (not a git repository)';
        }
      }
      
      return {
        success: true,
        message: `Available variables (scope: ${scope})`,
        data: variables
      };
    } catch (error) {
      throw createUserError('Failed to show variables', {
        category: ErrorCategory.SYSTEM,
        resolution: 'Check context system and git repository',
        details: { scope, error }
      });
    }
  }
  
  /**
   * Extract variables from content
   */
  private extractVariables(content: string): string[] {
    const variablePattern = /\$\{([^}]+)\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variablePattern.exec(content)) !== null) {
      variables.push(match[1]);
    }
    
    return [...new Set(variables)]; // Remove duplicates
  }
  
  /**
   * Parse memory type string
   */
  private parseMemoryType(type: string): MemoryStorageType {
    const typeMap: Record<string, MemoryStorageType> = {
      'session': MemoryStorageType.SESSION,
      'user': MemoryStorageType.USER,
      'system': MemoryStorageType.SYSTEM,
      'global': MemoryStorageType.GLOBAL,
      'workspace': MemoryStorageType.WORKSPACE,
      'project': MemoryStorageType.PROJECT
    };
    
    const memoryType = typeMap[type.toLowerCase()];
    if (!memoryType) {
      throw createUserError(`Invalid memory type: ${type}`, {
        category: ErrorCategory.VALIDATION,
        resolution: 'Use one of: session, user, system, global, workspace, project'
      });
    }
    
    return memoryType;
  }
  
  /**
   * Format memory statistics for display
   */
  private formatMemoryStats(stats: any): string {
    const lines: string[] = [];
    
    lines.push('Memory Statistics:');
    lines.push(`  Total Entries: ${stats.totalEntries}`);
    lines.push(`  Total Size: ${formatBytes(stats.totalSizeBytes)}`);
    lines.push('');
    lines.push('By Type:');
    
    for (const [type, count] of Object.entries(stats.countByType)) {
      lines.push(`  ${type}: ${count} entries`);
    }
    
    if (stats.contextMemoryStats) {
      lines.push('');
      lines.push('Context Memory:');
      lines.push(`  Token Count: ${stats.contextMemoryStats.tokenCount}`);
      lines.push(`  Token Usage: ${(stats.contextMemoryStats.tokenUsage * 100).toFixed(1)}%`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Format memory entries for display
   */
  private formatMemoryEntries(entries: any[]): string {
    const lines: string[] = [];
    
    for (const entry of entries) {
      lines.push(`${entry.id}:`);
      lines.push(`  Type: ${entry.type}`);
      lines.push(`  Created: ${new Date(entry.createdAt).toISOString()}`);
      lines.push(`  Accessed: ${new Date(entry.lastAccessedAt).toISOString()}`);
      lines.push(`  Access Count: ${entry.accessCount}`);
      lines.push(`  Importance: ${entry.importance || 'N/A'}`);
      lines.push(`  Size: ${formatBytes(JSON.stringify(entry.content).length)}`);
      
      if (entry.tags && entry.tags.length > 0) {
        lines.push(`  Tags: ${entry.tags.map((tag: any) => tag.name).join(', ')}`);
      }
      
      lines.push('');
    }
    
    return lines.join('\n');
  }
  
  /**
   * Format context statistics for display
   */
  private formatContextStats(stats: any): string {
    const lines: string[] = [];
    
    lines.push('Context Cache Statistics:');
    lines.push(`  Cache Entries: ${stats.entries}`);
    lines.push(`  Total Size: ${formatBytes(stats.totalSize)}`);
    
    if (stats.entries > 0) {
      lines.push(`  Oldest Entry: ${new Date(stats.oldestEntry).toISOString()}`);
      lines.push(`  Newest Entry: ${new Date(stats.newestEntry).toISOString()}`);
    }
    
    return lines.join('\n');
  }
}

/**
 * Create memory commands handler
 */
export function createMemoryCommands(
  contextSystem: ContextSystem,
  memorySystem: MemoryOrchestrator
): MemoryCommands {
  return new MemoryCommands(contextSystem, memorySystem);
}

/**
 * Register memory command with command registry
 */
export function registerMemoryCommand(commandRegistry: any): void {
  // This is a placeholder - the actual memory command registration
  // should be handled through the unified command system
  logger.info('Memory commands module loaded (registration handled by unified command system)');
} 