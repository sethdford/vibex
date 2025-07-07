# Tool UI Components

This directory contains enhanced UI components for the VibeX tool system, following the UI Enhancement Plan. These components provide rich visualization, interaction patterns, and feedback for tool operations.

## Components Overview

### 1. EnhancedToolMessage

A comprehensive tool message component that displays tool requests and results with rich visualization, status indicators, and progressive disclosure.

**Key Features:**
- Different visibility levels for progressive disclosure
- Specialized result type detection and visualization
- Real-time progress indication
- Status visualization with optional animation
- Support for tool metadata display

**Usage Example:**
```tsx
import { EnhancedToolMessage, ToolExecutionStatus, ToolResultType } from './tool';

// Inside your component:
<EnhancedToolMessage
  toolUse={{
    name: 'read_file',
    id: 'tool-1',
    input: { file_path: '/path/to/file.txt' },
    status: ToolExecutionStatus.SUCCESS,
    namespace: 'file',
    description: 'Reads content from a file'
  }}
  toolResult={{
    content: 'File content here...',
    isError: false,
    toolUseId: 'tool-1',
    resultType: ToolResultType.TEXT
  }}
  isFocused={true}
/>
```

### 2. ToolConfirmationDialog

A specialized dialog for confirming tool executions with different confirmation types, trust levels, and parameter modification.

**Key Features:**
- Support for different confirmation types (edit, exec, sensitive, info, MCP)
- Trust level options (once, always, pattern, never)
- Parameter editing capability
- Preview content display for operations
- Keyboard navigation support

**Usage Example:**
```tsx
import { ToolConfirmationDialog, ConfirmationType, TrustLevel } from './tool';

// Inside your component:
<ToolConfirmationDialog
  toolName="edit_file"
  toolNamespace="file"
  toolDescription="Edits content in a file"
  parameters={{
    file_path: './src/app.js',
    old_string: 'function hello() {',
    new_string: 'function helloWorld() {'
  }}
  confirmationType={ConfirmationType.EDIT}
  previewContent={diffContent}
  onConfirm={(trustLevel, modifiedParams) => {
    // Handle confirmation
  }}
  onCancel={() => {
    // Handle cancellation
  }}
/>
```

### 3. CodeSearchResultVisualizer

A specialized component for visualizing code search results from tools like RipgrepTool with syntax highlighting and context.

**Key Features:**
- Hierarchical display of search results by file
- File expansion/collapse functionality
- Line context display with optional toggling
- Match highlighting with column precision
- Result filtering and limiting options

**Usage Example:**
```tsx
import { CodeSearchResultVisualizer, parseRipgrepOutput } from './tool';

// Parse raw ripgrep output
const searchResult = parseRipgrepOutput(
  ripgrepOutput,
  'search pattern',
  './src',
  startTime,
  endTime
);

// Inside your component:
<CodeSearchResultVisualizer
  result={searchResult}
  showContext={true}
  expandAll={false}
  maxFiles={10}
  width={80}
/>
```

## Supporting Components

### 1. StatusIndicator

Visual indicator for tool execution status with optional animation.

### 2. ToolResultVisualizer

Specialized component for visualizing different types of tool results with appropriate formatting.

### 3. ProgressIndicator

Visual indicator for operation progress with percentage and optional message.

## Example Components

The following example components demonstrate the usage of the main components:

1. **EnhancedToolMessageExample**: Demonstrates various tool message scenarios
2. **ToolConfirmationDialogExample**: Shows different confirmation types
3. **CodeSearchResultVisualizerExample**: Demonstrates search result visualization

## Integration with Tool System

These components integrate with the VibeX Clean Architecture tool system:

1. **EnhancedToolMessage** connects with the tool execution service to display tool requests and results
2. **ToolConfirmationDialog** integrates with the ConfirmationService to request user approval for operations
3. **CodeSearchResultVisualizer** works with the specialized RipgrepTool adapter

## Upcoming Components

Planned components based on the UI Enhancement Plan:

1. **ToolGroupDisplay**: For displaying groups of related tool executions
2. **CodeAnalysisDashboard**: For visualizing code quality metrics
3. **ScreenshotPreview**: For displaying captured screenshots