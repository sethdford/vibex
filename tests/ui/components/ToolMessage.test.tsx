/**
 * Tool Message Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ToolMessage } from '../../../src/ui/components/ToolMessage';
import { ThemeProvider } from '../../../src/ui/contexts/ThemeContext';

describe('ToolMessage Component', () => {
  const mockToolUse = {
    name: 'read_file',
    input: { path: '/path/to/file.txt' },
    id: 'tool-123',
    pending: false
  };

  it('renders tool use request correctly', () => {
    const { container } = render(
      <ThemeProvider>
        <ToolMessage toolUse={mockToolUse} />
      </ThemeProvider>
    );
    
    const text = container.textContent || '';
    // Should display tool name
    expect(text).toContain('read_file');
    
    // Should display tool input
    expect(text).toContain('"path": "/path/to/file.txt"');
    
    // Should display status
    expect(text).toContain('Running');
  });
  
  it('renders pending tool status', () => {
    const { container } = render(
      <ThemeProvider>
        <ToolMessage 
          toolUse={{
            ...mockToolUse,
            pending: true
          }} 
        />
      </ThemeProvider>
    );
    
    const text = container.textContent || '';
    // Should display pending status
    expect(text).toContain('Pending');
  });
  
  it('renders tool result success', () => {
    const { container } = render(
      <ThemeProvider>
        <ToolMessage
          toolUse={mockToolUse}
          toolResult={{
            content: 'File contents retrieved successfully',
            isError: false,
            toolUseId: 'tool-123'
          }}
        />
      </ThemeProvider>
    );
    
    const text = container.textContent || '';
    // Should display success status
    expect(text).toContain('Success');
    
    // Should display result content
    expect(text).toContain('File contents retrieved successfully');
  });
  
  it('renders tool result error', () => {
    const { container } = render(
      <ThemeProvider>
        <ToolMessage
          toolUse={mockToolUse}
          toolResult={{
            content: 'File not found',
            isError: true,
            toolUseId: 'tool-123'
          }}
        />
      </ThemeProvider>
    );
    
    const text = container.textContent || '';
    // Should display error status
    expect(text).toContain('Error');
    
    // Should display error content
    expect(text).toContain('File not found');
  });
});