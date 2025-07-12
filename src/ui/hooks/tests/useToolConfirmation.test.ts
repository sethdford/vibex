/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useToolConfirmation } from '../useToolConfirmation';
import { ToolConfirmationOutcome } from '../../../core/domain/tool/tool-interfaces';

describe('useToolConfirmation', () => {
  test('should initialize with no active confirmation', () => {
    const { result } = renderHook(() => useToolConfirmation());
    
    expect(result.current.isConfirmationActive).toBe(false);
    expect(result.current.confirmationDetails).toBeNull();
  });

  test('should handle confirmation request with proper params', async () => {
    const { result } = renderHook(() => useToolConfirmation());
    
    const confirmationDetails = {
      type: 'exec' as const,
      title: 'Test Confirmation',
      description: 'Test description',
      params: { test: 'value' }
    };

    act(() => {
      result.current.requestConfirmation(confirmationDetails);
    });

    expect(result.current.isConfirmationActive).toBe(true);
    expect(result.current.confirmationDetails).toEqual(confirmationDetails);
  });

  test('should handle confirmation outcome', () => {
    const { result } = renderHook(() => useToolConfirmation());
    
    const confirmationDetails = {
      type: 'exec' as const,
      title: 'Test Confirmation',
      description: 'Test description',
      params: { test: 'value' }
    };

    act(() => {
      result.current.requestConfirmation(confirmationDetails);
    });

    act(() => {
      result.current.handleConfirmation(ToolConfirmationOutcome.ProceedOnce);
    });

    expect(result.current.isConfirmationActive).toBe(false);
    expect(result.current.confirmationDetails).toBeNull();
  });

  test('should handle confirmation cancellation', () => {
    const { result } = renderHook(() => useToolConfirmation());
    
    const confirmationDetails = {
      type: 'exec' as const,
      title: 'Test Confirmation',
      description: 'Test description',
      params: { test: 'value' }
    };

    act(() => {
      result.current.requestConfirmation(confirmationDetails);
    });

    act(() => {
      result.current.cancelConfirmation();
    });

    expect(result.current.isConfirmationActive).toBe(false);
    expect(result.current.confirmationDetails).toBeNull();
  });
});