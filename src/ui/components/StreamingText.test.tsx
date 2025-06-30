/**
 * StreamingText Component Tests
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { StreamingText } from './StreamingText';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock setTimeout/clearTimeout
jest.useFakeTimers();

describe('StreamingText Component', () => {
  it('renders full text immediately when not streaming', () => {
    const { getByText } = render(
      <ThemeProvider>
        <StreamingText
          text="Hello, world!"
          isStreaming={false}
        />
      </ThemeProvider>
    );
    
    // Should display the full text
    expect(getByText('Hello, world!')).toBeTruthy();
  });
  
  it('renders text progressively when streaming', () => {
    const { getByText, queryByText, rerender } = render(
      <ThemeProvider>
        <StreamingText
          text="Hello"
          isStreaming={true}
          charsPerSecond={10} // 10 chars per second = 100ms per char
        />
      </ThemeProvider>
    );
    
    // Initially no text is visible
    expect(queryByText('Hello')).toBeFalsy();
    
    // After 100ms, 'H' should be visible
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // After 200ms, 'He' should be visible
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // After 500ms, full text should be visible
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    // Now the full text should be visible
    expect(queryByText('Hello')).toBeTruthy();
  });
  
  it('calls onComplete when streaming finishes', () => {
    const onComplete = jest.fn();
    
    render(
      <ThemeProvider>
        <StreamingText
          text="Test"
          isStreaming={true}
          charsPerSecond={10} // 10 chars per second = 100ms per char
          onComplete={onComplete}
        />
      </ThemeProvider>
    );
    
    // Advance timers to complete the streaming
    act(() => {
      jest.advanceTimersByTime(400); // 4 characters * 100ms
    });
    
    // onComplete should be called
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
  
  it('resets when text changes', () => {
    const { rerender, queryByText } = render(
      <ThemeProvider>
        <StreamingText
          text="First"
          isStreaming={true}
          charsPerSecond={10}
        />
      </ThemeProvider>
    );
    
    // Advance timers to show some text
    act(() => {
      jest.advanceTimersByTime(300); // 3 characters * 100ms
    });
    
    // Change the text
    rerender(
      <ThemeProvider>
        <StreamingText
          text="Second"
          isStreaming={true}
          charsPerSecond={10}
        />
      </ThemeProvider>
    );
    
    // The text should be reset, so "Second" should not be visible yet
    expect(queryByText('Second')).toBeFalsy();
    
    // Advance timers to show the new text
    act(() => {
      jest.advanceTimersByTime(600); // 6 characters * 100ms
    });
    
    // Now "Second" should be visible
    expect(queryByText('Second')).toBeTruthy();
  });
});