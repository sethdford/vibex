/**
 * Settings Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useSettings } from '../../../src/ui/hooks/useSettings';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Mock fs modules
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn()
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock schema
const mockConfigSchema = {
  shape: {
    terminal: {
      shape: {
        theme: {},
        useColors: {},
        showProgressIndicators: {},
        codeHighlighting: {}
      }
    },
    ai: {
      shape: {
        model: {},
        temperature: {},
        maxTokens: {}
      }
    }
  }
};

// Mock appConfigSchema
jest.mock('../../../src/config/schema', () => ({
  appConfigSchema: {}
}));

describe('useSettings Hook', () => {
  const initialSettings = {
    'terminal.theme': 'dark',
    'terminal.useColors': true
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should initialize with default settings when no settings file exists', async () => {
    // Mock that the settings file does not exist
    (existsSync as jest.Mock).mockReturnValue(false);
    
    const { result } = renderHook(() => useSettings(initialSettings));
    
    // Initial state should show loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // After loading completes
    expect(result.current.isLoading).toBe(false);
    expect(result.current.settings).toEqual(initialSettings);
    expect(result.current.error).toBeNull();
  });
  
  it('should load settings from file when it exists', async () => {
    // Mock that the settings file exists
    (existsSync as jest.Mock).mockReturnValue(true);
    
    const storedSettings = {
      'terminal.theme': 'light',
      'terminal.useColors': false,
      'ai.model': 'claude-3-5-sonnet-20241022'
    };
    
    // Mock the file content
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(storedSettings));
    
    const { result } = renderHook(() => useSettings(initialSettings));
    
    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Settings should be loaded from file and merged with initial settings
    expect(result.current.settings).toEqual({
      ...initialSettings,
      ...storedSettings
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
  
  it('should update a setting and save it', async () => {
    // Mock that the settings file exists
    (existsSync as jest.Mock).mockReturnValue(true);
    
    // Mock the file content
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(initialSettings));
    
    const { result } = renderHook(() => useSettings(initialSettings));
    
    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Update a setting
    act(() => {
      result.current.saveSetting('terminal.theme', 'system');
    });
    
    // Check that the setting was updated
    expect(result.current.settings).toEqual({
      ...initialSettings,
      'terminal.theme': 'system'
    });
    
    // Check that writeFile was called
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('system'),
      'utf-8'
    );
  });
  
  it('should save all settings', async () => {
    // Mock that the settings file exists
    (existsSync as jest.Mock).mockReturnValue(true);
    
    // Mock the file content
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(initialSettings));
    
    const { result } = renderHook(() => useSettings(initialSettings));
    
    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Update multiple settings in memory
    act(() => {
      result.current.saveSetting('terminal.theme', 'light');
      result.current.saveSetting('ai.model', 'claude-3-5-sonnet-20241022');
    });
    
    // Clear writeFile mock to check only the saveAllSettings call
    (fs.writeFile as jest.Mock).mockClear();
    
    // Save all settings
    await act(async () => {
      await result.current.saveAllSettings();
    });
    
    // Check that writeFile was called with all settings
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('light'),
      'utf-8'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('claude-3-5-sonnet-20241022'),
      'utf-8'
    );
  });
  
  it('should handle error when reading settings file fails', async () => {
    // Mock that the settings file exists but reading fails
    (existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));
    
    const { result } = renderHook(() => useSettings(initialSettings));
    
    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Should fall back to initial settings
    expect(result.current.settings).toEqual(initialSettings);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toContain('Failed to load settings');
  });
  
  it('should handle error when saving settings fails', async () => {
    // Mock that the settings file exists
    (existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(initialSettings));
    
    // Mock writeFile to fail
    (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write error'));
    
    const { result } = renderHook(() => useSettings(initialSettings));
    
    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Update a setting
    act(() => {
      result.current.saveSetting('terminal.theme', 'system');
    });
    
    // Wait for async error handling to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Setting should still be updated in memory
    expect(result.current.settings).toEqual({
      ...initialSettings,
      'terminal.theme': 'system'
    });
    
    // But error should be set
    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toContain('Failed to save setting');
  });
  
  it('should reset settings to defaults', async () => {
    // Mock that the settings file exists
    (existsSync as jest.Mock).mockReturnValue(true);
    
    const storedSettings = {
      'terminal.theme': 'light',
      'terminal.useColors': false,
      'ai.model': 'claude-3-5-sonnet-20241022'
    };
    
    // Mock the file content
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(storedSettings));
    
    const { result } = renderHook(() => useSettings(initialSettings));
    
    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Reset to defaults
    act(() => {
      result.current.resetToDefaults();
    });
    
    // Check that settings were reset
    expect(result.current.settings).toEqual(initialSettings);
    
    // Check that writeFile was called with initial settings
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(initialSettings, null, 2),
      'utf-8'
    );
  });
  
  it('should generate setting definitions from schema', async () => {
    (existsSync as jest.Mock).mockReturnValue(false);
    
    const { result } = renderHook(() => useSettings(initialSettings, mockConfigSchema));
    
    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Check that definitions are generated
    expect(result.current.settingDefinitions).toBeInstanceOf(Array);
    expect(result.current.settingDefinitions.length).toBeGreaterThan(0);
  });
});