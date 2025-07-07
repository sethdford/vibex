/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { useToolConfirmation } from '../useToolConfirmation';
import { ToolConfirmationOutcome, ToolConfirmationType } from '../../../core/domain/tool/tool-interfaces';

describe('useToolConfirmation', () => {
  it('should initialize with inactive confirmation', () => {
    const { result } = renderHook(() => useToolConfirmation());
    
    expect(result.current.isConfirmationActive).toBe(false);
    expect(result.current.confirmationDetails).toBeNull();
  });
  
  it('should activate confirmation on request', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useToolConfirmation());
    
    // Request a confirmation
    const confirmationPromise = result.current.requestConfirmation({
      type: ToolConfirmationType.Warning,
      title: 'Test Confirmation',
      description: 'Test description'
    });
    
    // Check that confirmation is active
    expect(result.current.isConfirmationActive).toBe(true);
    expect(result.current.confirmationDetails).not.toBeNull();
    expect(result.current.confirmationDetails?.title).toBe('Test Confirmation');
    
    // Resolve the confirmation
    act(() => {
      result.current.handleConfirmation(ToolConfirmationOutcome.ProceedOnce);
    });
    
    // Check that promise resolves with correct outcome
    const outcome = await confirmationPromise;
    expect(outcome).toBe(ToolConfirmationOutcome.ProceedOnce);
    
    // Check that confirmation is inactive again
    expect(result.current.isConfirmationActive).toBe(false);
    expect(result.current.confirmationDetails).toBeNull();
  });
  
  it('should handle cancellation', async () => {
    const { result } = renderHook(() => useToolConfirmation());
    
    // Request a confirmation
    const confirmationPromise = result.current.requestConfirmation({
      type: ToolConfirmationType.Warning,
      title: 'Test Confirmation',
      description: 'Test description'
    });
    
    // Cancel the confirmation
    act(() => {
      result.current.cancelConfirmation();
    });
    
    // Check that promise resolves with cancelled outcome
    const outcome = await confirmationPromise;
    expect(outcome).toBe(ToolConfirmationOutcome.Cancelled);
    
    // Check that confirmation is inactive again
    expect(result.current.isConfirmationActive).toBe(false);
  });
  
  it('should create MCP confirmation correctly', async () => {
    const { result } = renderHook(() => useToolConfirmation());
    
    // Create an MCP confirmation
    act(() => {
      result.current.createMCPConfirmation(
        'Test MCP Tool',
        'test-server',
        'test-tool',
        { param1: 'value1' }
      );
    });
    
    // Check that confirmation has correct details
    expect(result.current.isConfirmationActive).toBe(true);
    expect(result.current.confirmationDetails?.title).toBe('Test MCP Tool');
    expect(result.current.confirmationDetails?.description).toContain('test-tool');
    expect(result.current.confirmationDetails?.description).toContain('test-server');
    expect(result.current.confirmationDetails?.params).toEqual({ param1: 'value1' });
    
    // Clean up
    act(() => {
      result.current.cancelConfirmation();
    });
  });
});