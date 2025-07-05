/**
 * Markdown Image Parser
 * 
 * Extracts and processes images from markdown content
 */

import path from 'path';
import { existsSync } from 'fs';
import { downloadImage, isImageFile } from './imageUtils.js';
import { logger } from '../../utils/logger.js';

/**
 * Image reference in markdown
 */
export interface MarkdownImage {
  /**
   * Original markdown text
   */
  original: string;
  
  /**
   * Image alt text
   */
  alt: string;
  
  /**
   * Image URL or path
   */
  src: string;
  
  /**
   * Local file path (after processing)
   */
  localPath?: string;
  
  /**
   * Whether the image is a URL
   */
  isUrl: boolean;
  
  /**
   * Whether the image is a local file
   */
  isLocalFile: boolean;
  
  /**
   * Whether the image source exists
   */
  exists: boolean;
}

/**
 * Extract images from markdown text
 */
export function extractImages(markdown: string): MarkdownImage[] {
  // Match ![alt](src) syntax
  const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
  const images: MarkdownImage[] = [];
  let match;
  
  while ((match = imageRegex.exec(markdown)) !== null) {
    const [original, alt, src] = match;
    
    // Check if the source is a URL or local file
    const isUrl = src.startsWith('http://') || src.startsWith('https://');
    const isLocalFile = !isUrl;
    
    // For local files, check if they exist
    const exists = isUrl || (isLocalFile && existsSync(src) && isImageFile(src));
    
    images.push({
      original,
      alt,
      src,
      isUrl,
      isLocalFile,
      exists
    });
  }
  
  return images;
}

/**
 * Process markdown with images
 */
export async function processMarkdownImages(markdown: string): Promise<{
  markdown: string;
  images: MarkdownImage[];
}> {
  try {
    // Extract images
    const images = extractImages(markdown);
    const processedMarkdown = markdown;
    
    // Process each image
    for (const image of images) {
      try {
        // If it's a URL, download it
        if (image.isUrl) {
          image.localPath = await downloadImage(image.src);
          image.exists = true;
        } else if (image.exists) {
          // If it's a local file that exists, use it directly
          image.localPath = image.src;
        }
      } catch (error) {
        logger.error(`Failed to process image ${image.src}:`, error);
        // Keep the original markdown for failed images
      }
    }
    
    return { markdown: processedMarkdown, images };
  } catch (error) {
    logger.error('Failed to process markdown images:', error);
    return { markdown, images: [] };
  }
}

/**
 * Replace markdown image syntax with placeholders
 */
export function replaceImagesWithPlaceholders(markdown: string): {
  markdown: string;
  images: MarkdownImage[];
} {
  const images = extractImages(markdown);
  let processedMarkdown = markdown;
  
  // Replace each image with a placeholder
  images.forEach((image, index) => {
    const placeholder = `[Image ${index + 1}: ${image.alt}]`;
    processedMarkdown = processedMarkdown.replace(image.original, placeholder);
  });
  
  return { markdown: processedMarkdown, images };
}