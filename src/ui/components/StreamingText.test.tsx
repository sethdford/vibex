/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * StreamingText Component Tests
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { StreamingText } from './StreamingText.js';
import { ThemeProvider } from '../contexts/ThemeContext.js';
import { Colors } from '../colors.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock setTimeout/clearTimeout
vi.useFakeTimers();

describe('StreamingText Component', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });
  
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
      vi.advanceTimersByTime(100);
    });
    
    // After 200ms, 'He' should be visible
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    // After 500ms, full text should be visible
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Now the full text should be visible
    expect(queryByText('Hello')).toBeTruthy();
  });
  
  it('calls onComplete when streaming finishes', () => {
    const onComplete = vi.fn();
    
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
      vi.advanceTimersByTime(400); // 4 characters * 100ms
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
      vi.advanceTimersByTime(300); // 3 characters * 100ms
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
      vi.advanceTimersByTime(600); // 6 characters * 100ms
    });
    
    // Now "Second" should be visible
    expect(queryByText('Second')).toBeTruthy();
  });
  
  it('shows full text immediately when switching from streaming to non-streaming', () => {
    const { getByText, rerender } = render(
      <ThemeProvider>
        <StreamingText
          text="Hello World"
          isStreaming={true}
          charsPerSecond={10}
        />
      </ThemeProvider>
    );
    
    // Advance time for a few characters
    act(() => {
      vi.advanceTimersByTime(300); // Show first 3 characters
    });
    
    // Change to non-streaming
    rerender(
      <ThemeProvider>
        <StreamingText
          text="Hello World"
          isStreaming={false}
          charsPerSecond={10}
        />
      </ThemeProvider>
    );
    
    // Should immediately show full text
    expect(getByText('Hello World')).toBeTruthy();
  });
  
  it('applies custom text color', () => {
    const { container } = render(
      <ThemeProvider>
        <StreamingText 
          text="Colored Text" 
          isStreaming={false} 
          color={Colors.Success} 
        />
      </ThemeProvider>
    );
    
    // Check that color prop is applied (actual color checking is difficult in tests)
    // We're just making sure the component doesn't break when color is provided
    expect(container.innerHTML).toContain('Colored Text');
  });
  
  it('handles empty text', () => {
    const { container } = render(
      <ThemeProvider>
        <StreamingText 
          text="" 
          isStreaming={true}
        />
      </ThemeProvider>
    );
    
    // Ensure it doesn't crash with empty text
    expect(container).toBeDefined();
  });
  
  it('handles different streaming speeds', () => {
    // Fast speed test
    const { rerender } = render(
      <ThemeProvider>
        <StreamingText 
          text="Fast" 
          isStreaming={true} 
          charsPerSecond={100}
        />
      </ThemeProvider>
    );
    
    // Fast speed should set a shorter interval
    // We can't directly test interval, but we can ensure it doesn't crash
    act(() => {
      vi.advanceTimersByTime(20); // Short time for fast speed
    });
    
    // Slow speed test
    rerender(
      <ThemeProvider>
        <StreamingText 
          text="Slow" 
          isStreaming={true} 
          charsPerSecond={5}
        />
      </ThemeProvider>
    );
    
    // Reset content
    act(() => {
      vi.runOnlyPendingTimers();
    });
    
    // Slow speed should set a longer interval
    act(() => {
      vi.advanceTimersByTime(200); // Longer time for slow speed
    });
  });
  
  it('preserves whitespace when option is set', () => {
    const { container } = render(
      <ThemeProvider>
        <StreamingText 
          text="Text with    spaces" 
          isStreaming={false}
          preserveWhitespace={true}
        />
      </ThemeProvider>
    );
    
    // Check the component renders (we can't easily test whitespace preservation)
    expect(container.innerHTML).toContain('Text with    spaces');
  });
  
  it('handles multi-line text correctly', () => {
    const multilineText = "Line 1\nLine 2\nLine 3";
    
    const { getByText } = render(
      <ThemeProvider>
        <StreamingText 
          text={multilineText}
          isStreaming={false}
        />
      </ThemeProvider>
    );
    
    // Should display the text (newlines are handled by Ink's Text component)
    expect(getByText(multilineText)).toBeTruthy();
  });
});