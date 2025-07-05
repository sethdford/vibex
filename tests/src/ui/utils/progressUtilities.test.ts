/**
 * Progress Utilities Tests
 */

import {
  calculateEstimatedTimeRemaining,
  formatTimeDuration,
  determineProgressStatus,
  generateProgressSnapshot,
  formatProgressForDisplay
} from '../../../../src/ui/utils/progressUtilities';

describe('Progress Utilities', () => {
  describe('calculateEstimatedTimeRemaining', () => {
    it('returns undefined when not enough data points', () => {
      const history = [{ time: 1000, value: 10 }];
      expect(calculateEstimatedTimeRemaining(history, 10, 100)).toBeUndefined();
    });
    
    it('returns undefined when no progress made', () => {
      const history = [
        { time: 1000, value: 10 },
        { time: 2000, value: 10 }
      ];
      expect(calculateEstimatedTimeRemaining(history, 10, 100)).toBeUndefined();
    });
    
    it('calculates remaining time correctly', () => {
      // 10 units in 5 seconds = 2 units/second
      // 90 units remaining / 2 units per second = 45 seconds
      const history = [
        { time: 1000, value: 0 },
        { time: 6000, value: 10 } // 5 seconds elapsed, 10 units progress
      ];
      expect(calculateEstimatedTimeRemaining(history, 10, 100)).toBeCloseTo(45);
    });
    
    it('returns 0 when progress is complete', () => {
      const history = [
        { time: 1000, value: 0 },
        { time: 6000, value: 100 }
      ];
      expect(calculateEstimatedTimeRemaining(history, 100, 100)).toBe(0);
    });
  });
  
  describe('formatTimeDuration', () => {
    it('formats seconds correctly', () => {
      expect(formatTimeDuration(0.5)).toBe('less than a second');
      expect(formatTimeDuration(1)).toBe('1 second');
      expect(formatTimeDuration(45)).toBe('45 seconds');
    });
    
    it('formats minutes correctly', () => {
      expect(formatTimeDuration(60)).toBe('1 minute');
      expect(formatTimeDuration(90)).toBe('1 minute 30 seconds');
      expect(formatTimeDuration(120)).toBe('2 minutes');
    });
    
    it('formats hours correctly', () => {
      expect(formatTimeDuration(3600)).toBe('1 hour');
      expect(formatTimeDuration(3660)).toBe('1 hour 1 minute');
      expect(formatTimeDuration(7200)).toBe('2 hours');
      expect(formatTimeDuration(7260)).toBe('2 hours 1 minute');
      expect(formatTimeDuration(7320)).toBe('2 hours 2 minutes');
    });
  });
  
  describe('determineProgressStatus', () => {
    it('returns existing status if present', () => {
      const progress = {
        id: 'test',
        value: 50,
        total: 100,
        label: 'Test',
        status: 'warning' as const,
        indeterminate: false,
        active: true,
        startTime: 1000,
        updateTime: 2000,
        progressHistory: []
      };
      expect(determineProgressStatus(progress)).toBe('warning');
    });
    
    it('returns success for completed progress', () => {
      const progress = {
        id: 'test',
        value: 100,
        total: 100,
        label: 'Test',
        status: undefined,
        indeterminate: false,
        active: false,
        startTime: 1000,
        updateTime: 2000,
        progressHistory: []
      };
      expect(determineProgressStatus(progress)).toBe('success');
    });
    
    it('returns running for active indeterminate progress', () => {
      const progress = {
        id: 'test',
        value: 0,
        total: 100,
        label: 'Test',
        status: 'running' as const,
        indeterminate: true,
        active: true,
        startTime: 1000,
        updateTime: 2000,
        progressHistory: []
      };
      expect(determineProgressStatus(progress)).toBe('running');
    });
  });
  
  describe('generateProgressSnapshot', () => {
    it('calculates percentage and elapsed time', () => {
      const now = 11000;
      const progress = {
        id: 'test',
        value: 40,
        total: 80,
        label: 'Test',
        status: 'running' as const,
        indeterminate: false,
        active: true,
        startTime: 1000, // 10 seconds ago
        updateTime: 6000,
        progressHistory: []
      };
      
      const snapshot = generateProgressSnapshot(progress, now);
      expect(snapshot.percent).toBe(50); // 40/80 * 100
      expect(snapshot.elapsedTime).toBe(10); // (11000 - 1000) / 1000
    });
  });
  
  describe('formatProgressForDisplay', () => {
    it('creates basic progress display', () => {
      const progress = {
        id: 'test',
        value: 30,
        total: 100,
        label: 'Downloading',
        status: 'running' as const,
        indeterminate: false,
        active: true,
        startTime: Date.now() - 5000, // 5 seconds ago
        updateTime: Date.now() - 1000,
        progressHistory: []
      };
      
      const display = formatProgressForDisplay(progress);
      expect(display).toContain('Downloading');
      expect(display).toContain('30%');
      expect(display).toContain('5 seconds');
    });
    
    it('includes step information when available', () => {
      const progress = {
        id: 'test',
        value: 30,
        total: 100,
        label: 'Processing',
        status: 'running' as const,
        indeterminate: false,
        active: true,
        startTime: Date.now() - 5000,
        updateTime: Date.now() - 1000,
        progressHistory: [],
        currentStep: 2,
        totalSteps: 5
      };
      
      const display = formatProgressForDisplay(progress);
      expect(display).toContain('Processing');
      expect(display).toContain('[Step 2/5]');
    });
    
    it('includes time remaining when available', () => {
      const progress = {
        id: 'test',
        value: 30,
        total: 100,
        label: 'Uploading',
        status: 'running' as const,
        indeterminate: false,
        active: true,
        startTime: Date.now() - 5000,
        updateTime: Date.now() - 1000,
        progressHistory: [],
        estimatedTimeRemaining: 20 // 20 seconds
      };
      
      const display = formatProgressForDisplay(progress);
      expect(display).toContain('Uploading');
      expect(display).toContain('20 seconds remaining');
    });
  });
});