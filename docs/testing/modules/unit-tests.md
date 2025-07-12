# Errors Module Unit Tests

This directory contains unit tests for the Errors module components.

## Components to Test

- Error formatting
- Error creation
- Console error reporting
- Sentry integration

## Running Tests

```bash
# Run all errors unit tests
npm test -- --testPathPattern="tests/errors/unit"

# Run a specific test file
npm test -- --testPathPattern="tests/errors/unit/formatter.test.ts"
```