/**
 * Context Variable Interpolation System
 * 
 * Advanced variable interpolation system for context files that extends beyond
 * basic ${variable} replacement to provide comprehensive dynamic content generation,
 * cross-context references, conditional logic, and advanced variable resolution.
 * 
 * Features:
 * - Basic variable interpolation: ${variable}
 * - Environment variables: ${env.VAR_NAME}
 * - Cross-context references: ${context.project.title}
 * - Path variables: ${path.cwd}, ${path.home}, ${path.project}
 * - Git variables: ${git.branch}, ${git.commit}, ${git.author}
 * - Date/time variables: ${date.now}, ${date.iso}, ${time.hour}
 * - Conditional variables: ${if:condition:value:fallback}
 * - Nested variables: ${${base_var}_suffix}
 * - Function variables: ${fn:functionName:arg1:arg2}
 * - File content variables: ${file:path/to/file}
 * - Context metadata: ${meta.file.size}, ${meta.file.modified}
 * - Custom variable resolvers with caching
 * - Variable validation and error handling
 * - Circular reference detection
 * - Performance optimization with smart caching
 */

import { EventEmitter } from 'events';
import { readFile, stat, access } from 'fs/promises';
import { join, resolve, relative, basename, dirname, extname } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';

/**
 * Variable interpolation events
 */
export enum VariableInterpolationEvent {
  VARIABLE_RESOLVED = 'variable:resolved',
  VARIABLE_FAILED = 'variable:failed',
  CIRCULAR_REFERENCE = 'variable:circular',
  CACHE_HIT = 'variable:cache_hit',
  CACHE_MISS = 'variable:cache_miss',
  CUSTOM_RESOLVER_CALLED = 'variable:custom_resolver',
  VALIDATION_ERROR = 'variable:validation_error'
}

/**
 * Variable resolution result
 */
export interface VariableResolutionResult {
  /** Resolved value */
  value: string;
  
  /** Whether the value was cached */
  cached: boolean;
  
  /** Resolution time in milliseconds */
  resolutionTime: number;
  
  /** Variable type */
  type: VariableType;
  
  /** Source of the variable */
  source: string;
  
  /** Any warnings during resolution */
  warnings: string[];
}

/**
 * Variable types
 */
export enum VariableType {
  LITERAL = 'literal',
  ENVIRONMENT = 'environment',
  PATH = 'path',
  GIT = 'git',
  DATE = 'date',
  TIME = 'time',
  CONTEXT = 'context',
  CONDITIONAL = 'conditional',
  NESTED = 'nested',
  FUNCTION = 'function',
  FILE = 'file',
  METADATA = 'metadata',
  CUSTOM = 'custom'
}

/**
 * Variable resolver function
 */
export type VariableResolver = (
  variable: string,
  args: string[],
  context: VariableInterpolationContext
) => Promise<string> | string;

/**
 * Variable interpolation context
 */
export interface VariableInterpolationContext {
  /** Current working directory */
  cwd: string;
  
  /** Project root directory */
  projectRoot: string;
  
  /** Workspace root directory */
  workspaceRoot: string;
  
  /** Current file path being processed */
  currentFile: string;
  
  /** Environment variables */
  env: Record<string, string>;
  
  /** Context entries for cross-references */
  contextEntries: ContextEntry[];
  
  /** File metadata */
  fileMetadata: Record<string, any>;
  
  /** Custom variables */
  customVariables: Record<string, string>;
  
  /** Resolution stack for circular reference detection */
  resolutionStack: string[];
}

/**
 * Context entry interface
 */
export interface ContextEntry {
  type: string;
  path: string;
  content: string;
  priority: number;
  scope: string;
  lastModified: number;
  variables: Record<string, string>;
  metadata: Record<string, any>;
}

/**
 * Variable interpolation configuration
 */
export interface VariableInterpolationConfig {
  /** Maximum recursion depth for nested variables */
  maxRecursionDepth?: number;
  
  /** Cache TTL for resolved variables (ms) */
  cacheTTL?: number;
  
  /** Whether to enable git variables */
  enableGitVariables?: boolean;
  
  /** Whether to enable file content variables */
  enableFileVariables?: boolean;
  
  /** Whether to enable context cross-references */
  enableContextReferences?: boolean;
  
  /** Custom variable resolvers */
  customResolvers?: Record<string, VariableResolver>;
  
  /** Variable validation rules */
  validationRules?: VariableValidationRule[];
  
  /** Maximum file size for file variables (bytes) */
  maxFileSize?: number;
  
  /** Timeout for variable resolution (ms) */
  resolutionTimeout?: number;
  
  /** Whether to enable caching */
  enableCaching?: boolean;
  
  /** Whether to enable strict mode (throw on undefined variables) */
  strictMode?: boolean;
}

/**
 * Variable validation rule
 */
export interface VariableValidationRule {
  /** Variable pattern to match */
  pattern: RegExp;
  
  /** Validation function */
  validate: (variable: string, value: string, context: VariableInterpolationContext) => boolean | string;
  
  /** Error message template */
  errorMessage?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<VariableInterpolationConfig> = {
  maxRecursionDepth: 10,
  cacheTTL: 60000, // 1 minute
  enableGitVariables: true,
  enableFileVariables: true,
  enableContextReferences: true,
  customResolvers: {},
  validationRules: [],
  maxFileSize: 1024 * 1024, // 1MB
  resolutionTimeout: 5000, // 5 seconds
  enableCaching: true,
  strictMode: false
};

/**
 * Context Variable Interpolation System
 */
export class ContextVariableInterpolation extends EventEmitter {
  private readonly config: Required<VariableInterpolationConfig>;
  private readonly cache: Map<string, { value: string; timestamp: number }> = new Map();
  private readonly builtinResolvers: Record<string, VariableResolver>;
  
  constructor(config: Partial<VariableInterpolationConfig> = {}) {
    super();
    
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.builtinResolvers = this.createBuiltinResolvers();
  }
  
  /**
   * Interpolate variables in content
   */
  public async interpolate(
    content: string,
    context: VariableInterpolationContext
  ): Promise<string> {
    const startTime = Date.now();
    let result = content;
    let iteration = 0;
    
    // Process variables until no more substitutions are made
    while (iteration < this.config.maxRecursionDepth) {
      const previousResult = result;
      result = await this.processVariables(result, context);
      
      // If no changes were made, we're done
      if (result === previousResult) {
        break;
      }
      
      iteration++;
    }
    
    if (iteration >= this.config.maxRecursionDepth) {
      logger.warn('Maximum recursion depth reached during variable interpolation');
    }
    
    logger.debug(`Variable interpolation completed in ${Date.now() - startTime}ms after ${iteration} iterations`);
    
    return result;
  }
  
  /**
   * Process variables in content
   */
  private async processVariables(
    content: string,
    context: VariableInterpolationContext
  ): Promise<string> {
    // Enhanced regex to capture nested variables and complex patterns
    const variablePattern = /\$\{([^}]+)\}/g;
    let result = content;
    
    const matches = Array.from(content.matchAll(variablePattern));
    
    for (const match of matches) {
      const fullMatch = match[0];
      const variableExpression = match[1];
      
      try {
        // Check for circular references
        if (context.resolutionStack.includes(variableExpression)) {
          this.emit(VariableInterpolationEvent.CIRCULAR_REFERENCE, {
            variable: variableExpression,
            stack: context.resolutionStack
          });
          continue;
        }
        
        // Add to resolution stack
        const newContext = {
          ...context,
          resolutionStack: [...context.resolutionStack, variableExpression]
        };
        
        // Resolve the variable
        const resolutionResult = await this.resolveVariable(variableExpression, newContext);
        
        // Replace in content
        result = result.replace(fullMatch, resolutionResult.value);
        
        this.emit(VariableInterpolationEvent.VARIABLE_RESOLVED, {
          variable: variableExpression,
          value: resolutionResult.value,
          type: resolutionResult.type,
          cached: resolutionResult.cached,
          resolutionTime: resolutionResult.resolutionTime
        });
        
      } catch (error) {
        this.emit(VariableInterpolationEvent.VARIABLE_FAILED, {
          variable: variableExpression,
          error: error instanceof Error ? error.message : String(error)
        });
        
        if (this.config.strictMode) {
          throw error;
        }
        
        // In non-strict mode, leave variable unchanged
        logger.warn(`Failed to resolve variable ${variableExpression}:`, error);
      }
    }
    
    return result;
  }
  
  /**
   * Resolve a single variable
   */
  private async resolveVariable(
    variable: string,
    context: VariableInterpolationContext
  ): Promise<VariableResolutionResult> {
    const startTime = Date.now();
    
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.cache.get(variable);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        this.emit(VariableInterpolationEvent.CACHE_HIT, { variable });
        return {
          value: cached.value,
          cached: true,
          resolutionTime: Date.now() - startTime,
          type: this.getVariableType(variable),
          source: 'cache',
          warnings: []
        };
      }
    }
    
    this.emit(VariableInterpolationEvent.CACHE_MISS, { variable });
    
    // Parse variable expression
    const { type, resolver, args } = this.parseVariableExpression(variable);
    
    // Resolve the variable
    let value: string;
    let source: string;
    const warnings: string[] = [];
    
    try {
      if (resolver) {
        value = await Promise.resolve(resolver(variable, args, context));
        source = 'custom';
        
        this.emit(VariableInterpolationEvent.CUSTOM_RESOLVER_CALLED, {
          variable,
          resolver: resolver.name || 'anonymous'
        });
      } else {
        const result = await this.resolveBuiltinVariable(type, args, context);
        value = result.value;
        source = result.source;
        warnings.push(...result.warnings);
      }
    } catch (error) {
      if (this.config.strictMode) {
        throw error;
      }
      
      value = `\${${variable}}`;
      source = 'error';
      warnings.push(`Resolution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Validate the resolved value
    const validationResult = this.validateVariable(variable, value, context);
    if (validationResult !== true) {
      warnings.push(validationResult);
      
      this.emit(VariableInterpolationEvent.VALIDATION_ERROR, {
        variable,
        value,
        error: validationResult
      });
    }
    
    // Cache the result
    if (this.config.enableCaching && source !== 'error') {
      this.cache.set(variable, {
        value,
        timestamp: Date.now()
      });
    }
    
    const result: VariableResolutionResult = {
      value,
      cached: false,
      resolutionTime: Date.now() - startTime,
      type,
      source,
      warnings
    };
    
    return result;
  }
  
  /**
   * Parse variable expression
   */
  private parseVariableExpression(variable: string): {
    type: VariableType;
    resolver?: VariableResolver;
    args: string[];
  } {
    // Check for custom resolvers first
    for (const [pattern, resolver] of Object.entries(this.config.customResolvers)) {
      if (variable.startsWith(pattern)) {
        return {
          type: VariableType.CUSTOM,
          resolver,
          args: variable.substring(pattern.length + 1).split(':')
        };
      }
    }
    
    // Parse builtin variable types
    const parts = variable.split('.');
    const prefix = parts[0];
    
    switch (prefix) {
      case 'env':
        return { type: VariableType.ENVIRONMENT, args: parts.slice(1) };
      case 'path':
        return { type: VariableType.PATH, args: parts.slice(1) };
      case 'git':
        return { type: VariableType.GIT, args: parts.slice(1) };
      case 'date':
        return { type: VariableType.DATE, args: parts.slice(1) };
      case 'time':
        return { type: VariableType.TIME, args: parts.slice(1) };
      case 'context':
        return { type: VariableType.CONTEXT, args: parts.slice(1) };
      case 'meta':
        return { type: VariableType.METADATA, args: parts.slice(1) };
      case 'file':
        return { type: VariableType.FILE, args: variable.substring(5).split(':') };
      case 'fn':
        return { type: VariableType.FUNCTION, args: variable.substring(3).split(':') };
      case 'if':
        return { type: VariableType.CONDITIONAL, args: variable.substring(3).split(':') };
      default:
        // Check if it's a nested variable
        if (variable.includes('${')) {
          return { type: VariableType.NESTED, args: [variable] };
        }
        
        return { type: VariableType.LITERAL, args: [variable] };
    }
  }
  
  /**
   * Resolve builtin variable
   */
  private async resolveBuiltinVariable(
    type: VariableType,
    args: string[],
    context: VariableInterpolationContext
  ): Promise<{ value: string; source: string; warnings: string[] }> {
    const resolver = this.builtinResolvers[type];
    
    if (!resolver) {
      throw new Error(`Unknown variable type: ${type}`);
    }
    
    const value = await Promise.resolve(resolver(args.join('.'), args, context));
    
    return {
      value,
      source: type,
      warnings: []
    };
  }
  
  /**
   * Create builtin variable resolvers
   */
  private createBuiltinResolvers(): Record<string, VariableResolver> {
    return {
      [VariableType.LITERAL]: (variable, args, context) => {
        // Check custom variables first
        if (context.customVariables[variable]) {
          return context.customVariables[variable];
        }
        
        // Return the variable name as-is (undefined variable)
        return this.config.strictMode ? '' : `\${${variable}}`;
      },
      
      [VariableType.ENVIRONMENT]: (variable, args, context) => {
        const envVar = args[0];
        const value = context.env[envVar] || process.env[envVar];
        
        if (value === undefined && this.config.strictMode) {
          throw new Error(`Environment variable ${envVar} is not defined`);
        }
        
        return value || '';
      },
      
      [VariableType.PATH]: (variable, args, context) => {
        const pathType = args[0];
        
        switch (pathType) {
          case 'cwd':
            return context.cwd;
          case 'home':
            return homedir();
          case 'project':
            return context.projectRoot;
          case 'workspace':
            return context.workspaceRoot;
          case 'current':
            return context.currentFile;
          case 'dirname':
            return dirname(context.currentFile);
          case 'basename':
            return basename(context.currentFile);
          case 'extname':
            return extname(context.currentFile);
          case 'relative':
            return relative(context.cwd, context.currentFile);
          default:
            throw new Error(`Unknown path type: ${pathType}`);
        }
      },
      
      [VariableType.GIT]: async (variable, args, context) => {
        if (!this.config.enableGitVariables) {
          return '';
        }
        
        const gitCommand = args[0];
        
        try {
          switch (gitCommand) {
            case 'branch':
              return execSync('git rev-parse --abbrev-ref HEAD', { 
                cwd: context.projectRoot,
                encoding: 'utf8'
              }).trim();
            
            case 'commit':
              return execSync('git rev-parse HEAD', { 
                cwd: context.projectRoot,
                encoding: 'utf8'
              }).trim();
            
            case 'short':
              return execSync('git rev-parse --short HEAD', { 
                cwd: context.projectRoot,
                encoding: 'utf8'
              }).trim();
            
            case 'author':
              return execSync('git config user.name', { 
                cwd: context.projectRoot,
                encoding: 'utf8'
              }).trim();
            
            case 'email':
              return execSync('git config user.email', { 
                cwd: context.projectRoot,
                encoding: 'utf8'
              }).trim();
            
            case 'remote':
              return execSync('git config --get remote.origin.url', { 
                cwd: context.projectRoot,
                encoding: 'utf8'
              }).trim();
            
            default:
              throw new Error(`Unknown git command: ${gitCommand}`);
          }
        } catch (error) {
          if (this.config.strictMode) {
            throw error;
          }
          return '';
        }
      },
      
      [VariableType.DATE]: (variable, args, context) => {
        const dateType = args[0];
        const now = new Date();
        
        switch (dateType) {
          case 'now':
            return now.toISOString();
          case 'iso':
            return now.toISOString().split('T')[0];
          case 'year':
            return now.getFullYear().toString();
          case 'month':
            return (now.getMonth() + 1).toString().padStart(2, '0');
          case 'day':
            return now.getDate().toString().padStart(2, '0');
          case 'timestamp':
            return now.getTime().toString();
          default:
            return now.toISOString();
        }
      },
      
      [VariableType.TIME]: (variable, args, context) => {
        const timeType = args[0];
        const now = new Date();
        
        switch (timeType) {
          case 'hour':
            return now.getHours().toString().padStart(2, '0');
          case 'minute':
            return now.getMinutes().toString().padStart(2, '0');
          case 'second':
            return now.getSeconds().toString().padStart(2, '0');
          case 'iso':
            return now.toTimeString().split(' ')[0];
          default:
            return now.toTimeString();
        }
      },
      
      [VariableType.CONTEXT]: (variable, args, context) => {
        if (!this.config.enableContextReferences) {
          return '';
        }
        
        const [scope, property] = args;
        const entry = context.contextEntries.find(e => e.scope === scope);
        
        if (!entry) {
          if (this.config.strictMode) {
            throw new Error(`Context scope ${scope} not found`);
          }
          return '';
        }
        
        switch (property) {
          case 'content':
            return entry.content;
          case 'path':
            return entry.path;
          case 'type':
            return entry.type;
          case 'priority':
            return entry.priority.toString();
          case 'modified':
            return new Date(entry.lastModified).toISOString();
          default:
            return entry.variables[property] || entry.metadata[property] || '';
        }
      },
      
      [VariableType.FILE]: async (variable, args, context) => {
        if (!this.config.enableFileVariables) {
          return '';
        }
        
        const filePath = args[0];
        const resolvedPath = resolve(context.cwd, filePath);
        
        try {
          const stats = await stat(resolvedPath);
          
          if (stats.size > this.config.maxFileSize) {
            throw new Error(`File too large: ${stats.size} bytes`);
          }
          
          return await readFile(resolvedPath, 'utf8');
        } catch (error) {
          if (this.config.strictMode) {
            throw error;
          }
          return '';
        }
      },
      
      [VariableType.METADATA]: (variable, args, context) => {
        const [category, property] = args;
        
        switch (category) {
          case 'file':
            return context.fileMetadata[property] || '';
          default:
            return '';
        }
      },
      
      [VariableType.CONDITIONAL]: (variable, args, context) => {
        const [condition, trueValue, falseValue] = args;
        
        // Simple condition evaluation
        const conditionResult = this.evaluateCondition(condition, context);
        
        return conditionResult ? (trueValue || '') : (falseValue || '');
      },
      
      [VariableType.FUNCTION]: async (variable, args, context) => {
        const [functionName, ...functionArgs] = args;
        
        // Built-in functions
        switch (functionName) {
          case 'upper':
            return (functionArgs[0] || '').toUpperCase();
          case 'lower':
            return (functionArgs[0] || '').toLowerCase();
          case 'trim':
            return (functionArgs[0] || '').trim();
          case 'replace':
            return (functionArgs[0] || '').replace(
              new RegExp(functionArgs[1] || '', 'g'),
              functionArgs[2] || ''
            );
          case 'substring':
            return (functionArgs[0] || '').substring(
              parseInt(functionArgs[1] || '0'),
              parseInt(functionArgs[2] || '0') || undefined
            );
          default:
            throw new Error(`Unknown function: ${functionName}`);
        }
      },
      
      [VariableType.NESTED]: async (variable, args, context) => {
        // Resolve nested variables recursively
        return await this.interpolate(args[0], context);
      }
    };
  }
  
  /**
   * Evaluate a simple condition
   */
  private evaluateCondition(condition: string, context: VariableInterpolationContext): boolean {
    // Simple condition evaluation (can be extended)
    if (condition.startsWith('env.')) {
      const envVar = condition.substring(4);
      return !!(context.env[envVar] || process.env[envVar]);
    }
    
    if (condition.startsWith('file.')) {
      const filePath = condition.substring(5);
      try {
        require('fs').accessSync(resolve(context.cwd, filePath));
        return true;
      } catch {
        return false;
      }
    }
    
    // Default to checking if it's a truthy custom variable
    return !!context.customVariables[condition];
  }
  
  /**
   * Validate a resolved variable
   */
  private validateVariable(
    variable: string,
    value: string,
    context: VariableInterpolationContext
  ): true | string {
    for (const rule of this.config.validationRules) {
      if (rule.pattern.test(variable)) {
        const result = rule.validate(variable, value, context);
        if (result !== true) {
          return typeof result === 'string' ? result : (rule.errorMessage || 'Validation failed');
        }
      }
    }
    
    return true;
  }
  
  /**
   * Get variable type from variable name
   */
  private getVariableType(variable: string): VariableType {
    const { type } = this.parseVariableExpression(variable);
    return type;
  }
  
  /**
   * Clear variable cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
  } {
    return {
      size: this.cache.size,
      hits: this.listenerCount(VariableInterpolationEvent.CACHE_HIT),
      misses: this.listenerCount(VariableInterpolationEvent.CACHE_MISS)
    };
  }
  
  /**
   * Add custom variable resolver
   */
  public addCustomResolver(pattern: string, resolver: VariableResolver): void {
    this.config.customResolvers[pattern] = resolver;
  }
  
  /**
   * Remove custom variable resolver
   */
  public removeCustomResolver(pattern: string): void {
    delete this.config.customResolvers[pattern];
  }
  
  /**
   * Add validation rule
   */
  public addValidationRule(rule: VariableValidationRule): void {
    this.config.validationRules.push(rule);
  }
}

/**
 * Create context variable interpolation system
 */
export function createContextVariableInterpolation(
  config?: Partial<VariableInterpolationConfig>
): ContextVariableInterpolation {
  return new ContextVariableInterpolation(config);
}

/**
 * Default variable interpolation instance
 */
export const defaultVariableInterpolation = createContextVariableInterpolation(); 