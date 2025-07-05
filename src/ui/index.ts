// Export message splitting utilities
export {
  findLastSafeSplitPoint,
  splitMessageForRendering,
  splitForStaticRendering,
  analyzeSplitPerformance,
  type MessageSplitResult,
  type SplitMetrics
} from './utils/messageSplitting.js';

// Re-export startUI and types from main.tsx (compiled to main.js)
export { startUI, type StartUIOptions } from './main.js';
