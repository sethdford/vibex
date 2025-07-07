/**
 * Screenshot Preview Component
 * 
 * Displays screenshots captured by tools in the terminal with interactive
 * controls for examining and manipulating the image.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { 
  ScreenshotPreviewProps, 
  ViewState, 
  ImageAdjustments, 
  ImageMetadata, 
  Rectangle 
} from './types.js';
import { 
  getImageMetadata, 
  DEFAULT_VIEW_STATE, 
  DEFAULT_ADJUSTMENTS,
  generateAsciiArt,
  terminalSupportsImages,
  getTerminalImageData,
  formatFileSize
} from './utils.js';
import { ImageCanvas } from './ImageCanvas.js';
import { ControlsPanel } from './ControlsPanel.js';
import { MetadataPanel } from './MetadataPanel.js';

/**
 * Screenshot Preview Component
 */
export const ScreenshotPreview: React.FC<ScreenshotPreviewProps> = ({
  imagePath,
  imageData,
  width,
  height,
  showControls = true,
  showMetadata = true,
  maxDisplayResolution,
  highlightRegions = [],
  isFocused = true,
  initialViewState,
  initialAdjustments,
  keyboardEnabled = true,
  altText,
  onFocusChange,
  onViewStateChange,
  onAdjustmentsChange,
  onRegionSelect
}) => {
  // State for image metadata
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  // State for loading
  const [loading, setLoading] = useState<boolean>(true);
  // State for error
  const [error, setError] = useState<string | null>(null);
  // State for ASCII art fallback
  const [asciiArt, setAsciiArt] = useState<string | null>(null);
  // State for terminal image data
  const [terminalImageData, setTerminalImageData] = useState<string | null>(null);
  // State for view state
  const [viewState, setViewState] = useState<ViewState>({
    ...DEFAULT_VIEW_STATE,
    ...initialViewState
  });
  // State for image adjustments
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    ...DEFAULT_ADJUSTMENTS,
    ...initialAdjustments
  });
  // State for selected region
  const [selectedRegion, setSelectedRegion] = useState<Rectangle | null>(null);
  // State for active panel
  const [activePanel, setActivePanel] = useState<'image' | 'controls' | 'metadata'>('image');
  
  // Load image metadata and prepare display
  useEffect(() => {
    const loadImage = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get image metadata
        const meta = await getImageMetadata(imagePath);
        setMetadata(meta);
        
        // Check if terminal supports images
        const supportsImages = terminalSupportsImages();
        
        if (supportsImages) {
          // Get terminal image data for direct rendering
          const termData = await getTerminalImageData(
            imagePath,
            maxDisplayResolution?.width || width,
            maxDisplayResolution?.height || height
          );
          setTerminalImageData(termData);
        } else {
          // Generate ASCII art as fallback
          const ascii = await generateAsciiArt(
            imagePath,
            Math.floor(width * 0.8),
            Math.floor(height * 0.6)
          );
          setAsciiArt(ascii);
        }
        
        setLoading(false);
      } catch (err) {
        setError(`Failed to load image: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };
    
    loadImage();
  }, [imagePath, width, height, maxDisplayResolution]);
  
  // Handle view state change
  const handleViewStateChange = useCallback((newViewState: ViewState) => {
    setViewState(newViewState);
    if (onViewStateChange) {
      onViewStateChange(newViewState);
    }
  }, [onViewStateChange]);
  
  // Handle adjustments change
  const handleAdjustmentsChange = useCallback((newAdjustments: ImageAdjustments) => {
    setAdjustments(newAdjustments);
    if (onAdjustmentsChange) {
      onAdjustmentsChange(newAdjustments);
    }
  }, [onAdjustmentsChange]);
  
  // Handle region selection
  const handleRegionSelect = useCallback((region: Rectangle) => {
    setSelectedRegion(region);
    if (onRegionSelect) {
      onRegionSelect(region);
    }
  }, [onRegionSelect]);
  
  // Handle focus change
  const handleFocusChange = useCallback((focused: boolean) => {
    if (onFocusChange) {
      onFocusChange(focused);
    }
  }, [onFocusChange]);
  
  // Calculate component layout
  const controlsHeight = 6;
  const metadataHeight = 8;
  
  const imageHeight = height - 
    (showControls ? controlsHeight + 1 : 0) -
    (showMetadata ? metadataHeight + 1 : 0);
  
  // Render loading state
  if (loading) {
    return (
      <Box 
        width={width} 
        height={height} 
        borderStyle={isFocused ? "bold" : "single"}
        borderColor={isFocused ? Colors.Primary : Colors.Border}
        alignItems="center"
        justifyContent="center"
      >
        <Text color={Colors.Primary}>Loading image...</Text>
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Box 
        width={width} 
        height={height} 
        borderStyle={isFocused ? "bold" : "single"}
        borderColor={isFocused ? Colors.Error : Colors.Border}
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        padding={1}
      >
        <Text color={Colors.Error}>Error loading image</Text>
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>{error}</Text>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box 
      width={width} 
      height={height} 
      borderStyle={isFocused ? "bold" : "single"}
      borderColor={isFocused ? Colors.Primary : Colors.Border}
      flexDirection="column"
    >
      {/* Header */}
      <Box 
        width={width} 
        paddingX={1}
        backgroundColor={Colors.BackgroundAlt}
      >
        <Text bold color={Colors.Primary}>
          Screenshot Preview
        </Text>
        
        {metadata && (
          <>
            <Text color={Colors.TextDim}> - </Text>
            <Text>
              {metadata.size.width}x{metadata.size.height}
            </Text>
            <Text color={Colors.TextDim}> - </Text>
            <Text>{formatFileSize(metadata.fileSize)}</Text>
            <Text color={Colors.TextDim}> - </Text>
            <Text>{metadata.format.toUpperCase()}</Text>
          </>
        )}
        
        <Box flexGrow={1} justifyContent="flex-end">
          <Text 
            backgroundColor={activePanel === 'image' ? Colors.Primary : undefined}
            color={activePanel === 'image' ? Colors.Background : Colors.Text}
            paddingX={1}
            marginRight={1}
            onClick={() => setActivePanel('image')}
          >
            Image
          </Text>
          
          {showControls && (
            <Text 
              backgroundColor={activePanel === 'controls' ? Colors.Primary : undefined}
              color={activePanel === 'controls' ? Colors.Background : Colors.Text}
              paddingX={1}
              marginRight={1}
              onClick={() => setActivePanel('controls')}
            >
              Controls
            </Text>
          )}
          
          {showMetadata && metadata && (
            <Text 
              backgroundColor={activePanel === 'metadata' ? Colors.Primary : undefined}
              color={activePanel === 'metadata' ? Colors.Background : Colors.Text}
              paddingX={1}
              onClick={() => setActivePanel('metadata')}
            >
              Metadata
            </Text>
          )}
        </Box>
      </Box>
      
      {/* Main content area */}
      <Box flexDirection="column" flexGrow={1}>
        {/* Image canvas */}
        {activePanel === 'image' && metadata && (
          <ImageCanvas 
            imagePath={imagePath}
            imageData={imageData || terminalImageData || undefined}
            width={width}
            height={imageHeight}
            viewState={viewState}
            adjustments={adjustments}
            highlightRegions={highlightRegions}
            isFocused={isFocused && activePanel === 'image'}
            onFocusChange={handleFocusChange}
            onRegionSelect={handleRegionSelect}
            altText={altText}
            asciiArt={asciiArt}
          />
        )}
        
        {/* Controls panel */}
        {activePanel === 'controls' && showControls && (
          <ControlsPanel 
            viewState={viewState}
            adjustments={adjustments}
            width={width}
            isFocused={isFocused && activePanel === 'controls'}
            onViewStateChange={handleViewStateChange}
            onAdjustmentsChange={handleAdjustmentsChange}
          />
        )}
        
        {/* Metadata panel */}
        {activePanel === 'metadata' && showMetadata && metadata && (
          <MetadataPanel 
            metadata={metadata}
            width={width}
          />
        )}
      </Box>
      
      {/* Footer with keyboard shortcuts */}
      <Box 
        width={width} 
        paddingX={1}
        backgroundColor={Colors.BackgroundAlt}
      >
        <Text color={Colors.TextDim}>
          <Text color={Colors.AccentBlue}>Tab</Text> Switch Panel
          {' | '}
          <Text color={Colors.AccentBlue}>↑↓←→</Text> Navigate
          {' | '}
          <Text color={Colors.AccentBlue}>+/-</Text> Zoom
          {' | '}
          <Text color={Colors.AccentBlue}>R</Text> Reset View
          {' | '}
          <Text color={Colors.AccentBlue}>Esc</Text> Exit
        </Text>
      </Box>
    </Box>
  );
};

export default ScreenshotPreview;