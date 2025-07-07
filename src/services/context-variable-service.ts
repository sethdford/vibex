/**
 * Context Variable Service - Clean Architecture like Gemini CLI
 * 
 * Single Responsibility: Process and interpolate variables in context
 * - Variable extraction from content
 * - Variable interpolation and substitution
 * - Built-in variable patterns
 */

import { logger } from '../utils/logger.js';
import type { ContextEntry } from './context-loading-service.js';

/**
 * Variable processing configuration
 */
export interface VariableConfig {
  enableInterpolation: boolean;
  variablePatterns: Record<string, () => string>;
  customVariables: Record<string, string>;
}

/**
 * Default variable patterns
 */
const DEFAULT_VARIABLE_PATTERNS: Record<string, () => string> = {
  '{{DATE}}': () => new Date().toISOString().split('T')[0],
  '{{TIME}}': () => new Date().toTimeString().split(' ')[0],
  '{{TIMESTAMP}}': () => new Date().toISOString(),
  '{{USER}}': () => process.env.USER || process.env.USERNAME || 'unknown',
  '{{HOME}}': () => process.env.HOME || process.env.USERPROFILE || '~',
  '{{CWD}}': () => process.cwd(),
  '{{NODE_VERSION}}': () => process.version,
  '{{PLATFORM}}': () => process.platform,
  '{{ARCH}}': () => process.arch
};

/**
 * Default configuration
 */
const DEFAULT_VARIABLE_CONFIG: VariableConfig = {
  enableInterpolation: true,
  variablePatterns: DEFAULT_VARIABLE_PATTERNS,
  customVariables: {}
};

/**
 * Context Variable Service
 * 
 * Focused responsibility: Variable processing and interpolation
 */
export class ContextVariableService {
  private readonly config: VariableConfig;

  constructor(config: Partial<VariableConfig> = {}) {
    this.config = {
      ...DEFAULT_VARIABLE_CONFIG,
      ...config,
      variablePatterns: {
        ...DEFAULT_VARIABLE_PATTERNS,
        ...config.variablePatterns
      },
      customVariables: {
        ...DEFAULT_VARIABLE_CONFIG.customVariables,
        ...config.customVariables
      }
    };
  }

  /**
   * Process variables from context entries
   */
  public async processVariables(entries: ContextEntry[]): Promise<Record<string, string>> {
    const allVariables: Record<string, string> = {};
    
    // Add built-in variables
    for (const [pattern, resolver] of Object.entries(this.config.variablePatterns)) {
      try {
        const value = resolver();
        allVariables[pattern] = value;
      } catch (error) {
        logger.warn(`Failed to resolve variable ${pattern}`, error);
      }
    }
    
    // Add custom variables
    Object.assign(allVariables, this.config.customVariables);
    
    // Extract variables from entries
    for (const entry of entries) {
      const entryVariables = this.extractVariablesFromContent(entry.content);
      Object.assign(allVariables, entryVariables);
      
      // Add entry-specific variables
      Object.assign(allVariables, entry.variables);
    }
    
    return allVariables;
  }

  /**
   * Interpolate variables in context entries
   */
  public async interpolateVariables(
    entries: ContextEntry[],
    variables: Record<string, string>
  ): Promise<void> {
    if (!this.config.enableInterpolation) {
      return;
    }

    for (const entry of entries) {
      try {
        entry.content = this.interpolateContent(entry.content, variables);
      } catch (error) {
        logger.warn(`Failed to interpolate variables in ${entry.path}`, error);
      }
    }
  }

  /**
   * Extract variables from content
   */
  private extractVariablesFromContent(content: string): Record<string, string> {
    const variables: Record<string, string> = {};
    
    // Look for variable definitions like: VAR_NAME=value
    const variableRegex = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/gm;
    let match;
    
    while ((match = variableRegex.exec(content)) !== null) {
      const [, name, value] = match;
      variables[`{{${name}}}`] = value.trim();
    }
    
    // Look for YAML-style variables
    const yamlVariableRegex = /^(\w+):\s*(.+)$/gm;
    while ((match = yamlVariableRegex.exec(content)) !== null) {
      const [, name, value] = match;
      if (name.toUpperCase() === name) {
        variables[`{{${name}}}`] = value.trim();
      }
    }
    
    return variables;
  }

  /**
   * Interpolate content with variables
   */
  private interpolateContent(content: string, variables: Record<string, string>): string {
    let interpolated = content;
    
    // Replace variables in order of specificity (longest first)
    const sortedVariables = Object.entries(variables)
      .sort(([a], [b]) => b.length - a.length);
    
    for (const [pattern, value] of sortedVariables) {
      // Escape special regex characters in pattern
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedPattern, 'g');
      interpolated = interpolated.replace(regex, value);
    }
    
    return interpolated;
  }

  /**
   * Add custom variable
   */
  public addVariable(name: string, value: string): void {
    const pattern = name.startsWith('{{') && name.endsWith('}}') 
      ? name 
      : `{{${name}}}`;
    
    this.config.customVariables[pattern] = value;
  }

  /**
   * Add variable pattern
   */
  public addVariablePattern(pattern: string, resolver: () => string): void {
    this.config.variablePatterns[pattern] = resolver;
  }

  /**
   * Get all available variables
   */
  public getAvailableVariables(): Record<string, string> {
    const variables: Record<string, string> = {};
    
    // Add resolved patterns
    for (const [pattern, resolver] of Object.entries(this.config.variablePatterns)) {
      try {
        variables[pattern] = resolver();
      } catch (error) {
        variables[pattern] = `<Error: ${error instanceof Error ? error.message : String(error)}>`;
      }
    }
    
    // Add custom variables
    Object.assign(variables, this.config.customVariables);
    
    return variables;
  }

  /**
   * Validate variable syntax
   */
  public validateVariableSyntax(content: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // Check for malformed variable patterns
    const malformedPatterns = [
      /\{\{[^}]*$/g,  // Unclosed variables
      /^[^{]*\}\}/g,  // Unopened variables
      /\{\{\s*\}\}/g  // Empty variables
    ];

    for (const pattern of malformedPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        result.isValid = false;
        result.errors.push(`Malformed variable syntax: ${matches.join(', ')}`);
      }
    }

    // Check for undefined variables
    const variablePattern = /\{\{([^}]+)\}\}/g;
    let match;
    const availableVariables = this.getAvailableVariables();
    
    while ((match = variablePattern.exec(content)) !== null) {
      const [fullMatch, varName] = match;
      if (!availableVariables[fullMatch]) {
        result.warnings.push(`Undefined variable: ${fullMatch}`);
      }
    }

    return result;
  }

  /**
   * Get configuration
   */
  public getConfig(): VariableConfig {
    return { ...this.config };
  }
}

/**
 * Create context variable service
 */
export function createContextVariableService(config?: Partial<VariableConfig>): ContextVariableService {
  return new ContextVariableService(config);
} 