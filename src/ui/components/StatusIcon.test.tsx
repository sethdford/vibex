/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Status Icon Component Tests
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { StatusIcon } from '../../../src/ui/components/StatusIcon';
import { ThemeProvider } from '../../../src/ui/contexts/ThemeContext';
import { Colors } from '../../../src/ui/colors';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

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
    vi.useFakeTimers();
    
    const { getByRole } = render(
      <ThemeProvider>
        <StatusIcon status="running" animated={true} />
      </ThemeProvider>
    );
    
    // Initial render should have the first spinner frame
    const icon = getByRole('img', { name: 'Running' });
    const initialContent = icon.textContent;
    
    // Advance timer to trigger animation frame change
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    // Content should be different after animation
    expect(icon.textContent).not.toBe(initialContent);
    
    // Clean up
    vi.useRealTimers();
  });
  
  it('renders all status types correctly', () => {
    // Array of all possible status types
    const statuses = [
      'success', 'completed', 'error', 'failed', 
      'warning', 'info', 'waiting', 'paused'
    ];
    
    // Test each status type
    statuses.forEach(status => {
      const { getByRole, unmount } = render(
        <ThemeProvider>
          <StatusIcon status={status as any} />
        </ThemeProvider>
      );
      
      // Each status should render with its appropriate label
      const expectedLabel = {
        'success': 'Success',
        'completed': 'Completed',
        'error': 'Error',
        'failed': 'Failed',
        'warning': 'Warning',
        'info': 'Information',
        'waiting': 'Waiting',
        'paused': 'Paused'
      }[status];
      
      expect(getByRole('img', { name: expectedLabel })).toBeTruthy();
      unmount();
    });
  });
  
  it('accepts custom color', () => {
    const { container: defaultContainer } = render(
      <ThemeProvider>
        <StatusIcon status="success" />
      </ThemeProvider>
    );
    
    const { container: customContainer } = render(
      <ThemeProvider>
        <StatusIcon status="success" color="#FF00FF" />
      </ThemeProvider>
    );
    
    // Custom color should result in different rendering
    expect(defaultContainer.innerHTML).not.toEqual(customContainer.innerHTML);
  });
  
  it('does not animate non-running statuses', () => {
    vi.useFakeTimers();
    
    const { getByRole } = render(
      <ThemeProvider>
        <StatusIcon status="success" animated={true} />
      </ThemeProvider>
    );
    
    const icon = getByRole('img', { name: 'Success' });
    const initialContent = icon.textContent;
    
    // Advance timer
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    // Content should remain the same since success doesn't animate
    expect(icon.textContent).toBe(initialContent);
    
    vi.useRealTimers();
  });
});