/**
 * Jest configuration for project tests
 */

export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      isolatedModules: true,
      tsconfig: 'tsconfig.test.json'
    }],
  },
  moduleNameMapper: {
    // Map .js imports to TypeScript source files - comprehensive patterns
    '^(\\.{1,2}/.+)\\.js$': '$1',
    
    // Map test file imports to actual source files - specific patterns
    '^\\./(.+)\\.js$': '<rootDir>/src/ui/components/$1.tsx',
    '^\\.\\./(components|hooks|contexts|utils)/(.+)\\.js$': '<rootDir>/src/ui/$1/$2.tsx',
    '^\\.\\./(components|hooks|contexts|utils)/(.+)$': '<rootDir>/src/ui/$1/$2',
    
    // Map test subdirectory imports
    '^\\./image/(.+)\\.js$': '<rootDir>/src/ui/components/image/$1.tsx',
    '^\\./messages/(.+)\\.js$': '<rootDir>/src/ui/components/messages/$1.tsx',
    '^\\./progress/(.+)\\.js$': '<rootDir>/src/ui/components/progress/$1.tsx',
    '^\\./shared/(.+)\\.js$': '<rootDir>/src/ui/components/shared/$1.tsx',
    
    // Map relative imports from test files to source
    '^\\.\\.\\./(.+)\\.js$': '<rootDir>/src/$1',
    '^\\.\\.\\./src/(.+)\\.js$': '<rootDir>/src/$1',
    '^../../(.+)\\.js$': '<rootDir>/src/$1',
    '^../(.+)\\.js$': '<rootDir>/src/ui/$1',
    
    // Map specific file imports
    '^\\.\\./(colors|constants|types)\\.js$': '<rootDir>/src/ui/$1.ts',
    '^\\.\\.\\./errors/(.+)\\.js$': '<rootDir>/src/errors/$1.ts',
    '^\\.\\.\\./version\\.js$': '<rootDir>/src/version.ts',
    
    // Map fs/operations module
    '^\\.\\.\\./fs/operations\\.js$': '<rootDir>/src/fs/operations.ts',
    '^../../fs/operations\\.js$': '<rootDir>/src/fs/operations.ts',
    
    // Handle external module issues
    '^ink-gradient$': '<rootDir>/tests/test-utils/mocks/ink-gradient.js',
    '^ink-big-text$': '<rootDir>/tests/test-utils/mocks/ink-big-text.js',
    
    // Handle CSS imports (if any)
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/test-utils/styleMock.js',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/test-utils/fileMock.js'
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testMatch: [
    '**/src/**/*.test.[jt]s?(x)',
    '**/tests/**/*.test.[jt]s?(x)',
    '**/integration-tests/**/*.test.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/benchmarks/',
    '/coverage/',
    '/dist/',
    '/build/',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/jest.setup.js',
    '<rootDir>/src/ui/tests/setup.js'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
    '!src/ui/tests/**/*',
    '!src/**/index.ts',
    '!src/version.ts',
    '!src/**/*.test.{ts,tsx}',
    // Exclude files that are meant for testing
    '!src/test-utils/**/*',
  ],
  
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/tests/'
  ],
  coverageReporters: ['text', 'lcov', 'json-summary', 'html'],
  coverageThreshold: {
    'src/ui/themes/': {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95
    },
    'src/ui/contexts/ThemeContext.tsx': {
      statements: 90,
      branches: 65,
      functions: 95,
      lines: 90
    },
  },
  verbose: true,
  testTimeout: 30000,
  transformIgnorePatterns: [
    // Transform ESM modules that need to be processed by Jest
    'node_modules/(?!(chalk|terminal-link|ora|inquirer|ansi-escapes|table|strip-ansi|ink.*|react|node-fetch|@anthropic-ai|highlight\\.js|open|@jest/globals)/)'
  ],
  globals: {
    'ts-jest': {
      useESM: true,
    }
  },
  // Add Node.js fetch polyfill for Anthropic SDK
  setupFiles: ['<rootDir>/tests/jest.setup.js']
};