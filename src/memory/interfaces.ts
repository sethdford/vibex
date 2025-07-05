/**
 * Hierarchical Memory System Interfaces
 * Inspired by MemGPT architecture with modern vector embeddings
 */

export interface MemoryEntry {
  id: string;
  content: string;
  timestamp: Date;
  type: MemoryType;
  importance: number; // 0-1 score for retention priority
  embedding?: number[]; // Vector embedding for semantic search
  metadata: MemoryMetadata;
}

export interface MemoryMetadata {
  source: 'user' | 'system' | 'tool' | 'ai';
  session_id: string;
  context_window?: number;
  tags?: string[];
  references?: string[]; // IDs of related memories
}

export enum MemoryType {
  CONVERSATION = 'conversation',
  FACT = 'fact',
  PREFERENCE = 'preference',
  TASK = 'task',
  CONTEXT = 'context',
  SUMMARY = 'summary'
}

export interface MemoryLayer {
  name: string;
  capacity: number;
  retention_policy: RetentionPolicy;
  storage: MemoryStorage;
}

export interface RetentionPolicy {
  max_entries: number;
  max_age_ms: number;
  importance_threshold: number;
  compression_strategy: CompressionStrategy;
}

export enum CompressionStrategy {
  FIFO = 'fifo',
  LRU = 'lru',
  IMPORTANCE_BASED = 'importance_based',
  SEMANTIC_CLUSTERING = 'semantic_clustering'
}

export interface MemoryStorage {
  store(entry: MemoryEntry): Promise<void>;
  retrieve(id: string): Promise<MemoryEntry | null>;
  search(query: MemoryQuery): Promise<MemorySearchResult>;
  delete(id: string): Promise<boolean>;
  compress(entries: MemoryEntry[]): Promise<MemoryEntry>;
}

export interface MemoryQuery {
  text?: string;
  embedding?: number[];
  type?: MemoryType;
  timeRange?: { start: Date; end: Date };
  importance_min?: number;
  limit?: number;
  session_id?: string;
}

export interface MemorySearchResult {
  entries: MemoryEntry[];
  scores: number[]; // Relevance scores 0-1
  total_found: number;
  query_embedding?: number[];
}

export interface MemoryManager {
  // Core operations
  store(content: string, type: MemoryType, metadata?: Partial<MemoryMetadata>): Promise<string>;
  recall(query: MemoryQuery): Promise<MemorySearchResult>;
  forget(id: string): Promise<boolean>;
  
  // Context management
  getContext(session_id: string, max_tokens?: number): Promise<string>;
  updateContext(session_id: string, content: string): Promise<void>;
  
  // Memory pressure handling
  handleMemoryPressure(): Promise<void>;
  getMemoryStats(): Promise<MemoryStats>;
}

export interface MemoryStats {
  layers: {
    [layerName: string]: {
      entries: number;
      capacity: number;
      utilization: number;
      oldest_entry: Date;
      newest_entry: Date;
    };
  };
  total_entries: number;
  memory_pressure: number; // 0-1 scale
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  similarity(a: number[], b: number[]): number;
  dimension: number;
}

// Memory system configuration
export interface MemoryConfig {
  layers: {
    working: MemoryLayerConfig;
    recall: MemoryLayerConfig;
    archival: MemoryLayerConfig;
  };
  embedding: {
    provider: 'openai' | 'local' | 'mock';
    model?: string;
    dimension: number;
  };
  compression: {
    enable_auto_compression: boolean;
    compression_threshold: number;
    summary_max_length: number;
  };
}

export interface MemoryLayerConfig {
  capacity: number;
  retention_policy: RetentionPolicy;
  storage_type: 'memory' | 'file' | 'database';
  storage_path?: string;
} 