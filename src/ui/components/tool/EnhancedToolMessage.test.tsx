/**
 * Enhanced Tool Message Component Tests
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { EnhancedToolMessage, ToolExecutionStatus, ToolResultType, ToolVisibilityLevel } from './EnhancedToolMessage';

describe('EnhancedToolMessage', () => {
  // Basic tool use props for testing
  const basicToolUse = {
    name: 'test_tool',
    id: 'test-1234',
    input: { param1: 'value1', param2: 42 },
    status: ToolExecutionStatus.SUCCESS,
    namespace: 'testing',
    description: 'A tool for testing'
  };

  // Basic tool result props for testing
  const basicToolResult = {
    content: 'Test result content',
    isError: false,
    toolUseId: 'test-1234',
    resultType: ToolResultType.TEXT
  };

  it('renders tool name and status correctly', () => {
    const { lastFrame } = render(
      <EnhancedToolMessage toolUse={basicToolUse} />
    );

    expect(lastFrame()).toContain('test_tool');
    expect(lastFrame()).toContain('✓'); // Success status symbol
    expect(lastFrame()).toContain('testing:'); // Namespace
  });

  it('renders tool description when available', () => {
    const { lastFrame } = render(
      <EnhancedToolMessage toolUse={basicToolUse} />
    );

    expect(lastFrame()).toContain('A tool for testing');
  });

  it('renders tool input parameters', () => {
    const { lastFrame } = render(
      <EnhancedToolMessage toolUse={basicToolUse} />
    );

    expect(lastFrame()).toContain('Input:');
    expect(lastFrame()).toContain('param1');
    expect(lastFrame()).toContain('value1');
    expect(lastFrame()).toContain('42');
  });

  it('renders tool result when provided', () => {
    const { lastFrame } = render(
      <EnhancedToolMessage 
        toolUse={basicToolUse} 
        toolResult={basicToolResult}
        initialVisibility={ToolVisibilityLevel.DETAILED}
      />
    );

    expect(lastFrame()).toContain('Result:');
    expect(lastFrame()).toContain('Test result content');
    expect(lastFrame()).toContain('[text]'); // Result type
  });

  it('does not render detailed result with STANDARD visibility', () => {
    const { lastFrame } = render(
      <EnhancedToolMessage 
        toolUse={basicToolUse} 
        toolResult={basicToolResult}
        initialVisibility={ToolVisibilityLevel.STANDARD}
      />
    );

    expect(lastFrame()).toContain('Result:');
    expect(lastFrame()).not.toContain('Test result content');
  });

  it('renders error result with appropriate styling', () => {
    const errorResult = {
      ...basicToolResult,
      isError: true,
      content: 'Error: something went wrong'
    };
    
    const { lastFrame } = render(
      <EnhancedToolMessage 
        toolUse={{...basicToolUse, status: ToolExecutionStatus.ERROR}} 
        toolResult={errorResult}
        initialVisibility={ToolVisibilityLevel.DETAILED}
      />
    );

    expect(lastFrame()).toContain('Error:');
    expect(lastFrame()).toContain('Error: something went wrong');
    expect(lastFrame()).toContain('✗'); // Error status symbol
  });

  it('renders progress indicator for running tools', () => {
    const runningTool = {
      ...basicToolUse,
      status: ToolExecutionStatus.RUNNING,
      metadata: {
        progress: 42,
        message: 'Processing files...'
      }
    };
    
    const { lastFrame } = render(
      <EnhancedToolMessage toolUse={runningTool} />
    );

    expect(lastFrame()).toContain('42%');
    expect(lastFrame()).toContain('Processing files...');
  });

  it('renders focused state with border', () => {
    const { lastFrame } = render(
      <EnhancedToolMessage 
        toolUse={basicToolUse} 
        isFocused={true}
      />
    );

    expect(lastFrame()).toContain('(focused)');
    // Border rendering is harder to test precisely, but we can check for action buttons
    expect(lastFrame()).toContain('[Toggle]');
  });

  it('renders JSON content with appropriate formatting', () => {
    const jsonResult = {
      ...basicToolResult,
      content: '{"key": "value", "nested": {"items": [1, 2, 3]}}',
      resultType: ToolResultType.JSON
    };
    
    const { lastFrame } = render(
      <EnhancedToolMessage 
        toolUse={basicToolUse} 
        toolResult={jsonResult}
        initialVisibility={ToolVisibilityLevel.DETAILED}
      />
    );

    expect(lastFrame()).toContain('[json]');
    expect(lastFrame()).toContain('key');
    expect(lastFrame()).toContain('value');
  });
});