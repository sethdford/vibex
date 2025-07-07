/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Advanced Configuration System Integration Tests
 * Tests hierarchical configuration, external store, and real-time updates
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { 
  createAdvancedConfigManager,
  ConfigScope,
  HierarchicalConfigManager,
  FileConfigStore,
  ConfigChangeEvent
} from '../../src/config/advanced-config.js';

describe('Advanced Configuration System Integration', () => {
  let configManager: HierarchicalConfigManager;
  let testConfigDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testConfigDir = join(process.cwd(), 'test-data', `config-${Date.now()}`);
    await fs.mkdir(testConfigDir, { recursive: true });

    // Create config manager
    configManager = createAdvancedConfigManager(testConfigDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Hierarchical Configuration', () => {
    test('should respect scope hierarchy (runtime > workspace > user > system)', async () => {
      const key = 'test-setting';

      // Set values at different scopes
      await configManager.set(key, 'system-value', ConfigScope.SYSTEM);
      await configManager.set(key, 'user-value', ConfigScope.USER);
      await configManager.set(key, 'workspace-value', ConfigScope.WORKSPACE);
      await configManager.set(key, 'runtime-value', ConfigScope.RUNTIME);

      // Should return runtime value (highest priority)
      const value = await configManager.get(key);
      expect(value).toBe('runtime-value');

      // Delete runtime, should fall back to workspace
      await configManager.delete(key, ConfigScope.RUNTIME);
      const value2 = await configManager.get(key);
      expect(value2).toBe('workspace-value');

      // Delete workspace, should fall back to user
      await configManager.delete(key, ConfigScope.WORKSPACE);
      const value3 = await configManager.get(key);
      expect(value3).toBe('user-value');

      // Delete user, should fall back to system
      await configManager.delete(key, ConfigScope.USER);
      const value4 = await configManager.get(key);
      expect(value4).toBe('system-value');

      // Delete system, should return undefined or default
      await configManager.delete(key, ConfigScope.SYSTEM);
      const value5 = await configManager.get(key, 'default-value');
      expect(value5).toBe('default-value');
    });

    test('should handle complex configuration objects', async () => {
      const complexConfig = {
        ai: {
          model: 'claude-sonnet-4',
          temperature: 0.7,
          maxTokens: 4000
        },
        ui: {
          theme: 'dark',
          fontSize: 14,
          animations: true
        },
        features: ['memory', 'tools', 'search']
      };

      await configManager.set('app-config', complexConfig, ConfigScope.USER);

      const retrieved = await configManager.get<typeof complexConfig>('app-config');
      expect(retrieved).toEqual(complexConfig);
      expect(retrieved?.ai.model).toBe('claude-sonnet-4');
      expect(retrieved?.features).toContain('memory');
    });
  });

  describe('External Configuration Store', () => {
    test('should persist configurations to file system', async () => {
      await configManager.set('persistent-setting', 'test-value', ConfigScope.USER);

      // Create new manager with same directory
      const newManager = createAdvancedConfigManager(testConfigDir);
      const value = await newManager.get('persistent-setting');

      expect(value).toBe('test-value');
    });

    test('should handle concurrent access safely', async () => {
      const promises = [];
      
      // Simulate concurrent writes
      for (let i = 0; i < 10; i++) {
        promises.push(
          configManager.set(`concurrent-${i}`, `value-${i}`, ConfigScope.USER)
        );
      }

      await Promise.all(promises);

      // Verify all values were written correctly
      for (let i = 0; i < 10; i++) {
        const value = await configManager.get(`concurrent-${i}`);
        expect(value).toBe(`value-${i}`);
      }
    });

    test('should list all configurations in a scope', async () => {
      await configManager.set('setting1', 'value1', ConfigScope.USER);
      await configManager.set('setting2', 'value2', ConfigScope.USER);
      await configManager.set('setting3', 'value3', ConfigScope.WORKSPACE);

      const userConfigs = await configManager.getScope(ConfigScope.USER);
      const workspaceConfigs = await configManager.getScope(ConfigScope.WORKSPACE);

      expect(userConfigs).toEqual({
        setting1: 'value1',
        setting2: 'value2'
      });

      expect(workspaceConfigs).toEqual({
        setting3: 'value3'
      });
    });
  });

  describe('Real-time Updates and Watching', () => {
    test('should notify watchers of configuration changes', async () => {
      const changes: Array<{ key: string; value: unknown }> = [];
      
      const unwatch = configManager.watch('watched-setting', (value) => {
        changes.push({ key: 'watched-setting', value });
      });

      // Make changes
      await configManager.set('watched-setting', 'initial', ConfigScope.USER);
      await configManager.set('watched-setting', 'updated', ConfigScope.USER);
      await configManager.delete('watched-setting', ConfigScope.USER);

      // Allow some time for async notifications
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(changes).toHaveLength(3);
      expect(changes[0].value).toBe('initial');
      expect(changes[1].value).toBe('updated');
      expect(changes[2].value).toBeUndefined();

      unwatch();
    });

    test('should handle multiple watchers for same key', async () => {
      const watcher1Changes: unknown[] = [];
      const watcher2Changes: unknown[] = [];

      const unwatch1 = configManager.watch('multi-watched', (value) => {
        watcher1Changes.push(value);
      });

      const unwatch2 = configManager.watch('multi-watched', (value) => {
        watcher2Changes.push(value);
      });

      await configManager.set('multi-watched', 'test-value', ConfigScope.USER);
      
      // Allow time for notifications
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(watcher1Changes).toEqual(['test-value']);
      expect(watcher2Changes).toEqual(['test-value']);

      unwatch1();
      unwatch2();
    });

    test('should properly unwatch when requested', async () => {
      const changes: unknown[] = [];
      
      const unwatch = configManager.watch('unwatch-test', (value) => {
        changes.push(value);
      });

      await configManager.set('unwatch-test', 'before-unwatch', ConfigScope.USER);
      unwatch(); // Stop watching
      await configManager.set('unwatch-test', 'after-unwatch', ConfigScope.USER);

      // Allow time for potential notifications
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(changes).toHaveLength(1);
      expect(changes[0]).toBe('before-unwatch');
    });
  });

  describe('Backup and Restore', () => {
    test('should create and restore backups', async () => {
      // Set up initial configuration
      await configManager.set('backup-test-1', 'original-1', ConfigScope.USER);
      await configManager.set('backup-test-2', 'original-2', ConfigScope.USER);

      // Create backup
      const backupId = await configManager.backup(ConfigScope.USER);
      expect(backupId).toMatch(/^backup_\d+_[a-z0-9]+$/);

      // Modify configuration
      await configManager.set('backup-test-1', 'modified-1', ConfigScope.USER);
      await configManager.set('backup-test-3', 'new-setting', ConfigScope.USER);

      // Verify modifications
      expect(await configManager.get('backup-test-1')).toBe('modified-1');
      expect(await configManager.get('backup-test-3')).toBe('new-setting');

      // Restore backup
      await configManager.restore(ConfigScope.USER, backupId);

      // Verify restoration
      expect(await configManager.get('backup-test-1')).toBe('original-1');
      expect(await configManager.get('backup-test-2')).toBe('original-2');
      expect(await configManager.get('backup-test-3')).toBeUndefined();
    });

    test('should handle backup restoration errors gracefully', async () => {
      const invalidBackupId = 'invalid-backup-id';

      await expect(
        configManager.restore(ConfigScope.USER, invalidBackupId)
      ).rejects.toThrow(/Failed to restore backup/);
    });
  });

  describe('Caching and Performance', () => {
    test('should cache frequently accessed values', async () => {
      await configManager.set('cached-setting', 'cached-value', ConfigScope.USER);

      // First access should hit storage
      const value1 = await configManager.get('cached-setting');
      expect(value1).toBe('cached-value');

      // Subsequent access should hit cache (we can't easily test this directly,
      // but we can verify the value is still correct)
      const value2 = await configManager.get('cached-setting');
      expect(value2).toBe('cached-value');
    });

    test('should invalidate cache on updates', async () => {
      await configManager.set('cache-invalidation', 'initial', ConfigScope.USER);
      
      // Access to populate cache
      await configManager.get('cache-invalidation');

      // Update value
      await configManager.set('cache-invalidation', 'updated', ConfigScope.USER);

      // Should return updated value (cache should be invalidated)
      const value = await configManager.get('cache-invalidation');
      expect(value).toBe('updated');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing configuration files gracefully', async () => {
      const value = await configManager.get('non-existent-setting');
      expect(value).toBeUndefined();

      const valueWithDefault = await configManager.get('non-existent-setting', 'default');
      expect(valueWithDefault).toBe('default');
    });

    test('should handle file system errors gracefully', async () => {
      // Try to use an invalid directory path
      const invalidManager = createAdvancedConfigManager('/invalid/path/that/cannot/be/created');
      
      // Should not throw, but return undefined
      const value = await invalidManager.get('test-setting');
      expect(value).toBeUndefined();
    });
  });

  describe('Configuration Scope Management', () => {
    test('should clear entire scopes correctly', async () => {
      // Set up multiple settings in different scopes
      await configManager.set('scope-test-1', 'user-1', ConfigScope.USER);
      await configManager.set('scope-test-2', 'user-2', ConfigScope.USER);
      await configManager.set('scope-test-3', 'workspace-3', ConfigScope.WORKSPACE);

      // Verify settings exist
      expect(await configManager.get('scope-test-1')).toBe('user-1');
      expect(await configManager.get('scope-test-3')).toBe('workspace-3');

      // Clear user scope
      await configManager.clear(ConfigScope.USER);

      // User settings should be gone, workspace should remain
      expect(await configManager.get('scope-test-1')).toBeUndefined();
      expect(await configManager.get('scope-test-2')).toBeUndefined();
      expect(await configManager.get('scope-test-3')).toBe('workspace-3');
    });
  });
}); 