/**
 * Mini Progress Indicator Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MiniProgressIndicator } from './MiniProgressIndicator';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('MiniProgressIndicator Component', () => {
  // Mock timers for animation testing
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  it('renders with default props', () => {
    const { container } = render(
      <ThemeProvider>
        <MiniProgressIndicator />
      </ThemeProvider>
    );
    
    expect(container).toBeTruthy();
  });
  
  it('shows label when provided', () => {
    const { getByText } = render(
      <ThemeProvider>
        <MiniProgressIndicator label="Loading" />
      </ThemeProvider>
    );
    
    expect(getByText('Loading')).toBeTruthy();
  });
  
  it('shows percentage when showPercentage is true', () => {
    const { getByText } = render(
      <ThemeProvider>
        <MiniProgressIndicator value={42} showPercentage={true} />
      </ThemeProvider>
    );
    
    expect(getByText('42%')).toBeTruthy();
  });
  
  it('does not show percentage for indeterminate progress', () => {
    const { queryByText } = render(
      <ThemeProvider>
        <MiniProgressIndicator value={42} indeterminate={true} showPercentage={true} />
      </ThemeProvider>
    );
    
    expect(queryByText('42%')).toBeNull();
  });
  
  it('renders different sizes correctly', () => {
    const { rerender, container } = render(
      <ThemeProvider>
        <MiniProgressIndicator size="small" value={50} indeterminate={false} />
      </ThemeProvider>
    );
    
    // Smaller size should render differently
    const smallOutput = container.textContent;
    
    // Test medium size
    rerender(
      <ThemeProvider>
        <MiniProgressIndicator size="medium" value={50} indeterminate={false} />
      </ThemeProvider>
    );
    
    // Medium should have a different output
    const mediumOutput = container.textContent;
    
    // Test large size
    rerender(
      <ThemeProvider>
        <MiniProgressIndicator size="large" value={50} indeterminate={false} />
      </ThemeProvider>
    );
    
    // Large should have a different output
    const largeOutput = container.textContent;
    
    // Not comparing specific strings as the rendering may differ between test environments
    // But they should at least have different lengths
    expect(mediumOutput?.length).toBeGreaterThan(smallOutput?.length || 0);
    expect(largeOutput?.length).toBeGreaterThan(mediumOutput?.length || 0);
  });
  
  it('animates indeterminate progress when animated is true', () => {
    const { container } = render(
      <ThemeProvider>
        <MiniProgressIndicator indeterminate={true} animated={true} />
      </ThemeProvider>
    );
    
    const initialContent = container.textContent;
    
    // Advance timer to trigger animation frame change
    jest.advanceTimersByTime(100);
    
    // Force re-render to see changes
    render(
      <ThemeProvider>
        <MiniProgressIndicator indeterminate={true} animated={true} />
      </ThemeProvider>
    );
    
    const updatedContent = container.textContent;
    
    // Animation should cause the content to change
    // Note: This is a simplified check that might need adjustment based on implementation
    expect(initialContent).not.toBe(updatedContent);
  });
});