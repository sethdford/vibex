/**
 * Hierarchical Memory Manager
 * Implements MemGPT-style hierarchical memory with working, recall, and archival layers
 */

import { 
  MemoryManager, 
  MemoryEntry, 
  MemoryQuery, 
  MemorySearchResult, 
  MemoryType, 
  MemoryConfig, 
  MemoryStats,
  MemoryLayer,
  MemoryMetadata,
  CompressionStrategy,
  EmbeddingProvider
} from './interfaces.js';
import { createMemoryStorage } from './storage.js';
import { createEmbeddingProvider } from './embedding-provider.js';

export class HierarchicalMemoryManager implements MemoryManager {
  private config: MemoryConfig;
  private embeddingProvider: EmbeddingProvider;
  private layers: Map<string, MemoryLayer> = new Map();
  private sessionId: string;

  constructor(config: MemoryConfig, sessionId: string = 'default') {
    this.config = config;
    this.sessionId = sessionId;
    this.embeddingProvider = createEmbeddingProvider(
      config.embedding.provider,
      { 
        apiKey: process.env.OPENAI_API_KEY,
        model: config.embedding.model 
      }
    );
    
    this.initializeLayers();
  }

  private initializeLayers(): void {
    // Working Memory Layer - Fast access, limited capacity
    this.layers.set('working', {
      name: 'working',
      capacity: this.config.layers.working.capacity,
      retention_policy: this.config.layers.working.retention_policy,
      storage: createMemoryStorage(
        this.config.layers.working.storage_type,
        { path: this.config.layers.working.storage_path }
      )
    });

    // Recall Memory Layer - Medium-term storage with semantic search
    this.layers.set('recall', {
      name: 'recall',
      capacity: this.config.layers.recall.capacity,
      retention_policy: this.config.layers.recall.retention_policy,
      storage: createMemoryStorage(
        this.config.layers.recall.storage_type,
        { path: this.config.layers.recall.storage_path }
      )
    });

    // Archival Memory Layer - Long-term compressed storage
    this.layers.set('archival', {
      name: 'archival',
      capacity: this.config.layers.archival.capacity,
      retention_policy: this.config.layers.archival.retention_policy,
      storage: createMemoryStorage(
        this.config.layers.archival.storage_type,
        { path: this.config.layers.archival.storage_path }
      )
    });
  }

  /**
   * Store a memory entry, automatically placing it in the appropriate layer
   */
  async store(content: string, type: MemoryType, metadata?: Partial<MemoryMetadata>): Promise<string> {
    const id = this.generateId();
    const timestamp = new Date();
    
    // Generate embedding if enabled
    let embedding: number[] | undefined;
    try {
      embedding = await this.embeddingProvider.embed(content);
    } catch (error) {
      console.warn('Failed to generate embedding:', error);
    }

    const entry: MemoryEntry = {
      id,
      content,
      timestamp,
      type,
      importance: this.calculateImportance(content, type),
      embedding,
      metadata: {
        source: 'user',
        session_id: this.sessionId,
        ...metadata
      }
    };

    // Always start in working memory
    const workingLayer = this.layers.get('working')!;
    await workingLayer.storage.store(entry);

    // Check if working memory needs compression
    await this.handleMemoryPressure();

    return id;
  }

  /**
   * Recall memories based on query, searching across all layers
   */
  async recall(query: MemoryQuery): Promise<MemorySearchResult> {
    // Add session context if not specified
    const enhancedQuery = {
      ...query,
      session_id: query.session_id || this.sessionId
    };

    // Generate query embedding if text provided
    if (enhancedQuery.text && !enhancedQuery.embedding) {
      try {
        enhancedQuery.embedding = await this.embeddingProvider.embed(enhancedQuery.text);
      } catch (error) {
        console.warn('Failed to generate query embedding:', error);
      }
    }

    // Search all layers in priority order
    const results = await Promise.all([
      this.searchLayer('working', enhancedQuery),
      this.searchLayer('recall', enhancedQuery),
      this.searchLayer('archival', enhancedQuery)
    ]);

    // Merge and rank results
    return this.mergeSearchResults(results, enhancedQuery);
  }

  /**
   * Forget a specific memory by ID
   */
  async forget(id: string): Promise<boolean> {
    for (const layer of this.layers.values()) {
      const deleted = await layer.storage.delete(id);
      if (deleted) return true;
    }
    return false;
  }

  /**
   * Get context for a session, prioritizing recent and important memories
   */
  async getContext(session_id: string, max_tokens: number = 4000): Promise<string> {
    const query: MemoryQuery = {
      session_id,
      limit: 50,
      importance_min: 0.1 // Lower threshold to include more memories
    };

    const results = await this.recall(query);
    
    // Build context string, prioritizing by relevance and recency
    let context = '';
    let tokens = 0;
    
    for (const entry of results.entries) {
      const entryText = `[${entry.type}] ${entry.content}\n`;
      const entryTokens = this.estimateTokens(entryText);
      
      if (tokens + entryTokens > max_tokens) break;
      
      context += entryText;
      tokens += entryTokens;
    }

    return context;
  }

  /**
   * Update context for a session with new information
   */
  async updateContext(session_id: string, content: string): Promise<void> {
    await this.store(content, MemoryType.CONTEXT, { session_id });
  }

  /**
   * Handle memory pressure by moving entries between layers
   */
  async handleMemoryPressure(): Promise<void> {
    if (!this.config.compression.enable_auto_compression) return;

    // Check working memory pressure
    const workingStats = await this.getLayerStats('working');
    if (workingStats.utilization > this.config.compression.compression_threshold) {
      await this.compressLayer('working', 'recall');
    }

    // Check recall memory pressure
    const recallStats = await this.getLayerStats('recall');
    if (recallStats.utilization > this.config.compression.compression_threshold) {
      await this.compressLayer('recall', 'archival');
    }
  }

  /**
   * Get comprehensive memory statistics
   */
  async getMemoryStats(): Promise<MemoryStats> {
    const layerStats: MemoryStats['layers'] = {};
    let totalEntries = 0;

    for (const [name, layer] of this.layers) {
      const stats = await this.getLayerStats(name);
      layerStats[name] = stats;
      totalEntries += stats.entries;
    }

    // Calculate overall memory pressure
    const avgUtilization = Object.values(layerStats)
      .reduce((sum, stats) => sum + stats.utilization, 0) / this.layers.size;

    return {
      layers: layerStats,
      total_entries: totalEntries,
      memory_pressure: avgUtilization
    };
  }

  // Private helper methods

  private async searchLayer(layerName: string, query: MemoryQuery): Promise<MemorySearchResult> {
    const layer = this.layers.get(layerName);
    if (!layer) throw new Error(`Layer ${layerName} not found`);
    
    return await layer.storage.search(query);
  }

  private mergeSearchResults(results: MemorySearchResult[], query: MemoryQuery): MemorySearchResult {
    const allEntries: Array<{entry: MemoryEntry, score: number}> = [];
    
    // Combine results with layer-specific score adjustments
    results.forEach((result, layerIndex) => {
      const layerBoost = layerIndex === 0 ? 1.2 : layerIndex === 1 ? 1.0 : 0.8; // Prefer working > recall > archival
      
      result.entries.forEach((entry, entryIndex) => {
        allEntries.push({
          entry,
          score: (result.scores[entryIndex] || 0) * layerBoost
        });
      });
    });

    // Sort by adjusted score
    allEntries.sort((a, b) => b.score - a.score);

    // Apply limit
    const limit = query.limit || 10;
    const limitedResults = allEntries.slice(0, limit);

    return {
      entries: limitedResults.map(r => r.entry),
      scores: limitedResults.map(r => r.score),
      total_found: allEntries.length,
      query_embedding: query.embedding
    };
  }

  private async getLayerStats(layerName: string): Promise<MemoryStats['layers'][string]> {
    const layer = this.layers.get(layerName);
    if (!layer) throw new Error(`Layer ${layerName} not found`);

    // This is a simplified implementation
    // In production, we'd query the storage for actual stats
    const mockStats = {
      entries: Math.floor(Math.random() * layer.capacity),
      capacity: layer.capacity,
      utilization: 0,
      oldest_entry: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      newest_entry: Date.now()
    };

    mockStats.utilization = mockStats.entries / mockStats.capacity;
    return mockStats;
  }

  private async compressLayer(fromLayer: string, toLayer: string): Promise<void> {
    const from = this.layers.get(fromLayer);
    const to = this.layers.get(toLayer);
    
    if (!from || !to) return;

    // Get entries to compress (oldest, least important)
    const query: MemoryQuery = {
      session_id: this.sessionId,
      limit: Math.floor(from.capacity * 0.3), // Compress 30% of entries
      importance_min: 0
    };

    const results = await from.storage.search(query);
    if (results.entries.length === 0) return;

    // Compress entries
    const compressed = await from.storage.compress(results.entries);
    
    // Store compressed entry in target layer
    await to.storage.store(compressed);

    // Remove original entries from source layer
    for (const entry of results.entries) {
      await from.storage.delete(entry.id);
    }
  }

  private calculateImportance(content: string, type: MemoryType): number {
    let importance = 0.5; // Base importance

    // Type-based importance
    switch (type) {
      case MemoryType.FACT:
        importance += 0.3;
        break;
      case MemoryType.PREFERENCE:
        importance += 0.2;
        break;
      case MemoryType.TASK:
        importance += 0.4;
        break;
      case MemoryType.CONVERSATION:
        importance += 0.1;
        break;
    }

    // Content-based importance (simple heuristics)
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('important') || lowerContent.includes('remember')) {
      importance += 0.2;
    }
    
    if (lowerContent.includes('urgent') || lowerContent.includes('critical')) {
      importance += 0.3;
    }
    
    if (content.includes('!') || content.includes('?')) {
      importance += 0.1;
    }

    // Length-based importance (longer content might be more important)
    if (content.length > 200) {
      importance += 0.1;
    }

    return Math.min(1.0, importance);
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

// Factory function for creating memory manager
export function createHierarchicalMemoryManager(
  config?: Partial<MemoryConfig>,
  sessionId?: string
): HierarchicalMemoryManager {
  const defaultConfig: MemoryConfig = {
    layers: {
      working: {
        capacity: 100,
        retention_policy: {
          max_entries: 100,
          max_age_ms: 24 * 60 * 60 * 1000, // 24 hours
          importance_threshold: 0.3,
          compression_strategy: CompressionStrategy.LRU
        },
        storage_type: 'memory'
      },
      recall: {
        capacity: 1000,
        retention_policy: {
          max_entries: 1000,
          max_age_ms: 30 * 24 * 60 * 60 * 1000, // 30 days
          importance_threshold: 0.5,
          compression_strategy: CompressionStrategy.IMPORTANCE_BASED
        },
        storage_type: 'file',
        storage_path: './data/memory/recall'
      },
      archival: {
        capacity: 10000,
        retention_policy: {
          max_entries: 10000,
          max_age_ms: 365 * 24 * 60 * 60 * 1000, // 1 year
          importance_threshold: 0.7,
          compression_strategy: CompressionStrategy.SEMANTIC_CLUSTERING
        },
        storage_type: 'file',
        storage_path: './data/memory/archival'
      }
    },
    embedding: {
      provider: 'mock', // Default to mock for development
      dimension: 128
    },
    compression: {
      enable_auto_compression: true,
      compression_threshold: 0.8,
      summary_max_length: 500
    }
  };

  const mergedConfig = { ...defaultConfig, ...config };
  return new HierarchicalMemoryManager(mergedConfig, sessionId);
} 