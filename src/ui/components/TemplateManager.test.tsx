/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * TemplateManager Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TemplateManager from '../../../src/ui/components/TemplateManager';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock the theme context
vi.mock('../../../src/ui/contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    theme: {
      ui: {
        background: '#ffffff',
        text: '#000000',
        textDim: '#999999',
        primary: '#3b82f6',
        secondary: '#10b981',
        success: '#22c55e',
        error: '#ef4444'
      }
    },
    themeName: 'default-light',
    themeMode: 'light',
    themes: {},
    setThemeByName: vi.fn(),
    setThemeMode: vi.fn(),
    toggleThemeMode: vi.fn(),
    isDarkTheme: false,
    toggleTheme: vi.fn(),
    isLoading: false,
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>
}));

describe('TemplateManager Component', () => {
  const mockOnTemplateSelect = vi.fn();
  const mockOnWorkflowCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with initial state', () => {
    render(<TemplateManager onTemplateSelect={mockOnTemplateSelect} onWorkflowCreate={mockOnWorkflowCreate} />);
    
    // Check that header is rendered
    expect(screen.getByText('Workflow Templates')).toBeInTheDocument();
    
    // Check that buttons are rendered
    expect(screen.getByText('Create Template')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
    
    // Check that search input is rendered
    expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
    
    // Check that category filters are rendered
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getAllByText('Development')[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Testing' })).toBeInTheDocument();
    
    // Check that templates header is rendered with count
    expect(screen.getByText('Templates (3)')).toBeInTheDocument();
    
    // Check that template cards are rendered
    expect(screen.getByText('Web Application Setup')).toBeInTheDocument();
    expect(screen.getByText('Testing Suite Setup')).toBeInTheDocument();
    expect(screen.getByText('CI/CD Deployment Pipeline')).toBeInTheDocument();
  });

  it('filters templates by search query', () => {
    render(<TemplateManager onTemplateSelect={mockOnTemplateSelect} onWorkflowCreate={mockOnWorkflowCreate} />);
    
    // All templates are visible initially
    expect(screen.getByText('Web Application Setup')).toBeInTheDocument();
    expect(screen.getByText('Testing Suite Setup')).toBeInTheDocument();
    expect(screen.getByText('CI/CD Deployment Pipeline')).toBeInTheDocument();
    
    // Enter search query
    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'testing' } });
    
    // Only testing related template should be visible
    expect(screen.queryByText('Web Application Setup')).not.toBeInTheDocument();
    expect(screen.getByText('Testing Suite Setup')).toBeInTheDocument();
    expect(screen.queryByText('CI/CD Deployment Pipeline')).not.toBeInTheDocument();
    
    // Check that template count is updated
    expect(screen.getByText('Templates (1)')).toBeInTheDocument();
  });

  it('filters templates by category', () => {
    render(<TemplateManager onTemplateSelect={mockOnTemplateSelect} onWorkflowCreate={mockOnWorkflowCreate} />);
    
    // All templates are visible initially
    expect(screen.getByText('Web Application Setup')).toBeInTheDocument();
    expect(screen.getByText('Testing Suite Setup')).toBeInTheDocument();
    expect(screen.getByText('CI/CD Deployment Pipeline')).toBeInTheDocument();
    
    // Select Deployment category
    const deploymentButton = screen.getByRole('button', { name: 'Deployment' });
    fireEvent.click(deploymentButton);
    
    // Only deployment template should be visible
    expect(screen.queryByText('Web Application Setup')).not.toBeInTheDocument();
    expect(screen.queryByText('Testing Suite Setup')).not.toBeInTheDocument();
    expect(screen.getByText('CI/CD Deployment Pipeline')).toBeInTheDocument();
    
    // Check that template count is updated
    expect(screen.getByText('Templates (1)')).toBeInTheDocument();
  });

  it('selects a template when clicked', () => {
    render(<TemplateManager onTemplateSelect={mockOnTemplateSelect} onWorkflowCreate={mockOnWorkflowCreate} />);
    
    // Initially no template details should be displayed
    expect(screen.queryByText('Template Details')).not.toBeInTheDocument();
    
    // Click on a template card
    fireEvent.click(screen.getByText('Web Application Setup'));
    
    // Template details should now be displayed
    expect(screen.getByText('Template Details')).toBeInTheDocument();
    
    // Find the description in the details panel, not the card
    const detailsSection = screen.getByText('Template Details').closest('div');
    const description = screen.getAllByText('Complete setup for a modern web application with frontend and backend')[1];
    expect(detailsSection).toContainElement(description);
    
    // Check other details
    expect(screen.getAllByText('VibeX')[0]).toBeInTheDocument();
    expect(screen.getAllByText('1.0.0')[0]).toBeInTheDocument();
    expect(screen.getByText('✓ Valid')).toBeInTheDocument();
    
    // onTemplateSelect callback should be called
    expect(mockOnTemplateSelect).toHaveBeenCalledTimes(1);
    expect(mockOnTemplateSelect).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        id: 'web-app-setup',
        name: 'Web Application Setup'
      })
    }));
  });

  it('instantiates a template when "Use Template" button is clicked', () => {
    render(<TemplateManager onTemplateSelect={mockOnTemplateSelect} onWorkflowCreate={mockOnWorkflowCreate} />);
    
    // Find and click the "Use Template" button on the first template card
    const useTemplateButtons = screen.getAllByText('Use Template');
    fireEvent.click(useTemplateButtons[0]);
    
    // onWorkflowCreate callback should be called
    expect(mockOnWorkflowCreate).toHaveBeenCalledTimes(1);
    expect(mockOnWorkflowCreate).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.stringContaining('workflow-'),
      name: expect.stringContaining('Web Application Setup')
    }));
  });

  it('instantiates a template when "Create Workflow from Template" button is clicked in details view', () => {
    render(<TemplateManager onTemplateSelect={mockOnTemplateSelect} onWorkflowCreate={mockOnWorkflowCreate} />);
    
    // Click on a template card to show details
    fireEvent.click(screen.getByText('Web Application Setup'));
    
    // Find and click the "Create Workflow from Template" button
    fireEvent.click(screen.getByText('Create Workflow from Template'));
    
    // onWorkflowCreate callback should be called
    expect(mockOnWorkflowCreate).toHaveBeenCalledTimes(1);
    expect(mockOnWorkflowCreate).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.stringContaining('workflow-'),
      name: expect.stringContaining('Web Application Setup')
    }));
  });

  it('switches to create template view when "Create Template" button is clicked', () => {
    render(<TemplateManager onTemplateSelect={mockOnTemplateSelect} onWorkflowCreate={mockOnWorkflowCreate} />);
    
    // Initially we should be in browse view
    expect(screen.getByText('Workflow Templates')).toBeInTheDocument();
    expect(screen.queryByText('Create New Template')).not.toBeInTheDocument();
    
    // Click the "Create Template" button
    fireEvent.click(screen.getByText('Create Template'));
    
    // Now we should be in create template view
    expect(screen.getByText('Create New Template')).toBeInTheDocument();
    expect(screen.getByText('Template Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    
    // Click the "Cancel" button
    fireEvent.click(screen.getByText('Cancel'));
    
    // We should be back in browse view
    expect(screen.getByText('Workflow Templates')).toBeInTheDocument();
    expect(screen.queryByText('Create New Template')).not.toBeInTheDocument();
  });
  
  it('shows empty state when no templates match filters', () => {
    render(<TemplateManager onTemplateSelect={mockOnTemplateSelect} onWorkflowCreate={mockOnWorkflowCreate} />);
    
    // Enter a search query that won't match any templates
    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    // Empty state message should be displayed
    expect(screen.getByText('No templates found matching your criteria')).toBeInTheDocument();
    expect(screen.getByText('Templates (0)')).toBeInTheDocument();
  });
});
