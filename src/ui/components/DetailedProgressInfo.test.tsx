/**
 * Detailed Progress Info Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DetailedProgressInfo, ProgressStep } from './DetailedProgressInfo';
import { ThemeProvider } from '../contexts/ThemeContext';

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
    const { getByText } = render(
      <ThemeProvider>
        <DetailedProgressInfo {...baseProps} />
      </ThemeProvider>
    );
    
    expect(getByText('Test Progress')).toBeTruthy();
    expect(getByText('50.0%')).toBeTruthy();
  });
  
  it('displays message when provided', () => {
    const { getByText } = render(
      <ThemeProvider>
        <DetailedProgressInfo 
          {...baseProps}
          message="Processing files..." 
        />
      </ThemeProvider>
    );
    
    expect(getByText('Processing files...')).toBeTruthy();
  });
  
  it('shows detailed info when expanded', () => {
    const { getByText } = render(
      <ThemeProvider>
        <DetailedProgressInfo 
          {...baseProps} 
          initiallyExpanded={true}
        />
      </ThemeProvider>
    );
    
    // ID should be visible when expanded
    expect(getByText('ID:')).toBeTruthy();
    expect(getByText('test-progress')).toBeTruthy();
    
    // Timing info should be visible
    expect(getByText('Started:')).toBeTruthy();
    expect(getByText('Elapsed:')).toBeTruthy();
  });
  
  it('shows remaining time when provided', () => {
    const { getByText } = render(
      <ThemeProvider>
        <DetailedProgressInfo 
          {...baseProps}
          estimatedTimeRemaining={30}
          initiallyExpanded={true}
        />
      </ThemeProvider>
    );
    
    expect(getByText('Remaining:')).toBeTruthy();
    expect(getByText('30s')).toBeTruthy();
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
    
    const { getByText } = render(
      <ThemeProvider>
        <DetailedProgressInfo 
          {...baseProps}
          steps={steps}
          initiallyExpanded={true}
        />
      </ThemeProvider>
    );
    
    expect(getByText('Steps:')).toBeTruthy();
    expect(getByText('Step 1: Download')).toBeTruthy();
    expect(getByText('Step 2: Process')).toBeTruthy();
    expect(getByText('Step 3: Upload')).toBeTruthy();
    expect(getByText('5s')).toBeTruthy(); // Duration of Step 1
  });
  
  it('shows completed timestamp when finished', () => {
    const { getByText } = render(
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
    
    expect(getByText('Completed:')).toBeTruthy();
  });
});