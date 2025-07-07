/**
 * Theme Adapter Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for adapting themes for backward compatibility
 */

import { AdaptedTheme, IThemeAdapterService } from './types.js';

/**
 * Service for adapting themes for backward compatibility
 */
export class ThemeAdapterService implements IThemeAdapterService {
  
  /**
   * Adapt theme for backward compatibility
   */
  adaptTheme(theme: any, isDarkTheme: boolean): AdaptedTheme {
    return {
      mode: isDarkTheme ? 'dark' : 'light',
      colors: {
        background: {
          primary: theme.ui?.background || (isDarkTheme ? '#1a1a1a' : '#ffffff'),
          elevated: theme.ui?.background || (isDarkTheme ? '#2a2a2a' : '#f8f9fa'),
          secondary: theme.ui?.background || (isDarkTheme ? '#2a2a2a' : '#f8f9fa'),
        },
        text: {
          primary: theme.ui?.text || (isDarkTheme ? '#ffffff' : '#000000'),
          secondary: theme.ui?.textDim || (isDarkTheme ? '#cccccc' : '#666666'),
          tertiary: theme.ui?.textDim || (isDarkTheme ? '#999999' : '#999999'),
          inverse: isDarkTheme ? '#000000' : '#ffffff',
        },
        border: {
          primary: theme.ui?.textDim || (isDarkTheme ? '#444444' : '#e1e5e9'),
          secondary: theme.ui?.textDim || (isDarkTheme ? '#333333' : '#dee2e6'),
          focus: theme.ui?.primary || (isDarkTheme ? '#0066cc' : '#0066cc'),
        },
        primary: {
          100: (theme.ui?.primary || '#0066cc') + '20', // 20% opacity
          500: theme.ui?.primary || '#0066cc',
          700: theme.ui?.primary || '#004499',
        },
        secondary: {
          500: theme.ui?.secondary || (isDarkTheme ? '#6c757d' : '#6c757d'),
        },
        success: {
          500: theme.ui?.success || '#28a745',
        },
        error: {
          500: theme.ui?.error || '#dc3545',
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
  }

  /**
   * Get theme colors as flat object
   */
  getThemeColors(adaptedTheme: AdaptedTheme): Record<string, string> {
    return {
      backgroundPrimary: adaptedTheme.colors.background.primary,
      backgroundElevated: adaptedTheme.colors.background.elevated,
      backgroundSecondary: adaptedTheme.colors.background.secondary,
      textPrimary: adaptedTheme.colors.text.primary,
      textSecondary: adaptedTheme.colors.text.secondary,
      textTertiary: adaptedTheme.colors.text.tertiary,
      textInverse: adaptedTheme.colors.text.inverse,
      borderPrimary: adaptedTheme.colors.border.primary,
      borderSecondary: adaptedTheme.colors.border.secondary,
      borderFocus: adaptedTheme.colors.border.focus,
      primary100: adaptedTheme.colors.primary[100],
      primary500: adaptedTheme.colors.primary[500],
      primary700: adaptedTheme.colors.primary[700],
      secondary500: adaptedTheme.colors.secondary[500],
      success500: adaptedTheme.colors.success[500],
      error500: adaptedTheme.colors.error[500],
    };
  }

  /**
   * Get common theme styles
   */
  getThemeStyles(adaptedTheme: AdaptedTheme): Record<string, any> {
    return {
      card: {
        background: adaptedTheme.colors.background.elevated,
        border: `1px solid ${adaptedTheme.colors.border.primary}`,
        borderRadius: adaptedTheme.borderRadius.lg,
        padding: adaptedTheme.spacing[4],
      },
      cardSelected: {
        background: adaptedTheme.colors.background.elevated,
        border: `1px solid ${adaptedTheme.colors.border.focus}`,
        borderRadius: adaptedTheme.borderRadius.lg,
        padding: adaptedTheme.spacing[4],
      },
      input: {
        background: adaptedTheme.colors.background.primary,
        border: `1px solid ${adaptedTheme.colors.border.primary}`,
        color: adaptedTheme.colors.text.primary,
        borderRadius: adaptedTheme.borderRadius.lg,
        padding: adaptedTheme.spacing[3],
      },
      button: {
        background: adaptedTheme.colors.primary[500],
        color: adaptedTheme.colors.text.inverse,
        borderRadius: adaptedTheme.borderRadius.lg,
        padding: adaptedTheme.spacing[3],
      },
      buttonSecondary: {
        background: adaptedTheme.colors.background.secondary,
        color: adaptedTheme.colors.text.primary,
        border: `1px solid ${adaptedTheme.colors.border.primary}`,
        borderRadius: adaptedTheme.borderRadius.lg,
        padding: adaptedTheme.spacing[3],
      },
      tag: {
        background: adaptedTheme.colors.primary[100],
        color: adaptedTheme.colors.primary[700],
        borderRadius: adaptedTheme.borderRadius.lg,
        padding: '0.25rem 0.5rem',
      },
      tagSecondary: {
        background: adaptedTheme.colors.background.secondary,
        color: adaptedTheme.colors.text.tertiary,
        border: `1px solid ${adaptedTheme.colors.border.secondary}`,
        borderRadius: adaptedTheme.borderRadius.lg,
        padding: '0.25rem 0.5rem',
      },
    };
  }

  /**
   * Generate CSS-in-JS styles for components
   */
  generateComponentStyles(adaptedTheme: AdaptedTheme) {
    const styles = this.getThemeStyles(adaptedTheme);
    
    return {
      container: {
        background: adaptedTheme.colors.background.primary,
        color: adaptedTheme.colors.text.primary,
        minHeight: '100vh',
      },
      header: {
        marginBottom: adaptedTheme.spacing[6],
      },
      searchContainer: {
        marginBottom: adaptedTheme.spacing[6],
        display: 'flex',
        flexDirection: 'column' as const,
        gap: adaptedTheme.spacing[4],
      },
      categoryButtons: {
        display: 'flex',
        gap: adaptedTheme.spacing[3],
        flexWrap: 'wrap' as const,
      },
      templateGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: adaptedTheme.spacing[6],
      },
      templateList: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: adaptedTheme.spacing[3],
        maxHeight: '24rem',
        overflowY: 'auto' as const,
      },
      ...styles,
    };
  }
}

/**
 * Factory function for creating theme adapter service
 */
export function createThemeAdapterService(): ThemeAdapterService {
  return new ThemeAdapterService();
} 