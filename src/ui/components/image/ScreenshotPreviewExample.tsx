/**
 * Screenshot Preview Example Component
 * 
 * Example implementation of the Screenshot Preview component.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { ScreenshotPreview } from './index.js';
import { Rectangle, ViewState, ImageAdjustments } from './types.js';

/**
 * Screenshot Preview Example props
 */
interface ScreenshotPreviewExampleProps {
  /**
   * Path to the image file
   */
  imagePath: string;
  
  /**
   * Available width for the component
   */
  width?: number;
  
  /**
   * Available height for the component
   */
  height?: number;
  
  /**
   * Whether to show controls
   */
  showControls?: boolean;
  
  /**
   * Whether to show metadata
   */
  showMetadata?: boolean;
}

/**
 * Screenshot Preview Example component
 */
export const ScreenshotPreviewExample: React.FC<ScreenshotPreviewExampleProps> = ({
  imagePath,
  width = 100,
  height = 40,
  showControls = true,
  showMetadata = true
}) => {
  // State for selected region
  const [selectedRegion, setSelectedRegion] = useState<Rectangle | null>(null);
  // State for view state
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    position: { x: 0, y: 0 },
    rotation: 0
  });
  // State for adjustments
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 1,
    contrast: 1,
    invert: false,
    grayscale: false
  });
  
  // Sample highlight regions
  const highlightRegions: Rectangle[] = [
    {
      x: 10,
      y: 10,
      width: 100,
      height: 30,
      color: Colors.AccentBlue,
      label: 'Header'
    },
    {
      x: 50,
      y: 50,
      width: 150,
      height: 40,
      color: Colors.AccentGreen,
      label: 'Content Area'
    },
    {
      x: 30,
      y: 100,
      width: 80,
      height: 25,
      color: Colors.AccentRed,
      label: 'Button'
    }
  ];
  
  // Handle region selection
  const handleRegionSelect = (region: Rectangle) => {
    setSelectedRegion(region);
  };
  
  // Handle view state change
  const handleViewStateChange = (newViewState: ViewState) => {
    setViewState(newViewState);
  };
  
  // Handle adjustments change
  const handleAdjustmentsChange = (newAdjustments: ImageAdjustments) => {
    setAdjustments(newAdjustments);
  };
  
  return (
    <Box flexDirection="column">
      <Box 
        paddingX={1}
        paddingY={0}
        borderStyle="single"
        borderColor={Colors.Border}
        backgroundColor={Colors.BackgroundAlt}
        marginBottom={1}
      >
        <Text bold color={Colors.Primary}>Screenshot Preview Example</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={Colors.TextDim}>
            {imagePath.split('/').pop()}
          </Text>
        </Box>
      </Box>
      
      <ScreenshotPreview
        imagePath={imagePath}
        width={width}
        height={height - 3}
        showControls={showControls}
        showMetadata={showMetadata}
        highlightRegions={highlightRegions}
        onRegionSelect={handleRegionSelect}
        onViewStateChange={handleViewStateChange}
        onAdjustmentsChange={handleAdjustmentsChange}
      />
      
      {selectedRegion && (
        <Box 
          marginTop={1}
          borderStyle="single"
          borderColor={Colors.Border}
          paddingX={1}
          paddingY={0}
        >
          <Text>Selected: </Text>
          <Text color={Colors.Primary}>{selectedRegion.label}</Text>
          <Text color={Colors.TextDim}>
            {' at '}
            ({selectedRegion.x}, {selectedRegion.y})
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ScreenshotPreviewExample;