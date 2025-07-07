/**
 * Context Loading Service Tests - Clean Architecture like Gemini CLI
 * 
 * Comprehensive test coverage for context file loading operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFile, access, stat, readdir } from 'fs/promises';
import { join } from 'path';
import { 
  ContextLoadingService, 
  createContextLoadingService,
  ContextFileType,
  ContextInheritanceStrategy,
  type ContextLoadingConfig 
} from './context-loading-service.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  access: vi.fn(),
  stat: vi.fn(),
  readdir: vi.fn(),
  default: {
    readFile: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn()
  }
}));

// Get mocked functions
const mockReadFile = vi.mocked(readFile);
const mockAccess = vi.mocked(access);
const mockStat = vi.mocked(stat);
const mockReaddir = vi.mocked(readdir);

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('ContextLoadingService', () => {
  let service: ContextLoadingService;
  const mockConfig: Partial<ContextLoadingConfig> = {
    globalContextDir: '/home/user/.cursor',
    contextFileNames: ['.cursorrules', '.context.md'],
    projectMarkers: ['package.json', '.git'],
    maxDepth: 5,
    encoding: 'utf8'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = createContextLoadingService(mockConfig);
  });

  describe('constructor', () => {
    it('should create service with default configuration', () => {
      const defaultService = createContextLoadingService();
      expect(defaultService).toBeInstanceOf(ContextLoadingService);
    });

    it('should merge provided configuration with defaults', () => {
      const config = service.getConfig();
      expect(config.globalContextDir).toBe('/home/user/.cursor');
      expect(config.contextFileNames).toEqual(['.cursorrules', '.context.md']);
      expect(config.maxDepth).toBe(5);
    });
  });

  describe('loadGlobalContext', () => {
    it('should load global context files successfully', async () => {
      const mockContent = 'Global context content';
      const mockStats = { mtime: new Date('2024-01-01'), size: 100 };

      mockAccess.mockResolvedValue(undefined as any);
      mockReadFile.mockResolvedValue(mockContent as any);
      mockStat.mockResolvedValue(mockStats as any);

      const entries = await service.loadGlobalContext();

      expect(entries).toHaveLength(2); // Two context files
      expect(entries[0]).toMatchObject({
        type: ContextFileType.GLOBAL,
        content: mockContent,
        priority: 1000,
        scope: 'global',
        strategy: ContextInheritanceStrategy.MERGE
      });
      expect(entries[0].metadata).toMatchObject({
        source: 'global',
        fileName: '.cursorrules'
      });
    });

    it('should return empty array when global context disabled', async () => {
      const disabledService = createContextLoadingService({
        ...mockConfig,
        enableGlobalContext: false
      });

      const entries = await disabledService.loadGlobalContext();
      expect(entries).toHaveLength(0);
    });

    it('should return empty array when global context directory does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('Directory not found'));

      const entries = await service.loadGlobalContext();
      expect(entries).toHaveLength(0);
    });

    it('should skip missing context files gracefully', async () => {
      const mockContent = 'Context content';
      const mockStats = { mtime: new Date('2024-01-01'), size: 100 };

      // First call (global dir) succeeds
      mockAccess.mockResolvedValueOnce(undefined as any);
      // First file succeeds
      mockAccess.mockResolvedValueOnce(undefined as any);
      mockReadFile.mockResolvedValueOnce(mockContent as any);
      mockStat.mockResolvedValueOnce(mockStats as any);
      // Second file fails
      mockAccess.mockRejectedValueOnce(new Error('File not found'));

      const entries = await service.loadGlobalContext();

      expect(entries).toHaveLength(1);
      expect(entries[0].content).toBe(mockContent);
    });
  });

  describe('loadProjectContext', () => {
    it('should load project context files successfully', async () => {
      const mockContent = 'Project context content';
      const mockStats = { mtime: new Date('2024-01-01'), size: 100 };
      const currentDir = '/project/src';
      const projectRoot = '/project';

      // Mock project root discovery
      mockAccess
        .mockRejectedValueOnce(new Error('Not found')) // /project/src/package.json
        .mockResolvedValueOnce(undefined as any); // /project/package.json

      // Mock context file loading
      mockAccess.mockResolvedValue(undefined as any);
      mockReadFile.mockResolvedValue(mockContent as any);
      mockStat.mockResolvedValue(mockStats as any);

      const entries = await service.loadProjectContext(currentDir);

      expect(entries).toHaveLength(2);
      expect(entries[0]).toMatchObject({
        type: ContextFileType.PROJECT,
        content: mockContent,
        priority: 500,
        scope: 'project',
        strategy: ContextInheritanceStrategy.MERGE
      });
      expect(entries[0].metadata).toMatchObject({
        source: 'project',
        projectRoot: projectRoot
      });
    });

    it('should return empty array when project context disabled', async () => {
      const disabledService = createContextLoadingService({
        ...mockConfig,
        enableProjectContext: false
      });

      const entries = await disabledService.loadProjectContext('/project/src');
      expect(entries).toHaveLength(0);
    });

    it('should return empty array when no project root found', async () => {
      mockAccess.mockRejectedValue(new Error('Not found'));

      const entries = await service.loadProjectContext('/no/project');
      expect(entries).toHaveLength(0);
    });
  });

  describe('loadDirectoryContext', () => {
    it('should load directory context files with decreasing priority', async () => {
      const mockContent = 'Directory context content';
      const mockStats = { mtime: new Date('2024-01-01'), size: 100 };
      const currentDir = '/project/src/components';

      mockAccess.mockResolvedValue(undefined as any);
      mockReadFile.mockResolvedValue(mockContent as any);
      mockStat.mockResolvedValue(mockStats as any);

      const entries = await service.loadDirectoryContext(currentDir);

      // Should find files in current dir and parent dirs
      expect(entries.length).toBeGreaterThan(0);
      
      // Check priority decreases with depth
      if (entries.length > 1) {
        expect(entries[0].priority).toBeGreaterThanOrEqual(entries[1].priority);
      }
    });

    it('should return empty array when directory context disabled', async () => {
      const disabledService = createContextLoadingService({
        ...mockConfig,
        enableDirectoryContext: false
      });

      const entries = await disabledService.loadDirectoryContext('/project/src');
      expect(entries).toHaveLength(0);
    });

    it('should respect maxDepth configuration', async () => {
      const shallowService = createContextLoadingService({
        ...mockConfig,
        maxDepth: 1
      });

      mockAccess.mockResolvedValue(undefined as any);
      mockReadFile.mockResolvedValue('content' as any);
      mockStat.mockResolvedValue({ mtime: new Date(), size: 100 } as any);

      const entries = await shallowService.loadDirectoryContext('/very/deep/nested/path');

      // Should only check current directory and one parent
      expect(mockAccess).toHaveBeenCalledTimes(4); // 2 files × 2 directories
    });
  });

  describe('validateContextFile', () => {
    it('should validate existing readable file', async () => {
      const filePath = '/path/to/context.md';
      const mockContent = 'Valid context content';
      const mockStats = { 
        isFile: () => true, 
        size: 1000, 
        mtime: new Date() 
      };

      mockAccess.mockResolvedValue(undefined as any);
      mockStat.mockResolvedValue(mockStats as any);
      mockReadFile.mockResolvedValue(mockContent as any);

      const result = await service.validateContextFile(filePath);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect non-existent files', async () => {
      const filePath = '/path/to/missing.md';
      mockAccess.mockRejectedValue(new Error('File not found'));

      const result = await service.validateContextFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot read file: File not found');
    });

    it('should detect directories instead of files', async () => {
      const filePath = '/path/to/directory';
      const mockStats = { 
        isFile: () => false, 
        isDirectory: () => true 
      };

      mockAccess.mockResolvedValue(undefined as any);
      mockStat.mockResolvedValue(mockStats as any);

      const result = await service.validateContextFile(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path is not a file');
    });

    it('should warn about large files', async () => {
      const filePath = '/path/to/large.md';
      const mockContent = 'Content';
      const mockStats = { 
        isFile: () => true, 
        size: 2 * 1024 * 1024, // 2MB
        mtime: new Date() 
      };

      mockAccess.mockResolvedValue(undefined as any);
      mockStat.mockResolvedValue(mockStats as any);
      mockReadFile.mockResolvedValue(mockContent as any);

      const result = await service.validateContextFile(filePath);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('File is very large (2048KB)');
    });

    it('should warn about empty files', async () => {
      const filePath = '/path/to/empty.md';
      const mockStats = { 
        isFile: () => true, 
        size: 100, 
        mtime: new Date() 
      };

      mockAccess.mockResolvedValue(undefined as any);
      mockStat.mockResolvedValue(mockStats as any);
      mockReadFile.mockResolvedValue('   \n  \t  ' as any); // Whitespace only

      const result = await service.validateContextFile(filePath);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('File is empty');
    });

    it('should warn about old files', async () => {
      const filePath = '/path/to/old.md';
      const mockContent = 'Old content';
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 7); // 7 months ago
      const mockStats = { 
        isFile: () => true, 
        size: 100, 
        mtime: oldDate 
      };

      mockAccess.mockResolvedValue(undefined as any);
      mockStat.mockResolvedValue(mockStats as any);
      mockReadFile.mockResolvedValue(mockContent as any);

      const result = await service.validateContextFile(filePath);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('File is older than 6 months');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockAccess.mockRejectedValue(new Error('Permission denied'));

      const entries = await service.loadGlobalContext();
      expect(entries).toHaveLength(0);
    });

    it('should handle invalid file content encoding', async () => {
      mockAccess.mockResolvedValue(undefined as any);
      mockReadFile.mockRejectedValue(new Error('Invalid encoding'));
      mockStat.mockResolvedValue({ mtime: new Date(), size: 100 } as any);

      const entries = await service.loadGlobalContext();
      expect(entries).toHaveLength(0);
    });

    it('should handle stat errors gracefully', async () => {
      mockAccess.mockResolvedValue(undefined as any);
      mockReadFile.mockResolvedValue('content' as any);
      mockStat.mockRejectedValue(new Error('Stat failed'));

      const entries = await service.loadGlobalContext();
      expect(entries).toHaveLength(0);
    });
  });

  describe('configuration', () => {
    it('should return current configuration', () => {
      const config = service.getConfig();
      
      expect(config).toMatchObject({
        globalContextDir: '/home/user/.cursor',
        contextFileNames: ['.cursorrules', '.context.md'],
        projectMarkers: ['package.json', '.git'],
        maxDepth: 5,
        encoding: 'utf8'
      });
    });

    it('should not mutate original configuration', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();
      
      expect(config1).not.toBe(config2);
      config1.maxDepth = 999;
      expect(config2.maxDepth).toBe(5);
    });
  });
});