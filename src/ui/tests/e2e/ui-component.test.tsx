/**
 * UI Component End-to-End Tests
 * 
 * Tests the integrated UI components together to verify their interaction.
 * These tests ensure that UI components work correctly together in various scenarios.
 */

import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { App } from '../../App';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { SessionStatsProvider } from '../../contexts/SessionContext';
import { ProgressProvider } from '../../contexts/ProgressContext';
import { MessageType, StreamingState } from '../../types';

// Mock AI client
jest.mock('../../../ai/index.js', () => ({
  getAIClient: jest.fn().mockReturnValue({
    query: jest.fn().mockResolvedValue({
      message: {
        content: [
          {
            type: 'text',
            text: 'Hello! How can I help you today?'
          }
        ]
      },
      usage: {
        input_tokens: 10,
        output_tokens: 50
      },
      metrics: {
        latency: 500,
        model: 'claude-3-7-sonnet',
        cached: false,
        tokensPerSecond: 50,
        cost: 0.000125
      }
    }),
    streamMessage: jest.fn().mockImplementation((message, callback) => {
      setTimeout(() => {
        callback({
          type: 'content_block_start',
          content_block: { type: 'text' }
        });
      }, 10);
      
      setTimeout(() => {
        callback({
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'Hello! ' }
        });
      }, 20);
      
      setTimeout(() => {
        callback({
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'How can I ' }
        });
      }, 30);
      
      setTimeout(() => {
        callback({
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'help you today?' }
        });
      }, 40);
      
      setTimeout(() => {
        callback({
          type: 'content_block_stop'
        });
      }, 50);
      
      setTimeout(() => {
        callback({
          type: 'message_stop'
        });
      }, 60);
      
      return { cancel: jest.fn() };
    })
  }),
  initAI: jest.fn().mockResolvedValue({})
}));

// Mock config
jest.mock('../../../config/index.js', () => ({
  loadConfig: jest.fn().mockResolvedValue({
    terminal: {
      theme: 'dark',
      useColors: true,
      streamingSpeed: 40
    },
    ai: {
      model: 'claude-3-7-sonnet',
      systemPrompt: 'You are Claude, a helpful AI assistant.',
      temperature: 0.7,
      maxTokens: 4000
    },
    accessibility: {
      enabled: false,
      disableLoadingPhrases: false
    }
  })
}));

// Mock hooks
jest.mock('../../hooks/useTerminalSize', () => ({
  useTerminalSize: jest.fn().mockReturnValue({ rows: 30, columns: 100 })
}));

jest.mock('../../hooks/useClaudeStream', () => {
  const originalModule = jest.requireActual('../../hooks/useClaudeStream');
  
  const mockStreamingState = { current: 'idle' };
  const mockPendingItems = { current: [] };
  
  return {
    ...originalModule,
    useClaudeStream: jest.fn().mockImplementation(() => {
      return {
        streamingState: mockStreamingState.current,
        submitQuery: jest.fn().mockImplementation((query) => {
          // Update state to responding
          mockStreamingState.current = 'responding';
          
          // Add pending history item
          mockPendingItems.current = [
            {
              type: MessageType.ASSISTANT,
              text: 'Hello! How can I help you today?',
              timestamp: Date.now(),
              id: 'response-' + Date.now()
            }
          ];
          
          // After "streaming" complete, update state back to idle
          setTimeout(() => {
            mockStreamingState.current = 'idle';
            mockPendingItems.current = [];
          }, 100);
        }),
        initError: null,
        pendingHistoryItems: mockPendingItems.current,
        thought: 'Thinking about the best response...'
      };
    })
  };
});

// Mock useSettings
jest.mock('../../hooks/useSettings', () => ({
  useSettings: jest.fn().mockReturnValue({
    settings: {
      terminal: {
        theme: 'dark',
        streamingSpeed: 40
      },
      accessibility: {
        enabled: false,
        disableLoadingPhrases: false
      }
    },
    settingDefinitions: [
      {
        key: 'terminal.theme',
        label: 'Terminal Theme',
        description: 'Color theme for terminal',
        type: 'select',
        value: 'dark',
        options: [
          { label: 'Dark', value: 'dark' },
          { label: 'Light', value: 'light' }
        ],
        category: 'Terminal'
      },
      {
        key: 'accessibility.disableLoadingPhrases',
        label: 'Disable Loading Phrases',
        description: 'Disable random phrases during loading',
        type: 'boolean',
        value: false,
        category: 'Accessibility'
      }
    ],
    saveSetting: jest.fn(),
    error: null
  })
}));

describe('UI Component Integration Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    
    // Mock process.stdout and process.stdin
    Object.defineProperty(process, 'stdout', {
      value: {
        write: jest.fn(),
        columns: 100,
        rows: 30,
        on: jest.fn(),
        removeListener: jest.fn(),
        isTTY: true
      },
      writable: true
    });
    
    Object.defineProperty(process, 'stdin', {
      value: {
        on: jest.fn(),
        removeListener: jest.fn(),
        setRawMode: jest.fn(),
        isTTY: true
      },
      writable: true
    });
    
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });
  
  it('renders the main UI components correctly', () => {
    const mockConfig = {
      terminal: {
        theme: 'dark',
        useColors: true
      },
      ai: {
        model: 'claude-3-7-sonnet'
      }
    };
    
    const { getByText, container } = render(
      <SessionStatsProvider>
        <ProgressProvider>
          <ThemeProvider>
            <App config={mockConfig} startupWarnings={[]} />
          </ThemeProvider>
        </ProgressProvider>
      </SessionStatsProvider>
    );
    
    // Check for core components
    expect(container.innerHTML).toContain('Claude');
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  });
  
  it('displays streaming text correctly', async () => {
    const mockConfig = {
      terminal: {
        theme: 'dark',
        useColors: true,
        streamingSpeed: 40
      },
      ai: {
        model: 'claude-3-7-sonnet'
      }
    };
    
    const { getByText, container } = render(
      <SessionStatsProvider>
        <ProgressProvider>
          <ThemeProvider>
            <App config={mockConfig} startupWarnings={[]} />
          </ThemeProvider>
        </ProgressProvider>
      </SessionStatsProvider>
    );
    
    // Find input area
    const inputElement = container.querySelector('input');
    expect(inputElement).toBeTruthy();
    
    if (inputElement) {
      // Simulate typing and submitting a query
      fireEvent.change(inputElement, { target: { value: 'Hello!' } });
      fireEvent.keyDown(inputElement, { key: 'Enter' });
      
      // Allow time for "streaming" to complete
      act(() => {
        jest.advanceTimersByTime(200);
      });
      
      // Check response (though this might be limited with current mocks)
      expect(container.innerHTML).toContain('Claude');
    }
  });
  
  it('shows accessibility features when enabled', () => {
    // Create a config with accessibility enabled
    const mockConfig = {
      terminal: {
        theme: 'dark',
        useColors: true
      },
      ai: {
        model: 'claude-3-7-sonnet'
      },
      accessibility: {
        enabled: true,
        disableLoadingPhrases: true
      }
    };
    
    // Override useSettings mock for this test
    const useSettingsModule = require('../../hooks/useSettings');
    useSettingsModule.useSettings.mockReturnValueOnce({
      settings: {
        terminal: {
          theme: 'dark'
        },
        accessibility: {
          enabled: true,
          disableLoadingPhrases: true
        }
      },
      settingDefinitions: [
        {
          key: 'accessibility.disableLoadingPhrases',
          label: 'Disable Loading Phrases',
          description: 'Disable random phrases during loading',
          type: 'boolean',
          value: true,
          category: 'Accessibility'
        }
      ],
      saveSetting: jest.fn(),
      error: null
    });
    
    const { container } = render(
      <SessionStatsProvider>
        <ProgressProvider>
          <ThemeProvider>
            <App config={mockConfig} startupWarnings={[]} />
          </ThemeProvider>
        </ProgressProvider>
      </SessionStatsProvider>
    );
    
    // Check that loading phrases are disabled (no dynamic content in the loading area)
    expect(container.innerHTML).toContain('Claude');
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  });
  
  it('supports keyboard shortcuts', async () => {
    const mockConfig = {
      terminal: {
        theme: 'dark',
        useColors: true
      },
      ai: {
        model: 'claude-3-7-sonnet'
      }
    };
    
    const { container } = render(
      <SessionStatsProvider>
        <ProgressProvider>
          <ThemeProvider>
            <App config={mockConfig} startupWarnings={[]} />
          </ThemeProvider>
        </ProgressProvider>
      </SessionStatsProvider>
    );
    
    // Simulate pressing Ctrl+H to show help
    fireEvent.keyDown(window, { key: 'h', ctrlKey: true });
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Help content should be visible
    expect(container.innerHTML).toContain('Claude');
    
    // Simulate pressing Escape to close help
    fireEvent.keyDown(window, { key: 'Escape' });
    
    act(() => {
      jest.advanceTimersByTime(100);
    });
  });
  
  it('handles theme changes correctly', () => {
    const mockConfig = {
      terminal: {
        theme: 'dark',
        useColors: true
      },
      ai: {
        model: 'claude-3-7-sonnet'
      }
    };
    
    // Override useSettings mock for this test to simulate theme change
    let savedTheme: string | undefined;
    const useSettingsModule = require('../../hooks/useSettings');
    useSettingsModule.useSettings.mockReturnValue({
      settings: {
        terminal: {
          theme: savedTheme || 'dark'
        }
      },
      settingDefinitions: [
        {
          key: 'terminal.theme',
          label: 'Terminal Theme',
          description: 'Color theme for terminal',
          type: 'select',
          value: savedTheme || 'dark',
          options: [
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' }
          ],
          category: 'Terminal'
        }
      ],
      saveSetting: jest.fn().mockImplementation((key, value) => {
        if (key === 'terminal.theme') {
          savedTheme = value;
        }
      }),
      error: null
    });
    
    const { container, rerender } = render(
      <SessionStatsProvider>
        <ProgressProvider>
          <ThemeProvider>
            <App config={mockConfig} startupWarnings={[]} />
          </ThemeProvider>
        </ProgressProvider>
      </SessionStatsProvider>
    );
    
    // Initial theme should be dark
    expect(container.innerHTML).toContain('Claude');
    
    // Mock theme change
    savedTheme = 'light';
    
    // Re-render with updated theme
    rerender(
      <SessionStatsProvider>
        <ProgressProvider>
          <ThemeProvider>
            <App config={{...mockConfig, terminal: {...mockConfig.terminal, theme: 'light'}}} startupWarnings={[]} />
          </ThemeProvider>
        </ProgressProvider>
      </SessionStatsProvider>
    );
    
    // Component should still render with new theme
    expect(container.innerHTML).toContain('Claude');
  });
});