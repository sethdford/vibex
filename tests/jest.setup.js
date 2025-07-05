// Jest setup file for all Vibex tests

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.VIBEX_CONFIG_DIR = '/tmp/vibex-test-config';
process.env.VIBEX_CACHE_DIR = '/tmp/vibex-test-cache';

// Fix for ESM compatibility with Jest
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Mock fetch for testing (simpler approach than importing node-fetch)
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      status: 200,
      statusText: 'OK',
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
        set: jest.fn(),
        has: jest.fn().mockReturnValue(true)
      }
    })
  );
  
  globalThis.Headers = jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn()
  }));
  
  globalThis.Request = jest.fn();
  globalThis.Response = jest.fn();
}

// Mock fs/promises module for file operations
jest.mock('fs/promises', () => ({
  access: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  mkdtemp: jest.fn().mockResolvedValue('/tmp/test-dir-123456'),
  readFile: jest.fn().mockResolvedValue('{}'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn().mockResolvedValue({
    isDirectory: () => false,
    isFile: () => true,
    size: 1024,
    mtime: new Date()
  }),
  unlink: jest.fn().mockResolvedValue(undefined),
  rmdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
  copyFile: jest.fn().mockResolvedValue(undefined)
}));

// Mock fs module for synchronous operations
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('{}'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    access: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    mkdtemp: jest.fn().mockResolvedValue('/tmp/test-dir-123456'),
    readFile: jest.fn().mockResolvedValue('{}'),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockResolvedValue([]),
    stat: jest.fn().mockResolvedValue({
      isDirectory: () => false,
      isFile: () => true,
      size: 1024,
      mtime: new Date()
    }),
    unlink: jest.fn().mockResolvedValue(undefined),
    rmdir: jest.fn().mockResolvedValue(undefined),
    rm: jest.fn().mockResolvedValue(undefined),
    copyFile: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => '/' + args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path) => path.split('/').pop()),
  extname: jest.fn((path) => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }),
  relative: jest.fn((from, to) => to),
  isAbsolute: jest.fn((path) => path.startsWith('/'))
}));

// Mock os module
jest.mock('os', () => ({
  homedir: jest.fn(() => '/mock/home/dir'),
  tmpdir: jest.fn(() => '/tmp'),
  platform: jest.fn(() => 'linux'),
  type: jest.fn(() => 'Linux'),
  release: jest.fn(() => '5.4.0'),
  arch: jest.fn(() => 'x64')
}));

// Set default timeout for async tests
jest.setTimeout(10000);

// Mock console to reduce test output noise
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock performance.now for consistent timing in tests
if (typeof performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn()
  };
}

// Mock crypto for Node.js compatibility
if (typeof crypto === 'undefined') {
  const nodeCrypto = require('crypto');
  global.crypto = {
    randomUUID: () => nodeCrypto.randomUUID(),
    getRandomValues: (arr) => nodeCrypto.getRandomValues(arr)
  };
}

// Mock binary file detection for fs/operations
jest.mock('../src/fs/operations.js', () => ({
  isBinaryFile: jest.fn((filePath) => {
    // Mock binary detection based on file extension
    const binaryExts = ['.jpg', '.png', '.exe', '.dll', '.so', '.bin', '.pdf', '.zip', '.tar', '.gz'];
    return Promise.resolve(binaryExts.some(ext => filePath.endsWith(ext)));
  })
}));

// Mock AbortController for older Node.js versions
if (typeof AbortController === 'undefined') {
  global.AbortController = class MockAbortController {
    constructor() {
      this.signal = {
        aborted: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      };
    }
    
    abort() {
      this.signal.aborted = true;
    }
  };
}

// Setup common test utilities
global.testUtils = {
  createMockError: (message, category) => {
    const error = new Error(message);
    error.category = category;
    return error;
  },
  
  createMockConfig: (overrides = {}) => ({
    debug: false,
    verbose: false,
    workspace: '/mock/workspace',
    ...overrides
  }),
  
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};