/**
 * Jest configuration for Claude Code tests
 */

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testMatch: [
    '**/src/**/*.test.[jt]s?(x)',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/ui/tests/setup.ts'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/ui/**/*.{ts,tsx}',
    '!src/ui/tests/**/*',
    '!src/ui/**/*.d.ts',
  ],
  coverageReporters: ['text', 'lcov'],
  verbose: true,
};