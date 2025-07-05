/**
 * Image Display Component
 * 
 * High-level component for displaying images from various sources
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { ImageRenderer } from './ImageRenderer.js';
import { 
  downloadImage,
  processImageData, 
  isImageFile,
  cleanupTempImages,
  getImageDimensions
} from '../../utils/imageUtils.js';
import { logger } from '../../../utils/logger.js';

/**
 * Image source types
 */
export type ImageSource = 
  | { type: 'url'; url: string }
  | { type: 'file'; path: string }
  | { type: 'base64'; data: string; format?: string }
  | { type: 'buffer'; data: Buffer; format?: string };

/**
 * Image display props
 */
interface ImageDisplayProps {
  /**
   * Image source
   */
  source: ImageSource;
  
  /**
   * Maximum width
   */
  maxWidth?: number;
  
  /**
   * Maximum height
   */
  maxHeight?: number;
  
  /**
   * Alt text for accessibility
   */
  altText?: string;
  
  /**
   * Caption text to show below image
   */
  caption?: string;
}

/**
 * Image display component
 */
export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  source,
  maxWidth = 80,
  maxHeight = 24,
  altText,
  caption
}) => {
  // Image path state
  const [imagePath, setImagePath] = useState<string | null>(null);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Process the image source
  useEffect(() => {
    const processSource = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        let path: string;
        
        // Handle different source types
        switch (source.type) {
          case 'url':
            path = await downloadImage(source.url);
            break;
          
          case 'file':
            // Check if it's a valid image file
            if (!isImageFile(source.path)) {
              throw new Error(`Unsupported image format: ${source.path}`);
            }
            path = source.path;
            break;
          
          case 'base64':
            path = await processImageData(source.data, source.format);
            break;
          
          case 'buffer':
            path = await processImageData(source.data, source.format);
            break;
          
          default:
            throw new Error(`Unsupported image source type: ${(source as any).type}`);
        }
        
        setImagePath(path);
      } catch (err) {
        const errorMessage = `Failed to process image: ${err instanceof Error ? err.message : String(err)}`;
        setError(errorMessage);
        logger.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    
    processSource();
    
    // Clean up old temp images
    cleanupTempImages().catch(err => {
      logger.error('Failed to clean up temporary images:', err);
    });
  }, [source]);
  
  // Show loading indicator
  if (isLoading) {
    return (
      <Box borderStyle="round" borderColor={Colors.TextDim} padding={1}>
        <Text color={Colors.TextDim}>Loading image...</Text>
      </Box>
    );
  }
  
  // Show error message
  if (error || !imagePath) {
    return (
      <Box borderStyle="round" borderColor={Colors.Error} padding={1} flexDirection="column">
        <Text color={Colors.Error}>{error || 'Failed to process image'}</Text>
        {altText && <Text color={Colors.TextDim}>[Alt text: {altText}]</Text>}
      </Box>
    );
  }
  
  // Render the image with caption
  return (
    <Box flexDirection="column">
      <ImageRenderer 
        imagePath={imagePath}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
        altText={altText}
      />
      {caption && (
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>{caption}</Text>
        </Box>
      )}
    </Box>
  );
};