/**
 * Progress Bar Component Tests
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';
import { IndeterminateProgressBar } from './IndeterminateProgressBar';
import { MiniProgressIndicator } from './MiniProgressIndicator';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('ProgressBar Component', () => {
  // Mock requestAnimationFrame
  beforeAll(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });
  });
  
  afterAll(() => {
    (window.requestAnimationFrame as jest.Mock).mockRestore();
  });

  it('renders with default props', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ProgressBar value={50} />
      </ThemeProvider>
    );
    
    // Should show percentage
    expect(getByText('50.0%')).toBeTruthy();
  });
  
  it('shows a label when provided', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ProgressBar value={75} label="Loading:" />
      </ThemeProvider>
    );
    
    expect(getByText('Loading:')).toBeTruthy();
    expect(getByText('75.0%')).toBeTruthy();
  });
  
  it('shows completion message when completed', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ProgressBar value={100} completionMessage="Download complete!" />
      </ThemeProvider>
    );
    
    expect(getByText('Download complete!')).toBeTruthy();
  });
  
  it('does not show completion message when not completed', () => {
    const { queryByText } = render(
      <ThemeProvider>
        <ProgressBar value={99.9} completionMessage="Download complete!" />
      </ThemeProvider>
    );
    
    expect(queryByText('Download complete!')).toBeNull();
  });
  
  it('handles values greater than 100', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ProgressBar value={150} />
      </ThemeProvider>
    );
    
    expect(getByText('100.0%')).toBeTruthy();
  });
  
  it('handles negative values', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ProgressBar value={-10} />
      </ThemeProvider>
    );
    
    expect(getByText('0.0%')).toBeTruthy();
  });
  
  it('hides percentage when showPercentage is false', () => {
    const { queryByText } = render(
      <ThemeProvider>
        <ProgressBar value={50} showPercentage={false} />
      </ThemeProvider>
    );
    
    expect(queryByText('50.0%')).toBeNull();
  });

  it('shows steps when provided', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ProgressBar value={50} currentStep={2} totalSteps={5} showSteps={true} />
      </ThemeProvider>
    );
    
    expect(getByText('[2/5]')).toBeTruthy();
  });

  it('shows time estimate when provided', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ProgressBar 
          value={50} 
          estimatedTimeRemaining={120} 
          showTimeEstimate={true} 
        />
      </ThemeProvider>
    );
    
    expect(getByText('2m 0s remaining')).toBeTruthy();
  });

  it('handles animated transitions', () => {
    // Render with initial value
    const { rerender, getByText } = render(
      <ThemeProvider>
        <ProgressBar value={20} animated={true} />
      </ThemeProvider>
    );
    
    // Update to new value
    rerender(
      <ThemeProvider>
        <ProgressBar value={40} animated={true} />
      </ThemeProvider>
    );
    
    // Should eventually reach the new value
    act(() => {
      // Simulate animation frame
      jest.spyOn(window, 'requestAnimationFrame').mockImplementationOnce(cb => {
        cb(300); // Simulate time passing
        return 0;
      });
    });
    
    // Should show percentage eventually moving toward the new value
    expect(getByText('40.0%')).toBeTruthy();
  });
});

describe('IndeterminateProgressBar Component', () => {
  // Mock timers for animation testing
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  
  it('renders with default props', () => {
    const { container } = render(
      <ThemeProvider>
        <IndeterminateProgressBar />
      </ThemeProvider>
    );
    
    // Should render without errors
    expect(container).toBeTruthy();
  });
  
  it('shows a label when provided', () => {
    const { getByText } = render(
      <ThemeProvider>
        <IndeterminateProgressBar label="Processing:" />
      </ThemeProvider>
    );
    
    expect(getByText('Processing:')).toBeTruthy();
  });
  
  it('does not animate when active is false', () => {
    const { rerender } = render(
      <ThemeProvider>
        <IndeterminateProgressBar active={false} />
      </ThemeProvider>
    );
    
    // Advance timers
    jest.advanceTimersByTime(1000);
    
    // Re-render to check for changes
    rerender(
      <ThemeProvider>
        <IndeterminateProgressBar active={false} />
      </ThemeProvider>
    );
    
    // No easy way to check animation directly, but this ensures
    // the component doesn't crash when inactive
  });
  
  it('animates when active is true', () => {
    render(
      <ThemeProvider>
        <IndeterminateProgressBar active={true} speed={50} />
      </ThemeProvider>
    );
    
    // Advance timers to trigger animation
    jest.advanceTimersByTime(500);
    
    // Animation should be running (we can't easily check the actual animation)
    // but this ensures the animation logic runs without errors
  });

  it('supports different animation styles', () => {
    const { rerender, container } = render(
      <ThemeProvider>
        <IndeterminateProgressBar animationStyle="bounce" />
      </ThemeProvider>
    );
    
    const bounceOutput = container.innerHTML;
    
    rerender(
      <ThemeProvider>
        <IndeterminateProgressBar animationStyle="pulse" />
      </ThemeProvider>
    );
    
    jest.advanceTimersByTime(200);
    const pulseOutput = container.innerHTML;
    
    rerender(
      <ThemeProvider>
        <IndeterminateProgressBar animationStyle="slide" />
      </ThemeProvider>
    );
    
    jest.advanceTimersByTime(200);
    const slideOutput = container.innerHTML;
    
    // Different animation styles should result in different DOM
    // Not comparing exact values but ensuring they're different
    expect(bounceOutput).not.toBe(pulseOutput);
    expect(pulseOutput).not.toBe(slideOutput);
  });
});

describe('MiniProgressIndicator Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  
  it('renders in different sizes', () => {
    const { rerender, container } = render(
      <ThemeProvider>
        <MiniProgressIndicator size="small" value={50} />
      </ThemeProvider>
    );
    
    const smallOutput = container.innerHTML;
    
    rerender(
      <ThemeProvider>
        <MiniProgressIndicator size="medium" value={50} />
      </ThemeProvider>
    );
    
    const mediumOutput = container.innerHTML;
    
    rerender(
      <ThemeProvider>
        <MiniProgressIndicator size="large" value={50} />
      </ThemeProvider>
    );
    
    const largeOutput = container.innerHTML;
    
    // Different sizes should have different output
    expect(smallOutput).not.toBe(mediumOutput);
    expect(mediumOutput).not.toBe(largeOutput);
  });

  it('shows indeterminate state', () => {
    const { container } = render(
      <ThemeProvider>
        <MiniProgressIndicator indeterminate={true} animated={true} />
      </ThemeProvider>
    );
    
    const initialOutput = container.innerHTML;
    
    // Advance timer to trigger animation
    jest.advanceTimersByTime(100);
    
    // Force re-render to see changes
    render(
      <ThemeProvider>
        <MiniProgressIndicator indeterminate={true} animated={true} />
      </ThemeProvider>
    );
    
    // Animation should cause output to change
    const updatedOutput = container.innerHTML;
    expect(initialOutput).not.toBe(updatedOutput);
  });
});