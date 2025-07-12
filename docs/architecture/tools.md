# VibeX Tool System Architecture

This document describes the clean architecture-based design of the VibeX tool system, a key component of the VibeX platform.

## Overview

The VibeX tool system follows clean architecture principles, with clear separation between domain logic and infrastructure concerns. The architecture is organized into the following layers:

1. **Core Domain Layer**: Contains the business rules, interfaces, and entities
2. **Application Layer**: Contains the services that orchestrate the use cases
3. **Infrastructure Layer**: Handles external integrations and implementations
4. **UI Layer**: Provides user interfaces for interacting with the tools

## Core Domain Layer

The core domain layer defines the essential business rules and entities for the tool system.

### Key Interfaces and Entities

- `Tool`: The primary entity representing an executable tool
- `ToolResult`: Represents the result of a tool execution
- `ToolCallRequest`: Represents a request to execute a tool
- `ToolConfirmation`: Represents a confirmation request for tool execution
- `EventBus`: Interface for the event-driven communication system

### Base Tool Interface

The `Tool` interface defines the contract for all tools:

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult>;
  validateParams(params: unknown): string | null;
  shouldConfirmExecute(params: unknown): Promise<ToolConfirmationDetails | null>;
  getMetadata(): ToolMetadata;
}
```

## Application Layer Services

The application layer contains services that implement the use cases of the tool system.

### Key Services

#### ToolRegistryService

Manages the registration and discovery of tools, with namespace support.

- **Responsibilities**:
  - Register tools with namespaces
  - Look up tools by name or namespace
  - Maintain tool metadata
  - Support tool categorization

#### ValidationService

Validates tool parameters against schemas.

- **Responsibilities**:
  - Validate parameters against JSON schemas
  - Provide detailed validation error messages
  - Support custom validation rules
  - Cache validation schemas for performance

#### ToolSchedulerService

Manages the lifecycle of tool executions.

- **Responsibilities**:
  - Schedule tool executions
  - Manage tool call states
  - Handle confirmation flows
  - Provide execution status updates

#### ConfirmationService

Handles tool execution confirmations.

- **Responsibilities**:
  - Display confirmation prompts to users
  - Process user responses
  - Manage trust levels for tools
  - Provide different confirmation UIs

#### CheckpointService

Creates safety checkpoints before destructive operations.

- **Responsibilities**:
  - Create checkpoints before risky operations
  - Manage checkpoint expiration
  - Restore from checkpoints when needed
  - Track modified resources

#### ToolExecutionService

Executes individual tools safely.

- **Responsibilities**:
  - Execute tool operations
  - Provide progress feedback
  - Handle execution errors
  - Support cancellation
  - Maintain execution statistics

#### ToolOrchestrationService

Coordinates the overall tool system.

- **Responsibilities**:
  - Initialize and configure the tool system
  - Coordinate between different services
  - Provide a simplified API for tool execution
  - Handle error recovery and retries

## Infrastructure Layer

The infrastructure layer implements the interfaces defined in the domain layer.

### Key Components

- **EventBusImpl**: Provides in-memory event bus implementation
- **SchemaValidatorImpl**: Implements JSON schema validation
- **GitCheckpointImpl**: Implements Git-based checkpoints
- **McpClientImpl**: Implements communication with MCP servers

## UI Layer Integration

The UI layer integrates with the tool system through React hooks and components.

### Key Components

- **ToolProvider**: React context provider for tool services
- **useToolExecution**: Hook for executing tools
- **ToolConfirmationDialog**: Component for displaying confirmation dialogs

## Service Orchestration

### Tool Execution Flow

1. UI/API calls `ToolOrchestrationService.executeTools()`
2. `ToolOrchestrationService` delegates to `ToolSchedulerService`
3. `ToolSchedulerService`:
   - Looks up the tool via `ToolRegistryService`
   - Validates parameters via `ValidationService`
   - Checks if confirmation is needed
   - If needed, requests confirmation via `ConfirmationService`
   - Schedules execution
4. `ToolExecutionService`:
   - Creates checkpoint if needed via `CheckpointService`
   - Executes the tool
   - Provides progress feedback to UI
   - Returns result
5. `ToolSchedulerService` updates tool call state and notifies listeners
6. `ToolOrchestrationService` processes results

## Event-Driven Architecture

The tool system uses an event-driven architecture for loose coupling between components:

1. Services publish events via the `EventBus`
2. Other services can subscribe to relevant events
3. Events include:
   - Tool registration events
   - Tool execution events
   - Confirmation events
   - Checkpoint events

## Dependency Injection

Services are instantiated and wired together using a dependency injection approach:

```typescript
// Create core services
const validation = createValidationService();
const registry = createToolRegistry(eventBus);
const confirmation = createConfirmationService(config.confirmation);
const checkpoint = createCheckpointService(config.git);
const execution = createToolExecutionService(validation, checkpoint);
const discovery = createToolDiscovery(registry, config.mcp);

// Create scheduler with dependencies
const scheduler = createToolScheduler(
  registry,
  validation,
  confirmation,
  execution,
  callbacks
);

// Create orchestration service with all dependencies
const orchestration = createToolOrchestration(config);
```

## Simplified API

The `VibeXToolAPI` class provides a simplified API for integrating with the tool system:

```typescript
// Create a tool API instance
const toolAPI = createToolAPI();

// Configure the tool system
toolAPI.configure({
  git: { enableCheckpoints: true },
  confirmation: { requireForDangerous: true }
});

// Register a tool
toolAPI.registerTool(myTool);

// Execute a tool
const result = await toolAPI.executeTool('my_tool', { param: 'value' });
```

## Benefits of the Architecture

1. **Separation of Concerns**: Each service has a clear, focused responsibility
2. **Testability**: Services can be tested in isolation
3. **Flexibility**: Services can be easily replaced or extended
4. **Error Handling**: Comprehensive error handling and recovery strategies
5. **Extensibility**: Easy to add new tools and capabilities

## Future Enhancements

1. **Persistent Tool Registry**: Store tool registrations in a database
2. **Remote Tool Execution**: Support executing tools on remote servers
3. **Tool Composition**: Support composing tools into workflows
4. **Tool Versioning**: Support versioning of tools
5. **Tool Permissions**: Fine-grained permission control for tool execution