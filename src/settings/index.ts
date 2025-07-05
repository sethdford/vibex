/**
 * Settings management system for VibeX
 * 
 * Provides functionality to manage user settings and preferences
 * in a persistent way across sessions
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';

// Settings file path
const SETTINGS_DIR = path.join(os.homedir(), '.vibex');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

// Default settings values
const DEFAULT_SETTINGS = {
  terminal: {
    theme: 'dark',
    showTimestamps: true,
    compactView: false,
  },
  ai: {
    model: 'claude-3-opus',
    temperature: 0.7,
    systemPrompt: '',
    enableBetaFeatures: false,
  },
  memory: {
    contextFiles: ['VIBEX.md', 'GEMINI.md', 'CLAUDE.md'],
    maxRetention: 100, // number of messages to keep in memory
  },
  updates: {
    checkAutomatically: true,
    checkInterval: 24, // hours
  },
  performance: {
    showMetrics: false,
    tokenCounting: true,
    showMemoryUsage: false,
  },
};

export type SettingsSchema = typeof DEFAULT_SETTINGS;

/**
 * Ensures the settings directory exists
 */
async function ensureSettingsDir(): Promise<void> {
  try {
    await fs.mkdir(SETTINGS_DIR, { recursive: true });
  } catch (error) {
    logger.error(`Failed to create settings directory: ${error}`);
    throw error;
  }
}

/**
 * Load user settings from disk
 */
export async function loadSettings(): Promise<SettingsSchema> {
  try {
    await ensureSettingsDir();
    
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
      const userSettings = JSON.parse(data);
      
      // Deep merge with defaults to ensure all properties exist
      return deepMerge(DEFAULT_SETTINGS, userSettings) as SettingsSchema;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Settings file doesn't exist yet, create with defaults
        await saveSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
      
      // Other error (e.g., JSON parsing)
      logger.warn(`Error loading settings, using defaults: ${error}`);
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    logger.error(`Failed to load settings: ${error}`);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to disk
 */
export async function saveSettings(settings: SettingsSchema): Promise<void> {
  try {
    await ensureSettingsDir();
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    logger.error(`Failed to save settings: ${error}`);
    throw error;
  }
}

/**
 * Get a specific setting value by path
 * @example getSetting('terminal.theme')
 */
export async function getSetting<T>(path: string, defaultValue?: T): Promise<T> {
  const settings = await loadSettings();
  const value = getValueByPath(settings, path);
  return value !== undefined ? value as T : (defaultValue as T);
}

/**
 * Update a specific setting value by path
 * @example updateSetting('terminal.theme', 'light')
 */
export async function updateSetting<T>(path: string, value: T): Promise<void> {
  const settings = await loadSettings();
  const updatedSettings = setValueByPath(settings as Record<string, unknown>, path, value);
  await saveSettings(updatedSettings as SettingsSchema);
}

/**
 * Reset all settings to defaults
 */
export async function resetSettings(): Promise<void> {
  await saveSettings(DEFAULT_SETTINGS);
}

/**
 * Reset a specific setting to its default value
 */
export async function resetSetting(path: string): Promise<void> {
  const defaultValue = getValueByPath(DEFAULT_SETTINGS, path);
  if (defaultValue !== undefined) {
    await updateSetting(path, defaultValue);
  }
}

// Utility functions

/**
 * Get a value from an object by dot-separated path
 */
function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  return keys.reduce((o: any, key) => (o && o[key] !== undefined ? o[key] : undefined), obj);
}

/**
 * Set a value in an object by dot-separated path
 */
function setValueByPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const result = { ...obj };
  const keys = path.split('.');
  
  let current: any = result;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Deep merge two objects
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
      result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}