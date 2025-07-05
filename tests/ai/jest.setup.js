// Jest setup file for AI module tests

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.ANTHROPIC_API_KEY = 'test-api-key';

// Add extra matchers for easier testing
expect.extend({
  toBeWithinTokenLimit(tokens, limit) {
    const pass = tokens <= limit;
    return {
      message: () => 
        `expected ${tokens} tokens ${pass ? 'not ' : ''}to be within token limit of ${limit}`,
      pass
    };
  },
  
  toBeOptimizedMemory(beforeCount, afterCount) {
    const pass = afterCount < beforeCount;
    const percentage = ((beforeCount - afterCount) / beforeCount) * 100;
    return {
      message: () => 
        `expected memory to be optimized, but ${afterCount} tokens is ${pass ? '' : 'not '}less than original ${beforeCount} tokens (${percentage.toFixed(2)}% reduction)`,
      pass
    };
  }
});

// Mock global fetch for tests
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ content: 'Mocked response' }),
    status: 200,
    statusText: 'OK'
  })
);

// Clean up after tests
afterAll(() => {
  jest.restoreAllMocks();
  delete process.env.ANTHROPIC_API_KEY;
});

// Log test setup completion
console.log('AI module test setup complete');