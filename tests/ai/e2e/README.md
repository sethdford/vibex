# End-to-End Tests for AI Module

This directory contains end-to-end tests that verify complete workflows of the AI module.

## Test Scope

- **Complete Query Flow**: From user query to final response
- **Tool Call Flow**: From query to tool call to tool result submission
- **Memory Optimization Flow**: Token limit handling and optimization

## Running Tests

```bash
# Run all E2E tests
npm test -- --testPathPattern="tests/ai/e2e"

# Run with coverage
npm test -- --testPathPattern="tests/ai/e2e" --coverage
```

## Writing E2E Tests

End-to-end tests should simulate real user interactions with minimal mocking, testing complete workflows.