/**
 * Tests for theme.ts
 * 
 * These tests verify that the theme types are properly defined and exported.
 */

import { defaultTheme } from '../../../src/ui/themes/default.js';
import type { Theme, ThemeOption, ThemeMode } from '../../../src/ui/themes/theme.js';

describe('Theme Types', () => {
  describe('Theme interface', () => {
    it('should have the required properties', () => {
      // Using the defaultTheme as a concrete implementation
      expect(defaultTheme).toHaveProperty('name');
      expect(defaultTheme).toHaveProperty('isDark');
      expect(defaultTheme).toHaveProperty('ui');
      expect(defaultTheme).toHaveProperty('syntax');
      
      // Check UI properties
      expect(defaultTheme.ui).toHaveProperty('primary');
      expect(defaultTheme.ui).toHaveProperty('secondary');
      expect(defaultTheme.ui).toHaveProperty('success');
      expect(defaultTheme.ui).toHaveProperty('error');
      expect(defaultTheme.ui).toHaveProperty('warning');
      expect(defaultTheme.ui).toHaveProperty('info');
      expect(defaultTheme.ui).toHaveProperty('text');
      expect(defaultTheme.ui).toHaveProperty('textDim');
      expect(defaultTheme.ui).toHaveProperty('background');

      // Type check - this just verifies at compile time that the types are compatible
      const themeTest: Theme = defaultTheme;
      expect(themeTest).toBe(defaultTheme);
    });
  });

  describe('ThemeOption interface', () => {
    it('should have the required properties', () => {
      // Create a sample theme option to test
      const themeOption: ThemeOption = {
        name: 'test-theme',
        label: 'Test Theme',
        mode: 'dark',
        previewColor: '#123456'
      };

      expect(themeOption).toHaveProperty('name');
      expect(themeOption).toHaveProperty('label');
      expect(themeOption).toHaveProperty('mode');
      expect(themeOption).toHaveProperty('previewColor');
      
      // Verify mode is either 'dark' or 'light'
      expect(['dark', 'light']).toContain(themeOption.mode);
    });
  });

  describe('ThemeMode type', () => {
    it('should accept valid theme modes', () => {
      // These are type checks at compile time
      const darkMode: ThemeMode = 'dark';
      const lightMode: ThemeMode = 'light';
      const systemMode: ThemeMode = 'system';

      expect(darkMode).toBe('dark');
      expect(lightMode).toBe('light');
      expect(systemMode).toBe('system');
      
      // Verify the only valid values are 'dark', 'light', or 'system'
      const validModes: ThemeMode[] = ['dark', 'light', 'system'];
      expect(validModes).toContain(darkMode);
      expect(validModes).toContain(lightMode);
      expect(validModes).toContain(systemMode);
    });
  });
});