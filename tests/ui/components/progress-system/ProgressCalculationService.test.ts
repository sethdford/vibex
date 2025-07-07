/**
 * ProgressCalculationService Tests - Clean Architecture like Gemini CLI
 * 
 * Comprehensive test coverage for progress calculations and metrics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressCalculationService } from '../../../../src/ui/components/progress-system/ProgressCalculationService.js';

describe('ProgressCalculationService', () => {
  let service: ProgressCalculationService;

  beforeEach(() => {
    service = new ProgressCalculationService();
  });

  describe('calculateProgress', () => {
    it('should calculate basic progress correctly', () => {
      const result = service.calculateProgress(50, 0, Date.now(), 30);
      
      expect(result.percentage).toBe(50);
      expect(result.filled).toBe(15); // 50% of 30
      expect(result.empty).toBe(15);
    });

    it('should clamp progress values to 0-100 range', () => {
      const negativeResult = service.calculateProgress(-10, 0, Date.now(), 30);
      expect(negativeResult.percentage).toBe(0);
      expect(negativeResult.filled).toBe(0);
      expect(negativeResult.empty).toBe(30);

      const overResult = service.calculateProgress(150, 0, Date.now(), 30);
      expect(overResult.percentage).toBe(100);
      expect(overResult.filled).toBe(30);
      expect(overResult.empty).toBe(0);
    });

    it('should handle edge cases', () => {
      const zeroWidthResult = service.calculateProgress(50, 0, Date.now(), 0);
      expect(zeroWidthResult.filled).toBe(0);
      expect(zeroWidthResult.empty).toBe(0);

      const fullProgressResult = service.calculateProgress(100, 0, Date.now(), 20);
      expect(fullProgressResult.filled).toBe(20);
      expect(fullProgressResult.empty).toBe(0);
    });
  });

  describe('velocity calculation', () => {
    it('should calculate velocity correctly', () => {
      const velocity = service.calculateVelocity(60, 40, 2000); // 20% in 2 seconds
      expect(velocity).toBe(10); // 10% per second
    });

    it('should handle zero time delta', () => {
      const velocity = service.calculateVelocity(60, 40, 0);
      expect(velocity).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative progress (regression)', () => {
      const velocity = service.calculateVelocity(30, 50, 1000); // -20% in 1 second
      expect(velocity).toBe(-20);
    });

    it('should smooth velocity over time', () => {
      // Add multiple velocity readings
      service.calculateVelocity(10, 0, 1000);   // 10%/s
      service.calculateVelocity(20, 10, 1000);  // 10%/s
      service.calculateVelocity(35, 20, 1000);  // 15%/s
      
      const smoothed = service.getSmoothedVelocity();
      expect(smoothed).toBeCloseTo(11.67, 1); // Average of 10, 10, 15
    });
  });

  describe('ETA calculation', () => {
    it('should calculate ETA correctly', () => {
      const eta = service.calculateETA(25, 5); // 25% done, 5%/s velocity
      expect(eta).toBe(15); // (100-25)/5 = 15 seconds
    });

    it('should return 0 for completed progress', () => {
      const eta = service.calculateETA(100, 5);
      expect(eta).toBe(0);
    });

    it('should return 0 for zero or negative velocity', () => {
      const eta1 = service.calculateETA(50, 0);
      expect(eta1).toBe(0);

      const eta2 = service.calculateETA(50, -5);
      expect(eta2).toBe(0);
    });
  });

  describe('metrics calculation', () => {
    it('should calculate comprehensive metrics', () => {
      const startTime = Date.now() - 5000; // 5 seconds ago
      const metrics = service.calculateMetrics(40, 20, startTime, 4);

      expect(metrics.elapsedTime).toBeGreaterThanOrEqual(4900);
      expect(metrics.elapsedTime).toBeLessThanOrEqual(5100);
      expect(metrics.velocity).toBe(4);
      expect(metrics.estimatedTimeRemaining).toBe(15); // (100-40)/4
      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('accuracy calculation', () => {
    it('should return 1.0 for insufficient data', () => {
      const accuracy = service.calculateAccuracy();
      expect(accuracy).toBe(1.0);
    });

    it('should calculate accuracy based on velocity consistency', () => {
      // Add consistent velocities
      service.calculateVelocity(10, 0, 1000);   // 10%/s
      service.calculateVelocity(20, 10, 1000);  // 10%/s
      service.calculateVelocity(30, 20, 1000);  // 10%/s
      
      const accuracy = service.calculateAccuracy();
      expect(accuracy).toBeGreaterThan(0.9); // Should be very accurate
    });

    it('should show lower accuracy for inconsistent velocities', () => {
      // Add inconsistent velocities
      service.calculateVelocity(10, 0, 1000);   // 10%/s
      service.calculateVelocity(15, 10, 1000);  // 5%/s
      service.calculateVelocity(40, 15, 1000);  // 25%/s
      
      const accuracy = service.calculateAccuracy();
      expect(accuracy).toBeLessThan(0.9); // Should be less accurate
    });
  });

  describe('formatting methods', () => {
    it('should format duration correctly', () => {
      expect(service.formatDuration(500)).toBe('500ms');
      expect(service.formatDuration(1500)).toBe('1s');
      expect(service.formatDuration(65000)).toBe('1m 5s');
      expect(service.formatDuration(3665000)).toBe('1h 1m 5s');
    });

    it('should format velocity correctly', () => {
      expect(service.formatVelocity(0.005)).toBe('0%/s');
      expect(service.formatVelocity(5.67)).toBe('5.7%/s');
      expect(service.formatVelocity(-2.3)).toBe('-2.3%/s');
    });

    it('should format ETA correctly', () => {
      expect(service.formatETA(0)).toBe('--');
      expect(service.formatETA(-5)).toBe('--');
      expect(service.formatETA(Infinity)).toBe('--');
      expect(service.formatETA(65)).toBe('1m 5s');
    });
  });

  describe('step-based progress', () => {
    it('should calculate step progress correctly', () => {
      expect(service.calculateStepProgress(3, 10)).toBe(30);
      expect(service.calculateStepProgress(10, 10)).toBe(100);
      expect(service.calculateStepProgress(0, 10)).toBe(0);
    });

    it('should handle edge cases for step progress', () => {
      expect(service.calculateStepProgress(5, 0)).toBe(0);
      expect(service.calculateStepProgress(15, 10)).toBe(100); // Clamps to 100
    });
  });

  describe('completion prediction', () => {
    it('should predict completion with high accuracy', () => {
      // Setup high accuracy scenario
      service.calculateVelocity(10, 0, 1000);
      service.calculateVelocity(20, 10, 1000);
      service.calculateVelocity(30, 20, 1000);
      
      const prediction = service.predictCompletion(30, 10, 0.9);
      
      expect(prediction.estimatedCompletion).toBe(7); // (100-30)/10
      expect(prediction.confidenceLevel).toBe('high');
      expect(prediction.range.min).toBeLessThan(prediction.estimatedCompletion);
      expect(prediction.range.max).toBeGreaterThan(prediction.estimatedCompletion);
    });

    it('should predict completion with low accuracy', () => {
      const prediction = service.predictCompletion(50, 5, 0.3);
      
      expect(prediction.estimatedCompletion).toBe(10); // (100-50)/5
      expect(prediction.confidenceLevel).toBe('low');
      expect(prediction.range.max - prediction.range.min).toBeGreaterThan(5); // Wide range
    });
  });

  describe('progress stall detection', () => {
    it('should detect stalled progress', () => {
      // Add very low velocities
      service.calculateVelocity(50.001, 50, 1000);
      service.calculateVelocity(50.002, 50.001, 1000);
      service.calculateVelocity(50.003, 50.002, 1000);
      
      expect(service.isProgressStalled(0.01)).toBe(true);
    });

    it('should not detect stall with good progress', () => {
      service.calculateVelocity(10, 0, 1000);
      service.calculateVelocity(20, 10, 1000);
      service.calculateVelocity(30, 20, 1000);
      
      expect(service.isProgressStalled()).toBe(false);
    });
  });

  describe('progress trend analysis', () => {
    it('should detect accelerating trend', () => {
      service.calculateVelocity(5, 0, 1000);    // 5%/s
      service.calculateVelocity(15, 5, 1000);   // 10%/s
      service.calculateVelocity(30, 15, 1000);  // 15%/s
      
      expect(service.getProgressTrend()).toBe('accelerating');
    });

    it('should detect decelerating trend', () => {
      service.calculateVelocity(15, 0, 1000);   // 15%/s
      service.calculateVelocity(25, 15, 1000);  // 10%/s
      service.calculateVelocity(30, 25, 1000);  // 5%/s
      
      expect(service.getProgressTrend()).toBe('decelerating');
    });

    it('should detect steady trend', () => {
      service.calculateVelocity(10, 0, 1000);   // 10%/s
      service.calculateVelocity(20, 10, 1000);  // 10%/s
      service.calculateVelocity(30, 20, 1000);  // 10%/s
      
      expect(service.getProgressTrend()).toBe('steady');
    });

    it('should detect stalled trend', () => {
      service.calculateVelocity(50.001, 50, 1000);
      service.calculateVelocity(50.002, 50.001, 1000);
      service.calculateVelocity(50.003, 50.002, 1000);
      
      expect(service.getProgressTrend()).toBe('stalled');
    });
  });

  describe('velocity statistics', () => {
    it('should provide velocity statistics', () => {
      service.calculateVelocity(10, 0, 1000);   // 10%/s
      service.calculateVelocity(25, 10, 1000);  // 15%/s
      service.calculateVelocity(35, 25, 1000);  // 10%/s
      
      const stats = service.getVelocityStats();
      
      expect(stats.current).toBe(10);
      expect(stats.average).toBeCloseTo(11.67, 1);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(15);
      expect(stats.standardDeviation).toBeGreaterThan(0);
    });

    it('should handle empty velocity history', () => {
      const stats = service.getVelocityStats();
      
      expect(stats.current).toBe(0);
      expect(stats.average).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.standardDeviation).toBe(0);
    });
  });

  describe('reset functionality', () => {
    it('should reset velocity history', () => {
      service.calculateVelocity(10, 0, 1000);
      service.calculateVelocity(20, 10, 1000);
      
      expect(service.getSmoothedVelocity()).toBeGreaterThan(0);
      
      service.resetHistory();
      
      expect(service.getSmoothedVelocity()).toBe(0);
    });
  });
}); 