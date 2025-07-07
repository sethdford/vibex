/**
 * VibeX Test Configuration
 */

/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment setup
    environment: 'jsdom',  // Use jsdom for UI components, aligned with Gemini CLI
    globals: true,  // Enable global test functions (describe, it, expect, etc.)
    setupFiles: ['./src/ui/tests/setup.ts'],
    silent: false,  // Set to true in CI environments
    
    // Enable Jest compatibility
    includeSource: ['src/**/*.{js,ts,tsx}'],
    
    // Coverage configuration (Gemini CLI targets 85%+)
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,ts,tsx}'],
      reporter: [
        ['text', { file: 'full-text-summary.txt' }],
        'html',
        'json',
        'lcov',
        'cobertura',
        ['json-summary', { outputFile: 'coverage-summary.json' }],
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'src/ui/tests/**',
        'integration-tests/**',
        'benchmarks/**',
        'src/auth/instance.ts'  // Exclude missing file
      ],
      skipFull: true,  // Skip coverage for files that don't exist
      allowExternal: false  // Don't include external files
    },
    
    // Test file patterns - include all test files in project
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: [
      '**/node_modules/**', 
      '**/dist/**', 
      '**/benchmarks/**',
      '**/cypress/**'
    ],
    
    // Timeout settings
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Reporter settings
    reporters: ['default', 'junit'],
    outputFile: {
      junit: 'junit.xml',
    },
    
    // Mock settings
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    
    // Path resolution
    alias: {
      '@': resolve(__dirname, './src'),
      '@ui': resolve(__dirname, './src/ui'),
      '@services': resolve(__dirname, './src/services'),
      '@utils': resolve(__dirname, './src/utils')
    }
  },
  
  // Build settings for tests
  esbuild: {
    target: 'node18'
  },
  
  // Define global constants
  define: {
    'process.env.NODE_ENV': '"test"',
    'global.jest': 'global.vi'  // Map jest to vi for compatibility
  }
});
