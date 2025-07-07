/**
 * Template Manager Hook
 * 
 * Manages templates for commands and prompts.
 */

import { useState, useCallback, useEffect } from 'react';

export interface Template {
  id: string;
  name: string;
  description?: string;
  content: string;
  variables?: string[];
  category?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TemplateVariable {
  name: string;
  value: string;
  description?: string;
}

export interface UseTemplateManagerOptions {
  storageKey?: string;
  autoSave?: boolean;
}

export function useTemplateManager(options: UseTemplateManagerOptions = {}) {
  const {
    storageKey = 'vibex-templates',
    autoSave = true
  } = options;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Load templates from storage
  const loadTemplates = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTemplates(parsed.templates || []);
        setVariables(parsed.variables || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, [storageKey]);

  // Save templates to storage
  const saveTemplates = useCallback(() => {
    try {
      const data = {
        templates,
        variables,
        timestamp: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save templates:', error);
    }
  }, [templates, variables, storageKey]);

  // Create a new template
  const createTemplate = useCallback((template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTemplate: Template = {
      ...template,
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  }, []);

  // Update an existing template
  const updateTemplate = useCallback((id: string, updates: Partial<Omit<Template, 'id' | 'createdAt'>>) => {
    setTemplates(prev => prev.map(template => 
      template.id === id 
        ? { ...template, ...updates, updatedAt: Date.now() }
        : template
    ));
  }, []);

  // Delete a template
  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(template => template.id !== id));
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(null);
    }
  }, [selectedTemplate]);

  // Get template by ID
  const getTemplate = useCallback((id: string) => {
    return templates.find(template => template.id === id) || null;
  }, [templates]);

  // Search templates
  const searchTemplates = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description?.toLowerCase().includes(lowercaseQuery) ||
      template.content.toLowerCase().includes(lowercaseQuery) ||
      template.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }, [templates]);

  // Get templates by category
  const getTemplatesByCategory = useCallback((category: string) => {
    return templates.filter(template => template.category === category);
  }, [templates]);

  // Extract variables from template content
  const extractVariables = useCallback((content: string): string[] => {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const matches = content.match(variableRegex);
    return matches ? matches.map(match => match.slice(2, -2)) : [];
  }, []);

  // Render template with variables
  const renderTemplate = useCallback((template: Template, variableValues: Record<string, string> = {}): string => {
    let rendered = template.content;
    
    // Replace variables with values
    for (const [key, value] of Object.entries(variableValues)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value);
    }
    
    return rendered;
  }, []);

  // Set variable value
  const setVariable = useCallback((name: string, value: string, description?: string) => {
    setVariables(prev => {
      const existing = prev.find(v => v.name === name);
      if (existing) {
        return prev.map(v => v.name === name ? { ...v, value, description } : v);
      } else {
        return [...prev, { name, value, description }];
      }
    });
  }, []);

  // Get variable value
  const getVariable = useCallback((name: string): string => {
    const variable = variables.find(v => v.name === name);
    return variable?.value || '';
  }, [variables]);

  // Get all variable values as object
  const getVariableValues = useCallback((): Record<string, string> => {
    return variables.reduce((acc, variable) => {
      acc[variable.name] = variable.value;
      return acc;
    }, {} as Record<string, string>);
  }, [variables]);

  // Clone template
  const cloneTemplate = useCallback((id: string, newName?: string) => {
    const template = getTemplate(id);
    if (!template) return null;

    return createTemplate({
      ...template,
      name: newName || `${template.name} (Copy)`
    });
  }, [getTemplate, createTemplate]);

  // Export templates
  const exportTemplates = useCallback(() => {
    return {
      templates,
      variables,
      exportedAt: Date.now()
    };
  }, [templates, variables]);

  // Import templates
  const importTemplates = useCallback((data: { templates: Template[], variables?: TemplateVariable[] }) => {
    setTemplates(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const newTemplates = data.templates.filter(t => !existingIds.has(t.id));
      return [...prev, ...newTemplates];
    });

    if (data.variables) {
      setVariables(prev => {
        const existingNames = new Set(prev.map(v => v.name));
        const newVariables = data.variables!.filter(v => !existingNames.has(v.name));
        return [...prev, ...newVariables];
      });
    }
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (autoSave && templates.length > 0) {
      saveTemplates();
    }
  }, [templates, variables, autoSave, saveTemplates]);

  // Load on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates,
    variables,
    selectedTemplate,
    setSelectedTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    searchTemplates,
    getTemplatesByCategory,
    extractVariables,
    renderTemplate,
    setVariable,
    getVariable,
    getVariableValues,
    cloneTemplate,
    exportTemplates,
    importTemplates,
    loadTemplates,
    saveTemplates
  };
} 