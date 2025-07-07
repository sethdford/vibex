/**
 * Template Creation View - Clean Architecture like Gemini CLI
 * 
 * Focused component for creating new templates
 */

import React, { useState } from 'react';
import { TemplateCreationData, AdaptedTheme } from './types.js';

/**
 * Template creation view props
 */
export interface TemplateCreationViewProps {
  availableCategories: string[];
  adaptedTheme: AdaptedTheme;
  onCancel: () => void;
  onCreate: (data: TemplateCreationData) => Promise<void>;
}

/**
 * Template creation view component
 */
export const TemplateCreationView: React.FC<TemplateCreationViewProps> = ({
  availableCategories,
  adaptedTheme,
  onCancel,
  onCreate
}) => {
  const [formData, setFormData] = useState<TemplateCreationData>({
    name: '',
    description: '',
    category: availableCategories.filter(c => c !== 'All')[0] || 'Development',
    tags: [],
    author: 'VibeX User',
    definition: {
      id: '',
      name: '',
      tasks: []
    }
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const containerStyle = {
    maxWidth: '32rem',
    margin: '0 auto',
  };

  const cardStyle = {
    background: adaptedTheme.colors.background.elevated,
    border: `1px solid ${adaptedTheme.colors.border.primary}`,
    borderRadius: adaptedTheme.borderRadius.lg,
    padding: adaptedTheme.spacing[6],
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: adaptedTheme.borderRadius.lg,
    background: adaptedTheme.colors.background.primary,
    border: `1px solid ${adaptedTheme.colors.border.primary}`,
    color: adaptedTheme.colors.text.primary,
    fontSize: '0.875rem',
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '4rem',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  };

  const buttonStyle = {
    padding: '0.5rem 1.5rem',
    borderRadius: adaptedTheme.borderRadius.lg,
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    transition: 'opacity 0.2s ease',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: adaptedTheme.colors.primary[500],
    color: adaptedTheme.colors.text.inverse,
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: adaptedTheme.colors.background.secondary,
    color: adaptedTheme.colors.text.primary,
    border: `1px solid ${adaptedTheme.colors.border.primary}`,
  };

  const validateForm = (): string[] => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) {
      newErrors.push('Template name is required');
    }

    if (!formData.description.trim()) {
      newErrors.push('Template description is required');
    }

    if (!formData.category.trim()) {
      newErrors.push('Template category is required');
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (formErrors.length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      // Update definition with form data
      const updatedFormData = {
        ...formData,
        definition: {
          ...formData.definition,
          id: formData.name.toLowerCase().replace(/\s+/g, '-'),
          name: formData.name,
          tasks: formData.definition.tasks.length > 0 ? formData.definition.tasks : [
            { id: 'task-1', name: 'Sample Task', status: 'pending' }
          ]
        }
      };

      await onCreate(updatedFormData);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to create template']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600', 
          marginBottom: '1.5rem',
          color: adaptedTheme.colors.text.primary 
        }}>
          Create New Template
        </h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Template Name */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              marginBottom: '0.5rem',
              color: adaptedTheme.colors.text.primary 
            }}>
              Template Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              style={inputStyle}
              placeholder="Enter template name..."
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              marginBottom: '0.5rem',
              color: adaptedTheme.colors.text.primary 
            }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              style={textareaStyle}
              placeholder="Describe what this template does..."
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              marginBottom: '0.5rem',
              color: adaptedTheme.colors.text.primary 
            }}>
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              style={inputStyle}
            >
              {availableCategories.filter(c => c !== 'All').map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              marginBottom: '0.5rem',
              color: adaptedTheme.colors.text.primary 
            }}>
              Tags
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              style={inputStyle}
              placeholder="Type tag and press Enter..."
            />
            {formData.tags.length > 0 && (
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '0.25rem', 
                marginTop: '0.5rem' 
              }}>
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      background: adaptedTheme.colors.primary[100],
                      color: adaptedTheme.colors.primary[700],
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: adaptedTheme.borderRadius.lg,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: adaptedTheme.colors.primary[700],
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '0.75rem'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Author */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: '500', 
              marginBottom: '0.5rem',
              color: adaptedTheme.colors.text.primary 
            }}>
              Author
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
              style={inputStyle}
              placeholder="Template author..."
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div style={{
              padding: '0.75rem',
              background: adaptedTheme.colors.error[500] + '10',
              border: `1px solid ${adaptedTheme.colors.error[500]}`,
              borderRadius: adaptedTheme.borderRadius.lg,
              fontSize: '0.875rem'
            }}>
              {errors.map((error, index) => (
                <div key={index} style={{ color: adaptedTheme.colors.error[500] }}>
                  • {error}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            paddingTop: '1rem' 
          }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                ...primaryButtonStyle,
                opacity: isSubmitting ? 0.6 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={secondaryButtonStyle}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 