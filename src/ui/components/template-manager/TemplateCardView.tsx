/**
 * Template Card View - Clean Architecture like Gemini CLI
 * 
 * Focused component for displaying individual template cards
 */

import React from 'react';
import { WorkflowTemplate, AdaptedTheme } from './types.js';

/**
 * Template card view props
 */
export interface TemplateCardViewProps {
  template: WorkflowTemplate;
  isSelected: boolean;
  adaptedTheme: AdaptedTheme;
  onSelect: (template: WorkflowTemplate) => void;
  onInstantiate: (template: WorkflowTemplate) => void;
}

/**
 * Template card view component
 */
export const TemplateCardView: React.FC<TemplateCardViewProps> = ({
  template,
  isSelected,
  adaptedTheme,
  onSelect,
  onInstantiate
}) => {
  const handleInstantiateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInstantiate(template);
  };

  const cardStyle = {
    background: adaptedTheme.colors.background.elevated,
    border: `1px solid ${isSelected 
      ? adaptedTheme.colors.border.focus 
      : adaptedTheme.colors.border.primary}`,
    borderRadius: adaptedTheme.borderRadius.lg,
    padding: adaptedTheme.spacing[4],
    marginBottom: adaptedTheme.spacing[3],
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  };

  const categoryStyle = {
    background: adaptedTheme.colors.primary[100],
    color: adaptedTheme.colors.primary[700],
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    borderRadius: adaptedTheme.borderRadius.lg,
  };

  const tagStyle = {
    background: adaptedTheme.colors.background.secondary,
    color: adaptedTheme.colors.text.tertiary,
    border: `1px solid ${adaptedTheme.colors.border.secondary}`,
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    borderRadius: adaptedTheme.borderRadius.lg,
  };

  const buttonStyle = {
    background: adaptedTheme.colors.primary[500],
    color: adaptedTheme.colors.text.inverse,
    fontSize: '0.75rem',
    padding: '0.25rem 0.75rem',
    borderRadius: adaptedTheme.borderRadius.lg,
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  };

  return (
    <div
      style={cardStyle}
      onClick={() => onSelect(template)}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <h3 style={{ 
          fontSize: '1.125rem', 
          fontWeight: '600', 
          color: adaptedTheme.colors.text.primary,
          margin: 0 
        }}>
          {template.metadata.name}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={categoryStyle}>
            {template.metadata.category}
          </span>
          <span style={{ 
            fontSize: '0.75rem', 
            color: adaptedTheme.colors.text.tertiary 
          }}>
            v{template.metadata.version}
          </span>
        </div>
      </div>

      {/* Description */}
      <p style={{ 
        fontSize: '0.875rem', 
        color: adaptedTheme.colors.text.secondary,
        marginBottom: '0.75rem',
        lineHeight: '1.4'
      }}>
        {template.metadata.description}
      </p>

      {/* Tags */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '0.25rem', 
        marginBottom: '0.75rem' 
      }}>
        {template.metadata.tags.map(tag => (
          <span key={tag} style={tagStyle}>
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ 
            fontSize: '0.75rem', 
            color: adaptedTheme.colors.text.tertiary 
          }}>
            By {template.metadata.author}
          </span>
          <span style={{ 
            fontSize: '0.75rem', 
            color: adaptedTheme.colors.text.tertiary 
          }}>
            {template.metadata.downloadCount} downloads
          </span>
        </div>
        
        <button
          onClick={handleInstantiateClick}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Use Template
        </button>
      </div>

      {/* Validation indicator */}
      {!template.validation.isValid && (
        <div style={{ 
          marginTop: '0.5rem',
          padding: '0.25rem 0.5rem',
          background: adaptedTheme.colors.error[500] + '20',
          border: `1px solid ${adaptedTheme.colors.error[500]}`,
          borderRadius: adaptedTheme.borderRadius.lg,
          fontSize: '0.75rem',
          color: adaptedTheme.colors.error[500]
        }}>
          ⚠️ Template has validation errors
        </div>
      )}
    </div>
  );
}; 