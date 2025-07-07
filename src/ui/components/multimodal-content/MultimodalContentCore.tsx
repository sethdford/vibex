/**
 * Multimodal Content Core - Clean Architecture like Gemini CLI
 * 
 * Main orchestrator component that composes services and manages state
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import { logger } from '../../../utils/logger.js';

// Services
import { FileTypeService } from './FileTypeService.js';
import { ContentProcessingService } from './ContentProcessingService.js';
import { ContentStateService } from './ContentStateService.js';
import { ContentDisplayService } from './ContentDisplayService.js';

// Types
import { 
  MultimodalContentHandlerProps,
  MultimodalContentItem,
  MultimodalTheme,
  ProcessingCapabilities,
  ContentType,
  ProcessingStatus
} from './types.js';

// Components
import { ContentHeaderView } from './ContentHeaderView.js';
import { ContentCapabilitiesView } from './ContentCapabilitiesView.js';
import { ContentListView } from './ContentListView.js';
import { ContentInputView } from './ContentInputView.js';
import { ContentControlsView } from './ContentControlsView.js';

/**
 * Multimodal Content Core Component
 */
export const MultimodalContentCore: React.FC<MultimodalContentHandlerProps> = ({
  contentItems,
  capabilities,
  terminalWidth,
  terminalHeight,
  dragDropEnabled = true,
  maxFileSize = 50 * 1024 * 1024,
  supportedTypes = Object.values(ContentType),
  theme = {},
  onContentUpload,
  onContentAnalyze,
  onContentRemove,
  onBatchProcess,
  onContentInteraction
}) => {
  
  // Create theme with defaults
  const fullTheme: MultimodalTheme = useMemo(() => ({
    primary: Colors.Primary,
    secondary: Colors.Secondary,
    accent: Colors.AccentBlue,
    success: Colors.Success,
    warning: Colors.Warning,
    error: Colors.Error,
    muted: Colors.TextMuted,
    ...theme
  }), [theme]);

  // Initialize services
  const [contentProcessingService] = useState(() => 
    new ContentProcessingService(capabilities, maxFileSize)
  );
  
  const [contentStateService] = useState(() => 
    new ContentStateService()
  );
  
  const [contentDisplayService] = useState(() => 
    new ContentDisplayService(fullTheme)
  );

  // Local state for UI
  const [state, setState] = useState(() => contentStateService.getState());

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = contentStateService.subscribe(setState);
    return unsubscribe;
  }, [contentStateService]);

  // Update services when props change
  useEffect(() => {
    contentProcessingService.updateCapabilities(capabilities);
  }, [capabilities, contentProcessingService]);

  useEffect(() => {
    contentDisplayService.updateTheme(fullTheme);
  }, [fullTheme, contentDisplayService]);

  // Get filtered and sorted items
  const filteredItems = useMemo(() => {
    return contentStateService.filterAndSortItems(contentItems);
  }, [contentItems, state.filterOptions, contentStateService]);

  // Get content statistics
  const contentStats = useMemo(() => {
    return contentStateService.getContentStats(contentItems);
  }, [contentItems, state, contentStateService]);

  // Handle file input submission
  const handleFileInputSubmit = useCallback(async () => {
    const filePaths = FileTypeService.parseFilePathsFromInput(state.filePathInput);
    
    if (filePaths.length === 0) {
      contentStateService.clearFilePathInput();
      return;
    }

    // Add files to processing
    filePaths.forEach(filePath => {
      contentStateService.addProcessingFile(filePath);
    });

    // Process files
    const processedFiles: File[] = [];
    
    for (const filePath of filePaths) {
      try {
        const result = await contentProcessingService.processFile(filePath);
        
        if (result.success && result.contentItem) {
          // Create mock File object for callback
          const mockFile = new File([''], result.contentItem.name, {
            type: result.contentItem.mimeType
          });
          processedFiles.push(mockFile);
        } else {
          logger.error('Failed to process file:', result.error);
        }
      } catch (error) {
        logger.error('Error processing file:', error);
      } finally {
        contentStateService.removeProcessingFile(filePath);
      }
    }

    // Call upload callback if provided
    if (onContentUpload && processedFiles.length > 0) {
      onContentUpload(processedFiles);
    }

    contentStateService.clearFilePathInput();
  }, [state.filePathInput, contentProcessingService, contentStateService, onContentUpload]);

  // Handle content analysis
  const handleContentAnalyze = useCallback(async (contentId: string) => {
    const item = contentItems.find(item => item.id === contentId);
    if (!item) return;

    try {
      await contentProcessingService.analyzeContent(item);
      
      if (onContentAnalyze) {
        onContentAnalyze(contentId);
      }
    } catch (error) {
      logger.error('Error analyzing content:', error);
    }
  }, [contentItems, contentProcessingService, onContentAnalyze]);

  // Handle batch processing
  const handleBatchProcess = useCallback(async () => {
    const selectedIds = contentStateService.getSelectedItems();
    
    if (selectedIds.length === 0) return;

    try {
      await contentProcessingService.batchProcess(selectedIds, contentItems);
      
      if (onBatchProcess) {
        onBatchProcess(selectedIds);
      }
    } catch (error) {
      logger.error('Error in batch processing:', error);
    }
  }, [contentProcessingService, contentStateService, contentItems, onBatchProcess]);

  // Handle content removal
  const handleContentRemove = useCallback(() => {
    const selectedIds = contentStateService.getSelectedItems();
    
    selectedIds.forEach(id => {
      if (onContentRemove) {
        onContentRemove(id);
      }
    });
    
    contentStateService.clearSelection();
  }, [contentStateService, onContentRemove]);

  // Handle content interaction
  const handleContentInteraction = useCallback((contentId: string, action: 'view' | 'edit' | 'share' | 'export') => {
    if (onContentInteraction) {
      onContentInteraction(contentId, action);
    }
  }, [onContentInteraction]);

  // Keyboard input handling
  useInput(useCallback((input, key) => {
    // Handle file input mode
    if (state.showFileInput) {
      if (key.return) {
        handleFileInputSubmit();
      } else if (key.escape) {
        contentStateService.clearFilePathInput();
      } else if (key.backspace || key.delete) {
        const newInput = state.filePathInput.slice(0, -1);
        contentStateService.setFilePathInput(newInput);
      } else if (input && !key.ctrl && !key.meta) {
        const newInput = state.filePathInput + input;
        contentStateService.setFilePathInput(newInput);
      }
      return;
    }

    // Navigation
    if (key.upArrow) {
      contentStateService.navigateSelection(filteredItems, 'up');
    } else if (key.downArrow) {
      contentStateService.navigateSelection(filteredItems, 'down');
    }

    // Selection
    else if (input === ' ') {
      const selectedIds = contentStateService.getSelectedItems();
      if (selectedIds.length > 0) {
        contentStateService.toggleItemSelection(selectedIds[selectedIds.length - 1]);
      }
    }

    // Actions
    else if (key.return) {
      const selectedIds = contentStateService.getSelectedItems();
      if (selectedIds.length > 0) {
        handleContentAnalyze(selectedIds[selectedIds.length - 1]);
      }
    }

    // Keyboard shortcuts
    else if (key.ctrl) {
      switch (input) {
        case 'a':
          contentStateService.selectAllItems(filteredItems);
          break;
        case 'r':
          handleContentRemove();
          break;
        case 'p':
          handleBatchProcess();
          break;
        case 'u':
          contentStateService.toggleFileInput();
          break;
        case 'i':
          contentStateService.toggleAnalysisView();
          break;
        case 'v':
          const currentMode = state.viewMode;
          const modes: Array<'list' | 'grid' | 'details'> = ['list', 'grid', 'details'];
          const nextIndex = (modes.indexOf(currentMode) + 1) % modes.length;
          contentStateService.setViewMode(modes[nextIndex]);
          break;
        case 'f':
          // TODO: Implement filter dialog
          break;
        case 'o':
          // Show current directory
          const cwd = process.cwd();
          contentStateService.setFilePathInput(cwd + '/');
          contentStateService.toggleFileInput();
          break;
      }
    }
  }, [
    state.showFileInput,
    state.filePathInput,
    state.viewMode,
    filteredItems,
    contentStateService,
    handleFileInputSubmit,
    handleContentAnalyze,
    handleContentRemove,
    handleBatchProcess
  ]));

  // Layout calculations
  const layout = useMemo(() => {
    return contentDisplayService.getLayoutDimensions(terminalWidth, terminalHeight);
  }, [terminalWidth, terminalHeight, contentDisplayService]);

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Header */}
      <ContentHeaderView
        contentStats={contentStats}
        displayService={contentDisplayService}
        theme={fullTheme}
        terminalWidth={layout.contentWidth}
      />

      {/* Capabilities */}
      <ContentCapabilitiesView
        capabilities={capabilities}
        displayService={contentDisplayService}
        theme={fullTheme}
        terminalWidth={layout.contentWidth}
      />

      {/* Content List */}
      <Box flexDirection="column" flexGrow={1}>
        <ContentListView
          contentItems={filteredItems}
          selectedItems={state.selectedItems}
          processingFiles={state.processingFiles}
          showAnalysis={state.showAnalysis}
          viewMode={state.viewMode}
          displayService={contentDisplayService}
          theme={fullTheme}
          terminalWidth={layout.contentWidth}
          terminalHeight={layout.contentHeight}
          onItemInteraction={handleContentInteraction}
        />
      </Box>

      {/* File Input */}
      {state.showFileInput && (
        <ContentInputView
          filePathInput={state.filePathInput}
          displayService={contentDisplayService}
          theme={fullTheme}
          terminalWidth={layout.contentWidth}
        />
      )}

      {/* Controls */}
      <ContentControlsView
        displayService={contentDisplayService}
        theme={fullTheme}
        terminalWidth={layout.contentWidth}
      />
    </Box>
  );
};

export default MultimodalContentCore; 