/**
 * Tests for progressUtils.ts
 */

import {
  calculateProgressBarWidth,
  calculateEta,
  formatEta,
  getProgressDisplayComponents
} from '../../../src/ui/utils/progressUtils.js';

describe('Progress Utils', () => {
  describe('calculateProgressBarWidth', () => {
    it('calculates progress bar width correctly', () => {
      expect(calculateProgressBarWidth(0.5, 100)).toBe(50);
      expect(calculateProgressBarWidth(0, 100)).toBe(0);
      expect(calculateProgressBarWidth(1, 100)).toBe(100);
      
      // Edge cases
      expect(calculateProgressBarWidth(-0.1, 100)).toBe(0); // Negative value should be clamped to 0
      expect(calculateProgressBarWidth(1.5, 100)).toBe(100); // Value over 1 should be clamped to max width
    });
  });

  describe('calculateEta', () => {
    it('calculates estimated time to completion', () => {
      // If we're at 50% after 1000ms, ETA should be another 1000ms
      const eta = calculateEta({
        progress: 0.5,
        startTime: Date.now() - 1000,
        lastUpdateTime: Date.now()
      });
      
      expect(eta).toBeGreaterThanOrEqual(900); // Allow a small tolerance for test timing
      expect(eta).toBeLessThanOrEqual(1100);
    });

    it('handles edge cases', () => {
      // Progress is 0
      expect(calculateEta({
        progress: 0,
        startTime: Date.now() - 1000,
        lastUpdateTime: Date.now()
      })).toBe(Infinity);
      
      // Progress is 1 (complete)
      expect(calculateEta({
        progress: 1,
        startTime: Date.now() - 1000,
        lastUpdateTime: Date.now()
      })).toBe(0);
      
      // No time elapsed yet
      const currentTime = Date.now();
      expect(calculateEta({
        progress: 0.5,
        startTime: currentTime,
        lastUpdateTime: currentTime
      })).toBe(Infinity); // Can't estimate with no time elapsed
    });
  });

  describe('formatEta', () => {
    it('formats ETA correctly', () => {
      expect(formatEta(1000)).toBe('1s');
      expect(formatEta(60000)).toBe('1m');
      expect(formatEta(90000)).toBe('1m 30s');
      expect(formatEta(3600000)).toBe('1h');
      expect(formatEta(3600000 + 60000)).toBe('1h 1m');
      expect(formatEta(Infinity)).toBe('calculating...');
      expect(formatEta(0)).toBe('complete');
    });
  });

  describe('getProgressDisplayComponents', () => {
    it('returns the correct progress display components', () => {
      const result = getProgressDisplayComponents({
        progress: 0.5,
        totalWidth: 100,
        showPercentage: true,
        showEta: true,
        startTime: Date.now() - 1000,
        lastUpdateTime: Date.now()
      });
      
      expect(result.progressBarWidth).toBe(50);
      expect(result.progressText).toBe('50%');
      expect(result.etaText).toBeDefined();
    });

    it('handles optional parameters', () => {
      const result = getProgressDisplayComponents({
        progress: 0.75,
        totalWidth: 100,
        showPercentage: false,
        showEta: false
      });
      
      expect(result.progressBarWidth).toBe(75);
      expect(result.progressText).toBe('');
      expect(result.etaText).toBe('');
    });
    
    it('formats progress text when custom format is provided', () => {
      const result = getProgressDisplayComponents({
        progress: 0.5,
        totalWidth: 100,
        showPercentage: true,
        progressTextFormat: 'Step {0} of {1}',
        progressNumerator: 5,
        progressDenominator: 10
      });
      
      expect(result.progressText).toBe('Step 5 of 10');
    });
  });
});