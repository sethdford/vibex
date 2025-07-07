# VibeX Clean Architecture Documentation

This document provides an overview of the clean architecture implementation for the VibeX project, which follows similar patterns to those used in the Gemini CLI reference implementation.

## Architecture Overview

VibeX has been refactored to follow the principles of Clean Architecture, which promotes separation of concerns and independence of frameworks, UI, and databases. The architecture consists of the following layers:

1. **Core Domain Layer** - Contains the business logic and domain entities
2. **Use Cases Layer** - Contains application-specific business rules
3. **Interface Adapters Layer** - Converts data between the use cases and external frameworks
4. **Infrastructure Layer** - Contains frameworks, tools, and external services

## Layer Responsibilities

### Core Domain Layer (`src/core/domain/`)

This layer contains the core business logic and entities of the application:

- `Turn.ts` - Represents a conversation turn with the AI
- Domain entities representing the fundamental business objects
- Pure business logic that doesn't depend on any external frameworks

### Core Interfaces (`src/core/interfaces/`)

This layer defines the interfaces that the outer layers must implement:

- `types.ts` - Contains all the core interfaces like `ConversationRepository`, `ContentGenerator`, etc.
- These interfaces establish the contract between the core domain and outer layers

### Use Cases (`src/core/usecases/`)

This layer contains application-specific business rules:

- `conversation-manager.ts` - Handles conversation management use cases
- Use cases orchestrate the flow of data to and from domain entities

### Services Layer (`src/services/`)

This layer contains service implementations that coordinate between use cases and infrastructure:

- `conversation-service.ts` - Implements conversation-related operations
- `memory-service.ts` - Handles persistent storage of memory items
- `service-factory.ts` - Factory for creating services with proper dependency injection

### Infrastructure Layer (`src/infrastructure/`)

This layer contains implementations of the interfaces defined in the core domain:

- `repositories/file-conversation-repository.ts` - File-based implementation of ConversationRepository
- `apis/claude-api.ts` - Implementation of ContentGenerator for Claude API

### Adapters Layer (`src/adapters/`)

This layer contains adapters that convert data between the use cases and external interfaces:

- `cli-adapter.ts` - Adapter for CLI interface to interact with the services

### CLI Integration (`src/cli-integration.ts`)

This file provides integration between the CLI interface and the clean architecture components:

- Initializes the CLI with proper configuration
- Provides streaming callbacks for CLI output
- Handles tool call processing
- Manages the chat session lifecycle

## Data Flow

1. **User Input** → User types a message in the CLI
2. **CLI Integration** → Processes the message and sends it to the CLI Adapter
3. **CLI Adapter** → Formats the message and sends it to the Conversation Service
4. **Conversation Service** → Coordinates between the domain layer and infrastructure
5. **Use Cases** → Apply business rules and coordinate the flow of data
6. **Domain Entities** → Process the message according to business rules
7. **Infrastructure** → Interacts with external services (e.g., Claude API)
8. **Responses** → Flow back through the layers and are displayed to the user

## Testing Strategy

Each layer has its own suite of tests:

- **Domain Tests** - Test the core business logic in isolation
- **Use Case Tests** - Test application-specific business rules
- **Service Tests** - Test the coordination between use cases and infrastructure
- **Infrastructure Tests** - Test the external service implementations
- **Adapter Tests** - Test the data conversion between layers
- **Integration Tests** - Test the interaction between multiple components

## Key Components

### Turn System

The Turn system (`src/core/domain/turn.ts`) is a central part of the domain layer:

- Represents a conversation turn with the AI
- Manages the state of the turn (idle, in_progress, waiting_for_tool, completed, error)
- Handles content, tool calls, and thoughts from the AI
- Provides a clean interface for tracking the conversation flow

### Repository Pattern

The repository pattern is used to abstract the data access layer:

- `ConversationRepository` - Interface for conversation storage
- `FileConversationRepository` - File-based implementation
- This allows for easy swapping of storage implementations

### Service Factory

The Service Factory (`src/services/service-factory.ts`) provides dependency injection:

- Creates services with their dependencies
- Manages the lifecycle of service instances
- Provides a centralized point for configuration

### CLI Adapter

The CLI Adapter (`src/adapters/cli-adapter.ts`) connects the CLI interface to the services:

- Formats messages for terminal display
- Handles streaming responses
- Processes tool calls
- Manages the conversation lifecycle

## Usage Examples

### Simple Chat Mode

```typescript
// Initialize the CLI with API key
const adapter = await initializeCli({
  apiKey: 'your-api-key',
  defaultModel: 'claude-3-7-sonnet'
});

// Start a chat session
await runChatSession(adapter);
```

### Handling Tool Calls

```typescript
// Process a tool call
await processToolCall(
  adapter,
  toolCallId,
  'search',
  { query: 'clean architecture' }
);
```

### Streaming Response

```typescript
// Send a message with streaming response
await adapter.sendStreamingMessage('Hello, AI!', {
  onContent: (content) => process.stdout.write(content),
  onToolCall: (name, input) => console.log(`Using tool: ${name}`),
  onComplete: () => console.log('\nResponse complete!')
});
```

## Dependencies

The clean architecture implementation has the following key dependencies:

- **Core Domain** - No external dependencies
- **Use Cases** - Depends only on the core domain interfaces
- **Services** - Depends on use cases and infrastructure interfaces
- **Infrastructure** - Implements infrastructure-specific functionality
- **Adapters** - Converts between services and external interfaces
- **CLI Integration** - Connects the CLI interface to the adapters

## Future Improvements

- Add more infrastructure implementations (e.g., database repositories)
- Create additional adapters for different interfaces (e.g., web API)
- Enhance the tool call system with more tools
- Add more comprehensive error handling
- Improve the memory management system