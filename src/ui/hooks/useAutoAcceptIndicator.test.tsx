/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Auto Accept Indicator Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useAutoAcceptIndicator } from '../../../src/ui/hooks/useAutoAcceptIndicator';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock the AppConfigType
const mockConfig = {
  tools: {
    autoAccept: true
  }
} as any;

describe('useAutoAcceptIndicator Hook', () => {
  // Setup for timers
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('initializes with hidden indicator by default', () => {
    const { result } = renderHook(() => useAutoAcceptIndicator(mockConfig, true));
    
    expect(result.current.showAutoAcceptIndicator).toBe(false);
  });

  it('shows indicator when requested if auto-accept is enabled', () => {
    const { result } = renderHook(() => useAutoAcceptIndicator(mockConfig, true));
    
    act(() => {
      result.current.showIndicator();
    });
    
    expect(result.current.showAutoAcceptIndicator).toBe(true);
  });

  it('does not show indicator when requested if auto-accept is disabled', () => {
    const { result } = renderHook(() => useAutoAcceptIndicator(mockConfig, false));
    
    act(() => {
      result.current.showIndicator();
    });
    
    expect(result.current.showAutoAcceptIndicator).toBe(false);
  });

  it('hides indicator when requested', () => {
    const { result } = renderHook(() => useAutoAcceptIndicator(mockConfig, true));
    
    // First show the indicator
    act(() => {
      result.current.showIndicator();
    });
    
    expect(result.current.showAutoAcceptIndicator).toBe(true);
    
    // Then hide it
    act(() => {
      result.current.hideIndicator();
    });
    
    expect(result.current.showAutoAcceptIndicator).toBe(false);
  });

  it('starts countdown when requested if auto-accept is enabled', () => {
    const onAutoAccept = vi.fn();
    const { result } = renderHook(() => useAutoAcceptIndicator(mockConfig, true));
    
    act(() => {
      result.current.startCountdown(onAutoAccept);
    });
    
    // Indicator should be shown immediately
    expect(result.current.showAutoAcceptIndicator).toBe(true);
    
    // Callback should not be called yet
    expect(onAutoAccept).not.toHaveBeenCalled();
    
    // Fast-forward 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    // Callback should be called after timeout
    expect(onAutoAccept).toHaveBeenCalled();
    
    // Indicator should be hidden after callback
    expect(result.current.showAutoAcceptIndicator).toBe(false);
  });

  it('does not start countdown when requested if auto-accept is disabled', () => {
    const onAutoAccept = vi.fn();
    const { result } = renderHook(() => useAutoAcceptIndicator(mockConfig, false));
    
    act(() => {
      result.current.startCountdown(onAutoAccept);
    });
    
    // Indicator should remain hidden
    expect(result.current.showAutoAcceptIndicator).toBe(false);
    
    // Fast-forward 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    // Callback should not be called
    expect(onAutoAccept).not.toHaveBeenCalled();
  });

  it('cancels countdown when requested', () => {
    const onAutoAccept = vi.fn();
    const { result } = renderHook(() => useAutoAcceptIndicator(mockConfig, true));
    
    act(() => {
      result.current.startCountdown(onAutoAccept);
    });
    
    // Indicator should be shown
    expect(result.current.showAutoAcceptIndicator).toBe(true);
    
    // Cancel the countdown
    act(() => {
      result.current.cancelCountdown();
    });
    
    // Indicator should be hidden
    expect(result.current.showAutoAcceptIndicator).toBe(false);
    
    // Fast-forward 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    // Callback should not be called because countdown was cancelled
    expect(onAutoAccept).not.toHaveBeenCalled();
  });

  it('clears timeout when starting a new countdown', () => {
    const onAutoAccept1 = vi.fn();
    const onAutoAccept2 = vi.fn();
    const { result } = renderHook(() => useAutoAcceptIndicator(mockConfig, true));
    
    // Start first countdown
    act(() => {
      result.current.startCountdown(onAutoAccept1);
    });
    
    // Start second countdown before first one completes
    act(() => {
      result.current.startCountdown(onAutoAccept2);
    });
    
    // Fast-forward 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    // Only the second callback should be called
    expect(onAutoAccept1).not.toHaveBeenCalled();
    expect(onAutoAccept2).toHaveBeenCalled();
  });

  it('cleans up timeout on unmount', () => {
    const onAutoAccept = vi.fn();
    const { result, unmount } = renderHook(() => useAutoAcceptIndicator(mockConfig, true));
    
    // Start countdown
    act(() => {
      result.current.startCountdown(onAutoAccept);
    });
    
    // Unmount component
    unmount();
    
    // Fast-forward 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    
    // Callback should not be called because component was unmounted
    expect(onAutoAccept).not.toHaveBeenCalled();
  });
});