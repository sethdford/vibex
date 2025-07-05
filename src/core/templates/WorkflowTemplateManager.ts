import { logger } from '../../utils/logger.js';
import { WorkflowDefinition, TaskDefinition, TaskExecutionContext } from '../../ui/components/TaskOrchestrator.js';
import { EventEmitter } from 'events';

/**
 * Workflow template metadata
 */
export interface WorkflowTemplateMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  downloadCount: number;
  rating: number;
  ratingCount: number;
}

/**
 * Complete workflow template with metadata and definition
 */
export interface WorkflowTemplate {
  metadata: WorkflowTemplateMetadata;
  definition: WorkflowDefinition;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  dependencies: string[];
  variables: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
    defaultValue?: any;
  }>;
}

/**
 * Template search and filter options
 */
export interface TemplateSearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  author?: string;
  minRating?: number;
  sortBy?: 'name' | 'created' | 'updated' | 'rating' | 'downloads';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Template import/export options
 */
export interface TemplateExportOptions {
  includeMetadata?: boolean;
  includeValidation?: boolean;
  format?: 'json' | 'yaml' | 'zip';
  minify?: boolean;
}

/**
 * Template collection for batch operations
 */
export interface TemplateCollection {
  name: string;
  description: string;
  templates: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workflow Template Manager
 * 
 * Provides comprehensive template management including:
 * - CRUD operations for templates
 * - Template validation and versioning
 * - Search and filtering capabilities
 * - Import/export functionality
 * - Template collections and categories
 * - Real-time synchronization
 */
export class WorkflowTemplateManager extends EventEmitter {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private collections: Map<string, TemplateCollection> = new Map();
  private categories: Set<string> = new Set();
  private storageKey = 'vibex-workflow-templates';
  private collectionsKey = 'vibex-template-collections';
  private isInitialized = false;

  constructor() {
    super();
    this.initializeDefaultCategories();
  }

  /**
   * Initialize the template manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadTemplatesFromStorage();
      await this.loadCollectionsFromStorage();
      await this.loadBuiltInTemplates();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      logger.info('WorkflowTemplateManager initialized', {
        templateCount: this.templates.size,
        collectionCount: this.collections.size,
        categoryCount: this.categories.size,
      });
    } catch (error) {
      logger.error('Failed to initialize WorkflowTemplateManager', { error });
      throw error;
    }
  }

  /**
   * Create a new workflow template
   */
  async createTemplate(
    definition: WorkflowDefinition,
    metadata: Partial<WorkflowTemplateMetadata>,
    variables?: Record<string, any>
  ): Promise<WorkflowTemplate> {
    const templateId = metadata.id || `template-${Date.now()}`;
    
    // Validate the workflow definition
    const validation = await this.validateTemplate(definition);
    
    const template: WorkflowTemplate = {
      metadata: {
        id: templateId,
        name: metadata.name || 'Untitled Template',
        description: metadata.description || '',
        version: metadata.version || '1.0.0',
        author: metadata.author || 'Unknown',
        category: metadata.category || 'General',
        tags: metadata.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: metadata.isPublic || false,
        downloadCount: 0,
        rating: 0,
        ratingCount: 0,
      },
      definition,
      validation,
      dependencies: this.extractDependencies(definition),
      variables: variables || {},
    };

    // Add category to known categories
    this.categories.add(template.metadata.category);

    // Store template
    this.templates.set(templateId, template);
    await this.saveTemplatesToStorage();

    this.emit('templateCreated', template);
    
    logger.info('Workflow template created', {
      templateId,
      name: template.metadata.name,
      category: template.metadata.category,
      taskCount: definition.tasks.length,
    });

    return template;
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): WorkflowTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    id: string,
    updates: {
      definition?: Partial<WorkflowDefinition>;
      metadata?: Partial<WorkflowTemplateMetadata>;
      variables?: Record<string, any>;
    }
  ): Promise<WorkflowTemplate> {
    const existing = this.templates.get(id);
    if (!existing) {
      throw new Error(`Template not found: ${id}`);
    }

    // Create updated template
    const updatedDefinition = updates.definition 
      ? { ...existing.definition, ...updates.definition }
      : existing.definition;

    const updatedMetadata = updates.metadata
      ? { ...existing.metadata, ...updates.metadata, updatedAt: new Date() }
      : { ...existing.metadata, updatedAt: new Date() };

    const updatedVariables = updates.variables
      ? { ...existing.variables, ...updates.variables }
      : existing.variables;

    // Re-validate if definition changed
    const validation = updates.definition
      ? await this.validateTemplate(updatedDefinition)
      : existing.validation;

    const updatedTemplate: WorkflowTemplate = {
      metadata: updatedMetadata,
      definition: updatedDefinition,
      validation,
      dependencies: this.extractDependencies(updatedDefinition),
      variables: updatedVariables,
    };

    // Update category
    this.categories.add(updatedTemplate.metadata.category);

    // Store updated template
    this.templates.set(id, updatedTemplate);
    await this.saveTemplatesToStorage();

    this.emit('templateUpdated', updatedTemplate, existing);
    
    logger.info('Workflow template updated', {
      templateId: id,
      name: updatedTemplate.metadata.name,
      version: updatedTemplate.metadata.version,
    });

    return updatedTemplate;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    const template = this.templates.get(id);
    if (!template) {
      return false;
    }

    // Remove from collections
    for (const collection of this.collections.values()) {
      const index = collection.templates.indexOf(id);
      if (index > -1) {
        collection.templates.splice(index, 1);
        collection.updatedAt = new Date();
      }
    }

    // Delete template
    this.templates.delete(id);
    await this.saveTemplatesToStorage();
    await this.saveCollectionsToStorage();

    this.emit('templateDeleted', template);
    
    logger.info('Workflow template deleted', {
      templateId: id,
      name: template.metadata.name,
    });

    return true;
  }

  /**
   * Search and filter templates
   */
  searchTemplates(options: TemplateSearchOptions = {}): WorkflowTemplate[] {
    let results = Array.from(this.templates.values());

    // Apply filters
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(template =>
        template.metadata.name.toLowerCase().includes(query) ||
        template.metadata.description.toLowerCase().includes(query) ||
        template.metadata.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (options.category) {
      results = results.filter(template => 
        template.metadata.category === options.category
      );
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter(template =>
        options.tags!.every(tag => template.metadata.tags.includes(tag))
      );
    }

    if (options.author) {
      results = results.filter(template =>
        template.metadata.author === options.author
      );
    }

    if (options.minRating) {
      results = results.filter(template =>
        template.metadata.rating >= options.minRating!
      );
    }

    // Apply sorting
    const sortBy = options.sortBy || 'name';
    const sortOrder = options.sortOrder || 'asc';
    
    results.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.metadata.name;
          bValue = b.metadata.name;
          break;
        case 'created':
          aValue = a.metadata.createdAt;
          bValue = b.metadata.createdAt;
          break;
        case 'updated':
          aValue = a.metadata.updatedAt;
          bValue = b.metadata.updatedAt;
          break;
        case 'rating':
          aValue = a.metadata.rating;
          bValue = b.metadata.rating;
          break;
        case 'downloads':
          aValue = a.metadata.downloadCount;
          bValue = b.metadata.downloadCount;
          break;
        default:
          aValue = a.metadata.name;
          bValue = b.metadata.name;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply pagination
    if (options.offset || options.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || results.length;
      results = results.slice(offset, offset + limit);
    }

    return results;
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    return Array.from(this.categories).sort();
  }

  /**
   * Get all unique tags
   */
  getTags(): string[] {
    const tags = new Set<string>();
    for (const template of this.templates.values()) {
      template.metadata.tags.forEach(tag => tags.add(tag));
    }
    return Array.from(tags).sort();
  }

  /**
   * Validate a workflow template
   */
  async validateTemplate(definition: WorkflowDefinition): Promise<TemplateValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!definition.id) {
      errors.push('Workflow ID is required');
    }

    if (!definition.name) {
      errors.push('Workflow name is required');
    }

    if (!definition.tasks || definition.tasks.length === 0) {
      errors.push('Workflow must have at least one task');
    }

    // Task validation
    const taskIds = new Set<string>();
    for (const task of definition.tasks) {
      // Check for duplicate task IDs
      if (taskIds.has(task.id)) {
        errors.push(`Duplicate task ID: ${task.id}`);
      }
      taskIds.add(task.id);

      // Check required task fields
      if (!task.name) {
        errors.push(`Task ${task.id} is missing a name`);
      }

      if (!task.category) {
        warnings.push(`Task ${task.id} is missing a category`);
      }

      // Check dependencies
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId) && !definition.tasks.find(t => t.id === depId)) {
          errors.push(`Task ${task.id} depends on non-existent task: ${depId}`);
        }
      }
    }

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(definition.tasks);
    if (circularDeps.length > 0) {
      errors.push(`Circular dependencies detected: ${circularDeps.join(', ')}`);
    }

    // Performance suggestions
    if (definition.tasks.length > 20) {
      suggestions.push('Consider breaking large workflows into smaller, reusable templates');
    }

    const orphanedTasks = definition.tasks.filter(task => 
      task.dependencies.length === 0 && 
      !definition.tasks.some(t => t.dependencies.includes(task.id))
    );
    
    if (orphanedTasks.length > 3) {
      suggestions.push('Multiple orphaned tasks detected - consider adding dependencies for better organization');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Create a template from an existing workflow
   */
  async createTemplateFromWorkflow(
    workflow: WorkflowDefinition,
    templateName: string,
    templateDescription: string,
    category: string = 'General'
  ): Promise<WorkflowTemplate> {
    const metadata: Partial<WorkflowTemplateMetadata> = {
      name: templateName,
      description: templateDescription,
      category,
      tags: [],
      author: 'User',
      version: '1.0.0',
    };

    return this.createTemplate(workflow, metadata);
  }

  /**
   * Instantiate a workflow from a template
   */
  instantiateTemplate(
    templateId: string,
    variables: Record<string, any> = {},
    workflowName?: string
  ): WorkflowDefinition {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Clone the template definition
    const workflow: WorkflowDefinition = {
      ...template.definition,
      id: `workflow-${Date.now()}`,
      name: workflowName || `${template.metadata.name} - ${new Date().toISOString()}`,
      tasks: template.definition.tasks.map(task => ({
        ...task,
        id: `${task.id}-${Date.now()}`,
      })),
    };

    // Apply variable substitution
    this.applyVariableSubstitution(workflow, variables);

    // Increment download count
    template.metadata.downloadCount++;
    this.saveTemplatesToStorage();

    this.emit('templateInstantiated', template, workflow);
    
    logger.info('Template instantiated', {
      templateId,
      workflowId: workflow.id,
      variableCount: Object.keys(variables).length,
    });

    return workflow;
  }

  /**
   * Export templates
   */
  async exportTemplates(
    templateIds: string[],
    options: TemplateExportOptions = {}
  ): Promise<string> {
    const templates = templateIds.map(id => this.templates.get(id)).filter(Boolean);
    
    if (templates.length === 0) {
      throw new Error('No valid templates found for export');
    }

    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      templates: templates.map(template => {
        const data: any = {
          definition: template!.definition,
        };

        if (options.includeMetadata !== false) {
          data.metadata = template!.metadata;
        }

        if (options.includeValidation) {
          data.validation = template!.validation;
        }

        return data;
      }),
    };

    const jsonString = options.minify 
      ? JSON.stringify(exportData)
      : JSON.stringify(exportData, null, 2);

    logger.info('Templates exported', {
      templateCount: templates.length,
      format: options.format || 'json',
      size: jsonString.length,
    });

    return jsonString;
  }

  /**
   * Import templates
   */
  async importTemplates(data: string): Promise<WorkflowTemplate[]> {
    try {
      const importData = JSON.parse(data);
      const importedTemplates: WorkflowTemplate[] = [];

      if (!importData.templates || !Array.isArray(importData.templates)) {
        throw new Error('Invalid import data format');
      }

      for (const templateData of importData.templates) {
        if (!templateData.definition) {
          logger.warn('Skipping template without definition');
          continue;
        }

        const template = await this.createTemplate(
          templateData.definition,
          templateData.metadata || {},
          templateData.variables || {}
        );

        importedTemplates.push(template);
      }

      this.emit('templatesImported', importedTemplates);
      
      logger.info('Templates imported', {
        importedCount: importedTemplates.length,
        totalCount: importData.templates.length,
      });

      return importedTemplates;
    } catch (error) {
      logger.error('Failed to import templates', { error });
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a template collection
   */
  async createCollection(
    name: string,
    description: string,
    templateIds: string[] = []
  ): Promise<TemplateCollection> {
    const collection: TemplateCollection = {
      name,
      description,
      templates: templateIds.filter(id => this.templates.has(id)),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.collections.set(name, collection);
    await this.saveCollectionsToStorage();

    this.emit('collectionCreated', collection);
    
    logger.info('Template collection created', {
      name,
      templateCount: collection.templates.length,
    });

    return collection;
  }

  /**
   * Get all collections
   */
  getCollections(): TemplateCollection[] {
    return Array.from(this.collections.values());
  }

  /**
   * Get templates in a collection
   */
  getCollectionTemplates(collectionName: string): WorkflowTemplate[] {
    const collection = this.collections.get(collectionName);
    if (!collection) {
      return [];
    }

    return collection.templates
      .map(id => this.templates.get(id))
      .filter(Boolean) as WorkflowTemplate[];
  }

  // Private helper methods

  private initializeDefaultCategories(): void {
    const defaultCategories = [
      'General',
      'Development',
      'Testing',
      'Deployment',
      'Analysis',
      'Documentation',
      'Automation',
      'Integration',
      'Monitoring',
      'Maintenance',
    ];

    defaultCategories.forEach(category => this.categories.add(category));
  }

  private async loadTemplatesFromStorage(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          for (const [id, template] of Object.entries(data)) {
            this.templates.set(id, template as WorkflowTemplate);
            this.categories.add((template as WorkflowTemplate).metadata.category);
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to load templates from storage', { error });
    }
  }

  private async saveTemplatesToStorage(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = Object.fromEntries(this.templates.entries());
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      }
    } catch (error) {
      logger.warn('Failed to save templates to storage', { error });
    }
  }

  private async loadCollectionsFromStorage(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.collectionsKey);
        if (stored) {
          const data = JSON.parse(stored);
          for (const [name, collection] of Object.entries(data)) {
            this.collections.set(name, collection as TemplateCollection);
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to load collections from storage', { error });
    }
  }

  private async saveCollectionsToStorage(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = Object.fromEntries(this.collections.entries());
        localStorage.setItem(this.collectionsKey, JSON.stringify(data));
      }
    } catch (error) {
      logger.warn('Failed to save collections to storage', { error });
    }
  }

  private async loadBuiltInTemplates(): Promise<void> {
    // Load built-in templates for common workflows
    const builtInTemplates = [
      {
        metadata: {
          id: 'builtin-web-app-setup',
          name: 'Web Application Setup',
          description: 'Complete setup for a modern web application',
          category: 'Development',
          tags: ['web', 'setup', 'frontend', 'backend'],
          author: 'VibeX',
          version: '1.0.0',
        },
        definition: {
          id: 'web-app-setup',
          name: 'Web Application Setup',
          description: 'Sets up a complete web application with frontend and backend',
          tasks: [
            {
              id: 'init-project',
              name: 'Initialize Project',
              description: 'Create project structure and package.json',
              category: 'file_ops' as const,
              status: 'pending' as const,
              priority: 'high' as const,
              dependencies: [],
              estimatedDuration: 5000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
            },
            {
              id: 'install-deps',
              name: 'Install Dependencies',
              description: 'Install required npm packages',
              category: 'file_ops' as const,
              status: 'pending' as const,
              priority: 'high' as const,
              dependencies: ['init-project'],
              estimatedDuration: 15000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
            },
            {
              id: 'setup-frontend',
              name: 'Setup Frontend',
              description: 'Configure frontend build system',
              category: 'code_gen' as const,
              status: 'pending' as const,
              priority: 'normal' as const,
              dependencies: ['install-deps'],
              estimatedDuration: 10000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
            },
            {
              id: 'setup-backend',
              name: 'Setup Backend',
              description: 'Configure backend server and API',
              category: 'code_gen' as const,
              status: 'pending' as const,
              priority: 'normal' as const,
              dependencies: ['install-deps'],
              estimatedDuration: 12000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
            },
            {
              id: 'run-tests',
              name: 'Run Tests',
              description: 'Execute test suite',
              category: 'testing' as const,
              status: 'pending' as const,
              priority: 'normal' as const,
              dependencies: ['setup-frontend', 'setup-backend'],
              estimatedDuration: 8000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
            },
          ],
          context: {
            workingDirectory: process.cwd(),
            environment: {},
            sharedState: {},
            availableTools: ['file_ops', 'npm', 'git'],
            timeout: 60000,
          },
          status: 'idle' as const,
          progress: 0,
        } as WorkflowDefinition,
      },
    ];

    for (const template of builtInTemplates) {
      if (!this.templates.has(template.metadata.id)) {
        await this.createTemplate(
          template.definition,
          template.metadata,
          {}
        );
      }
    }
  }

  private extractDependencies(definition: WorkflowDefinition): string[] {
    const deps = new Set<string>();
    
    // Extract tool dependencies
    for (const task of definition.tasks) {
      if (task.toolCalls) {
        for (const toolCall of task.toolCalls) {
          deps.add(toolCall.toolName);
        }
      }
    }

    // Extract context dependencies
    if (definition.context?.availableTools) {
      for (const tool of definition.context.availableTools) {
        deps.add(tool);
      }
    }

    return Array.from(deps);
  }

  private detectCircularDependencies(tasks: TaskDefinition[]): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[] = [];

    const dfs = (taskId: string): boolean => {
      if (recursionStack.has(taskId)) {
        cycles.push(taskId);
        return true;
      }

      if (visited.has(taskId)) {
        return false;
      }

      visited.add(taskId);
      recursionStack.add(taskId);

      const task = tasks.find(t => t.id === taskId);
      if (task) {
        for (const depId of task.dependencies) {
          if (dfs(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        dfs(task.id);
      }
    }

    return cycles;
  }

  private applyVariableSubstitution(
    workflow: WorkflowDefinition,
    variables: Record<string, any>
  ): void {
    const substituteString = (str: string): string => {
      return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return variables[varName] !== undefined ? String(variables[varName]) : match;
      });
    };

    // Substitute in workflow properties
    workflow.name = substituteString(workflow.name);
    workflow.description = substituteString(workflow.description);

    // Substitute in tasks
    for (const task of workflow.tasks) {
      task.name = substituteString(task.name);
      task.description = substituteString(task.description);
    }
  }
}

// Export singleton instance
export const templateManager = new WorkflowTemplateManager(); 