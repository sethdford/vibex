/**
 * Claude Context Hook - Clean Architecture like Gemini CLI
 * 
 * Focused hook for managing Claude context and memory
 */

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { logger } from '../../../utils/logger.js';
import { ConversationContextIntegration } from '../../../context/conversation-context-integration.js';
import { createContextSystem } from '../../../context/index.js';
import { ConversationHistoryManager } from '../../../utils/conversation-history.js';
import { createHierarchicalMemoryManager, type MemoryManager, MemoryType } from '../../../memory/index.js';
import path from 'path';
import type { AppConfigType } from '../../../config/schema.js';

/**
 * Hook for managing Claude context and memory
 */
export function useClaudeContext(
  config: AppConfigType,
  useConversationHistory: boolean = true,
  enableDebugLogging: boolean = false
) {
  // Memory manager for hierarchical context
  const memoryManager = useRef<MemoryManager | null>(null);
  
  // Context integration
  const contextIntegrationRef = useRef<ConversationContextIntegration | null>(null);
  
  // Context cache to avoid reloading
  const contextCache = useRef<{
    contextResult: any;
    loadedAt: number;
  } | null>(null);

  // Stable config for context integration
  const stableConfig = useMemo(() => ({
    fullContext: config.fullContext || false
  }), [config.fullContext]);

  // Initialize memory manager
  useEffect(() => {
    if (!memoryManager.current) {
      memoryManager.current = createHierarchicalMemoryManager({
        embedding: {
          provider: 'mock',
          dimension: 128
        },
        compression: {
          enable_auto_compression: true,
          compression_threshold: 0.8,
          summary_max_length: 500
        }
      }, `vibex_${Date.now()}`);
      
      if (enableDebugLogging) {
        logger.debug('Hierarchical memory manager initialized');
      }
    }
  }, [enableDebugLogging]);

  // Initialize context integration
  useEffect(() => {
    if (!useConversationHistory || contextIntegrationRef.current) return;
    
    let isMounted = true;
    
    const initializeContextIntegration = async () => {
      try {
        if (enableDebugLogging) {
          logger.debug('Initializing conversation context integration...');
        }
        
        // Create context system
        const contextSystem = createContextSystem({
          rootDirectory: process.cwd(),
          contextFilenames: ['VIBEX.md', '.cursor-context', 'context.md'],
          maxDepth: 10,
          enableGlobalContext: true,
          enableProjectContext: true,
          enableDirectoryContext: true,
          enableSubdirectoryDiscovery: true,
          enableRealTimeUpdates: true,
          autoStartWatching: false,
          enableVariableInterpolation: true,
          fullContext: stableConfig.fullContext
        });
        
        // Create conversation history manager
        const conversationHistoryManager = new ConversationHistoryManager({
          maxSessions: 100,
          maxAgeInDays: 30,
          storageDir: path.join(process.cwd(), '.vibex', 'conversations'),
          enableCompression: true
        });
        
        // Initialize conversation history manager
        await conversationHistoryManager.initialize();
        
        // Create context integration
        const integration = new ConversationContextIntegration(
          contextSystem,
          conversationHistoryManager,
          {
            autoCapture: true,
            autoRestore: true,
            maxSnapshotSize: 5 * 1024 * 1024,
            trackChanges: true,
            compressionLevel: 6,
            includeEnvironment: true,
            maxSnapshots: 50,
            changeDebounceMs: 1000
          }
        );
        
        // Initialize the context integration
        await integration.initialize();
        
        if (isMounted) {
          contextIntegrationRef.current = integration;
        }
        
        if (enableDebugLogging) {
          logger.debug('Conversation context integration initialized successfully');
        }
        
      } catch (error) {
        logger.warn('Failed to initialize conversation context integration', { error });
        if (isMounted) {
          contextIntegrationRef.current = null;
        }
        
        if (enableDebugLogging) {
          logger.debug('Context integration disabled due to initialization error');
        }
      }
    };
    
    initializeContextIntegration();
    
    return () => {
      isMounted = false;
    };
  }, [useConversationHistory, stableConfig.fullContext, enableDebugLogging]);

  // Store query in memory
  const storeQueryInMemory = useCallback(async (query: string) => {
    if (memoryManager.current) {
      try {
        await memoryManager.current.store(query, MemoryType.CONVERSATION, {
          source: 'user',
          session_id: `vibex_${Date.now()}`,
          tags: ['query']
        });
      } catch (error) {
        logger.warn('Failed to store query in memory:', error);
      }
    }
  }, []);

  // Create context snapshot
  const createContextSnapshot = useCallback(async () => {
    if (contextIntegrationRef.current) {
      try {
        await contextIntegrationRef.current.createContextSnapshot();
        
        if (enableDebugLogging) {
          logger.debug('Context snapshot captured');
        }
      } catch (error) {
        logger.warn('Failed to capture context snapshot:', error);
      }
    }
  }, [enableDebugLogging]);

  // Build system prompt with context
  const buildSystemPrompt = useCallback(() => {
    let systemPrompt = 'You are Claude, a helpful AI assistant.';
    
    // Add context if available (cached approach)
    if (contextCache.current) {
      systemPrompt += contextCache.current.contextResult;
    }
    
    return systemPrompt;
  }, []);

  return {
    contextIntegration: contextIntegrationRef.current,
    memoryManager: memoryManager.current,
    storeQueryInMemory,
    createContextSnapshot,
    buildSystemPrompt,
  };
} 