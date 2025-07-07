/**
 * Controls Panel Component
 * 
 * Provides UI controls for adjusting image view state and appearance.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { Colors } from '../../colors.js';
import { ControlsPanelProps, ImageAdjustments, ViewState } from './types.js';

/**
 * Controls Panel Component
 */
export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  viewState,
  adjustments,
  width,
  isFocused = true,
  onViewStateChange,
  onAdjustmentsChange
}) => {
  // Handle keyboard input for adjustments
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Handle zoom controls
    if (input === '+' || input === '=') {
      const newZoom = Math.min(viewState.zoom * 1.1, 5);
      onViewStateChange({ ...viewState, zoom: newZoom });
      return;
    }
    
    if (input === '-' || input === '_') {
      const newZoom = Math.max(viewState.zoom * 0.9, 0.1);
      onViewStateChange({ ...viewState, zoom: newZoom });
      return;
    }
    
    // Handle brightness adjustment
    if (input === 'b') {
      const newBrightness = Math.min(adjustments.brightness + 0.1, 2);
      onAdjustmentsChange({ ...adjustments, brightness: newBrightness });
      return;
    }
    
    if (input === 'd') {
      const newBrightness = Math.max(adjustments.brightness - 0.1, 0.1);
      onAdjustmentsChange({ ...adjustments, brightness: newBrightness });
      return;
    }
    
    // Handle contrast adjustment
    if (input === 'c') {
      const newContrast = Math.min(adjustments.contrast + 0.1, 2);
      onAdjustmentsChange({ ...adjustments, contrast: newContrast });
      return;
    }
    
    if (input === 'v') {
      const newContrast = Math.max(adjustments.contrast - 0.1, 0.1);
      onAdjustmentsChange({ ...adjustments, contrast: newContrast });
      return;
    }
    
    // Toggle grayscale
    if (input === 'g') {
      onAdjustmentsChange({ ...adjustments, grayscale: !adjustments.grayscale });
      return;
    }
    
    // Toggle invert
    if (input === 'i') {
      onAdjustmentsChange({ ...adjustments, invert: !adjustments.invert });
      return;
    }
    
    // Reset all adjustments
    if (input === 'r') {
      onViewStateChange({
        zoom: 1,
        position: { x: 0, y: 0 },
        rotation: 0
      });
      
      onAdjustmentsChange({
        brightness: 1,
        contrast: 1,
        invert: false,
        grayscale: false
      });
      return;
    }
  }, { isActive: isFocused });
  
  // Create a slider component
  const Slider = ({ 
    value, 
    min, 
    max, 
    label, 
    width: sliderWidth = 20 
  }: { 
    value: number; 
    min: number; 
    max: number; 
    label: string;
    width?: number;
  }) => {
    // Calculate position in the slider
    const normalizedValue = (value - min) / (max - min);
    const position = Math.floor(normalizedValue * sliderWidth);
    
    return (
      <Box flexDirection="column">
        <Box>
          <Text color={Colors.TextDim}>{label}: </Text>
          <Text>{value.toFixed(1)}</Text>
        </Box>
        <Box>
          <Text>
            {Array(sliderWidth).fill('─').map((char, i) => 
              i === position 
                ? <Text key={i} color={Colors.Primary}>●</Text>
                : <Text key={i} color={Colors.TextDim}>{char}</Text>
            )}
          </Text>
        </Box>
      </Box>
    );
  };
  
  // Create a toggle switch component
  const Toggle = ({ 
    value, 
    label 
  }: { 
    value: boolean; 
    label: string;
  }) => {
    return (
      <Box>
        <Text color={Colors.TextDim}>{label}: </Text>
        <Text color={value ? Colors.Success : Colors.TextDim}>
          {value ? 'ON' : 'OFF'}
        </Text>
      </Box>
    );
  };
  
  return (
    <Box 
      flexDirection="column" 
      width={width}
      paddingX={2}
      paddingY={1}
      borderStyle={isFocused ? "single" : undefined}
      borderColor={isFocused ? Colors.Primary : undefined}
    >
      <Box marginBottom={1}>
        <Text bold color={Colors.Primary}>Image Controls</Text>
      </Box>
      
      <Box flexDirection="column">
        {/* View controls */}
        <Box marginBottom={1}>
          <Slider 
            label="Zoom" 
            value={viewState.zoom} 
            min={0.1} 
            max={5}
            width={Math.floor(width * 0.7)}
          />
        </Box>
        
        {/* Adjustment controls */}
        <Box marginBottom={1}>
          <Slider 
            label="Brightness" 
            value={adjustments.brightness} 
            min={0.1} 
            max={2} 
            width={Math.floor(width * 0.7)}
          />
        </Box>
        
        <Box marginBottom={1}>
          <Slider 
            label="Contrast" 
            value={adjustments.contrast} 
            min={0.1} 
            max={2} 
            width={Math.floor(width * 0.7)}
          />
        </Box>
        
        <Box>
          <Box marginRight={4}>
            <Toggle label="Grayscale" value={adjustments.grayscale} />
          </Box>
          
          <Box>
            <Toggle label="Invert" value={adjustments.invert} />
          </Box>
        </Box>
      </Box>
      
      {/* Keyboard shortcuts */}
      <Box marginTop={2}>
        <Text color={Colors.TextDim}>
          <Text color={Colors.AccentBlue}>+/-</Text> Zoom
          {' | '}
          <Text color={Colors.AccentBlue}>B/D</Text> Brightness
          {' | '}
          <Text color={Colors.AccentBlue}>C/V</Text> Contrast
          {' | '}
          <Text color={Colors.AccentBlue}>G</Text> Grayscale
          {' | '}
          <Text color={Colors.AccentBlue}>I</Text> Invert
          {' | '}
          <Text color={Colors.AccentBlue}>R</Text> Reset
        </Text>
      </Box>
    </Box>
  );
};

export default ControlsPanel;