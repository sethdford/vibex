/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Tests for theme-manager.ts
 */

import { 
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
  themes, 
  themeOptions, 
  getTheme, 
  getThemeMode, 
  getThemeOptions, 
  applyTheme 
} from '../../../src/ui/themes/theme-manager.js';

describe('Theme Manager', () => {
  describe('getTheme', () => {
    it('returns the default theme when an invalid theme name is provided', () => {
      const theme = getTheme('non-existent-theme');
      expect(theme).toBe(themes.default);
    });

    it('returns the requested theme when a valid theme name is provided', () => {
      const theme = getTheme('dracula');
      expect(theme).toBe(themes.dracula);
    });

    it('returns the appropriate default theme based on system preference when theme is "system"', () => {
      const darkTheme = getTheme('system', true);
      expect(darkTheme).toBe(themes.default);

      const lightTheme = getTheme('system', false);
      expect(lightTheme).toBe(themes['default-light']);
    });
  });

  describe('getThemeMode', () => {
    it('returns dark or light based on system preference when mode is system', () => {
      const darkMode = getThemeMode('system', true);
      expect(darkMode).toBe('dark');

      const lightMode = getThemeMode('system', false);
      expect(lightMode).toBe('light');
    });

    it('returns the specified mode when not system', () => {
      expect(getThemeMode('dark', false)).toBe('dark');
      expect(getThemeMode('light', true)).toBe('light');
    });
  });

  describe('getThemeOptions', () => {
    it('returns all theme options when mode is all', () => {
      const options = getThemeOptions('all');
      expect(options).toEqual(themeOptions);
    });

    it('returns only dark theme options when mode is dark', () => {
      const options = getThemeOptions('dark');
      expect(options.length).toBeGreaterThan(0);
      expect(options.every(option => option.mode === 'dark')).toBe(true);
    });

    it('returns only light theme options when mode is light', () => {
      const options = getThemeOptions('light');
      expect(options.length).toBeGreaterThan(0);
      expect(options.every(option => option.mode === 'light')).toBe(true);
    });

    it('uses all as the default mode', () => {
      const defaultOptions = getThemeOptions();
      const allOptions = getThemeOptions('all');
      expect(defaultOptions).toEqual(allOptions);
    });
  });

  describe('applyTheme', () => {
    it('applies UI and syntax colors to the colors object', () => {
      const mockColors = {
        Primary: '#000000',
        Secondary: '#000000',
        Text: '#000000',
        Background: '#000000',
        Syntax: {
          keyword: '#000000',
          string: '#000000',
          comment: '#000000'
        }
      };

      const mockTheme = {
        name: 'test',
        isDark: true,
        ui: {
          primary: '#ff0000',
          secondary: '#00ff00',
          text: '#0000ff',
          background: '#ffffff',
          success: '#00ff00',
          error: '#ff0000',
          warning: '#ffff00',
          info: '#0000ff',
          textDim: '#888888'
        },
        syntax: {
          keyword: '#ff00ff',
          string: '#ffff00',
          comment: '#00ffff'
        }
      };

      applyTheme(mockTheme, mockColors);

      expect(mockColors.Primary).toBe('#ff0000');
      expect(mockColors.Secondary).toBe('#00ff00');
      expect(mockColors.Text).toBe('#0000ff');
      expect(mockColors.Background).toBe('#ffffff');
      expect(mockColors.Syntax.keyword).toBe('#ff00ff');
      expect(mockColors.Syntax.string).toBe('#ffff00');
      expect(mockColors.Syntax.comment).toBe('#00ffff');
    });
  });
});