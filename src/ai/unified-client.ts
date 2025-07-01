/**
 * Unified AI Client for Claude Integration
 * 
 * This module provides a comprehensive client for interacting with Anthropic's Claude API.
 * It handles all aspects of AI interactions including:
 * 
 * - Message creation and streaming
 * - Tool registration and execution
 * - Session tracking and management
 * - Response caching for performance optimization
 * - Automatic model selection based on query complexity
 * - Cost tracking and performance monitoring
 * - Error handling and recovery with model fallbacks
 * 
 * The client is designed to be extensible and configurable while providing
 * a simple interface for basic usage patterns.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { 
  Message,
  MessageParam,
  Tool,
  ToolUseBlock,
  TextBlock,
  ContentBlock,
  ImageBlockParam,
  Usage
} from '@anthropic-ai/sdk/resources/messages.js';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger.js';
import { toolRegistry, registerBuiltInTools, ToolResult } from '../tools/index.js';
import { createRipgrepTool } from '../tools/ripgrep.js';
import { AppConfigType } from '../config/schema.js';
import config from '../config/index.js';
import { telemetry } from '../telemetry/index.js';


export const CLAUDE_MODELS = {
  CLAUDE_3_5_SONNET: 'claude-3-5-sonnet-20240620',
  CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
  CLAUDE_3_OPUS: 'claude-3-opus-20240229',
  CLAUDE_INSTANT: 'claude-instant-1.2'
} as const;

export interface UnifiedClientConfig {
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  enableTools?: boolean;
  enableTelemetry?: boolean;
  config?: AppConfigType;
}

export interface QueryOptions {
  model?: string;
  system?: string;
  tools?: Tool[];
  temperature?: number;
  maxTokens?: number;
  sessionId?: string;
}

export interface QueryResult {
  message: Message;
  usage: Usage;
  metrics: {
    latency: number;
    model: string;
    cached: boolean;
    tokensPerSecond: number;
    cost: number;
  };
  session: {
    id: string;
    messageCount: number;
    totalCost: number;
  };
}

export interface AIResponse {
  message: {
    content: Array<{
      type: string;
      text?: string;
    }>;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface UnifiedClaudeClient {
  query(input: string, options?: any): Promise<AIResponse>;
  isAvailable(): boolean;
  getModel(): string;
}

export class UnifiedClaudeClient extends EventEmitter {
  private client: Anthropic;
  private config: Required<UnifiedClientConfig>;
  private sessions = new Map<string, any>();
  private tools = new Map<string, Tool>();

  constructor(clientConfig: UnifiedClientConfig) {
    super();
    const loadedConfig = config.get();
    this.config = {
      baseURL: 'https://api.anthropic.com',
      defaultModel: CLAUDE_MODELS.CLAUDE_3_5_SONNET,
      timeout: 60000,
      maxRetries: 3,
      enableTools: true,
      enableTelemetry: true,
      ...clientConfig,
      config: loadedConfig as any
    };
    
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.config?.api?.baseUrl || this.config.baseURL,
      maxRetries: this.config.config?.auth?.maxRetryAttempts || this.config.maxRetries,
      timeout: this.config.config?.api?.timeout || this.config.timeout,
    });
    
    this.initialize();
  }

  private initialize(): void {
    logger.debug('Initializing UnifiedClaudeClient...');
    registerBuiltInTools();
    this.initializeTools();
    logger.info('UnifiedClaudeClient initialized successfully');
  }

  private initializeTools(): void {
    toolRegistry.getDefinitions().forEach((tool: any) => {
      this.tools.set(tool.name, tool as Tool);
    });
    
    try {
      const ripgrepToolDefinition = createRipgrepTool();
      const ripgrepTool = {
          name: ripgrepToolDefinition.name,
          description: ripgrepToolDefinition.description,
          input_schema: ripgrepToolDefinition.input_schema
      }
      this.tools.set(ripgrepTool.name, ripgrepTool as Tool);
    } catch (error) {
      logger.debug('Ripgrep tool not available:', error);
    }
    
    logger.debug(`Initialized ${this.tools.size} tools`);
  }

  async query(
    prompt: string | MessageParam[],
    options: QueryOptions = {}
  ): Promise<QueryResult> {
    const session = this.getOrCreateSession(options.sessionId || 'default');
    const messages = this.prepareMessages(prompt);
    const model = options.model || this.config.config?.ai?.model || this.config.defaultModel;

    const startTime = performance.now();
    let response = await this.createMessage(messages, model, options);

    if (this.hasToolUse(response)) {
      const toolFollowup = await this.handleToolUse(response, messages);
      response = await this.createMessage(toolFollowup, model, options);
    }
    
    return this.createResult(response, startTime, model, false, session);
  }

  private prepareMessages(prompt: string | MessageParam[]): MessageParam[] {
    if (typeof prompt === 'string') {
      return [{ role: 'user', content: prompt }];
    }
    return [...prompt];
  }

  private async createMessage(
    messages: MessageParam[],
    model: string,
    options: QueryOptions
  ): Promise<Message> {
    return this.client.messages.create({
      model,
      messages,
      system: options.system,
      max_tokens: options.maxTokens || this.config.config?.ai?.maxTokens || 4096,
      temperature: options.temperature || this.config.config?.ai?.temperature,
      tools: options.tools || Array.from(this.tools.values()),
      stream: false,
    });
  }

  private hasToolUse(message: Message): boolean {
    return message.content.some(block => block.type === 'tool_use');
  }

  private async handleToolUse(message: Message, originalMessages: MessageParam[]): Promise<MessageParam[]> {
    // Create a new array with all original messages
    const newMessages = [...originalMessages];
    
    // Add the assistant's message with tool use blocks
    newMessages.push({
      role: 'assistant',
      content: message.content,
    });
    
    // Extract all tool use blocks
    const toolUseBlocks = message.content.filter(block => block.type === 'tool_use') as ToolUseBlock[];
    
    // Process each tool use block
    for (const toolUseBlock of toolUseBlocks) {
      const { name, input } = toolUseBlock;
      logger.debug(`Executing tool: ${name} with input:`, input);
      
      let toolResult: any;
      
      try {
        // Get the tool handler from the registry
        const tool = toolRegistry.get(name);
        if (!tool) {
          throw new Error(`Tool not found: ${name}`);
        }
        
        // Execute the tool with the provided input
        toolResult = await tool.handler(input);
        logger.debug(`Tool ${name} executed successfully`);
        
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);
        toolResult = {
          error: error instanceof Error ? error.message : String(error)
        };
      }
      
      // Add the tool result as a user message (tool output)
      newMessages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUseBlock.id,
            content: typeof toolResult === 'string'
              ? toolResult
              : JSON.stringify(toolResult, null, 2)
          }
        ]
      });
    }
    
    return newMessages;
  }
  
  private createResult(
    message: Message,
    startTime: number,
    model: string,
    cached: boolean,
    session: any
  ): QueryResult {
    const latency = performance.now() - startTime;
    const usage = message.usage || { input_tokens: 0, output_tokens: 0 };
    const cost = this.calculateCost(model, usage);
    const tokensPerSecond = latency > 0 ? usage.output_tokens / (latency / 1000) : 0;

    return {
      message: { ...message, stop_sequence: null },
      usage,
      metrics: { 
        latency, 
        model, 
        cached, 
        tokensPerSecond, 
        cost 
      },
      session: { 
        id: session.id, 
        messageCount: (session.messages || []).length, 
        totalCost: (session.totalCost || 0) + cost
      },
    };
  }
  
  private getOrCreateSession(sessionId: string): any {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { id: sessionId, messages: [], totalCost: 0 });
    }
    return this.sessions.get(sessionId);
  }

  private calculateCost(model: string, usage: Usage): number {
    const pricing: Record<string, { input: number, output: number }> = {
      [CLAUDE_MODELS.CLAUDE_3_5_SONNET]: { input: 3 / 1_000_000, output: 15 / 1_000_000 },
      [CLAUDE_MODELS.CLAUDE_3_HAIKU]: { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
      [CLAUDE_MODELS.CLAUDE_3_OPUS]: { input: 15 / 1_000_000, output: 75 / 1_000_000 },
      [CLAUDE_MODELS.CLAUDE_INSTANT]: { input: 0.8 / 1_000_000, output: 2.4 / 1_000_000 },
    };

    const modelPricing = pricing[model];
    if (!modelPricing) return 0;

    return (usage.input_tokens * modelPricing.input) + (usage.output_tokens * modelPricing.output);
  }
}

/**
 * Create a unified Claude client
 */
export function createUnifiedClient(apiKey: string, options: { config?: AppConfigType } = {}): UnifiedClaudeClient {
  const config = options.config;
  const model = config?.ai?.model || 'claude-3-sonnet-20240229';
  
  return {
    async query(input: string, options: any = {}): Promise<AIResponse> {
      const startTime = Date.now();
      
      try {
        logger.debug(`Querying Claude with ${input.length} characters`);
        
        // Use dynamic import to avoid bundling issues
        const fetch = (await import('node-fetch')).default;
        
        const requestBody = {
          model,
          max_tokens: config?.ai?.maxTokens || 4000,
          temperature: config?.ai?.temperature || 0.7,
          messages: [
            {
              role: 'user',
              content: input
            }
          ]
        };
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json() as any;
        const duration = Date.now() - startTime;
        
        // Track metrics
        telemetry.trackApiCall('claude', duration, response.status, model);
        
        // Format response to match expected interface
        const formattedResponse: AIResponse = {
          message: {
            content: result.content || [{ type: 'text', text: 'No response received' }]
          },
          usage: result.usage ? {
            input_tokens: result.usage.input_tokens || 0,
            output_tokens: result.usage.output_tokens || 0
          } : undefined
        };
        
        logger.debug(`Claude response received in ${duration}ms`);
        return formattedResponse;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        telemetry.trackApiCall('claude', duration, 500, model);
        
        logger.error('Claude API request failed', error);
        throw error;
      }
    },
    
    isAvailable(): boolean {
      return !!apiKey;
    },
    
    getModel(): string {
      return model;
    }
  };
}