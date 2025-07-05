/**
 * Embedding Provider Implementation
 * Supports OpenAI, local models, and mock embeddings
 */

import { EmbeddingProvider } from './interfaces.js';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;
  public readonly dimension: number;

  constructor(apiKey: string, model: string = 'text-embedding-3-small') {
    this.apiKey = apiKey;
    this.model = model;
    this.dimension = model === 'text-embedding-3-large' ? 3072 : 1536;
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: text,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw error;
    }
  }

  similarity(a: number[], b: number[]): number {
    return cosineSimilarity(a, b);
  }
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  public readonly dimension: number = 384; // sentence-transformers/all-MiniLM-L6-v2

  constructor() {
    // In a real implementation, this would load a local model
    // For now, we'll use a simplified approach
  }

  async embed(text: string): Promise<number[]> {
    // Simplified hash-based embedding for local development
    // In production, this would use a proper local model like sentence-transformers
    return this.hashToEmbedding(text);
  }

  private hashToEmbedding(text: string): number[] {
    const hash = this.simpleHash(text);
    const embedding = new Array(this.dimension);
    
    for (let i = 0; i < this.dimension; i++) {
      embedding[i] = Math.sin(hash * (i + 1)) * 0.5 + 0.5;
    }
    
    return this.normalize(embedding);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  similarity(a: number[], b: number[]): number {
    return cosineSimilarity(a, b);
  }
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  public readonly dimension: number = 128;

  async embed(text: string): Promise<number[]> {
    // Deterministic mock embeddings for testing
    const seed = this.stringToSeed(text);
    const rng = this.seededRandom(seed);
    
    const embedding = new Array(this.dimension);
    for (let i = 0; i < this.dimension; i++) {
      embedding[i] = rng() * 2 - 1; // Range -1 to 1
    }
    
    return this.normalize(embedding);
  }

  private stringToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private seededRandom(seed: number): () => number {
    let x = seed;
    return () => {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  }

  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  similarity(a: number[], b: number[]): number {
    return cosineSimilarity(a, b);
  }
}

// Utility function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }

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

// Factory function for creating embedding providers
export function createEmbeddingProvider(
  provider: 'openai' | 'local' | 'mock',
  config?: { apiKey?: string; model?: string }
): EmbeddingProvider {
  switch (provider) {
    case 'openai':
      if (!config?.apiKey) {
        throw new Error('OpenAI API key required for OpenAI embedding provider');
      }
      return new OpenAIEmbeddingProvider(config.apiKey, config.model);
    
    case 'local':
      return new LocalEmbeddingProvider();
    
    case 'mock':
      return new MockEmbeddingProvider();
    
    default:
      throw new Error(`Unknown embedding provider: ${provider}`);
  }
} 