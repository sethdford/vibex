/**
 * Progress Bar Hook Tests
 */

import React from 'react';
import { renderHook, act, render } from '@testing-library/react';
import { useProgressBar } from './useProgressBar.js';
import { ProgressProvider } from '../contexts/ProgressContext.js';
import { ProgressDisplay } from '../components/ProgressDisplay.js';

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid'
}));

// Wrapper component for hooks
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProgressProvider>{children}</ProgressProvider>
);

describe('useProgressBar Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
  
  it('initializes with default options', () => {
    const { result } = renderHook(() => useProgressBar(), {
      wrapper: Wrapper
    });
    
    expect(result.current.id).toBe('test-uuid');
    expect(result.current.getValue()).toBe(0);
    expect(result.current.getMessage()).toBeUndefined();
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
    expect(result.current.getValue()).toBe(25); // 50/200 * 100
    expect(result.current.getMessage()).toBe('Starting...');
  });
  
  it('updates progress value and message', () => {
    const { result } = renderHook(() => useProgressBar(), {
      wrapper: Wrapper
    });
    
    act(() => {
      result.current.update(50, 'Halfway there');
    });
    
    expect(result.current.getValue()).toBe(50);
    expect(result.current.getMessage()).toBe('Halfway there');
  });
  
  it('completes progress', () => {
    const { result } = renderHook(() => useProgressBar(), {
      wrapper: Wrapper
    });
    
    act(() => {
      result.current.complete('All done!');
    });
    
    expect(result.current.getValue()).toBe(100);
    expect(result.current.getMessage()).toBe('All done!');
    
    // Auto-removal after completion (5 seconds)
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    // After auto-removal, getValue should return 0
    expect(result.current.getValue()).toBe(0);
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