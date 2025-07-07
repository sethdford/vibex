/**
 * FileTypeService Tests - Clean Architecture like Gemini CLI
 * 
 * Comprehensive tests for file type detection and validation
 */

import { describe, it, expect } from 'vitest';
import { FileTypeService } from '../../../../src/ui/components/multimodal-content/FileTypeService.js';
import { ContentType } from '../../../../src/ui/components/multimodal-content/types.js';

describe('FileTypeService', () => {
  describe('isFilePath', () => {
    it('should detect Unix absolute paths', () => {
      expect(FileTypeService.isFilePath('/home/user/file.txt')).toBe(true);
      expect(FileTypeService.isFilePath('/usr/local/bin/app')).toBe(true);
      expect(FileTypeService.isFilePath('/file.txt')).toBe(true);
    });

    it('should detect Unix home paths', () => {
      expect(FileTypeService.isFilePath('~/Documents/file.pdf')).toBe(true);
      expect(FileTypeService.isFilePath('~/file.txt')).toBe(true);
    });

    it('should detect Windows absolute paths', () => {
      expect(FileTypeService.isFilePath('C:\\Users\\user\\file.txt')).toBe(true);
      expect(FileTypeService.isFilePath('D:\\Projects\\app.exe')).toBe(true);
    });

    it('should detect relative paths', () => {
      expect(FileTypeService.isFilePath('./file.txt')).toBe(true);
      expect(FileTypeService.isFilePath('../parent/file.txt')).toBe(true);
    });

    it('should detect filenames with extensions', () => {
      expect(FileTypeService.isFilePath('file.txt')).toBe(true);
      expect(FileTypeService.isFilePath('document.pdf')).toBe(true);
      expect(FileTypeService.isFilePath('image.jpg')).toBe(true);
    });

    it('should reject non-file paths', () => {
      expect(FileTypeService.isFilePath('just text')).toBe(false);
      expect(FileTypeService.isFilePath('no extension')).toBe(false);
      expect(FileTypeService.isFilePath('')).toBe(false);
      expect(FileTypeService.isFilePath('   ')).toBe(false);
    });
  });

  describe('getFileType', () => {
    it('should detect image files', () => {
      expect(FileTypeService.getFileType('image.jpg')).toBe(ContentType.IMAGE);
      expect(FileTypeService.getFileType('photo.jpeg')).toBe(ContentType.IMAGE);
      expect(FileTypeService.getFileType('picture.png')).toBe(ContentType.IMAGE);
      expect(FileTypeService.getFileType('animation.gif')).toBe(ContentType.IMAGE);
      expect(FileTypeService.getFileType('bitmap.bmp')).toBe(ContentType.IMAGE);
      expect(FileTypeService.getFileType('modern.webp')).toBe(ContentType.IMAGE);
      expect(FileTypeService.getFileType('vector.svg')).toBe(ContentType.IMAGE);
    });

    it('should detect audio files', () => {
      expect(FileTypeService.getFileType('song.mp3')).toBe(ContentType.AUDIO);
      expect(FileTypeService.getFileType('audio.wav')).toBe(ContentType.AUDIO);
      expect(FileTypeService.getFileType('music.flac')).toBe(ContentType.AUDIO);
      expect(FileTypeService.getFileType('sound.ogg')).toBe(ContentType.AUDIO);
      expect(FileTypeService.getFileType('track.m4a')).toBe(ContentType.AUDIO);
      expect(FileTypeService.getFileType('compressed.aac')).toBe(ContentType.AUDIO);
    });

    it('should detect video files', () => {
      expect(FileTypeService.getFileType('movie.mp4')).toBe(ContentType.VIDEO);
      expect(FileTypeService.getFileType('video.avi')).toBe(ContentType.VIDEO);
      expect(FileTypeService.getFileType('clip.mov')).toBe(ContentType.VIDEO);
      expect(FileTypeService.getFileType('windows.wmv')).toBe(ContentType.VIDEO);
      expect(FileTypeService.getFileType('flash.flv')).toBe(ContentType.VIDEO);
      expect(FileTypeService.getFileType('web.webm')).toBe(ContentType.VIDEO);
      expect(FileTypeService.getFileType('matroska.mkv')).toBe(ContentType.VIDEO);
    });

    it('should detect document files', () => {
      expect(FileTypeService.getFileType('document.pdf')).toBe(ContentType.DOCUMENT);
      expect(FileTypeService.getFileType('old.doc')).toBe(ContentType.DOCUMENT);
      expect(FileTypeService.getFileType('new.docx')).toBe(ContentType.DOCUMENT);
      expect(FileTypeService.getFileType('plain.txt')).toBe(ContentType.DOCUMENT);
      expect(FileTypeService.getFileType('rich.rtf')).toBe(ContentType.DOCUMENT);
      expect(FileTypeService.getFileType('open.odt')).toBe(ContentType.DOCUMENT);
    });

    it('should detect code files', () => {
      expect(FileTypeService.getFileType('script.js')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('typed.ts')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('program.py')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('app.java')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('system.cpp')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('kernel.c')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('service.go')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('safe.rs')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('web.php')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('gem.rb')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('page.html')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('style.css')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('data.json')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('config.xml')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('settings.yaml')).toBe(ContentType.CODE);
      expect(FileTypeService.getFileType('config.yml')).toBe(ContentType.CODE);
    });

    it('should detect spreadsheet files', () => {
      expect(FileTypeService.getFileType('old.xls')).toBe(ContentType.SPREADSHEET);
      expect(FileTypeService.getFileType('new.xlsx')).toBe(ContentType.SPREADSHEET);
      expect(FileTypeService.getFileType('data.csv')).toBe(ContentType.SPREADSHEET);
      expect(FileTypeService.getFileType('calc.ods')).toBe(ContentType.SPREADSHEET);
    });

    it('should detect presentation files', () => {
      expect(FileTypeService.getFileType('old.ppt')).toBe(ContentType.PRESENTATION);
      expect(FileTypeService.getFileType('new.pptx')).toBe(ContentType.PRESENTATION);
      expect(FileTypeService.getFileType('slides.odp')).toBe(ContentType.PRESENTATION);
    });

    it('should default to text for unknown types', () => {
      expect(FileTypeService.getFileType('unknown.xyz')).toBe(ContentType.TEXT);
      expect(FileTypeService.getFileType('noextension')).toBe(ContentType.TEXT);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types for content types', () => {
      expect(FileTypeService.getMimeType(ContentType.IMAGE)).toBe('image/*');
      expect(FileTypeService.getMimeType(ContentType.AUDIO)).toBe('audio/*');
      expect(FileTypeService.getMimeType(ContentType.VIDEO)).toBe('video/*');
      expect(FileTypeService.getMimeType(ContentType.DOCUMENT)).toBe('application/pdf');
      expect(FileTypeService.getMimeType(ContentType.CODE)).toBe('text/plain');
      expect(FileTypeService.getMimeType(ContentType.SPREADSHEET)).toBe('application/vnd.ms-excel');
      expect(FileTypeService.getMimeType(ContentType.PRESENTATION)).toBe('application/vnd.ms-powerpoint');
      expect(FileTypeService.getMimeType(ContentType.TEXT)).toBe('text/plain');
    });
  });

  describe('getSpecificMimeType', () => {
    it('should return specific MIME types for file extensions', () => {
      expect(FileTypeService.getSpecificMimeType('image.jpg')).toBe('image/jpeg');
      expect(FileTypeService.getSpecificMimeType('image.png')).toBe('image/png');
      expect(FileTypeService.getSpecificMimeType('audio.mp3')).toBe('audio/mpeg');
      expect(FileTypeService.getSpecificMimeType('video.mp4')).toBe('video/mp4');
      expect(FileTypeService.getSpecificMimeType('document.pdf')).toBe('application/pdf');
      expect(FileTypeService.getSpecificMimeType('script.js')).toBe('text/javascript');
      expect(FileTypeService.getSpecificMimeType('data.json')).toBe('application/json');
    });

    it('should return default MIME type for unknown extensions', () => {
      expect(FileTypeService.getSpecificMimeType('unknown.xyz')).toBe('application/octet-stream');
    });
  });

  describe('isFileTypeSupported', () => {
    it('should validate supported file types', () => {
      const supportedTypes = [ContentType.IMAGE, ContentType.DOCUMENT];
      
      expect(FileTypeService.isFileTypeSupported('image.jpg', supportedTypes)).toBe(true);
      expect(FileTypeService.isFileTypeSupported('document.pdf', supportedTypes)).toBe(true);
      expect(FileTypeService.isFileTypeSupported('audio.mp3', supportedTypes)).toBe(false);
      expect(FileTypeService.isFileTypeSupported('video.mp4', supportedTypes)).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(FileTypeService.formatFileSize(0)).toBe('0 B');
      expect(FileTypeService.formatFileSize(512)).toBe('512 B');
      expect(FileTypeService.formatFileSize(1024)).toBe('1 KB');
      expect(FileTypeService.formatFileSize(1536)).toBe('1.5 KB');
      expect(FileTypeService.formatFileSize(1048576)).toBe('1 MB');
      expect(FileTypeService.formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('parseFilePathsFromInput', () => {
    it('should parse single file path', () => {
      const result = FileTypeService.parseFilePathsFromInput('./file.txt');
      expect(result).toEqual(['./file.txt']);
    });

    it('should parse multiple file paths', () => {
      const result = FileTypeService.parseFilePathsFromInput('./file1.txt, ~/file2.pdf, /absolute/file3.jpg');
      expect(result).toEqual(['./file1.txt', '~/file2.pdf', '/absolute/file3.jpg']);
    });

    it('should filter out invalid paths', () => {
      const result = FileTypeService.parseFilePathsFromInput('./file.txt, invalid text, ~/valid.pdf');
      expect(result).toEqual(['./file.txt', '~/valid.pdf']);
    });

    it('should handle empty input', () => {
      expect(FileTypeService.parseFilePathsFromInput('')).toEqual([]);
      expect(FileTypeService.parseFilePathsFromInput('   ')).toEqual([]);
    });
  });

  describe('isFileSizeValid', () => {
    it('should validate file sizes', () => {
      const maxSize = 1024 * 1024; // 1MB
      
      expect(FileTypeService.isFileSizeValid(512, maxSize)).toBe(true);
      expect(FileTypeService.isFileSizeValid(maxSize, maxSize)).toBe(true);
      expect(FileTypeService.isFileSizeValid(maxSize + 1, maxSize)).toBe(false);
      expect(FileTypeService.isFileSizeValid(0, maxSize)).toBe(false);
      expect(FileTypeService.isFileSizeValid(-1, maxSize)).toBe(false);
    });
  });

  describe('content type helpers', () => {
    it('should identify media types', () => {
      expect(FileTypeService.isMediaType(ContentType.IMAGE)).toBe(true);
      expect(FileTypeService.isMediaType(ContentType.AUDIO)).toBe(true);
      expect(FileTypeService.isMediaType(ContentType.VIDEO)).toBe(true);
      expect(FileTypeService.isMediaType(ContentType.DOCUMENT)).toBe(false);
      expect(FileTypeService.isMediaType(ContentType.CODE)).toBe(false);
    });

    it('should identify document types', () => {
      expect(FileTypeService.isDocumentType(ContentType.DOCUMENT)).toBe(true);
      expect(FileTypeService.isDocumentType(ContentType.PRESENTATION)).toBe(true);
      expect(FileTypeService.isDocumentType(ContentType.SPREADSHEET)).toBe(true);
      expect(FileTypeService.isDocumentType(ContentType.IMAGE)).toBe(false);
      expect(FileTypeService.isDocumentType(ContentType.CODE)).toBe(false);
    });

    it('should identify code types', () => {
      expect(FileTypeService.isCodeType(ContentType.CODE)).toBe(true);
      expect(FileTypeService.isCodeType(ContentType.TEXT)).toBe(true);
      expect(FileTypeService.isCodeType(ContentType.IMAGE)).toBe(false);
      expect(FileTypeService.isCodeType(ContentType.DOCUMENT)).toBe(false);
    });
  });
}); 