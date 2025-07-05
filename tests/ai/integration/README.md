# Integration Tests for AI Module

This directory contains integration tests for AI module components working together.

## Test Files

- **ai-architecture-integration.test.ts**: Tests the integration of multiple AI module components

## Running Tests

```bash
# Run all integration tests
npm test -- --testPathPattern="tests/ai/integration"

# Run a specific test file
npm test -- --testPathPattern="tests/ai/integration/ai-architecture-integration.test.ts"

# Run with coverage
npm test -- --testPathPattern="tests/ai/integration" --coverage
```

## Writing Integration Tests

Integration tests should focus on testing multiple components working together, with minimal mocking.