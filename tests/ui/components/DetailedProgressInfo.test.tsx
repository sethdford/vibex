/**
 * Detailed Progress Info Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { ProgressStep } from '../../../src/ui/components/DetailedProgressInfo';
import { DetailedProgressInfo } from '../../../src/ui/components/DetailedProgressInfo';
import { ThemeProvider } from '../../../src/ui/contexts/ThemeContext';

describe('DetailedProgressInfo Component', () => {
  const now = Date.now();
  const baseProps = {
    id: 'test-progress',
    label: 'Test Progress',
    value: 50,
    total: 100,
    status: 'running' as const,
    startTime: now - 60000, // 1 minute ago
    updateTime: now - 10000, // 10 seconds ago
    active: true,
  };

  it('renders with minimal props', () => {
    const { container } = render(
      <ThemeProvider>
        <DetailedProgressInfo {...baseProps} />
      </ThemeProvider>
    );
    
    const text = container.textContent || '';
    expect(text).toContain('Test Progress');
    expect(text).toMatch(/50\.0\s*%/);
  });
  
  it('displays message when provided', () => {
    const { container } = render(
      <ThemeProvider>
        <DetailedProgressInfo 
          {...baseProps}
          message="Processing files..." 
        />
      </ThemeProvider>
    );
    
    const text = container.textContent || '';
    expect(text).toContain('Processing files...');
  });
  
  it('shows detailed info when expanded', () => {
    const { container } = render(
      <ThemeProvider>
        <DetailedProgressInfo 
          {...baseProps} 
          initiallyExpanded={true}
        />
      </ThemeProvider>
    );
    
    const text = container.textContent || '';
    // ID should be visible when expanded
    expect(text).toContain('ID:');
    expect(text).toContain('test-progress');
    
    // Timing info should be visible
    expect(text).toContain('Started:');
    expect(text).toContain('Elapsed:');
  });
  
  it('shows remaining time when provided', () => {
    const { container } = render(
      <ThemeProvider>
        <DetailedProgressInfo 
          {...baseProps}
          estimatedTimeRemaining={30}
          initiallyExpanded={true}
        />
      </ThemeProvider>
    );
    
    const text = container.textContent || '';
    expect(text).toContain('Remaining:');
    expect(text).toContain('30s');
  });
  
  it('shows steps when provided', () => {
    const steps: ProgressStep[] = [
      {
        name: 'Step 1: Download',
        status: 'success',
        startTime: now - 30000,
        endTime: now - 25000,
      },
      {
        name: 'Step 2: Process',
        status: 'running',
        startTime: now - 25000,
      },
      {
        name: 'Step 3: Upload',
        status: 'waiting',
      },
    ];
    
    const { container } = render(
      <ThemeProvider>
        <DetailedProgressInfo 
          {...baseProps}
          steps={steps}
          initiallyExpanded={true}
        />
      </ThemeProvider>
    );
    
    const text = container.textContent || '';
    expect(text).toContain('Steps:');
    expect(text).toContain('Step 1: Download');
    expect(text).toContain('Step 2: Process');
    expect(text).toContain('Step 3: Upload');
    expect(text).toContain('5s'); // Duration of Step 1
  });
  
  it('shows completed timestamp when finished', () => {
    const { container } = render(
      <ThemeProvider>
        <DetailedProgressInfo 
          {...baseProps}
          active={false}
          status="success"
          endTime={now}
          initiallyExpanded={true}
        />
      </ThemeProvider>
    );
    
    const text = container.textContent || '';
    expect(text).toContain('Completed:');
  });
});