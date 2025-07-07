/**
 * Multimodal Content Types - Clean Architecture like Gemini CLI
 * 
 * Centralized type definitions for multimodal content handling
 */

/**
 * Content type enum for different media types
 */
export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  CODE = 'code',
  SPREADSHEET = 'spreadsheet',
  PRESENTATION = 'presentation'
}

/**
 * Processing status enum
 */
export enum ProcessingStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  EXTRACTING = 'extracting',
  TRANSCRIBING = 'transcribing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Content analysis result interface
 */
export interface ContentAnalysis {
  summary: string;
  keyPoints: string[];
  entities?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence: number;
  processingTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Multimodal content item interface
 */
export interface MultimodalContentItem {
  id: string;
  type: ContentType;
  name: string;
  size: number;
  mimeType: string;
  content?: string | ArrayBuffer;
  thumbnailUrl?: string;
  status: ProcessingStatus;
  progress?: number;
  analysis?: ContentAnalysis;
  error?: string;
  uploadedAt: number;
  metadata?: {
    dimensions?: { width: number; height: number };
    duration?: number;
    pages?: number;
    language?: string;
    encoding?: string;
  };
}

/**
 * Content processing capabilities interface
 */
export interface ProcessingCapabilities {
  imageAnalysis: boolean;
  audioTranscription: boolean;
  videoAnalysis: boolean;
  documentExtraction: boolean;
  codeAnalysis: boolean;
  realTimeProcessing: boolean;
  batchProcessing: boolean;
  cloudProcessing: boolean;
}

/**
 * Theme configuration interface
 */
export interface MultimodalTheme {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  muted: string;
}

/**
 * Content filter and sort options
 */
export interface ContentFilterOptions {
  type?: ContentType;
  status?: ProcessingStatus;
  searchTerm?: string;
  sortBy?: 'name' | 'size' | 'type' | 'uploadedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Content handler configuration
 */
export interface MultimodalConfig {
  terminalWidth: number;
  terminalHeight: number;
  dragDropEnabled: boolean;
  maxFileSize: number;
  supportedTypes: ContentType[];
  theme: MultimodalTheme;
}

/**
 * Content handler callbacks
 */
export interface MultimodalCallbacks {
  onContentUpload?: (files: File[]) => void;
  onContentAnalyze?: (contentId: string) => void;
  onContentRemove?: (contentId: string) => void;
  onBatchProcess?: (contentIds: string[]) => void;
  onContentInteraction?: (contentId: string, action: 'view' | 'edit' | 'share' | 'export') => void;
}

/**
 * Content handler state
 */
export interface MultimodalState {
  selectedItems: Set<string>;
  processingFiles: Set<string>;
  showFileInput: boolean;
  filePathInput: string;
  showAnalysis: boolean;
  filterOptions: ContentFilterOptions;
  viewMode: 'list' | 'grid' | 'details';
}

/**
 * File processing result
 */
export interface FileProcessingResult {
  success: boolean;
  contentItem?: MultimodalContentItem;
  error?: string;
}

/**
 * Multimodal content handler props
 */
export interface MultimodalContentHandlerProps {
  contentItems: MultimodalContentItem[];
  capabilities: ProcessingCapabilities;
  terminalWidth: number;
  terminalHeight: number;
  dragDropEnabled?: boolean;
  maxFileSize?: number;
  supportedTypes?: ContentType[];
  theme?: Partial<MultimodalTheme>;
  onContentUpload?: (files: File[]) => void;
  onContentAnalyze?: (contentId: string) => void;
  onContentRemove?: (contentId: string) => void;
  onBatchProcess?: (contentIds: string[]) => void;
  onContentInteraction?: (contentId: string, action: 'view' | 'edit' | 'share' | 'export') => void;
} 