/**
 * Indeterminate Progress Bar Component
 * 
 * Displays an animated progress bar for operations with unknown duration
 * with improved animations and status indicators
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import type { StatusType } from './StatusIcon.js';
import { StatusIcon } from './StatusIcon.js';

/**
 * Indeterminate progress bar props
 */
interface IndeterminateProgressBarProps {
  /**
   * Whether the progress bar is active
   */
  active?: boolean;
  
  /**
   * Width of the progress bar
   */
  width?: number;
  
  /**
   * Color of the progress bar
   */
  color?: string;
  
  /**
   * Background color of the progress bar
   */
  backgroundColor?: string;
  
  /**
   * Character to use for the moving part
   */
  character?: string;
  
  /**
   * Character to use for the background
   */
  emptyCharacter?: string;
  
  /**
   * Speed of the animation (milliseconds per frame)
   */
  speed?: number;
  
  /**
   * Label to show before the progress bar
   */
  label?: string;
  
  /**
   * Frame indices for animation
   */
  frames?: number[];

  /**
   * Current step (for multi-step operations)
   */
  currentStep?: number;

  /**
   * Total number of steps
   */
  totalSteps?: number;

  /**
   * Whether to show step counter
   */
  showSteps?: boolean;

  /**
   * Status of the progress bar
   */
  status?: StatusType;

  /**
   * Whether to show status icon
   */
  showStatus?: boolean;

  /**
   * Animation style ('bounce' | 'pulse' | 'slide')
   */
  animationStyle?: 'bounce' | 'pulse' | 'slide';

  /**
   * Optional message to display
   */
  message?: string;

  /**
   * ARIA description for accessibility
   */
  ariaDescription?: string;
}

/**
 * Indeterminate progress bar component
 */
export const IndeterminateProgressBar: React.FC<IndeterminateProgressBarProps> = ({
  active = true,
  width = 30,
  color = Colors.Primary,
  backgroundColor = Colors.TextDim,
  character = '█',
  emptyCharacter = '░',
  speed = 80,
  label,
  frames,
  currentStep,
  totalSteps,
  showSteps = false,
  status = 'running',
  showStatus = false,
  animationStyle = 'bounce',
  message,
  ariaDescription,
}) => {
  // Position and direction state
  const [position, setPosition] = useState<number>(0);
  const [reverse, setReverse] = useState<boolean>(false);
  const [pulseOpacity, setPulseOpacity] = useState<number>(1);
  
  // Default frame indices based on animation style
  let defaultFrames = [3, 2, 1]; // Width of the moving part for bounce
  if (animationStyle === 'slide') {
    defaultFrames = [5, 4, 3, 2, 1]; // Longer trail for slide
  }
  const activeFrames = frames || defaultFrames;
  
  // Animation effect for bounce and slide
  useEffect(() => {
    if (!active || animationStyle === 'pulse') {return;}
    
    const timer = setInterval(() => {
      setPosition(prevPos => {
        if (reverse) {
          // Moving backwards
          if (prevPos <= 0) {
            setReverse(false);
            return 0;
          }
          return prevPos - 1;
        } else {
          // Moving forwards
          if (prevPos >= width - Math.max(...activeFrames)) {
            setReverse(animationStyle === 'bounce');
            return animationStyle === 'bounce' ? prevPos : 0; // Reset to beginning for slide
          }
          return prevPos + 1;
        }
      });
    }, speed);
    
    return () => clearInterval(timer);
  }, [active, reverse, width, speed, activeFrames, animationStyle]);
  
  // Animation effect for pulse
  useEffect(() => {
    if (!active || animationStyle !== 'pulse') {return;}
    
    const timer = setInterval(() => {
      setPulseOpacity(prev => {
        if (prev <= 0.3) {return 0.3;}
        if (prev >= 1) {return 0.9;}
        return reverse ? prev + 0.1 : prev - 0.1;
      });
      
      setReverse(prev => (pulseOpacity <= 0.31 || pulseOpacity >= 0.99 ? !prev : prev));
    }, speed);
    
    return () => clearInterval(timer);
  }, [active, pulseOpacity, reverse, speed, animationStyle]);
  
  // Generate the progress bar based on animation style
  const renderBar = () => {
    if (animationStyle === 'pulse') {
      // For pulse animation, we fill the entire bar but change opacity
      return character.repeat(width);
    }
    
    let bar = emptyCharacter.repeat(width);
    
    // Add moving part at the current position
    if (active) {
      activeFrames.forEach((frameWidth, index) => {
        const pos = position + index;
        if (pos >= 0 && pos < width) {
          bar = bar.substring(0, pos) + character + bar.substring(pos + 1);
        }
      });
    }
    
    return bar;
  };
  
  // Calculate color with opacity for pulse animation
  const getColorWithOpacity = () => {
    if (animationStyle !== 'pulse') {return color;}
    
    // Convert hex to rgb with opacity
    const hexToRgb = (hex: string) => {
      const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
      const formattedHex = hex.replace(shorthandRegex, (_m, r, g, b) => r + r + g + g + b + b);
      
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(formattedHex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const rgb = hexToRgb(color);
    if (!rgb) {return color;}
    
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${pulseOpacity})`;
  };
  
  return (
    <Box flexDirection="column">
      <Box>
        {/* Status icon */}
        {showStatus && (
          <Box marginRight={1}>
            <StatusIcon 
              status={status} 
              animated={true} 
            />
          </Box>
        )}
        
        {/* Label */}
        {label && (
          <Box marginRight={1}>
            <Text bold>{label}</Text>
          </Box>
        )}
        
        {/* Step counter */}
        {showSteps && currentStep !== undefined && totalSteps !== undefined && (
          <Box marginRight={1}>
            <Text dimColor>
              [{currentStep}/{totalSteps}]
            </Text>
          </Box>
        )}
        
        {/* Progress bar */}
        <Box>
          <Text 
            backgroundColor={backgroundColor} 
            color={getColorWithOpacity()}
            aria-hidden
          >
            {renderBar()}
          </Text>
        </Box>
        
        {/* Message */}
        {message && (
          <Box marginLeft={1}>
            <Text dimColor>{message}</Text>
          </Box>
        )}
      </Box>
      
      {/* Hidden text for screen readers */}
      <Text aria-live="polite" aria-hidden={!ariaDescription}>
        {ariaDescription || `${label || 'Operation'} in progress.`}
        {showSteps && currentStep !== undefined && totalSteps !== undefined && 
          ` Step ${currentStep} of ${totalSteps}.`}
        {message && ` Status: ${message}`}
      </Text>
    </Box>
  );
};