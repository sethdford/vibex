/**
 * AI Module
 *
 * This module serves as the primary interface for all AI-related functionality,
 * providing a unified, high-level API for interacting with different AI models
 * and services. Key features include:
 *
 * - Simplified AI client initialization
 * - Centralized management of AI configurations
 * - Abstraction over different AI providers (e.g., Anthropic)
 * - Caching mechanism for AI responses
 * - Automatic model selection based on query complexity
 *
 * The module exports an `initAI` function that sets up and returns a ready-to-use
 * AI client, configured with the application's settings and authentication state.
 */

// Re-export everything from submodules
export * from './unified-client.js';
export * from './claude4-client.js';
export * from './types.js';
export * from './prompts.js';

// Import specific items we need for initialization
// Use aliases to avoid conflicts with exports
import type { UnifiedClaudeClient as ClientType } from './unified-client.js';
import { createClaude4Client as createClient } from './claude4-client.js';
import { authManager } from '../auth/index.js';
import { logger } from '../utils/logger.js';
import { loadConfig } from '../config/index.js';
import type { AppConfigType } from '../config/schema.js';

// Store the singleton AI client instance
let aiClient: ClientType | null = null;

/**
 * Initialize the AI client
 *
 * @param providedConfig Optional configuration to override defaults
 * @returns The initialized AI client instance
 */
export async function initAI(providedConfig?: AppConfigType): Promise<ClientType> {
  if (aiClient) {
    logger.debug('AI client already initialized');
    return aiClient;
  }

  logger.info('Initializing AI client');

  try {
    // Use provided config or load default
    const config = providedConfig || await loadConfig();
    // Try to get API key from auth manager or environment
    const authToken = authManager.getToken();
    const apiKey = authToken?.accessToken || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('Anthropic API key is not configured. Please log in or set ANTHROPIC_API_KEY.');
    }

    // Create the Claude 4 client
    aiClient = createClient(apiKey, config);

    logger.info('AI client initialized successfully');
    return aiClient;
  } catch (error) {
    logger.error('Failed to initialize AI client', error);
    throw error;
  }
}

/**
 * Get the current AI client instance
 *
 * @returns The AI client instance, or null if not initialized
 */
export function getAIClient(): ClientType | null {
  return aiClient;
}

/**
 * Reset the AI client instance (useful for testing or re-initialization)
 */
export function resetAI(): void {
  aiClient = null;
}

/**
 * Check if AI is available
 */
export function isAIAvailable(): boolean {
  return aiClient !== null;
}

 