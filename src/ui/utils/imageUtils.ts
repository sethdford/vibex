/**
 * Image Utilities
 * 
 * Functions for handling image processing in the terminal
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import sharp from 'sharp';
import fetch from 'node-fetch';
import { logger } from '../../utils/logger.js';

/**
 * Supported image formats
 */
export const SUPPORTED_FORMATS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'tiff'
];

/**
 * Temporary directory for images
 */
const TEMP_DIR = path.join(os.tmpdir(), 'claude-code-images');

/**
 * Ensure the temporary directory exists
 */
export async function ensureTempDir(): Promise<string> {
  try {
    // Create temp directory if it doesn't exist
    if (!existsSync(TEMP_DIR)) {
      await fs.mkdir(TEMP_DIR, { recursive: true });
    }
    
    return TEMP_DIR;
  } catch (error) {
    logger.error('Failed to create temporary directory:', error);
    throw error;
  }
}

/**
 * Determine if a file is an image based on extension
 */
export function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase().substring(1);
  return SUPPORTED_FORMATS.includes(ext);
}

/**
 * Generate a unique filename for an image
 */
export function generateImageFilename(originalName: string = ''): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName) || '.png';
  
  return `img-${timestamp}-${random}${ext}`;
}

/**
 * Download an image from a URL
 */
export async function downloadImage(url: string): Promise<string> {
  try {
    // Create temp directory
    const tempDir = await ensureTempDir();
    
    // Generate filename
    const filename = generateImageFilename(url);
    const filePath = path.join(tempDir, filename);
    
    // Download the image
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    // Get image data
    const imageBuffer = await response.buffer();
    
    // Save to file
    await fs.writeFile(filePath, imageBuffer);
    
    logger.debug(`Downloaded image to ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error('Failed to download image:', error);
    throw error;
  }
}

/**
 * Process image data (base64, binary, etc.)
 */
export async function processImageData(
  data: string | Buffer,
  format: string = 'png'
): Promise<string> {
  try {
    // Create temp directory
    const tempDir = await ensureTempDir();
    
    // Generate filename
    const filename = generateImageFilename(`.${format}`);
    const filePath = path.join(tempDir, filename);
    
    // Convert to buffer if string (assuming base64)
    const buffer = typeof data === 'string'
      ? Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      : data;
    
    // Process with sharp
    await sharp(buffer)
      .toFormat(format as any)
      .toFile(filePath);
    
    logger.debug(`Processed image to ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error('Failed to process image data:', error);
    throw error;
  }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  imagePath: string
): Promise<{ width: number; height: number }> {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  } catch (error) {
    logger.error('Failed to get image dimensions:', error);
    throw error;
  }
}

/**
 * Clean up temporary image files
 */
export async function cleanupTempImages(olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const tempDir = await ensureTempDir();
    const files = await fs.readdir(tempDir);
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);
      
      // Delete files older than specified time
      if (now - stats.mtime.getTime() > olderThan) {
        await fs.unlink(filePath);
        logger.debug(`Deleted old temp image: ${filePath}`);
      }
    }
  } catch (error) {
    logger.error('Failed to clean up temporary images:', error);
    // Don't throw, just log the error
  }
}