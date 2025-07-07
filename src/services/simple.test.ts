/**
 * Simple test to verify Vitest setup
 * Following Gemini CLI testing patterns
 */

import { describe, it, expect } from 'vitest';

describe('Vitest Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async tests', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should support test utilities', () => {
    const testArray = [1, 2, 3];
    expect(testArray).toHaveLength(3);
    expect(testArray).toContain(2);
  });
}); 