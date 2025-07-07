/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Settings Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useSettings } from '../../../../src/ui/hooks/useSettings.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock fs modules
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn()
}));

// Mock logger
vi.mock('../../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  }
}));

describe('useSettings Hook', () => {
  const initialSettings = {
    'terminal.theme': 'dark',
    'terminal.useColors': true
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should initialize with default settings when no settings file exists', async () => {
    // Mock that the settings file does not exist
    (existsSync as jest.Mock).mockReturnValue(false);
    
    const { result } = renderHook(() => useSettings(initialSettings));
    
    // Initial state should show loading
    expect(result.current.isLoading).toBe(true);
    
    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
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
      'terminal.useColors': false
    };
    
    // Mock the file content
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(storedSettings));
    
    const { result } = renderHook(() => useSettings(initialSettings));
    
    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Settings should be loaded from file
    expect(result.current.settings).toEqual(storedSettings);
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
      await new Promise(resolve => setTimeout(resolve, 100));
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
  
  it('should handle error when reading settings file fails', async () => {
    // Mock that the settings file exists but reading fails
    (existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));
    
    const { result } = renderHook(() => useSettings(initialSettings));
    
    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Should fall back to initial settings
    expect(result.current.settings).toEqual(initialSettings);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toContain('Failed to load settings');
  });
  
  it('should reset settings to defaults', async () => {
    // Mock that the settings file exists
    (existsSync as jest.Mock).mockReturnValue(true);
    
    const storedSettings = {
      'terminal.theme': 'light',
      'terminal.useColors': false
    };
    
    // Mock the file content
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(storedSettings));
    
    const { result } = renderHook(() => useSettings(initialSettings));
    
    // Wait for async loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
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
});