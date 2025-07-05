/**
 * Memory Import Processor
 * 
 * Provides functionality to process import statements in memory files.
 * This allows memory files to include other files and create a more
 * modular and reusable memory system.
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Pattern to match import statements in markdown files
 * Format: <!-- import: path/to/file.ext -->
 */
const importPattern = /<!--\s*import:\s*(.*?)\s*-->/g;

interface ImportedMemory {
  content: string;
  metadata: Record<string, unknown>;
  source: string;
}

interface ProcessingOptions {
  validate?: boolean;
  merge?: boolean;
  overwrite?: boolean;
}

/**
 * Process a memory file content and resolve any import statements
 * 
 * @param content The file content to process
 * @param baseDir The base directory for resolving relative imports
 * @param debugMode Whether to enable debug logging
 * @returns The processed content with imports resolved
 */
export async function processImports(
  content: string,
  baseDir: string,
  debugMode = false
): Promise<string> {
  if (!content.includes('<!-- import:')) {
    return content;
  }

  if (debugMode) {
    logger.debug(`Processing imports in content from ${baseDir}`);
  }

  // Keep track of processed imports to detect circular dependencies
  const processedPaths = new Set<string>();

  // Process imports recursively
  return processImportsRecursive(content, baseDir, processedPaths, debugMode);
}

/**
 * Recursively process imports in content
 * 
 * @param content The content to process
 * @param baseDir The base directory for resolving relative imports
 * @param processedPaths Set of already processed paths to prevent circular imports
 * @param debugMode Whether to enable debug logging
 * @param depth Current recursion depth to prevent infinite recursion
 * @returns The processed content
 */
async function processImportsRecursive(
  content: string,
  baseDir: string,
  processedPaths: Set<string>,
  debugMode = false,
  depth = 0
): Promise<string> {
  // Guard against excessive recursion depth
  if (depth > 10) {
    logger.warn('Maximum import depth exceeded (10). Possible circular dependency.');
    return content;
  }

  // Process all import statements in the content
  let result = content;
  let match: RegExpExecArray | null;
  
  // Reset the regex state before iterating
  importPattern.lastIndex = 0;
  
  const importMatches: Array<{ fullMatch: string; importPath: string }> = [];
  
  while ((match = importPattern.exec(result)) !== null) {
    importMatches.push({
      fullMatch: match[0],
      importPath: match[1],
    });
  }

  // Process all imports
  for (const { fullMatch, importPath } of importMatches) {
    try {
      // Resolve relative path from base directory
      const resolvedPath = path.isAbsolute(importPath)
        ? importPath
        : path.resolve(baseDir, importPath);

      // Check for circular imports
      if (processedPaths.has(resolvedPath)) {
        logger.warn(`Circular import detected: ${resolvedPath}`);
        result = result.replace(
          fullMatch,
          `<!-- Error: Circular import detected for ${importPath} -->`
        );
        continue;
      }

      // Add to processed paths
      processedPaths.add(resolvedPath);

      if (debugMode) {
        logger.debug(`Processing import: ${importPath} (resolved to ${resolvedPath})`);
      }

      // Read the imported file
      const importedContent = await fs.readFile(resolvedPath, 'utf-8');

      // Process imports in the imported content (recursively)
      const processedImportedContent = await processImportsRecursive(
        importedContent,
        path.dirname(resolvedPath),
        processedPaths,
        debugMode,
        depth + 1
      );

      // Replace the import statement with the processed content
      result = result.replace(
        fullMatch,
        `<!-- Begin import: ${importPath} -->\n${processedImportedContent}\n<!-- End import: ${importPath} -->`
      );

    } catch (error) {
      logger.warn(`Error processing import ${importPath}: ${error instanceof Error ? error.message : String(error)}`);
      result = result.replace(
        fullMatch,
        `<!-- Error importing ${importPath}: ${error instanceof Error ? error.message : String(error)} -->`
      );
    }
  }

  return result;
}

/**
 * Process all imports in a memory file
 * 
 * @param filePath Path to the memory file
 * @param debugMode Whether to enable debug logging
 * @returns The processed content with imports resolved
 */
export async function processFileImports(
  filePath: string,
  debugMode = false
): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const baseDir = path.dirname(filePath);
    return processImports(content, baseDir, debugMode);
  } catch (error) {
    logger.error(`Error processing imports in file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export async function processImportedMemories(
  memories: ImportedMemory[],
  options: ProcessingOptions = {}
): Promise<void> {
  // Implementation of processImportedMemories function
}