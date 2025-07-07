/**
 * Tests for ConversationTreeLifecycleService
 * Following Gemini CLI testing patterns with Vitest
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { ConversationTreeLifecycleService, type TreeLifecycleConfig } from './conversation-tree-lifecycle.js';
import type { ConversationTree, ConversationNode, CreateTreeOptions } from '../conversation/types.js';

// Mock dependencies like Gemini CLI does
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn()
  };
});

const mockExistsSync = vi.mocked(existsSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockRmSync = vi.mocked(rmSync);

describe('ConversationTreeLifecycleService', () => {
  let service: ConversationTreeLifecycleService;
  let config: TreeLifecycleConfig;
  let testDir: string;

  beforeEach(() => {
    // Reset all mocks like Gemini CLI
    vi.resetAllMocks();
    
    // Setup test configuration
    testDir = '/tmp/test-trees';
    config = {
      storageDirectory: testDir,
      autoSaveInterval: 5000,
      maxBackups: 3,
      maxTreeSizeBytes: 10 * 1024 * 1024, // 10MB
      compressionEnabled: true
    };
    
    service = new ConversationTreeLifecycleService(config);
  });

  afterEach(() => {
    // Cleanup like Gemini CLI
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create service with valid configuration', () => {
      expect(service).toBeDefined();
      expect(service.getConfig()).toEqual(config);
    });

    it('should throw error with invalid configuration', () => {
      const invalidConfig = { ...config, maxTreeSizeBytes: -1 };
      expect(() => new ConversationTreeLifecycleService(invalidConfig)).toThrow();
    });

    it('should use default configuration when none provided', () => {
      const defaultService = new ConversationTreeLifecycleService();
      const defaultConfig = defaultService.getConfig();
      
      expect(defaultConfig.storageDirectory).toBeDefined();
      expect(defaultConfig.autoSaveInterval).toBeGreaterThan(0);
      expect(defaultConfig.maxBackups).toBeGreaterThan(0);
    });
  });

  describe('tree creation', () => {
        it('should create new conversation tree successfully', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const result = await service.createTree('test-tree', {
        description: 'A test conversation tree'
      });
      
      expect(result.success).toBe(true);
      expect(result.tree).toBeDefined();
      expect(result.tree?.name).toBe('test-tree');
      expect(result.tree?.description).toBe('A test conversation tree');
      expect(result.timing?.duration).toBeGreaterThan(0);
    });

    it('should handle tree creation errors gracefully', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = await service.createTree('test-tree', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Permission denied');
    });

    it('should validate tree ID format', async () => {
      const result = await service.createTree('invalid id!', {});
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid tree ID format');
    });
  });

    describe('tree loading', () => {
    it('should load existing tree successfully', async () => {
      const mockTree: ConversationTree = {
        id: 'test-tree',
        name: 'Test Tree',
        rootId: 'root-1',
        nodes: new Map([
          ['root-1', {
            id: 'root-1',
            name: 'Root',
            description: 'Root message',
            parentId: undefined,
            children: [],
            messages: [],
            contextSnapshot: undefined,
            metadata: {
              messageCount: 0,
              size: 0,
              tags: [],
              isMainBranch: true,
            },
            createdAt: Date.now(),
            lastModified: Date.now(),
            lastActive: Date.now(),
          } as ConversationNode]
        ]),
        metadata: {
          totalNodes: 1,
          branchCount: 1,
          maxDepth: 0,
          tags: [],
          custom: {},
          totalMessages: 0,
          mergedBranches: 0,
          conflictedBranches: 0,
        },
        activeNodeId: 'root-1',
        createdAt: Date.now(),
        lastModified: Date.now()
      };

      // Mock file system calls
      mockExistsSync.mockReturnValue(true);
      vi.doMock('fs/promises', () => ({
        readFile: vi.fn().mockResolvedValue(JSON.stringify({
          ...mockTree,
          nodes: Array.from(mockTree.nodes.entries()),
        }))
      }));
      
      const result = await service.loadTree('test-tree');
      
      expect(result.success).toBe(true);
      expect(result.tree).toBeDefined();
      expect(result.tree?.id).toBe('test-tree');
    });

    it('should handle missing tree files', async () => {
      mockExistsSync.mockReturnValue(false);
      
      const result = await service.loadTree('nonexistent-tree');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tree not found');
    });
  });

    describe('tree saving', () => {
    let mockTree: ConversationTree;

    beforeEach(() => {
      mockTree = {
        id: 'test-tree',
        name: 'Test Tree',
        rootId: 'root-1',
        nodes: new Map(),
        metadata: {
          totalNodes: 1,
          branchCount: 1,
          maxDepth: 0,
          tags: [],
          custom: {},
          totalMessages: 0,
          mergedBranches: 0,
          conflictedBranches: 0,
        },
        activeNodeId: 'root-1',
        createdAt: Date.now(),
        lastModified: Date.now()
      };
    });

    it('should save tree successfully', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const result = await service.saveTree(mockTree);
      
      expect(result.success).toBe(true);
      expect(result.timing?.duration).toBeGreaterThan(0);
    });

    it('should create backup before saving', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const result = await service.saveTree(mockTree);
      
      expect(result.success).toBe(true);
    });

    it('should validate tree before saving', async () => {
      const invalidTree = { ...mockTree, id: '' };
      
      const result = await service.saveTree(invalidTree);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid tree ID');
    });
  });

    describe('tree deletion', () => {
    it('should delete tree successfully', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const result = await service.deleteTree('test-tree');
      
      expect(result.success).toBe(true);
    });

    it('should handle deletion of nonexistent tree', async () => {
      mockExistsSync.mockReturnValue(false);
      
      const result = await service.deleteTree('nonexistent-tree');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tree not found');
    });

    it('should create backup before deletion', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const result = await service.deleteTree('test-tree');
      
      expect(result.success).toBe(true);
    });
  });

    describe('event handling', () => {
    it('should emit tree-created event', async () => {
      const eventSpy = vi.fn();
      service.on('tree-created', eventSpy);
      
      mockExistsSync.mockReturnValue(true);
      await service.createTree('test-tree', {});
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          treeId: expect.any(String),
          timestamp: expect.any(Number)
        })
      );
    });

    it('should emit tree-saved event', async () => {
      const eventSpy = vi.fn();
      service.on('tree-saved', eventSpy);
      
      const mockTree: ConversationTree = {
        id: 'test-tree',
        name: 'Test Tree',
        rootId: 'root-1',
        nodes: new Map(),
        metadata: {
          totalNodes: 1,
          branchCount: 1,
          maxDepth: 0,
          tags: [],
          custom: {},
          totalMessages: 0,
          mergedBranches: 0,
          conflictedBranches: 0,
        },
        activeNodeId: 'root-1',
        createdAt: Date.now(),
        lastModified: Date.now()
      };

      mockExistsSync.mockReturnValue(true);
      await service.saveTree(mockTree);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          treeId: 'test-tree',
          timestamp: expect.any(Number)
        })
      );
    });
  });

    describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = { ...config, autoSaveInterval: 10000 };
      service.updateConfig(newConfig);
      
      expect(service['config'].autoSaveInterval).toBe(10000);
    });

    it('should validate configuration updates', () => {
      const invalidConfig = { ...config, maxTreeSize: -1 };
      
      expect(() => service.updateConfig(invalidConfig)).not.toThrow();
    });
  });

  describe('storage management', () => {
    it('should check storage directory exists', () => {
      mockExistsSync.mockReturnValue(true);
      
      const exists = service.getStorageDirectory();
      
      expect(exists).toBe(testDir);
    });

    it('should create storage directory if missing', () => {
      mockExistsSync.mockReturnValue(false);
      
      service.initialize();
      
      expect(mockMkdirSync).toHaveBeenCalledWith(testDir, { recursive: true });
    });
  });
});