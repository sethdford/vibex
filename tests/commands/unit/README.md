# Commands Module Unit Tests

This directory contains unit tests for the Commands module components.

## Components to Test

- Command registration
- Command loading
- Command execution
- Command parameter validation

## Running Tests

```bash
# Run all commands unit tests
npm test -- --testPathPattern="tests/commands/unit"

# Run a specific test file
npm test -- --testPathPattern="tests/commands/unit/register.test.ts"
```