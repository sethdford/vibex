/**
 * Codebase Analysis Module
 * 
 * This module provides utilities for analyzing and understanding code structure,
 * dependencies, and metrics about a codebase.
 */

import {
  analyzeCodebase,
  FileInfo,
  DependencyInfo,
  ProjectStructure,
  analyzeProjectDependencies,
  findFilesByContent
} from './analyzer.js';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

export {
  analyzeCodebase,
  type FileInfo,
  type DependencyInfo,
  type ProjectStructure,
  analyzeProjectDependencies,
  findFilesByContent,
};

/**
 * Analyze a codebase and return a summary of its structure
 * 
 * @param directoryPath - Path to the directory to analyze
 * @param options - Analysis options
 * @returns Promise resolving to the project structure
 */
export async function analyzeProject(
  directoryPath: string,
  options: {
    ignorePatterns?: string[];
    maxFiles?: number;
    maxSizePerFile?: number;
  } = {}
): Promise<ProjectStructure> {
  return analyzeCodebase(directoryPath, options);
}

/**
 * Background analysis state
 */
interface BackgroundAnalysisState {
  running: boolean;
  interval: NodeJS.Timeout | null;
  lastResults: ProjectStructure | null;
  workingDirectory: string | null;
}

// Background analysis state
const backgroundAnalysis: BackgroundAnalysisState = {
  running: false,
  interval: null,
  lastResults: null,
  workingDirectory: null
};

interface CodebaseConfig {
  codebase?: {
    maxDepth?: number;
    includeTests?: boolean;
    excludePatterns?: string[];
    includePatterns?: string[];
  };
}

/**
 * Initialize the codebase analysis subsystem
 * 
 * @param config Configuration options for the codebase analysis
 * @returns The initialized codebase analysis system
 */
export function initCodebaseAnalysis(config: unknown = {}) {
  const analysisConfig = (config && typeof config === 'object' && 'codebase' in config) 
    ? (config as { codebase?: Record<string, unknown> }).codebase || {}
    : {};
  
  return {
    /**
     * Analyze the current working directory
     */
    analyzeCurrentDirectory: async (options = {}) => {
      const cwd = process.cwd();
      return analyzeCodebase(cwd, {
        ...analysisConfig,
        ...options
      });
    },
    
    /**
     * Analyze a specific directory
     */
    analyzeDirectory: async (directoryPath: string, options = {}) => analyzeCodebase(directoryPath, {
        ...analysisConfig,
        ...options
      }),
    
    /**
     * Find files by content pattern
     */
    findFiles: async (pattern: string, directoryPath: string = process.cwd(), options = {}) => findFilesByContent(pattern, directoryPath, options),
    
    /**
     * Analyze project dependencies
     */
    analyzeDependencies: async (directoryPath: string = process.cwd()) => analyzeProjectDependencies(directoryPath),
    
    /**
     * Start background analysis of the current directory
     */
    startBackgroundAnalysis: async (interval = 5 * 60 * 1000) => { // Default: 5 minutes
      if (backgroundAnalysis.running) {
        return;
      }
      
      backgroundAnalysis.workingDirectory = process.cwd();
      
      // Check if the directory looks like a code project
      try {
        const files = await fs.readdir(backgroundAnalysis.workingDirectory);
        const hasCodeFiles = files.some(file => 
          file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.py') || 
          file.endsWith('.java') || file.endsWith('.cpp') || file.endsWith('.c') ||
          file === 'package.json' || file === 'requirements.txt' || file === 'pom.xml' ||
          file === 'Cargo.toml' || file === 'go.mod'
        );
        
        if (!hasCodeFiles) {
          logger.info('No code files detected in current directory, skipping background analysis');
          return;
        }
      } catch (error: unknown) {
        logger.warn('Cannot access current directory for analysis:', error instanceof Error ? error.message : String(error));
        return;
      }
      
      backgroundAnalysis.running = true;
      
      // Perform initial analysis
      try {
        const results = await analyzeCodebase(backgroundAnalysis.workingDirectory, analysisConfig);
        backgroundAnalysis.lastResults = results;
      } catch (err: unknown) {
        logger.warn('Background analysis skipped:', err instanceof Error ? err.message : String(err));
        return;
      }
      
      // Set up interval for periodic re-analysis
      backgroundAnalysis.interval = setInterval(async () => {
        if (!backgroundAnalysis.running || !backgroundAnalysis.workingDirectory) {
          return;
        }
        
        try {
          const results = await analyzeCodebase(backgroundAnalysis.workingDirectory, analysisConfig);
          backgroundAnalysis.lastResults = results;
        } catch (err: unknown) {
          logger.error('Background analysis error:', err instanceof Error ? err.message : String(err));
        }
      }, interval);
    },
    
    /**
     * Stop background analysis
     */
    stopBackgroundAnalysis: () => {
      if (!backgroundAnalysis.running) {
        return;
      }
      
      if (backgroundAnalysis.interval) {
        clearInterval(backgroundAnalysis.interval);
        backgroundAnalysis.interval = null;
      }
      
      backgroundAnalysis.running = false;
    },
    
    /**
     * Get the latest background analysis results
     */
    getBackgroundAnalysisResults: () => backgroundAnalysis.lastResults
  };
} 