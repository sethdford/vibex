/**
 * Clipboard Service
 * 
 * Handles clipboard operations with proper error handling
 * Following Gemini CLI patterns - single responsibility, clean interfaces
 */

import { logger } from '../utils/logger.js';

export interface ClipboardService {
  copyToClipboard(text: string): Promise<boolean>;
  readFromClipboard(): Promise<string | null>;
}

class ClipboardServiceImpl implements ClipboardService {
  
  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    if (!text || text.trim() === '') {
      logger.error('Cannot copy empty text to clipboard');
      return false;
    }

    try {
      // Try using navigator.clipboard if available (browser/Electron)
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        logger.debug('Text copied to clipboard using navigator.clipboard');
        return true;
      }

      // Fallback for Node.js environments
      const { spawn } = await import('child_process');
      
      // Platform-specific clipboard commands
      const platform = process.platform;
      let command: string;
      let args: string[];

      switch (platform) {
        case 'darwin': // macOS
          command = 'pbcopy';
          args = [];
          break;
        case 'linux':
          command = 'xclip';
          args = ['-selection', 'clipboard'];
          break;
        case 'win32': // Windows
          command = 'clip';
          args = [];
          break;
        default:
          logger.error(`Clipboard not supported on platform: ${platform}`);
          return false;
      }

      return new Promise((resolve) => {
        const proc = spawn(command, args);
        
        proc.stdin.write(text);
        proc.stdin.end();
        
        proc.on('close', (code) => {
          if (code === 0) {
            logger.debug(`Text copied to clipboard using ${command}`);
            resolve(true);
          } else {
            logger.error(`Clipboard command failed with code: ${code}`);
            resolve(false);
          }
        });
        
        proc.on('error', (error) => {
          logger.error('Clipboard operation failed', error);
          resolve(false);
        });
      });
      
    } catch (error) {
      logger.error('Failed to copy to clipboard', error);
      return false;
    }
  }

  /**
   * Read text from clipboard
   */
  async readFromClipboard(): Promise<string | null> {
    try {
      // Try using navigator.clipboard if available (browser/Electron)
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        logger.debug('Text read from clipboard using navigator.clipboard');
        return text;
      }

      // Fallback for Node.js environments
      const { spawn } = await import('child_process');
      
      // Platform-specific clipboard commands
      const platform = process.platform;
      let command: string;
      let args: string[];

      switch (platform) {
        case 'darwin': // macOS
          command = 'pbpaste';
          args = [];
          break;
        case 'linux':
          command = 'xclip';
          args = ['-selection', 'clipboard', '-o'];
          break;
        case 'win32': // Windows
          command = 'powershell';
          args = ['-command', 'Get-Clipboard'];
          break;
        default:
          logger.error(`Clipboard not supported on platform: ${platform}`);
          return null;
      }

      return new Promise((resolve) => {
        const proc = spawn(command, args);
        let output = '';
        
        proc.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        proc.on('close', (code) => {
          if (code === 0) {
            logger.debug(`Text read from clipboard using ${command}`);
            resolve(output.trim());
          } else {
            logger.error(`Clipboard read command failed with code: ${code}`);
            resolve(null);
          }
        });
        
        proc.on('error', (error) => {
          logger.error('Clipboard read operation failed', error);
          resolve(null);
        });
      });
      
    } catch (error) {
      logger.error('Failed to read from clipboard', error);
      return null;
    }
  }
}

// Export singleton instance
export const clipboardService: ClipboardService = new ClipboardServiceImpl(); 