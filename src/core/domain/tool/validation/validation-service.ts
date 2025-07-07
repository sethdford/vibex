/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { ValidationResult, ValidationService } from '../tool-services';
import { EventBus, ValidationFailedEvent } from '../tool-events';
import { ToolResult } from '../tool-interfaces';

// Lightweight Ajv-like validation interface
interface SchemaValidator {
  validate(schema: Record<string, unknown>, data: unknown): boolean;
  errors: Array<{message: string}> | null;
}

/**
 * Implementation of ValidationService for validating tool parameters
 * 
 * Uses a lightweight validation approach with support for custom validators
 * and caching for performance.
 */
export class ValidationServiceImpl implements ValidationService {
  /**
   * Cache of compiled validation schemas for performance
   */
  private schemaCache = new Map<string, SchemaValidator>();
  
  /**
   * Custom validators by name
   */
  private customValidators = new Map<string, (value: unknown) => string | null>();
  
  /**
   * Optional event bus for publishing events
   */
  private eventBus?: EventBus;
  
  /**
   * Optional validator implementation (could be Ajv or a lightweight alternative)
   */
  private validator?: SchemaValidator;
  
  /**
   * Constructor
   */
  constructor(validator?: SchemaValidator, eventBus?: EventBus) {
    this.validator = validator;
    this.eventBus = eventBus;
  }

  /**
   * Validate a value against a JSON schema
   */
  validateAgainstSchema(value: unknown, schema: Record<string, unknown>): ValidationResult {
    try {
      // If we have a validator, use it
      if (this.validator) {
        const valid = this.validator.validate(schema, value);
        if (valid) {
          return { valid: true };
        }
        
        const errors = this.validator.errors?.map(err => err.message) || ['Validation failed'];
        
        // Publish validation failed event if we have an event bus
        if (this.eventBus && schema.name) {
          this.eventBus.publish(new ValidationFailedEvent(schema.name as string, errors));
        }
        
        return {
          valid: false,
          errors
        };
      }
      
      // Simple validation for required properties
      if (schema.type === 'object' && schema.required && Array.isArray(schema.required)) {
        const errors: string[] = [];
        const required = schema.required as string[];
        
        if (!value || typeof value !== 'object') {
          return {
            valid: false,
            errors: ['Expected an object']
          };
        }
        
        for (const prop of required) {
          if (!(prop in (value as Record<string, unknown>))) {
            errors.push(`Missing required property: ${prop}`);
          }
        }
        
        if (errors.length > 0) {
          // Publish validation failed event if we have an event bus
          if (this.eventBus && schema.name) {
            this.eventBus.publish(new ValidationFailedEvent(schema.name as string, errors));
          }
          
          return {
            valid: false,
            errors
          };
        }
        
        return { valid: true };
      }
      
      // If we don't have enough validation info, assume valid
      return { valid: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [`Validation error: ${errorMessage}`]
      };
    }
  }

  /**
   * Add a custom validator function
   */
  addCustomValidator(name: string, validatorFn: (value: unknown) => string | null): void {
    this.customValidators.set(name, validatorFn);
  }

  /**
   * Clear the validation cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }
  
  /**
   * Run custom validators on a value
   */
  runCustomValidators(value: unknown, validatorNames: string[]): string | null {
    for (const name of validatorNames) {
      const validator = this.customValidators.get(name);
      if (validator) {
        const error = validator(value);
        if (error) {
          return error;
        }
      }
    }
    return null;
  }
  
  /**
   * Validate and transform tool execution result
   * 
   * This helps normalize results from different tools
   */
  validateToolResult(result: unknown): ToolResult {
    // If result is already a ToolResult, return it
    if (result && typeof result === 'object' && 'callId' in result && 'success' in result) {
      return result as ToolResult;
    }
    
    // If result is an error, wrap it
    if (result instanceof Error) {
      return {
        callId: 'unknown',
        success: false,
        error: result
      };
    }
    
    // Otherwise, wrap in a successful result
    return {
      callId: 'unknown',
      success: true,
      data: result
    };
  }
}

/**
 * Factory function to create a ValidationService
 */
export function createValidationService(
  validator?: SchemaValidator, 
  eventBus?: EventBus
): ValidationService {
  return new ValidationServiceImpl(validator, eventBus);
}