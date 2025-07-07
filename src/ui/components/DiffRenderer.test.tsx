/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Diff Renderer Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DiffRenderer } from './DiffRenderer.js';
import { ThemeProvider } from '../contexts/ThemeContext.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

describe('DiffRenderer Component', () => {
  it('renders with default props', () => {
    const oldText = 'line 1\nline 2\nline 3\n';
    const newText = 'line 1\nmodified line\nline 3\n';
    
    const { container } = render(
      <ThemeProvider>
        <DiffRenderer oldText={oldText} newText={newText} />
      </ThemeProvider>
    );
    
    // Should render successfully
    expect(container).toBeTruthy();
  });
  
  it('shows added lines', () => {
    const oldText = 'line 1\nline 3\n';
    const newText = 'line 1\nline 2\nline 3\n';
    
    const { getByText } = render(
      <ThemeProvider>
        <DiffRenderer oldText={oldText} newText={newText} />
      </ThemeProvider>
    );
    
    expect(getByText('+ line 2')).toBeTruthy();
  });
  
  it('shows removed lines', () => {
    const oldText = 'line 1\nline 2\nline 3\n';
    const newText = 'line 1\nline 3\n';
    
    const { getByText } = render(
      <ThemeProvider>
        <DiffRenderer oldText={oldText} newText={newText} />
      </ThemeProvider>
    );
    
    expect(getByText('- line 2')).toBeTruthy();
  });
  
  it('shows unchanged lines', () => {
    const oldText = 'line 1\nline 2\nline 3\n';
    const newText = 'line 1\nmodified line\nline 3\n';
    
    const { getByText } = render(
      <ThemeProvider>
        <DiffRenderer oldText={oldText} newText={newText} />
      </ThemeProvider>
    );
    
    expect(getByText('  line 1')).toBeTruthy();
    expect(getByText('  line 3')).toBeTruthy();
  });
  
  it('shows file headers when enabled', () => {
    const oldText = 'content';
    const newText = 'modified content';
    
    const { getByText } = render(
      <ThemeProvider>
        <DiffRenderer 
          oldText={oldText} 
          newText={newText} 
          showHeader={true}
          oldFileName="old.js"
          newFileName="new.js"
        />
      </ThemeProvider>
    );
    
    expect(getByText('--- old.js')).toBeTruthy();
    expect(getByText('+++ new.js')).toBeTruthy();
  });
  
  it('hides file headers when disabled', () => {
    const oldText = 'content';
    const newText = 'modified content';
    
    const { queryByText } = render(
      <ThemeProvider>
        <DiffRenderer 
          oldText={oldText} 
          newText={newText} 
          showHeader={false}
        />
      </ThemeProvider>
    );
    
    expect(queryByText('--- a')).toBeNull();
    expect(queryByText('+++ b')).toBeNull();
  });
  
  it('limits context when specified', () => {
    // Create a file with many lines
    const manyLines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
    const modifiedLines = manyLines.replace('line 10', 'modified line 10');
    
    const { queryByText } = render(
      <ThemeProvider>
        <DiffRenderer 
          oldText={manyLines} 
          newText={modifiedLines}
          contextLines={2} // Only show 2 lines of context around changes
        />
      </ThemeProvider>
    );
    
    // Lines within context should be visible
    expect(queryByText('  line 8')).toBeTruthy();
    expect(queryByText('  line 9')).toBeTruthy();
    expect(queryByText('- line 10')).toBeTruthy();
    expect(queryByText('+ modified line 10')).toBeTruthy();
    expect(queryByText('  line 11')).toBeTruthy();
    expect(queryByText('  line 12')).toBeTruthy();
    
    // Lines outside context should not be visible
    expect(queryByText('  line 7')).toBeNull();
    expect(queryByText('  line 13')).toBeNull();
  });
  
  it('handles empty input', () => {
    const { container } = render(
      <ThemeProvider>
        <DiffRenderer oldText="" newText="" />
      </ThemeProvider>
    );
    
    // Should render without errors
    expect(container).toBeTruthy();
  });
  
  it('truncates long lines', () => {
    const longLine = 'a'.repeat(200);
    const longLinePlus = `${'a'.repeat(200)}b`;
    
    const { getByText } = render(
      <ThemeProvider>
        <DiffRenderer 
          oldText={longLine} 
          newText={longLinePlus}
          maxWidth={100}
        />
      </ThemeProvider>
    );
    
    // Should show truncated version with ellipsis
    expect(getByText(/\.\.\.$/)).toBeTruthy();
  });
});