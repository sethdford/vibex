# Unit Tests for AI Module

This directory contains unit tests for individual AI module components.

## Test Files

- **index.test.ts**: Tests the main entry point functions (initAI, getAIClient, etc.)
- **turn-manager.test.ts**: Tests the turn management system
- **unified-client.test.ts**: Tests the unified client interface

## Running Tests

```bash
# Run all unit tests
npm test -- --testPathPattern="tests/ai/unit"

# Run a specific test file
npm test -- --testPathPattern="tests/ai/unit/turn-manager.test.ts"

# Run with coverage
npm test -- --testPathPattern="tests/ai/unit" --coverage
```

## Writing Unit Tests

Unit tests should focus on testing components in isolation, with dependencies properly mocked.