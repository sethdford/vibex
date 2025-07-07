/**
 * Template Details View - Clean Architecture like Gemini CLI
 * 
 * Focused component for displaying detailed template information
 */

import React from 'react';
import { WorkflowTemplate, AdaptedTheme } from './types.js';

/**
 * Template details view props
 */
export interface TemplateDetailsViewProps {
  template: WorkflowTemplate;
  adaptedTheme: AdaptedTheme;
  onInstantiate: (template: WorkflowTemplate) => void;
}

/**
 * Template details view component
 */
export const TemplateDetailsView: React.FC<TemplateDetailsViewProps> = ({
  template,
  adaptedTheme,
  onInstantiate
}) => {
  const containerStyle = {
    background: adaptedTheme.colors.background.elevated,
    border: `1px solid ${adaptedTheme.colors.border.primary}`,
    borderRadius: adaptedTheme.borderRadius.lg,
    padding: adaptedTheme.spacing[4],
  };

  const buttonStyle = {
    background: adaptedTheme.colors.primary[500],
    color: adaptedTheme.colors.text.inverse,
    padding: '0.5rem 1rem',
    borderRadius: adaptedTheme.borderRadius.lg,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    marginTop: '1rem',
    transition: 'opacity 0.2s ease',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    fontSize: '0.875rem',
  };

  const labelStyle = {
    color: adaptedTheme.colors.text.tertiary,
  };

  const valueStyle = {
    marginLeft: '0.5rem',
    color: adaptedTheme.colors.text.primary,
  };

  const validationStyle = {
    color: template.validation.isValid 
      ? adaptedTheme.colors.success[500] 
      : adaptedTheme.colors.error[500],
    fontWeight: '500',
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ 
        fontSize: '1.125rem', 
        fontWeight: '600', 
        marginBottom: '1rem',
        color: adaptedTheme.colors.text.primary 
      }}>
        Template Details
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Basic Info */}
        <div>
          <h3 style={{ 
            fontWeight: '500', 
            color: adaptedTheme.colors.text.primary,
            margin: 0 
          }}>
            {template.metadata.name}
          </h3>
          <p style={{ 
            fontSize: '0.875rem', 
            color: adaptedTheme.colors.text.secondary,
            margin: '0.25rem 0 0 0',
            lineHeight: '1.4'
          }}>
            {template.metadata.description}
          </p>
        </div>

        {/* Metadata Grid */}
        <div style={gridStyle}>
          <div>
            <span style={labelStyle}>Author:</span>
            <span style={valueStyle}>{template.metadata.author}</span>
          </div>
          <div>
            <span style={labelStyle}>Version:</span>
            <span style={valueStyle}>{template.metadata.version}</span>
          </div>
          <div>
            <span style={labelStyle}>Category:</span>
            <span style={valueStyle}>{template.metadata.category}</span>
          </div>
          <div>
            <span style={labelStyle}>Downloads:</span>
            <span style={valueStyle}>{template.metadata.downloadCount}</span>
          </div>
        </div>

        {/* Tags */}
        <div>
          <span style={labelStyle}>Tags:</span>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '0.25rem', 
            marginTop: '0.25rem' 
          }}>
            {template.metadata.tags.map(tag => (
              <span
                key={tag}
                style={{
                  background: adaptedTheme.colors.background.secondary,
                  color: adaptedTheme.colors.text.tertiary,
                  border: `1px solid ${adaptedTheme.colors.border.secondary}`,
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: adaptedTheme.borderRadius.lg,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Tasks Count */}
        <div>
          <span style={labelStyle}>Tasks:</span>
          <span style={valueStyle}>{template.definition.tasks?.length || 0}</span>
        </div>

        {/* Validation Status */}
        <div>
          <span style={validationStyle}>
            {template.validation.isValid ? '✓ Valid' : '✗ Invalid'}
          </span>
          {!template.validation.isValid && template.validation.errors.length > 0 && (
            <div style={{ 
              marginTop: '0.5rem',
              padding: '0.5rem',
              background: adaptedTheme.colors.error[500] + '10',
              border: `1px solid ${adaptedTheme.colors.error[500]}`,
              borderRadius: adaptedTheme.borderRadius.lg,
              fontSize: '0.75rem'
            }}>
              <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Errors:</div>
              {template.validation.errors.map((error, index) => (
                <div key={index} style={{ color: adaptedTheme.colors.error[500] }}>
                  • {error}
                </div>
              ))}
            </div>
          )}
          {template.validation.warnings && template.validation.warnings.length > 0 && (
            <div style={{ 
              marginTop: '0.5rem',
              padding: '0.5rem',
              background: adaptedTheme.colors.primary[100],
              border: `1px solid ${adaptedTheme.colors.primary[500]}`,
              borderRadius: adaptedTheme.borderRadius.lg,
              fontSize: '0.75rem'
            }}>
              <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Warnings:</div>
              {template.validation.warnings.map((warning, index) => (
                <div key={index} style={{ color: adaptedTheme.colors.primary[700] }}>
                  • {warning}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dates */}
        {(template.metadata.createdAt || template.metadata.updatedAt) && (
          <div style={{ fontSize: '0.75rem', color: adaptedTheme.colors.text.tertiary }}>
            {template.metadata.createdAt && (
              <div>Created: {template.metadata.createdAt.toLocaleDateString()}</div>
            )}
            {template.metadata.updatedAt && (
              <div>Updated: {template.metadata.updatedAt.toLocaleDateString()}</div>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => onInstantiate(template)}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          disabled={!template.validation.isValid}
        >
          Create Workflow from Template
        </button>
      </div>
    </div>
  );
}; 