/**
 * Header Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Header } from './Header';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('Header Component', () => {
  it('renders full header with large terminal width', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Header terminalWidth={100} />
      </ThemeProvider>
    );
    
    // Should contain version information
    expect(getByText(/Version/)).toBeTruthy();
    
    // Should contain help information
    expect(getByText(/Type/)).toBeTruthy();
    expect(getByText(/\/help/)).toBeTruthy();
  });
  
  it('renders compact header with small terminal width', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Header terminalWidth={50} />
      </ThemeProvider>
    );
    
    // Should still contain Claude Code text
    expect(getByText(/Claude Code/)).toBeTruthy();
    
    // Should contain help information
    expect(getByText(/Type/)).toBeTruthy();
    expect(getByText(/\/help/)).toBeTruthy();
  });
});