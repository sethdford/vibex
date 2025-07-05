/**
 * Unit tests for schema validation
 */

import { jest } from '@jest/globals';
import { appConfigSchema, SchemaValidator, CLAUDE_4_MODELS } from '../../../src/config/schema.js';
import { defaults } from '../../../src/config/defaults.js';
import { z } from 'zod';

describe('Config Schema Validation', () => {
  describe('AppConfigSchema', () => {
    test('should validate default configuration', () => {
      // The default configuration should be valid against the schema
      const result = appConfigSchema.safeParse(defaults);
      expect(result.success).toBe(true);
    });

    test('should validate partial configuration', () => {
      const partialConfig = {
        api: {
          baseUrl: 'https://custom-api.example.com'
        },
        ai: {
          model: CLAUDE_4_MODELS.CLAUDE_4_OPUS,
          temperature: 0.7
        }
      };
      
      const result = appConfigSchema.safeParse(partialConfig);
      expect(result.success).toBe(true);
      
      if (result.success) {
        // Should fill in defaults for missing fields
        expect(result.data.api.timeout).toBe(60000);
        expect(result.data.ai.maxTokens).toBe(4096);
        expect(result.data.terminal).toBeDefined();
        expect(result.data.logger).toBeDefined();
      }
    });

    test('should reject invalid configuration values', () => {
      const invalidConfig = {
        api: {
          baseUrl: 'not-a-url',
          timeout: -1000
        },
        ai: {
          temperature: 2.0,
          maxTokens: -100
        },
        terminal: {
          theme: 'invalid-theme'
        }
      };
      
      const result = appConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.errors;
        
        // Should have multiple validation errors
        expect(errors.length).toBeGreaterThan(1);
        
        // Check for specific error messages
        const errorPaths = errors.map(e => e.path.join('.'));
        expect(errorPaths).toContain('api.baseUrl');
        expect(errorPaths).toContain('api.timeout');
        expect(errorPaths).toContain('ai.temperature');
        expect(errorPaths).toContain('ai.maxTokens');
        expect(errorPaths).toContain('terminal.theme');
      }
    });

    test('should allow additional unknown properties', () => {
      const configWithExtra = {
        ...defaults,
        extraProperty: 'some value',
        customSettings: {
          something: true
        }
      };
      
      // The schema should be lenient with additional properties
      const result = appConfigSchema.safeParse(configWithExtra);
      expect(result.success).toBe(true);
    });
  });

  describe('SchemaValidator', () => {
    // Test schema
    const testSchema = z.object({
      name: z.string().min(3),
      age: z.number().int().positive(),
      email: z.string().email().optional()
    });
    
    type TestType = z.infer<typeof testSchema>;
    
    let validator: SchemaValidator<TestType>;
    
    beforeEach(() => {
      validator = new SchemaValidator<TestType>(testSchema);
    });

    test('should validate valid data', () => {
      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      };
      
      expect(() => validator.validate(validData)).not.toThrow();
      
      const result = validator.validateSafe(validData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    test('should reject invalid data', () => {
      const invalidData = {
        name: 'Jo', // Too short
        age: -5, // Negative
        email: 'not-an-email' // Invalid email
      };
      
      expect(() => validator.validate(invalidData)).toThrow();
      
      const result = validator.validateSafe(invalidData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.errors.length).toBe(3);
      }
    });

    test('should handle type mismatches', () => {
      const wrongTypeData = {
        name: 123, // Should be string
        age: '30', // Should be number
        email: true // Should be string
      };
      
      expect(() => validator.validate(wrongTypeData as any)).toThrow();
      
      const result = validator.validateSafe(wrongTypeData as any);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.errors.length).toBe(3);
      }
    });

    test('should validate data with optional fields', () => {
      // Email is optional
      const dataWithoutOptional = {
        name: 'Jane Doe',
        age: 25
      };
      
      expect(() => validator.validate(dataWithoutOptional)).not.toThrow();
      
      const result = validator.validateSafe(dataWithoutOptional);
      expect(result.success).toBe(true);
    });
  });
});