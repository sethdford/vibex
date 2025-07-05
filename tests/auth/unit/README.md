# Auth Module Unit Tests

This directory contains unit tests for the Auth module components.

## Components to Test

- Token management
- OAuth flows
- Authentication validation
- Permission checking

## Running Tests

```bash
# Run all auth unit tests
npm test -- --testPathPattern="tests/auth/unit"

# Run a specific test file
npm test -- --testPathPattern="tests/auth/unit/tokens.test.ts"
```