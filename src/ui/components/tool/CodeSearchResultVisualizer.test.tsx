/**
 * Code Search Result Visualizer Component Tests
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { 
  CodeSearchResultVisualizer, 
  CodeSearchResult,
  parseRipgrepOutput
} from './CodeSearchResultVisualizer';

describe('CodeSearchResultVisualizer', () => {
  // Test search result
  const testResult: CodeSearchResult = {
    pattern: 'test',
    searchDir: './src',
    totalMatches: 3,
    matchedFiles: 2,
    totalFiles: 10,
    searchTime: 100,
    fileMatches: [
      {
        path: 'src/file1.js',
        matchCount: 2,
        matches: [
          {
            path: 'src/file1.js',
            lineNumber: 10,
            columnStart: 5,
            columnEnd: 9,
            line: '    test(\'should work\', () => {',
            beforeContext: ['describe(\'MyComponent\', () => {'],
            afterContext: ['      expect(true).toBe(true);', '    });']
          },
          {
            path: 'src/file1.js',
            lineNumber: 15,
            columnStart: 5,
            columnEnd: 9,
            line: '    test(\'should also work\', () => {',
            beforeContext: [],
            afterContext: ['      expect(false).toBe(false);', '    });']
          }
        ]
      },
      {
        path: 'src/file2.js',
        matchCount: 1,
        matches: [
          {
            path: 'src/file2.js',
            lineNumber: 20,
            columnStart: 7,
            columnEnd: 11,
            line: '      test.skip(\'not implemented\', () => {});',
            beforeContext: ['describe(\'AnotherComponent\', () => {'],
            afterContext: []
          }
        ]
      }
    ]
  };

  it('renders search pattern and summary correctly', () => {
    const { lastFrame } = render(
      <CodeSearchResultVisualizer result={testResult} />
    );

    expect(lastFrame()).toContain('Search: test');
    expect(lastFrame()).toContain('3 matches in 2 files');
    expect(lastFrame()).toContain('(searched 10 files)');
    expect(lastFrame()).toContain('in 100ms');
  });

  it('renders file paths correctly', () => {
    const { lastFrame } = render(
      <CodeSearchResultVisualizer result={testResult} />
    );

    expect(lastFrame()).toContain('src/file1.js');
    expect(lastFrame()).toContain('(2 matches)');
    expect(lastFrame()).toContain('src/file2.js');
    expect(lastFrame()).toContain('(1 match)');
  });

  it('renders matches when files are expanded', () => {
    const { lastFrame } = render(
      <CodeSearchResultVisualizer result={testResult} expandAll={true} />
    );

    // First file matches
    expect(lastFrame()).toContain('10:');
    expect(lastFrame()).toContain('test(\'should work\', () => {');
    expect(lastFrame()).toContain('15:');
    expect(lastFrame()).toContain('test(\'should also work\', () => {');

    // Second file matches
    expect(lastFrame()).toContain('20:');
    expect(lastFrame()).toContain('test.skip(\'not implemented\', () => {});');
  });

  it('renders context lines when showContext is true', () => {
    const { lastFrame } = render(
      <CodeSearchResultVisualizer result={testResult} expandAll={true} showContext={true} />
    );

    // Context lines
    expect(lastFrame()).toContain('describe(\'MyComponent\', () => {');
    expect(lastFrame()).toContain('expect(true).toBe(true);');
    expect(lastFrame()).toContain('});');
    expect(lastFrame()).toContain('describe(\'AnotherComponent\', () => {');
  });

  it('does not render context lines when showContext is false', () => {
    const { lastFrame } = render(
      <CodeSearchResultVisualizer result={testResult} expandAll={true} showContext={false} />
    );

    // Check that match lines are present
    expect(lastFrame()).toContain('test(\'should work\', () => {');
    expect(lastFrame()).toContain('test(\'should also work\', () => {');
    
    // But context lines are not
    expect(lastFrame()).not.toContain('describe(\'MyComponent\', () => {');
    expect(lastFrame()).not.toContain('expect(true).toBe(true);');
  });

  it('limits files displayed when maxFiles is specified', () => {
    const { lastFrame } = render(
      <CodeSearchResultVisualizer result={testResult} maxFiles={1} />
    );

    // First file should be present
    expect(lastFrame()).toContain('src/file1.js');
    
    // Second file should not be present
    expect(lastFrame()).not.toContain('src/file2.js');
    
    // Should show a message about limited results
    expect(lastFrame()).toContain('Showing 1 of 2 files with matches');
  });

  describe('parseRipgrepOutput', () => {
    it('correctly parses ripgrep output format', () => {
      const ripgrepOutput = `src/file1.js:10:5:    test('should work', () => {
src/file1.js:15:5:    test('should also work', () => {
src/file2.js:20:7:      test.skip('not implemented', () => {});`;

      const result = parseRipgrepOutput(ripgrepOutput, 'test', './src', 0, 100);
      
      expect(result.pattern).toBe('test');
      expect(result.searchDir).toBe('./src');
      expect(result.totalMatches).toBe(3);
      expect(result.matchedFiles).toBe(2);
      expect(result.searchTime).toBe(100);
      
      // Check file matches
      expect(result.fileMatches.length).toBe(2);
      expect(result.fileMatches[0].path).toBe('src/file1.js');
      expect(result.fileMatches[0].matchCount).toBe(2);
      expect(result.fileMatches[1].path).toBe('src/file2.js');
      expect(result.fileMatches[1].matchCount).toBe(1);
      
      // Check individual matches
      expect(result.fileMatches[0].matches[0].lineNumber).toBe(10);
      expect(result.fileMatches[0].matches[0].columnStart).toBe(5);
      expect(result.fileMatches[0].matches[1].lineNumber).toBe(15);
      expect(result.fileMatches[1].matches[0].lineNumber).toBe(20);
      expect(result.fileMatches[1].matches[0].columnStart).toBe(7);
    });

    it('handles empty output', () => {
      const result = parseRipgrepOutput('', 'test', './src');
      
      expect(result.totalMatches).toBe(0);
      expect(result.matchedFiles).toBe(0);
      expect(result.fileMatches.length).toBe(0);
    });
  });
});