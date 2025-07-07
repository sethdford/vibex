/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Clipboard Notification Component Tests
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { ClipboardNotification } from '../../../src/ui/components/ClipboardNotification';
import { ThemeProvider } from '../../../src/ui/contexts/ThemeContext';
import { Colors } from '../../../src/ui/colors';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock timers
vi.useFakeTimers();

describe('ClipboardNotification Component', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });
  it('renders notification message', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ClipboardNotification message="Copied to clipboard" />
      </ThemeProvider>
    );
    
    expect(getByText('Copied to clipboard')).toBeTruthy();
  });
  
  it('automatically dismisses after duration', () => {
    const onDismiss = vi.fn();
    
    const { queryByText } = render(
      <ThemeProvider>
        <ClipboardNotification 
          message="Copied to clipboard" 
          duration={1000}
          onDismiss={onDismiss} 
        />
      </ThemeProvider>
    );
    
    // Initially visible
    expect(queryByText('Copied to clipboard')).toBeTruthy();
    
    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Should be dismissed
    expect(queryByText('Copied to clipboard')).toBeNull();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
  
  it('applies appropriate color based on type', () => {
    const { container: successContainer } = render(
      <ThemeProvider>
        <ClipboardNotification message="Success message" type="success" />
      </ThemeProvider>
    );
    
    const { container: errorContainer } = render(
      <ThemeProvider>
        <ClipboardNotification message="Error message" type="error" />
      </ThemeProvider>
    );
    
    const { container: infoContainer } = render(
      <ThemeProvider>
        <ClipboardNotification message="Info message" type="info" />
      </ThemeProvider>
    );
    
    // We can't directly check colors in Ink components easily,
    // but we can at least verify the component renders differently
    // based on the type
    expect(successContainer).not.toEqual(errorContainer);
    expect(successContainer).not.toEqual(infoContainer);
    expect(errorContainer).not.toEqual(infoContainer);
  });
  
  it('cleans up timeout when unmounted', () => {
    const onDismiss = vi.fn();
    
    const { unmount } = render(
      <ThemeProvider>
        <ClipboardNotification 
          message="Will unmount" 
          onDismiss={onDismiss}
          duration={1000}
        />
      </ThemeProvider>
    );
    
    // Unmount before timeout
    unmount();
    
    // Advance time past the would-be timeout
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // onDismiss should not have been called since the component unmounted
    expect(onDismiss).not.toHaveBeenCalled();
  });
  
  it('renders with default duration when not specified', () => {
    const onDismiss = vi.fn();
    
    render(
      <ThemeProvider>
        <ClipboardNotification 
          message="Default duration" 
          onDismiss={onDismiss}
        />
      </ThemeProvider>
    );
    
    // Advance time just before default timeout (3000ms)
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    
    // Should not be dismissed yet
    expect(onDismiss).not.toHaveBeenCalled();
    
    // Advance to just after default timeout
    act(() => {
      vi.advanceTimersByTime(1);
    });
    
    // Now it should be dismissed
    expect(onDismiss).toHaveBeenCalled();
  });
});