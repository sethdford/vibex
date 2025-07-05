import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext.js';

// Simplified interfaces for template management
interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  downloadCount: number;
}

interface WorkflowTemplate {
  metadata: TemplateMetadata;
  definition: any;
  validation: { isValid: boolean; errors: string[] };
}

export interface TemplateManagerProps {
  onTemplateSelect?: (template: WorkflowTemplate) => void;
  onWorkflowCreate?: (workflow: any) => void;
  className?: string;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({
  onTemplateSelect,
  onWorkflowCreate,
  className = '',
}) => {
  const { theme, isDarkTheme } = useTheme();
  
  // Create theme adapter for backward compatibility
  const adaptedTheme = {
    mode: isDarkTheme ? 'dark' : 'light',
    colors: {
      background: {
        primary: theme.ui.background,
        elevated: theme.ui.background,
        secondary: theme.ui.background,
      },
      text: {
        primary: theme.ui.text,
        secondary: theme.ui.textDim,
        tertiary: theme.ui.textDim,
        inverse: isDarkTheme ? '#000000' : '#ffffff',
      },
      border: {
        primary: theme.ui.textDim,
        secondary: theme.ui.textDim,
        focus: theme.ui.primary,
      },
      primary: {
        100: theme.ui.primary + '20', // 20% opacity
        500: theme.ui.primary,
        700: theme.ui.primary,
      },
      secondary: {
        500: theme.ui.secondary,
      },
      success: {
        500: theme.ui.success,
      },
      error: {
        500: theme.ui.error,
      },
    },
    borderRadius: {
      lg: '0.5rem',
    },
    spacing: {
      3: '0.75rem',
      4: '1rem',
      6: '1.5rem',
    },
  };
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<'browse' | 'create'>('browse');

  const categories = ['All', 'Development', 'Testing', 'Deployment', 'Analysis', 'Documentation'];

  // Mock template data for demonstration
  useEffect(() => {
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

    setTemplates(mockTemplates);
  }, []);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.metadata.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.metadata.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || template.metadata.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
  };

  const handleInstantiateTemplate = (template: WorkflowTemplate) => {
    const workflow = {
      ...template.definition,
      id: `workflow-${Date.now()}`,
      name: `${template.metadata.name} - ${new Date().toLocaleString()}`,
    };

    if (onWorkflowCreate) {
      onWorkflowCreate(workflow);
    }
  };

  const TemplateCard: React.FC<{ template: WorkflowTemplate }> = ({ template }) => (
    <div
      className="cursor-pointer hover:opacity-90 transition-opacity"
      style={{
        background: adaptedTheme.colors.background.elevated,
        border: `1px solid ${selectedTemplate?.metadata.id === template.metadata.id 
          ? adaptedTheme.colors.border.focus 
          : adaptedTheme.colors.border.primary}`,
        borderRadius: adaptedTheme.borderRadius.lg,
        padding: adaptedTheme.spacing[4],
        marginBottom: adaptedTheme.spacing[3],
      }}
      onClick={() => handleTemplateSelect(template)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold" style={{ color: adaptedTheme.colors.text.primary }}>
          {template.metadata.name}
        </h3>
        <div className="flex items-center space-x-2">
          <span 
            className="text-xs px-2 py-1 rounded"
            style={{
              background: adaptedTheme.colors.primary[100],
              color: adaptedTheme.colors.primary[700],
            }}
          >
            {template.metadata.category}
          </span>
          <span className="text-xs" style={{ color: adaptedTheme.colors.text.tertiary }}>
            v{template.metadata.version}
          </span>
        </div>
      </div>

      <p className="text-sm mb-3" style={{ color: adaptedTheme.colors.text.secondary }}>
        {template.metadata.description}
      </p>

      <div className="flex flex-wrap gap-1 mb-3">
        {template.metadata.tags.map(tag => (
          <span
            key={tag}
            className="text-xs px-2 py-1 rounded"
            style={{
              background: adaptedTheme.colors.background.secondary,
              color: adaptedTheme.colors.text.tertiary,
              border: `1px solid ${adaptedTheme.colors.border.secondary}`,
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className="text-xs" style={{ color: adaptedTheme.colors.text.tertiary }}>
            By {template.metadata.author}
          </span>
          <span className="text-xs" style={{ color: adaptedTheme.colors.text.tertiary }}>
            {template.metadata.downloadCount} downloads
          </span>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleInstantiateTemplate(template);
          }}
          className="text-xs px-3 py-1 rounded hover:opacity-80"
          style={{
            background: adaptedTheme.colors.primary[500],
            color: adaptedTheme.colors.text.inverse,
          }}
        >
          Use Template
        </button>
      </div>
    </div>
  );

  return (
    <div 
      className={`p-6 ${className}`}
      style={{
        background: adaptedTheme.colors.background.primary,
        color: adaptedTheme.colors.text.primary,
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Workflow Templates</h1>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('create')}
            className="px-4 py-2 rounded hover:opacity-90"
            style={{
              background: adaptedTheme.colors.primary[500],
              color: adaptedTheme.colors.text.inverse,
            }}
          >
            Create Template
          </button>
          
          <button
            className="px-4 py-2 rounded hover:opacity-90"
            style={{
              background: adaptedTheme.colors.secondary[500],
              color: adaptedTheme.colors.text.inverse,
            }}
          >
            Export
          </button>
        </div>
      </div>

      {activeView === 'browse' && (
        <>
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded"
              style={{
                background: adaptedTheme.colors.background.secondary,
                border: `1px solid ${adaptedTheme.colors.border.primary}`,
                color: adaptedTheme.colors.text.primary,
              }}
            />

            <div className="flex space-x-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className="px-3 py-1 rounded text-sm"
                  style={{
                    background: selectedCategory === category 
                      ? adaptedTheme.colors.primary[500] 
                      : adaptedTheme.colors.background.secondary,
                    color: selectedCategory === category
                      ? adaptedTheme.colors.text.inverse
                      : adaptedTheme.colors.text.primary,
                    border: `1px solid ${adaptedTheme.colors.border.primary}`,
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Template List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Templates ({filteredTemplates.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTemplates.map(template => (
                  <TemplateCard key={template.metadata.id} template={template} />
                ))}
                
                {filteredTemplates.length === 0 && (
                  <div className="text-center py-8">
                    <p style={{ color: adaptedTheme.colors.text.tertiary }}>
                      No templates found matching your criteria
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Template Details */}
            <div>
              {selectedTemplate && (
                <div
                  style={{
                    background: adaptedTheme.colors.background.elevated,
                    border: `1px solid ${adaptedTheme.colors.border.primary}`,
                    borderRadius: adaptedTheme.borderRadius.lg,
                    padding: adaptedTheme.spacing[4],
                  }}
                >
                  <h2 className="text-lg font-semibold mb-4">Template Details</h2>
                  
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-medium">{selectedTemplate.metadata.name}</h3>
                      <p className="text-sm" style={{ color: adaptedTheme.colors.text.secondary }}>
                        {selectedTemplate.metadata.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span style={{ color: adaptedTheme.colors.text.tertiary }}>Author:</span>
                        <span className="ml-2">{selectedTemplate.metadata.author}</span>
                      </div>
                      <div>
                        <span style={{ color: adaptedTheme.colors.text.tertiary }}>Version:</span>
                        <span className="ml-2">{selectedTemplate.metadata.version}</span>
                      </div>
                      <div>
                        <span style={{ color: adaptedTheme.colors.text.tertiary }}>Category:</span>
                        <span className="ml-2">{selectedTemplate.metadata.category}</span>
                      </div>
                      <div>
                        <span style={{ color: adaptedTheme.colors.text.tertiary }}>Downloads:</span>
                        <span className="ml-2">{selectedTemplate.metadata.downloadCount}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ color: adaptedTheme.colors.text.tertiary }}>Tasks:</span>
                      <span className="ml-2">{selectedTemplate.definition.tasks?.length || 0}</span>
                    </div>

                    <div>
                      <span 
                        style={{ 
                          color: selectedTemplate.validation.isValid 
                            ? adaptedTheme.colors.success[500] 
                            : adaptedTheme.colors.error[500] 
                        }}
                      >
                        {selectedTemplate.validation.isValid ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleInstantiateTemplate(selectedTemplate)}
                      className="w-full py-2 rounded hover:opacity-90 mt-4"
                      style={{
                        background: adaptedTheme.colors.primary[500],
                        color: adaptedTheme.colors.text.inverse,
                      }}
                    >
                      Create Workflow from Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeView === 'create' && (
        <div className="max-w-2xl mx-auto">
          <div
            style={{
              background: adaptedTheme.colors.background.elevated,
              border: `1px solid ${adaptedTheme.colors.border.primary}`,
              borderRadius: adaptedTheme.borderRadius.lg,
              padding: adaptedTheme.spacing[6],
            }}
          >
            <h2 className="text-xl font-semibold mb-6">Create New Template</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded"
                  style={{
                    background: adaptedTheme.colors.background.primary,
                    border: `1px solid ${adaptedTheme.colors.border.primary}`,
                    color: adaptedTheme.colors.text.primary,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded"
                  style={{
                    background: adaptedTheme.colors.background.primary,
                    border: `1px solid ${adaptedTheme.colors.border.primary}`,
                    color: adaptedTheme.colors.text.primary,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  className="w-full px-3 py-2 rounded"
                  style={{
                    background: adaptedTheme.colors.background.primary,
                    border: `1px solid ${adaptedTheme.colors.border.primary}`,
                    color: adaptedTheme.colors.text.primary,
                  }}
                >
                  {categories.filter(c => c !== 'All').map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  className="px-6 py-2 rounded hover:opacity-90"
                  style={{
                    background: adaptedTheme.colors.primary[500],
                    color: adaptedTheme.colors.text.inverse,
                  }}
                >
                  Create Template
                </button>
                
                <button
                  onClick={() => setActiveView('browse')}
                  className="px-6 py-2 rounded hover:opacity-90"
                  style={{
                    background: adaptedTheme.colors.background.secondary,
                    color: adaptedTheme.colors.text.primary,
                    border: `1px solid ${adaptedTheme.colors.border.primary}`,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager; 