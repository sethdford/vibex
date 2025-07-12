# VibeX Core

## Overview

The VibeX core implements a clean architecture for the tool system, with a focus on:

1. Separation of concerns
2. Testability
3. Flexibility
4. Error handling
5. Extensibility

## Architecture

The architecture is divided into layers:

- **Domain Layer**: Contains business rules, interfaces and entities
- **Application Layer**: Contains services that orchestrate the use cases
- **Adapters Layer**: Adapts the core to external systems and legacy code
- **Infrastructure Layer**: Handles external integrations
- **UI Layer**: Provides user interfaces

## Core Tools

The core tools implemented in this architecture are:

- **Read File Tool**: Read files from the filesystem
- **Write File Tool**: Write files to the filesystem with safety features
- **Shell Tool**: Execute shell commands with security controls

## Migration

The migration from the legacy architecture to the new one is done through adapters:

1. Legacy code calls the compatibility layer functions
2. These functions map to the new architecture
3. The new architecture handles the requests through the service layer
4. Results are mapped back to the legacy format

## Future Work

Future work includes:

- Adding more tools to the new architecture
- Implementing a UI layer for confirmations
- Adding more test coverage
- Improving error handling and recovery

## Usage

To use the new architecture in your code:

```typescript
import { toolAPI } from './core/domain/tool/tool-api';

// Execute a tool
const result = await toolAPI.executeTool('read_file', {
  file_path: '/path/to/file'
});

// Check the result
if (result.success) {
  console.log('File content:', result.data);
} else {
  console.error('Error:', result.error);
}
```

To use the legacy compatibility layer:

```typescript
import { readFile } from './core/adapters/compat';

// Use the legacy API
const result = await readFile({
  path: '/path/to/file'
});

// Check the result
if (result.success) {
  console.log('File content:', result.content);
} else {
  console.error('Error:', result.error);
}
```