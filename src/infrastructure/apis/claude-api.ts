/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { ContentGenerator, ConversationMessage, Thought, ToolCall } from '../../core/interfaces/types';
import { EventEmitter } from 'events';

/**
 * Anthropic API client implementation of the ContentGenerator interface
 */
export class ClaudeApiClient extends EventEmitter implements ContentGenerator {
  private apiKey: string;
  private apiBaseUrl: string;
  private defaultModel: string;
  private modelContextSizes: Record<string, number>;

  constructor(
    apiKey: string, 
    apiBaseUrl = 'https://api.anthropic.com',
    defaultModel = 'claude-3-7-sonnet'
  ) {
    super();
    this.apiKey = apiKey;
    this.apiBaseUrl = apiBaseUrl;
    this.defaultModel = defaultModel;
    
    // Context window sizes for various Claude models
    this.modelContextSizes = {
      'claude-2.0': 100000,
      'claude-2.1': 200000,
      'claude-3-opus-20240229': 200000,
      'claude-3-5-sonnet-20240620': 200000,
      'claude-3-7-sonnet': 200000,
      'claude-3-haiku-20240307': 200000
    };
  }

  /**
   * Generate content from the API in a non-streaming manner
   */
  async generate(
    prompt: string, 
    options?: Record<string, unknown>
  ): Promise<{
    content: Array<{ type: string; text: string }>;
    usage: { inputTokens: number; outputTokens: number };
  }> {
    try {
      const model = options?.model as string || this.defaultModel;
      const temperature = options?.temperature as number || 0.7;
      const maxTokens = options?.maxTokens as number || 4000;
      
      // Format messages according to Anthropic API expectations
      const messages = this.formatMessages(prompt);
      
      // Make API call
      const response = await this.callClaudeApi({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      });
      
      // Process and return the response
      const content = response.content;
      const usage = {
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0
      };
      
      return { content, usage };
    } catch (error) {
      // Log and rethrow the error
      console.error('Error generating content from Claude API:', error);
      throw error;
    }
  }

  /**
   * Generate content from the API in a streaming manner
   */
  async generateStream(
    prompt: string, 
    options?: Record<string, unknown>
  ): Promise<void> {
    try {
      const model = options?.model as string || this.defaultModel;
      const temperature = options?.temperature as number || 0.7;
      const maxTokens = options?.maxTokens as number || 4000;
      const systemPrompt = options?.systemPrompt as string;
      
      // Format messages according to Anthropic API expectations
      const messages = this.formatMessages(prompt, systemPrompt);
      
      // Call API with streaming enabled
      const response = await fetch(`${this.apiBaseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true
        })
      });

      // Process streaming response
      if (!response.ok || !response.body) {
        throw new Error(`API error: ${response.status} ${await response.text()}`);
      }
      
      // Read and process the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // Process chunks as they arrive
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        this.processStreamChunk(chunk);
      }
    } catch (error) {
      console.error('Error in streaming content from Claude API:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Count tokens in the provided messages
   */
  async countTokens(
    messages: ConversationMessage[]
  ): Promise<{
    messageCount: number;
    tokenCount: number;
    tokensPerMessage: number[];
    contextLimit: number;
  }> {
    // Currently a basic estimation using 4 tokens per word
    // For production use, implement a proper tokenizer
    const tokensPerMessage: number[] = messages.map(msg => {
      const wordCount = msg.content.split(/\s+/).length;
      return wordCount * 4; // Rough approximation
    });
    
    const tokenCount = tokensPerMessage.reduce((a, b) => a + b, 0);
    const model = this.defaultModel;
    const contextLimit = this.modelContextSizes[model] || 100000;
    
    return {
      messageCount: messages.length,
      tokenCount,
      tokensPerMessage,
      contextLimit
    };
  }

  /**
   * Check if a model is available
   */
  isModelAvailable(model: string): boolean {
    return model in this.modelContextSizes;
  }
  
  /**
   * Get the default model
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }
  
  /**
   * Get the context size for a specific model
   */
  getModelContextSize(model: string): number {
    return this.modelContextSizes[model] || 100000;
  }
  
  /**
   * Private method to format messages for the Anthropic API
   */
  private formatMessages(
    prompt: string,
    systemPrompt?: string
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];
    
    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    // Add user message
    messages.push({ role: 'user', content: prompt });
    
    return messages;
  }
  
  /**
   * Private method to process streaming chunks
   */
  private processStreamChunk(chunk: string): void {
    // Split the chunk by newlines and process each part
    const lines = chunk.trim().split('\n');
    
    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Skip "data: [DONE]" lines
      if (line === 'data: [DONE]') continue;
      
      // Extract JSON payload from the line
      try {
        // Remove the "data: " prefix
        const jsonStr = line.replace(/^data: /, '');
        const data = JSON.parse(jsonStr);
        
        // Process content delta
        if (data.type === 'content_block_delta') {
          const { delta } = data;
          this.emit('content', delta.text || '');
        }
        // Process tool calls
        else if (data.type === 'tool_call') {
          const toolCall: ToolCall = {
            id: data.id,
            name: data.name,
            input: data.input
          };
          this.emit('tool-call', toolCall);
        }
        // Process thinking
        else if (data.type === 'thinking') {
          const thought: Thought = {
            subject: data.thinking.subject || 'Thinking...',
            description: data.thinking.description
          };
          this.emit('thought', thought);
        }
        
      } catch (error) {
        console.warn('Error processing streaming chunk:', error);
      }
    }
  }
  
  /**
   * Private method to call the Claude API
   */
  private async callClaudeApi(payload: Record<string, unknown>): Promise<any> {
    const response = await fetch(`${this.apiBaseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} ${error}`);
    }
    
    return await response.json();
  }
}