/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { ToolProgressFeedback } from '../ToolProgressFeedback';
import { ToolCall } from '../../../../core/domain/tool/tool-interfaces';

describe('ToolProgressFeedback', () => {
  it('renders correctly with basic progress data', () => {
    const progressData = {
      message: 'Testing in progress',
      percentage: 50,
      status: 'in_progress'
    };
    
    const { lastFrame } = render(
      <ToolProgressFeedback 
        progressData={progressData}
        style="default"
      />
    );
    
    expect(lastFrame()).toContain('Testing in progress');
    expect(lastFrame()).toContain('50%');
  });
  
  it('renders correctly with tool call data', () => {
    const toolCall = {
      status: 'executing',
      request: {
        callId: 'test-call',
        name: 'test-tool',
        params: {}
      },
      tool: {
        name: 'test-tool',
        description: 'A test tool',
        parameters: {}
      },
      progress: {
        message: 'Executing test operation',
        percentage: 75,
        step: 2,
        totalSteps: 4,
        stepDescription: 'Processing data'
      }
    } as unknown as ToolCall;
    
    const { lastFrame } = render(
      <ToolProgressFeedback 
        toolCall={toolCall}
        showSteps={true}
        style="default"
      />
    );
    
    expect(lastFrame()).toContain('test-tool');
    expect(lastFrame()).toContain('Executing test operation');
    expect(lastFrame()).toContain('75%');
    expect(lastFrame()).toContain('2/4'); // Step indicator
  });
  
  it('renders in compact style', () => {
    const progressData = {
      message: 'Testing in progress',
      percentage: 50,
      status: 'in_progress'
    };
    
    const { lastFrame } = render(
      <ToolProgressFeedback 
        progressData={progressData}
        style="compact"
      />
    );
    
    expect(lastFrame()).toContain('Testing in progress');
    expect(lastFrame()).toContain('50%');
    // Compact style has less content
    expect(lastFrame()?.length).toBeLessThan(500);
  });
  
  it('renders in mini style', () => {
    const progressData = {
      message: 'Testing in progress',
      percentage: 50,
      status: 'in_progress'
    };
    
    const { lastFrame } = render(
      <ToolProgressFeedback 
        progressData={progressData}
        style="mini"
      />
    );
    
    expect(lastFrame()).toContain('Testing in progress');
    // Mini style is even more compact
    expect(lastFrame()?.length).toBeLessThan(300);
  });
  
  it('handles indeterminate progress correctly', () => {
    const progressData = {
      message: 'Working...',
      status: 'in_progress'
      // No percentage - should be indeterminate
    };
    
    const { lastFrame } = render(
      <ToolProgressFeedback 
        progressData={progressData}
        style="default"
      />
    );
    
    expect(lastFrame()).toContain('Working...');
    // Should not show percentage for indeterminate progress
    expect(lastFrame()).not.toContain('%');
  });
  
  it('shows time estimates when available', () => {
    const progressData = {
      message: 'Testing in progress',
      percentage: 50,
      status: 'in_progress',
      estimatedTimeRemaining: 120 // 2 minutes
    };
    
    const { lastFrame } = render(
      <ToolProgressFeedback 
        progressData={progressData}
        showTimeEstimate={true}
        style="default"
      />
    );
    
    expect(lastFrame()).toContain('2m remaining');
  });
  
  it('shows step information when available', () => {
    const progressData = {
      message: 'Testing in progress',
      percentage: 50,
      status: 'in_progress',
      step: {
        current: 3,
        total: 5,
        description: 'Processing files'
      }
    };
    
    const { lastFrame } = render(
      <ToolProgressFeedback 
        progressData={progressData}
        showSteps={true}
        style="default"
      />
    );
    
    expect(lastFrame()).toContain('3/5'); // Step indicator
    expect(lastFrame()).toContain('Processing files');
  });
  
  it('shows details when requested', () => {
    const progressData = {
      message: 'Testing in progress',
      percentage: 50,
      status: 'in_progress',
      details: {
        'Files processed': 42,
        'Errors found': 0,
        'Current file': 'test.txt'
      }
    };
    
    const { lastFrame } = render(
      <ToolProgressFeedback 
        progressData={progressData}
        showDetails={true}
        style="default"
      />
    );
    
    expect(lastFrame()).toContain('Files processed:');
    expect(lastFrame()).toContain('42');
    expect(lastFrame()).toContain('Errors found:');
    expect(lastFrame()).toContain('Current file:');
    expect(lastFrame()).toContain('test.txt');
  });
});