/**
 * File Type Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for file type detection, validation, and MIME type handling
 */

import path from 'path';
import { ContentType } from './types.js';

/**
 * Service for managing file type detection and validation
 */
export class FileTypeService {
  /**
   * Check if text represents a file path
   */
  static isFilePath(text: string): boolean {
    const patterns = [
      /^\/[^\/\s]+/,                    // Unix absolute path
      /^~\/[^\/\s]+/,                   // Unix home path
      /^[A-Z]:\\[^\\\/\s]+/,            // Windows absolute path
      /^\.\/[^\/\s]+/,                  // Relative path starting with ./
      /^\.\.\/[^\/\s]+/,                // Relative path starting with ../
      /^[^\/\s]+\.[a-zA-Z0-9]{1,10}$/,  // Filename with extension
    ];
    
    return patterns.some(pattern => pattern.test(text.trim()));
  }

  /**
   * Detect content type from file path
   */
  static getFileType(filePath: string): ContentType {
    const ext = path.extname(filePath).toLowerCase();
    
    // Image files
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(ext)) {
      return ContentType.IMAGE;
    }
    
    // Audio files
    if (['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'].includes(ext)) {
      return ContentType.AUDIO;
    }
    
    // Video files
    if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(ext)) {
      return ContentType.VIDEO;
    }
    
    // Document files
    if (['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'].includes(ext)) {
      return ContentType.DOCUMENT;
    }
    
    // Code files
    if (['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb', '.html', '.css', '.json', '.xml', '.yaml', '.yml'].includes(ext)) {
      return ContentType.CODE;
    }
    
    // Spreadsheet files
    if (['.xls', '.xlsx', '.csv', '.ods'].includes(ext)) {
      return ContentType.SPREADSHEET;
    }
    
    // Presentation files
    if (['.ppt', '.pptx', '.odp'].includes(ext)) {
      return ContentType.PRESENTATION;
    }
    
    // Default to text for unknown types
    return ContentType.TEXT;
  }

  /**
   * Get MIME type for content type
   */
  static getMimeType(type: ContentType): string {
    switch (type) {
      case ContentType.IMAGE:
        return 'image/*';
      case ContentType.AUDIO:
        return 'audio/*';
      case ContentType.VIDEO:
        return 'video/*';
      case ContentType.DOCUMENT:
        return 'application/pdf';
      case ContentType.CODE:
        return 'text/plain';
      case ContentType.SPREADSHEET:
        return 'application/vnd.ms-excel';
      case ContentType.PRESENTATION:
        return 'application/vnd.ms-powerpoint';
      case ContentType.TEXT:
      default:
        return 'text/plain';
    }
  }

  /**
   * Get specific MIME type from file extension
   */
  static getSpecificMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeMap: Record<string, string> = {
      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      
      // Audio
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      
      // Video
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      
      // Documents
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.rtf': 'application/rtf',
      '.odt': 'application/vnd.oasis.opendocument.text',
      
      // Code
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.py': 'text/x-python',
      '.java': 'text/x-java-source',
      '.cpp': 'text/x-c++src',
      '.c': 'text/x-csrc',
      '.go': 'text/x-go',
      '.rs': 'text/x-rust',
      '.php': 'text/x-php',
      '.rb': 'text/x-ruby',
      '.html': 'text/html',
      '.css': 'text/css',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.yaml': 'text/yaml',
      '.yml': 'text/yaml',
      
      // Spreadsheets
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
      
      // Presentations
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.odp': 'application/vnd.oasis.opendocument.presentation',
    };
    
    return mimeMap[ext] || 'application/octet-stream';
  }

  /**
   * Validate file type against supported types
   */
  static isFileTypeSupported(filePath: string, supportedTypes: ContentType[]): boolean {
    const fileType = this.getFileType(filePath);
    return supportedTypes.includes(fileType);
  }

  /**
   * Get file extension from content type
   */
  static getDefaultExtension(type: ContentType): string {
    switch (type) {
      case ContentType.IMAGE:
        return '.png';
      case ContentType.AUDIO:
        return '.mp3';
      case ContentType.VIDEO:
        return '.mp4';
      case ContentType.DOCUMENT:
        return '.pdf';
      case ContentType.CODE:
        return '.txt';
      case ContentType.SPREADSHEET:
        return '.xlsx';
      case ContentType.PRESENTATION:
        return '.pptx';
      case ContentType.TEXT:
      default:
        return '.txt';
    }
  }

  /**
   * Parse multiple file paths from input string
   */
  static parseFilePathsFromInput(input: string): string[] {
    return input
      .split(',')
      .map(path => path.trim())
      .filter(path => path.length > 0 && this.isFilePath(path));
  }

  /**
   * Validate file size
   */
  static isFileSizeValid(size: number, maxSize: number): boolean {
    return size <= maxSize && size > 0;
  }

  /**
   * Get human-readable file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Get content type categories
   */
  static getContentTypeCategories(): Record<string, ContentType[]> {
    return {
      media: [ContentType.IMAGE, ContentType.AUDIO, ContentType.VIDEO],
      documents: [ContentType.DOCUMENT, ContentType.PRESENTATION, ContentType.SPREADSHEET],
      code: [ContentType.CODE, ContentType.TEXT],
      all: Object.values(ContentType),
    };
  }

  /**
   * Check if content type is media
   */
  static isMediaType(type: ContentType): boolean {
    return [ContentType.IMAGE, ContentType.AUDIO, ContentType.VIDEO].includes(type);
  }

  /**
   * Check if content type is document
   */
  static isDocumentType(type: ContentType): boolean {
    return [ContentType.DOCUMENT, ContentType.PRESENTATION, ContentType.SPREADSHEET].includes(type);
  }

  /**
   * Check if content type is code
   */
  static isCodeType(type: ContentType): boolean {
    return [ContentType.CODE, ContentType.TEXT].includes(type);
  }
} 