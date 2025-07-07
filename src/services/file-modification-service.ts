/**
 * File Modification Service
 * 
 * Single Responsibility: Handle file content modifications and line operations
 * Following Gemini CLI's clean architecture patterns
 */

import { FileIOService, FileContent } from './file-io-service.js';
import { logger } from '../utils/logger.js';

export interface FileModificationConfig {
  backupBeforeModify?: boolean;
  backupSuffix?: string;
  validateBeforeWrite?: boolean;
}

export enum LineModificationType {
  ADD = 'add',
  REMOVE = 'remove',
  REPLACE = 'replace',
  INSERT_BEFORE = 'insert_before',
  INSERT_AFTER = 'insert_after'
}

export interface LineModification {
  line: number; // 1-based line number
  type: LineModificationType;
  content?: string;
  count?: number; // For REMOVE operations
}

export interface ModificationResult {
  success: boolean;
  originalContent?: string;
  modifiedContent?: string;
  linesModified: number;
  backupPath?: string;
  error?: string;
}

export interface BatchModificationResult {
  success: boolean;
  results: Map<string, ModificationResult>;
  totalFilesModified: number;
  totalLinesModified: number;
  error?: string;
}

/**
 * File Modification Service - Clean Architecture
 * Focus: File content modifications and line operations only
 */
export class FileModificationService {
  private config: Required<FileModificationConfig>;
  private fileIOService: FileIOService;

  constructor(
    fileIOService: FileIOService,
    config: FileModificationConfig = {}
  ) {
    this.fileIOService = fileIOService;
    
    this.config = {
      backupBeforeModify: config.backupBeforeModify ?? true,
      backupSuffix: config.backupSuffix || '.bak',
      validateBeforeWrite: config.validateBeforeWrite ?? true
    };
  }

  /**
   * Modify file with line-by-line operations
   */
  async modifyFile(filePath: string, modifications: LineModification[]): Promise<ModificationResult> {
    try {
      // Read original content
      const readResult = await this.fileIOService.readFile(filePath);
      
      if (!readResult.success || !readResult.data) {
        return {
          success: false,
          error: readResult.error || 'Failed to read file',
          linesModified: 0
        };
      }

      if (readResult.data.binary) {
        return {
          success: false,
          error: 'Cannot modify binary file',
          linesModified: 0
        };
      }

      const originalContent = readResult.data.content;
      
      // Create backup if enabled
      let backupPath: string | undefined;
      if (this.config.backupBeforeModify) {
        backupPath = `${filePath}${this.config.backupSuffix}`;
        const backupResult = await this.fileIOService.writeFile(backupPath, originalContent);
        
        if (!backupResult.success) {
          logger.warn(`Failed to create backup: ${backupPath}`, backupResult.error);
        }
      }

      // Apply modifications
      const modificationResult = this.applyModifications(originalContent, modifications);
      
      if (!modificationResult.success) {
        return {
          success: false,
          error: modificationResult.error,
          linesModified: 0,
          backupPath
        };
      }

      // Validate modified content if enabled
      if (this.config.validateBeforeWrite) {
        const validationResult = this.validateContent(modificationResult.content!);
        if (!validationResult.valid) {
          return {
            success: false,
            error: `Content validation failed: ${validationResult.error}`,
            linesModified: 0,
            backupPath
          };
        }
      }

      // Write modified content
      const writeResult = await this.fileIOService.writeFile(filePath, modificationResult.content!);
      
      if (!writeResult.success) {
        return {
          success: false,
          error: writeResult.error,
          linesModified: 0,
          backupPath
        };
      }

      logger.debug(`File modified successfully: ${filePath}`, {
        linesModified: modificationResult.linesModified,
        backupCreated: !!backupPath
      });

      return {
        success: true,
        originalContent,
        modifiedContent: modificationResult.content!,
        linesModified: modificationResult.linesModified,
        backupPath
      };
    } catch (error) {
      logger.error(`Failed to modify file: ${filePath}`, error);
      return {
        success: false,
        error: `Modification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        linesModified: 0
      };
    }
  }

  /**
   * Insert lines at specific position
   */
  async insertLines(filePath: string, lineNumber: number, lines: string[]): Promise<ModificationResult> {
    const modifications: LineModification[] = lines.map((content, index) => ({
      line: lineNumber + index,
      type: LineModificationType.ADD,
      content
    }));

    return await this.modifyFile(filePath, modifications);
  }

  /**
   * Remove lines from file
   */
  async removeLines(filePath: string, startLine: number, count: number = 1): Promise<ModificationResult> {
    const modification: LineModification = {
      line: startLine,
      type: LineModificationType.REMOVE,
      count
    };

    return await this.modifyFile(filePath, [modification]);
  }

  /**
   * Replace specific lines
   */
  async replaceLines(filePath: string, replacements: Array<{ line: number; content: string }>): Promise<ModificationResult> {
    const modifications: LineModification[] = replacements.map(({ line, content }) => ({
      line,
      type: LineModificationType.REPLACE,
      content
    }));

    return await this.modifyFile(filePath, modifications);
  }

  /**
   * Append lines to end of file
   */
  async appendLines(filePath: string, lines: string[]): Promise<ModificationResult> {
    try {
      // Read file to get line count
      const linesResult = await this.fileIOService.readFileLines(filePath);
      
      if (!linesResult.success || !linesResult.data) {
        return {
          success: false,
          error: linesResult.error || 'Failed to read file lines',
          linesModified: 0
        };
      }

      const totalLines = linesResult.data.length;
      
      // Create modifications to add at the end
      const modifications: LineModification[] = lines.map((content, index) => ({
        line: totalLines + index + 1,
        type: LineModificationType.ADD,
        content
      }));

      return await this.modifyFile(filePath, modifications);
    } catch (error) {
      return {
        success: false,
        error: `Append failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        linesModified: 0
      };
    }
  }

  /**
   * Prepend lines to beginning of file
   */
  async prependLines(filePath: string, lines: string[]): Promise<ModificationResult> {
    const modifications: LineModification[] = lines.map((content, index) => ({
      line: index + 1,
      type: LineModificationType.ADD,
      content
    }));

    return await this.modifyFile(filePath, modifications);
  }

  /**
   * Modify multiple files with batch operations
   */
  async modifyBatch(operations: Array<{
    filePath: string;
    modifications: LineModification[];
  }>): Promise<BatchModificationResult> {
    const results = new Map<string, ModificationResult>();
    let totalFilesModified = 0;
    let totalLinesModified = 0;
    let hasErrors = false;

    for (const operation of operations) {
      try {
        const result = await this.modifyFile(operation.filePath, operation.modifications);
        results.set(operation.filePath, result);

        if (result.success) {
          totalFilesModified++;
          totalLinesModified += result.linesModified;
        } else {
          hasErrors = true;
        }
      } catch (error) {
        const errorResult: ModificationResult = {
          success: false,
          error: `Batch operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          linesModified: 0
        };
        
        results.set(operation.filePath, errorResult);
        hasErrors = true;
      }
    }

    return {
      success: !hasErrors,
      results,
      totalFilesModified,
      totalLinesModified,
      error: hasErrors ? 'Some operations failed' : undefined
    };
  }

  /**
   * Create a diff between original and modified content
   */
  createDiff(originalContent: string, modifiedContent: string): string[] {
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');
    const diff: string[] = [];

    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i];
      const modifiedLine = modifiedLines[i];

      if (originalLine !== modifiedLine) {
        if (originalLine !== undefined) {
          diff.push(`- ${i + 1}: ${originalLine}`);
        }
        if (modifiedLine !== undefined) {
          diff.push(`+ ${i + 1}: ${modifiedLine}`);
        }
      }
    }

    return diff;
  }

  /**
   * Restore file from backup
   */
  async restoreFromBackup(filePath: string, backupSuffix?: string): Promise<ModificationResult> {
    const suffix = backupSuffix || this.config.backupSuffix;
    const backupPath = `${filePath}${suffix}`;

    try {
      // Check if backup exists
      const existsResult = await this.fileIOService.fileExists(backupPath);
      
      if (!existsResult.success || !existsResult.data) {
        return {
          success: false,
          error: `Backup file not found: ${backupPath}`,
          linesModified: 0
        };
      }

      // Copy backup to original file
      const copyResult = await this.fileIOService.copyFile(backupPath, filePath);
      
      if (!copyResult.success) {
        return {
          success: false,
          error: copyResult.error,
          linesModified: 0
        };
      }

      return {
        success: true,
        linesModified: 0 // Restoration doesn't count as modification
      };
    } catch (error) {
      return {
        success: false,
        error: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        linesModified: 0
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<FileModificationConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): FileModificationConfig {
    return { ...this.config };
  }

  /**
   * Apply modifications to content
   */
  private applyModifications(content: string, modifications: LineModification[]): {
    success: boolean;
    content?: string;
    linesModified: number;
    error?: string;
  } {
    try {
      const lines = content.split('\n');
      let linesModified = 0;

      // Sort modifications by line number in descending order
      // to avoid line number shifting during modification
      const sortedMods = [...modifications].sort((a, b) => b.line - a.line);

      for (const mod of sortedMods) {
        const lineIndex = mod.line - 1; // Convert to 0-based index

        switch (mod.type) {
          case LineModificationType.ADD:
            if (mod.content === undefined) {
              return {
                success: false,
                error: 'Content is required for ADD modification',
                linesModified: 0
              };
            }
            lines.splice(lineIndex, 0, mod.content);
            linesModified++;
            break;

          case LineModificationType.INSERT_BEFORE:
            if (mod.content === undefined) {
              return {
                success: false,
                error: 'Content is required for INSERT_BEFORE modification',
                linesModified: 0
              };
            }
            lines.splice(lineIndex, 0, mod.content);
            linesModified++;
            break;

          case LineModificationType.INSERT_AFTER:
            if (mod.content === undefined) {
              return {
                success: false,
                error: 'Content is required for INSERT_AFTER modification',
                linesModified: 0
              };
            }
            lines.splice(lineIndex + 1, 0, mod.content);
            linesModified++;
            break;

          case LineModificationType.REMOVE:
            const count = mod.count || 1;
            if (lineIndex < lines.length) {
              lines.splice(lineIndex, count);
              linesModified += count;
            }
            break;

          case LineModificationType.REPLACE:
            if (mod.content === undefined) {
              return {
                success: false,
                error: 'Content is required for REPLACE modification',
                linesModified: 0
              };
            }
            if (lineIndex < lines.length) {
              lines[lineIndex] = mod.content;
              linesModified++;
            }
            break;

          default:
            return {
              success: false,
              error: `Unknown modification type: ${mod.type}`,
              linesModified: 0
            };
        }
      }

      return {
        success: true,
        content: lines.join('\n'),
        linesModified
      };
    } catch (error) {
      return {
        success: false,
        error: `Modification application failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        linesModified: 0
      };
    }
  }

  /**
   * Validate content before writing
   */
  private validateContent(content: string): { valid: boolean; error?: string } {
    try {
      // Basic validation checks
      if (content.length === 0) {
        return { valid: false, error: 'Content is empty' };
      }

      // Check for null bytes (invalid in text files)
      if (content.includes('\0')) {
        return { valid: false, error: 'Content contains null bytes' };
      }

      // Check for extremely long lines (potential issue)
      const lines = content.split('\n');
      const maxLineLength = 10000; // 10k characters per line
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].length > maxLineLength) {
          return { 
            valid: false, 
            error: `Line ${i + 1} exceeds maximum length (${lines[i].length} > ${maxLineLength})` 
          };
        }
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

// Factory function for creating file modification service
export function createFileModificationService(
  fileIOService: FileIOService,
  config?: FileModificationConfig
): FileModificationService {
  return new FileModificationService(fileIOService, config);
} 