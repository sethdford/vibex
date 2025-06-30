/**
 * Loading Indicator Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { LoadingIndicator } from './LoadingIndicator';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('LoadingIndicator Component', () => {
  it('renders nothing when no data and minimal elapsed time', () => {
    const { container } = render(
      <ThemeProvider>
        <LoadingIndicator
          elapsedTime={100}
        />
      </ThemeProvider>
    );
    
    // Should be empty
    expect(container.firstChild).toBeNull();
  });
  
  it('renders elapsed time with significant time passed', () => {
    const { getByText } = render(
      <ThemeProvider>
        <LoadingIndicator
          elapsedTime={2500}
        />
      </ThemeProvider>
    );
    
    // Should display elapsed time in seconds
    expect(getByText(/2.5s/)).toBeTruthy();
  });
  
  it('renders loading phrase when provided', () => {
    const loadingPhrase = 'Analyzing your code...';
    const { getByText } = render(
      <ThemeProvider>
        <LoadingIndicator
          currentLoadingPhrase={loadingPhrase}
          elapsedTime={1000}
        />
      </ThemeProvider>
    );
    
    // Should display the loading phrase
    expect(getByText(loadingPhrase)).toBeTruthy();
  });
  
  it('renders thought when provided', () => {
    const thought = 'I should check the imports first';
    const { getByText } = render(
      <ThemeProvider>
        <LoadingIndicator
          thought={thought}
          elapsedTime={1000}
        />
      </ThemeProvider>
    );
    
    // Should display the thought
    expect(getByText(thought)).toBeTruthy();
  });
  
  it('displays time in minutes for longer duration', () => {
    const { getByText } = render(
      <ThemeProvider>
        <LoadingIndicator
          elapsedTime={125000} // 2m 5s
        />
      </ThemeProvider>
    );
    
    // Should display time in minutes and seconds
    expect(getByText(/2m 5s/)).toBeTruthy();
  });
});