/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Code Colorizer Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CodeColorizer, colorizeCode } from './CodeColorizer.js';
import { ThemeProvider } from '../contexts/ThemeContext.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Sample code for tests
const jsCode = `function hello(name) {
  // This is a comment
  console.log(\`Hello, \${name}!\`);
  return true;
}`;

const pyCode = `def hello(name):
    # This is a comment
    print(f"Hello, {name}!")
    return True`;

describe('CodeColorizer Component', () => {
  it('renders with JavaScript code', () => {
    const { container } = render(
      <ThemeProvider>
        <CodeColorizer code={jsCode} language="js" />
      </ThemeProvider>
    );
    
    // Should render successfully
    expect(container).toBeTruthy();
  });
  
  it('renders with Python code', () => {
    const { container } = render(
      <ThemeProvider>
        <CodeColorizer code={pyCode} language="python" />
      </ThemeProvider>
    );
    
    // Should render successfully
    expect(container).toBeTruthy();
  });
  
  it('shows line numbers when enabled', () => {
    const { getAllByText } = render(
      <ThemeProvider>
        <CodeColorizer code={jsCode} language="js" showLineNumbers={true} />
      </ThemeProvider>
    );
    
    // Should show line numbers (1-5)
    expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });
  
  it('hides line numbers when disabled', () => {
    const { queryByText } = render(
      <ThemeProvider>
        <CodeColorizer code={jsCode} language="js" showLineNumbers={false} />
      </ThemeProvider>
    );
    
    // Shouldn't find line numbers
    expect(queryByText('1')).toBeNull();
  });
  
  it('truncates content when maxHeight is specified', () => {
    const longCode = Array(10).fill('console.log("test");').join('\n');
    const maxHeight = 5;
    
    const { getByText } = render(
      <ThemeProvider>
        <CodeColorizer code={longCode} language="js" maxHeight={maxHeight} />
      </ThemeProvider>
    );
    
    // Should show truncation message
    expect(getByText('... 5 more lines')).toBeTruthy();
  });
  
  it('falls back to plain text for unknown languages', () => {
    const { container } = render(
      <ThemeProvider>
        <CodeColorizer code={jsCode} language="unknown-language" />
      </ThemeProvider>
    );
    
    // Should still render the code
    expect(container.textContent).toContain('function hello');
  });
});

describe('colorizeCode Function', () => {
  it('returns a React node', () => {
    const result = colorizeCode(jsCode, 'js');
    expect(React.isValidElement(result)).toBe(true);
  });
  
  it('passes parameters correctly', () => {
    const maxHeight = 10;
    const maxWidth = 80;
    const showLineNumbers = false;
    
    const result = colorizeCode(jsCode, 'js', maxHeight, maxWidth, showLineNumbers);
    expect(React.isValidElement(result)).toBe(true);
    
    // We can't easily test prop passing in the returned element
    // This test mainly ensures the function doesn't crash
  });
});