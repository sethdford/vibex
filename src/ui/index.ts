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

// Export tool group display components
export {
  ToolGroupDisplay,
  ToolGroupItem,
  ToolItem,
  ToolDocumentation,
  ToolExampleItem,
  SearchBox,
  type ToolGroup,
  type ToolGroupDisplayProps,
  type ToolItemProps,
  type ToolDocumentationProps,
  type ToolExampleItemProps,
  type SearchBoxProps
} from './components/tool-group-display/index.js';

// Export example component
export { default as ToolGroupDisplayExample } from './components/tool-group-display/Example.js';
