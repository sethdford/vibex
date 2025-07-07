/**
 * Context Loading Service - Clean Architecture like Gemini CLI
 * 
 * Single Responsibility: Load context files from various sources
 * - Global context files
 * - Project context files  
 * - Directory context files
 * - File validation and reading
 */

import { readFile, access, stat, readdir } from 'fs/promises';
import { join, dirname, resolve, relative, basename } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

/**
 * Context file types
 */
export enum ContextFileType {
  GLOBAL = 'global',
  PROJECT = 'project', 
  DIRECTORY = 'directory',
  FILE = 'file'
}

/**
 * Context inheritance strategy
 */
export enum ContextInheritanceStrategy {
  MERGE = 'merge',           // Smart merge with parent
  OVERRIDE = 'override',     // Override parent completely
  APPEND = 'append',         // Append to parent
  PREPEND = 'prepend'        // Prepend to parent
}

/**
 * Context entry
 */
export interface ContextEntry {
  type: ContextFileType;
  path: string;
  content: string;
  priority: number;
  scope: string;
  lastModified: number;
  strategy: ContextInheritanceStrategy;
  variables: Record<string, string>;
  metadata: Record<string, unknown>;
}

/**
 * Context loading configuration
 */
export interface ContextLoadingConfig {
  globalContextDir: string;
  contextFileNames: string[];
  projectMarkers: string[];
  maxDepth: number;
  encoding: BufferEncoding;
  enableGlobalContext: boolean;
  enableProjectContext: boolean;
  enableDirectoryContext: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_LOADING_CONFIG: ContextLoadingConfig = {
  globalContextDir: join(homedir(), '.cursor'),
  contextFileNames: ['.cursorrules', '.context.md', 'context.md', '.vibes'],
  projectMarkers: ['package.json', '.git', 'Cargo.toml', 'go.mod', 'requirements.txt'],
  maxDepth: 10,
  encoding: 'utf8',
  enableGlobalContext: true,
  enableProjectContext: true,
  enableDirectoryContext: true
};

/**
 * Context Loading Service
 * 
 * Focused responsibility: Load context files from filesystem
 */
export class ContextLoadingService {
  private readonly config: ContextLoadingConfig;

  constructor(config: Partial<ContextLoadingConfig> = {}) {
    this.config = { ...DEFAULT_LOADING_CONFIG, ...config };
  }

  /**
   * Load global context files
   */
  public async loadGlobalContext(): Promise<ContextEntry[]> {
    if (!this.config.enableGlobalContext) {
      return [];
    }

    const entries: ContextEntry[] = [];
    
    try {
      await access(this.config.globalContextDir);
    } catch {
      return entries; // Global context is optional
    }
    
    for (const fileName of this.config.contextFileNames) {
      const filePath = join(this.config.globalContextDir, fileName);
      
      try {
        const entry = await this.loadContextFile(
          filePath,
          ContextFileType.GLOBAL,
          1000, // Highest priority
          'global'
        );
        
        if (entry) {
          entry.metadata = {
            ...entry.metadata,
            source: 'global',
            fileName
          };
          entries.push(entry);
        }
      } catch (error) {
        logger.debug(`Failed to load global context file: ${filePath}`, error);
      }
    }
    
    return entries;
  }

  /**
   * Load project context files
   */
  public async loadProjectContext(currentDir: string): Promise<ContextEntry[]> {
    if (!this.config.enableProjectContext) {
      return [];
    }

    const entries: ContextEntry[] = [];
    const projectRoot = await this.findProjectRoot(currentDir);
    
    if (!projectRoot) {
      return entries;
    }
    
    // Load context files from project root
    for (const fileName of this.config.contextFileNames) {
      const filePath = join(projectRoot, fileName);
      
      try {
        const entry = await this.loadContextFile(
          filePath,
          ContextFileType.PROJECT,
          500, // Medium priority
          'project'
        );
        
        if (entry) {
          entry.metadata = {
            ...entry.metadata,
            source: 'project',
            fileName,
            projectRoot
          };
          entries.push(entry);
        }
      } catch (error) {
        logger.debug(`Failed to load project context file: ${filePath}`, error);
      }
    }
    
    return entries;
  }

  /**
   * Load directory context files
   */
  public async loadDirectoryContext(currentDir: string): Promise<ContextEntry[]> {
    if (!this.config.enableDirectoryContext) {
      return [];
    }

    const entries: ContextEntry[] = [];
    let depth = 0;
    let searchDir = resolve(currentDir);
    
    while (depth < this.config.maxDepth) {
      for (const fileName of this.config.contextFileNames) {
        const filePath = join(searchDir, fileName);
        
        try {
          // Priority decreases with depth
          const priority = 100 - (depth * 10);
          const scope = relative(currentDir, searchDir) || '.';
          
          const entry = await this.loadContextFile(
            filePath,
            ContextFileType.DIRECTORY,
            priority,
            scope
          );
          
          if (entry) {
            entry.metadata = {
              ...entry.metadata,
              source: 'directory',
              fileName,
              depth,
              relativePath: relative(currentDir, searchDir)
            };
            entries.push(entry);
          }
        } catch (error) {
          logger.debug(`Failed to load directory context file: ${filePath}`, error);
        }
      }
      
      // Move up one directory
      const parentDir = dirname(searchDir);
      if (parentDir === searchDir) {
        break; // Reached root
      }
      
      searchDir = parentDir;
      depth++;
    }
    
    return entries;
  }

  /**
   * Load a single context file
   */
  private async loadContextFile(
    filePath: string,
    type: ContextFileType,
    priority: number,
    scope: string
  ): Promise<ContextEntry | null> {
    try {
      await access(filePath);
      const content = await readFile(filePath, this.config.encoding);
      const stats = await stat(filePath);
      
      return {
        type,
        path: filePath,
        content,
        priority,
        scope,
        lastModified: stats.mtime.getTime(),
        strategy: ContextInheritanceStrategy.MERGE,
        variables: {},
        metadata: {}
      };
    } catch {
      return null; // File doesn't exist or can't be read
    }
  }

  /**
   * Find project root directory
   */
  private async findProjectRoot(currentDir: string): Promise<string | null> {
    let searchDir = resolve(currentDir);
    let depth = 0;
    
    while (depth < this.config.maxDepth) {
      // Check for project markers
      for (const marker of this.config.projectMarkers) {
        const markerPath = join(searchDir, marker);
        
        try {
          await access(markerPath);
          return searchDir; // Found project root
        } catch {
          // Marker doesn't exist, continue
        }
      }
      
      // Move up one directory
      const parentDir = dirname(searchDir);
      if (parentDir === searchDir) {
        break; // Reached filesystem root
      }
      
      searchDir = parentDir;
      depth++;
    }
    
    return null; // No project root found
  }

  /**
   * Validate context file
   */
  public async validateContextFile(filePath: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    try {
      await access(filePath);
      const stats = await stat(filePath);
      
      // Check if it's a file
      if (!stats.isFile()) {
        result.isValid = false;
        result.errors.push('Path is not a file');
        return result;
      }
      
      // Check file size (warn if too large)
      if (stats.size > 1024 * 1024) { // 1MB
        result.warnings.push(`File is very large (${Math.round(stats.size / 1024)}KB)`);
      }
      
      // Try to read file
      const content = await readFile(filePath, this.config.encoding);
      
      // Check for empty content
      if (content.trim().length === 0) {
        result.warnings.push('File is empty');
      }
      
      // Check for very old files (older than 6 months)
      const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
      if (stats.mtime.getTime() < sixMonthsAgo) {
        result.warnings.push('File is older than 6 months');
      }
      
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Cannot read file: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Get configuration
   */
  public getConfig(): ContextLoadingConfig {
    return { ...this.config };
  }
}

/**
 * Create context loading service
 */
export function createContextLoadingService(config?: Partial<ContextLoadingConfig>): ContextLoadingService {
  return new ContextLoadingService(config);
} 