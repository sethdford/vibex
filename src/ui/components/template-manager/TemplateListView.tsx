/**
 * Template List View - Clean Architecture like Gemini CLI
 * 
 * Focused component for displaying template lists with search and filtering
 */

import React from 'react';
import { WorkflowTemplate, AdaptedTheme } from './types.js';
import { TemplateCardView } from './TemplateCardView.js';

/**
 * Template list view props
 */
export interface TemplateListViewProps {
  templates: WorkflowTemplate[];
  selectedTemplate: WorkflowTemplate | null;
  searchQuery: string;
  selectedCategory: string;
  availableCategories: string[];
  adaptedTheme: AdaptedTheme;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onTemplateSelect: (template: WorkflowTemplate) => void;
  onTemplateInstantiate: (template: WorkflowTemplate) => void;
}

/**
 * Template list view component
 */
export const TemplateListView: React.FC<TemplateListViewProps> = ({
  templates,
  selectedTemplate,
  searchQuery,
  selectedCategory,
  availableCategories,
  adaptedTheme,
  onSearchChange,
  onCategoryChange,
  onTemplateSelect,
  onTemplateInstantiate
}) => {
  const inputStyle = {
    width: '100%',
    padding: '0.5rem 1rem',
    borderRadius: adaptedTheme.borderRadius.lg,
    background: adaptedTheme.colors.background.secondary,
    border: `1px solid ${adaptedTheme.colors.border.primary}`,
    color: adaptedTheme.colors.text.primary,
    fontSize: '0.875rem',
  };

  const getCategoryButtonStyle = (category: string) => ({
    padding: '0.25rem 0.75rem',
    borderRadius: adaptedTheme.borderRadius.lg,
    fontSize: '0.875rem',
    border: `1px solid ${adaptedTheme.colors.border.primary}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: selectedCategory === category 
      ? adaptedTheme.colors.primary[500] 
      : adaptedTheme.colors.background.secondary,
    color: selectedCategory === category
      ? adaptedTheme.colors.text.inverse
      : adaptedTheme.colors.text.primary,
  });

  const listContainerStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    maxHeight: '24rem',
    overflowY: 'auto' as const,
    padding: '0.25rem',
  };

  return (
    <div>
      {/* Search and Filters */}
      <div style={{ 
        marginBottom: '1.5rem', 
        display: 'flex', 
        flexDirection: 'column' as const, 
        gap: '1rem' 
      }}>
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={inputStyle}
        />

        {/* Category Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          flexWrap: 'wrap' as const 
        }}>
          {availableCategories.map(category => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              style={getCategoryButtonStyle(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Template Count Header */}
      <h2 style={{ 
        fontSize: '1.125rem', 
        fontWeight: '600', 
        marginBottom: '1rem',
        color: adaptedTheme.colors.text.primary 
      }}>
        Templates ({templates.length})
      </h2>

      {/* Template List */}
      <div style={listContainerStyle}>
        {templates.length > 0 ? (
          templates.map(template => (
            <TemplateCardView
              key={template.metadata.id}
              template={template}
              isSelected={selectedTemplate?.metadata.id === template.metadata.id}
              adaptedTheme={adaptedTheme}
              onSelect={onTemplateSelect}
              onInstantiate={onTemplateInstantiate}
            />
          ))
        ) : (
          <div style={{ 
            textAlign: 'center' as const, 
            padding: '2rem',
            color: adaptedTheme.colors.text.tertiary 
          }}>
            <p>No templates found matching your criteria</p>
            {searchQuery && (
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Try adjusting your search or category filter
              </p>
            )}
          </div>
        )}
      </div>

      {/* Statistics */}
      {templates.length > 0 && (
        <div style={{ 
          marginTop: '1rem',
          padding: '0.75rem',
          background: adaptedTheme.colors.background.secondary,
          borderRadius: adaptedTheme.borderRadius.lg,
          fontSize: '0.75rem',
          color: adaptedTheme.colors.text.tertiary
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Downloads: {templates.reduce((sum, t) => sum + t.metadata.downloadCount, 0)}</span>
            <span>Categories: {new Set(templates.map(t => t.metadata.category)).size}</span>
          </div>
        </div>
      )}
    </div>
  );
}; 