# Claude Code UI API Reference

This document provides a detailed API reference for the Claude Code UI system.

## Main Exports

### `startUI`

Initializes and renders the UI in the terminal.

```typescript
function startUI(options?: StartUIOptions): Promise<void>
```

#### Parameters

- `options` (optional): Configuration options for the UI
  - `theme` (string, optional): Initial theme to use ('dark', 'light', 'system', 'high-contrast')
  - `startupWarnings` (string[], optional): Warning messages to display at startup

#### Returns

- `Promise<void>`: Resolves when the UI is exited

#### Example

```typescript
import { startUI } from './ui';

await startUI({
  theme: 'dark',
  startupWarnings: ['API key not configured']
});
```

### `StreamingState`

Enum representing the current state of the AI response streaming.

```typescript
enum StreamingState {
  Idle = 'idle',
  Responding = 'responding',
  WaitingForConfirmation = 'waiting_for_confirmation',
  Error = 'error'
}
```

### `MessageType`

Enum for different types of messages in the conversation history.

```typescript
enum MessageType {
  USER = 'user',
  ASSISTANT = 'assistant',
  TOOL_USE = 'tool_use',
  TOOL_OUTPUT = 'tool_output',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}
```

### `HistoryItem`

Interface for items in the conversation history.

```typescript
interface HistoryItem {
  id: string;
  type: MessageType;
  text: string;
  timestamp: number;
  toolUse?: ToolUse;
  toolResult?: ToolResultInfo;
}
```

## Components

### `App`

The main application component that integrates all UI elements.

```typescript
interface AppProps {
  config: any;
  settings?: any;
  startupWarnings?: string[];
}

const App: React.FC<AppProps>
```

### `Header`

Displays the application header with branding and version information.

```typescript
interface HeaderProps {
  terminalWidth: number;
}

const Header: React.FC<HeaderProps>
```

### `Footer`

Shows status information at the bottom of the UI.

```typescript
interface FooterProps {
  model: string;
  targetDir: string;
  debugMode: boolean;
  branchName?: string;
  debugMessage?: string;
  errorCount: number;
  showErrorDetails: boolean;
  showMemoryUsage?: boolean;
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

const Footer: React.FC<FooterProps>
```

### `HistoryItemDisplay`

Renders different types of conversation history items.

```typescript
interface HistoryItemDisplayProps {
  item: HistoryItem;
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
  config: any;
  isFocused?: boolean;
}

const HistoryItemDisplay: React.FC<HistoryItemDisplayProps>
```

### `ToolMessage`

Displays tool use requests and results.

```typescript
interface ToolMessageProps {
  toolUse: ToolUseProps;
  toolResult?: ToolResultProps;
  isFocused?: boolean;
}

const ToolMessage: React.FC<ToolMessageProps>
```

## Hooks

### `useClaudeStream`

Manages communication with Claude AI including tool use handling.

```typescript
function useClaudeStream(
  claudeClient: UnifiedClaudeClient | null,
  history: HistoryItem[],
  addItem: (item: Partial<HistoryItem>, timestamp?: number) => void,
  setShowHelp: (show: boolean) => void,
  config: any,
  setDebugMessage: (message: string) => void,
  handleSlashCommand: (input: string) => boolean,
  refreshContextFiles: () => void,
): {
  streamingState: StreamingState;
  submitQuery: (query: string) => Promise<void>;
  initError: string | null;
  pendingHistoryItems: HistoryItem[];
  clearPendingItems: () => void;
  thought: string;
}
```

### `useTerminalSize`

Provides access to and monitors terminal dimensions.

```typescript
function useTerminalSize(): {
  rows: number;
  columns: number;
}
```

### `useHistoryManager`

Manages conversation history, including persistence and loading.

```typescript
function useHistory(): {
  history: HistoryItem[];
  addItem: (item: Partial<HistoryItem>, timestamp?: number) => void;
  clearItems: () => void;
  loadHistory: (filePath?: string) => Promise<void>;
  saveHistory: (filePath?: string) => Promise<void>;
}
```

### `useThemeCommand`

Manages theme selection and theme dialog state.

```typescript
function useThemeCommand(
  settings: any,
  setThemeError: (error: string | null) => void,
  addItem: (item: Partial<HistoryItem>, timestamp?: number) => void
): {
  isThemeDialogOpen: boolean;
  openThemeDialog: () => void;
  closeThemeDialog: () => void;
  handleThemeSelect: (item: ThemeOption) => void;
  handleThemeHighlight: (item: ThemeOption) => void;
}
```

## Context Providers

### `ThemeProvider`

Provides theme context for the application.

```typescript
interface ThemeProviderProps {
  initialTheme?: string;
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps>
```

### `SessionStatsProvider`

Provides session statistics context.

```typescript
interface SessionStatsProviderProps {
  children: React.ReactNode;
}

const SessionStatsProvider: React.FC<SessionStatsProviderProps>
```

### `StreamingContext.Provider`

Provides streaming state context.

```typescript
const StreamingContext: React.Context<StreamingState>
```

### `OverflowProvider`

Manages content overflow in the terminal.

```typescript
interface OverflowProviderProps {
  initialConstrainHeight?: boolean;
  children: React.ReactNode;
}

const OverflowProvider: React.FC<OverflowProviderProps>
```

## Utility Functions

### `parseMarkdown`

Parses markdown text into structured nodes.

```typescript
function parseMarkdown(markdown: string): MarkdownNode[]
```

### `renderMarkdown`

Renders markdown nodes to ANSI-colored terminal output.

```typescript
function renderMarkdown(
  nodes: MarkdownNode[],
  options?: {
    useColors?: boolean;
    maxWidth?: number;
  }
): string
```

### `formatElapsedTime`

Formats milliseconds as a readable time string.

```typescript
function formatElapsedTime(ms: number): string
```

### `checkForUpdates`

Checks for updates to Claude Code.

```typescript
function checkForUpdates(): Promise<string | null>
```

## Error Handling

The UI system handles errors at multiple levels:

1. Component-level error boundaries
2. Hook-level try/catch blocks
3. Global unhandled rejection handlers

Errors are displayed in the UI and logged to the console.

## Testing Utilities

### Test Renderers

```typescript
import { render } from '@testing-library/react';

// With theme context
render(
  <ThemeProvider>
    <YourComponent />
  </ThemeProvider>
);
```

### Mock Hooks

```typescript
// Mock useClaudeStream hook
jest.mock('../../hooks/useClaudeStream', () => ({
  useClaudeStream: () => ({
    streamingState: StreamingState.Idle,
    submitQuery: jest.fn(),
    initError: null,
    pendingHistoryItems: [],
    clearPendingItems: jest.fn(),
    thought: '',
  }),
}));
```