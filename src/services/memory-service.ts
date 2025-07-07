/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { promises as fs } from 'fs';
import path from 'path';
import { MemoryService } from '../core/interfaces/types';

/**
 * File-based implementation of the MemoryService interface
 * Provides persistent storage of memory items in the file system
 */
export class FileMemoryService implements MemoryService {
  constructor(private baseDir: string) {}

  /**
   * Initialize the memory service
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      console.error('Error initializing memory service:', error);
      throw error;
    }
  }

  /**
   * Store data by key
   */
  async store(key: string, data: unknown): Promise<void> {
    const sanitizedKey = this.sanitizeKey(key);
    const filePath = path.join(this.baseDir, `${sanitizedKey}.json`);
    
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error storing memory item "${key}":`, error);
      throw error;
    }
  }

  /**
   * Retrieve data by key
   */
  async retrieve<T>(key: string): Promise<T | null> {
    const sanitizedKey = this.sanitizeKey(key);
    const filePath = path.join(this.baseDir, `${sanitizedKey}.json`);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File not found, return null
        return null;
      }
      console.error(`Error retrieving memory item "${key}":`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const sanitizedKey = this.sanitizeKey(key);
    const filePath = path.join(this.baseDir, `${sanitizedKey}.json`);
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a memory item by key
   */
  async delete(key: string): Promise<boolean> {
    const sanitizedKey = this.sanitizeKey(key);
    const filePath = path.join(this.baseDir, `${sanitizedKey}.json`);
    
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File not found, consider it as deleted
        return false;
      }
      console.error(`Error deleting memory item "${key}":`, error);
      throw error;
    }
  }

  /**
   * List all memory keys
   */
  async listKeys(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.baseDir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      console.error('Error listing memory keys:', error);
      throw error;
    }
  }

  /**
   * Sanitize a key to be used as a filename
   */
  private sanitizeKey(key: string): string {
    // Replace invalid filename characters with underscores
    return key.replace(/[\/\\:*?"<>|]/g, '_');
  }
}