# MCP Client Integration for Clean Architecture

This document outlines the implementation of MCP (Model Context Protocol) client integration with our Clean Architecture tool system.

## Components Implemented

### Core Components

1. **MCPToolAdapter** (`/src/core/adapters/tools/mcp-client-adapter.ts`)
   - Adapts external MCP tools to our Clean Architecture tool interface
   - Handles execution, validation, and confirmation requirements
   - Properly maps MCP schema to our tool parameter schema

2. **MCPToolFactory** (`/src/core/adapters/tools/mcp-client-adapter.ts`)
   - Creates MCP tool adapters from MCP servers
   - Manages connection to MCP servers and tool discovery
   - Handles disconnection and cleanup

3. **MCPService** (`/src/core/domain/tool/mcp/mcp-service.ts`)
   - Domain service for working with MCP servers and tools
   - Provides connection management, server status, and tool execution
   - Integrated with the event bus for system-wide notifications

### Integration Components

4. **Tool Registration** (`/src/core/adapters/tools/index.ts`)
   - Added `registerMCPTools()` to create and register MCP tool adapters
   - Updated `registerAllTools()` to include MCP tools
   - Enhanced configuration to support MCP-specific settings

5. **Core Initialization** (`/src/core/initialization.ts`)
   - Added MCPService to the core initialization
   - Included MCPService in returned services for system-wide access
   - Made initialization handle MCP configuration properly

6. **Compatibility Layer** (`/src/core/adapters/compat/mcp-tools-compat.ts`)
   - Implemented backward compatibility for legacy code
   - Exposed familiar API for connecting to servers and executing tools
   - Mapped old API calls to new Clean Architecture components

7. **Testing** (`/src/core/adapters/tools/tests/mcp-tools.test.ts`)
   - Comprehensive tests for MCPToolAdapter and MCPToolFactory
   - Mock MCPClient for isolated testing
   - Tests for validation, execution, error handling and progress reporting

## Key Design Decisions

1. **Namespace Separation**: Each MCP server gets its own namespace, with tools prefixed by the server name.
2. **Lazy Initialization**: MCP servers are only connected when explicitly requested.
3. **Event-Driven Updates**: The system uses events to notify about MCP server status changes.
4. **Error Handling**: Robust error handling for connection, execution and disconnection failures.
5. **Parameter Validation**: MCPToolAdapter validates parameters before execution.
6. **Progress Reporting**: Support for progress reporting during MCP tool execution.

## Usage Example

```typescript
// Connect to an MCP server
await mcpService.connectServer({
  name: 'my-server',
  command: 'mcp-server',
  args: ['--port', '8080'],
  trust: true
});

// Execute an MCP tool
const result = await toolAPI.executeTool('my-server__my-tool', {
  param1: 'value1',
  param2: 'value2'
});

// Using compatibility layer
await connectMCPServer({
  name: 'my-server',
  command: 'mcp-server',
  args: ['--port', '8080']
});

const result = await executeMCPTool('my-server__my-tool', {
  param1: 'value1',
  param2: 'value2'
});
```

## Next Steps

1. **UI Components**: Create UI components for MCP tool confirmations and progress feedback
2. **Integration Testing**: Implement comprehensive integration tests with real MCP servers
3. **Documentation**: Add detailed documentation for MCP tool usage and configuration