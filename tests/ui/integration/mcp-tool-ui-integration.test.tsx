/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Integration Tests for MCP Tool UI Components
 * 
 * These tests verify that the UI components for MCP tool management work together correctly,
 * including confirmations, progress feedback, and interaction with the Clean Architecture tool system.
 */

import React from 'react';
import { render, fireEvent, waitFor } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MCPToolConfirmation } from '../../../src/ui/components/tools/MCPToolConfirmation';
import { ToolProgressFeedback } from '../../../src/ui/components/tools/ToolProgressFeedback';
import { useToolConfirmation } from '../../../src/ui/hooks/useToolConfirmation';
import { useToolProgress } from '../../../src/ui/hooks/useToolProgress';
import { 
  ToolConfirmationOutcome, 
  ToolConfirmationType
} from '../../../src/core/domain/tool/tool-interfaces';

// Create a test component that combines the hooks and components
const TestConfirmationComponent = ({ 
  autoConfirm = false, 
  onConfirmation = null
}) => {
  const { 
    confirmationDetails, 
    isConfirmationActive, 
    createMCPConfirmation,
    handleConfirmation 
  } = useToolConfirmation();
  
  // Trigger a confirmation request on first render
  React.useEffect(() => {
    const requestConfirmation = async () => {
      const outcome = await createMCPConfirmation(
        'Test MCP Tool',
        'mock-server',
        'test-tool',
        { query: 'test query' }
      );
      
      if (onConfirmation) {
        onConfirmation(outcome);
      }
    };
    
    requestConfirmation();
  }, []);
  
  // Auto-confirm if requested
  React.useEffect(() => {
    if (autoConfirm && isConfirmationActive) {
      handleConfirmation(ToolConfirmationOutcome.ProceedOnce);
    }
  }, [isConfirmationActive, autoConfirm]);
  
  if (!isConfirmationActive) {
    return <React.Fragment>No active confirmation</React.Fragment>;
  }
  
  return (
    <MCPToolConfirmation
      confirmationDetails={confirmationDetails!}
      serverName="mock-server"
      toolDefinition={{
        name: 'test-tool',
        description: 'Test tool for integration tests',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          }
        }
      }}
      onConfirm={handleConfirmation}
    />
  );
};

const TestProgressComponent = ({ 
  showProgress = true,
  status = 'in_progress',
  percentage = 50
}) => {
  const { updateProgress, registerToolCall } = useToolProgress();
  const [progressCallbackId, setProgressCallbackId] = React.useState('');
  
  // Register a mock tool call on first render
  React.useEffect(() => {
    const mockToolCall = {
      request: {
        callId: 'test-call-id',
        name: 'test-tool'
      },
      status: status,
      tool: {
        name: 'mock-server__test-tool',
        description: 'Test tool'
      }
    } as any;
    
    registerToolCall(mockToolCall);
    setProgressCallbackId('test-call-id');
    
    // Update progress if requested
    if (showProgress && progressCallbackId) {
      updateProgress(progressCallbackId, {
        message: 'Processing data...',
        percentage: percentage,
        status: status,
        step: {
          current: 2,
          total: 5,
          description: 'Step 2: Processing'
        }
      });
    }
  }, [showProgress, status, percentage]);
  
  return (
    <ToolProgressFeedback
      progressData={{
        message: 'Processing data...',
        percentage: percentage,
        status: status,
        step: {
          current: 2,
          total: 5,
          description: 'Step 2: Processing'
        }
      }}
      style="default"
      showDetails={true}
      showTimeEstimate={true}
      showSteps={true}
    />
  );
};

describe('MCP Tool UI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('MCPToolConfirmation Integration', () => {
    it('should render confirmation dialog with correct details', () => {
      const { lastFrame } = render(
        <TestConfirmationComponent />
      );
      
      expect(lastFrame()).toContain('Test MCP Tool');
      expect(lastFrame()).toContain('mock-server');
      expect(lastFrame()).toContain('test-tool');
      expect(lastFrame()).toContain('query:');
      expect(lastFrame()).toContain('test query');
    });
    
    it('should handle confirmation selection', async () => {
      const onConfirmation = vi.fn();
      const { lastFrame } = render(
        <TestConfirmationComponent 
          autoConfirm={true}
          onConfirmation={onConfirmation}
        />
      );
      
      // Wait for auto-confirmation to happen
      await waitFor(() => {
        expect(onConfirmation).toHaveBeenCalledWith(ToolConfirmationOutcome.ProceedOnce);
      });
      
      // UI should update to show no active confirmation
      expect(lastFrame()).toContain('No active confirmation');
    });
  });
  
  describe('ToolProgressFeedback Integration', () => {
    it('should render progress feedback with correct details', () => {
      const { lastFrame } = render(
        <TestProgressComponent />
      );
      
      expect(lastFrame()).toContain('Processing data...');
      expect(lastFrame()).toContain('50%');
      expect(lastFrame()).toContain('2/5'); // Step indicator
    });
    
    it('should update progress display when status changes', () => {
      const { lastFrame } = render(
        <TestProgressComponent status="completed" percentage={100} />
      );
      
      expect(lastFrame()).toContain('100%');
      // Should indicate completion
      expect(lastFrame()).toContain('✓');
    });
    
    it('should handle indeterminate progress', () => {
      const { lastFrame } = render(
        <TestProgressComponent percentage={undefined} />
      );
      
      // Should not show percentage for indeterminate progress
      expect(lastFrame()).not.toContain('%');
    });
    
    it('should handle error status', () => {
      const { lastFrame } = render(
        <TestProgressComponent status="error" />
      );
      
      // Should indicate error
      expect(lastFrame()).toContain('✗');
    });
  });
});