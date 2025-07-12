# Clean Architecture Refactoring Steps

This document outlines the detailed steps for refactoring the VibeX codebase to follow clean architecture principles, with a focus on the tool system as identified in the architecture analysis.

## 1. Directory Structure Refactoring

### 1.1 Core Domain Layer (src/core/)

```
src/core/
├── domain/              # Domain entities and value objects
│   ├── models/          # Core domain models
│   └── events/          # Domain events
├── tools/               # Tool domain interfaces and base classes
│   ├── interfaces.ts    # Core tool interfaces
│   ├── lifecycle.ts     # Tool lifecycle states
│   ├── base-tool.ts     # Base tool implementation
│   ├── file/            # File operation tools
│   ├── shell/           # Shell execution tools
│   ├── web/             # Web-related tools
│   └── mcp/             # MCP protocol tools
└── ports/               # Ports for the application layer
    ├── repositories/    # Repository interfaces
    └── services/        # Service interfaces
```

### 1.2 Application Layer (src/services/)

```
src/services/
├── tool/
│   ├── tool-registry-service.ts       # Tool registration and discovery
│   ├── tool-scheduler-service.ts      # Tool execution lifecycle
│   ├── tool-orchestration-service.ts  # Main orchestration service
│   └── validation-service.ts          # Parameter validation
├── git/
│   ├── git-checkpointing-service.ts   # Git checkpoint functionality
│   └── git-service.ts                 # Git operations
├── conversation/
│   └── conversation-tree-services.ts  # Conversation tree management
└── ui/
    ├── progress-service.ts            # Progress feedback
    └── confirmation-service.ts        # Tool confirmation handling
```

### 1.3 Infrastructure Layer (src/infrastructure/)

```
src/infrastructure/
├── repositories/        # Repository implementations
├── persistence/         # Storage and persistence
│   ├── file-storage/    # File system operations
│   ├── memory-storage/  # In-memory storage
│   └── config-storage/  # Configuration storage
├── transports/          # Communication transports
│   ├── http/            # HTTP communication
│   ├── sse/             # Server-Sent Events
│   ├── websocket/       # WebSocket communication
│   └── stdio/           # Standard I/O streams
├── providers/           # External service providers
│   ├── claude/          # Claude API integration
│   ├── mcp/             # MCP integration
│   └── web/             # Web APIs integration
└── adapters/            # Adapters for external systems
    ├── legacy/          # Legacy adapters for backward compatibility
    └── external/        # External system adapters
```

### 1.4 UI Layer (src/ui/)

```
src/ui/
├── components/          # React components
│   ├── tool/            # Tool-related components
│   │   ├── confirmation/   # Tool confirmation dialogs
│   │   ├── execution/      # Tool execution displays
│   │   └── result/         # Tool result displays
│   └── ...
├── hooks/               # React hooks
│   ├── useToolExecution.ts   # Tool execution hook
│   ├── useToolConfirmation.ts # Tool confirmation hook
│   └── ...
└── contexts/            # React contexts
    ├── ToolContext.tsx  # Tool context provider
    └── ...
```

### 1.5 Tests Directory Structure

```
tests/
├── unit/               # Unit tests for individual components
│   ├── core/           # Tests for core domain
│   ├── services/       # Tests for application services
│   ├── infrastructure/ # Tests for infrastructure layer
│   └── ui/             # Tests for UI components
├── integration/        # Integration tests
│   ├── tool/           # Tool integration tests
│   └── ...
├── e2e/                # End-to-end tests
└── property/           # Property-based tests
```

## 2. Refactoring Steps by Layer

### 2.1 Core Domain Layer

#### Step 1: Tool Interface Definitions

1. Create the base tool interfaces in `src/core/tools/interfaces.ts`
2. Define the tool lifecycle states in `src/core/tools/lifecycle.ts`
3. Implement the base tool class in `src/core/tools/base-tool.ts`

#### Step 2: Domain Models

1. Define core domain models in `src/core/domain/models/`
2. Create domain events in `src/core/domain/events/`
3. Define value objects for parameter validation

#### Step 3: Repository Interfaces

1. Define repository interfaces in `src/core/ports/repositories/`
2. Create service interfaces in `src/core/ports/services/`

### 2.2 Application Layer

#### Step 1: Tool Services

1. Implement `ToolRegistryService` in `src/services/tool/tool-registry-service.ts`
2. Create `ToolSchedulerService` in `src/services/tool/tool-scheduler-service.ts`
3. Implement `ValidationService` in `src/services/tool/validation-service.ts`
4. Build `ToolOrchestrationService` in `src/services/tool/tool-orchestration-service.ts`

#### Step 2: Supporting Services

1. Refactor Git services to `src/services/git/`
2. Move conversation tree services to `src/services/conversation/`
3. Create UI feedback services in `src/services/ui/`

### 2.3 Infrastructure Layer

#### Step 1: Repository Implementations

1. Create repository implementations in `src/infrastructure/repositories/`
2. Implement persistence adapters in `src/infrastructure/persistence/`

#### Step 2: External Integrations

1. Implement Claude API integration in `src/infrastructure/providers/claude/`
2. Create MCP client in `src/infrastructure/providers/mcp/`
3. Implement web fetch and search in `src/infrastructure/providers/web/`

#### Step 3: Communication Transports

1. Move transport implementations to `src/infrastructure/transports/`
2. Create adapters for legacy components in `src/infrastructure/adapters/legacy/`

### 2.4 UI Layer

#### Step 1: Tool UI Components

1. Create tool confirmation dialogs in `src/ui/components/tool/confirmation/`
2. Implement tool execution displays in `src/ui/components/tool/execution/`
3. Build tool result displays in `src/ui/components/tool/result/`

#### Step 2: Tool-Related Hooks

1. Create `useToolExecution` hook in `src/ui/hooks/useToolExecution.ts`
2. Implement `useToolConfirmation` hook in `src/ui/hooks/useToolConfirmation.ts`

#### Step 3: Tool Context

1. Create tool context provider in `src/ui/contexts/ToolContext.tsx`

## 3. Core Tool Implementation

### 3.1 File Tools

1. Implement `ReadFileTool` in `src/core/tools/file/read-file-tool.ts`
2. Create `WriteFileTool` in `src/core/tools/file/write-file-tool.ts`
3. Implement `EditFileTool` in `src/core/tools/file/edit-file-tool.ts`
4. Create `GlobTool` in `src/core/tools/file/glob-tool.ts`
5. Implement `GrepTool` in `src/core/tools/file/grep-tool.ts`

### 3.2 Shell Tools

1. Implement `ShellTool` in `src/core/tools/shell/shell-tool.ts`
2. Create proper confirmation and safety checks

### 3.3 Web Tools

1. Implement `WebFetchTool` in `src/core/tools/web/web-fetch-tool.ts`
2. Create `WebSearchTool` in `src/core/tools/web/web-search-tool.ts`

### 3.4 MCP Tools

1. Create `McpTool` base class in `src/core/tools/mcp/mcp-tool.ts`
2. Implement MCP discovery in `src/core/tools/mcp/mcp-discovery.ts`

## 4. Integration and Migration

### 4.1 Legacy Adapter Implementation

1. Create `LegacyToolRegistry` adapter in `src/infrastructure/adapters/legacy/legacy-tool-registry.ts`
2. Implement `LegacyToolExecutor` in `src/infrastructure/adapters/legacy/legacy-tool-executor.ts`

### 4.2 API Migration

1. Update API entry points to use new services
2. Create facade pattern for backward compatibility
3. Implement proper dependency injection

### 4.3 UI Integration

1. Update UI components to use new services
2. Integrate new confirmation dialogs
3. Add progress indicators for tool execution

## 5. Testing Strategy

### 5.1 Unit Tests

1. Create unit tests for core domain interfaces and classes
2. Implement tests for application services
3. Write tests for infrastructure components
4. Create unit tests for UI components

### 5.2 Integration Tests

1. Implement integration tests for tool execution flow
2. Create tests for service interactions
3. Test legacy adapter compatibility

### 5.3 End-to-End Tests

1. Create end-to-end tests for complete user flows
2. Test performance and reliability

## 6. Incremental Migration Plan

### Phase 1: Core Infrastructure (Weeks 1-2)

1. Set up the new directory structure
2. Create core domain interfaces and classes
3. Implement basic application services
4. Write unit tests for core components

### Phase 2: Tool Migration (Weeks 3-4)

1. Implement file tools in the new architecture
2. Create shell tools with proper confirmation
3. Build web and MCP tools
4. Write integration tests

### Phase 3: Legacy Integration (Weeks 5-6)

1. Create legacy adapters for backward compatibility
2. Update API entry points
3. Integrate with existing UI components
4. Test and fix integration issues

### Phase 4: UI Enhancement (Weeks 7-8)

1. Create new UI components for tool execution
2. Implement improved confirmation dialogs
3. Add progress indicators
4. Run end-to-end tests

### Phase 5: Cleanup and Documentation (Week 9)

1. Remove deprecated code
2. Clean up legacy adapters
3. Update documentation
4. Final testing and performance optimization

## 7. File Migration Examples

### 7.1 Tool Registry Migration

**From:** `src/tools/index.ts`  
**To:** `src/services/tool/tool-registry-service.ts`

```typescript
// Before (in src/tools/index.ts)
class ToolRegistry {
  private readonly tools = new Map<string, { definition: ToolDefinition; handler: ToolHandler }>();
  
  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
  }
  
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }
}

// After (in src/services/tool/tool-registry-service.ts)
export class ToolRegistryService {
  private tools = new Map<string, Tool>();
  private namespaces = new Map<string, Set<string>>();

  registerTool(tool: Tool, namespace = 'default'): void {
    const fullName = this.getFullToolName(namespace, tool.name);
    this.tools.set(fullName, tool);
    
    // Track namespace membership
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Set());
    }
    this.namespaces.get(namespace)!.add(fullName);
  }

  getTool(name: string, namespace = 'default'): Tool | undefined {
    const fullName = this.getFullToolName(namespace, name);
    return this.tools.get(fullName);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
}
```

### 7.2 Read File Tool Migration

**From:** `src/tools/read-file.ts`  
**To:** `src/core/tools/file/read-file-tool.ts`

```typescript
// Before (simplified from src/tools/index.ts)
toolRegistry.register({
  name: 'read_file',
  description: 'Read the contents of a file',
  input_schema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to the file to read'
      }
    },
    required: ['path']
  }
}, async (input): Promise<InternalToolResult> => {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(input.path as string, 'utf-8');
    return {
      success: true,
      result: {
        content,
        path: input.path
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file: ${error.message}`
    };
  }
});

// After (in src/core/tools/file/read-file-tool.ts)
export class ReadFileTool extends BaseTool<ReadFileParams> {
  constructor() {
    super(
      'read_file',
      'Read File',
      'Reads the content of a file from the filesystem',
      {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: 'The path to the file to read'
          },
          offset: {
            type: 'number',
            description: 'Line number to start reading from (optional)'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of lines to read (optional)'
          }
        },
        required: ['file_path']
      }
    );
  }

  async execute(
    params: ReadFileParams,
    signal: AbortSignal
  ): Promise<ToolResult> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(params.file_path, 'utf-8');
      
      return {
        llmContent: content,
        displayContent: content
      };
    } catch (error) {
      throw new Error(`Failed to read file ${params.file_path}: ${error.message}`);
    }
  }
}
```

## 8. Dependency Management

1. Use dependency injection for service instantiation
2. Create service factory for proper initialization
3. Use interfaces for loose coupling
4. Implement proper error handling and logging

## 9. Documentation Updates

1. Update developer documentation with new architecture
2. Create tool development guide
3. Document migration process
4. Update user documentation for new features

## 10. Monitoring and Metrics

1. Add performance metrics to tool execution
2. Implement logging for debugging and monitoring
3. Create telemetry for tool usage statistics

By following these steps, we will successfully refactor the VibeX codebase to follow clean architecture principles, with a particular focus on improving the tool system as identified in the architecture analysis.

The refactoring will be done incrementally to maintain functionality throughout the process, starting with the core domain interfaces and gradually migrating each component to the new architecture.