# Tools Module Tests

This directory contains tests for the Tools module.

## Test Categories

- **Unit Tests**: Test individual tool components
- **Integration Tests**: Test tools working together
- **E2E Tests**: Test complete tool workflows
- **Property Tests**: Test tool invariants

## Running Tests

```bash
# Run all tools tests
npm test -- --testPathPattern="tests/tools"

# Run with coverage
npm test -- --testPathPattern="tests/tools" --coverage
```