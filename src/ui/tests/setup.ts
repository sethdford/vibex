/**
 * Vitest Test Setup - Following Gemini CLI patterns
 * This file configures the testing environment for Vitest
 */

import { vi } from 'vitest';

// Enhanced Jest compatibility - map jest functions to vi with proper types
(global as any).jest = {
  fn: vi.fn,
  mock: vi.mock,
  unmock: vi.unmock,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  resetModules: vi.resetModules,
  spyOn: vi.spyOn,
  // vi doesn't have setTimeout, use vi.useFakeTimers instead
  setTimeout: vi.fn() as any,
  requireActual: vi.importActual,
  doMock: vi.doMock,
  dontMock: vi.unmock, // Using unmock since dontMock doesn't exist in Vitest
  runOnlyPendingTimers: vi.runOnlyPendingTimers,
  runAllTimers: vi.runAllTimers,
  advanceTimersByTime: vi.advanceTimersByTime,
  setSystemTime: vi.setSystemTime as any,
  getRealSystemTime: vi.getRealSystemTime,
  useFakeTimers: vi.useFakeTimers as any,
  useRealTimers: vi.useRealTimers,
  // Add MockedFunction type compatibility
  MockedFunction: vi.fn
};

// Mock Ink components for testing
vi.mock('ink', () => ({
  Box: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  Static: ({ items }: { items: Array<React.ReactNode> }) => items,
  useInput: vi.fn(),
  useStdin: vi.fn(() => ({ stdin: process.stdin, setRawMode: vi.fn() })),
  useApp: vi.fn(() => ({ exit: vi.fn() })),
  measureElement: vi.fn(() => ({ width: 80, height: 24 })),
  render: vi.fn()
}));

// Mock React components
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: vi.fn(),
    useEffect: vi.fn(),
    useCallback: vi.fn(),
    useMemo: vi.fn(),
    useRef: vi.fn(() => ({ current: null }))
  };
});

// Mock Node.js modules with proper mock functions
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    statSync: vi.fn(),
    readdirSync: vi.fn()
  };
});

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    readFile: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    rm: vi.fn()
  };
});

vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('path')>();
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
    resolve: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/')),
    basename: vi.fn((path) => path.split('/').pop() || '')
  };
});

// Mock external dependencies
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(),
  Anthropic: vi.fn()
}));

vi.mock('clipboardy', () => ({
  write: vi.fn(),
  read: vi.fn()
}));

vi.mock('chalk', async (importOriginal) => {
  // Create a simplified chalk mock that supports method chaining
  const createChalkMethod = () => {
    const fn = vi.fn((text) => text) as any;
    fn.bold = vi.fn((text) => text);
    fn.dim = vi.fn((text) => text);
    fn.italic = vi.fn((text) => text);
    fn.underline = vi.fn((text) => text);
    return fn;
  };
  
  return {
    default: {
      // Basic color methods
      red: createChalkMethod(),
      green: createChalkMethod(),
      yellow: createChalkMethod(),
      blue: createChalkMethod(),
      cyan: createChalkMethod(),
      magenta: createChalkMethod(),
      white: createChalkMethod(),
      gray: createChalkMethod(),
      
      // Style methods
      bold: createChalkMethod(),
      dim: createChalkMethod(),
      
      // Background colors
      bgRed: createChalkMethod(),
      bgGreen: createChalkMethod(),
      bgBlue: createChalkMethod(),
      bgYellow: createChalkMethod(),
      bgMagenta: createChalkMethod()
    }
  };
});

// Global test utilities
(global as any).mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

// Setup test environment
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset console mocks
  const mockConsole = (global as any).mockConsole;
  if (mockConsole) {
    Object.keys(mockConsole).forEach(key => {
      if (mockConsole[key] && typeof mockConsole[key].mockClear === 'function') {
        mockConsole[key].mockClear();
      }
    });
  }
});

afterEach(() => {
  // Restore all mocks after each test
  vi.restoreAllMocks();
});

// Global test helpers
(global as any).createMockConversationTree = (id: string) => ({
  id,
  rootNodeId: `${id}-root`,
  nodes: new Map(),
  branches: new Map(),
  metadata: {
    title: `Test Tree ${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0'
  },
  activeNodeId: `${id}-root`,
  version: '1.0.0'
});

(global as any).createMockConversationNode = (id: string) => ({
  id,
  content: `Test content for ${id}`,
  role: 'user' as const,
  createdAt: new Date(),
  parentId: null,
  childIds: [],
  metadata: {}
});

// Type declarations for global test utilities
declare global {
  // These declarations are just for type-checking, actual values are set using 'as any'
  // The specific types don't need to match exactly as they're handled with type assertions
  namespace NodeJS {
    interface Global {
      jest: any;
      mockConsole: any;
      createMockConversationTree: (id: string) => any;
      createMockConversationNode: (id: string) => any;
    }
  }
}