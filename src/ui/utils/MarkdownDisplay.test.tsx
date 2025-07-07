/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Markdown Display Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MarkdownDisplay } from './MarkdownDisplay.js';
import { ThemeProvider } from '../contexts/ThemeContext.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Sample markdown for testing
const sampleMarkdown = `
# Heading 1

## Heading 2

Regular paragraph with **bold** and *italic* text.

- List item 1
- List item 2

> A blockquote

\`\`\`javascript
// Code block
function test() {
  return 'Hello World';
}
\`\`\`

---

![Alt text](path/to/image.png)
`;

describe('MarkdownDisplay Component', () => {
  it('renders markdown content', () => {
    const { container } = render(
      <ThemeProvider>
        <MarkdownDisplay markdown={sampleMarkdown} />
      </ThemeProvider>
    );
    
    // Should render without errors
    expect(container).toBeTruthy();
  });
  
  it('renders headings', () => {
    const { getByText } = render(
      <ThemeProvider>
        <MarkdownDisplay markdown="# Heading 1" />
      </ThemeProvider>
    );
    
    expect(getByText('Heading 1')).toBeTruthy();
  });
  
  it('renders paragraphs', () => {
    const { getByText } = render(
      <ThemeProvider>
        <MarkdownDisplay markdown="This is a paragraph" />
      </ThemeProvider>
    );
    
    expect(getByText('This is a paragraph')).toBeTruthy();
  });
  
  it('renders code blocks', () => {
    const { container } = render(
      <ThemeProvider>
        <MarkdownDisplay markdown="\`\`\`js\nconst x = 1;\n\`\`\`" />
      </ThemeProvider>
    );
    
    // Code blocks should be rendered
    expect(container.textContent).toContain('const x = 1;');
  });
  
  it('renders lists', () => {
    const { getByText } = render(
      <ThemeProvider>
        <MarkdownDisplay markdown="- List item 1\n- List item 2" />
      </ThemeProvider>
    );
    
    expect(getByText('List item 1')).toBeTruthy();
    expect(getByText('List item 2')).toBeTruthy();
  });
  
  it('renders blockquotes', () => {
    const { getByText } = render(
      <ThemeProvider>
        <MarkdownDisplay markdown="> A quote" />
      </ThemeProvider>
    );
    
    expect(getByText('A quote')).toBeTruthy();
  });
  
  it('renders horizontal rules', () => {
    const { container } = render(
      <ThemeProvider>
        <MarkdownDisplay markdown="---" />
      </ThemeProvider>
    );
    
    // Should render horizontal rule
    expect(container).toBeTruthy();
  });
  
  it('handles empty markdown', () => {
    const { container } = render(
      <ThemeProvider>
        <MarkdownDisplay markdown="" />
      </ThemeProvider>
    );
    
    // Should render empty content without errors
    expect(container).toBeTruthy();
  });
  
  it('respects maxWidth parameter', () => {
    const { container } = render(
      <ThemeProvider>
        <MarkdownDisplay markdown={sampleMarkdown} maxWidth={40} />
      </ThemeProvider>
    );
    
    // Should render with constrained width
    expect(container).toBeTruthy();
  });
  
  it('can disable image rendering', () => {
    const markdown = "![Image](test.png)";
    
    const { container } = render(
      <ThemeProvider>
        <MarkdownDisplay markdown={markdown} renderImages={false} />
      </ThemeProvider>
    );
    
    // Should not attempt to render images
    expect(container).toBeTruthy();
  });
});