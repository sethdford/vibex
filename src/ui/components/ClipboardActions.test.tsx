/**
 * Clipboard Actions Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ClipboardActions } from './ClipboardActions';
import { useClipboard } from '../hooks/useClipboard';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock the useClipboard hook
jest.mock('../hooks/useClipboard');

describe('ClipboardActions Component', () => {
  // Set up mock implementation for useClipboard
  const copyToClipboardMock = jest.fn();
  const pasteFromClipboardMock = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful implementation
    copyToClipboardMock.mockResolvedValue(true);
    pasteFromClipboardMock.mockResolvedValue('Pasted text');
    
    // Mock the hook return value
    (useClipboard as jest.Mock).mockReturnValue({
      copyToClipboard: copyToClipboardMock,
      pasteFromClipboard: pasteFromClipboardMock,
      error: null,
      isLoading: false,
      lastCopiedText: null,
      clearClipboard: jest.fn().mockResolvedValue(true),
    });
    
    // Mock window.getSelection
    window.getSelection = jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('Selected text'),
    });
    
    // Mock setTimeout
    jest.useFakeTimers();
  });
  
  it('renders copy instructions', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ClipboardActions content="Test content" />
      </ThemeProvider>
    );
    
    expect(getByText('Ctrl+C')).toBeTruthy();
    expect(getByText(/to copy/)).toBeTruthy();
  });
  
  it('renders paste instructions when showPaste is true', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ClipboardActions 
          content="Test content" 
          showPaste 
          onPaste={() => {}}
        />
      </ThemeProvider>
    );
    
    expect(getByText('Ctrl+C')).toBeTruthy();
    expect(getByText(/to copy/)).toBeTruthy();
    expect(getByText('Ctrl+V')).toBeTruthy();
    expect(getByText(/to paste/)).toBeTruthy();
  });
  
  it('copies content on Ctrl+C', () => {
    render(
      <ThemeProvider>
        <ClipboardActions content="Test content" />
      </ThemeProvider>
    );
    
    // Simulate Ctrl+C with selected text
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
    
    expect(copyToClipboardMock).toHaveBeenCalledWith('Test content');
  });
  
  it('pastes content on Ctrl+V when showPaste is true', () => {
    const onPasteMock = jest.fn();
    
    render(
      <ThemeProvider>
        <ClipboardActions 
          content="Test content" 
          showPaste 
          onPaste={onPasteMock}
        />
      </ThemeProvider>
    );
    
    // Simulate Ctrl+V
    fireEvent.keyDown(document, { key: 'v', ctrlKey: true });
    
    expect(pasteFromClipboardMock).toHaveBeenCalled();
    
    // Fast-forward timers to resolve the Promise
    jest.runAllTimers();
    
    expect(onPasteMock).toHaveBeenCalledWith('Pasted text');
  });
  
  it('shows success message after copying', async () => {
    const { getByText, findByText } = render(
      <ThemeProvider>
        <ClipboardActions content="Test content" />
      </ThemeProvider>
    );
    
    // Simulate Ctrl+C with selected text
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
    
    // Wait for success message
    const successMessage = await findByText('Copied to clipboard');
    expect(successMessage).toBeTruthy();
    
    // Fast-forward timers to clear the message
    jest.runAllTimers();
  });
  
  it('shows error message when copy fails', async () => {
    // Mock copy failure
    copyToClipboardMock.mockResolvedValue(false);
    (useClipboard as jest.Mock).mockReturnValue({
      copyToClipboard: copyToClipboardMock,
      pasteFromClipboard: pasteFromClipboardMock,
      error: 'Permission denied',
      isLoading: false,
      lastCopiedText: null,
      clearClipboard: jest.fn().mockResolvedValue(true),
    });
    
    const { findByText } = render(
      <ThemeProvider>
        <ClipboardActions content="Test content" />
      </ThemeProvider>
    );
    
    // Simulate Ctrl+C with selected text
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
    
    // Wait for error message
    const errorMessage = await findByText(/Failed to copy: Permission denied/);
    expect(errorMessage).toBeTruthy();
    
    // Fast-forward timers to clear the message
    jest.runAllTimers();
  });
  
  it('does not copy when content is empty', async () => {
    const { findByText } = render(
      <ThemeProvider>
        <ClipboardActions content="" />
      </ThemeProvider>
    );
    
    // Simulate Ctrl+C with selected text
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
    
    // Wait for error message
    const errorMessage = await findByText('Nothing to copy');
    expect(errorMessage).toBeTruthy();
    expect(copyToClipboardMock).not.toHaveBeenCalled();
    
    // Fast-forward timers to clear the message
    jest.runAllTimers();
  });
  
  it('does not handle keyboard events when not focused', () => {
    render(
      <ThemeProvider>
        <ClipboardActions content="Test content" isFocused={false} />
      </ThemeProvider>
    );
    
    // Simulate Ctrl+C with selected text
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
    
    expect(copyToClipboardMock).not.toHaveBeenCalled();
  });
});