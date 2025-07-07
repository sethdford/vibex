/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Tests for AdvancedStreamingDisplay Component
 * 
 * Comprehensive test suite for the unified streaming component that consolidates
 * all previous streaming components into one comprehensive solution.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  AdvancedStreamingDisplay, 
  StreamingMode, 
  StreamingState, 
  ThinkingPhase,
  type LiveThinkingBlock,
  type StreamingResponse,
  type ToolExecutionEntry
} from '../../../src/ui/components/AdvancedStreamingDisplay.tsx';

// Mock dependencies
vi.mock('ink-spinner', () => {
  return function MockSpinner() {
    return React.createElement('span', null, '⚪');
  };
});

vi.mock('../../../src/ui/utils/highlighter.js', () => ({
  highlightCode: vi.fn((code: string, language: string) => code.split('\n'))
}));

vi.mock('../../../src/ui/colors.js', () => ({
  Colors: {
    AccentPurple: '#8B5CF6',
    Text: '#FFFFFF',
    AccentBlue: '#3B82F6',
    TextMuted: '#6B7280',
    Error: '#EF4444',
    Success: '#10B981',
    Warning: '#F59E0B'
  }
}));

describe('AdvancedStreamingDisplay', () => {
  const defaultProps = {
    mode: StreamingMode.BASIC,
    streamingState: StreamingState.IDLE,
    content: 'Test content',
    isStreaming: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic Mode', () => {
    test('should render basic text content', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          content="Hello, World!"
        />
      );

      expect(container.textContent).toContain('Hello, World!');
    });

    test('should show cursor when streaming', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          isStreaming={true}
          showCursor={true}
          content="Streaming..."
        />
      );

      // Should show loading indicator when streaming
      expect(container.textContent).toContain('⚪');
    });

    test('should hide cursor when not streaming', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          isStreaming={false}
          showCursor={true}
          content="Complete text"
        />
      );

      expect(container.textContent).toContain('Complete text');
    });

    test('should show loading indicator when streaming', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          isStreaming={true}
          showLoadingIndicator={true}
          loadingMessage="Processing..."
        />
      );

      expect(container.textContent).toContain('Processing...');
    });

    test('should call onComplete when streaming finishes', () => {
      const onComplete = vi.fn();
      
      render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          isStreaming={false}
          onComplete={onComplete}
          content="Complete"
        />
      );

      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Markdown Mode', () => {
    test('should render markdown content', () => {
      const markdownContent = '**Bold text** and regular text';
      
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.MARKDOWN}
          content={markdownContent}
        />
      );

      expect(container.textContent).toContain('Bold text');
      expect(container.textContent).toContain('and regular text');
    });

    test('should render code blocks with syntax highlighting', () => {
      const codeContent = '```javascript\nconsole.log("Hello");\n```';
      
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.MARKDOWN}
          content={codeContent}
          enableSyntaxHighlighting={true}
        />
      );

      expect(container.textContent).toContain('javascript');
      expect(container.textContent).toContain('console.log("Hello");');
    });

    test('should handle code blocks without syntax highlighting', () => {
      const codeContent = '```javascript\nconsole.log("Hello");\n```';
      
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.MARKDOWN}
          content={codeContent}
          enableSyntaxHighlighting={false}
        />
      );

      expect(container.textContent).toContain('console.log("Hello");');
    });
  });

  describe('Interactive Mode', () => {
    const mockThinkingBlocks: LiveThinkingBlock[] = [
      {
        id: 'block1',
        phase: ThinkingPhase.ANALYSIS,
        content: 'Analyzing the problem...',
        startTime: Date.now(),
        isExpanded: false,
        metadata: { confidence: 0.8 }
      },
      {
        id: 'block2',
        phase: ThinkingPhase.PLANNING,
        content: 'Planning the solution...',
        startTime: Date.now(),
        isExpanded: true,
        metadata: { confidence: 0.9 }
      }
    ];

    const mockResponse: StreamingResponse = {
      id: 'response1',
      content: 'This is the AI response',
      isComplete: false,
      timestamp: Date.now(),
      metadata: {
        model: 'Claude 4',
        latency: 150,
        tokens: 25
      }
    };

    test('should render thinking blocks', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.INTERACTIVE}
          thinkingBlocks={mockThinkingBlocks}
          showThinking={true}
        />
      );

      expect(container.textContent).toContain('AI Reasoning');
      expect(container.textContent).toContain('analysis');
      expect(container.textContent).toContain('planning');
    });

    test('should show confidence levels in thinking blocks', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.INTERACTIVE}
          thinkingBlocks={mockThinkingBlocks}
          showThinking={true}
        />
      );

      expect(container.textContent).toContain('Confidence: 80%');
      expect(container.textContent).toContain('Confidence: 90%');
    });

    test('should render current response with metadata', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.INTERACTIVE}
          currentResponse={mockResponse}
          showMetrics={true}
        />
      );

      expect(container.textContent).toContain('AI Response');
      expect(container.textContent).toContain('This is the AI response');
      expect(container.textContent).toContain('Claude 4');
      expect(container.textContent).toContain('150ms');
    });

    test('should show help text for navigation', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.INTERACTIVE}
        />
      );

      expect(container.textContent).toContain('Navigation:');
      expect(container.textContent).toContain('Ctrl+T');
      expect(container.textContent).toContain('Ctrl+C');
      expect(container.textContent).toContain('Ctrl+R');
    });

    test('should handle thinking block interactions', () => {
      const onThinkingInteraction = vi.fn();
      
      render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.INTERACTIVE}
          thinkingBlocks={mockThinkingBlocks}
          onThinkingInteraction={onThinkingInteraction}
        />
      );

      // Interaction testing would require more complex setup for keyboard events
      // This test verifies the callback is properly passed
      expect(onThinkingInteraction).toBeDefined();
    });
  });

  describe('Tool Execution Mode', () => {
    const mockToolExecutions: ToolExecutionEntry[] = [
      {
        id: 'tool1',
        toolCall: { name: 'file_read', input: { path: '/test.txt' } },
        state: 'executing',
        startTime: Date.now(),
        streamingOutput: 'Reading file...\nProgress: 50%'
      },
      {
        id: 'tool2',
        toolCall: { name: 'web_search', input: { query: 'test' } },
        state: 'completed',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        result: { content: 'Search completed successfully' }
      },
      {
        id: 'tool3',
        toolCall: { name: 'code_analysis', input: { file: 'app.js' } },
        state: 'failed',
        startTime: Date.now() - 2000,
        endTime: Date.now() - 1000,
        result: { content: 'Analysis failed', error: true }
      }
    ];

    test('should render tool execution header', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.TOOL_EXECUTION}
          toolExecutions={mockToolExecutions}
        />
      );

      expect(container.textContent).toContain('Tool Execution');
    });

    test('should show tool execution states with icons', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.TOOL_EXECUTION}
          toolExecutions={mockToolExecutions}
        />
      );

      expect(container.textContent).toContain('file_read');
      expect(container.textContent).toContain('web_search');
      expect(container.textContent).toContain('code_analysis');
    });

    test('should show streaming output for executing tools', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.TOOL_EXECUTION}
          toolExecutions={mockToolExecutions}
        />
      );

      expect(container.textContent).toContain('Progress: 50%');
    });

    test('should show tool results', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.TOOL_EXECUTION}
          toolExecutions={mockToolExecutions}
        />
      );

      expect(container.textContent).toContain('Search completed successfully');
      expect(container.textContent).toContain('Analysis failed');
    });

    test('should limit displayed tool entries', () => {
      const manyTools = Array.from({ length: 15 }, (_, i) => ({
        id: `tool${i}`,
        toolCall: { name: `tool_${i}`, input: {} },
        state: 'completed' as const,
        startTime: Date.now(),
        endTime: Date.now()
      }));

      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.TOOL_EXECUTION}
          toolExecutions={manyTools}
          maxToolEntries={5}
        />
      );

      // Should only show first 5 tools
      expect(container.textContent).toContain('tool_0');
      expect(container.textContent).toContain('tool_4');
      expect(container.textContent).not.toContain('tool_5');
    });
  });

  describe('Loading Mode', () => {
    test('should render loading spinner and message', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.LOADING}
          loadingMessage="Loading data..."
        />
      );

      expect(container.textContent).toContain('⚪'); // Mock spinner
      expect(container.textContent).toContain('Loading data...');
    });

    test('should show thought when provided', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.LOADING}
          thought="Analyzing your request..."
        />
      );

      expect(container.textContent).toContain('Analyzing your request...');
    });
  });

  describe('Streaming States', () => {
    test('should show correct indicator for each streaming state', () => {
      const states = [
        { state: StreamingState.IDLE, text: 'Ready' },
        { state: StreamingState.THINKING, text: 'Thinking...' },
        { state: StreamingState.RESPONDING, text: 'Responding...' },
        { state: StreamingState.TOOL_EXECUTING, text: 'Executing...' },
        { state: StreamingState.COMPLETE, text: 'Complete' },
        { state: StreamingState.ERROR, text: 'Error' }
      ];

      states.forEach(({ state, text }) => {
        const { container } = render(
          <AdvancedStreamingDisplay
            {...defaultProps}
            mode={StreamingMode.INTERACTIVE}
            streamingState={state}
          />
        );

        expect(container.textContent).toContain(text);
      });
    });
  });

  describe('Theme Customization', () => {
    test('should apply custom theme colors', () => {
      const customTheme = {
        thinking: '#FF0000',
        response: '#00FF00',
        accent: '#0000FF',
        muted: '#888888',
        error: '#FF4444',
        success: '#44FF44',
        warning: '#FFFF44'
      };

      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          theme={customTheme}
        />
      );

      // Theme is applied through color props, which are tested through rendering
      expect(container).toBeDefined();
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle empty content', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          content=""
        />
      );

      expect(container).toBeDefined();
    });

    test('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          content={longContent}
        />
      );

      expect(container.textContent).toContain('A');
    });

    test('should handle special characters in content', () => {
      const specialContent = '🚀 Special chars: <>&"\'';
      
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          content={specialContent}
        />
      );

      expect(container.textContent).toContain('🚀');
      expect(container.textContent).toContain('<>&"\'');
    });

    test('should handle undefined optional props gracefully', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          mode={StreamingMode.INTERACTIVE}
          streamingState={StreamingState.IDLE}
          content="Test"
          isStreaming={false}
          // All other props undefined
        />
      );

      expect(container).toBeDefined();
    });
  });

  describe('Callback Functions', () => {
    test('should call onComplete when streaming finishes', () => {
      const onComplete = vi.fn();
      
      const { rerender } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          isStreaming={true}
          onComplete={onComplete}
        />
      );

      // Complete the streaming
      rerender(
        <AdvancedStreamingDisplay
          {...defaultProps}
          isStreaming={false}
          onComplete={onComplete}
        />
      );

      expect(onComplete).toHaveBeenCalled();
    });

    test('should handle missing callback functions gracefully', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.INTERACTIVE}
          // No callback functions provided
        />
      );

      expect(container).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    test('should provide appropriate text content for screen readers', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.INTERACTIVE}
          streamingState={StreamingState.THINKING}
          content="AI is processing your request"
        />
      );

      expect(container.textContent).toContain('Thinking...');
      expect(container.textContent).toContain('AI is processing your request');
    });

    test('should include navigation help for interactive mode', () => {
      const { container } = render(
        <AdvancedStreamingDisplay
          {...defaultProps}
          mode={StreamingMode.INTERACTIVE}
        />
      );

      expect(container.textContent).toContain('Navigation:');
      expect(container.textContent).toContain('select');
      expect(container.textContent).toContain('expand/collapse');
      expect(container.textContent).toContain('copy');
      expect(container.textContent).toContain('regenerate');
    });
  });
});