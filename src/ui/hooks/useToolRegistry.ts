/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { useState, useEffect, useCallback } from 'react';
import { Tool, ToolCallRequest } from '../../core/domain/tool/tool-interfaces';
import { ToolOrchestrationService } from '../../core/domain/tool/tool-services';
import { createToolRegistry } from '../../core/domain/tool/registry/tool-registry';
import { ToolGroup } from '../components/tool-group-display/types';

// Optional orchestration service for hook
let globalOrchestrationService: ToolOrchestrationService | null = null;

/**
 * Set a global tool orchestration service for use with the hook
 */
export const setGlobalToolOrchestrationService = (service: ToolOrchestrationService) => {
  globalOrchestrationService = service;
};

/**
 * Hook for integrating with the tool registry
 */
export const useToolRegistry = (options: {
  orchestrationService?: ToolOrchestrationService;
  autoRefresh?: boolean;
  refreshInterval?: number;
} = {}) => {
  // Use provided orchestration service or global one
  const orchestrationService = options.orchestrationService || globalOrchestrationService;
  const autoRefresh = options.autoRefresh ?? false;
  const refreshInterval = options.refreshInterval ?? 30000; // 30 seconds
  
  // State for tools, loading status, and errors
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Load tools from registry
  const loadTools = useCallback(async () => {
    if (!orchestrationService) {
      setIsLoading(false);
      setError(new Error('No tool orchestration service available'));
      return;
    }
    
    try {
      setIsLoading(true);
      const allTools = orchestrationService.getAllTools();
      setTools(allTools);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [orchestrationService]);
  
  // Execute a tool
  const executeTool = useCallback(async (request: ToolCallRequest) => {
    if (!orchestrationService) {
      throw new Error('No tool orchestration service available');
    }
    
    // Create abort controller for cancellation
    const abortController = new AbortController();
    
    try {
      await orchestrationService.executeTools(request, abortController.signal);
      return true;
    } catch (e) {
      console.error('Tool execution error:', e);
      return false;
    }
  }, [orchestrationService]);
  
  // Group tools by namespace
  const getToolGroups = useCallback((): ToolGroup[] => {
    const toolsByNamespace = new Map<string, Tool[]>();
    
    tools.forEach(tool => {
      const metadata = tool.getMetadata();
      const namespace = metadata.namespace || 'default';
      
      if (!toolsByNamespace.has(namespace)) {
        toolsByNamespace.set(namespace, []);
      }
      
      toolsByNamespace.get(namespace)!.push(tool);
    });
    
    return Array.from(toolsByNamespace.entries()).map(([namespace, tools]) => ({
      name: namespace,
      description: `Tools in the ${namespace} namespace`,
      tools,
      isExpanded: false
    }));
  }, [tools]);
  
  // Group tools by tags
  const getToolGroupsByTag = useCallback((): ToolGroup[] => {
    const toolsByTag = new Map<string, Tool[]>();
    
    // Collect all unique tags first
    const allTags = new Set<string>();
    tools.forEach(tool => {
      const metadata = tool.getMetadata();
      const tags = metadata.tags || [];
      tags.forEach(tag => allTags.add(tag));
    });
    
    // Initialize groups for each tag
    allTags.forEach(tag => {
      toolsByTag.set(tag, []);
    });
    
    // Add tools to their respective tag groups
    // (tools can appear in multiple groups)
    tools.forEach(tool => {
      const metadata = tool.getMetadata();
      const tags = metadata.tags || [];
      
      if (tags.length === 0) {
        // Add to "untagged" group
        if (!toolsByTag.has('untagged')) {
          toolsByTag.set('untagged', []);
        }
        toolsByTag.get('untagged')!.push(tool);
      } else {
        tags.forEach(tag => {
          toolsByTag.get(tag)!.push(tool);
        });
      }
    });
    
    return Array.from(toolsByTag.entries()).map(([tag, tools]) => ({
      name: tag,
      description: `Tools tagged with "${tag}"`,
      tools,
      isExpanded: false
    }));
  }, [tools]);
  
  // Get a tool by name and namespace
  const getTool = useCallback((name: string, namespace?: string): Tool | undefined => {
    if (!orchestrationService) return undefined;
    return orchestrationService.getTool(name, namespace);
  }, [orchestrationService]);

  // Initial load and refresh
  useEffect(() => {
    loadTools();
    
    // Set up auto-refresh if enabled
    let refreshTimer: NodeJS.Timeout | null = null;
    if (autoRefresh && refreshInterval > 0) {
      refreshTimer = setInterval(loadTools, refreshInterval);
    }
    
    // Cleanup
    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [autoRefresh, loadTools, refreshInterval]);

  return {
    tools,
    isLoading,
    error,
    loadTools,
    executeTool,
    getToolGroups,
    getToolGroupsByTag,
    getTool
  };
};

export default useToolRegistry;