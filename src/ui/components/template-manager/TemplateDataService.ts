/**
 * Template Data Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for template data management and operations
 */

import { 
  WorkflowTemplate, 
  TemplateCreationData, 
  TemplateValidation,
  ITemplateDataService 
} from './types.js';

/**
 * Service for managing template data and operations
 */
export class TemplateDataService implements ITemplateDataService {
  private templates: WorkflowTemplate[] = [];
  private mockDataLoaded = false;

  /**
   * Get all templates
   */
  async getTemplates(): Promise<WorkflowTemplate[]> {
    if (!this.mockDataLoaded) {
      await this.loadMockData();
    }
    return [...this.templates];
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<WorkflowTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find(t => t.metadata.id === id) || null;
  }

  /**
   * Create new template
   */
  async createTemplate(data: TemplateCreationData): Promise<WorkflowTemplate> {
    const template: WorkflowTemplate = {
      metadata: {
        id: `template-${Date.now()}`,
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags,
        author: data.author,
        version: '1.0.0',
        downloadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      definition: data.definition,
      validation: this.validateTemplate({
        metadata: {
          id: '',
          name: data.name,
          description: data.description,
          category: data.category,
          tags: data.tags,
          author: data.author,
          version: '1.0.0',
          downloadCount: 0
        },
        definition: data.definition,
        validation: { isValid: true, errors: [] }
      })
    };

    this.templates.push(template);
    return template;
  }

  /**
   * Update existing template
   */
  async updateTemplate(template: WorkflowTemplate): Promise<WorkflowTemplate> {
    const index = this.templates.findIndex(t => t.metadata.id === template.metadata.id);
    if (index === -1) {
      throw new Error(`Template not found: ${template.metadata.id}`);
    }

    const updatedTemplate = {
      ...template,
      metadata: {
        ...template.metadata,
        updatedAt: new Date()
      },
      validation: this.validateTemplate(template)
    };

    this.templates[index] = updatedTemplate;
    return updatedTemplate;
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    const index = this.templates.findIndex(t => t.metadata.id === id);
    if (index === -1) {
      throw new Error(`Template not found: ${id}`);
    }

    this.templates.splice(index, 1);
  }

  /**
   * Validate template
   */
  validateTemplate(template: WorkflowTemplate): TemplateValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate metadata
    if (!template.metadata.name?.trim()) {
      errors.push('Template name is required');
    }

    if (!template.metadata.description?.trim()) {
      errors.push('Template description is required');
    }

    if (!template.metadata.category?.trim()) {
      errors.push('Template category is required');
    }

    if (!template.metadata.author?.trim()) {
      warnings.push('Template author is recommended');
    }

    // Validate definition
    if (!template.definition) {
      errors.push('Template definition is required');
    } else {
      if (!template.definition.id) {
        errors.push('Template definition must have an ID');
      }

      if (!template.definition.name) {
        errors.push('Template definition must have a name');
      }

      if (!template.definition.tasks || !Array.isArray(template.definition.tasks)) {
        errors.push('Template definition must have tasks array');
      } else if (template.definition.tasks.length === 0) {
        warnings.push('Template has no tasks defined');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Load mock template data
   */
  private async loadMockData(): Promise<void> {
    const mockTemplates: WorkflowTemplate[] = [
      {
        metadata: {
          id: 'web-app-setup',
          name: 'Web Application Setup',
          description: 'Complete setup for a modern web application with frontend and backend',
          category: 'Development',
          tags: ['web', 'setup', 'frontend', 'backend'],
          author: 'VibeX',
          version: '1.0.0',
          downloadCount: 42,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15')
        },
        definition: {
          id: 'web-app-setup',
          name: 'Web Application Setup',
          tasks: [
            { id: 'init', name: 'Initialize Project', status: 'pending' },
            { id: 'deps', name: 'Install Dependencies', status: 'pending' },
            { id: 'config', name: 'Configure Build', status: 'pending' },
          ],
        },
        validation: { isValid: true, errors: [] },
      },
      {
        metadata: {
          id: 'testing-suite',
          name: 'Testing Suite Setup',
          description: 'Comprehensive testing setup with unit, integration, and e2e tests',
          category: 'Testing',
          tags: ['testing', 'unit', 'integration', 'e2e'],
          author: 'QA Team',
          version: '2.1.0',
          downloadCount: 28,
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-20')
        },
        definition: {
          id: 'testing-suite',
          name: 'Testing Suite Setup',
          tasks: [
            { id: 'test-setup', name: 'Setup Test Framework', status: 'pending' },
            { id: 'unit-tests', name: 'Create Unit Tests', status: 'pending' },
            { id: 'integration-tests', name: 'Create Integration Tests', status: 'pending' },
          ],
        },
        validation: { isValid: true, errors: [] },
      },
      {
        metadata: {
          id: 'deployment-pipeline',
          name: 'CI/CD Deployment Pipeline',
          description: 'Automated deployment pipeline with staging and production environments',
          category: 'Deployment',
          tags: ['cicd', 'deployment', 'automation', 'pipeline'],
          author: 'DevOps',
          version: '1.5.0',
          downloadCount: 67,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-25')
        },
        definition: {
          id: 'deployment-pipeline',
          name: 'CI/CD Deployment Pipeline',
          tasks: [
            { id: 'build', name: 'Build Application', status: 'pending' },
            { id: 'test', name: 'Run Tests', status: 'pending' },
            { id: 'deploy-staging', name: 'Deploy to Staging', status: 'pending' },
            { id: 'deploy-prod', name: 'Deploy to Production', status: 'pending' },
          ],
        },
        validation: { isValid: true, errors: [] },
      },
    ];

    this.templates = mockTemplates;
    this.mockDataLoaded = true;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.templates = [];
    this.mockDataLoaded = false;
  }
}

/**
 * Factory function for creating template data service
 */
export function createTemplateDataService(): TemplateDataService {
  return new TemplateDataService();
} 