# Vibex Tests

This directory contains comprehensive tests for all Vibex modules, organized into multiple testing layers.

## Test Directory Structure

```
tests/
├── ai/               # AI module tests
│   ├── unit/         # Unit tests
│   ├── integration/  # Integration tests
│   ├── e2e/          # End-to-end tests
│   └── property/     # Property-based tests
├── auth/             # Auth module tests
├── codebase/         # Codebase module tests
├── commands/         # Commands module tests
├── config/           # Config module tests
├── errors/           # Errors module tests
├── execution/        # Execution module tests
├── fileops/          # File operations module tests
├── fs/               # Filesystem module tests
├── memory/           # Memory module tests
├── security/         # Security module tests
├── services/         # Services module tests
├── settings/         # Settings module tests
├── telemetry/        # Telemetry module tests
├── terminal/         # Terminal module tests
├── themes/           # Themes module tests
├── tools/            # Tools module tests
├── ui/               # UI module tests
└── utils/            # Utils module tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific module
npm test -- --testPathPattern="tests/ai"

# Run specific test category
npm test -- --testPathPattern="tests/ai/unit"

# Run with coverage
npm test -- --coverage
```

## Continuous Testing

For continuous testing during development:

```bash
# Use watch mode
npm test -- --testPathPattern="tests/ai" --watch

# Or use the specialized watch script for a module
./tests/ai/watch-and-test.sh
```

## Test Validation

To validate a module's architecture:

```bash
# Run validation script for a specific module
./tests/<module>/validate-architecture.sh
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

For more details, see [TEST_STRATEGY.md](./TEST_STRATEGY.md)