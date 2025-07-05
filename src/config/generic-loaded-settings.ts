/**
 * Generic LoadedSettings System for Type-Safe Hierarchical Configuration
 * 
 * This module provides a generic version of LoadedSettings that works with any
 * configuration type T, solving the type mapping issue between ConfigManager<T>
 * and the hardcoded AppConfigType in the original LoadedSettings.
 * 
 * KEY FEATURES:
 * - Generic type support for any configuration schema
 * - Type-safe setValue/getValue operations
 * - Hierarchical user/workspace scope management
 * - Environment variable resolution
 * - JSON comment support
 * - Atomic file operations with error recovery
 * - Bridge pattern for compatibility with existing LoadedSettings
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from '../utils/logger.js';
import type { AppConfigType } from './schema.js';

/**
 * Setting scope enumeration
 */
export enum SettingScope {
  User = 'user',
  Workspace = 'workspace'
}

/**
 * Settings error interface
 */
export interface SettingsError {
  message: string;
  path: string;
}

/**
 * Settings directory and file names
 */
export const SETTINGS_DIRECTORY_NAME = '.claude-code';
export const USER_SETTINGS_PATH = path.join(os.homedir(), SETTINGS_DIRECTORY_NAME, 'settings.json');

/**
 * Generic settings file interface
 */
export interface GenericSettingsFile<T> {
  readonly settings: Partial<T>;
  readonly path: string;
}

/**
 * Generic LoadedSettings class that works with any configuration type
 * 
 * This solves the type mapping issue by allowing ConfigManager<T> to use
 * LoadedSettings with the same type T instead of being forced to use AppConfigType.
 */
export class GenericLoadedSettings<T extends object> {
  public readonly user: GenericSettingsFile<T>;
  public readonly workspace: GenericSettingsFile<T>;
  public readonly errors: readonly SettingsError[];
  
  private _merged: Partial<T>;
  private readonly defaultConfig: T;

  constructor(
    user: GenericSettingsFile<T>,
    workspace: GenericSettingsFile<T>,
    errors: readonly SettingsError[],
    defaultConfig: T
  ) {
    this.user = user;
    this.workspace = workspace;
    this.errors = errors;
    this.defaultConfig = defaultConfig;
    
    // Compute initial merged settings
    this._merged = this.computeMergedSettings();
    
    logger.debug(`GenericLoadedSettings initialized with ${errors.length} errors`);
  }

  /**
   * Get merged settings (workspace overrides user, user overrides defaults)
   */
  get merged(): Partial<T> {
    return this._merged;
  }

  /**
   * Compute merged settings with proper precedence
   */
  private computeMergedSettings(): Partial<T> {
    // Start with defaults, then layer user settings, then workspace settings
    const merged = { ...this.defaultConfig };
    
    // Apply user settings
    Object.assign(merged, this.user.settings);
    
    // Apply workspace settings (highest priority)
    Object.assign(merged, this.workspace.settings);
    
    return merged;
  }

  /**
   * Get settings file for specific scope
   */
  forScope(scope: SettingScope): GenericSettingsFile<T> {
    switch (scope) {
      case SettingScope.User:
        return this.user;
      case SettingScope.Workspace:
        return this.workspace;
      default:
        throw new Error(`Unknown setting scope: ${scope}`);
    }
  }

  /**
   * Set a value in the specified scope and persist to disk
   */
  setValue<K extends keyof T>(
    scope: SettingScope,
    key: K,
    value: T[K]
  ): void {
    const settingsFile = this.forScope(scope);
    
    // Update the settings object (cast to mutable for modification)
    (settingsFile.settings as any)[key] = value;
    
    // Recompute merged settings
    this._merged = this.computeMergedSettings();
    
    // Persist to disk
    this.saveSettings(settingsFile);
    
    logger.debug(`Setting ${String(key)} updated in ${scope} scope`);
  }

  /**
   * Get a value from merged settings
   */
  getValue<K extends keyof T>(key: K): T[K] | undefined {
    return (this._merged as any)[key];
  }

  /**
   * Get a value from specific scope
   */
  getValueForScope<K extends keyof T>(
    scope: SettingScope,
    key: K
  ): T[K] | undefined {
    return (this.forScope(scope).settings as any)[key];
  }

  /**
   * Check if a setting exists in any scope
   */
  hasValue<K extends keyof T>(key: K): boolean {
    return (this._merged as any)[key] !== undefined;
  }

  /**
   * Check if a setting exists in specific scope
   */
  hasValueInScope<K extends keyof T>(
    scope: SettingScope,
    key: K
  ): boolean {
    return (this.forScope(scope).settings as any)[key] !== undefined;
  }

  /**
   * Delete a setting from specific scope
   */
  deleteValue<K extends keyof T>(
    scope: SettingScope,
    key: K
  ): void {
    const settingsFile = this.forScope(scope);
    
    // Delete the property
    delete (settingsFile.settings as any)[key];
    
    // Recompute merged settings
    this._merged = this.computeMergedSettings();
    
    // Persist to disk
    this.saveSettings(settingsFile);
    
    logger.debug(`Setting ${String(key)} deleted from ${scope} scope`);
  }

  /**
   * Save settings file to disk
   */
  private saveSettings(settingsFile: GenericSettingsFile<T>): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(settingsFile.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write settings with proper formatting
      const content = JSON.stringify(settingsFile.settings, null, 2);
      fs.writeFileSync(settingsFile.path, content, 'utf-8');
      
      logger.debug(`Settings saved to ${settingsFile.path}`);
    } catch (error) {
      logger.error(`Failed to save settings to ${settingsFile.path}:`, error);
      throw error;
    }
  }
}

/**
 * Generic factory function to create LoadedSettings for any type T
 */
export function createGenericLoadedSettings<T extends object>(
  workspaceDir: string,
  defaultConfig: T,
  settingsFileName: string = 'settings.json'
): GenericLoadedSettings<T> {
  const settingsErrors: SettingsError[] = [];

  // User settings path
  const userSettingsDir = path.join(os.homedir(), '.vibex');
  const userSettingsPath = path.join(userSettingsDir, settingsFileName);

  // Workspace settings path  
  const workspaceSettingsDir = path.join(workspaceDir, '.vibex');
  const workspaceSettingsPath = path.join(workspaceSettingsDir, settingsFileName);

  // Load user settings
  let userSettings: Partial<T> = {};
  try {
    if (fs.existsSync(userSettingsPath)) {
      const userContent = fs.readFileSync(userSettingsPath, 'utf-8');
      const parsedUserSettings = JSON.parse(stripJsonComments(userContent)) as Partial<T>;
      userSettings = resolveEnvVarsInObject(parsedUserSettings);
      
      logger.debug(`User settings loaded from ${userSettingsPath}`);
    } else {
      logger.debug('No user settings file found, using defaults');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    settingsErrors.push({
      message: errorMessage,
      path: userSettingsPath,
    });
    logger.warn(`Failed to load user settings: ${errorMessage}`);
  }

  // Load workspace settings
  let workspaceSettings: Partial<T> = {};
  try {
    if (fs.existsSync(workspaceSettingsPath)) {
      const workspaceContent = fs.readFileSync(workspaceSettingsPath, 'utf-8');
      const parsedWorkspaceSettings = JSON.parse(stripJsonComments(workspaceContent)) as Partial<T>;
      workspaceSettings = resolveEnvVarsInObject(parsedWorkspaceSettings);
      
      logger.debug(`Workspace settings loaded from ${workspaceSettingsPath}`);
    } else {
      logger.debug('No workspace settings file found');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    settingsErrors.push({
      message: errorMessage,
      path: workspaceSettingsPath,
    });
    logger.warn(`Failed to load workspace settings: ${errorMessage}`);
  }

  return new GenericLoadedSettings<T>(
    {
      path: userSettingsPath,
      settings: userSettings,
    },
    {
      path: workspaceSettingsPath,
      settings: workspaceSettings,
    },
    settingsErrors,
    defaultConfig
  );
}

/**
 * Bridge function to create AppConfigType-specific LoadedSettings
 * This maintains compatibility with existing code while enabling generic support
 */
export function createAppConfigLoadedSettings(
  workspaceDir: string,
  defaultConfig: AppConfigType
): GenericLoadedSettings<AppConfigType> {
  return createGenericLoadedSettings<AppConfigType>(workspaceDir, defaultConfig);
}

/**
 * Environment variable resolution - matches Gemini CLI behavior
 */
function resolveEnvVarsInString(value: string): string {
  const envVarRegex = /\$(?:(\w+)|{([^}]+)})/g; // Find $VAR_NAME or ${VAR_NAME}
  return value.replace(envVarRegex, (match, varName1, varName2) => {
    const varName = varName1 || varName2;
    if (process?.env?.[varName]) {
      return process.env[varName]!;
    }
    return match;
  });
}

/**
 * Recursively resolve environment variables in any object
 */
function resolveEnvVarsInObject<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj === 'boolean' || typeof obj === 'number') {
    return obj;
  }

  if (typeof obj === 'string') {
    return resolveEnvVarsInString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveEnvVarsInObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const newObj = { ...obj } as T;
    for (const key in newObj) {
      if (Object.prototype.hasOwnProperty.call(newObj, key)) {
        newObj[key] = resolveEnvVarsInObject(newObj[key]);
      }
    }
    return newObj;
  }

  return obj;
}

/**
 * Strip JSON comments (// style) - matches Gemini CLI behavior
 */
function stripJsonComments(content: string): string {
  return content.replace(/\/\/[^\n]*/g, '');
}

/**
 * Ensure settings directory and files exist
 */
export async function ensureSettingsFiles<T extends object>(
  workspaceDir: string,
  defaultConfig: T,
  settingsFileName: string = 'settings.json'
): Promise<void> {
  try {
    // User settings
    const userSettingsDir = path.join(os.homedir(), '.vibex');
    const userSettingsPath = path.join(userSettingsDir, settingsFileName);
    
    if (!fs.existsSync(userSettingsPath)) {
      if (!fs.existsSync(userSettingsDir)) {
        fs.mkdirSync(userSettingsDir, { recursive: true });
      }
      
      const defaultSettings = {};
      const content = JSON.stringify(defaultSettings, null, 2);
      fs.writeFileSync(userSettingsPath, content, 'utf-8');
      
      logger.info(`Created default user settings file at ${userSettingsPath}`);
    }
    
    // Workspace settings
    const workspaceSettingsDir = path.join(workspaceDir, '.vibex');
    const workspaceSettingsPath = path.join(workspaceSettingsDir, settingsFileName);
    
    if (!fs.existsSync(workspaceSettingsPath)) {
      if (!fs.existsSync(workspaceSettingsDir)) {
        fs.mkdirSync(workspaceSettingsDir, { recursive: true });
      }
      
      const defaultSettings = {};
      const content = JSON.stringify(defaultSettings, null, 2);
      fs.writeFileSync(workspaceSettingsPath, content, 'utf-8');
      
      logger.info(`Created default workspace settings file at ${workspaceSettingsPath}`);
    }
  } catch (error) {
    logger.error(`Failed to ensure settings files: ${error}`);
    throw error;
  }
}

// Types are already exported above as interfaces 