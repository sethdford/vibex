/**
 * Input Prompt Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { InputPrompt } from '../../../src/ui/components/InputPrompt';
import { useClipboard } from '../../../src/ui/hooks/useClipboard';

// Mock hooks
jest.mock('../../../src/ui/hooks/useClipboard', () => ({
  useClipboard: jest.fn()
}));

// Mock ink hooks
jest.mock('ink', () => ({
  Box: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useInput: jest.fn((callback) => {
    // Store the callback for testing
    (global as any).__inkUseInputCallback = callback;
  })
}));

// Mock buffer component
const MockBuffer = {
  text: '',
  setText: jest.fn(),
  Component: () => <div data-testid="buffer">Buffer Component</div>
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
    onSubmit: jest.fn(),
    userMessages: ['previous message 1', 'previous message 2'],
    onClearScreen: jest.fn(),
    config: {},
    slashCommands: testCommands
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (MockBuffer.text as any) = '';
    MockBuffer.setText.mockImplementation((text: string) => {
      (MockBuffer.text as any) = text;
    });
    
    // Setup clipboard mock
    (useClipboard as jest.Mock).mockReturnValue({
      copyToClipboard: jest.fn(),
      pasteFromClipboard: jest.fn().mockResolvedValue('pasted text')
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