/**
 * Global Context Loader
 * 
 * Implements hierarchical context file discovery and loading:
 * 1. Global context files (~/.vibex/VIBEX.md)
 * 2. Project context discovery (upward traversal)
 * 3. Subdirectory context discovery (downward traversal)
 * 4. Memory concatenation with proper ordering
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';
import { loadMemoryFiles, MemoryFile, MemoryLoadResult, MemoryOptions } from './index.js';

/**
 * Global context configuration
 */
export interface GlobalContextConfig {
  /**
   * Enable global context file loading
   */
  enableGlobalContext?: boolean;
  
  /**
   * Enable project context discovery
   */
  enableProjectDiscovery?: boolean;
  
  /**
   * Enable subdirectory context discovery
   */
  enableSubdirectoryDiscovery?: boolean;
  
  /**
   * Maximum depth for upward project traversal
   */
  maxProjectTraversalDepth?: number;
  
  /**
   * Maximum depth for subdirectory traversal
   */
  maxSubdirectoryDepth?: number;
  
  /**
   * Custom global context directory (defaults to ~/.vibex)
   */
  globalContextDir?: string;
  
  /**
   * Project markers to look for during upward traversal
   */
  projectMarkers?: string[];
  
  /**
   * Context file names to look for
   */
  contextFileNames?: string[];
}

/**
 * Hierarchical context result
 */
export interface HierarchicalContextResult {
  /**
   * Combined content from all context levels
   */
  content: string;
  
  /**
   * Global context files
   */
  globalFiles: MemoryFile[];
  
  /**
   * Project context files (from upward traversal)
   */
  projectFiles: MemoryFile[];
  
  /**
   * Current directory context files
   */
  currentFiles: MemoryFile[];
  
  /**
   * Subdirectory context files (from downward traversal)
   */
  subdirectoryFiles: MemoryFile[];
  
  /**
   * Total files loaded
   */
  totalFiles: number;
  
  /**
   * Total character count
   */
  totalCharCount: number;
  
  /**
   * Any errors encountered
   */
  errors: Error[];
}

/**
 * Default global context configuration
 */
const DEFAULT_GLOBAL_CONFIG: Required<GlobalContextConfig> = {
  enableGlobalContext: true,
  enableProjectDiscovery: true,
  enableSubdirectoryDiscovery: true,
  maxProjectTraversalDepth: 10,
  maxSubdirectoryDepth: 3,
  globalContextDir: path.join(os.homedir(), '.vibex'),
  projectMarkers: [
    'package.json',
    'Cargo.toml',
    'pyproject.toml',
    'pom.xml',
    'build.gradle',
    'Makefile',
    '.git',
    '.hg',
    '.svn',
    'composer.json',
    'go.mod',
    'Gemfile',
    'requirements.txt',
    'setup.py',
    'tsconfig.json',
    'webpack.config.js',
    'vite.config.js',
    'next.config.js',
    'nuxt.config.js',
    // Additional Gemini CLI project markers
    'Pipfile',
    'poetry.lock',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    'deno.json',
    'deno.jsonc',
    'CMakeLists.txt',
    'meson.build',
    'configure.ac',
    'configure.in',
    'SConstruct',
    'BUILD',
    'BUILD.bazel',
    'WORKSPACE',
    'pubspec.yaml',
    'mix.exs',
    'rebar.config',
    'stack.yaml',
    'cabal.project',
    'flake.nix',
    'shell.nix',
    'default.nix'
  ],
  contextFileNames: [
    'VIBEX.md',
    'CLAUDE.md', 
    'GEMINI.md',
    'CONTEXT.md',
    'README.md',
    // Additional Gemini CLI context file names
    'AI_CONTEXT.md',
    'INSTRUCTIONS.md',
    'PROMPT.md',
    'SYSTEM.md',
    '.ai-context.md',
    '.context.md',
    '.instructions.md',
    '.prompt.md',
    '.system.md'
  ]
};

/**
 * Check if a directory exists
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * Enhanced context validation
 */
interface ContextValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validate context file content
 */
function validateContextFile(file: MemoryFile): ContextValidationResult {
  const result: ContextValidationResult = {
    isValid: true,
    warnings: [],
    errors: []
  };
  
  // Check file size (warn if too large)
  if (file.size > 1024 * 1024) { // 1MB
    result.warnings.push(`Context file ${file.name} is very large (${Math.round(file.size / 1024)}KB). Consider splitting into smaller files.`);
  }
  
  // Check for common issues
  if (file.content.includes('TODO') || file.content.includes('FIXME')) {
    result.warnings.push(`Context file ${file.name} contains TODO/FIXME markers. Consider updating before use.`);
  }
  
  // Check for empty content
  if (file.content.trim().length === 0) {
    result.warnings.push(`Context file ${file.name} is empty.`);
  }
  
  // Check for very old files (older than 6 months)
  const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
  if (file.lastModified.getTime() < sixMonthsAgo) {
    result.warnings.push(`Context file ${file.name} is older than 6 months. Consider updating.`);
  }
  
  return result;
}

/**
 * Enhanced project root detection with better heuristics
 */
async function findProjectRoot(
  startDir: string, 
  projectMarkers: string[], 
  maxDepth: number
): Promise<{ root: string | null; confidence: number; markers: string[] }> {
  let currentDir = path.resolve(startDir);
  let depth = 0;
  const foundMarkers: string[] = [];
  let bestMatch: { root: string; confidence: number; markers: string[] } | null = null;
  
  while (depth < maxDepth) {
    const markersInDir: string[] = [];
    
    // Check for project markers
    for (const marker of projectMarkers) {
      const markerPath = path.join(currentDir, marker);
      if (await fileExists(markerPath)) {
        markersInDir.push(marker);
      }
    }
    
    // Calculate confidence score based on markers found
    let confidence = 0;
    for (const marker of markersInDir) {
      switch (marker) {
        case '.git':
        case 'package.json':
        case 'Cargo.toml':
        case 'pyproject.toml':
          confidence += 50; // High confidence markers
          break;
        case 'tsconfig.json':
        case 'webpack.config.js':
        case 'vite.config.js':
          confidence += 30; // Medium confidence markers
          break;
        case 'README.md':
        case 'Makefile':
          confidence += 10; // Low confidence markers
          break;
        default:
          confidence += 20; // Default marker confidence
      }
    }
    
    // Update best match if this is better
    if (markersInDir.length > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { root: currentDir, confidence, markers: markersInDir };
    }
    
    // Move up one directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break; // Reached filesystem root
    }
    currentDir = parentDir;
    depth++;
  }
  
  return bestMatch || { root: null, confidence: 0, markers: [] };
}



/**
 * Load project context files by traversing upward from current directory
 */
async function loadProjectContext(
  startDir: string,
  config: Required<GlobalContextConfig>
): Promise<MemoryFile[]> {
  try {
    const projectRootResult = await findProjectRoot(
      startDir, 
      config.projectMarkers, 
      config.maxProjectTraversalDepth
    );
    
    if (!projectRootResult.root) {
      logger.debug('No project root found');
      return [];
    }
    
    // Load context files from project root and intermediate directories
    const projectFiles: MemoryFile[] = [];
    let currentDir = path.resolve(startDir);
    const resolvedProjectRoot = path.resolve(projectRootResult.root);
    
    // Traverse from current directory up to project root
    while (currentDir.startsWith(resolvedProjectRoot)) {
      // Look for context files in current directory
      for (const contextFileName of config.contextFileNames) {
        const contextFilePath = path.join(currentDir, contextFileName);
        if (await fileExists(contextFilePath)) {
          try {
            const result = await loadMemoryFiles(currentDir, {
              includeVibexDir: true,
              includeRootFiles: true,
              includeMarkdownFiles: false, // We're specifically looking for context files
              includeJsonFiles: false,
              recursive: false,
              maxDepth: 1
            });
            
            // Filter to only the specific context file we found
            const contextFile = result.files.find(f => 
              f.name.toUpperCase() === contextFileName.toUpperCase()
            );
            
            if (contextFile) {
              // Calculate priority based on distance from start directory
              const depth = startDir.split(path.sep).length - currentDir.split(path.sep).length;
              projectFiles.push({
                ...contextFile,
                source: 'project' as const,
                priority: (contextFile.priority || 0) + (500 - depth * 10) // Closer to start dir = higher priority
              });
            }
          } catch (error) {
            logger.warn(`Error loading context file ${contextFilePath}: ${error}`);
          }
        }
      }
      
      // Move up one directory
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir || !parentDir.startsWith(resolvedProjectRoot)) {
        break;
      }
      currentDir = parentDir;
    }
    
    logger.debug(`Loaded ${projectFiles.length} project context files`);
    return projectFiles;
  } catch (error) {
    logger.error(`Error loading project context: ${error}`);
    return [];
  }
}

/**
 * Load subdirectory context files by traversing downward
 */
async function loadSubdirectoryContext(
  startDir: string,
  config: Required<GlobalContextConfig>
): Promise<MemoryFile[]> {
  try {
    const subdirectoryFiles: MemoryFile[] = [];
    
    // Recursively find context files in subdirectories
    async function searchSubdirectories(dir: string, currentDepth: number): Promise<void> {
      if (currentDepth >= config.maxSubdirectoryDepth) {
        return;
      }
      
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            // Skip common directories that shouldn't contain context
            if (['node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'target'].includes(entry.name)) {
              continue;
            }
            
            const subDir = path.join(dir, entry.name);
            
            // Look for context files in this subdirectory
            for (const contextFileName of config.contextFileNames) {
              const contextFilePath = path.join(subDir, contextFileName);
              if (await fileExists(contextFilePath)) {
                try {
                  const result = await loadMemoryFiles(subDir, {
                    includeVibexDir: true,
                    includeRootFiles: true,
                    includeMarkdownFiles: false,
                    includeJsonFiles: false,
                    recursive: false,
                    maxDepth: 1
                  });
                  
                  const contextFile = result.files.find(f => 
                    f.name.toUpperCase() === contextFileName.toUpperCase()
                  );
                  
                  if (contextFile) {
                    subdirectoryFiles.push({
                      ...contextFile,
                      source: 'project' as const,
                      priority: (contextFile.priority || 0) + (100 - currentDepth * 20) // Shallower = higher priority
                    });
                  }
                } catch (error) {
                  logger.warn(`Error loading subdirectory context file ${contextFilePath}: ${error}`);
                }
              }
            }
            
            // Recursively search deeper
            await searchSubdirectories(subDir, currentDepth + 1);
          }
        }
      } catch (error) {
        logger.warn(`Error searching subdirectory ${dir}: ${error}`);
      }
    }
    
    await searchSubdirectories(startDir, 0);
    
    logger.debug(`Loaded ${subdirectoryFiles.length} subdirectory context files`);
    return subdirectoryFiles;
  } catch (error) {
    logger.error(`Error loading subdirectory context: ${error}`);
    return [];
  }
}

/**
 * Enhanced hierarchical context loading with full Gemini CLI parity
 */
export async function loadHierarchicalContext(
  currentDir: string = process.cwd(),
  config: Partial<GlobalContextConfig> = {}
): Promise<HierarchicalContextResult & { 
  projectRoot?: string; 
  projectConfidence?: number; 
  validationResults?: ContextValidationResult[] 
}> {
  const mergedConfig = { ...DEFAULT_GLOBAL_CONFIG, ...config };
  const errors: Error[] = [];
  const validationResults: ContextValidationResult[] = [];
  
  try {
    logger.debug(`Loading hierarchical context from ${currentDir}`);
    
    // Enhanced project root detection
    const projectRootResult = await findProjectRoot(
      currentDir, 
      mergedConfig.projectMarkers, 
      mergedConfig.maxProjectTraversalDepth
    );
    
    if (projectRootResult.root) {
      logger.debug(`Found project root: ${projectRootResult.root} (confidence: ${projectRootResult.confidence}%, markers: ${projectRootResult.markers.join(', ')})`);
    }
    
    // Load context from all levels in parallel
    const [globalFiles, projectFiles, currentFiles, subdirectoryFiles] = await Promise.all([
      // Global context - inline implementation (replaces deprecated loadGlobalContext)
      mergedConfig.enableGlobalContext 
        ? (async () => {
            try {
              if (!await directoryExists(mergedConfig.globalContextDir)) {
                logger.debug(`Global context directory ${mergedConfig.globalContextDir} does not exist`);
                return [];
              }
              
              const result = await loadMemoryFiles(mergedConfig.globalContextDir, {
                includeVibexDir: false, // We're already in the .vibex directory
                includeRootFiles: true,
                includeMarkdownFiles: true,
                includeJsonFiles: true,
                recursive: false, // Only look in the global directory itself
                maxDepth: 1
              });
              
              // Mark as global context
              const globalFiles = result.files.map(file => ({
                ...file,
                source: 'global' as const,
                priority: (file.priority || 0) + 1000 // Global files get highest priority
              }));
              
              logger.debug(`Loaded ${globalFiles.length} global context files`);
              return globalFiles;
            } catch (error) {
              logger.error(`Error loading global context: ${error}`);
              return [];
            }
          })()
        : Promise.resolve([]),
      
      // Project context (upward traversal from project root if found)
      mergedConfig.enableProjectDiscovery
        ? loadProjectContext(projectRootResult.root || currentDir, mergedConfig)
        : Promise.resolve([]),
      
      // Current directory context
      loadMemoryFiles(currentDir, {
        includeVibexDir: true,
        includeRootFiles: true,
        includeMarkdownFiles: true,
        includeJsonFiles: true,
        recursive: false,
        maxDepth: 1
      }).then(result => result.files.map(file => ({
        ...file,
        source: 'project' as const,
        priority: (file.priority || 0) + 200 // Current dir gets high priority
      }))),
      
      // Subdirectory context (downward traversal)
      mergedConfig.enableSubdirectoryDiscovery
        ? loadSubdirectoryContext(currentDir, mergedConfig)
        : Promise.resolve([])
    ]);
    
    // Validate all context files
    const allFiles = [...globalFiles, ...projectFiles, ...currentFiles, ...subdirectoryFiles];
    for (const file of allFiles) {
      const validation = validateContextFile(file);
      if (validation.warnings.length > 0 || validation.errors.length > 0) {
        validationResults.push(validation);
      }
    }
    
    // Combine all files and sort by priority
    const sortedFiles = allFiles.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Remove duplicates (same file path)
    const uniqueFiles = sortedFiles.filter((file, index, array) => 
      array.findIndex(f => f.path === file.path) === index
    );
    
    // Process files and combine content with enhanced formatting
    let combinedContent = '';
    
    // Add metadata header
    combinedContent += `# VibeX Context Hierarchy\n\n`;
    combinedContent += `**Loaded**: ${new Date().toISOString()}\n`;
    combinedContent += `**Current Directory**: ${currentDir}\n`;
    if (projectRootResult.root) {
      combinedContent += `**Project Root**: ${projectRootResult.root} (confidence: ${projectRootResult.confidence}%)\n`;
      combinedContent += `**Project Markers**: ${projectRootResult.markers.join(', ')}\n`;
    }
    combinedContent += `**Total Files**: ${uniqueFiles.length}\n`;
    combinedContent += `**Total Characters**: ${allFiles.reduce((sum, file) => sum + file.content.length, 0)}\n\n`;
    
    // Add section headers for better organization
    if (globalFiles.length > 0) {
      combinedContent += '\n# Global Context\n\n';
      combinedContent += `*Files from ${mergedConfig.globalContextDir}*\n\n`;
      for (const file of globalFiles) {
        combinedContent += `## ${file.name}\n\n`;
        combinedContent += `**Path**: ${file.path}\n`;
        combinedContent += `**Last Modified**: ${file.lastModified.toISOString()}\n\n`;
        combinedContent += `${file.content}\n\n`;
      }
    }
    
    if (projectFiles.length > 0) {
      combinedContent += '\n# Project Context\n\n';
      combinedContent += `*Files from project hierarchy*\n\n`;
      for (const file of projectFiles) {
        combinedContent += `## ${file.name}\n\n`;
        combinedContent += `**Path**: ${file.path}\n`;
        combinedContent += `**Directory**: ${path.dirname(file.path)}\n`;
        combinedContent += `**Last Modified**: ${file.lastModified.toISOString()}\n\n`;
        combinedContent += `${file.content}\n\n`;
      }
    }
    
    if (currentFiles.length > 0) {
      combinedContent += '\n# Current Directory Context\n\n';
      combinedContent += `*Files from ${currentDir}*\n\n`;
      for (const file of currentFiles) {
        combinedContent += `## ${file.name}\n\n`;
        combinedContent += `**Path**: ${file.path}\n`;
        combinedContent += `**Last Modified**: ${file.lastModified.toISOString()}\n\n`;
        combinedContent += `${file.content}\n\n`;
      }
    }
    
    if (subdirectoryFiles.length > 0) {
      combinedContent += '\n# Subdirectory Context\n\n';
      combinedContent += `*Files from subdirectories*\n\n`;
      for (const file of subdirectoryFiles) {
        combinedContent += `## ${file.name}\n\n`;
        combinedContent += `**Path**: ${file.path}\n`;
        combinedContent += `**Directory**: ${path.dirname(file.path)}\n`;
        combinedContent += `**Last Modified**: ${file.lastModified.toISOString()}\n\n`;
        combinedContent += `${file.content}\n\n`;
      }
    }
    
    // Add validation warnings if any
    if (validationResults.length > 0) {
      combinedContent += '\n# Context Validation Warnings\n\n';
      for (const validation of validationResults) {
        if (validation.warnings.length > 0) {
          combinedContent += `**Warnings**:\n`;
          for (const warning of validation.warnings) {
            combinedContent += `- ${warning}\n`;
          }
          combinedContent += '\n';
        }
        if (validation.errors.length > 0) {
          combinedContent += `**Errors**:\n`;
          for (const error of validation.errors) {
            combinedContent += `- ${error}\n`;
          }
          combinedContent += '\n';
        }
      }
    }
    
    const result = {
      content: combinedContent,
      globalFiles,
      projectFiles,
      currentFiles,
      subdirectoryFiles,
      totalFiles: uniqueFiles.length,
      totalCharCount: combinedContent.length,
      errors,
      projectRoot: projectRootResult.root || undefined,
      projectConfidence: projectRootResult.confidence || undefined,
      validationResults: validationResults.length > 0 ? validationResults : undefined
    };
    
    logger.info(`Enhanced hierarchical context loaded: ${result.totalFiles} files, ${result.totalCharCount} characters`);
    if (projectRootResult.root) {
      logger.info(`Project root detected: ${projectRootResult.root} (${projectRootResult.confidence}% confidence)`);
    }
    if (validationResults.length > 0) {
      logger.warn(`Context validation found ${validationResults.length} files with warnings/errors`);
    }
    
    return result;
    
  } catch (error) {
    logger.error(`Error loading hierarchical context: ${error}`);
    errors.push(error instanceof Error ? error : new Error(String(error)));
    
    return {
      content: '',
      globalFiles: [],
      projectFiles: [],
      currentFiles: [],
      subdirectoryFiles: [],
      totalFiles: 0,
      totalCharCount: 0,
      errors,
      validationResults: []
    };
  }
}

/**
 * Create global context directory and default files if they don't exist
 */
export async function initializeGlobalContext(globalContextDir?: string): Promise<void> {
  const contextDir = globalContextDir || path.join(os.homedir(), '.vibex');
  
  try {
    // Create global context directory
    if (!await directoryExists(contextDir)) {
      await fs.mkdir(contextDir, { recursive: true });
      logger.info(`Created global context directory: ${contextDir}`);
    }
    
    // Create default VIBEX.md file
    const vibexMdPath = path.join(contextDir, 'VIBEX.md');
    if (!await fileExists(vibexMdPath)) {
      const defaultContent = `# Global VibeX Context

This file provides global context and instructions for the VibeX AI assistant across all projects.

## Global Preferences

- Preferred coding style: Clean, readable, well-documented
- Language preferences: TypeScript, Python, Rust
- Testing approach: Comprehensive unit and integration tests
- Documentation style: Clear, concise, with examples

## Global Instructions

- Always prioritize code quality and maintainability
- Include comprehensive error handling
- Write meaningful commit messages
- Follow established conventions and best practices
- Explain complex logic with comments
- Prefer functional programming patterns where appropriate

## System Information

- Operating System: ${process.platform}
- Node.js Version: ${process.version}
- Home Directory: ${os.homedir()}
- VibeX Global Context: ${contextDir}

## Custom Tools and Preferences

Add your personal preferences, custom tool configurations, and global project settings here.
This context will be loaded for all VibeX sessions across all projects.
`;
      
      await fs.writeFile(vibexMdPath, defaultContent, 'utf-8');
      logger.info(`Created default global VIBEX.md: ${vibexMdPath}`);
    }
    
  } catch (error) {
    logger.error(`Error initializing global context: ${error}`);
    throw error;
  }
}

/**
 * Get memory commands for the hierarchical context system
 */
export function getMemoryCommands() {
  return {
    add: async (content: string, level: 'global' | 'project' | 'local' = 'local') => {
      // Implementation for adding memory content
      logger.info(`Adding memory content at ${level} level`);
    },
    
    show: async (level?: 'global' | 'project' | 'local') => {
      // Implementation for showing memory content
      const result = await loadHierarchicalContext();
      return result;
    },
    
    refresh: async () => {
      // Implementation for refreshing memory
      const result = await loadHierarchicalContext();
      logger.info(`Refreshed hierarchical context: ${result.totalFiles} files loaded`);
      return result;
    }
  };
} 