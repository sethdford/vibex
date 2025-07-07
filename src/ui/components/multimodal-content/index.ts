/**
 * Multimodal Content Module Exports - Clean Architecture like Gemini CLI
 * 
 * Centralized exports for clean imports
 */

// Main component
export { MultimodalContentCore as MultimodalContentHandler } from './MultimodalContentCore.js';
export { default as MultimodalContentCore } from './MultimodalContentCore.js';

// Services
export { FileTypeService } from './FileTypeService.js';
export { ContentProcessingService } from './ContentProcessingService.js';
export { ContentStateService } from './ContentStateService.js';
export { ContentDisplayService } from './ContentDisplayService.js';

// View components
export { ContentHeaderView } from './ContentHeaderView.js';
export { ContentCapabilitiesView } from './ContentCapabilitiesView.js';
export { ContentListView } from './ContentListView.js';
export { ContentInputView } from './ContentInputView.js';
export { ContentControlsView } from './ContentControlsView.js';

// Types
export type {
  ContentType,
  ProcessingStatus,
  ContentAnalysis,
  MultimodalContentItem,
  ProcessingCapabilities,
  MultimodalTheme,
  ContentFilterOptions,
  MultimodalConfig,
  MultimodalCallbacks,
  MultimodalState,
  FileProcessingResult,
  MultimodalContentHandlerProps
} from './types.js'; 