/**
 * AI Module
 *
 * Main entry point for AI functionality, providing Claude API interactions
 * with conversation management and memory optimization.
 */

// Export interfaces and types
export { type AIClient } from './ai-client.interface.js';
export { ClaudeClient, createClaudeClient } from './claude-client.js';
export { ClaudeContentGenerator } from './claude-content-generator.js';
export { 
  ContentStreamManager, 
  createContentStream,
  type ToolCall,
  type ToolResult
} from './content-stream.js';
export { MemoryManager, MemoryOptimizationStrategy } from './memory-manager.js';
export {
  ConversationCompressor,
  type CompressionResult
} from './conversation-compression.js';
export {
  ConversationContextIntegration
} from '../context/conversation-context-integration.js';

// Export types
export type { 
  QueryOptions,
  AIResponse,
  ToolSchema
} from './claude-client.js';

// Import core components
import type { AIClient } from './ai-client.interface.js';
import { createClaudeClient, ClaudeClient } from './claude-client.js';
import { logger } from '../utils/logger.js';
import { loadConfig } from '../config/index.js';
import type { AppConfigType } from '../config/schema.js';

// Store the singleton AI client instance
let aiClient: AIClient | null = null;

/**
 * Initialize the AI client
 *
 * @param providedConfig Optional configuration to override defaults
 * @returns The initialized AI client instance
 */
export async function initAI(providedConfig?: AppConfigType): Promise<AIClient> {
  if (aiClient !== null) {
    logger.debug('AI client already initialized');
    return aiClient;
  }

  logger.info('🚀 Starting AI client initialization...');

  try {
    // Load configuration
    const config = providedConfig || await loadConfig();
    
    // Get API key from environment variable directly (simplified approach)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required. Please set it to your Anthropic API key.');
    }

    logger.debug('✅ Found ANTHROPIC_API_KEY in environment');

    // Create Claude client with the API key
    aiClient = createClaudeClient(apiKey, config);

    // Test the connection
    if (!aiClient.isAvailable()) {
      throw new Error('AI client is not available. Please check your API key and network connection.');
    }

    logger.info('✅ AI client initialized successfully with environment API key');
    return aiClient;

  } catch (error) {
    logger.error('Failed to initialize AI client:', error);
    throw error;
  }
}

/**
 * Get the AI client instance
 * 
 * @returns The AI client instance or null if not initialized
 */
export function getAIClient(): AIClient | null {
  return aiClient;
}

/**
 * Reset the AI client (for testing)
 */
export function resetAI(): void {
  aiClient = null;
  logger.debug('AI client reset');
}

/**
 * Check if AI is initialized
 */
export function isAIInitialized(): boolean {
  return aiClient !== null;
}
