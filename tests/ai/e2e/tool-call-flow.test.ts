/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { initAI, resetAIClient } from '../../../src/ai/index.js';
import { UnifiedClaudeClient } from '../../../src/ai/unified-client.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock the API calls with tool calls
vi.mock('../../../src/ai/claude-content-generator.js', () => {
  const EventEmitter = require('events');
  
  class MockClaudeContentGenerator extends EventEmitter {
    generate = vi.fn().mockImplementation(async (messages, options) => {
      // Return a tool call on first invocation
      if (this.generate.mock.calls.length === 1) {
        return {
          content: null,
          usage: { input_tokens: 10, output_tokens: 20 },
          toolCalls: [{
            id: 'tool-call-1',
            type: 'function',
            function: {
              name: 'testTool',
              arguments: JSON.stringify({ param1: 'value1', param2: 'value2' })
            }
          }]
        };
      } 
      
      // Return content on second invocation (after tool result submission)
      return {
        content: 'Response after tool execution',
        usage: { input_tokens: 15, output_tokens: 25 }
      };
    });
    
    generateStream = vi.fn(async function* (messages, options) {
      // Return a tool call on first invocation
      if (this.generateStream.mock.calls.length === 1) {
        return {
          content: null,
          usage: { input_tokens: 10, output_tokens: 20 },
          toolCalls: [{
            id: 'tool-call-1',
            type: 'function',
            function: {
              name: 'testTool',
              arguments: JSON.stringify({ param1: 'value1', param2: 'value2' })
            }
          }]
        };
      }
      
      // Return content chunks on second invocation (after tool result submission)
      yield { type: 'content', content: 'Response ' };
      yield { type: 'content', content: 'after ' };
      yield { type: 'content', content: 'tool execution' };
      
      return {
        content: 'Response after tool execution',
        usage: { input_tokens: 15, output_tokens: 25 }
      };
    });

    countTokens = vi.fn().mockResolvedValue(10);
  }
  
  return {
    createClaudeContentGenerator: vi.fn().mockImplementation(() => new MockClaudeContentGenerator()),
    ClaudeContentGenerator: MockClaudeContentGenerator
  };
});

describe('E2E: Tool Call Flow', () => {
  beforeEach(() => {
    resetAIClient();
  });
  
  test('Complete tool call flow from query to tool execution to response', async () => {
    // Initialize the AI client
    const client = await initAI();
    
    // Set up tool call handler
    const toolCalls: any[] = [];
    client.on('tool_call', (toolCall) => {
      toolCalls.push(toolCall);
    });
    
    // Make initial query that will trigger a tool call
    const initialResponse = await client.query('Use a tool');
    
    // Verify tool call was received
    expect(toolCalls.length).toBe(1);
    expect(toolCalls[0].function.name).toBe('testTool');
    
    // Submit tool result
    const toolResult = { result: 'Tool execution successful' };
    const finalResponse = await client.submitToolResult(toolCalls[0].id, toolResult);
    
    // Verify final response after tool execution
    expect(finalResponse).toBeDefined();
    expect(finalResponse.message).toBeDefined();
    expect(finalResponse.message.content).toBe('Response after tool execution');
  });
  
  test('Streaming tool call flow', async () => {
    // Initialize the AI client
    const client = await initAI();
    
    // Set up event handlers
    const toolCalls: any[] = [];
    const contentChunks: string[] = [];
    
    client.on('tool_call', (toolCall) => {
      toolCalls.push(toolCall);
    });
    
    client.on('content', (chunk) => {
      contentChunks.push(chunk);
    });
    
    // Make initial streaming query that will trigger a tool call
    const initialResponse = await client.queryStream('Use a tool');
    
    // Verify tool call was received
    expect(toolCalls.length).toBe(1);
    expect(toolCalls[0].function.name).toBe('testTool');
    
    // Submit tool result
    const toolResult = { result: 'Tool execution successful' };
    const finalResponse = await client.submitToolResult(toolCalls[0].id, toolResult);
    
    // Verify content was streamed after tool execution
    expect(contentChunks).toEqual(['Response ', 'after ', 'tool execution']);
    
    // Verify final response
    expect(finalResponse).toBeDefined();
    expect(finalResponse.message).toBeDefined();
    expect(finalResponse.message.content).toBe('Response after tool execution');
  });
});