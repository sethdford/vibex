/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Clipboard Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useClipboard } from '../../../../src/ui/hooks/useClipboard.js';
import clipboard from 'clipboardy';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock clipboardy
vi.mock('clipboardy', () => ({
  default: {
    write: vi.fn(),
    read: vi.fn()
  },
  write: vi.fn(),
  read: vi.fn()
}));

// Mock logger
vi.mock('../../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn()
  }
}));

describe('useClipboard Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should copy text to clipboard successfully', async () => {
    // Set up the mock
    (clipboard.write as jest.Mock).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useClipboard());
    
    // Initial state
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.lastCopiedText).toBeNull();
    
    // Copy text
    let success;
    await act(async () => {
      success = await result.current.copyToClipboard('Hello, world!');
    });
    
    // Assert results
    expect(success).toBe(true);
    expect(clipboard.write).toHaveBeenCalledWith('Hello, world!');
    expect(result.current.error).toBeNull();
    expect(result.current.lastCopiedText).toBe('Hello, world!');
    expect(result.current.isLoading).toBe(false);
  });
  
  it('should handle copy failures', async () => {
    // Set up the mock to simulate failure
    (clipboard.write as jest.Mock).mockRejectedValue(new Error('Permission denied'));
    
    const { result } = renderHook(() => useClipboard());
    
    // Copy text
    let success;
    await act(async () => {
      success = await result.current.copyToClipboard('Test text');
    });
    
    // Assert results
    expect(success).toBe(false);
    expect(clipboard.write).toHaveBeenCalledWith('Test text');
    expect(result.current.error).toContain('Permission denied');
    expect(result.current.lastCopiedText).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
  
  it('should paste from clipboard successfully', async () => {
    // Set up the mock
    (clipboard.read as jest.Mock).mockResolvedValue('Pasted text');
    
    const { result } = renderHook(() => useClipboard());
    
    // Paste text
    let pastedText;
    await act(async () => {
      pastedText = await result.current.pasteFromClipboard();
    });
    
    // Assert results
    expect(pastedText).toBe('Pasted text');
    expect(clipboard.read).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
  
  it('should handle paste failures', async () => {
    // Set up the mock to simulate failure
    (clipboard.read as jest.Mock).mockRejectedValue(new Error('Access denied'));
    
    const { result } = renderHook(() => useClipboard());
    
    // Paste text
    let pastedText;
    await act(async () => {
      pastedText = await result.current.pasteFromClipboard();
    });
    
    // Assert results
    expect(pastedText).toBe('');
    expect(clipboard.read).toHaveBeenCalled();
    expect(result.current.error).toContain('Access denied');
    expect(result.current.isLoading).toBe(false);
  });
  
  it('should clear clipboard successfully', async () => {
    // Set up the mock
    (clipboard.write as jest.Mock).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useClipboard());
    
    // First copy something
    await act(async () => {
      await result.current.copyToClipboard('Test text');
    });
    
    expect(result.current.lastCopiedText).toBe('Test text');
    
    // Then clear it
    let success;
    await act(async () => {
      success = await result.current.clearClipboard();
    });
    
    // Assert results
    expect(success).toBe(true);
    expect(clipboard.write).toHaveBeenLastCalledWith('');
    expect(result.current.error).toBeNull();
    expect(result.current.lastCopiedText).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});