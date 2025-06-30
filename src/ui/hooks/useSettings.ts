/**
 * Settings Hook
 * 
 * Custom hook for managing user settings with persistence
 */

import { useState, useCallback, useEffect } from 'react';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../../utils/logger.js';
import { appConfigSchema, AppConfigType } from '../../config/schema.js';
import { SettingDefinition } from '../components/SettingsDialog';

/**
 * Settings hook return type
 */
interface UseSettingsResult {
  /**
   * Current settings
   */
  settings: Record<string, any>;
  
  /**
   * Settings definitions with metadata
   */
  settingDefinitions: SettingDefinition[];
  
  /**
   * Save a setting
   */
  saveSetting: (key: string, value: any) => void;
  
  /**
   * Save all settings
   */
  saveAllSettings: () => Promise<void>;
  
  /**
   * Reset settings to defaults
   */
  resetToDefaults: () => void;
  
  /**
   * Whether settings are currently loading
   */
  isLoading: boolean;
  
  /**
   * Any error that occurred during loading/saving
   */
  error: string | null;
}

/**
 * User settings file path
 */
const USER_SETTINGS_PATH = path.join(os.homedir(), '.claude-code', 'settings.json');

/**
 * Settings hook for managing user settings
 */
export function useSettings(
  initialSettings: Record<string, any> = {},
  configSchema = appConfigSchema
): UseSettingsResult {
  // Settings state
  const [settings, setSettings] = useState<Record<string, any>>(initialSettings);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Generate settings definitions from schema
  const settingDefinitions = generateSettingDefinitions(configSchema);
  
  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);
  
  // Load settings from file
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // If settings file exists, load it
      if (existsSync(USER_SETTINGS_PATH)) {
        const content = await fs.readFile(USER_SETTINGS_PATH, 'utf-8');
        const userSettings = JSON.parse(content);
        
        // Merge with initial settings
        setSettings({
          ...initialSettings,
          ...userSettings
        });
        
        logger.debug('Settings loaded from', USER_SETTINGS_PATH);
      } else {
        // Use initial settings
        setSettings(initialSettings);
        logger.debug('No settings file found, using defaults');
      }
    } catch (err) {
      const errorMessage = `Failed to load settings: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMessage);
      logger.error(errorMessage);
      
      // Fall back to initial settings
      setSettings(initialSettings);
    } finally {
      setIsLoading(false);
    }
  }, [initialSettings]);
  
  // Save a single setting
  const saveSetting = useCallback((key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // We don't await this to avoid blocking
    saveSettingsToFile({
      ...settings,
      [key]: value
    }).catch(err => {
      const errorMessage = `Failed to save setting: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMessage);
      logger.error(errorMessage);
    });
  }, [settings]);
  
  // Save all settings
  const saveAllSettings = useCallback(async () => {
    try {
      await saveSettingsToFile(settings);
      logger.debug('All settings saved');
    } catch (err) {
      const errorMessage = `Failed to save all settings: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMessage);
      logger.error(errorMessage);
      throw err;
    }
  }, [settings]);
  
  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSettings(initialSettings);
    
    // We don't await this to avoid blocking
    saveSettingsToFile(initialSettings).catch(err => {
      const errorMessage = `Failed to save default settings: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMessage);
      logger.error(errorMessage);
    });
  }, [initialSettings]);
  
  return {
    settings,
    settingDefinitions,
    saveSetting,
    saveAllSettings,
    resetToDefaults,
    isLoading,
    error
  };
}

/**
 * Save settings to file
 */
async function saveSettingsToFile(settings: Record<string, any>): Promise<void> {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(USER_SETTINGS_PATH), { recursive: true });
    
    // Write settings file
    await fs.writeFile(
      USER_SETTINGS_PATH,
      JSON.stringify(settings, null, 2),
      'utf-8'
    );
  } catch (err) {
    logger.error('Failed to save settings file:', err);
    throw err;
  }
}

/**
 * Generate setting definitions from schema
 */
function generateSettingDefinitions(schema: any): SettingDefinition[] {
  const definitions: SettingDefinition[] = [];
  
  // Process terminal settings
  if (schema.shape?.terminal) {
    const terminalSchema = schema.shape.terminal;
    
    // Theme setting
    if (terminalSchema.shape?.theme) {
      definitions.push({
        key: 'terminal.theme',
        label: 'Terminal Theme',
        description: 'Color theme for the terminal interface',
        type: 'select',
        value: 'system',
        default: 'system',
        options: [
          { label: 'Light', value: 'light' },
          { label: 'Dark', value: 'dark' },
          { label: 'System', value: 'system' }
        ],
        category: 'Terminal'
      });
    }
    
    // Use colors setting
    if (terminalSchema.shape?.useColors) {
      definitions.push({
        key: 'terminal.useColors',
        label: 'Use Colors',
        description: 'Enable colored output in the terminal',
        type: 'boolean',
        value: true,
        default: true,
        category: 'Terminal'
      });
    }
    
    // Show progress indicators setting
    if (terminalSchema.shape?.showProgressIndicators) {
      definitions.push({
        key: 'terminal.showProgressIndicators',
        label: 'Show Progress Indicators',
        description: 'Show loading and progress indicators',
        type: 'boolean',
        value: true,
        default: true,
        category: 'Terminal'
      });
    }
    
    // Code highlighting setting
    if (terminalSchema.shape?.codeHighlighting) {
      definitions.push({
        key: 'terminal.codeHighlighting',
        label: 'Code Highlighting',
        description: 'Enable syntax highlighting for code blocks',
        type: 'boolean',
        value: true,
        default: true,
        category: 'Terminal'
      });
    }
    
    // Add streaming text speed setting
    definitions.push({
      key: 'terminal.streamingSpeed',
      label: 'Streaming Speed',
      description: 'Characters per second for streaming text',
      type: 'number',
      value: 40,
      default: 40,
      category: 'Terminal'
    });
  }
  
  // Process AI settings
  if (schema.shape?.ai) {
    const aiSchema = schema.shape.ai;
    
    // Model setting
    if (aiSchema.shape?.model) {
      definitions.push({
        key: 'ai.model',
        label: 'AI Model',
        description: 'Claude model to use for responses',
        type: 'string',
        value: 'claude-3-5-sonnet-20241022',
        default: 'claude-3-5-sonnet-20241022',
        category: 'AI'
      });
    }
    
    // Temperature setting
    if (aiSchema.shape?.temperature) {
      definitions.push({
        key: 'ai.temperature',
        label: 'Temperature',
        description: 'Randomness of AI responses (0-1)',
        type: 'number',
        value: 0.5,
        default: 0.5,
        category: 'AI'
      });
    }
    
    // Max tokens setting
    if (aiSchema.shape?.maxTokens) {
      definitions.push({
        key: 'ai.maxTokens',
        label: 'Max Tokens',
        description: 'Maximum tokens in AI response',
        type: 'number',
        value: 4096,
        default: 4096,
        category: 'AI'
      });
    }
  }
  
  // Add accessibility settings
  definitions.push({
    key: 'accessibility.disableLoadingPhrases',
    label: 'Disable Loading Phrases',
    description: 'Disable random phrases during loading (better for screen readers)',
    type: 'boolean',
    value: false,
    default: false,
    category: 'Accessibility'
  });
  
  // Debug settings
  definitions.push({
    key: 'debug',
    label: 'Debug Mode',
    description: 'Enable debug logging and features',
    type: 'boolean',
    value: false,
    default: false,
    category: 'Developer'
  });
  
  return definitions;
}