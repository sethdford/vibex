/**
 * Code Highlighting Utility
 * 
 * Provides syntax highlighting for code blocks in the terminal UI.
 */

import { createLowlight, all } from 'lowlight';

// Create lowlight instance with all languages
const lowlight = createLowlight(all);

/**
 * Highlight code and return formatted lines
 */
export function highlightCode(code: string, language?: string): string[] {
  if (!code) {return [];}
  
  try {
    // If no language specified, return plain text lines
    if (!language) {
      return code.split('\n');
    }
    
    // Try to highlight with lowlight
    const result = lowlight.highlight(language, code);
    
    // Convert AST to plain text lines for now
    // In a full implementation, you'd convert the AST to colored text
    return code.split('\n');
    
  } catch (error) {
    // Fallback to plain text if highlighting fails
    return code.split('\n');
  }
}

/**
 * Get available languages for highlighting
 */
export function getAvailableLanguages(): string[] {
  return lowlight.listLanguages();
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): boolean {
  return lowlight.listLanguages().includes(language);
} 