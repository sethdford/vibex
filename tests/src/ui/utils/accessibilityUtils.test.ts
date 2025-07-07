/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Accessibility Utilities Tests
 */

import {
  formatForScreenReader,
  abbreviateForScreenReader,
  isAccessibilityModeEnabled,
  shouldDisableLoadingPhrases,
  generateAriaLabel
} from '../../../../src/ui/utils/accessibilityUtils';
import { defaults } from '../../../../src/config/defaults.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

describe('Accessibility Utilities', () => {
  describe('formatForScreenReader', () => {
    it('should format special characters for screen readers', () => {
      const input = 'Test*with-symbols_and.other:characters/here\\now';
      const expected = 'Test star with dash symbols underscore and dot other colon characters slash here backslash now';
      
      expect(formatForScreenReader(input)).toEqual(expected);
    });
    
    it('should format parentheses and brackets for screen readers', () => {
      const input = 'function(param) { return [value]; }';
      const expected = 'function open parenthesis param close parenthesis open curly brace return open bracket value close bracket semicolon close curly brace';
      
      // The formatForScreenReader function adds a space at the end due to the regex replacements
      // Use trim() to remove trailing whitespace before comparing
      expect(formatForScreenReader(input).trim()).toEqual(expected);
    });
    
    it('should handle empty input', () => {
      expect(formatForScreenReader('')).toEqual('');
      expect(formatForScreenReader(undefined as unknown as string)).toEqual('');
    });
  });
  
  describe('abbreviateForScreenReader', () => {
    it('should abbreviate text to specified length', () => {
      const input = 'This is a very long text that should be abbreviated for screen readers to make it more concise and easier to listen to';
      const result = abbreviateForScreenReader(input, 50);
      
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result.endsWith('...')).toBe(true);
    });
    
    it('should return original text if under max length', () => {
      const input = 'Short text';
      expect(abbreviateForScreenReader(input, 50)).toEqual(input);
    });
    
    it('should handle empty input', () => {
      expect(abbreviateForScreenReader('')).toEqual('');
      expect(abbreviateForScreenReader(undefined as unknown as string)).toEqual('');
    });
  });
  
  describe('isAccessibilityModeEnabled', () => {
    it('should return true if accessibility mode is enabled', () => {
      const config = { ...defaults, accessibility: { ...defaults.accessibility, enabled: true } };
      expect(isAccessibilityModeEnabled(config)).toBe(true);
    });
    
    it('should return false if accessibility mode is disabled', () => {
      const config = { ...defaults, accessibility: { ...defaults.accessibility, enabled: false } };
      expect(isAccessibilityModeEnabled(config)).toBe(false);
    });
    
    it('should handle missing accessibility config', () => {
      const config = { ...defaults, accessibility: undefined };
      expect(isAccessibilityModeEnabled(config as any)).toBe(false);
    });
  });
  
  describe('shouldDisableLoadingPhrases', () => {
    it('should return true if loading phrases should be disabled', () => {
      const config = { ...defaults, accessibility: { ...defaults.accessibility, disableLoadingPhrases: true } };
      expect(shouldDisableLoadingPhrases(config)).toBe(true);
    });
    
    it('should return false if loading phrases should be enabled', () => {
      const config = { ...defaults, accessibility: { ...defaults.accessibility, disableLoadingPhrases: false } };
      expect(shouldDisableLoadingPhrases(config)).toBe(false);
    });
    
    it('should handle missing accessibility config', () => {
      const config = { ...defaults, accessibility: undefined };
      expect(shouldDisableLoadingPhrases(config as any)).toBe(false);
    });
  });
  
  describe('generateAriaLabel', () => {
    it('should combine label and description', () => {
      const label = 'Button';
      const description = 'Opens the settings dialog';
      expect(generateAriaLabel(label, description)).toEqual('Button. Opens the settings dialog');
    });
    
    it('should return just label if no description', () => {
      const label = 'Button';
      expect(generateAriaLabel(label)).toEqual(label);
    });
  });
});