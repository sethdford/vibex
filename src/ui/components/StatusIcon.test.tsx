/**
 * Status Icon Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { StatusIcon } from './StatusIcon';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('StatusIcon Component', () => {
  it('renders different status types', () => {
    const { rerender, getByRole } = render(
      <ThemeProvider>
        <StatusIcon status="success" />
      </ThemeProvider>
    );
    
    // Check success icon
    expect(getByRole('img', { name: 'Success' })).toBeTruthy();
    
    // Check error icon
    rerender(
      <ThemeProvider>
        <StatusIcon status="error" />
      </ThemeProvider>
    );
    expect(getByRole('img', { name: 'Error' })).toBeTruthy();
    
    // Check warning icon
    rerender(
      <ThemeProvider>
        <StatusIcon status="warning" />
      </ThemeProvider>
    );
    expect(getByRole('img', { name: 'Warning' })).toBeTruthy();
    
    // Check running icon
    rerender(
      <ThemeProvider>
        <StatusIcon status="running" />
      </ThemeProvider>
    );
    expect(getByRole('img', { name: 'Running' })).toBeTruthy();
  });
  
  it('uses custom aria label when provided', () => {
    const { getByRole } = render(
      <ThemeProvider>
        <StatusIcon status="success" ariaLabel="Custom Label" />
      </ThemeProvider>
    );
    
    expect(getByRole('img', { name: 'Custom Label' })).toBeTruthy();
  });
  
  it('supports animation for running status', () => {
    // Mock timers for animation testing
    jest.useFakeTimers();
    
    const { getByRole } = render(
      <ThemeProvider>
        <StatusIcon status="running" animated={true} />
      </ThemeProvider>
    );
    
    // Initial render should have the first spinner frame
    const icon = getByRole('img', { name: 'Running' });
    const initialContent = icon.textContent;
    
    // Advance timer to trigger animation frame change
    jest.advanceTimersByTime(100);
    
    // Content should be different after animation
    expect(icon.textContent).not.toBe(initialContent);
    
    // Clean up
    jest.useRealTimers();
  });
});