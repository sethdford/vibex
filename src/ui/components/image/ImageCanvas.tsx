/**
 * Image Canvas Component
 * 
 * Renders an image in the terminal with support for zooming, panning,
 * highlighting regions, and image adjustments.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { Colors } from '../../colors.js';
import { 
  ImageCanvasProps, 
  Position, 
  Rectangle,
  ViewState
} from './types.js';
import { 
  applyViewTransform,
  DEFAULT_VIEW_STATE,
  generateCssFilters
} from './utils.js';

/**
 * Image Canvas Component
 */
export const ImageCanvas: React.FC<ImageCanvasProps> = ({
  imagePath,
  imageData,
  width,
  height,
  viewState,
  adjustments,
  highlightRegions = [],
  isFocused = true,
  onFocusChange,
  onRegionSelect,
  onImageLoad,
  altText,
  asciiArt
}) => {
  // State for dragging
  const [isDragging, setIsDragging] = useState<boolean>(false);
  // State for drag start position
  const [dragStartPos, setDragStartPos] = useState<Position | null>(null);
  // State for current mouse position
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
  // State for highlighted region
  const [activeRegion, setActiveRegion] = useState<number>(-1);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Handle zooming
    if (input === '+' || input === '=') {
      const newZoom = Math.min(viewState.zoom * 1.1, 5);
      updateViewState({ ...viewState, zoom: newZoom });
      return;
    }
    
    if (input === '-' || input === '_') {
      const newZoom = Math.max(viewState.zoom * 0.9, 0.1);
      updateViewState({ ...viewState, zoom: newZoom });
      return;
    }
    
    // Handle panning with arrow keys
    const panAmount = 10 / viewState.zoom;
    
    if (key.upArrow) {
      updateViewState({
        ...viewState,
        position: {
          x: viewState.position.x,
          y: viewState.position.y - panAmount
        }
      });
      return;
    }
    
    if (key.downArrow) {
      updateViewState({
        ...viewState,
        position: {
          x: viewState.position.x,
          y: viewState.position.y + panAmount
        }
      });
      return;
    }
    
    if (key.leftArrow) {
      updateViewState({
        ...viewState,
        position: {
          x: viewState.position.x - panAmount,
          y: viewState.position.y
        }
      });
      return;
    }
    
    if (key.rightArrow) {
      updateViewState({
        ...viewState,
        position: {
          x: viewState.position.x + panAmount,
          y: viewState.position.y
        }
      });
      return;
    }
    
    // Handle reset view
    if (input.toLowerCase() === 'r') {
      updateViewState(DEFAULT_VIEW_STATE);
      return;
    }
    
    // Handle cycling through highlight regions
    if (input === 'h' && highlightRegions.length > 0) {
      setActiveRegion((prev) => {
        const next = (prev + 1) % highlightRegions.length;
        return next;
      });
      return;
    }
    
    // Handle selecting regions
    if (key.return && activeRegion >= 0 && onRegionSelect) {
      onRegionSelect(highlightRegions[activeRegion]);
      return;
    }
    
    // Handle tab to switch focus
    if (key.tab) {
      if (onFocusChange) {
        onFocusChange(false);
      }
      return;
    }
  }, { isActive: isFocused });
  
  // Helper to update view state
  const updateViewState = (newViewState: ViewState) => {
    // This would update the parent's viewState through the callback
    // In a real implementation, this would be provided by the parent
  };
  
  // Simulate rendering image in the terminal
  // In a real implementation, this would use terminal graphics capabilities
  // like iTerm2's imgcat or Kitty's terminal graphics protocol
  const renderTerminalImage = () => {
    if (asciiArt) {
      // If we have ASCII art, render that
      return (
        <Box flexDirection="column">
          <Text>{asciiArt}</Text>
        </Box>
      );
    }
    
    if (!imageData) {
      // Fallback for when we can't render the image
      return (
        <Box 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center"
          height={height}
        >
          <Text color={Colors.TextDim}>
            Image preview not available in this terminal
          </Text>
          <Text color={Colors.TextDim}>
            {altText || `Image: ${imagePath}`}
          </Text>
        </Box>
      );
    }
    
    // Mock representation of terminal image rendering
    // In a real implementation, this would contain the actual rendering logic
    return (
      <Box 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center"
        height={height - 2}
      >
        <Text color={Colors.TextDim}>[Image would be rendered here in compatible terminal]</Text>
        <Text color={Colors.Primary}>{imagePath.split('/').pop()}</Text>
      </Box>
    );
  };
  
  // Render highlight regions
  const renderHighlightRegions = () => {
    return highlightRegions.map((region, index) => {
      // Apply view transformations to the region coordinates
      const transformedX = applyViewTransform(
        region.x,
        region.y,
        viewState,
        width,
        height
      ).x;
      
      const transformedY = applyViewTransform(
        region.x,
        region.y,
        viewState,
        width,
        height
      ).y;
      
      // Calculate the visible part of the region
      const isActive = index === activeRegion;
      
      return (
        <Box 
          key={`region-${index}`}
          position="absolute"
          left={transformedX}
          top={transformedY}
          borderStyle="round"
          borderColor={isActive ? Colors.Primary : (region.color || Colors.Secondary)}
          paddingX={1}
          paddingY={0}
        >
          <Text color={isActive ? Colors.Primary : (region.color || Colors.Secondary)}>
            {region.label || `Region ${index + 1}`}
          </Text>
        </Box>
      );
    });
  };
  
  return (
    <Box 
      width={width} 
      height={height}
      flexDirection="column"
      overflow="hidden"
      paddingX={1}
      paddingY={1}
      borderStyle={isFocused ? "single" : undefined}
      borderColor={isFocused ? Colors.Primary : undefined}
    >
      {/* Render image */}
      <Box position="relative">
        {renderTerminalImage()}
        {renderHighlightRegions()}
      </Box>
      
      {/* Image info overlay */}
      <Box 
        position="absolute" 
        bottom={1} 
        right={2}
        backgroundColor={Colors.Background}
        paddingX={1}
      >
        <Text color={Colors.TextDim}>
          Zoom: {Math.round(viewState.zoom * 100)}%
        </Text>
      </Box>
    </Box>
  );
};

export default ImageCanvas;