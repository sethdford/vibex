/**
 * Simple Startup Sequence
 * 
 * Clean, ordered startup following Gemini CLI's proven approach.
 * Load config→auth→context→UI in the correct sequence.
 */

import { logger } from '../utils/logger.js';
import { createSimpleAuth } from '../auth/simple-auth.js';
import { loadSimpleConfig } from '../config/simple-config.js';

/**
 * Startup options
 */
export interface StartupOptions {
  /**
   * Working directory
   */
  workingDir?: string;
  
  /**
   * Debug mode
   */
  debug?: boolean;
  
  /**
   * Full context mode
   */
  fullContext?: boolean;
  
  /**
   * Model to use
   */
  model?: string;
  
  /**
   * Initial context/prompt
   */
  initialContext?: string;
}

/**
 * Startup result
 */
export interface StartupResult {
  /**
   * Configuration
   */
  config: any;
  
  /**
   * Authentication
   */
  auth: any;
  
  /**
   * Pre-loaded context
   */
  context?: string;
  
  /**
   * Startup warnings
   */
  warnings: string[];
}

/**
 * Simple startup sequence following Gemini's approach
 */
export async function simpleStartup(options: StartupOptions = {}): Promise<StartupResult> {
  const warnings: string[] = [];
  
  logger.debug('🚀 Starting VibeX with simple startup sequence...');
  
  // Step 1: Load Configuration (Gemini-style)
  logger.debug('📋 Loading configuration...');
  let config;
  try {
    config = await loadSimpleConfig();
    logger.debug('✅ Configuration loaded successfully');
  } catch (error) {
    const message = `Failed to load configuration: ${error}`;
    logger.error(message);
    warnings.push(message);
    throw new Error(message);
  }
  
  // Step 2: Initialize Authentication (Gemini-style)
  logger.debug('🔐 Initializing authentication...');
  let auth;
  try {
    auth = await createSimpleAuth();
    const isValid = await auth.isValid();
    
    if (!isValid) {
      const message = 'Authentication not configured. Please set CLAUDE_API_KEY or ANTHROPIC_API_KEY environment variable.';
      logger.warn(message);
      warnings.push(message);
    } else {
      logger.debug('✅ Authentication validated successfully');
    }
  } catch (error) {
    const message = `Authentication initialization failed: ${error}`;
    logger.error(message);
    warnings.push(message);
    throw new Error(message);
  }
  
  // Step 3: Pre-load Context (Gemini-style, only if needed)
  let context: string | undefined;
  if (options.fullContext) {
    logger.debug('📁 Pre-loading project context...');
    try {
      // Use the existing context system but load once at startup
      const { createContextSystem } = await import('../context/context-system-refactored.js');
      const contextSystem = createContextSystem();
      const result = await contextSystem.loadContext();
      
      if (result.stats.totalFiles > 0) {
        context = result.content;
        logger.debug(`✅ Context pre-loaded: ${result.stats.totalFiles} files, ${result.stats.totalSize} characters`);
      } else {
        logger.debug('📁 No context files found');
      }
    } catch (error) {
      const message = `Context loading failed: ${error}`;
      logger.warn(message);
      warnings.push(message);
      // Don't fail startup for context loading issues
    }
  } else {
    logger.debug('📁 Context loading skipped (not in full context mode)');
  }
  
  // Step 4: Validate Environment
  logger.debug('🔍 Validating environment...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    const message = `Node.js ${nodeVersion} is not supported. Please use Node.js 18 or higher.`;
    logger.warn(message);
    warnings.push(message);
  }
  
  // Check memory usage
  const memUsage = process.memoryUsage();
  const memUsageMB = Math.round(memUsage.rss / 1024 / 1024);
  logger.debug(`💾 Memory usage: ${memUsageMB}MB`);
  
  if (memUsageMB > 500) {
    const message = `High memory usage detected: ${memUsageMB}MB`;
    logger.warn(message);
    warnings.push(message);
  }
  
  logger.debug('✅ Simple startup sequence completed successfully');
  
  return {
    config,
    auth,
    context,
    warnings
  };
}

/**
 * Validate startup requirements
 */
export async function validateStartupRequirements(): Promise<string[]> {
  const issues: string[] = [];
  
  // Check for API key
  const hasApiKey = !!(process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY);
  if (!hasApiKey) {
    issues.push('No API key found. Set CLAUDE_API_KEY or ANTHROPIC_API_KEY environment variable.');
  }
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    issues.push(`Node.js ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
  }
  
  // Check if terminal supports TTY
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    issues.push('Terminal does not support TTY. Some features may not work correctly.');
  }
  
  return issues;
}

/**
 * Get startup performance metrics
 */
export function getStartupMetrics() {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    memoryUsage: {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024) // MB
    },
    uptime: Math.round(uptime * 1000), // ms
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
} 