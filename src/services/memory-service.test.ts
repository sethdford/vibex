/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Tests for the FileMemoryService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileMemoryService } from './memory-service';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('FileMemoryService', () => {
  let memoryService: FileMemoryService;
  let tempDir: string;
  
  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = path.join(os.tmpdir(), 'vibex-test-memory-' + Math.random().toString(36).substring(2));
    memoryService = new FileMemoryService(tempDir);
    await memoryService.initialize();
  });
  
  afterEach(async () => {
    // Clean up temp directory after tests
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  });

  describe('store()', () => {
    it('should store data by key', async () => {
      const key = 'test-key';
      const data = { foo: 'bar' };
      
      await memoryService.store(key, data);
      
      const filePath = path.join(tempDir, `${key}.json`);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const storedData = JSON.parse(fileContent);
      
      expect(storedData).toEqual(data);
    });
    
    it('should sanitize keys with invalid filename characters', async () => {
      const key = 'test/key:with*invalid"chars?';
      const data = { foo: 'bar' };
      
      await memoryService.store(key, data);
      
      const sanitizedKey = 'test_key_with_invalid_chars_';
      const filePath = path.join(tempDir, `${sanitizedKey}.json`);
      
      const exists = await fileExists(filePath);
      expect(exists).toBe(true);
    });
  });

  describe('retrieve()', () => {
    it('should retrieve stored data by key', async () => {
      const key = 'test-key';
      const data = { foo: 'bar', num: 42 };
      
      await memoryService.store(key, data);
      const retrieved = await memoryService.retrieve(key);
      
      expect(retrieved).toEqual(data);
    });
    
    it('should return null for non-existent keys', async () => {
      const retrieved = await memoryService.retrieve('non-existent-key');
      expect(retrieved).toBeNull();
    });
  });

  describe('exists()', () => {
    it('should return true for existing keys', async () => {
      const key = 'test-key';
      await memoryService.store(key, { foo: 'bar' });
      
      const exists = await memoryService.exists(key);
      expect(exists).toBe(true);
    });
    
    it('should return false for non-existent keys', async () => {
      const exists = await memoryService.exists('non-existent-key');
      expect(exists).toBe(false);
    });
  });

  describe('delete()', () => {
    it('should delete data by key', async () => {
      const key = 'test-key';
      await memoryService.store(key, { foo: 'bar' });
      
      const deleted = await memoryService.delete(key);
      expect(deleted).toBe(true);
      
      const exists = await memoryService.exists(key);
      expect(exists).toBe(false);
    });
    
    it('should return false when deleting non-existent keys', async () => {
      const deleted = await memoryService.delete('non-existent-key');
      expect(deleted).toBe(false);
    });
  });

  describe('listKeys()', () => {
    it('should list all stored keys', async () => {
      await memoryService.store('key1', { data: 1 });
      await memoryService.store('key2', { data: 2 });
      await memoryService.store('key3', { data: 3 });
      
      const keys = await memoryService.listKeys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
    
    it('should return an empty array when no keys exist', async () => {
      const keys = await memoryService.listKeys();
      expect(keys).toHaveLength(0);
    });
  });
});

// Helper function to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}