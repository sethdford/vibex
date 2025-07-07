/**
 * Progress Calculation Service - Clean Architecture
 * 
 * Single Responsibility: Progress calculations, velocity, and ETA
 * Following Gemini CLI's focused service patterns
 */

import type { 
  ProgressMetrics, 
  ProgressHistoryEntry, 
  ProgressCalculationConfig,
  ProgressMode 
} from './types.js';

/**
 * Default calculation configuration
 */
const DEFAULT_CALCULATION_CONFIG: ProgressCalculationConfig = {
  smoothingAlpha: 0.3,
  historyWindowMs: 10000, // 10 seconds
  velocityWindowSize: 5,
  accuracyThreshold: 80
};

/**
 * Progress Calculation Service
 * Focus: Mathematical calculations for progress tracking
 */
export class ProgressCalculationService {
  private config: ProgressCalculationConfig;

  constructor(config: Partial<ProgressCalculationConfig> = {}) {
    this.config = { ...DEFAULT_CALCULATION_CONFIG, ...config };
  }

  /**
   * Calculate progress metrics from history
   */
  calculateMetrics(
    progressHistory: ProgressHistoryEntry[],
    currentValue: number,
    startTime: number,
    mode: ProgressMode
  ): ProgressMetrics {
    if (mode !== 'advanced') {
      return { 
        elapsedTime: 0, 
        estimatedTimeRemaining: 0, 
        velocity: 0, 
        accuracy: 0, 
        smoothedVelocity: 0 
      };
    }

    const now = Date.now();
    const elapsedTime = now - startTime;

    // Filter recent history within window
    const recentHistory = this.filterRecentHistory(progressHistory, now);
    
    // Calculate velocity
    const velocity = this.calculateVelocity(recentHistory);
    const smoothedVelocity = this.calculateSmoothedVelocity(recentHistory);

    // Calculate ETA
    const estimatedTimeRemaining = this.calculateETA(currentValue, smoothedVelocity);

    // Calculate accuracy
    const accuracy = this.calculateAccuracy(recentHistory);

    return {
      elapsedTime,
      estimatedTimeRemaining,
      velocity,
      smoothedVelocity,
      accuracy
    };
  }

  /**
   * Calculate instantaneous velocity from recent history
   */
  calculateVelocity(progressHistory: ProgressHistoryEntry[]): number {
    if (progressHistory.length < 2) return 0;

    const recent = progressHistory.slice(-this.config.velocityWindowSize);
    if (recent.length < 2) return 0;

    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
    const progressSpan = recent[recent.length - 1].value - recent[0].value;

    return timeSpan > 0 ? (progressSpan / timeSpan) * 1000 : 0; // per second
  }

  /**
   * Calculate smoothed velocity using exponential moving average
   */
  calculateSmoothedVelocity(progressHistory: ProgressHistoryEntry[]): number {
    if (progressHistory.length < 2) return 0;

    const velocities = this.calculateVelocityHistory(progressHistory);
    if (velocities.length === 0) return 0;

    // Apply exponential smoothing
    return velocities.reduce((smoothed, velocity, index) => {
      if (index === 0) return velocity;
      const weight = Math.pow(this.config.smoothingAlpha, velocities.length - index - 1);
      return smoothed + weight * velocity;
    }, 0);
  }

  /**
   * Calculate estimated time remaining
   */
  calculateETA(currentValue: number, smoothedVelocity: number): number {
    if (smoothedVelocity <= 0 || currentValue >= 100) return 0;

    const remainingProgress = 100 - currentValue;
    return (remainingProgress / smoothedVelocity) * 1000; // milliseconds
  }

  /**
   * Calculate accuracy of velocity predictions
   */
  calculateAccuracy(progressHistory: ProgressHistoryEntry[]): number {
    if (progressHistory.length < 3) return 0;

    const velocities = this.calculateVelocityHistory(progressHistory);
    if (velocities.length === 0) return 0;

    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    if (avgVelocity === 0) return 0;

    const variance = velocities.reduce((acc, v) => acc + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / Math.abs(avgVelocity);

    // Convert to accuracy percentage (lower variation = higher accuracy)
    return Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)));
  }

  /**
   * Normalize progress value to valid range
   */
  normalizeValue(value: number): number {
    return Math.min(100, Math.max(0, value));
  }

  /**
   * Calculate filled width for progress bar
   */
  calculateFilledWidth(value: number, totalWidth: number): number {
    const normalizedValue = this.normalizeValue(value);
    return Math.round((normalizedValue / 100) * totalWidth);
  }

  /**
   * Check if progress is complete
   */
  isComplete(value: number): boolean {
    return this.normalizeValue(value) >= 100;
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    if (ms < 3600000) return `${minutes}m ${seconds}s`;
    
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }

  /**
   * Update calculation configuration
   */
  updateConfig(updates: Partial<ProgressCalculationConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): ProgressCalculationConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Filter progress history to recent entries within time window
   */
  private filterRecentHistory(progressHistory: ProgressHistoryEntry[], currentTime: number): ProgressHistoryEntry[] {
    return progressHistory.filter(entry => 
      currentTime - entry.timestamp <= this.config.historyWindowMs
    );
  }

  /**
   * Calculate velocity history from progress entries
   */
  private calculateVelocityHistory(progressHistory: ProgressHistoryEntry[]): number[] {
    const velocities: number[] = [];
    
    for (let i = 1; i < progressHistory.length; i++) {
      const timeDiff = progressHistory[i].timestamp - progressHistory[i - 1].timestamp;
      const progressDiff = progressHistory[i].value - progressHistory[i - 1].value;
      
      if (timeDiff > 0) {
        velocities.push((progressDiff / timeDiff) * 1000); // per second
      }
    }
    
    return velocities;
  }
}

/**
 * Factory function for creating calculation service
 */
export function createProgressCalculationService(config?: Partial<ProgressCalculationConfig>): ProgressCalculationService {
  return new ProgressCalculationService(config);
} 