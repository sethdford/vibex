/**
 * Error Display Component Tests
 */

import React from 'react';
// Mocking ink rendering since ink-testing-library may not be available
const render = (component: React.ReactNode) => ({ lastFrame: () => 'Mocked frame' });
import ErrorDisplay from './ErrorDisplay.js';
import { UserError, ErrorCategory, ErrorLevel } from '../../errors/types.js';

describe('ErrorDisplay component', () => {
  test('renders plain error message', () => {
    const { lastFrame } = render(
      <ErrorDisplay error="Something went wrong" />
    );
    
    expect(lastFrame()).toContain('Error: Something went wrong');
  });
  
  test('renders Error object properly', () => {
    const error = new Error('Test error message');
    const { lastFrame } = render(
      <ErrorDisplay error={error} />
    );
    
    expect(lastFrame()).toContain('Error: Test error message');
  });
  
  test('renders user error with category and level', () => {
    const userError = new UserError('Authentication failed', {
      category: ErrorCategory.AUTHENTICATION, 
      level: ErrorLevel.MAJOR
    });
    
    const { lastFrame } = render(
      <ErrorDisplay error={userError} />
    );
    
    expect(lastFrame()).toContain('Error: Authentication failed');
    expect(lastFrame()).toContain('Category: authentication');
  });
  
  test('renders resolution steps from string', () => {
    const { lastFrame } = render(
      <ErrorDisplay 
        error="Invalid API key" 
        resolution="Check your authentication settings."
      />
    );
    
    expect(lastFrame()).toContain('To resolve this issue:');
    expect(lastFrame()).toContain('Check your authentication settings.');
  });
  
  test('renders resolution steps from array', () => {
    const resolutionSteps = [
      'Check your authentication settings.',
      'Verify your API key is valid.',
      'Ensure your account has necessary permissions.'
    ];
    
    const { lastFrame } = render(
      <ErrorDisplay 
        error="Permission denied" 
        resolution={resolutionSteps}
      />
    );
    
    expect(lastFrame()).toContain('To resolve this issue:');
    resolutionSteps.forEach(step => {
      expect(lastFrame()).toContain(step);
    });
  });
  
  test('renders context information', () => {
    const { lastFrame } = render(
      <ErrorDisplay 
        error="File not found"
        context={{
          component: 'FileReader',
          action: 'read',
          file: '/path/to/file.txt',
          line: 42
        }}
      />
    );
    
    expect(lastFrame()).toContain('Context:');
    expect(lastFrame()).toContain('Component: FileReader');
    expect(lastFrame()).toContain('Action: read');
    expect(lastFrame()).toContain('File: /path/to/file.txt');
    expect(lastFrame()).toContain('42');
  });
  
  test('renders user error with all properties', () => {
    const userError = new UserError('Rate limit exceeded', {
      category: ErrorCategory.RATE_LIMIT,
      level: ErrorLevel.MAJOR,
      resolution: [
        'Wait a moment before retrying.',
        'Implement request throttling.'
      ],
      details: {
        limit: 100,
        remaining: 0,
        resetAt: '2023-07-01T00:00:00Z'
      }
    });
    
    const { lastFrame } = render(
      <ErrorDisplay error={userError} showStackTrace />
    );
    
    expect(lastFrame()).toContain('Error: Rate limit exceeded');
    expect(lastFrame()).toContain('Category: rate limit');
    expect(lastFrame()).toContain('Wait a moment before retrying.');
    expect(lastFrame()).toContain('Implement request throttling.');
  });
});