import { useState, useEffect, useCallback } from 'react';
import { templateManager, WorkflowTemplate, TemplateSearchOptions } from '../../core/templates/WorkflowTemplateManager';
import { logger } from '../../utils/logger';

export interface UseTemplateManagerOptions {
  autoInitialize?: boolean;
  enableRealTimeUpdates?: boolean;
}

export interface UseTemplateManagerReturn {
  // State
  templates: WorkflowTemplate[];
  categories: string[];
  tags: string[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  searchTemplates: (options: TemplateSearchOptions) => WorkflowTemplate[];
  createTemplate: (definition: any, metadata: any, variables?: any) => Promise<WorkflowTemplate>;
  updateTemplate: (id: string, updates: any) => Promise<WorkflowTemplate>;
  deleteTemplate: (id: string) => Promise<boolean>;
  instantiateTemplate: (templateId: string, variables?: any) => any;
  exportTemplates: (templateIds: string[]) => Promise<string>;
  importTemplates: (data: string) => Promise<WorkflowTemplate[]>;
  refreshTemplates: () => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for template management operations
 */
export function useTemplateManager(options: UseTemplateManagerOptions = {}): UseTemplateManagerReturn {
  const { autoInitialize = true, enableRealTimeUpdates = false } = options;
  
  // State
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize template manager
  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await templateManager.initialize();
      setIsInitialized(true);
      await refreshTemplates();
      
      logger.info('Template manager initialized via hook');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize template manager';
      setError(errorMessage);
      logger.error('Template manager initialization failed', { error: err });
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Refresh templates and metadata
  const refreshTemplates = useCallback(async () => {
    try {
      const allTemplates = templateManager.searchTemplates({});
      setTemplates(allTemplates);
      setCategories(templateManager.getCategories());
      setTags(templateManager.getTags());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh templates';
      setError(errorMessage);
      logger.error('Template refresh failed', { error: err });
    }
  }, []);

  // Search templates with options
  const searchTemplates = useCallback((searchOptions: TemplateSearchOptions): WorkflowTemplate[] => {
    try {
      return templateManager.searchTemplates(searchOptions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      logger.error('Template search failed', { error: err, searchOptions });
      return [];
    }
  }, []);

  // Create new template
  const createTemplate = useCallback(async (
    definition: any,
    metadata: any,
    variables?: any
  ): Promise<WorkflowTemplate> => {
    setError(null);
    
    try {
      const newTemplate = await templateManager.createTemplate(definition, metadata, variables);
      await refreshTemplates();
      
      logger.info('Template created via hook', { 
        templateId: newTemplate.metadata.id,
        name: newTemplate.metadata.name 
      });
      
      return newTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      setError(errorMessage);
      logger.error('Template creation failed', { error: err });
      throw err;
    }
  }, [refreshTemplates]);

  // Update existing template
  const updateTemplate = useCallback(async (
    id: string,
    updates: any
  ): Promise<WorkflowTemplate> => {
    setError(null);
    
    try {
      const updatedTemplate = await templateManager.updateTemplate(id, updates);
      await refreshTemplates();
      
      logger.info('Template updated via hook', { 
        templateId: id,
        name: updatedTemplate.metadata.name 
      });
      
      return updatedTemplate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      setError(errorMessage);
      logger.error('Template update failed', { error: err, templateId: id });
      throw err;
    }
  }, [refreshTemplates]);

  // Delete template
  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    
    try {
      const success = await templateManager.deleteTemplate(id);
      if (success) {
        await refreshTemplates();
        logger.info('Template deleted via hook', { templateId: id });
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      setError(errorMessage);
      logger.error('Template deletion failed', { error: err, templateId: id });
      return false;
    }
  }, [refreshTemplates]);

  // Instantiate template as workflow
  const instantiateTemplate = useCallback((
    templateId: string,
    variables: Record<string, any> = {}
  ): any => {
    setError(null);
    
    try {
      const workflow = templateManager.instantiateTemplate(templateId, variables);
      
      logger.info('Template instantiated via hook', { 
        templateId,
        workflowId: workflow.id 
      });
      
      return workflow;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to instantiate template';
      setError(errorMessage);
      logger.error('Template instantiation failed', { error: err, templateId });
      throw err;
    }
  }, []);

  // Export templates
  const exportTemplates = useCallback(async (templateIds: string[]): Promise<string> => {
    setError(null);
    
    try {
      const exportData = await templateManager.exportTemplates(templateIds);
      
      logger.info('Templates exported via hook', { 
        templateCount: templateIds.length,
        size: exportData.length 
      });
      
      return exportData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export templates';
      setError(errorMessage);
      logger.error('Template export failed', { error: err, templateIds });
      throw err;
    }
  }, []);

  // Import templates
  const importTemplates = useCallback(async (data: string): Promise<WorkflowTemplate[]> => {
    setError(null);
    
    try {
      const importedTemplates = await templateManager.importTemplates(data);
      await refreshTemplates();
      
      logger.info('Templates imported via hook', { 
        importedCount: importedTemplates.length 
      });
      
      return importedTemplates;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import templates';
      setError(errorMessage);
      logger.error('Template import failed', { error: err });
      throw err;
    }
  }, [refreshTemplates]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      initialize();
    }
  }, [autoInitialize, isInitialized, initialize]);

  // Set up real-time updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !isInitialized) return;

    const handleTemplateCreated = () => refreshTemplates();
    const handleTemplateUpdated = () => refreshTemplates();
    const handleTemplateDeleted = () => refreshTemplates();
    const handleTemplatesImported = () => refreshTemplates();

    templateManager.on('templateCreated', handleTemplateCreated);
    templateManager.on('templateUpdated', handleTemplateUpdated);
    templateManager.on('templateDeleted', handleTemplateDeleted);
    templateManager.on('templatesImported', handleTemplatesImported);

    return () => {
      templateManager.off('templateCreated', handleTemplateCreated);
      templateManager.off('templateUpdated', handleTemplateUpdated);
      templateManager.off('templateDeleted', handleTemplateDeleted);
      templateManager.off('templatesImported', handleTemplatesImported);
    };
  }, [enableRealTimeUpdates, isInitialized, refreshTemplates]);

  return {
    // State
    templates,
    categories,
    tags,
    isLoading,
    isInitialized,
    error,
    
    // Actions
    initialize,
    searchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    instantiateTemplate,
    exportTemplates,
    importTemplates,
    refreshTemplates,
    clearError,
  };
}

export default useTemplateManager; 