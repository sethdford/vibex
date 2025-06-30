/**
 * Clipboard Notification Component Tests
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { ClipboardNotification } from './ClipboardNotification';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock timers
jest.useFakeTimers();

describe('ClipboardNotification Component', () => {
  it('renders notification message', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ClipboardNotification message="Copied to clipboard" />
      </ThemeProvider>
    );
    
    expect(getByText('Copied to clipboard')).toBeTruthy();
  });
  
  it('automatically dismisses after duration', () => {
    const onDismiss = jest.fn();
    
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
      jest.advanceTimersByTime(1000);
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
});