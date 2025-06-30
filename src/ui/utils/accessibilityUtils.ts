/**
 * Accessibility Utilities
 * 
 * Helper functions for enhancing accessibility in the terminal UI
 */

/**
 * Format text for screen readers
 * 
 * Formats text to be more screen-reader friendly by:
 * - Replacing special characters with descriptions
 * - Adding appropriate spacing for better pronunciation
 * 
 * @param text - Text to format
 * @returns Formatted text
 */
export function formatForScreenReader(text: string): string {
  if (!text) return '';
  
  return text
    // Replace common symbols with text descriptions
    .replace(/\*/g, ' star ')
    .replace(/\-/g, ' dash ')
    .replace(/\_/g, ' underscore ')
    .replace(/\./g, ' dot ')
    .replace(/\:/g, ' colon ')
    .replace(/\;/g, ' semicolon ')
    .replace(/\//g, ' slash ')
    .replace(/\\/g, ' backslash ')
    // Add spaces around parentheses for better pronunciation
    .replace(/\(/g, ' open parenthesis ')
    .replace(/\)/g, ' close parenthesis ')
    .replace(/\[/g, ' open bracket ')
    .replace(/\]/g, ' close bracket ')
    .replace(/\{/g, ' open curly brace ')
    .replace(/\}/g, ' close curly brace ')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ');
}

/**
 * Abbreviate text for screen readers
 * 
 * Creates an abbreviated version of text that retains meaning but is shorter,
 * making it more suitable for screen readers in certain contexts.
 * 
 * @param text - Text to abbreviate
 * @param maxLength - Maximum length (defaults to 100)
 * @returns Abbreviated text
 */
export function abbreviateForScreenReader(text: string, maxLength: number = 100): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  // Create abbreviated version
  const words = text.split(' ');
  let result = '';
  let currentLength = 0;
  
  for (const word of words) {
    if (currentLength + word.length + 1 > maxLength - 3) {
      // We've reached the limit, add ellipsis and break
      result += '...';
      break;
    }
    
    result += (result ? ' ' : '') + word;
    currentLength += word.length + 1;
  }
  
  return result;
}

/**
 * Get accessibility mode from config
 * 
 * @param config - Application config
 * @returns True if accessibility mode is enabled
 */
export function isAccessibilityModeEnabled(config: any): boolean {
  return !!config?.accessibility?.enabled;
}

/**
 * Check if loading phrases should be disabled
 * 
 * @param config - Application config
 * @returns True if loading phrases should be disabled
 */
export function shouldDisableLoadingPhrases(config: any): boolean {
  return !!config?.accessibility?.disableLoadingPhrases;
}

/**
 * Generate ARIA label for UI element
 * 
 * @param labelText - Primary label text
 * @param description - Optional additional description
 * @returns Formatted ARIA label
 */
export function generateAriaLabel(labelText: string, description?: string): string {
  if (!description) return labelText;
  return `${labelText}. ${description}`;
}