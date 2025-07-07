/**
 * Progress Calculation Service Tests
 * 
 * Comprehensive test coverage for progress calculations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressCalculationService } from './ProgressCalculationService.js';
import type { ProgressHistoryEntry } from './types.js';

describe('ProgressCalculationService', () => {
  let service: ProgressCalculationService;

  beforeEach(() => {
    service = new ProgressCalculationService();
  });

  describe('initialization', () => {
    it('should create service with default config', () => {
      expect(service).toBeInstanceOf(ProgressCalculationService);
      const config = service.getConfig();
      expect(config.smoothingAlpha).toBe(0.3);
      expect(config.historyWindowMs).toBe(10000);
    });

    it('should create service with custom config', () => {
      const customService = new ProgressCalculationService({
        smoothingAlpha: 0.5,
        historyWindowMs: 5000
      });
      const config = customService.getConfig();
      expect(config.smoothingAlpha).toBe(0.5);
      expect(config.historyWindowMs).toBe(5000);
    });
  });

  describe('calculateMetrics', () => {
    it('should return zero metrics for non-advanced mode', () => {
      const history: ProgressHistoryEntry[] = [];
      const metrics = service.calculateMetrics(history, 50, Date.now(), 'standard');
      
      expect(metrics.elapsedTime).toBe(0);
      expect(metrics.estimatedTimeRemaining).toBe(0);
      expect(metrics.velocity).toBe(0);
      expect(metrics.accuracy).toBe(0);
      expect(metrics.smoothedVelocity).toBe(0);
    });

    it('should calculate elapsed time correctly', () => {
      const startTime = Date.now() - 5000; // 5 seconds ago
      const history: ProgressHistoryEntry[] = [];
      const metrics = service.calculateMetrics(history, 50, startTime, 'advanced');
      
      expect(metrics.elapsedTime).toBeGreaterThanOrEqual(4900);
      expect(metrics.elapsedTime).toBeLessThanOrEqual(5100);
    });

    it('should calculate velocity from history', () => {
      const now = Date.now();
      const history: ProgressHistoryEntry[] = [
        { value: 0, timestamp: now - 2000 },
        { value: 50, timestamp: now }
      ];
      const metrics = service.calculateMetrics(history, 50, now - 2000, 'advanced');
      
      expect(metrics.velocity).toBe(25); // 50 progress in 2 seconds = 25/s
    });
  });

  describe('calculateVelocity', () => {
    it('should return 0 for empty history', () => {
      const velocity = service.calculateVelocity([]);
      expect(velocity).toBe(0);
    });

    it('should return 0 for single entry', () => {
      const history: ProgressHistoryEntry[] = [
        { value: 50, timestamp: Date.now() }
      ];
      const velocity = service.calculateVelocity(history);
      expect(velocity).toBe(0);
    });

    it('should calculate velocity correctly', () => {
      const now = Date.now();
      const history: ProgressHistoryEntry[] = [
        { value: 0, timestamp: now - 1000 },
        { value: 25, timestamp: now }
      ];
      const velocity = service.calculateVelocity(history);
      expect(velocity).toBe(25); // 25 progress per second
    });

    it('should use recent entries only', () => {
      const now = Date.now();
      const history: ProgressHistoryEntry[] = [
        { value: 0, timestamp: now - 3000 },
        { value: 10, timestamp: now - 2000 },
        { value: 20, timestamp: now - 1000 },
        { value: 30, timestamp: now }
      ];
      const velocity = service.calculateVelocity(history);
      expect(velocity).toBe(10); // 30 progress in 3 seconds = 10/s
    });
  });

  describe('calculateETA', () => {
    it('should return 0 for zero velocity', () => {
      const eta = service.calculateETA(50, 0);
      expect(eta).toBe(0);
    });

    it('should return 0 for completed progress', () => {
      const eta = service.calculateETA(100, 10);
      expect(eta).toBe(0);
    });

    it('should calculate ETA correctly', () => {
      const eta = service.calculateETA(50, 10); // 50% remaining at 10/s
      expect(eta).toBe(5000); // 5 seconds in milliseconds
    });

    it('should handle negative velocity', () => {
      const eta = service.calculateETA(50, -5);
      expect(eta).toBe(0);
    });
  });

  describe('normalizeValue', () => {
    it('should clamp values to 0-100 range', () => {
      expect(service.normalizeValue(-10)).toBe(0);
      expect(service.normalizeValue(0)).toBe(0);
      expect(service.normalizeValue(50)).toBe(50);
      expect(service.normalizeValue(100)).toBe(100);
      expect(service.normalizeValue(150)).toBe(100);
    });
  });

  describe('calculateFilledWidth', () => {
    it('should calculate filled width correctly', () => {
      expect(service.calculateFilledWidth(0, 20)).toBe(0);
      expect(service.calculateFilledWidth(50, 20)).toBe(10);
      expect(service.calculateFilledWidth(100, 20)).toBe(20);
    });

    it('should handle edge cases', () => {
      expect(service.calculateFilledWidth(-10, 20)).toBe(0);
      expect(service.calculateFilledWidth(150, 20)).toBe(20);
    });
  });

  describe('isComplete', () => {
    it('should detect completion correctly', () => {
      expect(service.isComplete(99.9)).toBe(false);
      expect(service.isComplete(100)).toBe(true);
      expect(service.isComplete(100.1)).toBe(true);
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(service.formatDuration(500)).toBe('500ms');
      expect(service.formatDuration(999)).toBe('999ms');
    });

    it('should format seconds', () => {
      expect(service.formatDuration(1000)).toBe('1.0s');
      expect(service.formatDuration(5500)).toBe('5.5s');
    });

    it('should format minutes', () => {
      expect(service.formatDuration(60000)).toBe('1m 0s');
      expect(service.formatDuration(90000)).toBe('1m 30s');
    });

    it('should format hours', () => {
      expect(service.formatDuration(3600000)).toBe('1h 0m');
      expect(service.formatDuration(5400000)).toBe('1h 30m');
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      service.updateConfig({ smoothingAlpha: 0.8 });
      const config = service.getConfig();
      expect(config.smoothingAlpha).toBe(0.8);
    });

    it('should preserve other config values when updating', () => {
      const originalConfig = service.getConfig();
      service.updateConfig({ smoothingAlpha: 0.8 });
      const newConfig = service.getConfig();
      
      expect(newConfig.smoothingAlpha).toBe(0.8);
      expect(newConfig.historyWindowMs).toBe(originalConfig.historyWindowMs);
    });
  });

  describe('accuracy calculation', () => {
    it('should return 0 for insufficient history', () => {
      const history: ProgressHistoryEntry[] = [
        { value: 0, timestamp: Date.now() - 1000 },
        { value: 10, timestamp: Date.now() }
      ];
      const accuracy = service.calculateAccuracy(history);
      expect(accuracy).toBe(0);
    });

    it('should calculate accuracy for consistent velocity', () => {
      const now = Date.now();
      const history: ProgressHistoryEntry[] = [
        { value: 0, timestamp: now - 3000 },
        { value: 10, timestamp: now - 2000 },
        { value: 20, timestamp: now - 1000 },
        { value: 30, timestamp: now }
      ];
      const accuracy = service.calculateAccuracy(history);
      expect(accuracy).toBeGreaterThan(90); // Very consistent velocity
    });
  });
}); 