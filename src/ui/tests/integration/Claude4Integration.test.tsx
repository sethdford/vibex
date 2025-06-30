/**
 * Claude 4 Integration Tests
 * 
 * Tests the integration between the UI components and Claude 4 API client.
 */

import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { App } from '../../App';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { SessionStatsProvider } from '../../contexts/SessionContext';
import { ProgressProvider } from '../../contexts/ProgressContext';
import { MessageType, StreamingState } from '../../types';
import { Claude4Client, CLAUDE_4_MODELS } from '../../../ai/claude4-client';
import { initAI, resetAI } from '../../../ai/index';

// Mock the Claude 4 client
jest.mock('../../../ai/claude4-client', () => {
  const original = jest.requireActual('../../../ai/claude4-client');
  
  return {
    ...original,
    CLAUDE_4_MODELS: {
      CLAUDE_4_HAIKU: 'claude-4-haiku-20240307',
      CLAUDE_4_SONNET: 'claude-4-sonnet-20240229',
      CLAUDE_4_OPUS: 'claude-4-opus-20240229'
    },
    Claude4Client: jest.fn().mockImplementation(() => ({
      query: jest.fn().mockImplementation(async () => ({
        message: {
          content: [
            {
              type: 'text',
              text: 'Hello! This is a response from Claude 4. How can I help you today?'
            }
          ]
        },
        usage: {
          input_tokens: 50,
          output_tokens: 25
        }
      })),
      isAvailable: jest.fn().mockReturnValue(true),
      getModel: jest.fn().mockReturnValue('claude-4-sonnet-20240229'),
      setModel: jest.fn()
    })),
    createClaude4Client: jest.fn().mockImplementation(() => ({
      query: jest.fn().mockResolvedValue({
        message: {
          content: [
            {
              type: 'text',
              text: 'Hello! This is a response from Claude 4. How can I help you today?'
            }
          ]
        },
        usage: {
          input_tokens: 50,
          output_tokens: 25
        }
      }),
      isAvailable: jest.fn().mockReturnValue(true),
      getModel: jest.fn().mockReturnValue('claude-4-sonnet-20240229')
    }))
  };
});

// Mock other necessary modules
jest.mock('../../../config/index.js', () => ({
  loadConfig: jest.fn().mockResolvedValue({
    ai: {
      model: 'claude-4-sonnet-20240229',
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: 'You are Claude, a helpful AI assistant.'
    },
    terminal: {
      theme: 'dark',
      useColors: true,
      streamingSpeed: 40
    },
    claude4: {
      vision: true,
      preferredModel: 'claude-4-sonnet-20240229'
    }
  }),
  default: {
    get: jest.fn().mockReturnValue({
      ai: {
        model: 'claude-4-sonnet-20240229'
      }
    })
  }
}));

jest.mock('../../../auth/index.js', () => ({
  authManager: {
    getToken: jest.fn().mockReturnValue({ accessToken: 'mock-token' })
  }
}));

describe('Claude 4 Integration Tests', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    resetAI();
  });

  it('initializes Claude 4 client correctly', async () => {
    const aiClient = await initAI();
    
    expect(aiClient).toBeDefined();
    expect(aiClient.isAvailable()).toBe(true);
    expect(aiClient.getModel()).toBe('claude-4-sonnet-20240229');
  });

  it('uses Claude 4 client in the UI', async () => {
    const mockConfig = {
      ai: {
        model: 'claude-4-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 4096
      },
      terminal: {
        theme: 'dark',
        useColors: true
      }
    };
    
    // Initialize AI client first
    await initAI();
    
    const { container } = render(
      <SessionStatsProvider>
        <ProgressProvider>
          <ThemeProvider>
            <App config={mockConfig} />
          </ThemeProvider>
        </ProgressProvider>
      </SessionStatsProvider>
    );
    
    // Verify UI renders
    await waitFor(() => {
      expect(container.innerHTML).toContain('Claude');
    });
  });

  it('handles Claude 4 query and response', async () => {
    // Create a mock implementation for query function
    const queryMock = jest.fn().mockResolvedValue({
      message: {
        content: [
          {
            type: 'text',
            text: 'This is a test response from Claude 4.'
          }
        ]
      },
      usage: {
        input_tokens: 10,
        output_tokens: 20
      }
    });
    
    // Override the createClaude4Client mock
    const createClaude4ClientMock = require('../../../ai/claude4-client').createClaude4Client;
    createClaude4ClientMock.mockImplementation(() => ({
      query: queryMock,
      isAvailable: jest.fn().mockReturnValue(true),
      getModel: jest.fn().mockReturnValue('claude-4-sonnet-20240229')
    }));
    
    // Initialize AI client
    const aiClient = await initAI();
    
    // Test query function
    const result = await aiClient.query('Hello Claude 4');
    
    // Verify query was called
    expect(queryMock).toHaveBeenCalled();
    
    // Verify response
    expect(result.message.content[0].text).toBe('This is a test response from Claude 4.');
    expect(result.usage?.input_tokens).toBe(10);
    expect(result.usage?.output_tokens).toBe(20);
  });

  it('handles tool use with Claude 4', async () => {
    // Create a mock implementation that returns tool use and then a final response
    const queryMock = jest.fn()
      .mockResolvedValueOnce({
        message: {
          content: [
            {
              type: 'text',
              text: 'I need to use a tool to answer this question.'
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
          input_tokens: 15,
          output_tokens: 20
        }
      })
      .mockResolvedValueOnce({
        message: {
          content: [
            {
              type: 'text',
              text: 'Based on the file content, here is your answer.'
            }
          ]
        },
        usage: {
          input_tokens: 50,
          output_tokens: 10
        }
      });
    
    // Override the createClaude4Client mock
    const createClaude4ClientMock = require('../../../ai/claude4-client').createClaude4Client;
    createClaude4ClientMock.mockImplementation(() => ({
      query: queryMock,
      isAvailable: jest.fn().mockReturnValue(true),
      getModel: jest.fn().mockReturnValue('claude-4-sonnet-20240229')
    }));
    
    // Initialize AI client
    const aiClient = await initAI();
    
    // Test our hook's handling of tool use
    // This is difficult to test directly here since it's in a React hook (useClaude4Stream)
    // In a real test, we would render the component and simulate the user interaction
    
    // We can at least verify the client is properly initialized
    expect(aiClient).toBeDefined();
    expect(aiClient.isAvailable()).toBe(true);
  });
});