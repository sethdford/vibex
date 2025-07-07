/**
 * Screenshot Preview Utilities
 * 
 * Utility functions for the Screenshot Preview component.
 */

import { createReadStream, promises as fs } from 'fs';
import { ImageFormat, ImageMetadata, ViewState, Position, ImageAdjustments } from './types.js';
import * as path from 'path';

/**
 * Get image format from file extension
 * 
 * @param filePath Image file path
 * @returns Image format
 */
export const getImageFormatFromPath = (filePath: string): ImageFormat | string => {
  const extension = path.extname(filePath).toLowerCase().substring(1);
  
  if (Object.values(ImageFormat).includes(extension as ImageFormat)) {
    return extension as ImageFormat;
  }
  
  return extension || 'unknown';
};

/**
 * Get file size in bytes
 * 
 * @param filePath File path
 * @returns Promise resolving to file size in bytes
 */
export const getFileSize = async (filePath: string): Promise<number> => {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    console.error(`Error getting file size for ${filePath}:`, error);
    return 0;
  }
};

/**
 * Get formatted file size (KB, MB, etc.)
 * 
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get image dimensions from image data
 * 
 * Note: This is a simplified implementation for terminal use
 * In a real application, we would use image processing libraries
 * 
 * @param filePath Path to the image file
 * @returns Promise resolving to image dimensions
 */
export const getImageDimensions = async (filePath: string): Promise<{ width: number; height: number }> => {
  try {
    // For PNG files, we can read the header to get dimensions
    // This is a simplified implementation
    // In real code, we would use proper image processing libraries
    
    // Mock implementation for demonstration purposes
    // In a real application, this would read the image file format headers
    return { width: 800, height: 600 };
  } catch (error) {
    console.error(`Error getting image dimensions for ${filePath}:`, error);
    return { width: 0, height: 0 };
  }
};

/**
 * Read image metadata from a file
 * 
 * @param filePath Path to the image file
 * @returns Promise resolving to image metadata
 */
export const getImageMetadata = async (filePath: string): Promise<ImageMetadata> => {
  try {
    const format = getImageFormatFromPath(filePath);
    const fileSize = await getFileSize(filePath);
    const dimensions = await getImageDimensions(filePath);
    const stats = await fs.stat(filePath);
    
    return {
      size: {
        width: dimensions.width,
        height: dimensions.height
      },
      fileSize,
      format,
      date: stats.mtime
    };
  } catch (error) {
    console.error(`Error getting image metadata for ${filePath}:`, error);
    return {
      size: { width: 0, height: 0 },
      fileSize: 0,
      format: 'unknown'
    };
  }
};

/**
 * Convert image path to sixel data for terminal rendering
 * 
 * This function would normally use a library like libsixel or terminal-kit
 * to render images directly in the terminal using sixel graphics
 * 
 * For this example, we're returning a mock implementation
 * 
 * @param imagePath Path to the image file
 * @param maxWidth Maximum width for the rendered image
 * @param maxHeight Maximum height for the rendered image
 * @returns Promise resolving to sixel data or null
 */
export const getTerminalImageData = async (
  imagePath: string,
  maxWidth: number,
  maxHeight: number
): Promise<string | null> => {
  try {
    // Mock implementation
    // In a real application, we would convert the image to sixel or use
    // a terminal image rendering library
    
    // Read first few bytes to check if it's a valid image file
    const fileHandle = await fs.open(imagePath, 'r');
    const buffer = Buffer.alloc(8);
    await fileHandle.read(buffer, 0, 8, 0);
    await fileHandle.close();
    
    // Simplified format check
    const isPng = buffer[0] === 0x89 && 
                  buffer[1] === 0x50 && 
                  buffer[2] === 0x4E && 
                  buffer[3] === 0x47;
                  
    const isJpeg = (buffer[0] === 0xFF && buffer[1] === 0xD8);
    
    if (!isPng && !isJpeg) {
      console.error(`File ${imagePath} is not a supported image format`);
      return null;
    }
    
    // In a real implementation, we would convert the image to terminal format here
    return "[Terminal Image Data]";
  } catch (error) {
    console.error(`Error converting image to terminal format: ${imagePath}`, error);
    return null;
  }
};

/**
 * Generate ASCII art representation of an image
 * 
 * @param imagePath Path to the image file
 * @param width Width of ASCII art output
 * @param height Height of ASCII art output
 * @returns Promise resolving to ASCII art string
 */
export const generateAsciiArt = async (
  imagePath: string,
  width: number,
  height: number
): Promise<string> => {
  // This would normally use a library like ascii-art or jimp
  // to convert the image to ASCII art
  
  // Mock implementation
  const asciiChars = '@%#*+=-:. ';
  let asciiArt = '';
  
  // Generate some mock ASCII art for demonstration purposes
  for (let y = 0; y < height; y++) {
    let line = '';
    for (let x = 0; x < width; x++) {
      // Random character for demonstration
      const randomIndex = Math.floor(Math.random() * asciiChars.length);
      line += asciiChars[randomIndex];
    }
    asciiArt += line + '\n';
  }
  
  return asciiArt;
};

/**
 * Check if the terminal supports image display
 * 
 * @returns Boolean indicating if terminal supports image display
 */
export const terminalSupportsImages = (): boolean => {
  // Check environment variables to determine terminal capabilities
  const term = process.env.TERM || '';
  
  // List of terminals known to support sixel graphics
  const sixelTerminals = ['xterm-256color', 'xterm-kitty', 'vt340', 'vt330', 'vt240', 'vt220'];
  
  // Check for iTerm2 which has its own image protocol
  const isITerm = Boolean(process.env.ITERM_SESSION_ID);
  
  // Check for terminals with sixel support
  const hasSixelSupport = sixelTerminals.some(t => term.includes(t));
  
  return isITerm || hasSixelSupport;
};

/**
 * Apply view state transformations to coordinates
 * 
 * @param x X coordinate
 * @param y Y coordinate
 * @param viewState Current view state
 * @param imageWidth Original image width
 * @param imageHeight Original image height
 * @returns Transformed coordinates
 */
export const applyViewTransform = (
  x: number,
  y: number,
  viewState: ViewState,
  imageWidth: number,
  imageHeight: number
): Position => {
  // Apply zoom
  const zoomedX = x * viewState.zoom;
  const zoomedY = y * viewState.zoom;
  
  // Apply pan
  const pannedX = zoomedX - viewState.position.x;
  const pannedY = zoomedY - viewState.position.y;
  
  // Apply rotation (simplified)
  // In a real implementation, this would use proper rotation matrix
  
  return {
    x: pannedX,
    y: pannedY
  };
};

/**
 * Generate CSS filter string from image adjustments
 * 
 * @param adjustments Image adjustments
 * @returns CSS filter string
 */
export const generateCssFilters = (adjustments: ImageAdjustments): string => {
  const filters = [];
  
  if (adjustments.brightness !== 1) {
    filters.push(`brightness(${adjustments.brightness})`);
  }
  
  if (adjustments.contrast !== 1) {
    filters.push(`contrast(${adjustments.contrast})`);
  }
  
  if (adjustments.grayscale) {
    filters.push('grayscale(1)');
  }
  
  if (adjustments.invert) {
    filters.push('invert(1)');
  }
  
  return filters.join(' ');
};

/**
 * Default view state
 */
export const DEFAULT_VIEW_STATE: ViewState = {
  zoom: 1,
  position: { x: 0, y: 0 },
  rotation: 0
};

/**
 * Default image adjustments
 */
export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 1,
  contrast: 1,
  invert: false,
  grayscale: false
};