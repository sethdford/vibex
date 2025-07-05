/**
 * Tests for formatters.ts
 */

import { 
  formatElapsedTime,
  formatSize,
  formatTimestamp,
  truncateMiddle,
  formatNumber,
  formatTokens,
  formatCost,
  formatSpeed
} from '../../../src/ui/utils/formatters.js';

describe('Formatters', () => {
  describe('formatElapsedTime', () => {
    it('formats milliseconds correctly', () => {
      expect(formatElapsedTime(1000)).toBe('1.0s');
      expect(formatElapsedTime(1500)).toBe('1.5s');
      expect(formatElapsedTime(500)).toBe('0.5s');
      expect(formatElapsedTime(0)).toBe('0.0s');
    });
    
    it('formats seconds correctly', () => {
      expect(formatElapsedTime(1000 * 5)).toBe('5.0s');
      expect(formatElapsedTime(1000 * 59)).toBe('59.0s');
    });
    
    it('formats minutes correctly', () => {
      expect(formatElapsedTime(1000 * 60)).toBe('1m 0s');
      expect(formatElapsedTime(1000 * 60 * 5 + 1000 * 30)).toBe('5m 30s');
    });
    
    it('formats hours correctly', () => {
      expect(formatElapsedTime(1000 * 60 * 60)).toBe('1h 0m');
      expect(formatElapsedTime(1000 * 60 * 60 * 2 + 1000 * 60 * 30)).toBe('2h 30m');
    });
  });

  describe('formatSize', () => {
    it('formats bytes correctly', () => {
      expect(formatSize(0)).toBe('0 B');
      expect(formatSize(100)).toBe('100 B');
      expect(formatSize(1023)).toBe('1023 B');
    });
    
    it('formats kilobytes correctly', () => {
      expect(formatSize(1024)).toBe('1.0 KB');
      expect(formatSize(1536)).toBe('1.5 KB');
      expect(formatSize(1024 * 10)).toBe('10.0 KB');
    });
    
    it('formats megabytes correctly', () => {
      expect(formatSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });
    
    it('formats gigabytes correctly', () => {
      expect(formatSize(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(formatSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
    });
  });

  describe('formatTimestamp', () => {
    it('formats timestamps correctly', () => {
      const mockDate = new Date('2023-05-15T12:30:45');
      const timestamp = mockDate.getTime();
      
      expect(formatTimestamp(timestamp)).toMatch(/\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('truncateMiddle', () => {
    it('truncates strings in the middle', () => {
      expect(truncateMiddle('abcdefghijklmnop', 10)).toBe('abcd...mnop');
      expect(truncateMiddle('short', 10)).toBe('short');
      expect(truncateMiddle('', 10)).toBe('');
    });
    
    it('handles edge cases', () => {
      expect(truncateMiddle('abcdef', 5)).toBe('a...f');
      expect(truncateMiddle('abcdef', 6)).toBe('abcdef');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with proper units', () => {
      expect(formatNumber(1000)).toBe('1.0K');
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(1000000)).toBe('1.0M');
      expect(formatNumber(1500000)).toBe('1.5M');
      expect(formatNumber(1000000000)).toBe('1.0B');
    });
    
    it('handles small numbers', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(100)).toBe('100');
      expect(formatNumber(999)).toBe('999');
    });
  });

  describe('formatTokens', () => {
    it('formats token counts', () => {
      expect(formatTokens(1000)).toBe('1.0K tokens');
      expect(formatTokens(1)).toBe('1 token');
    });
  });

  describe('formatCost', () => {
    it('formats cost values', () => {
      expect(formatCost(0.1)).toBe('$0.10');
      expect(formatCost(1)).toBe('$1.00');
      expect(formatCost(0.01)).toBe('$0.01');
      expect(formatCost(0.001)).toBe('$0.00');
    });
  });

  describe('formatSpeed', () => {
    it('formats speed values', () => {
      expect(formatSpeed(1)).toBe('1.0 t/s');
      expect(formatSpeed(10.5)).toBe('10.5 t/s');
    });
  });
});