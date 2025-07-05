import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Core theme interfaces
export interface ThemeColors {
  primary: {
    50: string; 100: string; 200: string; 300: string; 400: string;
    500: string; 600: string; 700: string; 800: string; 900: string; 950: string;
  };
  secondary: {
    50: string; 100: string; 200: string; 300: string; 400: string;
    500: string; 600: string; 700: string; 800: string; 900: string; 950: string;
  };
  success: {
    50: string; 100: string; 200: string; 300: string; 400: string;
    500: string; 600: string; 700: string; 800: string; 900: string; 950: string;
  };
  warning: {
    50: string; 100: string; 200: string; 300: string; 400: string;
    500: string; 600: string; 700: string; 800: string; 900: string; 950: string;
  };
  error: {
    50: string; 100: string; 200: string; 300: string; 400: string;
    500: string; 600: string; 700: string; 800: string; 900: string; 950: string;
  };
  neutral: {
    0: string; 50: string; 100: string; 200: string; 300: string; 400: string;
    500: string; 600: string; 700: string; 800: string; 900: string; 950: string; 1000: string;
  };
  background: {
    primary: string; secondary: string; tertiary: string;
    elevated: string; overlay: string; inverse: string;
  };
  text: {
    primary: string; secondary: string; tertiary: string;
    disabled: string; inverse: string; link: string; linkHover: string;
  };
  border: {
    primary: string; secondary: string; tertiary: string;
    focus: string; error: string; success: string; warning: string;
  };
}

export interface Theme {
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: Record<string, string>;
  typography: {
    fontFamily: { sans: string[]; mono: string[] };
    fontSize: Record<string, [string, { lineHeight: string }]>;
    fontWeight: Record<string, string>;
  };
  borderRadius: Record<string, string>;
  boxShadow: Record<string, string>;
  animations: {
    duration: Record<string, string>;
    easing: Record<string, string>;
  };
}

// Light Theme
const lightTheme: Theme = {
  name: 'VibeX Enterprise Light',
  mode: 'light',
  colors: {
    primary: {
      50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8',
      500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49',
    },
    secondary: {
      50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8',
      500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617',
    },
    success: {
      50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80',
      500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16',
    },
    warning: {
      50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
      500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03',
    },
    error: {
      50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
      500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a',
    },
    neutral: {
      0: '#ffffff', 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af',
      500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712', 1000: '#000000',
    },
    background: {
      primary: '#ffffff', secondary: '#f9fafb', tertiary: '#f3f4f6',
      elevated: '#ffffff', overlay: 'rgba(17, 24, 39, 0.5)', inverse: '#111827',
    },
    text: {
      primary: '#111827', secondary: '#374151', tertiary: '#6b7280',
      disabled: '#9ca3af', inverse: '#ffffff', link: '#0ea5e9', linkHover: '#0284c7',
    },
    border: {
      primary: '#e5e7eb', secondary: '#d1d5db', tertiary: '#f3f4f6',
      focus: '#0ea5e9', error: '#ef4444', success: '#22c55e', warning: '#f59e0b',
    },
  },
  spacing: {
    0: '0px', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem', 5: '1.25rem',
    6: '1.5rem', 8: '2rem', 10: '2.5rem', 12: '3rem', 16: '4rem', 20: '5rem', 24: '6rem',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    },
    fontWeight: {
      normal: '400', medium: '500', semibold: '600', bold: '700',
    },
  },
  borderRadius: {
    none: '0px', sm: '0.125rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px',
  },
  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    none: 'none',
  },
  animations: {
    duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
    easing: { linear: 'linear', inOut: 'cubic-bezier(0.4, 0, 0.2, 1)', bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' },
  },
};

// Dark Theme
const darkTheme: Theme = {
  ...lightTheme,
  name: 'VibeX Enterprise Dark',
  mode: 'dark',
  colors: {
    ...lightTheme.colors,
    background: {
      primary: '#0f172a', secondary: '#1e293b', tertiary: '#334155',
      elevated: '#1e293b', overlay: 'rgba(0, 0, 0, 0.7)', inverse: '#ffffff',
    },
    text: {
      primary: '#f8fafc', secondary: '#cbd5e1', tertiary: '#94a3b8',
      disabled: '#64748b', inverse: '#0f172a', link: '#38bdf8', linkHover: '#0ea5e9',
    },
    border: {
      primary: '#334155', secondary: '#475569', tertiary: '#64748b',
      focus: '#38bdf8', error: '#f87171', success: '#4ade80', warning: '#fbbf24',
    },
  },
};

// Theme Context
export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: 'light' | 'dark';
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'light',
  storageKey = 'vibex-theme',
}) => {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(storageKey);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setCurrentTheme(savedTheme);
      } else {
        // Check system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setCurrentTheme(systemPrefersDark ? 'dark' : 'light');
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey]);

  // Save theme to localStorage when it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(storageKey, currentTheme);
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error);
      }
    }
  }, [currentTheme, storageKey, isLoading]);

  // Apply theme CSS variables to document root
  useEffect(() => {
    if (!isLoading) {
      const theme = currentTheme === 'light' ? lightTheme : darkTheme;
      const root = document.documentElement;
      
      // Apply background colors
      Object.entries(theme.colors.background).forEach(([key, value]) => {
        root.style.setProperty(`--color-background-${key}`, value);
      });
      
      // Apply text colors
      Object.entries(theme.colors.text).forEach(([key, value]) => {
        root.style.setProperty(`--color-text-${key}`, value);
      });
      
      // Apply border colors
      Object.entries(theme.colors.border).forEach(([key, value]) => {
        root.style.setProperty(`--color-border-${key}`, value);
      });
      
      // Apply primary colors
      Object.entries(theme.colors.primary).forEach(([key, value]) => {
        root.style.setProperty(`--color-primary-${key}`, value);
      });
      
      // Apply semantic colors
      ['success', 'warning', 'error'].forEach(semantic => {
        const colors = theme.colors[semantic as keyof ThemeColors] as Record<string, string>;
        Object.entries(colors).forEach(([key, value]) => {
          root.style.setProperty(`--color-${semantic}-${key}`, value);
        });
      });
      
      // Apply typography
      root.style.setProperty('--font-family-sans', theme.typography.fontFamily.sans.join(', '));
      root.style.setProperty('--font-family-mono', theme.typography.fontFamily.mono.join(', '));
      
      // Apply spacing
      Object.entries(theme.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, value);
      });
      
      // Apply border radius
      Object.entries(theme.borderRadius).forEach(([key, value]) => {
        root.style.setProperty(`--border-radius-${key}`, value);
      });
    }
  }, [currentTheme, isLoading]);

  const toggleTheme = () => {
    setCurrentTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (theme: 'light' | 'dark') => {
    setCurrentTheme(theme);
  };

  const theme = currentTheme === 'light' ? lightTheme : darkTheme;

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Utility functions
export const getThemeColor = (theme: Theme, colorPath: string): string => {
  const parts = colorPath.split('.');
  let current: any = theme.colors;
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      console.warn(`Theme color path not found: ${colorPath}`);
      return theme.colors.text.primary;
    }
  }
  
  return typeof current === 'string' ? current : theme.colors.text.primary;
};

export { lightTheme, darkTheme }; 