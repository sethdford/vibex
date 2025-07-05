/**
 * Update Check Utility
 * 
 * Checks for updates to the Claude Code CLI.
 */

import fetch from 'node-fetch';
import { logger } from '../../utils/logger.js';

// Current version from package.json
const CURRENT_VERSION = '0.1.0';

// URL for version check
const VERSION_CHECK_URL = 'https://api.anthropic.com/v1/claude-code/version';

/**
 * Compare version strings
 * 
 * @param version1 - First version string (e.g., '0.1.0')
 * @param version2 - Second version string (e.g., '0.2.0')
 * @returns 1 if version1 > version2, -1 if version1 < version2, 0 if equal
 */
const compareVersions = (version1: string, version2: string): number => {
  const parts1 = version1.split('.').map(Number);
  const parts2 = version2.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) {return 1;}
    if (parts1[i] < parts2[i]) {return -1;}
  }
  
  return 0;
};

/**
 * Check for updates to Claude Code
 * 
 * @returns Message if update available, null otherwise
 */
export async function checkForUpdates(): Promise<string | null> {
  try {
    // Skip update check for development versions
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    // Perform version check with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 5000);
    
    const response = await fetch(VERSION_CHECK_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': `Claude-Code-CLI/${CURRENT_VERSION}`
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json() as { version: string };
    const latestVersion = data.version;
    
    // Compare versions to see if update is available
    if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
      return `Update available: ${latestVersion} (current: ${CURRENT_VERSION}). Run 'npm install -g @anthropic-ai/claude-code' to update.`;
    }
    
    return null;
  } catch (error) {
    // Log error but don't display to user
    logger.debug('Failed to check for updates', error);
    return null;
  }
}