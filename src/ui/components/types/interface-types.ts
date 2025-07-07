/**
 * Interface Types - Shared types for UI interface components
 * 
 * Extracted from ModernInterface.tsx monolith
 * Clean separation following Gemini CLI patterns
 */

/**
 * Interface mode enum - consolidates all interface types
 */
export enum InterfaceMode {
  CHAT = 'chat',
  CANVAS = 'canvas',
  MULTIMODAL = 'multimodal',
  ANALYSIS = 'analysis',
  COLLABORATION = 'collaboration',
  COMPACT = 'compact',
  STREAMING = 'streaming'
}

/**
 * Density mode for adaptive layout
 */
export enum DensityMode {
  NORMAL = 'normal',
  COMPACT = 'compact',
  ULTRA_COMPACT = 'ultra_compact',
  ADAPTIVE = 'adaptive'
}

/**
 * Streaming mode - consolidates streaming display modes
 */
export enum StreamingMode {
  BASIC = 'basic',
  MARKDOWN = 'markdown',
  INTERACTIVE = 'interactive',
  TOOL_EXECUTION = 'tool_execution',
  LOADING = 'loading'
}

/**
 * Streaming state
 */
export enum StreamingState {
  IDLE = 'idle',
  THINKING = 'thinking',
  RESPONDING = 'responding',
  TOOL_EXECUTING = 'tool_executing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Media type enum for multimodal content
 */
export enum MediaType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  CODE = 'code'
}

/**
 * Thinking phase enum for different reasoning types
 */
export enum ThinkingPhase {
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  REASONING = 'reasoning',
  VERIFICATION = 'verification',
  SYNTHESIS = 'synthesis'
}

/**
 * Multimodal content interface
 */
export interface MultimodalContent {
  id: string;
  type: MediaType;
  content: string | Buffer;
  metadata?: {
    filename?: string;
    mimeType?: string;
    size?: number;
    dimensions?: { width: number; height: number };
    duration?: number;
  };
  processing?: {
    status: 'pending' | 'processing' | 'complete' | 'error';
    progress?: number;
    message?: string;
  };
}

/**
 * Thinking block interface - consolidates all thinking block implementations
 */
export interface ThinkingBlock {
  id: string;
  phase: ThinkingPhase;
  content: string;
  timestamp: number;
  isVisible: boolean;
  isExpanded?: boolean;
  startTime: number;
  endTime?: number;
  metadata?: {
    reasoning_type?: 'analysis' | 'planning' | 'reflection' | 'debugging';
    confidence?: number;
    tokens?: number;
    complexity?: 'low' | 'medium' | 'high';
    reasoning_depth?: number;
  };
}

/**
 * Canvas element interface
 */
export interface CanvasElement {
  id: string;
  type: 'text' | 'code' | 'diagram' | 'table' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number };
  content: string;
  editable: boolean;
  selected: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Collaboration state interface
 */
export interface CollaborationState {
  isActive: boolean;
  participants: Array<{
    id: string;
    name: string;
    cursor?: { x: number; y: number };
    color: string;
  }>;
  sharedContext: Record<string, unknown>;
}

/**
 * Streaming response interface
 */
export interface StreamingResponse {
  id: string;
  content: string;
  isComplete: boolean;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    latency?: number;
    quality_score?: number;
  };
}

/**
 * Theme configuration interface
 */
export interface InterfaceTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  thinking: string;
  response: string;
  muted: string;
  error: string;
  success: string;
  warning: string;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  tokensUsed: number;
  responseTime: number;
  memoryUsage: number;
}

/**
 * Context information interface
 */
export interface ContextInfo {
  filesLoaded: number;
  projectName: string;
  gitBranch?: string;
} 