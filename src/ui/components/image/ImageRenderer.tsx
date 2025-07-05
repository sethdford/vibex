/**
 * Image Renderer Component
 * 
 * Renders images in the terminal using ASCII/ANSI art
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import terminalImage from 'terminal-image';
import sharp from 'sharp';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { Colors } from '../../colors.js';
import { logger } from '../../../utils/logger.js';

/**
 * Image renderer props
 */
interface ImageRendererProps {
  /**
   * Path to the image file
   */
  imagePath: string;
  
  /**
   * Maximum width for the image
   */
  maxWidth?: number;
  
  /**
   * Maximum height for the image
   */
  maxHeight?: number;
  
  /**
   * Whether to preserve aspect ratio
   */
  preserveAspectRatio?: boolean;
  
  /**
   * Whether to fit the image within the max dimensions
   */
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  
  /**
   * Optional alt text for the image
   */
  altText?: string;
}

/**
 * Image renderer component
 */
export const ImageRenderer: React.FC<ImageRendererProps> = ({
  imagePath,
  maxWidth = 80,
  maxHeight = 24,
  preserveAspectRatio = true,
  fit = 'contain',
  altText,
}) => {
  // Image content state
  const [imageContent, setImageContent] = useState<string | null>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Load and render the image
  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Check if file exists
        if (!existsSync(imagePath)) {
          throw new Error(`Image file not found: ${imagePath}`);
        }
        
        // Load the image file
        const imageBuffer = await fs.readFile(imagePath);
        
        // Process with sharp
        const processedImageBuffer = await sharp(imageBuffer)
          .resize({
            width: maxWidth,
            height: maxHeight,
            fit,
            withoutEnlargement: true,
          })
          .toBuffer();
        
        // Convert to terminal-friendly format
        const renderedImage = await terminalImage.buffer(processedImageBuffer, {
          width: maxWidth,
          height: maxHeight,
          preserveAspectRatio,
        });
        
        setImageContent(renderedImage);
        logger.debug(`Rendered image: ${path.basename(imagePath)}`);
      } catch (err) {
        const errorMessage = `Failed to render image: ${err instanceof Error ? err.message : String(err)}`;
        setError(errorMessage);
        logger.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadImage();
  }, [imagePath, maxWidth, maxHeight, preserveAspectRatio, fit]);
  
  // Show loading indicator
  if (isLoading) {
    return (
      <Box borderStyle="round" borderColor={Colors.TextDim} padding={1}>
        <Text color={Colors.TextDim}>Loading image...</Text>
      </Box>
    );
  }
  
  // Show error message
  if (error) {
    return (
      <Box borderStyle="round" borderColor={Colors.Error} padding={1}>
        <Text color={Colors.Error}>{error}</Text>
        {altText && <Text color={Colors.TextDim}>[Alt text: {altText}]</Text>}
      </Box>
    );
  }
  
  // Show image content
  return (
    <Box flexDirection="column">
      <Box>
        <Text>{imageContent}</Text>
      </Box>
      {altText && (
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>[Alt text: {altText}]</Text>
        </Box>
      )}
    </Box>
  );
};