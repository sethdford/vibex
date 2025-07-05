/**
 * History Item Display Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { HistoryItemDisplay } from './HistoryItemDisplay.js';
import { ThemeProvider } from '../contexts/ThemeContext.js';
import { MessageType } from '../types.js';

// Mock markdown utilities and components
jest.mock('../utils/markdownUtilities', () => ({
  parseMarkdown: jest.fn().mockReturnValue({ nodes: [], images: [] }),
}));

jest.mock('../utils/MarkdownDisplay', () => ({
  MarkdownDisplay: jest.fn().mockImplementation(() => <div>Rendered markdown content</div>),
}));

describe('HistoryItemDisplay Component', () => {
  const mockConfig = {
    terminal: {
      useColors: true,
    },
  };
  
  it('renders user message correctly', () => {
    const userMessage = {
      id: 'msg-123',
      type: MessageType.USER,
      text: 'Hello, Claude!',
      timestamp: Date.now(),
    };

    const { getByText } = render(
      <ThemeProvider>
        <HistoryItemDisplay
          item={userMessage}
          isPending={false}
          terminalWidth={80}
          config={mockConfig}
        />
      </ThemeProvider>
    );
    
    // Should display user label
    expect(getByText('You')).toBeTruthy();
    
    // Should display message content
    expect(getByText('Hello, Claude!')).toBeTruthy();
  });
  
  it('renders assistant message correctly', () => {
    const assistantMessage = {
      id: 'msg-456',
      type: MessageType.ASSISTANT,
      text: 'Hello! How can I help you today?',
      timestamp: Date.now(),
    };

    const { getByText } = render(
      <ThemeProvider>
        <HistoryItemDisplay
          item={assistantMessage}
          isPending={false}
          terminalWidth={80}
          config={mockConfig}
        />
      </ThemeProvider>
    );
    
    // Should display assistant label
    expect(getByText('Claude')).toBeTruthy();
    
    // Should display rendered markdown content
    expect(getByText('Rendered markdown content')).toBeTruthy();
  });
  
  it('renders error message correctly', () => {
    const errorMessage = {
      id: 'err-123',
      type: MessageType.ERROR,
      text: 'An error occurred while processing your request.',
      timestamp: Date.now(),
    };

    const { getByText } = render(
      <ThemeProvider>
        <HistoryItemDisplay
          item={errorMessage}
          isPending={false}
          terminalWidth={80}
          config={mockConfig}
        />
      </ThemeProvider>
    );
    
    // Should display error label
    expect(getByText('Error')).toBeTruthy();
    
    // Should display error content
    expect(getByText('An error occurred while processing your request.')).toBeTruthy();
  });
  
  it('renders pending message with typing indicator', () => {
    const pendingMessage = {
      id: 'msg-789',
      type: MessageType.ASSISTANT,
      text: 'I am thinking...',
      timestamp: Date.now(),
    };

    const { getByText } = render(
      <ThemeProvider>
        <HistoryItemDisplay
          item={pendingMessage}
          isPending={true}
          terminalWidth={80}
          config={mockConfig}
        />
      </ThemeProvider>
    );
    
    // Should display assistant label
    expect(getByText('Claude')).toBeTruthy();
    
    // Should display typing indicator
    expect(getByText('(typing...)')).toBeTruthy();
    
    // Should display message content
    expect(getByText('Rendered markdown content')).toBeTruthy();
  });
  
  it('renders tool use by delegating to ToolMessage component', () => {
    const toolUseMessage = {
      id: 'tool-123',
      type: MessageType.TOOL_USE,
      text: 'Tool: read_file',
      timestamp: Date.now(),
      toolUse: {
        name: 'read_file',
        input: { path: '/test.txt' },
        id: 'tool-use-123',
      },
    };

    // In this test, we're only verifying that the component renders
    // since ToolMessage is tested separately
    const { container } = render(
      <ThemeProvider>
        <HistoryItemDisplay
          item={toolUseMessage}
          isPending={false}
          terminalWidth={80}
          config={mockConfig}
        />
      </ThemeProvider>
    );
    
    // Component should render something
    expect(container.firstChild).not.toBeNull();
  });
  
  it('returns null for empty items', () => {
    const emptyMessage = {
      id: 'empty-msg',
      type: MessageType.USER,
      text: '',
      timestamp: Date.now(),
    };

    const { container } = render(
      <ThemeProvider>
        <HistoryItemDisplay
          item={emptyMessage}
          isPending={false}
          terminalWidth={80}
          config={mockConfig}
        />
      </ThemeProvider>
    );
    
    // Should render nothing
    expect(container.firstChild).toBeNull();
  });
});