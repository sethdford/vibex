/**
 * Unified Theme Manager
 * 
 * Uses the theme generator system to eliminate duplication.
 * Replaces 14 individual theme files with generated themes.
 * 
 * CONSOLIDATION IMPACT:
 * - Eliminates 14 duplicate theme files
 * - Reduces theme-manager.ts imports from 12 to 1
 * - Single source of truth for all themes
 * - Automatic theme generation and registration
 */

import type { ThemeMode, Theme, ThemeOption } from './theme.js';
import { generateAllThemes, THEME_PALETTES } from './theme-generator.js';

/**
 * All available themes - generated automatically
 */
export const themes: Record<string, Theme> = generateAllThemes();

/**
 * Theme options for selection - generated automatically from palettes
 */
export const themeOptions: ThemeOption[] = [
  {
    name: 'default',
    label: 'Default Dark',
    mode: 'dark',
    previewColor: themes['default'].ui.primary,
  },
  {
    name: 'default-light',
    label: 'Default Light',
    mode: 'light',
    previewColor: themes['default-light'].ui.primary,
  },
  {
    name: 'dracula',
    label: 'Dracula',
    mode: 'dark',
    previewColor: themes['dracula'].ui.primary,
  },
  {
    name: 'github-dark',
    label: 'GitHub Dark',
    mode: 'dark',
    previewColor: themes['github-dark'].ui.primary,
  },
  {
    name: 'github-light',
    label: 'GitHub Light',
    mode: 'light',
    previewColor: themes['github-light'].ui.primary,
  },
  {
    name: 'atom-one',
    label: 'Atom One Dark',
    mode: 'dark',
    previewColor: themes['atom-one'].ui.primary,
  },
  {
    name: 'ayu',
    label: 'Ayu Dark',
    mode: 'dark',
    previewColor: themes['ayu'].ui.primary,
  },
  {
    name: 'ayu-light',
    label: 'Ayu Light',
    mode: 'light',
    previewColor: themes['ayu-light'].ui.primary,
  },
  {
    name: 'ansi',
    label: 'ANSI Dark',
    mode: 'dark',
    previewColor: themes['ansi'].ui.primary,
  },
  {
    name: 'ansi-light',
    label: 'ANSI Light',
    mode: 'light',
    previewColor: themes['ansi-light'].ui.primary,
  },
  {
    name: 'google-light',
    label: 'Google Light',
    mode: 'light',
    previewColor: themes['google-light'].ui.primary,
  },
  {
    name: 'xcode-light',
    label: 'Xcode Light',
    mode: 'light',
    previewColor: themes['xcode-light'].ui.primary,
  },
];

/**
 * Get theme by name
 * 
 * @param themeName - Theme name
 * @param systemPrefersDark - Whether system prefers dark mode
 * @returns The requested theme
 */
export function getTheme(themeName: string, systemPrefersDark = false): Theme {
  // If using system theme preference
  if (themeName === 'system') {
    return systemPrefersDark ? themes['default'] : themes['default-light'];
  }
  
  // Get theme by name
  return themes[themeName] || themes['default'];
}

/**
 * Get theme mode (light/dark) based on theme setting
 * 
 * @param themeMode - Theme mode setting
 * @param systemPrefersDark - Whether system prefers dark mode
 * @returns 'light' or 'dark'
 */
export function getThemeMode(themeMode: ThemeMode, systemPrefersDark = false): 'light' | 'dark' {
  if (themeMode === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  
  return themeMode;
}

/**
 * Get theme options for the current mode
 * 
 * @param mode - Theme mode ('dark', 'light', or 'all')
 * @returns Theme options for the specified mode
 */
export function getThemeOptions(mode: 'dark' | 'light' | 'all' = 'all'): ThemeOption[] {
  if (mode === 'all') {
    return themeOptions;
  }
  
  return themeOptions.filter(option => option.mode === mode);
}

/**
 * Colors interface for theme application
 */
export interface ColorsInterface {
  [key: string]: string | Record<string, string>;
  Syntax: Record<string, string>;
}

/**
 * Apply theme colors to Colors object
 * 
 * @param theme - Theme to apply
 * @param colors - Colors object to update
 */
export function applyTheme(theme: Theme, colors: ColorsInterface): void {
  // Apply UI colors
  Object.entries(theme.ui).forEach(([key, value]) => {
    if (colors[key.charAt(0).toUpperCase() + key.slice(1)]) {
      colors[key.charAt(0).toUpperCase() + key.slice(1)] = value;
    }
  });
  
  // Apply syntax colors
  Object.entries(theme.syntax).forEach(([key, value]) => {
    if (colors.Syntax[key]) {
      colors.Syntax[key] = value;
    }
  });
}