/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * useTemplateManager Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useTemplateManager, UseTemplateManagerOptions } from '../../../src/ui/hooks/useTemplateManager';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock the logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock the template manager module
const mockSearchTemplates = vi.fn();
const mockInitialize = vi.fn();
const mockCreateTemplate = vi.fn();
const mockUpdateTemplate = vi.fn();
const mockDeleteTemplate = vi.fn();
const mockInstantiateTemplate = vi.fn();
const mockExportTemplates = vi.fn();
const mockImportTemplates = vi.fn();
const mockGetCategories = vi.fn();
const mockGetTags = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();

// Mock template data
const mockTemplates = [
  {
    metadata: {
      id: 'template-1',
      name: 'Template 1',
      description: 'Description 1',
      category: 'Development',
      tags: ['web', 'setup'],
      author: 'Author 1',
      version: '1.0.0',
      downloadCount: 10,
    },
    definition: { id: 'template-1', tasks: [] },
    validation: { isValid: true, errors: [] },
  },
  {
    metadata: {
      id: 'template-2',
      name: 'Template 2',
      description: 'Description 2',
      category: 'Testing',
      tags: ['testing', 'e2e'],
      author: 'Author 2',
      version: '1.0.0',
      downloadCount: 5,
    },
    definition: { id: 'template-2', tasks: [] },
    validation: { isValid: true, errors: [] },
  },
];

vi.mock('../../../src/core/templates/WorkflowTemplateManager', () => ({
  templateManager: {
    initialize: mockInitialize,
    searchTemplates: mockSearchTemplates,
    createTemplate: mockCreateTemplate,
    updateTemplate: mockUpdateTemplate,
    deleteTemplate: mockDeleteTemplate,
    instantiateTemplate: mockInstantiateTemplate,
    exportTemplates: mockExportTemplates,
    importTemplates: mockImportTemplates,
    getCategories: mockGetCategories,
    getTags: mockGetTags,
    on: mockOn,
    off: mockOff,
  },
}));

describe('useTemplateManager Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockInitialize.mockResolvedValue(undefined);
    mockSearchTemplates.mockReturnValue(mockTemplates);
    mockGetCategories.mockReturnValue(['Development', 'Testing', 'Deployment']);
    mockGetTags.mockReturnValue(['web', 'setup', 'testing', 'e2e']);
    mockCreateTemplate.mockImplementation(async (definition, metadata) => ({
      metadata: { id: 'new-template', ...metadata },
      definition,
      validation: { isValid: true, errors: [] },
    }));
    mockUpdateTemplate.mockImplementation(async (id, updates) => ({
      metadata: { id, ...updates.metadata },
      definition: updates.definition || {},
      validation: { isValid: true, errors: [] },
    }));
    mockDeleteTemplate.mockResolvedValue(true);
    mockInstantiateTemplate.mockImplementation((id) => ({
      id: `workflow-${Date.now()}`,
      templateId: id,
      tasks: [],
    }));
    mockExportTemplates.mockResolvedValue('{"templates":[]}');
    mockImportTemplates.mockResolvedValue(mockTemplates);
  });

  it('initializes automatically by default', async () => {
    const { result } = renderHook(() => useTemplateManager());
    
    // Should start with loading state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isInitialized).toBe(false);
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Should have called initialize
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockSearchTemplates).toHaveBeenCalledTimes(1);
    expect(mockGetCategories).toHaveBeenCalledTimes(1);
    expect(mockGetTags).toHaveBeenCalledTimes(1);
    
    // Should have updated state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.templates).toEqual(mockTemplates);
    expect(result.current.categories).toEqual(['Development', 'Testing', 'Deployment']);
    expect(result.current.tags).toEqual(['web', 'setup', 'testing', 'e2e']);
    expect(result.current.error).toBeNull();
  });

  it('does not initialize automatically when autoInitialize is false', async () => {
    const { result } = renderHook(() => useTemplateManager({ autoInitialize: false }));
    
    // Should not be loading
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isInitialized).toBe(false);
    
    // Wait a moment to ensure no async calls
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Should not have called initialize
    expect(mockInitialize).not.toHaveBeenCalled();
    expect(mockSearchTemplates).not.toHaveBeenCalled();
    
    // Should have empty state
    expect(result.current.templates).toEqual([]);
    expect(result.current.categories).toEqual([]);
    expect(result.current.tags).toEqual([]);
  });

  it('initializes manually when initialize function is called', async () => {
    const { result } = renderHook(() => useTemplateManager({ autoInitialize: false }));
    
    // Manually call initialize
    await act(async () => {
      await result.current.initialize();
    });
    
    // Should have called initialize
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockSearchTemplates).toHaveBeenCalledTimes(1);
    
    // Should have updated state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.templates).toEqual(mockTemplates);
  });

  it('handles initialization errors gracefully', async () => {
    // Mock initialization to fail
    mockInitialize.mockRejectedValueOnce(new Error('Initialization failed'));
    
    const { result } = renderHook(() => useTemplateManager());
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Should have updated error state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.error).toBe('Initialization failed');
  });

  it('searches for templates with the provided options', async () => {
    const { result } = renderHook(() => useTemplateManager());
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Reset mock to track new calls
    mockSearchTemplates.mockClear();
    
    // Define search options
    const searchOptions = { query: 'test', categories: ['Testing'], tags: ['e2e'] };
    
    // Call searchTemplates
    let searchResults;
    act(() => {
      searchResults = result.current.searchTemplates(searchOptions);
    });
    
    // Should have called searchTemplates with options
    expect(mockSearchTemplates).toHaveBeenCalledWith(searchOptions);
    expect(searchResults).toEqual(mockTemplates);
  });

  it('creates a new template', async () => {
    const { result } = renderHook(() => useTemplateManager());
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const templateDefinition = { id: 'new-template', tasks: [] };
    const templateMetadata = { 
      name: 'New Template', 
      description: 'A new template', 
      category: 'Development',
      tags: ['new'],
      author: 'Test User',
      version: '1.0.0'
    };
    
    // Call createTemplate
    let newTemplate;
    await act(async () => {
      newTemplate = await result.current.createTemplate(templateDefinition, templateMetadata);
    });
    
    // Should have called createTemplate
    expect(mockCreateTemplate).toHaveBeenCalledWith(templateDefinition, templateMetadata, undefined);
    expect(newTemplate).toEqual({
      metadata: { id: 'new-template', ...templateMetadata },
      definition: templateDefinition,
      validation: { isValid: true, errors: [] },
    });
    
    // Should have refreshed templates
    expect(mockSearchTemplates).toHaveBeenCalledTimes(2); // Once during init, once after create
  });

  it('updates an existing template', async () => {
    const { result } = renderHook(() => useTemplateManager());
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const templateId = 'template-1';
    const updates = { 
      metadata: { 
        name: 'Updated Template', 
        description: 'Updated description'
      },
      definition: { id: templateId, tasks: [{ id: 'task-1', name: 'New Task' }] }
    };
    
    // Call updateTemplate
    let updatedTemplate;
    await act(async () => {
      updatedTemplate = await result.current.updateTemplate(templateId, updates);
    });
    
    // Should have called updateTemplate
    expect(mockUpdateTemplate).toHaveBeenCalledWith(templateId, updates);
    expect(updatedTemplate).toEqual({
      metadata: { id: templateId, ...updates.metadata },
      definition: updates.definition,
      validation: { isValid: true, errors: [] },
    });
    
    // Should have refreshed templates
    expect(mockSearchTemplates).toHaveBeenCalledTimes(2); // Once during init, once after update
  });

  it('deletes a template', async () => {
    const { result } = renderHook(() => useTemplateManager());
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const templateId = 'template-1';
    
    // Call deleteTemplate
    let success;
    await act(async () => {
      success = await result.current.deleteTemplate(templateId);
    });
    
    // Should have called deleteTemplate
    expect(mockDeleteTemplate).toHaveBeenCalledWith(templateId);
    expect(success).toBe(true);
    
    // Should have refreshed templates
    expect(mockSearchTemplates).toHaveBeenCalledTimes(2); // Once during init, once after delete
  });

  it('instantiates a template', async () => {
    const { result } = renderHook(() => useTemplateManager());
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const templateId = 'template-1';
    const variables = { name: 'Test Workflow', environment: 'dev' };
    
    // Call instantiateTemplate
    let workflow;
    act(() => {
      workflow = result.current.instantiateTemplate(templateId, variables);
    });
    
    // Should have called instantiateTemplate
    expect(mockInstantiateTemplate).toHaveBeenCalledWith(templateId, variables);
    expect(workflow).toEqual({
      id: expect.stringContaining('workflow-'),
      templateId,
      tasks: [],
    });
  });

  it('exports templates', async () => {
    const { result } = renderHook(() => useTemplateManager());
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const templateIds = ['template-1', 'template-2'];
    
    // Call exportTemplates
    let exportData;
    await act(async () => {
      exportData = await result.current.exportTemplates(templateIds);
    });
    
    // Should have called exportTemplates
    expect(mockExportTemplates).toHaveBeenCalledWith(templateIds);
    expect(exportData).toBe('{"templates":[]}');
  });

  it('imports templates', async () => {
    const { result } = renderHook(() => useTemplateManager());
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    const importData = '{"templates":[]}';
    
    // Call importTemplates
    let importedTemplates;
    await act(async () => {
      importedTemplates = await result.current.importTemplates(importData);
    });
    
    // Should have called importTemplates
    expect(mockImportTemplates).toHaveBeenCalledWith(importData);
    expect(importedTemplates).toEqual(mockTemplates);
    
    // Should have refreshed templates
    expect(mockSearchTemplates).toHaveBeenCalledTimes(2); // Once during init, once after import
  });

  it('refreshes templates when called directly', async () => {
    const { result } = renderHook(() => useTemplateManager());
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Reset mocks to track new calls
    mockSearchTemplates.mockClear();
    mockGetCategories.mockClear();
    mockGetTags.mockClear();
    
    // Call refreshTemplates
    await act(async () => {
      await result.current.refreshTemplates();
    });
    
    // Should have refreshed data
    expect(mockSearchTemplates).toHaveBeenCalledTimes(1);
    expect(mockGetCategories).toHaveBeenCalledTimes(1);
    expect(mockGetTags).toHaveBeenCalledTimes(1);
  });

  it('clears error state when clearError is called', async () => {
    // Mock initialization to fail
    mockInitialize.mockRejectedValueOnce(new Error('Initialization failed'));
    
    const { result } = renderHook(() => useTemplateManager());
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Should have error state
    expect(result.current.error).toBe('Initialization failed');
    
    // Call clearError
    act(() => {
      result.current.clearError();
    });
    
    // Error should be cleared
    expect(result.current.error).toBeNull();
  });

  it('sets up event listeners when enableRealTimeUpdates is true', async () => {
    const { result } = renderHook(() => useTemplateManager({ enableRealTimeUpdates: true }));
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Should have set up listeners
    expect(mockOn).toHaveBeenCalledWith('templateCreated', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('templateUpdated', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('templateDeleted', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('templatesImported', expect.any(Function));
  });

  it('does not set up event listeners when enableRealTimeUpdates is false', async () => {
    const { result } = renderHook(() => useTemplateManager({ enableRealTimeUpdates: false }));
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Should not have set up listeners
    expect(mockOn).not.toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', async () => {
    const { result, unmount } = renderHook(() => useTemplateManager({ enableRealTimeUpdates: true }));
    
    // Wait for initialization to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Unmount the hook
    unmount();
    
    // Should have removed listeners
    expect(mockOff).toHaveBeenCalledWith('templateCreated', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('templateUpdated', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('templateDeleted', expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith('templatesImported', expect.any(Function));
  });
});
