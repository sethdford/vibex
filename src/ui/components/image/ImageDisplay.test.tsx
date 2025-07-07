/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Image Display Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ImageDisplay } from './ImageDisplay.js';
import { ThemeProvider } from '../../contexts/ThemeContext.js';
import * as imageUtils from '../../utils/imageUtils.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock imageUtils
vi.mock('../../utils/imageUtils', () => ({
  downloadImage: vi.fn(),
  processImageData: vi.fn(),
  isImageFile: vi.fn(),
  cleanupTempImages: vi.fn(),
}));

describe('ImageDisplay Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    (imageUtils.downloadImage as jest.Mock).mockResolvedValue('/tmp/downloaded-image.png');
    (imageUtils.processImageData as jest.Mock).mockResolvedValue('/tmp/processed-image.png');
    (imageUtils.isImageFile as jest.Mock).mockReturnValue(true);
  });
  
  it('renders loading state initially', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ImageDisplay source={{ type: 'url', url: 'https://example.com/image.png' }} />
      </ThemeProvider>
    );
    
    expect(getByText('Loading image...')).toBeTruthy();
  });
  
  it('handles URL image sources', async () => {
    const { findByText } = render(
      <ThemeProvider>
        <ImageDisplay 
          source={{ type: 'url', url: 'https://example.com/image.png' }} 
          altText="Example image"
        />
      </ThemeProvider>
    );
    
    // Check if downloadImage was called with the correct URL
    expect(imageUtils.downloadImage).toHaveBeenCalledWith('https://example.com/image.png');
    
    // Look for alt text which should appear
    const altText = await findByText(/Example image/i);
    expect(altText).toBeTruthy();
  });
  
  it('handles file image sources', () => {
    render(
      <ThemeProvider>
        <ImageDisplay source={{ type: 'file', path: '/path/to/image.png' }} />
      </ThemeProvider>
    );
    
    // Check that downloadImage was not called for file sources
    expect(imageUtils.downloadImage).not.toHaveBeenCalled();
    
    // Check that isImageFile was called
    expect(imageUtils.isImageFile).toHaveBeenCalledWith('/path/to/image.png');
  });
  
  it('handles base64 image data', () => {
    render(
      <ThemeProvider>
        <ImageDisplay 
          source={{ 
            type: 'base64', 
            data: 'base64encodeddata', 
            format: 'png' 
          }} 
        />
      </ThemeProvider>
    );
    
    // Check if processImageData was called with the correct data
    expect(imageUtils.processImageData).toHaveBeenCalledWith('base64encodeddata', 'png');
  });
  
  it('shows alt text when provided', async () => {
    const { findByText } = render(
      <ThemeProvider>
        <ImageDisplay 
          source={{ type: 'file', path: '/path/to/image.png' }}
          altText="Alternative text description"
        />
      </ThemeProvider>
    );
    
    // Check if alt text is displayed
    const altText = await findByText(/Alternative text description/i);
    expect(altText).toBeTruthy();
  });
  
  it('shows caption when provided', async () => {
    const { findByText } = render(
      <ThemeProvider>
        <ImageDisplay 
          source={{ type: 'file', path: '/path/to/image.png' }}
          caption="Image caption text"
        />
      </ThemeProvider>
    );
    
    // Check if caption is displayed
    const caption = await findByText(/Image caption text/i);
    expect(caption).toBeTruthy();
  });
  
  it('shows error message when image processing fails', async () => {
    // Mock error for this test
    (imageUtils.isImageFile as jest.Mock).mockImplementation(() => {
      throw new Error('Test error');
    });
    
    const { findByText } = render(
      <ThemeProvider>
        <ImageDisplay source={{ type: 'file', path: '/path/to/image.png' }} />
      </ThemeProvider>
    );
    
    // Check if error message is displayed
    const errorMessage = await findByText(/Failed to process image/i);
    expect(errorMessage).toBeTruthy();
  });
});