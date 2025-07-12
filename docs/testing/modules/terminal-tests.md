# Terminal Module Tests

This directory contains tests for the Terminal module.

## Test Categories

- **Unit Tests**: Test individual terminal components
- **Integration Tests**: Test terminal components working together
- **E2E Tests**: Test complete terminal workflows

## Running Tests

```bash
# Run all terminal tests
npm test -- --testPathPattern="tests/terminal"

# Run with coverage
npm test -- --testPathPattern="tests/terminal" --coverage
```