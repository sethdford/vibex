/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Image Utilities Tests
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import * as imageUtils from '../../../../src/ui/utils/imageUtils.js';
import fetch from 'node-fetch';
import sharp from 'sharp';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock fs modules
vi.mock('fs/promises');
vi.mock('fs', () => ({
  existsSync: vi.fn()
}));

// Mock path
vi.mock('path', () => ({
  join: vi.fn((dir, file) => `${dir}/${file}`),
  extname: vi.fn((filePath) => `.${filePath.split('.').pop()}`),
}));

// Mock sharp
vi.mock('sharp', () => {
  const mockSharp = vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    toFormat: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-image-data')),
    metadata: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
  });
  return mockSharp;
});

// Mock node-fetch
vi.mock('node-fetch', () => {
  return vi.fn().mockImplementation(() => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    buffer: vi.fn().mockResolvedValue(Buffer.from('fake-image-data'))
  }));
});

// Mock logger
vi.mock('../../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn()
  }
}));

describe('Image Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('ensureTempDir', () => {
    it('should create temp directory if it does not exist', async () => {
      // Mock existsSync to return false (directory doesn't exist)
      (existsSync as jest.Mock).mockReturnValue(false);
      
      await imageUtils.ensureTempDir();
      
      // Check if mkdir was called
      expect(fs.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
    
    it('should not create temp directory if it already exists', async () => {
      // Mock existsSync to return true (directory exists)
      (existsSync as jest.Mock).mockReturnValue(true);
      
      await imageUtils.ensureTempDir();
      
      // Check if mkdir was not called
      expect(fs.mkdir).not.toHaveBeenCalled();
    });
    
    it('should handle errors properly', async () => {
      // Mock existsSync to throw an error
      (existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });
      
      await expect(imageUtils.ensureTempDir()).rejects.toThrow('Test error');
    });
  });
  
  describe('isImageFile', () => {
    it('should identify supported image formats', () => {
      expect(imageUtils.isImageFile('image.png')).toBe(true);
      expect(imageUtils.isImageFile('image.jpg')).toBe(true);
      expect(imageUtils.isImageFile('image.jpeg')).toBe(true);
      expect(imageUtils.isImageFile('image.gif')).toBe(true);
    });
    
    it('should reject unsupported formats', () => {
      expect(imageUtils.isImageFile('document.pdf')).toBe(false);
      expect(imageUtils.isImageFile('script.js')).toBe(false);
    });
    
    it('should handle case insensitivity', () => {
      expect(imageUtils.isImageFile('image.PNG')).toBe(true);
      expect(imageUtils.isImageFile('image.JPG')).toBe(true);
    });
  });
  
  describe('downloadImage', () => {
    it('should download and save image from URL', async () => {
      // Mock existsSync to return true
      (existsSync as jest.Mock).mockReturnValue(true);
      
      // Mock fs.writeFile
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      
      const result = await imageUtils.downloadImage('https://example.com/image.png');
      
      // Check if fetch was called with the URL
      expect(fetch).toHaveBeenCalledWith('https://example.com/image.png');
      
      // Check if writeFile was called
      expect(fs.writeFile).toHaveBeenCalled();
      
      // Check if result is a file path
      expect(result).toContain('img-');
    });
    
    it('should handle HTTP errors', async () => {
      // Mock fetch to return an error
      (fetch as jest.Mock).mockImplementation(() => ({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      }));
      
      await expect(imageUtils.downloadImage('https://example.com/not-found.png'))
        .rejects.toThrow('HTTP error 404: Not Found');
    });
  });
  
  describe('processImageData', () => {
    it('should process base64 image data', async () => {
      // Mock existsSync to return true
      (existsSync as jest.Mock).mockReturnValue(true);
      
      const result = await imageUtils.processImageData('base64data', 'png');
      
      // Check if sharp was called
      expect(sharp).toHaveBeenCalled();
      
      // Check if toFile was called
      const sharpInstance = (sharp as unknown as jest.Mock).mock.results[0].value;
      expect(sharpInstance.toFile).toHaveBeenCalled();
      
      // Check if result is a file path
      expect(result).toContain('img-');
    });
    
    it('should process buffer image data', async () => {
      // Mock existsSync to return true
      (existsSync as jest.Mock).mockReturnValue(true);
      
      const buffer = Buffer.from('test-data');
      const result = await imageUtils.processImageData(buffer, 'jpg');
      
      // Check if sharp was called with the buffer
      expect(sharp).toHaveBeenCalledWith(buffer);
      
      // Check if result is a file path
      expect(result).toContain('img-');
    });
  });
  
  describe('getImageDimensions', () => {
    it('should return image dimensions', async () => {
      const dimensions = await imageUtils.getImageDimensions('test.png');
      
      // Check if sharp was called with the image path
      expect(sharp).toHaveBeenCalledWith('test.png');
      
      // Check if metadata was called
      const sharpInstance = (sharp as unknown as jest.Mock).mock.results[0].value;
      expect(sharpInstance.metadata).toHaveBeenCalled();
      
      // Check if dimensions are correct
      expect(dimensions).toEqual({ width: 800, height: 600 });
    });
    
    it('should handle errors', async () => {
      // Mock sharp to return an instance with metadata method that rejects
      (sharp as jest.Mock).mockReturnValueOnce({
        metadata: vi.fn().mockRejectedValueOnce(new Error('Metadata error'))
      });
      
      await expect(imageUtils.getImageDimensions('test.png'))
        .rejects.toThrow('Metadata error');
    });
  });
  
  describe('cleanupTempImages', () => {
    it('should clean up old temporary images', async () => {
      // Mock existsSync to return true
      (existsSync as jest.Mock).mockReturnValue(true);
      
      // Mock readdir to return some files
      (fs.readdir as jest.Mock).mockResolvedValue(['old-image.png', 'new-image.png']);
      
      // Mock stat to return old and new times
      (fs.stat as jest.Mock)
        .mockResolvedValueOnce({ mtime: new Date(Date.now() - 48 * 60 * 60 * 1000) }) // 48 hours old
        .mockResolvedValueOnce({ mtime: new Date() }); // fresh
      
      await imageUtils.cleanupTempImages();
      
      // Check if unlink was called only once (for the old file)
      expect(fs.unlink).toHaveBeenCalledTimes(1);
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('old-image.png'));
    });
  });
});