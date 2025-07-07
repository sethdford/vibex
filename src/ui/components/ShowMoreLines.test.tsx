/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * ShowMoreLines Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ShowMoreLines } from '../../../src/ui/components/ShowMoreLines';
import { Colors } from '../../../src/ui/colors';
import * as OverflowContext from '../../../src/ui/contexts/OverflowContext';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock the useOverflow hook
vi.mock('../../../src/ui/contexts/OverflowContext', () => ({
  useOverflow: vi.fn()
}));

describe('ShowMoreLines Component', () => {
  // Default mock implementation for useOverflow
  const mockUseOverflow = {
    hasOverflow: true,
    hiddenLineCount: 10,
    totalContentHeight: 30,
    availableHeight: 20,
    showAllContent: vi.fn(),
    resetToConstrained: vi.fn(),
    toggleConstrainHeight: vi.fn(),
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up default mock implementation
    (OverflowContext.useOverflow as jest.Mock).mockReturnValue(mockUseOverflow);
  });
  
  it('renders overflow information correctly', () => {
    const { getByText } = render(<ShowMoreLines constrainHeight={true} />);
    
    // Check if overflow message is rendered
    expect(getByText('10 more lines hidden (33% of content)')).toBeTruthy();
    
    // Check if content summary is rendered
    expect(getByText('Showing 20 of 30 lines')).toBeTruthy();
  });
  
  it('does not render when there is no overflow', () => {
    (OverflowContext.useOverflow as jest.Mock).mockReturnValue({
      ...mockUseOverflow,
      hasOverflow: false
    });
    
    const { container } = render(<ShowMoreLines constrainHeight={true} />);
    
    // Component should not render anything
    expect(container.firstChild).toBeNull();
  });
  
  it('does not render when height is not constrained', () => {
    const { container } = render(<ShowMoreLines constrainHeight={false} />);
    
    // Component should not render anything
    expect(container.firstChild).toBeNull();
  });
  
  it('does not render when there are no hidden lines', () => {
    (OverflowContext.useOverflow as jest.Mock).mockReturnValue({
      ...mockUseOverflow,
      hiddenLineCount: 0
    });
    
    const { container } = render(<ShowMoreLines constrainHeight={true} />);
    
    // Component should not render anything
    expect(container.firstChild).toBeNull();
  });
  
  it('renders custom message when provided', () => {
    const customMessage = "Custom overflow message";
    const { getByText } = render(
      <ShowMoreLines 
        constrainHeight={true} 
        customMessage={customMessage} 
      />
    );
    
    // Check if custom message is rendered
    expect(getByText(customMessage)).toBeTruthy();
  });
  
  it('shows keyboard shortcuts when component is focused', () => {
    const { getByText } = render(
      <ShowMoreLines constrainHeight={true} isFocused={true} />
    );
    
    // Check for shortcut instructions
    expect(getByText(/Press/)).toBeTruthy();
    expect(getByText(/Ctrl\+S/)).toBeTruthy();
    expect(getByText(/Ctrl\+H/)).toBeTruthy();
  });
  
  it('shows focus instruction when not focused', () => {
    const { getByText } = render(
      <ShowMoreLines constrainHeight={true} isFocused={false} />
    );
    
    // Check for focus instruction
    expect(getByText('Focus this area for keyboard controls')).toBeTruthy();
  });
  
  it('does not show shortcuts when showShortcuts is false', () => {
    const { queryByText } = render(
      <ShowMoreLines constrainHeight={true} showShortcuts={false} />
    );
    
    // Shortcuts should not be visible
    expect(queryByText(/Press/)).toBeNull();
    expect(queryByText(/Ctrl\+S/)).toBeNull();
  });
  
  it('calls showAllContent when Ctrl+S is pressed and focused', () => {
    // Render with focus
    const { unmount } = render(
      <ShowMoreLines constrainHeight={true} isFocused={true} />
    );
    
    // Simulate Ctrl+S keypress
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    
    // Check if the function was called
    expect(mockUseOverflow.showAllContent).toHaveBeenCalledTimes(1);
    
    unmount();
  });
  
  it('calls toggleConstrainHeight when Ctrl+H is pressed and focused', () => {
    // Render with focus
    const { unmount } = render(
      <ShowMoreLines constrainHeight={true} isFocused={true} />
    );
    
    // Simulate Ctrl+H keypress
    fireEvent.keyDown(document, { key: 'h', ctrlKey: true });
    
    // Check if the function was called
    expect(mockUseOverflow.toggleConstrainHeight).toHaveBeenCalledTimes(1);
    
    unmount();
  });
  
  it('calls resetToConstrained when Escape is pressed and focused', () => {
    // Render with focus
    const { unmount } = render(
      <ShowMoreLines constrainHeight={true} isFocused={true} />
    );
    
    // Simulate Escape keypress
    fireEvent.keyDown(document, { key: 'Escape' });
    
    // Check if the function was called
    expect(mockUseOverflow.resetToConstrained).toHaveBeenCalledTimes(1);
    
    unmount();
  });
  
  it('does not respond to keyboard shortcuts when not focused', () => {
    // Render without focus
    const { unmount } = render(
      <ShowMoreLines constrainHeight={true} isFocused={false} />
    );
    
    // Simulate keypresses
    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'h', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'Escape' });
    
    // No functions should be called
    expect(mockUseOverflow.showAllContent).not.toHaveBeenCalled();
    expect(mockUseOverflow.toggleConstrainHeight).not.toHaveBeenCalled();
    expect(mockUseOverflow.resetToConstrained).not.toHaveBeenCalled();
    
    unmount();
  });
});