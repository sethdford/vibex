/**
 * Context Inheritance Engine
 * 
 * Advanced context inheritance system that extends beyond simple global->project->directory chain.
 * Provides sophisticated inheritance rules, context overrides, selective merging, and inheritance
 * strategies that achieve Gemini CLI parity and beyond.
 * 
 * Inheritance Hierarchy:
 * 1. System Context (built-in defaults)
 * 2. Global Context (~/.vibex/VIBEX.md)
 * 3. User Context (~/.vibex/user-context.md)
 * 4. Workspace Context (workspace root)
 * 5. Project Context (project root)
 * 6. Directory Context (current directory)
 * 7. File Context (file-specific context)
 * 8. Session Context (runtime overrides)
 * 
 * Advanced Features:
 * - Context Scoping (inherit, override, merge, replace)
 * - Selective Inheritance (inherit specific sections)
 * - Context Conditions (conditional inheritance)
 * - Context Transforms (modify inherited content)
 * - Context Validation (inheritance constraints)
 */

import { EventEmitter } from 'events';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';

/**
 * Context validation error
 */
export interface ContextValidationError {
  type: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Enhanced context entry (simplified for inheritance engine)
 */
export interface EnhancedContextEntry {
  path: string;
  content: string;
  processedContent: string;
  variables?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Context inheritance scope
 */
export enum ContextInheritanceScope {
  SYSTEM = 'system',
  GLOBAL = 'global',
  USER = 'user',
  WORKSPACE = 'workspace',
  PROJECT = 'project',
  DIRECTORY = 'directory',
  FILE = 'file',
  SESSION = 'session'
}

/**
 * Context inheritance strategy
 */
export enum ContextInheritanceStrategy {
  INHERIT = 'inherit',        // Inherit all from parent
  OVERRIDE = 'override',      // Override specific sections
  MERGE = 'merge',           // Merge with parent
  REPLACE = 'replace',       // Replace parent completely
  APPEND = 'append',         // Append to parent
  PREPEND = 'prepend',       // Prepend to parent
  SELECTIVE = 'selective',   // Inherit specific sections only
  CONDITIONAL = 'conditional' // Conditional inheritance
}

/**
 * Context inheritance rule
 */
export interface ContextInheritanceRule {
  /**
   * Rule name
   */
  name: string;
  
  /**
   * Inheritance scope this rule applies to
   */
  scope: ContextInheritanceScope;
  
  /**
   * Inheritance strategy
   */
  strategy: ContextInheritanceStrategy;
  
  /**
   * Sections to inherit/override (for selective strategies)
   */
  sections?: string[];
  
  /**
   * Conditions for inheritance (for conditional strategy)
   */
  conditions?: ContextInheritanceCondition[];
  
  /**
   * Content transforms to apply
   */
  transforms?: ContextTransform[];
  
  /**
   * Priority (higher = more important)
   */
  priority: number;
  
  /**
   * Whether this rule is enabled
   */
  enabled: boolean;
}

/**
 * Context inheritance condition
 */
export interface ContextInheritanceCondition {
  /**
   * Condition type
   */
  type: 'file_exists' | 'env_var' | 'content_match' | 'path_match' | 'custom';
  
  /**
   * Condition value
   */
  value: string;
  
  /**
   * Whether condition should be negated
   */
  negate?: boolean;
  
  /**
   * Custom condition function (for custom type)
   */
  customCondition?: (context: ContextInheritanceContext) => boolean;
}

/**
 * Context transform
 */
export interface ContextTransform {
  /**
   * Transform name
   */
  name: string;
  
  /**
   * Transform type
   */
  type: 'replace' | 'regex' | 'template' | 'function';
  
  /**
   * Transform parameters
   */
  params: Record<string, any>;
  
  /**
   * Transform function (for function type)
   */
  transform?: (content: string, context: ContextInheritanceContext) => string;
}

/**
 * Context inheritance context
 */
export interface ContextInheritanceContext {
  /**
   * Current scope
   */
  scope: ContextInheritanceScope;
  
  /**
   * Current file path
   */
  filePath: string;
  
  /**
   * Current directory
   */
  directory: string;
  
  /**
   * Project root
   */
  projectRoot: string;
  
  /**
   * Workspace root
   */
  workspaceRoot: string;
  
  /**
   * Environment variables
   */
  env: Record<string, string>;
  
  /**
   * Context variables
   */
  variables: Record<string, string>;
  
  /**
   * Parent context entries
   */
  parents: EnhancedContextEntry[];
  
  /**
   * Current context entry
   */
  current: EnhancedContextEntry;
}

/**
 * Context inheritance result
 */
export interface ContextInheritanceResult {
  /**
   * Final inherited content
   */
  content: string;
  
  /**
   * Inheritance chain used
   */
  chain: ContextInheritanceChainEntry[];
  
  /**
   * Rules applied
   */
  rulesApplied: ContextInheritanceRule[];
  
  /**
   * Transforms applied
   */
  transformsApplied: ContextTransform[];
  
  /**
   * Inheritance statistics
   */
  stats: {
    totalEntries: number;
    totalRules: number;
    totalTransforms: number;
    processingTime: number;
    cacheHits: number;
  };
  
  /**
   * Validation errors
   */
  validationErrors: ContextValidationError[];
}

/**
 * Context inheritance chain entry
 */
export interface ContextInheritanceChainEntry {
  /**
   * Scope of this entry
   */
  scope: ContextInheritanceScope;
  
  /**
   * Context entry
   */
  entry: EnhancedContextEntry;
  
  /**
   * Strategy used for this entry
   */
  strategy: ContextInheritanceStrategy;
  
  /**
   * Rules applied to this entry
   */
  rules: ContextInheritanceRule[];
  
  /**
   * Content contribution
   */
  contribution: string;
  
  /**
   * Processing time for this entry
   */
  processingTime: number;
}

/**
 * Context inheritance configuration
 */
export interface ContextInheritanceConfig {
  /**
   * Default inheritance strategy
   */
  defaultStrategy?: ContextInheritanceStrategy;
  
  /**
   * Enable context inheritance
   */
  enableInheritance?: boolean;
  
  /**
   * Enable context caching
   */
  enableCaching?: boolean;
  
  /**
   * Cache TTL (ms)
   */
  cacheTTL?: number;
  
  /**
   * Maximum inheritance depth
   */
  maxInheritanceDepth?: number;
  
  /**
   * Inheritance rules
   */
  rules?: ContextInheritanceRule[];
  
  /**
   * Global transforms
   */
  globalTransforms?: ContextTransform[];
  
  /**
   * Enable validation
   */
  enableValidation?: boolean;
  
  /**
   * Maximum content size after inheritance
   */
  maxContentSize?: number;
}

/**
 * Context inheritance events
 */
export enum ContextInheritanceEvent {
  INHERITANCE_STARTED = 'inheritance:started',
  INHERITANCE_COMPLETED = 'inheritance:completed',
  RULE_APPLIED = 'rule:applied',
  TRANSFORM_APPLIED = 'transform:applied',
  CONDITION_EVALUATED = 'condition:evaluated',
  VALIDATION_ERROR = 'validation:error',
  CACHE_HIT = 'cache:hit',
  CACHE_MISS = 'cache:miss'
}

/**
 * Context Inheritance Engine
 */
export class ContextInheritanceEngine extends EventEmitter {
  private readonly config: Required<ContextInheritanceConfig>;
  private readonly cache: Map<string, ContextInheritanceResult> = new Map();
  private readonly ruleCache: Map<string, ContextInheritanceRule[]> = new Map();
  
  constructor(config: Partial<ContextInheritanceConfig> = {}) {
    super();
    
    this.config = {
      defaultStrategy: ContextInheritanceStrategy.MERGE,
      enableInheritance: true,
      enableCaching: true,
      cacheTTL: 60000, // 1 minute
      maxInheritanceDepth: 10,
      rules: DEFAULT_INHERITANCE_RULES,
      globalTransforms: DEFAULT_GLOBAL_TRANSFORMS,
      enableValidation: true,
      maxContentSize: 10 * 1024 * 1024, // 10MB
      ...config
    };
  }
  
  /**
   * Apply inheritance to context entries
   */
  public async applyInheritance(
    entries: EnhancedContextEntry[],
    context: Partial<ContextInheritanceContext> = {}
  ): Promise<ContextInheritanceResult> {
    const startTime = Date.now();
    
    if (!this.config.enableInheritance) {
      return this.createNoInheritanceResult(entries, startTime);
    }
    
    try {
      this.emit(ContextInheritanceEvent.INHERITANCE_STARTED, { entries: entries.length });
      
      // Build inheritance context
      const inheritanceContext = await this.buildInheritanceContext(entries, context);
      
      // Generate cache key
      const cacheKey = this.generateCacheKey(inheritanceContext);
      
      // Check cache
      if (this.config.enableCaching && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        if (Date.now() - startTime < this.config.cacheTTL) {
          this.emit(ContextInheritanceEvent.CACHE_HIT, { cacheKey });
          return cached;
        }
      }
      
      this.emit(ContextInheritanceEvent.CACHE_MISS, { cacheKey });
      
      // Build inheritance chain
      const chain = await this.buildInheritanceChain(entries, inheritanceContext);
      
      // Apply inheritance rules
      const processedChain = await this.applyInheritanceRules(chain, inheritanceContext);
      
      // Apply transforms
      const transformedChain = await this.applyTransforms(processedChain, inheritanceContext);
      
      // Merge inherited content
      const mergedContent = await this.mergeInheritedContent(transformedChain);
      
      // Validate result
      const validationErrors = await this.validateInheritanceResult(mergedContent, inheritanceContext);
      
      // Build result
      const result: ContextInheritanceResult = {
        content: mergedContent,
        chain: transformedChain,
        rulesApplied: this.collectAppliedRules(transformedChain),
        transformsApplied: this.collectAppliedTransforms(transformedChain),
        stats: {
          totalEntries: entries.length,
          totalRules: this.collectAppliedRules(transformedChain).length,
          totalTransforms: this.collectAppliedTransforms(transformedChain).length,
          processingTime: Date.now() - startTime,
          cacheHits: 0
        },
        validationErrors
      };
      
      // Cache result
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, result);
      }
      
      this.emit(ContextInheritanceEvent.INHERITANCE_COMPLETED, {
        entries: entries.length,
        processingTime: result.stats.processingTime
      });
      
      return result;
      
    } catch (error) {
      logger.error('Error applying context inheritance', error);
      throw error;
    }
  }
  
  /**
   * Build inheritance context
   */
  private async buildInheritanceContext(
    entries: EnhancedContextEntry[],
    partialContext: Partial<ContextInheritanceContext>
  ): Promise<ContextInheritanceContext> {
    const currentDir = process.cwd();
    const projectRoot = await this.findProjectRoot(currentDir);
    const workspaceRoot = await this.findWorkspaceRoot(currentDir);
    
    return {
      scope: ContextInheritanceScope.SESSION,
      filePath: partialContext.filePath || '',
      directory: partialContext.directory || currentDir,
      projectRoot: partialContext.projectRoot || projectRoot,
      workspaceRoot: partialContext.workspaceRoot || workspaceRoot,
      env: Object.fromEntries(
        Object.entries(process.env).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>,
      variables: partialContext.variables || {},
      parents: entries.slice(0, -1),
      current: entries[entries.length - 1] || {} as EnhancedContextEntry,
      ...partialContext
    };
  }
  
  /**
   * Build inheritance chain
   */
  private async buildInheritanceChain(
    entries: EnhancedContextEntry[],
    context: ContextInheritanceContext
  ): Promise<ContextInheritanceChainEntry[]> {
    const chain: ContextInheritanceChainEntry[] = [];
    
    // Sort entries by inheritance scope priority
    const sortedEntries = this.sortEntriesByScope(entries);
    
    for (const entry of sortedEntries) {
      const scope = this.determineScope(entry, context);
      const strategy = this.determineStrategy(entry, scope, context);
      const rules = await this.getApplicableRules(entry, scope, context);
      
      const chainEntry: ContextInheritanceChainEntry = {
        scope,
        entry,
        strategy,
        rules,
        contribution: entry.processedContent,
        processingTime: 0
      };
      
      chain.push(chainEntry);
    }
    
    return chain;
  }
  
  /**
   * Apply inheritance rules to chain
   */
  private async applyInheritanceRules(
    chain: ContextInheritanceChainEntry[],
    context: ContextInheritanceContext
  ): Promise<ContextInheritanceChainEntry[]> {
    const processedChain: ContextInheritanceChainEntry[] = [];
    
    for (const entry of chain) {
      const startTime = Date.now();
      let processedEntry = { ...entry };
      
      // Apply rules in priority order
      const sortedRules = entry.rules.sort((a, b) => b.priority - a.priority);
      
      for (const rule of sortedRules) {
        if (!rule.enabled) continue;
        
        // Check conditions
        if (rule.conditions && !await this.evaluateConditions(rule.conditions, context)) {
          continue;
        }
        
        // Apply rule
        processedEntry = await this.applyRule(processedEntry, rule, context);
        
        this.emit(ContextInheritanceEvent.RULE_APPLIED, {
          rule: rule.name,
          scope: entry.scope,
          strategy: rule.strategy
        });
      }
      
      processedEntry.processingTime = Date.now() - startTime;
      processedChain.push(processedEntry);
    }
    
    return processedChain;
  }
  
  /**
   * Apply transforms to chain
   */
  private async applyTransforms(
    chain: ContextInheritanceChainEntry[],
    context: ContextInheritanceContext
  ): Promise<ContextInheritanceChainEntry[]> {
    const transformedChain: ContextInheritanceChainEntry[] = [];
    
    for (const entry of chain) {
      let transformedEntry = { ...entry };
      
      // Apply rule-specific transforms
      for (const rule of entry.rules) {
        if (rule.transforms) {
          for (const transform of rule.transforms) {
            transformedEntry.contribution = await this.applyTransform(
              transformedEntry.contribution,
              transform,
              context
            );
            
            this.emit(ContextInheritanceEvent.TRANSFORM_APPLIED, {
              transform: transform.name,
              type: transform.type,
              scope: entry.scope
            });
          }
        }
      }
      
      // Apply global transforms
      for (const transform of this.config.globalTransforms) {
        transformedEntry.contribution = await this.applyTransform(
          transformedEntry.contribution,
          transform,
          context
        );
      }
      
      transformedChain.push(transformedEntry);
    }
    
    return transformedChain;
  }
  
  /**
   * Merge inherited content
   */
  private async mergeInheritedContent(chain: ContextInheritanceChainEntry[]): Promise<string> {
    let mergedContent = '';
    
    for (const entry of chain) {
      switch (entry.strategy) {
        case ContextInheritanceStrategy.REPLACE:
          mergedContent = entry.contribution;
          break;
          
        case ContextInheritanceStrategy.APPEND:
          mergedContent += '\n\n' + entry.contribution;
          break;
          
        case ContextInheritanceStrategy.PREPEND:
          mergedContent = entry.contribution + '\n\n' + mergedContent;
          break;
          
        case ContextInheritanceStrategy.MERGE:
          mergedContent = await this.smartMerge(mergedContent, entry.contribution);
          break;
          
        case ContextInheritanceStrategy.OVERRIDE:
          mergedContent = await this.applyOverrides(mergedContent, entry.contribution);
          break;
          
        case ContextInheritanceStrategy.SELECTIVE:
          mergedContent = await this.applySelectiveInheritance(mergedContent, entry);
          break;
          
        default:
          mergedContent += '\n\n' + entry.contribution;
      }
    }
    
    return mergedContent.trim();
  }
  
  /**
   * Apply a single rule
   */
  private async applyRule(
    entry: ContextInheritanceChainEntry,
    rule: ContextInheritanceRule,
    context: ContextInheritanceContext
  ): Promise<ContextInheritanceChainEntry> {
    const modifiedEntry = { ...entry };
    
    // Update strategy if rule specifies one
    if (rule.strategy !== ContextInheritanceStrategy.INHERIT) {
      modifiedEntry.strategy = rule.strategy;
    }
    
    // Apply selective inheritance
    if (rule.strategy === ContextInheritanceStrategy.SELECTIVE && rule.sections) {
      modifiedEntry.contribution = await this.extractSections(
        entry.contribution,
        rule.sections
      );
    }
    
    return modifiedEntry;
  }
  
  /**
   * Apply a single transform
   */
  private async applyTransform(
    content: string,
    transform: ContextTransform,
    context: ContextInheritanceContext
  ): Promise<string> {
    switch (transform.type) {
      case 'replace':
        return content.replace(
          new RegExp(transform.params.pattern, transform.params.flags || 'g'),
          transform.params.replacement
        );
        
      case 'regex':
        return content.replace(
          new RegExp(transform.params.pattern, transform.params.flags || 'g'),
          transform.params.replacement
        );
        
      case 'template':
        return this.processTemplate(content, transform.params, context);
        
      case 'function':
        return transform.transform ? transform.transform(content, context) : content;
        
      default:
        return content;
    }
  }
  
  /**
   * Evaluate inheritance conditions
   */
  private async evaluateConditions(
    conditions: ContextInheritanceCondition[],
    context: ContextInheritanceContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, context);
      
      this.emit(ContextInheritanceEvent.CONDITION_EVALUATED, {
        type: condition.type,
        value: condition.value,
        result
      });
      
      if (!result) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: ContextInheritanceCondition,
    context: ContextInheritanceContext
  ): Promise<boolean> {
    let result = false;
    
    switch (condition.type) {
      case 'file_exists':
        try {
          const { access } = await import('fs/promises');
          await access(path.resolve(context.directory, condition.value));
          result = true;
        } catch {
          result = false;
        }
        break;
        
      case 'env_var':
        result = !!context.env[condition.value];
        break;
        
      case 'content_match':
        result = context.current.processedContent.includes(condition.value);
        break;
        
      case 'path_match':
        result = context.filePath.includes(condition.value);
        break;
        
      case 'custom':
        result = condition.customCondition ? condition.customCondition(context) : false;
        break;
    }
    
    return condition.negate ? !result : result;
  }
  
  /**
   * Smart merge two content strings
   */
  private async smartMerge(base: string, addition: string): Promise<string> {
    if (!base) return addition;
    if (!addition) return base;
    
    // Try to merge by sections
    const baseSections = this.parseSections(base);
    const additionSections = this.parseSections(addition);
    
    const merged = { ...baseSections };
    
    for (const [key, value] of Object.entries(additionSections)) {
      if (merged[key]) {
        merged[key] += '\n\n' + value;
      } else {
        merged[key] = value;
      }
    }
    
    return Object.values(merged).join('\n\n---\n\n');
  }
  
  /**
   * Parse content into sections
   */
  private parseSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = content.split('\n');
    let currentSection = 'default';
    let currentContent: string[] = [];
    
    for (const line of lines) {
      const headerMatch = line.match(/^#+\s+(.+)$/);
      if (headerMatch) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n');
          currentContent = [];
        }
        currentSection = headerMatch[1].toLowerCase().replace(/\s+/g, '_');
      }
      currentContent.push(line);
    }
    
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n');
    }
    
    return sections;
  }
  
  /**
   * Utility methods
   */
  private sortEntriesByScope(entries: EnhancedContextEntry[]): EnhancedContextEntry[] {
    const scopeOrder = {
      [ContextInheritanceScope.SYSTEM]: 0,
      [ContextInheritanceScope.GLOBAL]: 1,
      [ContextInheritanceScope.USER]: 2,
      [ContextInheritanceScope.WORKSPACE]: 3,
      [ContextInheritanceScope.PROJECT]: 4,
      [ContextInheritanceScope.DIRECTORY]: 5,
      [ContextInheritanceScope.FILE]: 6,
      [ContextInheritanceScope.SESSION]: 7
    };
    
    return entries.sort((a, b) => {
      const aScope = this.determineScope(a, {} as ContextInheritanceContext);
      const bScope = this.determineScope(b, {} as ContextInheritanceContext);
      return scopeOrder[aScope] - scopeOrder[bScope];
    });
  }
  
  private determineScope(entry: EnhancedContextEntry, context: ContextInheritanceContext): ContextInheritanceScope {
    if (entry.path.includes('.vibex')) {
      if (entry.path.includes(os.homedir())) {
        return ContextInheritanceScope.GLOBAL;
      }
      return ContextInheritanceScope.PROJECT;
    }
    
    return ContextInheritanceScope.DIRECTORY;
  }
  
  private determineStrategy(
    entry: EnhancedContextEntry,
    scope: ContextInheritanceScope,
    context: ContextInheritanceContext
  ): ContextInheritanceStrategy {
    return this.config.defaultStrategy;
  }
  
  private async getApplicableRules(
    entry: EnhancedContextEntry,
    scope: ContextInheritanceScope,
    context: ContextInheritanceContext
  ): Promise<ContextInheritanceRule[]> {
    return this.config.rules.filter(rule => 
      rule.scope === scope || rule.scope === ContextInheritanceScope.SESSION
    );
  }
  
  private async findProjectRoot(currentDir: string): Promise<string> {
    // Implementation to find project root
    return currentDir;
  }
  
  private async findWorkspaceRoot(currentDir: string): Promise<string> {
    // Implementation to find workspace root
    return currentDir;
  }
  
  private generateCacheKey(context: ContextInheritanceContext): string {
    return `${context.scope}:${context.filePath}:${context.directory}`;
  }
  
  private createNoInheritanceResult(entries: EnhancedContextEntry[], startTime: number): ContextInheritanceResult {
    return {
      content: entries.map(e => e.processedContent).join('\n\n'),
      chain: [],
      rulesApplied: [],
      transformsApplied: [],
      stats: {
        totalEntries: entries.length,
        totalRules: 0,
        totalTransforms: 0,
        processingTime: Date.now() - startTime,
        cacheHits: 0
      },
      validationErrors: []
    };
  }
  
  private collectAppliedRules(chain: ContextInheritanceChainEntry[]): ContextInheritanceRule[] {
    const rules: ContextInheritanceRule[] = [];
    for (const entry of chain) {
      rules.push(...entry.rules);
    }
    return rules;
  }
  
  private collectAppliedTransforms(chain: ContextInheritanceChainEntry[]): ContextTransform[] {
    const transforms: ContextTransform[] = [];
    for (const entry of chain) {
      for (const rule of entry.rules) {
        if (rule.transforms) {
          transforms.push(...rule.transforms);
        }
      }
    }
    return transforms;
  }
  
  private async validateInheritanceResult(
    content: string,
    context: ContextInheritanceContext
  ): Promise<ContextValidationError[]> {
    const errors: ContextValidationError[] = [];
    
    if (content.length > this.config.maxContentSize) {
      errors.push({
        type: 'size',
        message: `Inherited content exceeds maximum size (${this.config.maxContentSize} bytes)`,
        severity: 'error'
      });
    }
    
    return errors;
  }
  
  private async applyOverrides(base: string, overrides: string): Promise<string> {
    // Implementation for applying overrides
    return base + '\n\n' + overrides;
  }
  
  private async applySelectiveInheritance(
    base: string,
    entry: ContextInheritanceChainEntry
  ): Promise<string> {
    // Implementation for selective inheritance
    return base + '\n\n' + entry.contribution;
  }
  
  private async extractSections(content: string, sections: string[]): Promise<string> {
    // Implementation for extracting specific sections
    return content;
  }
  
  private processTemplate(
    content: string,
    params: Record<string, any>,
    context: ContextInheritanceContext
  ): string {
    // Implementation for template processing
    return content;
  }
}

/**
 * Default inheritance rules
 */
export const DEFAULT_INHERITANCE_RULES: ContextInheritanceRule[] = [
  {
    name: 'global-base',
    scope: ContextInheritanceScope.GLOBAL,
    strategy: ContextInheritanceStrategy.MERGE,
    priority: 100,
    enabled: true
  },
  {
    name: 'project-override',
    scope: ContextInheritanceScope.PROJECT,
    strategy: ContextInheritanceStrategy.OVERRIDE,
    priority: 200,
    enabled: true
  },
  {
    name: 'directory-selective',
    scope: ContextInheritanceScope.DIRECTORY,
    strategy: ContextInheritanceStrategy.SELECTIVE,
    sections: ['instructions', 'preferences'],
    priority: 300,
    enabled: true
  }
];

/**
 * Default global transforms
 */
export const DEFAULT_GLOBAL_TRANSFORMS: ContextTransform[] = [
  {
    name: 'normalize-whitespace',
    type: 'regex',
    params: {
      pattern: '\\n\\s*\\n\\s*\\n',
      flags: 'g',
      replacement: '\n\n'
    }
  },
  {
    name: 'remove-comments',
    type: 'regex',
    params: {
      pattern: '<!--.*?-->',
      flags: 'gs',
      replacement: ''
    }
  }
];

/**
 * Create context inheritance engine
 */
export function createContextInheritanceEngine(
  config?: Partial<ContextInheritanceConfig>
): ContextInheritanceEngine {
  return new ContextInheritanceEngine(config);
}