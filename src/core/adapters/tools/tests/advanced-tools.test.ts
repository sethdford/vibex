/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListDirectoryTool } from '../list-directory-adapter';
import { ReadManyFilesTool } from '../read-many-files-adapter';
import { EditTool } from '../edit-adapter';
import { GlobTool } from '../glob-adapter';

// Mock the legacy advanced file tools
vi.mock('../../../../tools/advanced-file-tools', () => ({
  executeListDirectory: vi.fn().mockImplementation(async (params) => {
    if (params.path === '/not/found') {
      return {
        success: false,
        error: 'Directory not found'
      };
    }
    return {
      success: true,
      result: {
        path: params.path,
        total_entries: 5,
        directories: 2,
        files: 3,
        entries: [
          { name: 'dir1', path: '/path/dir1', type: 'directory' },
          { name: 'dir2', path: '/path/dir2', type: 'directory' },
          { name: 'file1.txt', path: '/path/file1.txt', type: 'file' },
          { name: 'file2.js', path: '/path/file2.js', type: 'file' },
          { name: 'file3.md', path: '/path/file3.md', type: 'file' }
        ],
        options: params
      },
      metadata: {
        filesAffected: 5
      }
    };
  }),
  executeReadManyFiles: vi.fn().mockImplementation(async (params) => {
    if (!params.paths || params.paths.length === 0) {
      return {
        success: false,
        error: 'No file paths provided'
      };
    }
    return {
      success: true,
      result: {
        total_files: params.paths.length,
        successful_reads: params.paths.length - 1,
        failed_reads: 1,
        total_size: 1024,
        files: params.paths.map((path: string, index: number) => ({
          path,
          content: index === 0 ? undefined : `Content of ${path}`,
          error: index === 0 ? 'File not found' : undefined,
          size: index === 0 ? undefined : 512
        })),
        options: params
      },
      metadata: {
        filesAffected: params.paths.length - 1
      }
    };
  }),
  executeEdit: vi.fn().mockImplementation(async (params) => {
    if (params.path === '/not/writable') {
      return {
        success: false,
        error: 'Permission denied'
      };
    }
    return {
      success: true,
      result: {
        path: params.path,
        success: true,
        diff: '- old line\n+ new line',
        backup_path: params.create_backup ? `${params.path}.backup.123456789` : undefined,
        lines_added: 1,
        lines_removed: 1
      },
      metadata: {
        filesAffected: 1,
        linesAdded: 1,
        linesRemoved: 1
      }
    };
  }),
  executeGlob: vi.fn().mockImplementation(async (params) => {
    if (!params.patterns || params.patterns.length === 0) {
      return {
        success: false,
        error: 'No glob patterns provided'
      };
    }
    return {
      success: true,
      result: {
        total_matches: 3,
        patterns: params.patterns,
        base_path: params.base_path || '.',
        files: ['/path/file1.js', '/path/file2.js', '/path/file3.js'],
        truncated: false
      },
      metadata: {
        filesAffected: 3
      }
    };
  })
}));

describe('Advanced Tool Adapters', () => {
  describe('ListDirectoryTool', () => {
    let listDirectoryTool: ListDirectoryTool;

    beforeEach(() => {
      listDirectoryTool = new ListDirectoryTool();
    });

    it('should validate parameters correctly', () => {
      // Valid params
      expect(listDirectoryTool.validateParams({ path: '/path/to/dir' })).toBeNull();
      
      // Missing required params
      expect(listDirectoryTool.validateParams({})).not.toBeNull();
      
      // Invalid type
      expect(listDirectoryTool.validateParams({ path: 123 })).not.toBeNull();
      
      // Invalid sort_by
      expect(listDirectoryTool.validateParams({ 
        path: '/path',
        sort_by: 'invalid'
      })).not.toBeNull();
      
      // Valid sort_by
      expect(listDirectoryTool.validateParams({ 
        path: '/path',
        sort_by: 'modified'
      })).toBeNull();
    });

    it('should execute and return success result', async () => {
      const result = await listDirectoryTool.execute({ 
        path: '/path/to/dir',
        recursive: true,
        include_hidden: false,
        sort_by: 'name'
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data as any;
      expect(data.total_entries).toBe(5);
      expect(data.entries).toHaveLength(5);
      expect(data.entries[0].type).toBe('directory');
    });

    it('should handle errors during execution', async () => {
      const result = await listDirectoryTool.execute({ 
        path: '/not/found'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('ReadManyFilesTool', () => {
    let readManyFilesTool: ReadManyFilesTool;

    beforeEach(() => {
      readManyFilesTool = new ReadManyFilesTool();
    });

    it('should validate parameters correctly', () => {
      // Valid params
      expect(readManyFilesTool.validateParams({ 
        paths: ['/path/file1.txt', '/path/file2.txt']
      })).toBeNull();
      
      // Missing required params
      expect(readManyFilesTool.validateParams({})).not.toBeNull();
      
      // Empty paths array
      expect(readManyFilesTool.validateParams({ paths: [] })).not.toBeNull();
      
      // Invalid paths type
      expect(readManyFilesTool.validateParams({ paths: 'not-an-array' })).not.toBeNull();
      
      // Invalid items in paths array
      expect(readManyFilesTool.validateParams({ 
        paths: ['/path/file1.txt', 123]
      })).not.toBeNull();
    });

    it('should require confirmation for large batches', async () => {
      const confirmationDetails = await readManyFilesTool.shouldConfirmExecute({
        paths: Array(10).fill(0).map((_, i) => `/path/file${i}.txt`)
      });
      
      expect(confirmationDetails).not.toBeNull();
      expect(confirmationDetails!.type).toBe('info');
    });

    it('should not require confirmation for small batches', async () => {
      const confirmationDetails = await readManyFilesTool.shouldConfirmExecute({
        paths: ['/path/file1.txt', '/path/file2.txt']
      });
      
      expect(confirmationDetails).toBeNull();
    });

    it('should execute and return success result', async () => {
      const result = await readManyFilesTool.execute({ 
        paths: ['/path/file1.txt', '/path/file2.txt'],
        skip_binary: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data as any;
      expect(data.total_files).toBe(2);
      expect(data.successful_reads).toBe(1);
      expect(data.failed_reads).toBe(1);
    });

    it('should handle errors during execution', async () => {
      const result = await readManyFilesTool.execute({ 
        paths: []
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('EditTool', () => {
    let editTool: EditTool;

    beforeEach(() => {
      editTool = new EditTool();
    });

    it('should validate parameters correctly', () => {
      // Valid params
      expect(editTool.validateParams({ 
        path: '/path/file.txt',
        content: 'new content'
      })).toBeNull();
      
      // Missing required params
      expect(editTool.validateParams({ path: '/path/file.txt' })).not.toBeNull();
      expect(editTool.validateParams({ content: 'content' })).not.toBeNull();
      
      // Invalid types
      expect(editTool.validateParams({ 
        path: 123,
        content: 'content'
      })).not.toBeNull();
      
      // Invalid line_range
      expect(editTool.validateParams({ 
        path: '/path/file.txt',
        content: 'content',
        line_range: 'not-an-object'
      })).not.toBeNull();
      
      expect(editTool.validateParams({ 
        path: '/path/file.txt',
        content: 'content',
        line_range: { start: 'not-a-number', end: 10 }
      })).not.toBeNull();
      
      expect(editTool.validateParams({ 
        path: '/path/file.txt',
        content: 'content',
        line_range: { start: 0, end: 10 }
      })).not.toBeNull();
      
      expect(editTool.validateParams({ 
        path: '/path/file.txt',
        content: 'content',
        line_range: { start: 10, end: 5 }
      })).not.toBeNull();
      
      // Valid line_range
      expect(editTool.validateParams({ 
        path: '/path/file.txt',
        content: 'content',
        line_range: { start: 1, end: 10 }
      })).toBeNull();
    });

    it('should require confirmation before execution', async () => {
      const confirmationDetails = await editTool.shouldConfirmExecute({
        path: '/path/file.txt',
        content: 'new content'
      });
      
      expect(confirmationDetails).not.toBeNull();
      expect(confirmationDetails!.type).toBe('edit');
    });

    it('should not require confirmation for diff_only mode', async () => {
      const confirmationDetails = await editTool.shouldConfirmExecute({
        path: '/path/file.txt',
        content: 'new content',
        diff_only: true
      });
      
      expect(confirmationDetails).toBeNull();
    });

    it('should execute and return success result', async () => {
      const result = await editTool.execute({ 
        path: '/path/file.txt',
        content: 'new content',
        create_backup: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data as any;
      expect(data.success).toBe(true);
      expect(data.diff).toBe('- old line\n+ new line');
      expect(data.backup_path).toBeDefined();
    });

    it('should handle errors during execution', async () => {
      const result = await editTool.execute({ 
        path: '/not/writable',
        content: 'new content'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('GlobTool', () => {
    let globTool: GlobTool;

    beforeEach(() => {
      globTool = new GlobTool();
    });

    it('should validate parameters correctly', () => {
      // Valid params
      expect(globTool.validateParams({ 
        patterns: ['**/*.js', 'src/**/*.ts']
      })).toBeNull();
      
      // Missing required params
      expect(globTool.validateParams({})).not.toBeNull();
      
      // Empty patterns array
      expect(globTool.validateParams({ patterns: [] })).not.toBeNull();
      
      // Invalid patterns type
      expect(globTool.validateParams({ patterns: 'not-an-array' })).not.toBeNull();
      
      // Invalid items in patterns array
      expect(globTool.validateParams({ 
        patterns: ['**/*.js', 123]
      })).not.toBeNull();
      
      // Invalid max_results
      expect(globTool.validateParams({ 
        patterns: ['**/*.js'],
        max_results: 0
      })).not.toBeNull();
      
      expect(globTool.validateParams({ 
        patterns: ['**/*.js'],
        max_results: 'not-a-number'
      })).not.toBeNull();
    });

    it('should execute and return success result', async () => {
      const result = await globTool.execute({ 
        patterns: ['**/*.js'],
        base_path: '/path',
        ignore_patterns: ['**/node_modules/**'],
        sort: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data as any;
      expect(data.total_matches).toBe(3);
      expect(data.files).toHaveLength(3);
      expect(data.files[0]).toBe('/path/file1.js');
    });

    it('should handle errors during execution', async () => {
      const result = await globTool.execute({ 
        patterns: []
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});