/**
 * Conversation Context Integration
 * 
 * Bridges the enhanced hierarchical context system with conversation state management
 * to provide context-aware conversations with automatic context preservation and restoration.
 * 
 * SUCCESS CRITERIA:
 * - Conversations automatically capture current context state
 * - Context is restored when resuming conversations
 * - Context changes are tracked and persisted
 * - Context synchronization happens seamlessly
 * - Performance impact is minimal (<50ms overhead)
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import type { ContextSystem, ContextEntry, ContextConfig } from './context-system-refactored.js';
import type { SavedConversation, ConversationMessage } from '../utils/conversation-state.js';
import type { ConversationHistoryManager } from '../utils/conversation-history.js';
import type { TurnSystem } from '../ai/turn-system.js';

// Import the actual class instance for the conversation state manager
import { conversationState } from '../utils/conversation-state.js';

/**
 * Context snapshot for conversation state
 */
export interface ConversationContextSnapshot {
  /**
   * Snapshot timestamp
   */
  timestamp: number;
  
  /**
   * Context entries at the time of snapshot
   */
  contextEntries: ContextEntry[];
  
  /**
   * Context configuration used
   */
  contextConfig: ContextConfig;
  
  /**
   * Working directory at snapshot time
   */
  workingDirectory: string;
  
  /**
   * Environment variables relevant to context
   */
  environmentContext: Record<string, string>;
  
  /**
   * Active context variables
   */
  contextVariables: Record<string, any>;
  
  /**
   * Context hierarchy metadata
   */
  hierarchyMetadata: {
    levels: string[];
    totalSize: number;
    fileCount: number;
    lastModified: number;
  };
}

/**
 * Enhanced conversation message with context information
 */
export interface ContextAwareConversationMessage extends ConversationMessage {
  /**
   * Context snapshot at the time of message
   */
  contextSnapshot?: ConversationContextSnapshot;
  
  /**
   * Context changes since last message
   */
  contextChanges?: {
    added: string[];
    modified: string[];
    removed: string[];
  };
}

/**
 * Context integration configuration
 */
export interface ConversationContextConfig {
  /**
   * Whether to automatically capture context snapshots
   */
  autoCapture: boolean;
  
  /**
   * Whether to restore context when resuming conversations
   */
  autoRestore: boolean;
  
  /**
   * Maximum context snapshot size (in bytes)
   */
  maxSnapshotSize: number;
  
  /**
   * Whether to track context changes between messages
   */
  trackChanges: boolean;
  
  /**
   * Context snapshot compression level (0-9)
   */
  compressionLevel: number;
  
  /**
   * Whether to include environment variables in snapshots
   */
  includeEnvironment: boolean;
  
  /**
   * Maximum number of context snapshots to keep per conversation
   */
  maxSnapshots: number;
  
  /**
   * Debounce time for context change detection (ms)
   */
  changeDebounceMs: number;
}

/**
 * Context integration events
 */
export enum ConversationContextEvent {
  SNAPSHOT_CREATED = 'snapshot_created',
  CONTEXT_RESTORED = 'context_restored',
  CONTEXT_CHANGED = 'context_changed',
  INTEGRATION_ERROR = 'integration_error',
  SYNC_STARTED = 'sync_started',
  SYNC_COMPLETED = 'sync_completed',
}

/**
 * Conversation Context Integration System
 */
export class ConversationContextIntegration extends EventEmitter {
  private contextSystem: ContextSystem;
  private conversationHistory: ConversationHistoryManager;
  private turnSystem?: TurnSystem;
  private config: ConversationContextConfig;
  private lastContextSnapshot?: ConversationContextSnapshot;
  private contextChangeTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(
    contextSystem: ContextSystem,
    conversationHistory: ConversationHistoryManager,
    config: Partial<ConversationContextConfig> = {}
  ) {
    super();
    
    this.contextSystem = contextSystem;
    this.conversationHistory = conversationHistory;
    
    // Set default configuration
    this.config = {
      autoCapture: true,
      autoRestore: true,
      maxSnapshotSize: 5 * 1024 * 1024, // 5MB
      trackChanges: true,
      compressionLevel: 6,
      includeEnvironment: true,
      maxSnapshots: 50,
      changeDebounceMs: 1000,
      ...config,
    };
  }

  /**
   * Initialize the conversation context integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize conversation state manager
      await conversationState.initialize();

      // Set up event listeners
      this.setupEventListeners();

      // Create initial context snapshot
      if (this.config.autoCapture) {
        this.lastContextSnapshot = await this.createContextSnapshot();
      }

      this.isInitialized = true;
      
      logger.info('Conversation context integration initialized', {
        autoCapture: this.config.autoCapture,
        autoRestore: this.config.autoRestore,
        trackChanges: this.config.trackChanges,
      });

      this.emit(ConversationContextEvent.SYNC_STARTED);
    } catch (error) {
      logger.error('Failed to initialize conversation context integration', { error });
      throw error;
    }
  }

  /**
   * Set turn system for deeper integration
   */
  setTurnSystem(turnSystem: TurnSystem): void {
    this.turnSystem = turnSystem;
    
    // Listen to turn system events for context synchronization
    if (this.turnSystem) {
      this.turnSystem.on('messageAdded', () => {
        if (this.config.autoCapture) {
          this.scheduleContextCapture();
        }
      });
      
      this.turnSystem.on('contextUpdated', () => {
        if (this.config.trackChanges) {
          this.scheduleContextChangeDetection();
        }
      });
    }
  }

  /**
   * Create a context snapshot for the current state
   */
  async createContextSnapshot(): Promise<ConversationContextSnapshot> {
    try {
      // Get current context using loadContext method
      const contextResult = await this.contextSystem.loadContext();
      const contextEntries = contextResult.entries;
      
      // Create a basic context config (we don't have access to internal config)
      const contextConfig: ContextConfig = {
        rootDirectory: process.cwd(),
        contextFilenames: ['VIBEX.md'],
        maxDepth: 10,
        enableGlobalContext: true,
        enableProjectContext: true,
        enableDirectoryContext: true,
      };
      
      // Get context variables from the result
      const contextVariables = contextResult.variables || {};

      // Create hierarchy metadata
      const hierarchyMetadata = {
        levels: contextEntries.map((entry: ContextEntry) => entry.path),
        totalSize: contextEntries.reduce((size: number, entry: ContextEntry) => size + entry.content.length, 0),
        fileCount: contextEntries.length,
        lastModified: Math.max(...contextEntries.map((entry: ContextEntry) => entry.lastModified || 0)),
      };

      // Get environment context
      const environmentContext: Record<string, string> = this.config.includeEnvironment ? {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PWD: process.cwd(),
        USER: process.env.USER || process.env.USERNAME || 'unknown',
      } : {};

      const snapshot: ConversationContextSnapshot = {
        timestamp: Date.now(),
        contextEntries,
        contextConfig,
        workingDirectory: process.cwd(),
        environmentContext,
        contextVariables,
        hierarchyMetadata,
      };

      // Check snapshot size
      const snapshotSize = JSON.stringify(snapshot).length;
      if (snapshotSize > this.config.maxSnapshotSize) {
        logger.warn('Context snapshot exceeds maximum size', {
          size: snapshotSize,
          maxSize: this.config.maxSnapshotSize,
        });
        
        // Truncate context entries if needed
        snapshot.contextEntries = this.truncateContextEntries(snapshot.contextEntries, this.config.maxSnapshotSize);
      }

      this.emit(ConversationContextEvent.SNAPSHOT_CREATED, { snapshot, size: snapshotSize });
      
      logger.debug('Created context snapshot', {
        entryCount: snapshot.contextEntries.length,
        size: snapshotSize,
        workingDirectory: snapshot.workingDirectory,
      });

      return snapshot;
    } catch (error) {
      logger.error('Failed to create context snapshot', { error });
      this.emit(ConversationContextEvent.INTEGRATION_ERROR, { error, operation: 'createSnapshot' });
      throw error;
    }
  }

  /**
   * Restore context from a snapshot
   */
  async restoreContextFromSnapshot(snapshot: ConversationContextSnapshot): Promise<void> {
    try {
      logger.info('Restoring context from snapshot', {
        timestamp: new Date(snapshot.timestamp).toISOString(),
        entryCount: snapshot.contextEntries.length,
        workingDirectory: snapshot.workingDirectory,
      });

      // Change working directory if different
      if (snapshot.workingDirectory !== process.cwd()) {
        try {
          process.chdir(snapshot.workingDirectory);
          logger.debug('Changed working directory', { 
            from: process.cwd(), 
            to: snapshot.workingDirectory 
          });
        } catch (error) {
          logger.warn('Failed to change working directory', { 
            target: snapshot.workingDirectory, 
            error 
          });
        }
      }

      // Force reload context to pick up restored state
      await this.contextSystem.forceUpdate();

      this.lastContextSnapshot = snapshot;
      
      this.emit(ConversationContextEvent.CONTEXT_RESTORED, { snapshot });
      
      logger.info('Context restored successfully from snapshot');
    } catch (error) {
      logger.error('Failed to restore context from snapshot', { error });
      this.emit(ConversationContextEvent.INTEGRATION_ERROR, { error, operation: 'restoreContext' });
      throw error;
    }
  }

  /**
   * Enhanced conversation save with context snapshot
   */
  async saveConversationWithContext(options: {
    name: string;
    description?: string;
    tags?: string[];
    custom?: Record<string, any>;
  }): Promise<SavedConversation> {
    try {
      // Create context snapshot
      const contextSnapshot = await this.createContextSnapshot();

      // Add context information to custom metadata (serialize snapshot for storage)
      const enhancedCustom = {
        ...options.custom,
        contextSnapshot: JSON.stringify(contextSnapshot),
        hasContextIntegration: true,
        contextIntegrationVersion: '1.0.0',
      };

      // Save conversation with enhanced metadata
      const savedConversation = await conversationState.saveConversation({
        ...options,
        custom: enhancedCustom,
      });

      logger.info('Saved conversation with context integration', {
        conversationId: savedConversation.id,
        contextEntries: contextSnapshot.contextEntries.length,
        contextSize: JSON.stringify(contextSnapshot).length,
      });

      return savedConversation;
    } catch (error) {
      logger.error('Failed to save conversation with context', { error });
      this.emit(ConversationContextEvent.INTEGRATION_ERROR, { error, operation: 'saveWithContext' });
      throw error;
    }
  }

  /**
   * Enhanced conversation resume with context restoration
   */
  async resumeConversationWithContext(id: string): Promise<SavedConversation> {
    try {
      // Load the conversation
      const conversation = await conversationState.loadConversation(id);

      // Check if conversation has context integration
      let contextSnapshot: ConversationContextSnapshot | null = null;
      if (conversation.metadata.custom?.contextSnapshot && typeof conversation.metadata.custom.contextSnapshot === 'string') {
        try {
          contextSnapshot = JSON.parse(conversation.metadata.custom.contextSnapshot) as ConversationContextSnapshot;
        } catch (error) {
          logger.warn('Failed to parse context snapshot from conversation metadata', { error });
        }
      }
      
      if (contextSnapshot && this.config.autoRestore) {
        logger.info('Conversation has context snapshot, restoring context', {
          conversationId: id,
          snapshotTimestamp: new Date(contextSnapshot.timestamp).toISOString(),
        });

        await this.restoreContextFromSnapshot(contextSnapshot);
      } else {
        logger.info('No context snapshot found or auto-restore disabled', {
          conversationId: id,
          hasSnapshot: !!contextSnapshot,
          autoRestore: this.config.autoRestore,
        });
      }

      return conversation;
    } catch (error) {
      logger.error('Failed to resume conversation with context', { error, conversationId: id });
      this.emit(ConversationContextEvent.INTEGRATION_ERROR, { error, operation: 'resumeWithContext' });
      throw error;
    }
  }

  /**
   * Detect context changes since last snapshot
   */
  async detectContextChanges(): Promise<{
    added: string[];
    modified: string[];
    removed: string[];
  }> {
    if (!this.lastContextSnapshot) {
      return { added: [], modified: [], removed: [] };
    }

    try {
      const currentContextResult = await this.contextSystem.loadContext();
      const currentContext = currentContextResult.entries;
      const lastContext = this.lastContextSnapshot.contextEntries;

      const currentSources = new Set(currentContext.map((entry: ContextEntry) => entry.path));
      const lastSources = new Set(lastContext.map((entry: ContextEntry) => entry.path));
      const lastContentMap = new Map(lastContext.map((entry: ContextEntry) => [entry.path, entry.content]));

      const added = currentContext
        .filter((entry: ContextEntry) => !lastSources.has(entry.path))
        .map((entry: ContextEntry) => entry.path);

      const removed = Array.from(lastSources)
        .filter(source => !currentSources.has(source));

      const modified = currentContext
        .filter((entry: ContextEntry) => {
          const lastContent = lastContentMap.get(entry.path);
          return lastContent !== undefined && lastContent !== entry.content;
        })
        .map((entry: ContextEntry) => entry.path);

      return { added, modified, removed };
    } catch (error) {
      logger.error('Failed to detect context changes', { error });
      return { added: [], modified: [], removed: [] };
    }
  }

  /**
   * Get context integration status
   */
  getIntegrationStatus(): {
    isInitialized: boolean;
    lastSnapshotTime?: number;
    config: ConversationContextConfig;
    contextSystemStatus: any;
  } {
    return {
      isInitialized: this.isInitialized,
      lastSnapshotTime: this.lastContextSnapshot?.timestamp,
      config: this.config,
      contextSystemStatus: { isWatching: this.contextSystem.isWatching() },
    };
  }

  /**
   * Update integration configuration
   */
  updateConfig(updates: Partial<ConversationContextConfig>): void {
    this.config = { ...this.config, ...updates };
    
    logger.info('Updated conversation context integration config', { updates });
  }

  // Private helper methods

  private setupEventListeners(): void {
    // Listen to context system events
    if (this.contextSystem.on) {
      this.contextSystem.on('contextUpdated', () => {
        if (this.config.trackChanges) {
          this.scheduleContextChangeDetection();
        }
      });

      this.contextSystem.on('fileChanged', () => {
        if (this.config.autoCapture) {
          this.scheduleContextCapture();
        }
      });
    }
  }

  private scheduleContextCapture(): void {
    // Debounce context capture to avoid excessive snapshots
    if (this.contextChangeTimer) {
      clearTimeout(this.contextChangeTimer);
    }

    this.contextChangeTimer = setTimeout(async () => {
      try {
        this.lastContextSnapshot = await this.createContextSnapshot();
      } catch (error) {
        logger.error('Failed to capture context snapshot', { error });
      }
    }, this.config.changeDebounceMs);
  }

  private scheduleContextChangeDetection(): void {
    // Debounce change detection
    if (this.contextChangeTimer) {
      clearTimeout(this.contextChangeTimer);
    }

    this.contextChangeTimer = setTimeout(async () => {
      try {
        const changes = await this.detectContextChanges();
        
        if (changes.added.length > 0 || changes.modified.length > 0 || changes.removed.length > 0) {
          this.emit(ConversationContextEvent.CONTEXT_CHANGED, { changes });
          
          logger.debug('Context changes detected', {
            added: changes.added.length,
            modified: changes.modified.length,
            removed: changes.removed.length,
          });
        }
      } catch (error) {
        logger.error('Failed to detect context changes', { error });
      }
    }, this.config.changeDebounceMs);
  }

  private truncateContextEntries(entries: ContextEntry[], maxSize: number): ContextEntry[] {
    const targetSize = maxSize * 0.8; // Leave some buffer
    let currentSize = 0;
    const truncatedEntries: ContextEntry[] = [];

    // Sort by priority (newer files first, then by size)
    const sortedEntries = [...entries].sort((a, b) => {
      const aTime = a.lastModified || 0;
      const bTime = b.lastModified || 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.content.length - b.content.length;
    });

    for (const entry of sortedEntries) {
      const entrySize = JSON.stringify(entry).length;
      
      if (currentSize + entrySize <= targetSize) {
        truncatedEntries.push(entry);
        currentSize += entrySize;
      } else {
        // Try to include a truncated version
        const truncatedContent = entry.content.substring(0, Math.floor((targetSize - currentSize) * 0.8));
        if (truncatedContent.length > 100) { // Only include if meaningful
          truncatedEntries.push({
            ...entry,
            content: truncatedContent + '\n\n[... content truncated for context snapshot ...]',
          });
        }
        break;
      }
    }

    return truncatedEntries;
  }
}

// Types and interfaces are exported inline above 