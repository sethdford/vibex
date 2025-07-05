# AI Module Tests

This directory contains comprehensive tests for the AI module, organized into multiple testing layers.

## Test Directory Structure

- **tests/ai/unit/**: Unit tests for individual components
- **tests/ai/integration/**: Integration tests for components working together
- **tests/ai/e2e/**: End-to-end tests for complete workflows
- **tests/ai/property/**: Property-based tests for invariant verification

## Running Tests

```bash
# Run all AI module tests
npm test -- --testPathPattern="tests/ai"

# Run specific test category
npm test -- --testPathPattern="tests/ai/unit"
npm test -- --testPathPattern="tests/ai/integration"
npm test -- --testPathPattern="tests/ai/e2e"
npm test -- --testPathPattern="tests/ai/property"

# Run with coverage
npm test -- --testPathPattern="tests/ai" --coverage
```

## Continuous Testing

For continuous testing during development:

```bash
# Use watch mode
npm test -- --testPathPattern="tests/ai" --watch

# Or use the specialized watch script
./src/ai/watch-and-test.sh
```

## Test Validation

To validate the architecture:

```bash
# Run architecture validation script
node src/ai/validate-architecture.js

# Run validation during refactoring
./src/ai/validate-refactoring.sh
```

## Coverage Requirements

We maintain strict coverage requirements:

- **Line Coverage**: Minimum 90%
- **Branch Coverage**: Minimum 85%
- **Function Coverage**: Minimum 95%

## Test Types

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test components working together
3. **End-to-End Tests**: Test complete workflows
4. **Property-Based Tests**: Test invariants regardless of inputs

For more details, see [TEST_STRATEGY.md](/src/ai/TEST_STRATEGY.md).