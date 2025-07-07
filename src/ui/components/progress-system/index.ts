/**
 * Progress System - Clean Architecture Exports
 * 
 * Centralized exports following Gemini CLI patterns
 * Clean imports for consumers
 */

// Main component
export { ProgressSystemCore as ProgressSystem } from './ProgressSystemCore.js';
export { default as ProgressSystemDefault } from './ProgressSystemCore.js';

// Services
export { ProgressCalculationService, createProgressCalculationService } from './ProgressCalculationService.js';
export { ProgressThemeService, createProgressThemeService } from './ThemeService.js';
export { ProgressAnimationService, createProgressAnimationService } from './AnimationService.js';

// View components
export { ProgressBarView } from './ProgressBarView.js';
export { ProgressMetricsView } from './ProgressMetricsView.js';
export { ProgressStatusView } from './ProgressStatusView.js';
export { MiniProgressView } from './MiniProgressView.js';

// Hook
export { useProgressTracking } from './useProgressTracking.js';

// Types
export type {
  ProgressMode,
  AnimationStyle,
  ProgressTheme,
  ProgressSize,
  ProgressMetrics,
  ProgressHistoryEntry,
  ProgressThemeColors,
  ProgressSizeConfig,
  ProgressAnimationState,
  ProgressCalculationConfig,
  ProgressSystemProps,
  UseProgressTrackingReturn,
  ProgressCalculation,
  ProgressBarConfig,
  ProgressDisplayConfig
} from './types.js'; 