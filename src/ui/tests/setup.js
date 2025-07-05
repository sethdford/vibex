/**
 * Test Setup
 * 
 * Configures the test environment for UI component tests.
 */

require('@testing-library/jest-dom');

// Mock for Ink's useStdout hook
jest.mock('ink', () => ({
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
      setRawMode: jest.fn(),
      isTTY: true,
    },
    setRawMode: jest.fn(),
    isRawModeSupported: true,
  }),
  render: jest.fn().mockReturnValue({
    waitUntilExit: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn(),
  }),
  Box: ({ children }) => children,
  Text: ({ children }) => children,
  Newline: () => '\n',
  Spacer: () => ' ',
  useApp: () => ({
    exit: jest.fn(),
  }),
  useInput: jest.fn(),
  useFocus: () => ({
    isFocused: false,
  }),
  useFocusManager: () => ({
    focus: jest.fn(),
    focusNext: jest.fn(),
    focusPrevious: jest.fn(),
  }),
}));

// Mock for ink-spinner
jest.mock('ink-spinner', () => ({
  __esModule: true,
  default: ({ type }) => `[${type || 'dots'}]`,
}));

// Mock for fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  promises: {
    readFile: jest.fn().mockResolvedValue('{"test": true}'),
    writeFile: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
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
  loadConfig: jest.fn().mockResolvedValue({
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
    query: jest.fn().mockResolvedValue({
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
  initAI: jest.fn().mockResolvedValue({})
}));

// Mock for auth manager
jest.mock('../../auth/index.js', () => ({
  authManager: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isAuthenticated: jest.fn().mockReturnValue(true),
    getToken: jest.fn().mockReturnValue({ 
      accessToken: 'mock-token', 
      expiresAt: Date.now() + 3600000 
    }),
  }
}));

// Global mocks for Node.js process
global.process.stdout.isTTY = true;
global.process.stdin.isTTY = true;
global.process.exit = jest.fn();

// Mock for performance.now()
global.performance = {
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