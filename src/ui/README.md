# Claude Code UI System

This directory contains the React-based terminal UI system for Claude Code CLI.

## Overview

The UI system is built using React and Ink to provide a rich, interactive terminal experience. It features:

- Modern React component architecture
- Theme support with light and dark modes
- Rich message formatting with Markdown support
- Tool execution integration
- Command history and autocompletion
- Slash command support
- Interactive loading indicators

## Directory Structure

```
src/ui/
├── components/       # UI components
├── contexts/         # React contexts for state management
├── hooks/            # Custom React hooks
├── tests/            # Test files
├── utils/            # Utility functions
├── App.tsx           # Main application component
├── colors.ts         # Color definitions and themes
├── constants.ts      # UI constants
├── index.tsx         # Entry point
└── types.ts          # Type definitions
```

## Components

### Core Components

- **App**: Main application component that orchestrates the UI
- **Header**: Displays application branding and version information
- **Footer**: Shows status information like model, directory, and token usage
- **InputPrompt**: Handles user input with history navigation and command suggestions
- **LoadingIndicator**: Displays AI thinking/processing state

### Message Components

- **HistoryItemDisplay**: Renders different types of conversation history items
- **ToolMessage**: Displays tool use requests and results
- **DetailedMessagesDisplay**: Shows console messages and logs

### Dialog Components

- **ThemeDialog**: Theme selection interface
- **Help**: Displays available commands and keyboard shortcuts

## Context Providers

The UI system uses React Context for state management:

- **StreamingContext**: Manages AI response streaming state
- **SessionContext**: Tracks conversation history and session statistics
- **ThemeContext**: Manages UI theme settings
- **OverflowContext**: Handles content that overflows terminal boundaries

## Hooks

Custom hooks encapsulate specific functionality:

- **useClaudeStream**: Manages communication with Claude AI
- **useTerminalSize**: Monitors terminal dimensions
- **useLoadingIndicator**: Controls loading state and messages
- **useThemeCommand**: Manages theme selection
- **useHistoryManager**: Handles conversation history persistence
- **useSlashCommandProcessor**: Processes slash commands
- **useConsoleMessages**: Captures and formats console output
- **useAutoAcceptIndicator**: Controls tool auto-accept state

## Utils

Utility functions for common operations:

- **formatters.ts**: Text formatting utilities
- **markdownUtilities.ts**: Markdown parsing and rendering
- **updateCheck.ts**: Checks for application updates

## Testing

The UI system includes a comprehensive test suite:

- **Unit tests**: Individual component and hook tests
- **Integration tests**: Tests for component interactions
- **End-to-end tests**: Complete system tests

Run tests with:

```bash
npm test
```

## Getting Started

To use the UI system in your application:

```typescript
import { startUI } from './ui';

await startUI({
  theme: 'dark',
  startupWarnings: ['Optional warning messages']
});
```

## Theme Customization

The UI supports theming through the ThemeContext. Available themes:

- **dark**: Default dark theme for terminal use
- **light**: Light theme for bright environments
- **high-contrast**: High contrast theme for accessibility

## Tool Integration

The UI integrates with Claude's tool use capabilities:

1. AI requests tool execution (e.g., file read)
2. UI displays the tool request
3. Tool is executed automatically or with user confirmation
4. Tool result is displayed and sent back to AI
5. AI continues with the updated context

## Keyboard Shortcuts

- **Ctrl+C**: Exit application (press twice)
- **Ctrl+D**: Exit application (press twice with empty input)
- **Ctrl+L**: Clear screen
- **Ctrl+O**: Toggle error details
- **Ctrl+T**: Toggle tool descriptions
- **Ctrl+S**: Show all content (disable height constraints)
- **↑/↓**: Navigate command history
- **Tab**: Autocomplete commands