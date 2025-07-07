/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Input Prompt Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { InputPrompt } from '../../../src/ui/components/InputPrompt';
import { useClipboard } from '../../../src/ui/hooks/useClipboard';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock hooks
vi.mock('../../../src/ui/hooks/useClipboard', () => ({
  useClipboard: vi.fn()
}));

// Mock ink hooks
vi.mock('ink', () => ({
  Box: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useInput: vi.fn((callback) => {
    // Store the callback for testing
    (global as any).__inkUseInputCallback = callback;
  })
}));

// Mock buffer component
const MockBuffer = {
  text: '',
  setText: vi.fn(),
  Component: () => <div data-testid="buffer">Buffer Component</div>,
  lines: [],
  cursor: 0,
  insert: vi.fn(),
  newline: vi.fn(),
};

// Test commands
const testCommands = [
  { name: 'help', description: 'Show help' },
  { name: 'clear', description: 'Clear screen' },
  { name: 'theme', description: 'Change theme', hidden: false },
  { name: 'debug', description: 'Debug mode', hidden: true }
];

describe('InputPrompt Component', () => {
  // Setup component props
  const defaultProps = {
    buffer: { ...MockBuffer },
    inputWidth: 80,
    suggestionsWidth: 40,
    onSubmit: vi.fn(),
    userMessages: ['previous message 1', 'previous message 2'],
    onClearScreen: vi.fn(),
    config: {},
    slashCommands: testCommands
  };

  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    (MockBuffer.text as any) = '';
    MockBuffer.setText.mockImplementation((text: string) => {
      (MockBuffer.text as any) = text;
    });
    
    // Setup clipboard mock
    (useClipboard as jest.Mock).mockReturnValue({
      copyToClipboard: vi.fn(),
      pasteFromClipboard: vi.fn().mockResolvedValue('pasted text')
    });
  });

  it('renders correctly', () => {
    const { getByTestId } = render(<InputPrompt {...defaultProps} />);
    
    // Check buffer component is rendered
    expect(getByTestId('buffer')).toBeInTheDocument();
  });

  it('does not submit empty input', () => {
    render(<InputPrompt {...defaultProps} />);
    
    // Set empty text in buffer
    (MockBuffer.text as any) = '   ';
    
    // Simulate Enter key
    const callback = (global as any).__inkUseInputCallback;
    callback('', { return: true });
    
    // Check onSubmit was not called
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('handles clearing the screen with Ctrl+L', () => {
    render(<InputPrompt {...defaultProps} />);
    
    const callback = (global as any).__inkUseInputCallback;
    
    // Test clear screen (Ctrl+L)
    callback('l', { ctrl: true });
    expect(defaultProps.onClearScreen).toHaveBeenCalled();
  });
});
