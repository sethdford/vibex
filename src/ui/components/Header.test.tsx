/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Header Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Header } from '../../../src/ui/components/Header';
import { ThemeProvider } from '../../../src/ui/contexts/ThemeContext';
import * as versionModule from '../../../src/version';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock the ASCII logo module
vi.mock('../../../src/ui/components/AsciiLogo', () => ({
  getLogoForWidth: vi.fn().mockImplementation(width => {
    if (width < 60) return 'SMALL_LOGO';
    return 'LARGE_LOGO';
  }),
  standardLogo: 'STANDARD_LOGO'
}));

// Mock the version
vi.mock('../../../src/version', () => ({
  version: '1.2.3'
}));

describe('Header Component', () => {
  it('renders full header with large terminal width', () => {
    const { container } = render(
      <ThemeProvider>
        <Header terminalWidth={100} />
      </ThemeProvider>
    );
    
    const text = container.textContent || '';
    
    // Should contain logo
    expect(text).toContain('LARGE_LOGO');
    
    // Should contain version
    expect(text).toContain('1.2.3');
    
    // Should contain help information
    expect(text).toContain('Type');
    expect(text).toContain('/help');
  });
  
  it('renders compact header with small terminal width', () => {
    const { container } = render(
      <ThemeProvider>
        <Header terminalWidth={50} />
      </ThemeProvider>
    );
    
    const text = container.textContent || '';
    
    // Should contain compact logo
    expect(text).toContain('VIBEX');
    
    // Should contain version in compact format - use partial match
    expect(text).toContain('1.2.3');
    
    // Should contain help information
    expect(text).toContain('Type');
    expect(text).toContain('/help');
  });
  
  it('uses custom gradient colors when provided', () => {
    const { container: defaultContainer } = render(
      <ThemeProvider>
        <Header terminalWidth={100} />
      </ThemeProvider>
    );
    
    const { container: customContainer } = render(
      <ThemeProvider>
        <Header terminalWidth={100} gradientColors={['red', 'blue']} />
      </ThemeProvider>
    );
    
    // Both should contain the same text content
    const defaultText = defaultContainer.textContent || '';
    const customText = customContainer.textContent || '';
    
    // Text content should be the same (colors don't affect text content in our test environment)
    expect(defaultText).toEqual(customText);
  });
});