/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationServiceImpl } from '../validation';

describe('ValidationService', () => {
  let validationService: ValidationServiceImpl;

  beforeEach(() => {
    validationService = new ValidationServiceImpl();
  });

  it('should validate simple required properties', () => {
    const schema = {
      type: 'object',
      required: ['name', 'age']
    };
    
    // Valid object
    const validResult = validationService.validateAgainstSchema(
      { name: 'John', age: 30 }, 
      schema
    );
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toBeUndefined();
    
    // Invalid object (missing property)
    const invalidResult = validationService.validateAgainstSchema(
      { name: 'John' }, 
      schema
    );
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors).toBeDefined();
    expect(invalidResult.errors![0]).toContain('age');
  });

  it('should validate object types', () => {
    const schema = {
      type: 'object',
      required: ['name']
    };
    
    // Invalid type (string instead of object)
    const invalidResult = validationService.validateAgainstSchema(
      'John', 
      schema
    );
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors![0]).toContain('object');
  });

  it('should support custom validators', () => {
    validationService.addCustomValidator('positiveNumber', (value) => {
      if (typeof value !== 'number') {
        return 'Must be a number';
      }
      if (value <= 0) {
        return 'Must be positive';
      }
      return null;
    });
    
    // Test the custom validator using a direct method
    // This tests a bit more of the implementation details but it's useful
    // for ensuring the custom validator works correctly
    expect(validationService.runCustomValidators(5, ['positiveNumber'])).toBeNull();
    expect(validationService.runCustomValidators(-5, ['positiveNumber'])).toBe('Must be positive');
    expect(validationService.runCustomValidators('5', ['positiveNumber'])).toBe('Must be a number');
  });

  it('should validate and transform tool results', () => {
    // Already formatted result
    const formattedResult = {
      callId: 'test',
      success: true,
      data: 'result'
    };
    const validatedFormattedResult = validationService.validateToolResult(formattedResult);
    expect(validatedFormattedResult).toBe(formattedResult);
    
    // Error result
    const error = new Error('Test error');
    const validatedErrorResult = validationService.validateToolResult(error);
    expect(validatedErrorResult.success).toBe(false);
    expect(validatedErrorResult.error).toBe(error);
    
    // Raw data result
    const rawResult = 'result';
    const validatedRawResult = validationService.validateToolResult(rawResult);
    expect(validatedRawResult.success).toBe(true);
    expect(validatedRawResult.data).toBe(rawResult);
  });
});