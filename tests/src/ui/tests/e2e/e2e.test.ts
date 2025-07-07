/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * End-to-End Tests for Claude Code UI
 * 
 * Tests the full UI system from startup to interaction.
 * These tests simulate a complete user session with the CLI.
 */

import { startUI } from '../../../../../src/ui/index.js';
import { getAIClient } from '../../../../../src/ai/index.js';
import { loadConfig } from '../../../../../src/config/index.js';
import { defaults } from '../../../../../src/config/defaults.js';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock the render function from Ink
vi.mock('ink', () => {
  const originalModule = jest.requireActual('ink');
  
  return {
    __esModule: true,
    ...originalModule,
    render: vi.fn().mockReturnValue({
      waitUntilExit: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn(),
      rerender: vi.fn(),
      unmount: vi.fn(),
      clear: vi.fn(),
    }),
  };
});

// Mock stdin/stdout
const mockStdout = {
  write: vi.fn(),
  columns: 80,
  rows: 24,
  on: vi.fn(),
  removeListener: vi.fn(),
  isTTY: true,
};

const mockStdin = {
  on: vi.fn(),
  removeListener: vi.fn(),
  setRawMode: vi.fn(),
  isTTY: true,
  push: vi.fn(),
};

// Mock AI client
vi.mock('../../../../../src/ai/index.js', () => {
  let messageHandler: (message: string) => void;
  
  return {
    getAIClient: vi.fn().mockReturnValue({
      query: vi.fn().mockImplementation(async (messages: any[], options: any) => {
        // Simulate AI response
        const userMessage = messages[messages.length - 1].content;
        let response = 'I\'m not sure how to respond to that.';
        
        if (userMessage.includes('hello') || userMessage.includes('hi')) {
          response = 'Hello! How can I help you today?';
        } else if (userMessage.includes('help')) {
          response = 'I can help you with code-related tasks. Just ask me what you need!';
        } else if (userMessage.includes('code')) {
          response = 'Here\'s some sample code:\n\n```javascript\nconsole.log("Hello, world!");\n```';
        }
        
        return {
          message: {
            content: [
              {
                type: 'text',
                text: response
              }
            ]
          },
          usage: {
            input_tokens: userMessage.length,
            output_tokens: response.length
          },
          metrics: {
            latency: 1000,
            model: 'claude-3-7-sonnet',
            cached: false,
            tokensPerSecond: 50,
            cost: 0.000125
          }
        };
      }),
      onMessage: (handler: (message: string) => void) => {
        messageHandler = handler;
        return { unsubscribe: vi.fn() };
      },
      sendMessage: (message: string) => {
        if (messageHandler) {
          messageHandler(message);
        }
      }
    }),
    initAI: vi.fn().mockResolvedValue({})
  };
});

// Mock config
vi.mock('../../../../../src/config/index.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    terminal: {
      theme: 'dark',
      useColors: true,
    },
    ai: {
      model: 'claude-3-7-sonnet',
      systemPrompt: 'You are Claude, a helpful AI assistant.',
      temperature: 0.7,
      maxTokens: 4000,
    }
  }),
}));

describe('UI System End-to-End', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up process.stdout and process.stdin mocks
    Object.defineProperty(process, 'stdout', { value: mockStdout, writable: true });
    Object.defineProperty(process, 'stdin', { value: mockStdin, writable: true });
  });

  it('starts up the UI system', async () => {
    const startUIPromise = startUI({
      config: { ...defaults, terminal: { ...defaults.terminal, theme: 'dark' } },
      startupWarnings: ['This is a test warning'],
    });
    
    // Simulate user ending the session (by resolving the waitUntilExit promise)
    const { render } = require('ink');
    const { waitUntilExit } = render.mock.results[0].value;
    waitUntilExit.mockResolvedValueOnce(undefined);
    
    await startUIPromise;
    
    // Verify that the render function was called
    expect(render).toHaveBeenCalled();
    
    // Verify that the config was loaded
    expect(loadConfig).toHaveBeenCalled();
  });

  it('handles user interaction flow', async () => {
    const aiClient = getAIClient();
    
    if (!aiClient) {
      throw new Error('AI client is not available');
    }
    
    // Start UI
    const startUIPromise = startUI({
      config: { ...defaults, terminal: { ...defaults.terminal, theme: 'dark' } }
    });
    
    // Simulate user input event handlers being set up
    expect(mockStdin.on).toHaveBeenCalledWith('data', expect.any(Function));
    
    // Find and extract the data event handler
    const dataHandler = mockStdin.on.mock.calls.find(call => call[0] === 'data')?.[1];
    
    if (dataHandler) {
      // Simulate user typing "hello"
      dataHandler(Buffer.from('hello\n'));
      
      // Verify AI client was queried with the user message
      expect(aiClient.query).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'hello'
          })
        ]),
        expect.any(Object)
      );
    }
    
    // Simulate user ending the session
    const { render } = require('ink');
    const { waitUntilExit } = render.mock.results[0].value;
    waitUntilExit.mockResolvedValueOnce(undefined);
    
    await startUIPromise;
  });

  it('handles tool use flow', async () => {
    // Mock AI client to return a tool use response
    const aiClient = getAIClient();
    
    if (!aiClient) {
      throw new Error('AI client is not available');
    }
    
    // Override the query implementation for this specific test
    (aiClient.query as jest.Mock).mockImplementationOnce(async () => ({
      message: {
        content: [
          {
            type: 'text',
            text: 'I need to read this file to help you.'
          },
          {
            type: 'tool_use',
            id: 'tool-123',
            name: 'read_file',
            input: {
              path: '/test/file.txt'
            }
          }
        ]
      },
      usage: {
        input_tokens: 100,
        output_tokens: 50
      },
      metrics: {
        latency: 1000,
        model: 'claude-3-7-sonnet',
        cached: false,
        tokensPerSecond: 50,
        cost: 0.000125
      }
    })).mockImplementationOnce(async () => ({
      // Second response after tool use
      message: {
        content: [
          {
            type: 'text',
            text: 'Based on the file content, here is my answer.'
          }
        ]
      },
      usage: {
        input_tokens: 150,
        output_tokens: 75
      },
      metrics: {
        latency: 1200,
        model: 'claude-3-7-sonnet',
        cached: false,
        tokensPerSecond: 45,
        cost: 0.000175
      }
    }));
    
    // Start UI
    const startUIPromise = startUI({
      config: { ...defaults, terminal: { ...defaults.terminal, theme: 'dark' } }
    });
    
    // Simulate user input
    const dataHandler = mockStdin.on.mock.calls.find(call => call[0] === 'data')?.[1];
    
    if (dataHandler) {
      // Simulate user typing a request that needs file access
      dataHandler(Buffer.from('analyze the file at /test/file.txt\n'));
      
      // Verify AI client was queried with the user message
      expect(aiClient.query).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('analyze the file')
          })
        ]),
        expect.any(Object)
      );
      
      // Verify second query was made with tool results
      expect(aiClient.query).toHaveBeenCalledTimes(2);
    }
    
    // Simulate user ending the session
    const { render } = require('ink');
    const { waitUntilExit } = render.mock.results[0].value;
    waitUntilExit.mockResolvedValueOnce(undefined);
    
    await startUIPromise;
  });
});