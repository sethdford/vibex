# Auth Module Tests

This directory contains tests for the Auth module.

## Test Categories

- **Unit Tests**: Test individual auth components
- **Integration Tests**: Test auth components working together
- **E2E Tests**: Test complete auth flows
- **Property Tests**: Test auth invariants

## Running Tests

```bash
# Run all auth tests
npm test -- --testPathPattern="tests/auth"

# Run with coverage
npm test -- --testPathPattern="tests/auth" --coverage
```