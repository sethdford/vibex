# Config Module Tests

This directory contains tests for the Config module.

## Test Categories

- **Unit Tests**: Test individual config components
- **Integration Tests**: Test config components working together
- **E2E Tests**: Test complete config workflows
- **Property Tests**: Test config invariants

## Running Tests

```bash
# Run all config tests
npm test -- --testPathPattern="tests/config"

# Run with coverage
npm test -- --testPathPattern="tests/config" --coverage
```