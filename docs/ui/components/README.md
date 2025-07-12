# Tool Group Display Component

The Tool Group Display component provides a comprehensive interface for browsing, searching, and executing tools organized into logical groups.

## Features

- **Tool Grouping**: Organize tools by namespace, tags, or custom grouping
- **Search**: Filter tools by name, description, tags, or namespace
- **Documentation**: View detailed tool documentation with parameters
- **Examples**: See and run tool usage examples
- **Execution**: Execute tools with custom parameters directly from the UI

## Components

### 1. ToolGroupDisplay

The main component that renders the entire interface.

```tsx
import { ToolGroupDisplay, useToolRegistry } from './ui/components/tool/group';

// In your component
const { groups, executeTool } = useToolRegistry();

<ToolGroupDisplay
  groups={groups}
  width={80}
  height={30}
  searchEnabled={true}
  executionEnabled={true}
  onToolExecute={executeTool}
/>
```

### 2. ToolGroupItem

Displays a single tool group with a header and expandable list of tools.

### 3. ToolItem

Displays a single tool with expandable documentation.

### 4. ToolDocumentation

Displays detailed documentation for a specific tool, including parameters and examples.

### 5. ToolExampleItem

Displays a tool usage example with parameters and execution button.

### 6. SearchBox

Provides search functionality for filtering tools.

### 7. useToolRegistry

A hook that integrates with the tool registry to provide tool data and execution capabilities.

## Props

### ToolGroupDisplay Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `groups` | `ToolGroup[]` | - | Tool groups to display |
| `width` | `number` | - | Terminal width for responsive layout |
| `height` | `number` | - | Maximum height for the component |
| `searchEnabled` | `boolean` | `true` | Whether search functionality is enabled |
| `initialSearch` | `string` | `''` | Initial search query |
| `executionEnabled` | `boolean` | `true` | Whether tool execution is enabled |
| `executionOptions` | `ToolExecutionOptions` | `{}` | Tool execution options |
| `groupByNamespace` | `boolean` | `true` | Whether to group tools by namespace |
| `onToolSelect` | `(tool: Tool) => void` | - | Callback when a tool is selected |
| `onToolExecute` | `(tool: Tool, parameters: Record<string, any>) => Promise<any>` | - | Callback when a tool is executed |
| `isFocused` | `boolean` | `true` | Whether the component is focused |
| `onFocusChange` | `(focused: boolean) => void` | - | Callback when focus changes |

## Data Types

### Tool

```typescript
interface Tool {
  id: string;
  name: string;
  namespace?: string;
  description: string;
  parameters: ToolParameter[];
  tags?: string[];
  examples?: ToolExample[];
  documentation?: string;
}
```

### ToolGroup

```typescript
interface ToolGroup {
  id: string;
  name: string;
  description?: string;
  tools: Tool[];
  expanded?: boolean;
  tags?: string[];
}
```

## Customization

### Custom Grouping

You can customize how tools are grouped using the `useToolRegistry` hook:

```typescript
const { groups } = useToolRegistry({
  groupBy: 'custom',
  customGrouping: (tools) => {
    // Your custom grouping logic
    return [
      {
        id: 'file-tools',
        name: 'File Operations',
        tools: tools.filter(tool => 
          tool.tags?.includes('file') || 
          tool.namespace === 'fs'
        )
      },
      // More groups...
    ];
  }
});
```

### Custom Tool Execution

You can provide your own tool execution function:

```typescript
const handleToolExecute = async (tool, parameters) => {
  // Your custom execution logic
  const result = await yourToolExecutionService.execute(tool.id, parameters);
  return result;
};

<ToolGroupDisplay
  // ...
  onToolExecute={handleToolExecute}
/>
```

## Integration with Tool Registry

The `useToolRegistry` hook provides an easy way to integrate with the tool registry:

```typescript
const { 
  tools,      // All available tools
  groups,     // Tools grouped according to options
  loading,    // Whether tools are loading
  error,      // Error if any
  executeTool // Function to execute a tool
} = useToolRegistry({
  groupBy: 'namespace' // 'namespace', 'tags', or 'custom'
});
```

## Example Usage

```tsx
import React from 'react';
import { Box } from 'ink';
import { ToolGroupDisplay, useToolRegistry } from './ui/components/tool/group';

export const ToolBrowser = () => {
  const { groups, loading, error, executeTool } = useToolRegistry();

  if (loading) {
    return <Box>Loading tools...</Box>;
  }

  if (error) {
    return <Box>Error: {error.message}</Box>;
  }

  return (
    <ToolGroupDisplay
      groups={groups}
      width={100}
      height={40}
      searchEnabled={true}
      executionEnabled={true}
      onToolExecute={executeTool}
    />
  );
};
```