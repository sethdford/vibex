# Tools Module Unit Tests

This directory contains unit tests for the Tools module components.

## Components to Test

- Code analyzer
- Ripgrep utilities
- Screenshot tools
- Web fetcher
- MCP client

## Running Tests

```bash
# Run all tools unit tests
npm test -- --testPathPattern="tests/tools/unit"

# Run a specific test file
npm test -- --testPathPattern="tests/tools/unit/ripgrep.test.ts"
```