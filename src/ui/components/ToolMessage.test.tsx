/**
 * Tool Message Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ToolMessage } from './ToolMessage';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('ToolMessage Component', () => {
  const mockToolUse = {
    name: 'read_file',
    input: {
      path: '/path/to/file.txt'
    },
    id: 'tool-123',
  };

  it('renders tool use request correctly', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ToolMessage
          toolUse={mockToolUse}
        />
      </ThemeProvider>
    );
    
    // Should display tool name
    expect(getByText('read_file')).toBeTruthy();
    
    // Should display tool input
    expect(getByText(/"path": "\/path\/to\/file.txt"/)).toBeTruthy();
    
    // Should display status
    expect(getByText('[Running]')).toBeTruthy();
  });
  
  it('renders pending tool status', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ToolMessage
          toolUse={{
            ...mockToolUse,
            pending: true,
          }}
        />
      </ThemeProvider>
    );
    
    // Should display pending status
    expect(getByText('[Pending]')).toBeTruthy();
  });
  
  it('renders tool result success', () => {
    const mockResult = {
      content: 'File contents retrieved successfully',
      isError: false,
      toolUseId: 'tool-123',
    };

    const { getByText } = render(
      <ThemeProvider>
        <ToolMessage
          toolUse={mockToolUse}
          toolResult={mockResult}
        />
      </ThemeProvider>
    );
    
    // Should display success status
    expect(getByText('[Success]')).toBeTruthy();
    
    // Should display result content
    expect(getByText('File contents retrieved successfully')).toBeTruthy();
    
    // Should display result label
    expect(getByText('Result:')).toBeTruthy();
  });
  
  it('renders tool result error', () => {
    const mockResult = {
      content: 'File not found',
      isError: true,
      toolUseId: 'tool-123',
    };

    const { getByText } = render(
      <ThemeProvider>
        <ToolMessage
          toolUse={mockToolUse}
          toolResult={mockResult}
        />
      </ThemeProvider>
    );
    
    // Should display error status
    expect(getByText('[Error]')).toBeTruthy();
    
    // Should display error content
    expect(getByText('File not found')).toBeTruthy();
    
    // Should display error label
    expect(getByText('Error:')).toBeTruthy();
  });
});