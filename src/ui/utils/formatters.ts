/**
 * UI Formatters
 * 
 * This module provides formatting utilities for UI elements.
 * It handles text formatting, date formatting, and other display transformations.
 */

import stripAnsi from 'strip-ansi';
import stringWidth from 'string-width';

/**
 * Truncate text to a maximum length with ellipsis
 * 
 * @param text - The text to truncate
 * @param maxLength - Maximum length of the truncated text
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  
  if (stringWidth(text) <= maxLength) {
    return text;
  }
  
  // Account for the ellipsis in the max length
  const targetLength = maxLength - 3;
  let result = '';
  let currentWidth = 0;
  
  // Add characters until we reach the target length
  for (const char of text) {
    const charWidth = stringWidth(char);
    if (currentWidth + charWidth > targetLength) {
      break;
    }
    result += char;
    currentWidth += charWidth;
  }
  
  return result + '...';
}

/**
 * Format a date as a human-readable string
 * 
 * @param date - Date to format
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(date: Date | number, options: {
  includeTime?: boolean;
  relative?: boolean;
} = {}): string {
  const dateObj = typeof date === 'number' ? new Date(date) : date;
  
  if (options.relative) {
    return formatRelativeTime(dateObj);
  }
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (options.includeTime) {
    dateOptions.hour = '2-digit';
    dateOptions.minute = '2-digit';
  }
  
  return new Intl.DateTimeFormat('en-US', dateOptions).format(dateObj);
}

/**
 * Format a date as a relative time string (e.g., "2 minutes ago")
 * 
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else {
    return formatDate(date);
  }
}

/**
 * Format a number with commas for thousands
 * 
 * @param value - Number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Format a byte count as a human-readable size
 * 
 * @param bytes - Byte count
 * @param decimals - Number of decimal places
 * @returns Human-readable size string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format a duration in milliseconds as a human-readable string
 * 
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
}

/**
 * Remove ANSI escape codes from text
 * 
 * @param text - Text with ANSI codes
 * @returns Clean text without ANSI codes
 */
export function removeAnsiCodes(text: string): string {
  return stripAnsi(text);
}

/**
 * Measure the visual width of a string, accounting for ANSI codes and multi-byte characters
 * 
 * @param text - Text to measure
 * @returns Visual width of the text
 */
export function measureTextWidth(text: string): number {
  return stringWidth(text);
}

/**
 * Split text into lines that fit within a maximum width
 * 
 * @param text - Text to wrap
 * @param maxWidth - Maximum width of each line
 * @returns Array of wrapped lines
 */
export function wrapText(text: string, maxWidth: number): string[] {
  if (!text) return [];
  
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }
    
    const words = paragraph.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (measureTextWidth(testLine) <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}

/**
 * Format tokens as a human-readable string
 * 
 * @param count - Token count
 * @returns Formatted token count string
 */
export function formatTokens(count: number): string {
  return count.toLocaleString();
}

/**
 * Format cost as a human-readable string
 * 
 * @param cost - Cost in dollars
 * @returns Formatted cost string
 */
export function formatCost(cost: number): string {
  return cost < 0.01 && cost > 0
    ? `<$0.01`
    : `$${cost.toFixed(2)}`;
}