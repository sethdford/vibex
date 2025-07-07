/**
 * Memory Storage Service - Following Gemini CLI Architecture
 * 
 * Single Responsibility: Handle memory persistence, encryption, and file I/O
 * Clean service with focused interface and proper error handling
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import type { MemoryEntry, MemoryStorageType } from '../types/memory.js';

/**
 * Storage configuration interface
 */
export interface StorageConfig {
  readonly storageDir: string;
  readonly autoSave: boolean;
  readonly encrypt: boolean;
  readonly compressionLevel: number;
  readonly backupCount: number;
}

/**
 * Storage operation result
 */
export interface StorageResult {
  readonly success: boolean;
  readonly error?: Error;
  readonly path?: string;
  readonly entriesCount?: number;
  readonly sizeBytes?: number;
  readonly duration?: number;
}

/**
 * Storage events
 */
export enum StorageEvent {
  SAVE_START = 'save-start',
  SAVE_COMPLETE = 'save-complete',
  LOAD_START = 'load-start', 
  LOAD_COMPLETE = 'load-complete',
  ERROR = 'storage-error'
}

/**
 * Memory Storage Service
 * Handles all file I/O, encryption, and persistence operations
 */
export class MemoryStorageService extends EventEmitter {
  private readonly config: StorageConfig;
  private readonly encryptionKey?: Buffer;
  
  constructor(config: StorageConfig, encryptionKey?: string) {
    super();
    this.config = config;
    
    // Generate encryption key if provided
    if (encryptionKey && config.encrypt) {
      this.encryptionKey = Buffer.from(
        crypto.createHash('sha256').update(encryptionKey).digest()
      );
    }
    
    logger.debug('MemoryStorageService initialized', { 
      storageDir: config.storageDir,
      encrypt: config.encrypt
    });
  }
  
  /**
   * Save memories to disk with optional encryption
   */
  public async save(
    memories: Map<string, MemoryEntry>, 
    filePath?: string
  ): Promise<StorageResult> {
    const startTime = Date.now();
    const savePath = filePath || this.getDefaultPath();
    
    this.emit(StorageEvent.SAVE_START, { path: savePath });
    
    try {
      // Create directory if needed
      await this.ensureDirectory(path.dirname(savePath));
      
      // Create backup if file exists
      if (this.config.backupCount > 0) {
        await this.createBackup(savePath);
      }
      
      // Prepare data for serialization
      const data = Array.from(memories.entries());
      const serialized = this.config.encrypt && this.encryptionKey
        ? this.encrypt(JSON.stringify(data))
        : JSON.stringify(data, null, 2);
      
      // Write to file
      await fs.writeFile(savePath, serialized, 'utf8');
      
      const result: StorageResult = {
        success: true,
        path: savePath,
        entriesCount: memories.size,
        sizeBytes: Buffer.byteLength(serialized, 'utf8'),
        duration: Date.now() - startTime
      };
      
      this.emit(StorageEvent.SAVE_COMPLETE, result);
      logger.debug('Memory saved successfully', result);
      
      return result;
    } catch (error) {
      const result: StorageResult = {
        success: false,
        error: error as Error,
        path: savePath,
        duration: Date.now() - startTime
      };
      
      this.emit(StorageEvent.ERROR, result);
      logger.error('Failed to save memory', error);
      
      return result;
    }
  }
  
  /**
   * Load memories from disk with optional decryption
   */
  public async load(filePath?: string): Promise<StorageResult & { memories?: Map<string, MemoryEntry> }> {
    const startTime = Date.now();
    const loadPath = filePath || this.getDefaultPath();
    
    this.emit(StorageEvent.LOAD_START, { path: loadPath });
    
    try {
      // Check if file exists
      try {
        await fs.access(loadPath);
      } catch {
        const result = {
          success: true,
          path: loadPath,
          entriesCount: 0,
          memories: new Map<string, MemoryEntry>(),
          duration: Date.now() - startTime
        };
        
        logger.debug('Memory file not found, starting with empty memory', { path: loadPath });
        this.emit(StorageEvent.LOAD_COMPLETE, result);
        
        return result;
      }
      
      // Read and parse file
      const fileContent = await fs.readFile(loadPath, 'utf8');
      const parsed = this.config.encrypt && this.encryptionKey
        ? JSON.parse(this.decrypt(fileContent))
        : JSON.parse(fileContent);
      
      const memories = new Map<string, MemoryEntry>(parsed);
      
      const result = {
        success: true,
        path: loadPath,
        entriesCount: memories.size,
        sizeBytes: Buffer.byteLength(fileContent, 'utf8'),
        memories,
        duration: Date.now() - startTime
      };
      
      this.emit(StorageEvent.LOAD_COMPLETE, result);
      logger.debug('Memory loaded successfully', result);
      
      return result;
    } catch (error) {
      const result = {
        success: false,
        error: error as Error,
        path: loadPath,
        duration: Date.now() - startTime
      };
      
      this.emit(StorageEvent.ERROR, result);
      logger.error('Failed to load memory', error);
      
      return result;
    }
  }
  
  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    exists: boolean;
    sizeBytes: number;
    lastModified?: Date;
    backupCount: number;
  }> {
    const filePath = this.getDefaultPath();
    
    try {
      const stats = await fs.stat(filePath);
      const backupCount = await this.countBackups(filePath);
      
      return {
        exists: true,
        sizeBytes: stats.size,
        lastModified: stats.mtime,
        backupCount
      };
    } catch {
      return {
        exists: false,
        sizeBytes: 0,
        backupCount: 0
      };
    }
  }
  
  /**
   * Clear storage file
   */
  public async clear(): Promise<StorageResult> {
    const filePath = this.getDefaultPath();
    
    try {
      await fs.unlink(filePath);
      
      const result: StorageResult = {
        success: true,
        path: filePath
      };
      
      logger.debug('Memory storage cleared', { path: filePath });
      return result;
    } catch (error) {
      const result: StorageResult = {
        success: false,
        error: error as Error,
        path: filePath
      };
      
      logger.error('Failed to clear memory storage', error);
      return result;
    }
  }
  
  // Private helper methods
  
  private getDefaultPath(): string {
    return path.join(this.config.storageDir, 'memories.json');
  }
  
  private async ensureDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }
  
  private async createBackup(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${filePath}.backup.${timestamp}`;
      await fs.copyFile(filePath, backupPath);
      
      // Clean old backups
      await this.cleanOldBackups(filePath);
    } catch {
      // File doesn't exist, no backup needed
    }
  }
  
  private async cleanOldBackups(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath);
    
    try {
      const files = await fs.readdir(dir);
      const backupFiles = files
        .filter(file => file.startsWith(`${baseName}.backup.`))
        .map(file => ({ file, path: path.join(dir, file) }));
      
      if (backupFiles.length > this.config.backupCount) {
        // Sort by creation time and remove oldest
        const stats = await Promise.all(
          backupFiles.map(async ({ file, path }) => ({
            file,
            path,
            mtime: (await fs.stat(path)).mtime
          }))
        );
        
        stats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        const toRemove = stats.slice(this.config.backupCount);
        
        await Promise.all(toRemove.map(({ path }) => fs.unlink(path)));
      }
    } catch (error) {
      logger.warn('Failed to clean old backups', error);
    }
  }
  
  private async countBackups(filePath: string): Promise<number> {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath);
    
    try {
      const files = await fs.readdir(dir);
      return files.filter(file => file.startsWith(`${baseName}.backup.`)).length;
    } catch {
      return 0;
    }
  }
  
  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }
  
  private decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }
    
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

/**
 * Factory function for creating memory storage service
 */
export function createMemoryStorageService(
  config: StorageConfig, 
  encryptionKey?: string
): MemoryStorageService {
  return new MemoryStorageService(config, encryptionKey);
} 