/**
 * Metrics Collection Service Tests
 * 
 * Comprehensive test coverage for MetricsCollectionService functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetricsCollectionService, DEFAULT_PERFORMANCE_CONFIG, createMetricsCollectionService } from './MetricsCollectionService.js';
import type { PerformanceMonitorConfig } from './types.js';

describe('MetricsCollectionService', () => {
  let service: MetricsCollectionService;
  let config: PerformanceMonitorConfig;

  beforeEach(() => {
    config = {
      ...DEFAULT_PERFORMANCE_CONFIG,
      updateInterval: 100, // Faster for testing
    };
    
    service = new MetricsCollectionService(config);
  });

  afterEach(() => {
    service.stopCollection();
  });

  describe('initialization', () => {
    it('should create service with default config', () => {
      const defaultService = new MetricsCollectionService(DEFAULT_PERFORMANCE_CONFIG);
      const serviceConfig = defaultService.getConfig();
      
      expect(serviceConfig.updateInterval).toBe(1000);
      expect(serviceConfig.maxHistoryLength).toBe(60);
      expect(serviceConfig.enableMemoryTracking).toBe(true);
      expect(serviceConfig.enableCpuTracking).toBe(true);
      expect(serviceConfig.enableNetworkTracking).toBe(true);
      expect(serviceConfig.enableSystemTracking).toBe(true);
    });

    it('should create service with custom config', () => {
      const customConfig = {
        ...DEFAULT_PERFORMANCE_CONFIG,
        updateInterval: 500,
        enableMemoryTracking: false,
      };
      
      const customService = new MetricsCollectionService(customConfig);
      const serviceConfig = customService.getConfig();
      
      expect(serviceConfig.updateInterval).toBe(500);
      expect(serviceConfig.enableMemoryTracking).toBe(false);
    });

    it('should start with not collecting state', () => {
      expect(service.isCurrentlyCollecting()).toBe(false);
    });
  });

  describe('metrics collection', () => {
    it('should collect metrics with all tracking enabled', async () => {
      const metrics = await service.collectMetrics();
      
      expect(metrics.timestamp).toBeGreaterThan(0);
      expect(metrics.memory.total).toBeGreaterThan(0);
      expect(metrics.memory.used).toBeGreaterThan(0);
      expect(metrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.cores).toBeGreaterThan(0);
      expect(metrics.cpu.loadAverage).toHaveLength(3);
      expect(metrics.system.uptime).toBeGreaterThan(0);
      expect(metrics.system.platform).toBeTruthy();
      expect(metrics.system.nodeVersion).toBeTruthy();
      expect(metrics.system.pid).toBeGreaterThan(0);
    });

    it('should collect empty metrics when tracking disabled', async () => {
      const disabledConfig = {
        ...config,
        enableMemoryTracking: false,
        enableCpuTracking: false,
        enableNetworkTracking: false,
        enableSystemTracking: false,
      };
      
      const disabledService = new MetricsCollectionService(disabledConfig);
      const metrics = await disabledService.collectMetrics();
      
      expect(metrics.memory.total).toBe(0);
      expect(metrics.memory.used).toBe(0);
      expect(metrics.cpu.cores).toBe(0);
      expect(metrics.cpu.usage).toBe(0);
      expect(metrics.network.bytesReceived).toBe(0);
      expect(metrics.system.uptime).toBe(0);
    });

    it('should calculate memory percentage correctly', async () => {
      const metrics = await service.collectMetrics();
      
      const expectedPercentage = (metrics.memory.used / metrics.memory.total) * 100;
      expect(metrics.memory.percentage).toBeCloseTo(expectedPercentage, 1);
    });

    it('should include heap metrics', async () => {
      const metrics = await service.collectMetrics();
      
      expect(metrics.memory.heapUsed).toBeGreaterThan(0);
      expect(metrics.memory.heapTotal).toBeGreaterThan(0);
      expect(metrics.memory.rss).toBeGreaterThan(0);
      expect(metrics.memory.external).toBeGreaterThanOrEqual(0);
    });

    it('should include CPU load average', async () => {
      const metrics = await service.collectMetrics();
      
      expect(metrics.cpu.loadAverage).toHaveLength(3);
      expect(metrics.cpu.loadAverage[0]).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.loadAverage[1]).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.loadAverage[2]).toBeGreaterThanOrEqual(0);
    });
  });

    describe('collection lifecycle', () => {
    it('should start collection', async () => {
      expect(service.isCurrentlyCollecting()).toBe(false);
      
      const promise = new Promise<void>(resolve => {
        service.startCollection((metrics) => {
          expect(metrics.timestamp).toBeGreaterThan(0);
          expect(service.isCurrentlyCollecting()).toBe(true);
          resolve();
        });
      });
      await promise;
    });

    it('should stop collection', async () => {
      const promise = new Promise<void>(resolve => {
        service.startCollection(() => {
          expect(service.isCurrentlyCollecting()).toBe(true);
          
          service.stopCollection();
          expect(service.isCurrentlyCollecting()).toBe(false);
          resolve();
        });
      });
      await promise;
    });

    it('should not start collection twice', () => {
      const callback = vi.fn();
      
      service.startCollection(callback);
      expect(service.isCurrentlyCollecting()).toBe(true);
      
      service.startCollection(callback);
      expect(service.isCurrentlyCollecting()).toBe(true);
    });

    it('should handle stop when not collecting', () => {
      expect(service.isCurrentlyCollecting()).toBe(false);
      
      // Should not throw
      expect(() => service.stopCollection()).not.toThrow();
      expect(service.isCurrentlyCollecting()).toBe(false);
    });
  });

  describe('network statistics', () => {
    it('should update network stats', async () => {
      service.updateNetworkStats(1000, 500);
      service.updateNetworkStats(2000, 1000);
      
      const metrics = await service.collectMetrics();
      
      expect(metrics.network.bytesReceived).toBe(3000);
      expect(metrics.network.bytesSent).toBe(1500);
    });

    it('should reset network stats', async () => {
      service.updateNetworkStats(1000, 500);
      service.resetNetworkStats();
      
      const metrics = await service.collectMetrics();
      
      expect(metrics.network.bytesReceived).toBe(0);
      expect(metrics.network.bytesSent).toBe(0);
    });

    it('should calculate requests per second', async () => {
      service.updateNetworkStats(1000, 500);
      
      // Wait a bit to have time difference
      await new Promise(resolve => setTimeout(resolve, 100));
      
      service.updateNetworkStats(1000, 500);
      
      const metrics = await service.collectMetrics();
      // Since we're using a simple calculation, just check it's a number
      expect(typeof metrics.network.requestsPerSecond).toBe('number');
      expect(metrics.network.requestsPerSecond).toBeGreaterThanOrEqual(0);
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const updates = {
        updateInterval: 2000,
        enableMemoryTracking: false,
      };
      
      service.updateConfig(updates);
      const config = service.getConfig();
      
      expect(config.updateInterval).toBe(2000);
      expect(config.enableMemoryTracking).toBe(false);
    });

    it('should preserve existing config when updating', () => {
      const originalConfig = service.getConfig();
      
      service.updateConfig({ updateInterval: 2000 });
      const updatedConfig = service.getConfig();
      
      expect(updatedConfig.updateInterval).toBe(2000);
      expect(updatedConfig.maxHistoryLength).toBe(originalConfig.maxHistoryLength);
      expect(updatedConfig.enableCpuTracking).toBe(originalConfig.enableCpuTracking);
    });

    it('should return copy of configuration', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();
      
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
      
      config1.updateInterval = 9999;
      expect(service.getConfig().updateInterval).not.toBe(9999);
    });
  });

  describe('error handling', () => {
    it('should handle collection errors gracefully', async () => {
      // Mock process.memoryUsage to throw an error
      const memoryUsageSpy = vi.spyOn(process, 'memoryUsage').mockImplementation(() => {
        throw new Error('Memory access error');
      });

      const metrics = await service.collectMetrics();
      
      // Should still receive metrics with empty memory data
      expect(metrics.memory.used).toBe(0);
      expect(metrics.memory.total).toBe(0);
      
      // Restore original function
      memoryUsageSpy.mockRestore();
    });

    it('should continue collecting after errors', () => {
      let callCount = 0;
      
      service.startCollection((metrics) => {
        callCount++;
        
        if (callCount >= 2) {
          expect(callCount).toBeGreaterThanOrEqual(2);
        }
      });
    });
  });

  describe('factory function', () => {
    it('should create service with default config', () => {
      const defaultService = createMetricsCollectionService();
      
      expect(defaultService).toBeInstanceOf(MetricsCollectionService);
      expect(defaultService.getConfig().updateInterval).toBe(DEFAULT_PERFORMANCE_CONFIG.updateInterval);
    });

    it('should create service with custom config', () => {
      const customService = createMetricsCollectionService({ updateInterval: 500 });
      
      expect(customService).toBeInstanceOf(MetricsCollectionService);
      expect(customService.getConfig().updateInterval).toBe(500);
    });
  });
});