/**
 * Test Setup
 * 
 * Configures the test environment for UI component tests.
 */

import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock for Ink's useStdout hook
jest.mock('ink', () => {
  // Don't requireActual here as it will try to load ESM
  
  return {
    __esModule: true,
    useStdout: () => ({
      stdout: {
        columns: 80,
        rows: 24,
        on: jest.fn(),
        removeListener: jest.fn(),
        write: jest.fn(),
      }
    }),
    useStdin: () => ({
      stdin: {
        on: jest.fn(),
        removeListener: jest.fn(),
        setRawMode: jest.fn<() => void>(),
        isTTY: true,
      },
      setRawMode: jest.fn(),
      isRawModeSupported: true,
    }),
    render: jest.fn().mockReturnValue({
      waitUntilExit: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      cleanup: jest.fn<() => void>(),
    }),
  };
});

// Mock for fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  promises: {
    readFile: jest.fn<() => Promise<string>>().mockResolvedValue('{"test": true}'),
    writeFile: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    mkdir: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
  readFileSync: jest.fn().mockReturnValue('{"test": true}'),
  statSync: jest.fn().mockReturnValue({
    isFile: jest.fn().mockReturnValue(true),
  }),
}));

// Mock for logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn(),
  }
}));

// Mock for config
jest.mock('../../config/index.js', () => ({
  loadConfig: jest.fn<() => Promise<any>>().mockResolvedValue({
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
  default: {
    get: jest.fn().mockReturnValue({
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
    })
  }
}));

// Mock for AI client
jest.mock('../../ai/index.js', () => ({
  getAIClient: jest.fn().mockReturnValue({
    query: jest.fn<() => Promise<any>>().mockResolvedValue({
      message: {
        content: [
          {
            type: 'text',
            text: 'This is a test response from Claude.'
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
    }),
  }),
  initAI: jest.fn<() => Promise<any>>().mockResolvedValue({} as any)
}));

// Mock for auth manager
jest.mock('../../auth/index.js', () => ({
  authManager: {
    initialize: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    isAuthenticated: jest.fn().mockReturnValue(true),
    getToken: jest.fn().mockReturnValue({ 
      accessToken: 'mock-token', 
      expiresAt: Date.now() + 3600000 
    }),
  }
}));

// Mock for ink-select-input (ESM compatibility issue)
jest.mock('ink-select-input', () => ({
  __esModule: true,
  default: ({ items, onSelect }: any) => {
    return {
      type: 'div',
      props: {
        'data-testid': 'ink-select-input',
        children: items.map((item: any, i: number) => (
          {
            type: 'div',
            key: i,
            props: {
              'data-testid': `select-item-${i}`,
              onClick: () => onSelect(item),
              children: item.label
            }
          }
        ))
      }
    };
  }
}));

// Global mocks for Node.js process
global.process.stdout.isTTY = true;
global.process.stdin.isTTY = true;
global.process.exit = jest.fn() as any;

// Mock for performance.now()
(global.performance as any) = {
  now: jest.fn().mockReturnValue(1000),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(),
  getEntriesByType: jest.fn(),
  getEntries: jest.fn(),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  clearResourceTimings: jest.fn(),
  setResourceTimingBufferSize: jest.fn(),
  toJSON: jest.fn()
};