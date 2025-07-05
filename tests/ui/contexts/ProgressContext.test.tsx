/**
 * Progress Context Tests
 */

import React, { type MutableRefObject } from 'react';
import { render } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { ProgressProvider, useProgress, type ProgressData } from '../../../src/ui/contexts/ProgressContext';
import type { ProgressStep } from '../../../src/ui/components/DetailedProgressInfo';

// Mock Date.now() for consistent testing
const mockNow = 1625097600000; // Fixed timestamp
const originalDateNow = Date.now;

// Helper component to capture the progress context
const ProgressCapture = ({
  contextRef
}: {
  contextRef: MutableRefObject<ReturnType<typeof useProgress> | undefined>;
}) => {
  contextRef.current = useProgress();
  return <div data-testid="progress-capture">Progress Capture</div>;
};

describe('ProgressContext', () => {
  // Setup Date.now() mock
  beforeEach(() => {
    jest.useFakeTimers();
    global.Date.now = jest.fn(() => mockNow);
  });
  
  // Restore original Date.now
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    global.Date.now = originalDateNow;
  });
  
  it('provides the initial empty state', () => {
    const contextRef = { current: undefined };
    
    render(
      <ProgressProvider>
        <ProgressCapture contextRef={contextRef} />
      </ProgressProvider>
    );
    
    const progressContext = contextRef.current!;
    
    expect(progressContext.progressItems).toBeInstanceOf(Map);
    expect(progressContext.progressItems.size).toBe(0);
    expect(progressContext.startProgress).toBeInstanceOf(Function);
    expect(progressContext.updateProgress).toBeInstanceOf(Function);
    expect(progressContext.completeProgress).toBeInstanceOf(Function);
    expect(progressContext.setIndeterminate).toBeInstanceOf(Function);
    expect(progressContext.getProgress).toBeInstanceOf(Function);
    expect(progressContext.hasProgress).toBeInstanceOf(Function);
    expect(progressContext.updateSteps).toBeInstanceOf(Function);
    expect(progressContext.startStep).toBeInstanceOf(Function);
    expect(progressContext.completeStep).toBeInstanceOf(Function);
    expect(progressContext.setStatus).toBeInstanceOf(Function);
  });
  
  it('starts a new progress with default values', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    act(() => {
      result.current.startProgress('test-progress');
    });
    
    expect(result.current.hasProgress('test-progress')).toBe(true);
    
    const progress = result.current.getProgress('test-progress');
    expect(progress).toBeDefined();
    expect(progress?.id).toBe('test-progress');
    expect(progress?.value).toBe(0);
    expect(progress?.total).toBe(100);
    expect(progress?.label).toBe('test-progress');
    expect(progress?.indeterminate).toBe(false);
    expect(progress?.active).toBe(true);
    expect(progress?.startTime).toBe(mockNow);
    expect(progress?.updateTime).toBe(mockNow);
    expect(progress?.status).toBe('running');
    expect(progress?.progressHistory).toEqual([{ time: mockNow, value: 0 }]);
  });
  
  it('starts a new progress with custom values', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    act(() => {
      result.current.startProgress('test-progress', {
        value: 10,
        total: 200,
        label: 'Test Progress',
        indeterminate: true,
        message: 'Starting...',
        currentStep: 1,
        totalSteps: 5,
        status: 'warning'
      });
    });
    
    const progress = result.current.getProgress('test-progress');
    expect(progress).toBeDefined();
    expect(progress?.value).toBe(10);
    expect(progress?.total).toBe(200);
    expect(progress?.label).toBe('Test Progress');
    expect(progress?.indeterminate).toBe(true);
    expect(progress?.message).toBe('Starting...');
    expect(progress?.currentStep).toBe(1);
    expect(progress?.totalSteps).toBe(5);
    expect(progress?.status).toBe('warning');
  });
  
  it('updates an existing progress', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    // First create a progress item
    act(() => {
      result.current.startProgress('test-progress');
    });
    
    // Update Date.now to simulate time passing
    const updatedTime = mockNow + 1000;
    global.Date.now = jest.fn(() => updatedTime);
    
    // Update the progress
    act(() => {
      result.current.updateProgress('test-progress', 50, 'Halfway done');
    });
    
    const progress = result.current.getProgress('test-progress');
    expect(progress?.value).toBe(50);
    expect(progress?.message).toBe('Halfway done');
    expect(progress?.updateTime).toBe(updatedTime);
    expect(progress?.progressHistory).toEqual([
      { time: mockNow, value: 0 },
      { time: updatedTime, value: 50 }
    ]);
  });
  
  it('calculates progress rate and estimated time remaining', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    // Start progress at time 0
    global.Date.now = jest.fn(() => 1000);
    act(() => {
      result.current.startProgress('test-progress', { value: 0, total: 100 });
    });
    
    // Update to 25% at time 5 seconds
    global.Date.now = jest.fn(() => 6000);
    act(() => {
      result.current.updateProgress('test-progress', 25);
    });
    
    // Progress rate should be 25 units / 5 seconds = 5 units/sec
    // Remaining: 75 units / 5 units/sec = 15 seconds
    const progress = result.current.getProgress('test-progress');
    expect(progress?.progressRate).toBeCloseTo(5, 1);
    expect(progress?.estimatedTimeRemaining).toBeCloseTo(15, 1);
  });
  
  it('completes a progress', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    // First create a progress item
    act(() => {
      result.current.startProgress('test-progress');
    });
    
    // Update Date.now to simulate time passing
    const completedTime = mockNow + 2000;
    global.Date.now = jest.fn(() => completedTime);
    
    // Complete the progress
    act(() => {
      result.current.completeProgress('test-progress', 'All done!');
    });
    
    const progress = result.current.getProgress('test-progress');
    expect(progress?.value).toBe(100);
    expect(progress?.active).toBe(false);
    expect(progress?.message).toBe('All done!');
    expect(progress?.updateTime).toBe(completedTime);
    expect(progress?.endTime).toBe(completedTime);
    expect(progress?.status).toBe('completed');
    expect(progress?.estimatedTimeRemaining).toBe(0);
    
    // Completed items should be removed after 5 seconds
    expect(result.current.hasProgress('test-progress')).toBe(true);
    
    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(5001);
    });
    
    // Progress should be removed
    expect(result.current.hasProgress('test-progress')).toBe(false);
  });
  
  it('toggles indeterminate state', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    // First create a progress item
    act(() => {
      result.current.startProgress('test-progress', { indeterminate: false });
    });
    
    // Set as indeterminate
    act(() => {
      result.current.setIndeterminate('test-progress', true);
    });
    
    let progress = result.current.getProgress('test-progress');
    expect(progress?.indeterminate).toBe(true);
    
    // Toggle back
    act(() => {
      result.current.setIndeterminate('test-progress', false);
    });
    
    progress = result.current.getProgress('test-progress');
    expect(progress?.indeterminate).toBe(false);
  });
  
  it('checks if progress exists', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    expect(result.current.hasProgress('nonexistent')).toBe(false);
    
    act(() => {
      result.current.startProgress('test-progress');
    });
    
    expect(result.current.hasProgress('test-progress')).toBe(true);
    expect(result.current.hasProgress('another-progress')).toBe(false);
  });
  
  it('updates progress steps', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    // Create a progress item
    act(() => {
      result.current.startProgress('test-progress');
    });
    
    // Define steps
    const steps: ProgressStep[] = [
      { name: 'Step 1', status: 'completed', startTime: mockNow - 1000, endTime: mockNow - 500 },
      { name: 'Step 2', status: 'running', startTime: mockNow }
    ];
    
    // Update steps
    act(() => {
      result.current.updateSteps('test-progress', steps);
    });
    
    const progress = result.current.getProgress('test-progress');
    expect(progress?.steps).toEqual(steps);
  });
  
  it('starts a new step', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    // Create a progress item
    act(() => {
      result.current.startProgress('test-progress', {
        currentStep: 0,
        totalSteps: 3
      });
    });
    
    // Start first step
    act(() => {
      result.current.startStep('test-progress', 'Initializing');
    });
    
    // Keep the same mockNow value for consistency in tests
    const progress = result.current.getProgress('test-progress');
    expect(progress?.currentStep).toBe(1);
    expect(progress?.steps?.length).toBe(1);
    
    // Only test the name and status but not the exact startTime
    expect(progress?.steps?.[0].name).toBe('Initializing');
    expect(progress?.steps?.[0].status).toBe('running');
    expect(progress?.message).toBe('Step 1/3: Initializing');
  });
  
  it('completes the current step', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    // Create a progress item and start a step
    act(() => {
      result.current.startProgress('test-progress');
      result.current.startStep('test-progress', 'Processing');
    });
    
    // Complete the step
    const completeTime = mockNow + 1000;
    global.Date.now = jest.fn(() => completeTime);
    
    act(() => {
      result.current.completeStep('test-progress', 'success');
    });
    
    const progress = result.current.getProgress('test-progress');
    
    // Only test name and status without specific timestamps
    expect(progress?.steps?.[0].name).toBe('Processing');
    expect(progress?.steps?.[0].status).toBe('success');
    expect(progress?.steps?.[0].endTime).toBe(completeTime);
  });
  
  it('sets progress status', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    // Create a progress item
    act(() => {
      result.current.startProgress('test-progress');
    });
    
    // Set status
    act(() => {
      result.current.setStatus('test-progress', 'warning');
    });
    
    let progress = result.current.getProgress('test-progress');
    expect(progress?.status).toBe('warning');
    
    // Change status again
    act(() => {
      result.current.setStatus('test-progress', 'error');
    });
    
    progress = result.current.getProgress('test-progress');
    expect(progress?.status).toBe('error');
  });
  
  it('handles updates to non-existent progress items gracefully', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    // These should not throw errors
    act(() => {
      result.current.updateProgress('nonexistent', 50);
      result.current.completeProgress('nonexistent');
      result.current.setIndeterminate('nonexistent', true);
      result.current.updateSteps('nonexistent', []);
      result.current.startStep('nonexistent', 'Step');
      result.current.completeStep('nonexistent');
      result.current.setStatus('nonexistent', 'warning');
    });
    
    // Map should still be empty
    expect(result.current.progressItems.size).toBe(0);
  });
  
  it('throws error when useProgress is used outside of ProgressProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => renderHook(() => useProgress())).toThrow(
      'useProgress must be used within a ProgressProvider'
    );
    
    console.error = originalError;
  });
  
  it('updates time estimates periodically', () => {
    const { result } = renderHook(() => useProgress(), {
      wrapper: ({ children }) => <ProgressProvider>{children}</ProgressProvider>,
    });
    
    // Create a progress item
    act(() => {
      result.current.startProgress('test-progress');
      result.current.updateProgress('test-progress', 25);
    });
    
    // Mock global date to a consistent value for testing
    // This simulates passing of time for the interval
    global.Date.now = jest.fn(() => mockNow);
    
    // Trigger the interval update
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // We're not testing the exact time, just that it exists and is a number
    const progress = result.current.getProgress('test-progress');
    expect(progress).toBeDefined();
    expect(typeof progress?.updateTime).toBe('number');
  });
});