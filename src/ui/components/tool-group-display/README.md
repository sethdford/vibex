# Tool Group Display Component

The Tool Group Display component is part of the VibeX UI Enhancement Plan. It provides a visual interface for exploring and interacting with tools in the system, organized by categories or namespaces.

## Features

- Groups tools by namespace/category for easy navigation
- Allows searching and filtering tools by name, description, or tags
- Displays detailed tool documentation and parameters
- Shows interactive examples for each tool
- Supports tool execution directly from the UI
- Progressive disclosure of tool details through expandable sections
- Consistent styling with other VibeX UI components

## Component Structure

The Tool Group Display consists of several interconnected components:

- `ToolGroupDisplay`: Main container component that organizes tools into groups
- `ToolGroupItem`: Represents a single collapsible tool group
- `ToolItem`: Displays an individual tool with expandable documentation
- `ToolDocumentation`: Shows detailed documentation for a tool
- `ToolExampleItem`: Displays a usage example for a tool
- `SearchBox`: Provides search functionality for filtering tools

## Usage

```tsx
import { ToolGroupDisplay } from '../../ui';
import { useToolRegistry } from '../../hooks';

const MyComponent = () => {
  // Get tools from registry
  const { tools } = useToolRegistry();
  
  // Handle tool execution
  const handleToolExecute = (request) => {
    console.log(`Executing tool: ${request.name} with params:`, request.params);
  };

  return (
    <ToolGroupDisplay
      // Auto-group tools by namespace
      groupingFunction={(tools) => {
        // Custom grouping logic
        return [/* groups */];
      }}
      showSearch={true}
      showDocumentation={true}
      showExamples={true}
      allowExecution={true}
      onToolExecute={handleToolExecute}
    />
  );
};
```

## Custom Grouping

You can customize how tools are grouped by providing your own `groupingFunction`:

```tsx
<ToolGroupDisplay
  groupingFunction={(tools) => {
    // Group tools by their first tag
    const groups = new Map();
    
    tools.forEach(tool => {
      const metadata = tool.getMetadata();
      const firstTag = metadata.tags?.[0] || 'uncategorized';
      
      if (!groups.has(firstTag)) {
        groups.set(firstTag, []);
      }
      
      groups.get(firstTag).push(tool);
    });
    
    return Array.from(groups.entries()).map(([name, tools]) => ({
      name,
      description: `Tools with tag "${name}"`,
      tools,
      isExpanded: false
    }));
  }}
/>
```

## Props

### ToolGroupDisplay

| Prop | Type | Description |
|------|------|-------------|
| `groups` | `ToolGroup[]` | Optional pre-defined groups |
| `groupingFunction` | `(tools: Tool[]) => ToolGroup[]` | Custom grouping function |
| `filterFunction` | `(tool: Tool) => boolean` | Filter function for tools |
| `initialSearch` | `string` | Initial search query |
| `showSearch` | `boolean` | Whether to show search box |
| `showDocumentation` | `boolean` | Whether to show documentation |
| `showExamples` | `boolean` | Whether to show examples |
| `allowExecution` | `boolean` | Whether to allow execution |
| `terminalWidth` | `number` | Terminal width for responsive layout |
| `onToolSelect` | `(tool: Tool) => void` | Callback when tool is selected |
| `onToolExecute` | `(request: ToolCallRequest) => void` | Callback when tool is executed |
| `onGroupToggle` | `(groupName: string) => void` | Callback when group is toggled |

## Integration with Tool Registry

To use this component with the actual Tool Registry service:

```tsx
import React, { useEffect, useState } from 'react';
import { Box } from 'ink';
import { ToolGroupDisplay } from '../../ui';
import { createToolRegistry } from '../../core/domain/tool/registry/tool-registry';
import { createToolFactory } from '../../core/domain/tool/factory/tool-factory';
import { Tool } from '../../core/domain/tool/tool-interfaces';

const ToolExplorer = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  
  useEffect(() => {
    // Create tool registry and factory
    const registry = createToolRegistry();
    const factory = createToolFactory();
    
    // Register built-in tools
    const builtInTools = factory.createBuiltInTools();
    Object.entries(builtInTools).forEach(([namespace, tools]) => {
      tools.forEach(tool => {
        registry.registerTool(tool, namespace);
      });
    });
    
    // Get all tools
    setTools(registry.getAllTools());
  }, []);
  
  return (
    <Box>
      <ToolGroupDisplay
        // Pass tools to the grouping function
        groupingFunction={() => {
          // Group by namespace
          const toolsByNamespace = new Map<string, Tool[]>();
          
          tools.forEach(tool => {
            const metadata = tool.getMetadata();
            const namespace = metadata.namespace || 'default';
            
            if (!toolsByNamespace.has(namespace)) {
              toolsByNamespace.set(namespace, []);
            }
            
            toolsByNamespace.get(namespace)!.push(tool);
          });
          
          return Array.from(toolsByNamespace.entries()).map(([namespace, tools]) => ({
            name: namespace,
            description: `Tools in the ${namespace} namespace`,
            tools,
            isExpanded: false
          }));
        }}
      />
    </Box>
  );
};
```

## Example Component

You can use the provided `ToolGroupDisplayExample` component to see a working example:

```tsx
import { ToolGroupDisplayExample } from '../../ui';

const MyApp = () => {
  return (
    <ToolGroupDisplayExample />
  );
};
```