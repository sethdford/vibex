# VibeX UI Component Consolidation Guide

## Overview

This document provides detailed guidance for consolidating duplicate components and implementing unified systems within the VibeX UI codebase. It serves as a practical companion to the UI-REFACTORING-PLAN.md, with specific code examples and migration strategies.

## Table of Contents

1. [Progress System Consolidation](#progress-system-consolidation)
2. [Streaming Text Consolidation](#streaming-text-consolidation)
3. [Theme System Unification](#theme-system-unification)
4. [Claude Client Hook Consolidation](#claude-client-hook-consolidation)
5. [Image Handling Improvement](#image-handling-improvement)
6. [Migration Strategies](#migration-strategies)

## Progress System Consolidation

### Current Situation

We currently have four separate progress components:
- `ProgressBar.tsx` - Basic progress bar
- `AdvancedProgressBar.tsx` - With ETA and advanced features
- `IndeterminateProgressBar.tsx` - For unknown progress
- `MiniProgressIndicator.tsx` - Compact version

Plus two utility files:
- `progressUtilities.ts`
- `progressUtils.ts`

### Solution: Unified ProgressSystem

#### 1. Component Structure

Create a single `ProgressSystem` component with configurable modes:

```typescript
// src/ui/components/progress/ProgressSystem.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

export type ProgressMode = 'standard' | 'advanced' | 'indeterminate' | 'mini';

export interface ProgressSystemProps {
  /**
   * Current progress value (0-100)
   * Not required for indeterminate mode
   */
  value?: number;
  
  /**
   * Maximum width of the progress bar
   */
  width?: number;
  
  /**
   * Progress bar label
   */
  label?: string;
  
  /**
   * Whether to show percentage
   */
  showPercentage?: boolean;
  
  /**
   * Whether to animate the progress bar
   */
  animated?: boolean;
  
  /**
   * Animation style
   */
  animationStyle?: 'pulse' | 'bounce' | 'slide' | 'gradient';
  
  /**
   * Whether to show time estimates (advanced mode only)
   */
  showETA?: boolean;
  
  /**
   * Whether to show velocity (advanced mode only)
   */
  showVelocity?: boolean;
  
  /**
   * Progress bar mode
   */
  mode: ProgressMode;
  
  /**
   * Progress bar theme
   */
  theme?: 'default' | 'success' | 'error' | 'warning' | 'info';
  
  /**
   * Start time for ETA calculation (advanced mode)
   */
  startTime?: number;
  
  /**
   * Current step message (indeterminate mode)
   */
  message?: string;
  
  /**
   * Whether to show detailed metrics (advanced mode)
   */
  showMetrics?: boolean;
  
  /**
   * Compact display mode
   */
  compact?: boolean;
  
  /**
   * Custom characters for progress bar rendering
   */
  characters?: {
    complete: string;
    incomplete: string;
    head?: string;
  };
}

export const ProgressSystem: React.FC<ProgressSystemProps> = ({
  value = 0,
  width = 40,
  label = '',
  showPercentage = true,
  animated = true,
  animationStyle = 'pulse',
  showETA = false,
  showVelocity = false,
  mode = 'standard',
  theme = 'default',
  startTime,
  message = 'Processing...',
  showMetrics = false,
  compact = false,
  characters = { complete: '█', incomplete: '░', head: '' },
}) => {
  // Implementation logic that handles all modes
  
  // Standard mode rendering
  if (mode === 'standard') {
    // Standard progress bar implementation
  }
  
  // Advanced mode rendering
  if (mode === 'advanced') {
    // Advanced progress bar with ETA, velocity, etc.
  }
  
  // Indeterminate mode rendering
  if (mode === 'indeterminate') {
    // Indeterminate progress animation
  }
  
  // Mini mode rendering
  if (mode === 'mini') {
    // Compact progress indicator
  }
  
  // Common rendering logic
  return (
    <Box flexDirection="column" width={width}>
      {/* Progress bar implementation based on mode */}
    </Box>
  );
};

// Legacy component adapters for backward compatibility
export const ProgressBar = (props: any) => <ProgressSystem mode="standard" {...props} />;
export const AdvancedProgressBar = (props: any) => <ProgressSystem mode="advanced" {...props} />;
export const IndeterminateProgressBar = (props: any) => <ProgressSystem mode="indeterminate" {...props} />;
export const MiniProgressIndicator = (props: any) => <ProgressSystem mode="mini" {...props} />;
```

#### 2. Unified Progress Utilities

Consolidate the utility functions:

```typescript
// src/ui/utils/progressSystem.ts

/**
 * Calculate ETA based on progress and elapsed time
 */
export function calculateETA(
  progress: number,
  elapsedMs: number,
  smoothingFactor = 0.3
): number {
  if (progress <= 0) return Infinity;
  
  // Implementation from existing utilities
  return (elapsedMs / progress) * (100 - progress);
}

/**
 * Format time for display
 */
export function formatTime(ms: number): string {
  // Implementation from existing utilities
}

/**
 * Calculate progress velocity (percent per second)
 */
export function calculateVelocity(
  progress: number,
  elapsedMs: number,
  previousProgress = 0,
  previousElapsedMs = 0
): number {
  // Implementation from existing utilities
}

// Additional utility functions from both files
```

#### 3. Migration Plan

1. Create the new unified components
2. Implement adapter components for backward compatibility
3. Update direct uses of old components to use new system
4. Write tests for the unified system
5. Deprecate old components but keep them as adapters
6. Eventually remove the adapter components in a future release

## Streaming Text Consolidation

### Current Situation

We have three streaming text implementations:
- `StreamingText.tsx` - Basic implementation
- `StreamingTextOutput.tsx` - Similar with output formatting
- `RealTimeStreamingInterface.tsx` - Complex implementation with thinking blocks

### Solution: Unified StreamingContent Component

#### 1. Component Structure

```typescript
// src/ui/components/streaming/StreamingContent.tsx

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

export type StreamingMode = 'basic' | 'formatted' | 'advanced';

export interface ThinkingBlock {
  id: string;
  phase: string;
  content: string;
  isComplete: boolean;
  startTime: number;
  endTime?: number;
}

export interface StreamingContentProps {
  /**
   * Text content to stream
   */
  content: string;
  
  /**
   * Whether content is actively streaming
   */
  isStreaming: boolean;
  
  /**
   * Characters per second to display
   */
  charsPerSecond?: number;
  
  /**
   * Text color
   */
  color?: string;
  
  /**
   * Whether streaming is paused
   */
  isPaused?: boolean;
  
  /**
   * Streaming mode
   */
  mode?: StreamingMode;
  
  /**
   * Advanced mode: thinking blocks
   */
  thinkingBlocks?: ThinkingBlock[];
  
  /**
   * Whether to show thinking blocks
   */
  showThinking?: boolean;
  
  /**
   * Called when streaming completes
   */
  onStreamComplete?: () => void;
  
  /**
   * Whether to enable markdown formatting
   */
  enableFormatting?: boolean;
  
  /**
   * Maximum width for content
   */
  maxWidth?: number;
  
  /**
   * Terminal dimensions
   */
  terminalWidth?: number;
  terminalHeight?: number;
}

export const StreamingContent: React.FC<StreamingContentProps> = ({
  content = '',
  isStreaming = false,
  charsPerSecond = 90,
  color,
  isPaused = false,
  mode = 'basic',
  thinkingBlocks = [],
  showThinking = false,
  onStreamComplete,
  enableFormatting = false,
  maxWidth,
  terminalWidth,
  terminalHeight,
}) => {
  // Implementation that handles all modes
  
  // Basic mode
  if (mode === 'basic') {
    // Simple character-by-character streaming
  }
  
  // Formatted mode
  if (mode === 'formatted') {
    // Streaming with markdown formatting
  }
  
  // Advanced mode
  if (mode === 'advanced') {
    // Complex streaming with thinking blocks
  }
  
  return (
    <Box flexDirection="column" width={maxWidth || terminalWidth}>
      {/* Content rendering based on mode */}
    </Box>
  );
};

// Legacy component adapters for backward compatibility
export const StreamingText = (props: any) => <StreamingContent mode="basic" {...props} />;
export const StreamingTextOutput = (props: any) => <StreamingContent mode="formatted" enableFormatting={true} {...props} />;
export const RealTimeStreamingInterface = (props: any) => <StreamingContent mode="advanced" {...props} />;
```

#### 2. Streaming Controller

Create a utility class to handle streaming logic:

```typescript
// src/ui/components/streaming/StreamingController.ts

export interface StreamingOptions {
  content: string;
  charsPerSecond: number;
  isPaused: boolean;
  onProgress?: (visibleText: string, progress: number) => void;
  onComplete?: () => void;
}

export class StreamingController {
  private content: string;
  private charsPerSecond: number;
  private isPaused: boolean;
  private timer: NodeJS.Timeout | null = null;
  private position = 0;
  private onProgress: (visibleText: string, progress: number) => void;
  private onComplete: () => void;
  
  constructor(options: StreamingOptions) {
    this.content = options.content;
    this.charsPerSecond = options.charsPerSecond;
    this.isPaused = options.isPaused;
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
  }
  
  start() {
    this.timer = setInterval(() => this.tick(), 1000 / this.charsPerSecond);
    return this;
  }
  
  pause() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isPaused = true;
    return this;
  }
  
  resume() {
    this.isPaused = false;
    return this.start();
  }
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    return this;
  }
  
  skipToEnd() {
    this.position = this.content.length;
    this.onProgress(this.content, 1);
    this.onComplete();
    return this.stop();
  }
  
  private tick() {
    if (this.isPaused) return;
    
    if (this.position < this.content.length) {
      this.position++;
      const visibleText = this.content.substring(0, this.position);
      const progress = this.position / this.content.length;
      this.onProgress(visibleText, progress);
    } else {
      this.stop();
      this.onComplete();
    }
  }
}
```

#### 3. Migration Plan

1. Create the new unified components
2. Implement streaming controller for core logic
3. Create adapter components for backward compatibility
4. Update consumers to use the new system
5. Write comprehensive tests
6. Deprecate old components

## Theme System Unification

### Current Situation

We have two theme systems:
- `/src/ui/themes/theme-manager.ts`
- `/src/ui/themes/theme.ts` and potentially `/src/ui/theme/ThemeProvider.tsx`

### Solution: Single Theme Context System

#### 1. Enhanced Theme Context

```typescript
// src/ui/contexts/ThemeContext.tsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import type { ThemeOptions } from '../themes/theme.js';
import { defaultTheme, loadTheme, saveTheme } from '../themes/theme-manager.js';

interface ThemeContextType {
  theme: ThemeOptions;
  setTheme: (theme: ThemeOptions | string) => void;
  availableThemes: string[];
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  customizeTheme: (updates: Partial<ThemeOptions>) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
  availableThemes: [],
  isDarkMode: true,
  toggleDarkMode: () => {},
  customizeTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeOptions>(defaultTheme);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  
  // Load available themes on init
  useEffect(() => {
    // Load themes implementation
  }, []);
  
  const setTheme = (themeInput: ThemeOptions | string) => {
    // Handle both theme object and theme name
  };
  
  const isDarkMode = theme.type === 'dark';
  
  const toggleDarkMode = () => {
    // Toggle between light/dark variants
  };
  
  const customizeTheme = (updates: Partial<ThemeOptions>) => {
    // Apply custom theme updates
  };
  
  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        setTheme, 
        availableThemes, 
        isDarkMode,
        toggleDarkMode,
        customizeTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
```

#### 2. Consolidated Theme Types

```typescript
// src/ui/themes/theme.ts

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  muted: string;
  [key: string]: string;
}

export interface ThemeUI {
  borders: string;
  highlights: string;
  shadows?: string;
  links: string;
}

export interface ThemeText {
  normal: string;
  bold: string;
  italic: string;
  underline: string;
  code: string;
}

export interface ThemeOptions {
  name: string;
  type: 'light' | 'dark';
  base?: string;
  colors: ThemeColors;
  ui: ThemeUI;
  text: ThemeText;
  animation?: {
    enabled: boolean;
    speed: 'slow' | 'normal' | 'fast';
  };
}
```

#### 3. Migration Plan

1. Consolidate theme types
2. Enhance ThemeContext with all needed functionality
3. Update theme manager to work with the enhanced context
4. Create adapter functions for any legacy theme usage
5. Update components to use the new theme context
6. Remove deprecated theme access patterns

## Claude Client Hook Consolidation

### Current Situation

We have two similar client hooks:
- `useClaudeStream.ts`
- `useClaude4Stream.ts`

### Solution: Unified Client Hook

#### 1. Unified Hook Implementation

```typescript
// src/ui/hooks/useClaudeClient.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ClaudeModel, StreamingOptions, ToolCall, ToolResult } from '../../ai/types.js';

export interface UseClaudeClientOptions {
  /**
   * Claude model to use
   */
  model?: ClaudeModel;
  
  /**
   * Maximum tokens to generate
   */
  maxTokens?: number;
  
  /**
   * Temperature for generation
   */
  temperature?: number;
  
  /**
   * Enable tool use
   */
  enableTools?: boolean;
  
  /**
   * Available tools
   */
  tools?: Array<{name: string; description: string}>;
  
  /**
   * Streaming options
   */
  streaming?: StreamingOptions;
  
  /**
   * Enable thinking display
   */
  enableThinking?: boolean;
  
  /**
   * Callback when tool is called
   */
  onToolCall?: (tool: ToolCall) => Promise<ToolResult>;
}

export function useClaudeClient(options: UseClaudeClientOptions = {}) {
  // Default to Claude 4 if not specified
  const model = options.model || 'claude-4';
  
  // States for streaming
  const [isStreaming, setIsStreaming] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [toolResults, setToolResults] = useState<Record<string, ToolResult>>({});
  const [thinking, setThinking] = useState<Array<{content: string, complete: boolean}>>([]);
  
  // Create client based on model
  const createClient = useCallback(() => {
    // Implementation that creates appropriate client based on model
  }, [model]);
  
  // Submit query function
  const submitQuery = useCallback(async (query: string, context?: string) => {
    // Implementation that handles both Claude 3 and Claude 4
    // with appropriate model-specific behavior
  }, [model, options]);
  
  // Other utility functions and state management
  
  return {
    isStreaming,
    response,
    error,
    toolCalls,
    toolResults,
    thinking,
    submitQuery,
    // Other useful exports
  };
}

// Legacy adapters
export function useClaudeStream(options: any = {}) {
  return useClaudeClient({ ...options, model: 'claude-3-opus' });
}

export function useClaude4Stream(options: any = {}) {
  return useClaudeClient({ ...options, model: 'claude-4' });
}
```

#### 2. Migration Plan

1. Create the unified hook with model-specific behavior
2. Implement adapters for backward compatibility
3. Test with both Claude 3 and Claude 4 requests
4. Update components to use the new hook
5. Eventually deprecate the adapter hooks

## Image Handling Improvement

### Current Situation

We have split image handling between:
- `ImageDisplay.tsx` - High-level component
- `ImageRenderer.tsx` - Low-level rendering
- `imageUtils.ts` - Utility functions

### Solution: Clear Component Responsibility

#### 1. Redefined Component Responsibilities

```typescript
// src/ui/components/image/ImageDisplay.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { ImageRenderer } from './ImageRenderer.js';
import { processImage, ImageMetadata, IMAGE_FORMAT_SUPPORT } from '../../utils/imageUtils.js';

export interface ImageDisplayProps {
  /**
   * Image source (file path or URL)
   */
  source: string;
  
  /**
   * Maximum display width
   */
  maxWidth?: number;
  
  /**
   * Maximum display height
   */
  maxHeight?: number;
  
  /**
   * Alt text for accessibility
   */
  altText?: string;
  
  /**
   * Image metadata
   */
  metadata?: Record<string, any>;
  
  /**
   * Rendering quality
   */
  quality?: 'low' | 'medium' | 'high';
  
  /**
   * Error handler
   */
  onError?: (error: Error) => void;
  
  /**
   * Loading handler
   */
  onLoad?: (metadata: ImageMetadata) => void;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  source,
  maxWidth = 80,
  maxHeight = 24,
  altText = 'Image',
  metadata = {},
  quality = 'medium',
  onError,
  onLoad,
}) => {
  // Handle image loading, processing, and error states
  // This component is responsible for:
  // 1. Loading the image
  // 2. Processing image data
  // 3. Error handling
  // 4. Passing processed data to renderer
  
  return (
    <Box flexDirection="column">
      {/* Image header with metadata */}
      {/* Delegate actual rendering to ImageRenderer */}
      <ImageRenderer 
        imageData={processedData}
        width={displayWidth}
        height={displayHeight}
        quality={quality}
      />
      {/* Image footer with additional info */}
    </Box>
  );
};
```

#### 2. Focused Renderer

```typescript
// src/ui/components/image/ImageRenderer.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { renderTerminalImage } from '../../utils/imageUtils.js';

export interface ImageRendererProps {
  /**
   * Processed image data
   */
  imageData: Uint8Array | string;
  
  /**
   * Display width
   */
  width: number;
  
  /**
   * Display height
   */
  height: number;
  
  /**
   * Rendering quality
   */
  quality?: 'low' | 'medium' | 'high';
}

export const ImageRenderer: React.FC<ImageRendererProps> = ({
  imageData,
  width,
  height,
  quality = 'medium',
}) => {
  // This component is responsible ONLY for rendering
  // It receives already processed image data
  
  return (
    <Box>
      {/* Render image using terminal characters */}
    </Box>
  );
};
```

#### 3. Consolidated Image Utilities

```typescript
// src/ui/utils/imageUtils.ts

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  aspectRatio: number;
}

export const IMAGE_FORMAT_SUPPORT = {
  png: true,
  jpg: true,
  jpeg: true,
  gif: true,
  webp: true,
  svg: false, // Special handling
};

/**
 * Load image from source (file or URL)
 */
export async function loadImage(
  source: string
): Promise<{data: Uint8Array, metadata: ImageMetadata}> {
  // Implementation
}

/**
 * Process image for terminal display
 */
export async function processImage(
  source: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: 'low' | 'medium' | 'high';
  } = {}
): Promise<{
  data: Uint8Array;
  metadata: ImageMetadata;
  displayWidth: number;
  displayHeight: number;
}> {
  // Implementation
}

/**
 * Render image using terminal characters
 */
export function renderTerminalImage(
  imageData: Uint8Array,
  width: number,
  height: number,
  quality: 'low' | 'medium' | 'high' = 'medium'
): string[] {
  // Implementation
}

// Other utility functions
```

#### 4. Migration Plan

1. Clearly define component responsibilities
2. Consolidate image utilities
3. Update components to follow the new pattern
4. Add comprehensive error handling
5. Improve documentation

## Migration Strategies

### 1. Feature Flags

Use feature flags to gradually roll out changes:

```typescript
// Example implementation with feature flags
if (config.features.unifiedProgressBar) {
  return <ProgressSystem mode="standard" {...props} />;
} else {
  return <LegacyProgressBar {...props} />;
}
```

### 2. Documentation Examples

Provide clear migration examples:

```typescript
// Before
import { ProgressBar } from '../../components/ProgressBar.js';

function MyComponent() {
  return <ProgressBar value={50} width={40} />;
}

// After
import { ProgressSystem } from '../../components/progress/ProgressSystem.js';

function MyComponent() {
  return <ProgressSystem mode="standard" value={50} width={40} />;
}
```

### 3. Incremental Adoption

Allow gradual adoption of new components:

1. Stage 1: Create new components with adapters
2. Stage 2: Update direct imports in a few components
3. Stage 3: Update more components as confidence grows
4. Stage 4: Remove adapter layer

### 4. Testing Strategy

For each migration:

1. Write tests for the new component first
2. Create tests that compare output of old and new components
3. Ensure behavior parity for key use cases
4. Test edge cases thoroughly

### 5. Backward Compatibility Layers

Maintain adapter components during transition:

```typescript
// Example adapter component
export const ProgressBar = (props: any) => {
  console.warn('ProgressBar is deprecated, use ProgressSystem instead');
  return <ProgressSystem mode="standard" {...props} />;
};
```