# Config Module Unit Tests

This directory contains unit tests for the Config module components.

## Components to Test

- Configuration loading
- Schema validation
- Default configuration
- Configuration merging

## Running Tests

```bash
# Run all config unit tests
npm test -- --testPathPattern="tests/config/unit"

# Run a specific test file
npm test -- --testPathPattern="tests/config/unit/schema.test.ts"
```