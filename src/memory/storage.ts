/**
 * Memory Storage Implementation
 * Supports in-memory, file-based, and database storage
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { MemoryStorage, MemoryEntry, MemoryQuery, MemorySearchResult, CompressionStrategy } from './interfaces.js';

export class InMemoryStorage implements MemoryStorage {
  private entries: Map<string, MemoryEntry> = new Map();

  async store(entry: MemoryEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async retrieve(id: string): Promise<MemoryEntry | null> {
    return this.entries.get(id) || null;
  }

  async search(query: MemoryQuery): Promise<MemorySearchResult> {
    const entries = Array.from(this.entries.values());
    const filtered = this.filterEntries(entries, query);
    const scored = await this.scoreEntries(filtered, query);
    
    // Sort by relevance score (descending)
    scored.sort((a, b) => b.score - a.score);
    
    const limit = query.limit || 10;
    const results = scored.slice(0, limit);
    
    return {
      entries: results.map(r => r.entry),
      scores: results.map(r => r.score),
      total_found: scored.length,
      query_embedding: query.embedding,
    };
  }

  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }

  async compress(entries: MemoryEntry[]): Promise<MemoryEntry> {
    // Simple compression: concatenate content and create summary
    const contents = entries.map(e => e.content).join('\n\n');
    const summary = this.createSummary(contents);
    
    return {
      id: `summary_${Date.now()}`,
      content: summary,
      timestamp: new Date(),
      type: entries[0]?.type || 'summary' as any,
      importance: Math.max(...entries.map(e => e.importance)),
      metadata: {
        source: 'system',
        session_id: entries[0]?.metadata.session_id || 'unknown',
        tags: ['compressed'],
        references: entries.map(e => e.id),
      },
    };
  }

  private filterEntries(entries: MemoryEntry[], query: MemoryQuery): MemoryEntry[] {
    return entries.filter(entry => {
      // Type filter
      if (query.type && entry.type !== query.type) return false;
      
      // Time range filter
      if (query.timeRange) {
        const time = entry.timestamp.getTime();
        if (time < query.timeRange.start.getTime() || time > query.timeRange.end.getTime()) {
          return false;
        }
      }
      
      // Importance filter
      if (query.importance_min && entry.importance < query.importance_min) return false;
      
      // Session filter
      if (query.session_id && entry.metadata.session_id !== query.session_id) return false;
      
      return true;
    });
  }

  private async scoreEntries(entries: MemoryEntry[], query: MemoryQuery): Promise<Array<{entry: MemoryEntry, score: number}>> {
    return entries.map(entry => {
      let score = 0;
      
      // Start with importance as base score (this ensures high importance entries get good scores)
      score = entry.importance * 0.5;
      
      // Text similarity (simple keyword matching)
      if (query.text) {
        const queryWords = query.text.toLowerCase().split(/\s+/);
        const contentWords = entry.content.toLowerCase().split(/\s+/);
        const matches = queryWords.filter(word => contentWords.includes(word));
        score += matches.length / queryWords.length * 0.3;
      }
      
      // Embedding similarity
      if (query.embedding && entry.embedding) {
        const similarity = this.cosineSimilarity(query.embedding, entry.embedding);
        score += similarity * 0.4;
      }
      
      // Additional importance boost for very important entries
      if (entry.importance > 0.7) {
        score += 0.2;
      }
      
      // Recency boost (newer entries get slight boost)
      let timestamp;
      if (typeof entry.timestamp === 'number') {
        timestamp = entry.timestamp;
      } else if (entry.timestamp instanceof Date) {
        timestamp = entry.timestamp.getTime();
      } else {
        // If timestamp is neither a number nor a Date, use current time
        timestamp = Date.now();
      }
      const ageMs = Date.now() - timestamp;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - ageDays / 30); // Decay over 30 days
      score += recencyScore * 0.1;
      
      return { entry, score: Math.min(1, score) };
    });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private createSummary(content: string): string {
    // Simple extractive summarization
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const maxSentences = Math.min(3, Math.ceil(sentences.length * 0.3));
    
    // Score sentences by length and position
    const scored = sentences.map((sentence, index) => ({
      sentence: sentence.trim(),
      score: sentence.length + (sentences.length - index) * 10, // Prefer longer, earlier sentences
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxSentences).map(s => s.sentence).join('. ') + '.';
  }

  // Utility methods for storage management
  async getStats(): Promise<{entries: number, memory_usage: number}> {
    const entries = this.entries.size;
    const memory_usage = JSON.stringify(Array.from(this.entries.values())).length;
    return { entries, memory_usage };
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }
}

export class FileStorage implements MemoryStorage {
  private storagePath: string;
  private indexPath: string;
  private index: Map<string, { file: string; offset: number }> = new Map();

  constructor(storagePath: string) {
    this.storagePath = storagePath;
    this.indexPath = join(storagePath, 'index.json');
  }

  async initialize(): Promise<void> {
    // Ensure storage directory exists
    await fs.mkdir(this.storagePath, { recursive: true });
    
    // Load index if it exists
    try {
      const indexData = await fs.readFile(this.indexPath, 'utf-8');
      const indexObj = JSON.parse(indexData);
      this.index = new Map(Object.entries(indexObj));
    } catch {
      // Index doesn't exist yet, start fresh
    }
  }

  async store(entry: MemoryEntry): Promise<void> {
    await this.initialize();
    
    const fileName = `${entry.metadata.session_id}_${Date.now()}.json`;
    const filePath = join(this.storagePath, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
    
    this.index.set(entry.id, { file: fileName, offset: 0 });
    await this.saveIndex();
  }

  async retrieve(id: string): Promise<MemoryEntry | null> {
    await this.initialize();
    
    const indexEntry = this.index.get(id);
    if (!indexEntry) return null;
    
    try {
      const filePath = join(this.storagePath, indexEntry.file);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async search(query: MemoryQuery): Promise<MemorySearchResult> {
    await this.initialize();
    
    const entries: MemoryEntry[] = [];
    
    // Load all entries (in production, this would be optimized with indexing)
    for (const [id, indexEntry] of this.index) {
      const entry = await this.retrieve(id);
      if (entry) entries.push(entry);
    }
    
    // Use in-memory storage logic for searching
    const memoryStorage = new InMemoryStorage();
    for (const entry of entries) {
      await memoryStorage.store(entry);
    }
    
    return await memoryStorage.search(query);
  }

  async delete(id: string): Promise<boolean> {
    await this.initialize();
    
    const indexEntry = this.index.get(id);
    if (!indexEntry) return false;
    
    try {
      const filePath = join(this.storagePath, indexEntry.file);
      await fs.unlink(filePath);
      this.index.delete(id);
      await this.saveIndex();
      return true;
    } catch {
      return false;
    }
  }

  async compress(entries: MemoryEntry[]): Promise<MemoryEntry> {
    // Use in-memory compression logic
    const memoryStorage = new InMemoryStorage();
    return await memoryStorage.compress(entries);
  }

  private async saveIndex(): Promise<void> {
    const indexObj = Object.fromEntries(this.index);
    await fs.writeFile(this.indexPath, JSON.stringify(indexObj, null, 2));
  }
}

// Factory function for creating storage instances
export function createMemoryStorage(
  type: 'memory' | 'file' | 'database',
  config?: { path?: string; connectionString?: string }
): MemoryStorage {
  switch (type) {
    case 'memory':
      return new InMemoryStorage();
    
    case 'file':
      if (!config?.path) {
        throw new Error('File path required for file storage');
      }
      return new FileStorage(config.path);
    
    case 'database':
      // Database storage would be implemented here
      throw new Error('Database storage not yet implemented');
    
    default:
      throw new Error(`Unknown storage type: ${type}`);
  }
} 