/**
 * Conversation Tree Storage Service Tests
 * 
 * Comprehensive test suite for the storage service following clean architecture patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import path from 'path';
import { ConversationTreeStorageService, createTreeStorageService } from './conversation-tree-storage.js';
import type { ConversationTree, ConversationNode, ConversationMessage } from '../conversation/types.js';

// Mock dependencies
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
  rename: vi.fn(),
  cp: vi.fn(),
  rm: vi.fn(),
  readdir: vi.fn(),
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn(),
    cp: vi.fn(),
    rm: vi.fn(),
    readdir: vi.fn()
  }
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Get mocked functions
const mockReadFile = vi.mocked(fs.readFile);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockMkdir = vi.mocked(fs.mkdir);
const mockAccess = vi.mocked(fs.access);
const mockStat = vi.mocked(fs.stat);
const mockRm = vi.mocked(fs.rm);
const mockCp = vi.mocked(fs.cp);
const mockReaddir = vi.mocked(fs.readdir);

describe('ConversationTreeStorageService', () => {
  let storageService: ConversationTreeStorageService;
  let testConfig: any;
  let mockTree: ConversationTree;
  let mockNode: ConversationNode;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup test configuration
    testConfig = {
      storageDirectory: '/test/storage',
      enableBackups: true,
      maxBackups: 3,
      compressionEnabled: true
    };

    // Mock initialization success
    mockMkdir.mockResolvedValue(undefined as any);
    
    // Create service instance
    storageService = createTreeStorageService(testConfig);
    
    // Manually set the initialized flag to true (bypassing the private modifier)
    (storageService as any).initialized = true;

    // Setup mock tree data
    mockNode = {
      id: 'node-1',
      name: 'Test Node',
      description: 'Test node description',
      parentId: undefined,
      children: [],
      branchPoint: undefined,
      messages: [
        {
          role: 'user',
          content: 'Test message',
          timestamp: Date.now(),
          metadata: {}
        } as ConversationMessage
      ],
      contextSnapshot: undefined,
      metadata: {
        model: 'test-model',
        messageCount: 1,
        size: 100,
        tags: ['test'],
        branchName: 'main',
        isMainBranch: true,
        mergeStatus: 'unmerged',
        compressionRatio: undefined,
        loadTime: undefined,
        custom: {}
      },
      createdAt: Date.now(),
      lastModified: Date.now(),
      lastActive: Date.now()
    };

    mockTree = {
      id: 'tree-1',
      name: 'Test Tree',
      description: 'Test tree description',
      rootId: 'node-1',
      nodes: new Map([['node-1', mockNode]]),
      activeNodeId: 'node-1',
      metadata: {
        totalNodes: 1,
        totalMessages: 1,
        maxDepth: 1,
        branchCount: 1,
        mergedBranches: 0,
        conflictedBranches: 0,
        tags: ['test'],
        custom: {}
      },
      createdAt: Date.now(),
      lastModified: Date.now()
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize storage directories successfully', async () => {
      // Reset the service to get a clean uninitialized state
      vi.clearAllMocks();
      storageService = createTreeStorageService(testConfig);
      
      // Arrange
      mockMkdir.mockResolvedValue(undefined as any);

      // Act
      const result = await storageService.initialize();
      
      // Manually set the initialized flag for the success test
      (storageService as any).initialized = true;

      // Assert
      expect(result.success).toBe(true);
      expect(mockMkdir).toHaveBeenCalledWith('/test/storage', { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith('/test/storage/nodes', { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith('/test/storage/visualization', { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith('/test/storage/backups', { recursive: true });
    });

    it('should handle initialization errors gracefully', async () => {
      // Arrange
      const error = new Error('Permission denied');
      mockMkdir.mockRejectedValue(error);

      // Act
      const result = await storageService.initialize();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Storage initialization failed');
      expect(result.timing).toBeDefined();
    });

    it('should not create backup directory when backups disabled', async () => {
      // Arrange
      const configWithoutBackups = { ...testConfig, enableBackups: false };
      const service = createTreeStorageService(configWithoutBackups);
      mockMkdir.mockResolvedValue(undefined as any);

      // Act
      await service.initialize();

      // Assert
      expect(mockMkdir).not.toHaveBeenCalledWith('/test/storage/backups', { recursive: true });
    });
  });

  describe('saveTree', () => {

    it('should save tree successfully', async () => {
      // Arrange
      mockWriteFile.mockResolvedValue(undefined as any);
      mockCp.mockResolvedValue(undefined as any);
      mockReaddir.mockResolvedValue([] as any);

      // Act
      const result = await storageService.saveTree(mockTree);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ nodeCount: 1, duration: expect.any(Number) });
      expect(mockWriteFile).toHaveBeenCalledTimes(2); // metadata + 1 node
      expect(mockMkdir).toHaveBeenCalledWith('/test/storage/tree-1', { recursive: true });
      expect(mockMkdir).toHaveBeenCalledWith('/test/storage/tree-1/nodes', { recursive: true });
    });

    it('should create backup when enabled', async () => {
      // Arrange
      mockWriteFile.mockResolvedValue(undefined as any);
      mockCp.mockResolvedValue(undefined as any);
      mockReaddir.mockResolvedValue([] as any);

      // Act
      await storageService.saveTree(mockTree);

      // Assert
      expect(mockCp).toHaveBeenCalledWith(
        '/test/storage/tree-1',
        expect.stringMatching(/\/test\/storage\/backups\/tree-1_.*$/),
        { recursive: true }
      );
    });

    it('should handle save errors gracefully', async () => {
      // Arrange
      const error = new Error('Disk full');
      mockWriteFile.mockRejectedValue(error);

      // Act
      const result = await storageService.saveTree(mockTree);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save tree');
      expect(result.timing).toBeDefined();
    });

    it('should save multiple nodes correctly', async () => {
      // Arrange
      const childNode = { ...mockNode, id: 'node-2', parentId: 'node-1' };
      mockTree.nodes.set('node-2', childNode);
      mockTree.metadata.totalNodes = 2;
      mockWriteFile.mockResolvedValue(undefined as any);
      mockCp.mockResolvedValue(undefined as any);
      mockReaddir.mockResolvedValue([] as any);

      // Act
      const result = await storageService.saveTree(mockTree);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.nodeCount).toBe(2);
      expect(mockWriteFile).toHaveBeenCalledTimes(3); // metadata + 2 nodes
    });
  });

  describe('loadTree', () => {

    it('should load tree successfully', async () => {
      // Arrange
      const treeMetadata = { ...mockTree, nodes: undefined };
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(treeMetadata))
        .mockResolvedValueOnce(JSON.stringify(mockNode));
      mockReaddir.mockResolvedValue(['node-1.json'] as any);

      // Act
      const result = await storageService.loadTree('tree-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('tree-1');
      expect(result.data?.nodes.size).toBe(1);
      expect(result.data?.nodes.get('node-1')).toEqual(mockNode);
      expect(result.timing).toBeDefined();
    });

    it('should handle non-existent tree', async () => {
      // Arrange
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      // Act
      const result = await storageService.loadTree('non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Tree not found: non-existent');
    });

    it('should handle corrupted metadata', async () => {
      // Arrange
      mockReadFile.mockResolvedValue('invalid json');

      // Act
      const result = await storageService.loadTree('tree-1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load tree');
    });

    it('should skip non-JSON files in nodes directory', async () => {
      // Arrange
      const treeMetadata = { ...mockTree, nodes: undefined };
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(treeMetadata))
        .mockResolvedValueOnce(JSON.stringify(mockNode));
      mockReaddir.mockResolvedValue(['node-1.json', 'readme.txt', '.DS_Store'] as any);

      // Act
      const result = await storageService.loadTree('tree-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.nodes.size).toBe(1);
      expect(mockReadFile).toHaveBeenCalledTimes(2); // metadata + 1 node file
    });
  });

  describe('deleteTree', () => {

    it('should delete tree successfully', async () => {
      // Arrange
      mockAccess.mockResolvedValue(undefined as any);
      mockRm.mockResolvedValue(undefined as any);

      // Setup load tree for backup
      const treeMetadata = { ...mockTree, nodes: undefined };
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(treeMetadata))
        .mockResolvedValueOnce(JSON.stringify(mockNode));
      mockReaddir.mockResolvedValue(['node-1.json'] as any);
      mockCp.mockResolvedValue(undefined as any);

      // Act
      const result = await storageService.deleteTree('tree-1');

      // Assert
      expect(result.success).toBe(true);
      expect(mockRm).toHaveBeenCalledWith('/test/storage/tree-1', { recursive: true, force: true });
    });

    it('should handle non-existent tree deletion', async () => {
      // Arrange
      const error = new Error('File not found');
      mockAccess.mockRejectedValue(error);

      // Act
      const result = await storageService.deleteTree('non-existent');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Tree not found: non-existent');
    });

    it('should create final backup before deletion when enabled', async () => {
      // Arrange
      mockAccess.mockResolvedValue(undefined as any);
      mockRm.mockResolvedValue(undefined as any);

      // Setup load tree for backup
      const treeMetadata = { ...mockTree, nodes: undefined };
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(treeMetadata))
        .mockResolvedValueOnce(JSON.stringify(mockNode));
      mockReaddir.mockResolvedValue(['node-1.json'] as any);
      mockCp.mockResolvedValue(undefined as any);

      // Act
      await storageService.deleteTree('tree-1');

      // Assert
      expect(mockCp).toHaveBeenCalledWith(
        '/test/storage/tree-1',
        expect.stringMatching(/\/test\/storage\/backups\/tree-1_.*_final$/),
        { recursive: true }
      );
    });
  });

  describe('listTrees', () => {

    it('should list trees successfully', async () => {
      // Arrange
      const tree1Metadata = { ...mockTree, id: 'tree-1', name: 'Tree 1' };
      const tree2Metadata = { ...mockTree, id: 'tree-2', name: 'Tree 2', lastModified: Date.now() + 1000 };
      
      mockReaddir.mockResolvedValue(['tree-1', 'tree-2'] as any);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(tree1Metadata))
        .mockResolvedValueOnce(JSON.stringify(tree2Metadata));

      // Act
      const result = await storageService.listTrees();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].name).toBe('Tree 2'); // Should be sorted by lastModified desc
      expect(result.data?.[1].name).toBe('Tree 1');
    });

    it('should handle empty storage directory', async () => {
      // Arrange
      mockReaddir.mockResolvedValue([] as any);

      // Act
      const result = await storageService.listTrees();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should skip corrupted tree metadata', async () => {
      // Arrange
      mockReaddir.mockResolvedValue(['tree-1', 'tree-2'] as any);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(mockTree))
        .mockRejectedValueOnce(new Error('Corrupted file'));

      // Act
      const result = await storageService.listTrees();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1); // Only valid tree included
    });
  });

  describe('utility methods', () => {

    it('should check tree existence correctly', async () => {
      // Arrange
      mockAccess.mockResolvedValue(undefined as any);

      // Reset the service to get a clean initialized state
      vi.clearAllMocks();
      storageService = createTreeStorageService(testConfig);
      mockMkdir.mockResolvedValue(undefined as any);
      // Manually set the initialized flag to true
      (storageService as any).initialized = true;

      // Act
      const exists = await storageService.treeExists('tree-1');

      // Assert
      expect(exists).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('/test/storage/tree-1');
    });

    it('should return false for non-existent tree', async () => {
      // Arrange
      mockAccess.mockRejectedValue(new Error('Not found'));

      // Act
      const exists = await storageService.treeExists('non-existent');

      // Assert
      expect(exists).toBe(false);
    });

    it('should get storage statistics', async () => {
      // Arrange
      // Reset the service to get a clean initialized state
      vi.clearAllMocks();
      storageService = createTreeStorageService(testConfig);
      mockMkdir.mockResolvedValue(undefined as any);
      // Manually set the initialized flag to true
      (storageService as any).initialized = true;
      
      const tree1 = { ...mockTree, id: 'tree-1', createdAt: 1000 };
      const tree2 = { ...mockTree, id: 'tree-2', createdAt: 2000 };
      
      mockReaddir
        .mockResolvedValueOnce(['tree-1', 'tree-2'] as any) // for listTrees
        .mockResolvedValueOnce(['metadata.json'] as any) // for tree-1 size
        .mockResolvedValueOnce(['metadata.json'] as any); // for tree-2 size
      
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(tree1) as any)
        .mockResolvedValueOnce(JSON.stringify(tree2) as any);
      
      mockStat
        .mockResolvedValueOnce({ size: 1024 } as any)
        .mockResolvedValueOnce({ size: 2048 } as any);

      // Act
      const result = await storageService.getStorageStats();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalTrees: 2,
        totalSize: 3072,
        oldestTree: 1000,
        newestTree: 2000
      });
    });
  });

  describe('error handling', () => {
    it('should require initialization before operations', async () => {
      // Arrange
      const uninitializedService = createTreeStorageService(testConfig);

      // Act & Assert
      await expect(uninitializedService.saveTree(mockTree)).rejects.toThrow('not initialized');
      await expect(uninitializedService.loadTree('tree-1')).rejects.toThrow('not initialized');
      await expect(uninitializedService.deleteTree('tree-1')).rejects.toThrow('not initialized');
      await expect(uninitializedService.listTrees()).rejects.toThrow('not initialized');
    });

    it('should handle filesystem permission errors', async () => {
      // Arrange
      // Reset the service to get a clean initialized state
      vi.clearAllMocks();
      storageService = createTreeStorageService(testConfig);
      mockMkdir.mockResolvedValue(undefined as any);
      // Manually set the initialized flag to true
      (storageService as any).initialized = true;
      
      const permissionError = new Error('Permission denied');
      mockWriteFile.mockRejectedValue(permissionError);

      // Act
      const result = await storageService.saveTree(mockTree);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save tree');
    });
  });

  describe('backup management', () => {

    it('should clean old backups when limit exceeded', async () => {
      // Arrange
      // Reset the service to get a clean initialized state
      vi.clearAllMocks();
      storageService = createTreeStorageService(testConfig);
      mockMkdir.mockResolvedValue(undefined as any);
      // Manually set the initialized flag to true
      (storageService as any).initialized = true;
      
      const oldBackups = ['tree-1_2023-01-01', 'tree-1_2023-01-02', 'tree-1_2023-01-03', 'tree-1_2023-01-04'];
      mockReaddir.mockResolvedValue(oldBackups as any);
      mockStat.mockImplementation((filePath: any) => {
        const fileName = path.basename(filePath);
        const index = oldBackups.indexOf(fileName);
        return Promise.resolve({ ctime: new Date(2023, 0, index + 1) } as any);
      });
      mockRm.mockResolvedValue(undefined as any);
      mockWriteFile.mockResolvedValue(undefined as any);
      mockCp.mockResolvedValue(undefined as any);

      // Act
      await storageService.saveTree(mockTree);

      // Assert
      expect(mockRm).toHaveBeenCalledWith('/test/storage/backups/tree-1_2023-01-01', { recursive: true, force: true });
    });
  });
});

describe('createTreeStorageService factory', () => {
  it('should create service with provided config', () => {
    // Arrange
    const config = {
      storageDirectory: '/custom/path',
      enableBackups: false,
      compressionEnabled: false
    };

    // Act
    const service = createTreeStorageService(config);

    // Assert
    expect(service).toBeInstanceOf(ConversationTreeStorageService);
  });

  it('should create service with minimal config', () => {
    // Arrange
    const config = {
      storageDirectory: '/minimal/path'
    };

    // Act
    const service = createTreeStorageService(config);

    // Assert
    expect(service).toBeInstanceOf(ConversationTreeStorageService);
  });
});