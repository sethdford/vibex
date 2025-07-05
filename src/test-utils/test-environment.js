/**
 * Common test environment setup for Jest tests
 */

// Set NODE_ENV for all tests
process.env.NODE_ENV = 'test';

// Set default timeout for async tests
jest.setTimeout(10000);

// Mock console methods
global.console = {
  ...global.console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Global mock for fetch
global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  status: 200
}));

// Prevent actual network requests
global.XMLHttpRequest = jest.fn(() => ({
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  readyState: 4,
  status: 200,
  responseText: '',
  onreadystatechange: null
}));

// Provide dummy process.hrtime for performance tracking
if (typeof process.hrtime !== 'function') {
  process.hrtime = jest.fn(() => [0, 0]);
}

// Suppress specific console warnings during tests
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');
  if (
    message.includes('Warning: React version not specified') ||
    message.includes('Warning: Received `true` for a non-boolean attribute') ||
    message.includes('ts-jest[ts-compiler]')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

// Set up environment variables needed for tests
process.env.CLAUDE_API_KEY = 'test-api-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.TEST_MODE = 'true';

module.exports = {};