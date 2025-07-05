/**
 * Common test environment setup for Vibex tests
 */

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.VIBEX_TEST_MODE = 'true';

// Add custom matchers for testing
expect.extend({
  /**
   * Custom matcher to check if a string contains all substrings
   * @param {string} received - The string to check
   * @param {string[]} substrings - Array of substrings to look for
   */
  toContainAll(received, substrings) {
    const missing = substrings.filter(substring => !received.includes(substring));
    const pass = missing.length === 0;
    
    return {
      message: () => 
        `expected ${received} ${pass ? 'not ' : ''}to contain all of: ${substrings.join(', ')}` +
        (pass ? '' : `\nMissing: ${missing.join(', ')}`),
      pass
    };
  },
  
  /**
   * Custom matcher to check if an array contains items matching all predicates
   * @param {any[]} received - The array to check
   * @param {Function[]} predicates - Array of predicate functions
   */
  toContainMatching(received, predicates) {
    if (!Array.isArray(received)) {
      return {
        message: () => `expected ${received} to be an array`,
        pass: false
      };
    }
    
    const missingPredicates = predicates.filter(predicate => 
      !received.some(item => predicate(item))
    );
    
    const pass = missingPredicates.length === 0;
    
    return {
      message: () => 
        `expected array ${pass ? 'not ' : ''}to contain items matching all predicates` +
        (pass ? '' : `\n${missingPredicates.length} predicates were not satisfied`),
      pass
    };
  },
  
  /**
   * Custom matcher to check if a function throws a specific error
   * @param {Function} received - The function to test
   * @param {string|RegExp} errorMessageMatcher - String or regex to match against error message
   */
  toThrowErrorMatching(received, errorMessageMatcher) {
    if (typeof received !== 'function') {
      return {
        message: () => `expected ${received} to be a function`,
        pass: false
      };
    }
    
    try {
      received();
      return {
        message: () => 'expected function to throw an error, but it did not throw',
        pass: false
      };
    } catch (error) {
      const errorMessage = error.message;
      let pass = false;
      
      if (errorMessageMatcher instanceof RegExp) {
        pass = errorMessageMatcher.test(errorMessage);
      } else {
        pass = errorMessage.includes(errorMessageMatcher);
      }
      
      return {
        message: () => 
          `expected function to ${pass ? 'not ' : ''}throw error matching ${errorMessageMatcher}` +
          `\nActual error: ${errorMessage}`,
        pass
      };
    }
  }
});

// Mock global fetch for tests
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      status: 200,
      statusText: 'OK'
    })
  );
}

// Mock global console methods to prevent noise during tests
const originalConsole = { ...console };

// Save original methods
beforeAll(() => {
  global._originalConsole = originalConsole;
  
  // By default, suppress console output in tests
  if (!process.env.VIBEX_TEST_VERBOSE) {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.debug = jest.fn();
  }
});

// Restore original console
afterAll(() => {
  if (global._originalConsole) {
    Object.assign(console, global._originalConsole);
    delete global._originalConsole;
  }
  
  if (global.fetch.mockRestore) {
    global.fetch.mockRestore();
  }
});

// Common test utilities
global.createMockEvent = (overrides = {}) => {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: { value: '' },
    ...overrides
  };
};

// Export environment for importing in individual test files
module.exports = {
  // Utility to create mock streams
  createMockReadableStream() {
    const stream = new require('stream').Readable();
    stream._read = () => {};
    return stream;
  },
  
  // Utility to wait for promises to resolve
  flushPromises() {
    return new Promise(resolve => setImmediate(resolve));
  },
  
  // Utility to create mock file system entries
  createMockFileSystem(structure) {
    const mockFs = {};
    
    const buildMockFs = (obj, path = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullPath = path ? `${path}/${key}` : key;
        
        if (typeof value === 'string') {
          // File
          mockFs[fullPath] = value;
        } else if (typeof value === 'object') {
          // Directory
          mockFs[fullPath] = null;
          buildMockFs(value, fullPath);
        }
      });
    };
    
    buildMockFs(structure);
    return mockFs;
  }
};