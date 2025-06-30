/**
 * Clipboard Utilities
 * 
 * Helper functions for clipboard operations
 */

import clipboard from 'clipboardy';
import { logger } from '../../utils/logger.js';

/**
 * Copy text to clipboard
 * 
 * @param text - Text to copy
 * @returns Promise resolving to success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await clipboard.write(text);
    logger.debug(`Copied ${text.length} characters to clipboard`);
    return true;
  } catch (err) {
    logger.error(`Failed to copy to clipboard: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * Read text from clipboard
 * 
 * @returns Promise resolving to clipboard content
 */
export async function readFromClipboard(): Promise<string> {
  try {
    const text = await clipboard.read();
    logger.debug(`Read ${text.length} characters from clipboard`);
    return text;
  } catch (err) {
    logger.error(`Failed to read from clipboard: ${err instanceof Error ? err.message : String(err)}`);
    return '';
  }
}

/**
 * Clear clipboard content
 * 
 * @returns Promise resolving to success status
 */
export async function clearClipboard(): Promise<boolean> {
  try {
    await clipboard.write('');
    logger.debug('Clipboard cleared');
    return true;
  } catch (err) {
    logger.error(`Failed to clear clipboard: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

/**
 * Format text for copying to clipboard
 * 
 * @param text - Text to format
 * @param removeAnsi - Whether to remove ANSI color codes
 * @returns Formatted text
 */
export function formatForClipboard(text: string, removeAnsi = true): string {
  let result = text;
  
  // Remove ANSI color codes if specified
  if (removeAnsi) {
    // Simple regex to remove common ANSI color codes
    result = result.replace(/\x1B\[\d+m/g, '');
  }
  
  // Normalize line endings to platform default
  result = result.replace(/\r\n|\r|\n/g, require('os').EOL);
  
  return result;
}