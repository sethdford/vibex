# Commands Module Tests

This directory contains tests for the Commands module.

## Test Categories

- **Unit Tests**: Test individual command components
- **Integration Tests**: Test commands working together
- **E2E Tests**: Test complete command workflows

## Running Tests

```bash
# Run all commands tests
npm test -- --testPathPattern="tests/commands"

# Run with coverage
npm test -- --testPathPattern="tests/commands" --coverage
```