/**
 * Theme Manager
 * 
 * Manages themes for the application
 */

import { ThemeMode, Theme, ThemeOption } from './theme';
import { defaultTheme } from './default';
import { defaultLightTheme } from './default-light';
import { draculaTheme } from './dracula';
import { githubDarkTheme } from './github-dark';
import { githubLightTheme } from './github-light';
import { atomOneTheme } from './atom-one';
import { ayuTheme } from './ayu';
import { ayuLightTheme } from './ayu-light';
import { ansiTheme } from './ansi';
import { ansiLightTheme } from './ansi-light';
import { googleLightTheme } from './google-light';
import { xcodeLightTheme } from './xcode-light';

/**
 * All available themes
 */
export const themes: Record<string, Theme> = {
  'default': defaultTheme,
  'default-light': defaultLightTheme,
  'dracula': draculaTheme,
  'github-dark': githubDarkTheme,
  'github-light': githubLightTheme,
  'atom-one': atomOneTheme,
  'ayu': ayuTheme,
  'ayu-light': ayuLightTheme,
  'ansi': ansiTheme,
  'ansi-light': ansiLightTheme,
  'google-light': googleLightTheme,
  'xcode-light': xcodeLightTheme,
};

/**
 * Theme options for selection
 */
export const themeOptions: ThemeOption[] = [
  {
    name: 'default',
    label: 'Default Dark',
    mode: 'dark',
    previewColor: defaultTheme.ui.primary,
  },
  {
    name: 'default-light',
    label: 'Default Light',
    mode: 'light',
    previewColor: defaultLightTheme.ui.primary,
  },
  {
    name: 'dracula',
    label: 'Dracula',
    mode: 'dark',
    previewColor: draculaTheme.ui.primary,
  },
  {
    name: 'github-dark',
    label: 'GitHub Dark',
    mode: 'dark',
    previewColor: githubDarkTheme.ui.primary,
  },
  {
    name: 'github-light',
    label: 'GitHub Light',
    mode: 'light',
    previewColor: githubLightTheme.ui.primary,
  },
  {
    name: 'atom-one',
    label: 'Atom One Dark',
    mode: 'dark',
    previewColor: atomOneTheme.ui.primary,
  },
  {
    name: 'ayu',
    label: 'Ayu Dark',
    mode: 'dark',
    previewColor: ayuTheme.ui.primary,
  },
  {
    name: 'ayu-light',
    label: 'Ayu Light',
    mode: 'light',
    previewColor: ayuLightTheme.ui.primary,
  },
  {
    name: 'ansi',
    label: 'ANSI Dark',
    mode: 'dark',
    previewColor: ansiTheme.ui.primary,
  },
  {
    name: 'ansi-light',
    label: 'ANSI Light',
    mode: 'light',
    previewColor: ansiLightTheme.ui.primary,
  },
  {
    name: 'google-light',
    label: 'Google Light',
    mode: 'light',
    previewColor: googleLightTheme.ui.primary,
  },
  {
    name: 'xcode-light',
    label: 'Xcode Light',
    mode: 'light',
    previewColor: xcodeLightTheme.ui.primary,
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
    return systemPrefersDark ? defaultTheme : defaultLightTheme;
  }
  
  // Get theme by name
  return themes[themeName] || defaultTheme;
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
 * Apply theme colors to Colors object
 * 
 * @param theme - Theme to apply
 * @param colors - Colors object to update
 */
export function applyTheme(theme: Theme, colors: any): void {
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