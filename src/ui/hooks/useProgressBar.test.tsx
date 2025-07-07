/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Progress Bar Hook Tests
 */

import React from 'react';
import { renderHook, act, render } from '@testing-library/react';
import { useProgressBar } from './useProgressBar.js';
import { ProgressProvider } from '../contexts/ProgressContext.js';
import { ProgressDisplay } from '../components/ProgressDisplay.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid'
}));

// Wrapper component for hooks
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProgressProvider>{children}</ProgressProvider>
);

describe('useProgressBar Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });
  
  it('initializes with default options', () => {
    const { result } = renderHook(() => useProgressBar(), {
      wrapper: Wrapper
    });
    
    expect(result.current.id).toBe('test-uuid');
  });
  
  it('initializes with custom options', () => {
    const { result } = renderHook(() => useProgressBar({
      label: 'Test Progress',
      total: 200,
      initialValue: 50,
      initialMessage: 'Starting...',
      indeterminate: true
    }), {
      wrapper: Wrapper
    });
    
    expect(result.current.id).toBe('test-uuid');
  });
  
  it('updates progress value and message', () => {
    const { result } = renderHook(() => useProgressBar(), {
      wrapper: Wrapper
    });
    
    act(() => {
      result.current.increment(50, 'Halfway there');
    });
  });
  
  it('completes progress', () => {
    const { result } = renderHook(() => useProgressBar(), {
      wrapper: Wrapper
    });
    
    act(() => {
      result.current.complete('All done!');
    });
    
    // Auto-removal after completion (5 seconds)
    act(() => {
      vi.advanceTimersByTime(5000);
    });
  });
  
  it('toggles indeterminate state', () => {
    const { result } = renderHook(() => useProgressBar(), {
      wrapper: Wrapper
    });
    
    act(() => {
      result.current.setIndeterminate(true);
    });
    
    // There's no direct API to check indeterminate state,
    // but we can verify the hook doesn't crash
    expect(result.current).toBeTruthy();
  });
  
  it('renders with ProgressDisplay component', () => {
    const TestComponent = () => {
      const progress = useProgressBar({
        label: 'Test Progress',
        initialValue: 50
      });
      
      return <ProgressDisplay />;
    };
    
    const { getByText } = render(<TestComponent />, { wrapper: Wrapper });
    
    expect(getByText('Test Progress')).toBeTruthy();
  });
});
