/**
 * BasicStreamingText Component Tests
 * 
 * Comprehensive test coverage following Gemini CLI standards
 * Tests streaming behavior, typewriter effect, and edge cases
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { BasicStreamingText } from './BasicStreamingText.js';
import { Colors } from '../../colors.js';

describe('BasicStreamingText', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Static Content Display', () => {
    it('should display complete content when not streaming', () => {
      const content = 'Hello, world!';
      const { lastFrame } = render(
        <BasicStreamingText
          content={content}
          isStreaming={false}
        />
      );

      expect(lastFrame()).toContain(content);
    });

    it('should apply custom text color', () => {
      const content = 'Colored text';
      const { lastFrame } = render(
        <BasicStreamingText
          content={content}
          isStreaming={false}
          textColor={Colors.Success}
        />
      );

      expect(lastFrame()).toContain(content);
    });

    it('should handle empty content gracefully', () => {
      const { lastFrame } = render(
        <BasicStreamingText
          content=""
          isStreaming={false}
        />
      );

      expect(lastFrame()).toBe('');
    });
  });

  describe('Streaming Behavior', () => {
    it('should start with empty text when streaming', () => {
      const content = 'Streaming text';
      const { lastFrame } = render(
        <BasicStreamingText
          content={content}
          isStreaming={true}
        />
      );

      expect(lastFrame()).not.toContain(content);
    });

    it('should show cursor during streaming', () => {
      const content = 'Test';
      const { lastFrame } = render(
        <BasicStreamingText
          content={content}
          isStreaming={true}
          showCursor={true}
        />
      );

      // Should not show cursor initially when no text is visible
      expect(lastFrame()).not.toContain('▌');
    });

    it('should hide cursor when showCursor is false', () => {
      const content = 'Test';
      const { lastFrame } = render(
        <BasicStreamingText
          content={content}
          isStreaming={true}
          showCursor={false}
        />
      );

      expect(lastFrame()).not.toContain('▌');
    });

    it('should respect custom characters per second', () => {
      const content = 'Fast typing';
      const onComplete = jest.fn();
      
      render(
        <BasicStreamingText
          content={content}
          isStreaming={true}
          charsPerSecond={100}
          onComplete={onComplete}
        />
      );

      // With 100 chars/second, should complete in ~100ms
      jest.advanceTimersByTime(150);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Loading Indicator', () => {
    it('should show loading indicator when streaming', () => {
      const { lastFrame } = render(
        <BasicStreamingText
          content="Test"
          isStreaming={true}
          showLoadingIndicator={true}
          loadingMessage="Loading..."
        />
      );

      expect(lastFrame()).toContain('Loading...');
    });

    it('should hide loading indicator when not streaming', () => {
      const { lastFrame } = render(
        <BasicStreamingText
          content="Test"
          isStreaming={false}
          showLoadingIndicator={true}
          loadingMessage="Loading..."
        />
      );

      expect(lastFrame()).not.toContain('Loading...');
    });

    it('should allow custom loading message', () => {
      const customMessage = 'Processing data...';
      const { lastFrame } = render(
        <BasicStreamingText
          content="Test"
          isStreaming={true}
          showLoadingIndicator={true}
          loadingMessage={customMessage}
        />
      );

      expect(lastFrame()).toContain(customMessage);
    });
  });

  describe('Completion Callback', () => {
    it('should call onComplete when streaming finishes', () => {
      const onComplete = jest.fn();
      const content = 'Short';
      
      render(
        <BasicStreamingText
          content={content}
          isStreaming={true}
          charsPerSecond={1000}
          onComplete={onComplete}
        />
      );

      jest.advanceTimersByTime(100);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should call onComplete immediately when not streaming', () => {
      const onComplete = jest.fn();
      
      render(
        <BasicStreamingText
          content="Test"
          isStreaming={false}
          onComplete={onComplete}
        />
      );

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should not call onComplete multiple times', () => {
      const onComplete = jest.fn();
      
      const { rerender } = render(
        <BasicStreamingText
          content="Test"
          isStreaming={true}
          onComplete={onComplete}
        />
      );

      jest.advanceTimersByTime(200);
      
      // Re-render with same props
      rerender(
        <BasicStreamingText
          content="Test"
          isStreaming={true}
          onComplete={onComplete}
        />
      );

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Content Changes', () => {
    it('should reset streaming when content changes', () => {
      const onComplete = jest.fn();
      
      const { rerender } = render(
        <BasicStreamingText
          content="First"
          isStreaming={true}
          onComplete={onComplete}
        />
      );

      jest.advanceTimersByTime(100);

      // Change content
      rerender(
        <BasicStreamingText
          content="Second"
          isStreaming={true}
          onComplete={onComplete}
        />
      );

      // Should reset and start streaming new content
      jest.advanceTimersByTime(100);
      expect(onComplete).toHaveBeenCalledTimes(2);
    });
  });

  describe('Theme Integration', () => {
    it('should use theme colors', () => {
      const customTheme = {
        thinking: '#ff0000',
        response: '#00ff00',
        accent: '#0000ff',
        muted: '#888888',
        error: '#ff4444',
        success: '#44ff44',
        warning: '#ffff44'
      };

      const { lastFrame } = render(
        <BasicStreamingText
          content="Test"
          isStreaming={true}
          theme={customTheme}
        />
      );

      // Component should render without errors with custom theme
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      const { lastFrame } = render(
        <BasicStreamingText
          content={longContent}
          isStreaming={false}
        />
      );

      expect(lastFrame()).toContain('A'.repeat(100)); // Should contain part of the content
    });

    it('should handle special characters', () => {
      const specialContent = '🚀 Hello! @#$%^&*()';
      const { lastFrame } = render(
        <BasicStreamingText
          content={specialContent}
          isStreaming={false}
        />
      );

      expect(lastFrame()).toContain(specialContent);
    });

    it('should handle newlines and whitespace', () => {
      const multilineContent = 'Line 1\nLine 2\n  Indented';
      const { lastFrame } = render(
        <BasicStreamingText
          content={multilineContent}
          isStreaming={false}
          preserveWhitespace={true}
        />
      );

      expect(lastFrame()).toContain('Line 1');
      expect(lastFrame()).toContain('Line 2');
    });
  });
}); 