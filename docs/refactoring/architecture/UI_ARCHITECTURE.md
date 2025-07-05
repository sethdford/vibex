# VibeX UI Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Component Hierarchy](#component-hierarchy)
3. [Core UI Components](#core-ui-components)
4. [State Management](#state-management)
5. [Hooks and Utilities](#hooks-and-utilities)
6. [Themes and Styling](#themes-and-styling)
7. [Advanced Components](#advanced-components)
8. [Execution Flow](#execution-flow)
9. [Testing Strategy](#testing-strategy)
10. [Integration Points](#integration-points)

## Overview

VibeX's UI architecture is built on a React-based terminal interface using the Ink library. The architecture follows a component-driven approach with hooks for state management and utilities for terminal interactions. The UI is organized hierarchically with specialized components for different aspects of the terminal experience.

The main goals of the UI architecture are:
- Provide a responsive terminal interface
- Support rich content rendering (text, images, markdown)
- Enable real-time streaming of AI responses
- Facilitate tool execution with detailed feedback
- Support advanced task orchestration and workflows
- Ensure accessibility and cross-terminal compatibility

## Component Hierarchy

The VibeX UI follows a clear component hierarchy:

```
App (Root Component)
├── SessionStatsProvider
│   └── ProgressProvider
│       └── App (Main App)
│           ├── Header
│           ├── Static Content (History)
│           │   └── HistoryItemDisplay (Multiple)
│           ├── Pending Items
│           │   └── HistoryItemDisplay (Multiple)
│           ├── Help (Conditional)
│           ├── Controls Area
│           │   ├── ThemeDialog (Conditional)
│           │   ├── LoadingIndicator (Conditional)
│           │   ├── ContextSummaryDisplay (Conditional)
│           │   ├── DetailedMessagesDisplay (Conditional)
│           │   ├── InputPrompt (Conditional)
│           │   └── Footer
│           └── Various Conditional UI Elements
```

## Core UI Components

### App.tsx
The main entry point that orchestrates the entire UI experience. It manages:
- Terminal size and layout
- User input and keyboard shortcuts
- Command processing
- AI interaction streaming
- History management
- UI state transitions

Key responsibilities:
- Rendering the terminal UI layout
- Managing UI state (streaming, input active, dialog visibility)
- Processing user input and commands
- Coordinating between components

### CLI-App.tsx
A simplified version of the App component specifically for CLI usage scenarios. It provides:
- Basic command processing
- Simpler UI layout
- Command-driven interaction

### Components/Header.tsx
Renders the application header with:
- Logo/branding
- Version information
- Session information

### Components/Footer.tsx
Displays the footer information including:
- Model information
- Working directory
- Debug status
- Error counts
- Token usage statistics

### Components/InputPrompt.tsx
Manages user input with:
- Text input handling
- Command suggestions
- History navigation
- Keyboard shortcuts
- Autocompletion

### Components/HistoryItemDisplay.tsx
Renders conversation history items including:
- User messages
- Assistant responses
- System messages
- Tool usage and results
- Error messages

## State Management

The UI uses a combination of React context providers and hooks for state management:

### Context Providers

#### SessionContext.tsx
- Tracks session-level statistics and metrics
- Provides token usage information
- Manages session state

#### ProgressContext.tsx
- Tracks progress of operations
- Manages progress indicators
- Coordinates progress updates across components

#### StreamingContext.tsx
- Provides streaming state information
- Coordinates streaming UI updates
- Manages streaming control operations

#### ThemeContext.tsx
- Provides theme configuration
- Manages theme switching
- Controls theme-related UI elements

#### OverflowContext.tsx
- Manages content overflow
- Controls "show more" functionality
- Handles content truncation

### Local Component State
Components maintain local state for:
- UI interactions (focus, selection)
- Ephemeral data (streaming text, input buffer)
- Component-specific configurations
- Temporary user interactions

## Hooks and Utilities

### Key Custom Hooks

#### useClaude4Stream.ts
- Manages streaming communication with Claude 4 AI
- Processes AI responses and tool usage
- Handles streaming state transitions
- Implements AI error handling

#### useSlashCommandProcessor.ts
- Processes slash commands (/command)
- Manages command registry
- Handles command execution and error handling
- Provides command suggestions

#### useTextBuffer.ts
- Manages text input buffer
- Handles cursor positioning
- Implements text selection
- Provides history navigation

#### useTerminalSize.ts
- Tracks terminal dimensions
- Notifies on resize events
- Provides width/height information

#### useLoadingIndicator.ts
- Manages loading state visualization
- Handles progress tracking
- Provides timed loading phrases

#### useToolExecutionTracking.ts
- Tracks tool execution
- Manages tool states and results
- Provides execution metrics
- Handles streaming tool output

### Utility Functions

#### accessibilityUtils.ts
- Provides accessibility enhancements
- Formats text for screen readers
- Controls loading phrase behavior

#### imageUtils.ts
- Processes images for terminal display
- Handles image resizing
- Manages image caching

#### markdownUtilities.ts
- Processes markdown content
- Extracts code blocks
- Handles formatting

#### formatters.ts
- Formats dates and times
- Processes numeric values
- Handles token counts

## Themes and Styling

### Theme System
The UI implements a comprehensive theme system via:

#### themes/theme.ts
- Defines the theme interface
- Provides color definitions
- Sets text styling options

#### themes/theme-manager.ts
- Manages theme loading and switching
- Handles theme persistence
- Processes theme customization

#### Individual Theme Files
- Default theme (dark and light variants)
- Various predefined themes (dracula, github, etc.)
- Theme extension support

### Color System

#### colors.ts
- Defines color constants
- Maps theme colors to terminal colors
- Provides color utility functions

## Advanced Components

### Tool Execution Display

#### Components/ToolExecutionDisplay.tsx
A sophisticated component for visualizing tool execution:
- Real-time execution tracking
- Streaming output display
- Performance metrics visualization
- Error handling with stack traces

Key features:
- Progress tracking for long-running operations
- Detailed metrics display
- State visualization (pending, executing, completed, failed)
- Streaming output rendering

### Task Orchestration

#### Components/TaskOrchestrator.tsx
A system for visualizing and managing complex task workflows:
- Task dependency visualization
- Progress tracking
- Sub-task management
- Workflow execution metrics

Key capabilities:
- Task prioritization visualization
- Task status tracking
- Nested task rendering
- Performance metrics

### Progress Visualization

#### Components/ProgressDisplay.tsx
- Visualizes operation progress
- Supports multiple progress styles
- Provides time estimates

#### Components/AdvancedProgressBar.tsx
- Enhanced progress visualization
- ETA calculation
- Velocity tracking
- Multiple animation styles

## Execution Flow

### Input Processing Flow
1. User enters text via InputPrompt
2. Text is processed by App component
3. If text starts with "/", it's sent to handleSlashCommand
4. Otherwise, it's sent to submitQuery for AI processing
5. Result is displayed in conversation history

### AI Interaction Flow
1. User query is submitted via submitQuery
2. Query is added to history as USER message
3. useClaude4Stream processes the query
4. Streaming response is rendered in real-time
5. Any tool calls are processed via ToolExecutionDisplay
6. Final response is added to history

### Command Processing Flow
1. Command is submitted via handleSlashCommand
2. Command is validated and parsed
3. Command handler is executed
4. Results are displayed in conversation history
5. UI state is updated as needed (e.g., showing/hiding dialogs)

## Testing Strategy

The UI testing approach consists of:

### Component Testing
- Unit tests for individual components
- Focus on component behavior and rendering
- Jest and ink-testing-library

### Hook Testing
- Unit tests for custom hooks
- Focus on state management and side effects
- Jest testing utilities

### Integration Testing
- Tests for component interactions
- Focus on UI workflows and state transitions
- End-to-end scenarios

### Mock Strategy
- Mock for terminal interactions
- Mock for AI streaming responses
- Mock for file system operations

## Integration Points

### AI Integration
- useClaude4Stream connects to AI client
- Processes AI responses including tool usage
- Handles streaming state

### File System Integration
- File operations for configuration
- Image loading and processing
- Theme persistence

### Command Line Integration
- Processing CLI arguments
- Handling terminal signals
- Managing process lifecycle

### Tool Integration
- Tool registry for executing tools
- Tool result processing and display
- Tool streaming output handling

## Future Architecture Considerations

Based on the current architecture and recent developments like TaskOrchestrator and ToolExecutionDisplay, the VibeX UI is evolving toward:

1. **More Advanced Task Orchestration**
   - Enhanced visualization of complex workflows
   - Better dependency management
   - More detailed progress tracking

2. **Enhanced Streaming Capabilities**
   - More granular control over streaming content
   - Better visualization of AI reasoning process
   - Advanced thought process visualization

3. **Improved Multimodal Support**
   - Better image rendering
   - Support for more content types
   - Enhanced rendering of rich content

4. **Performance Optimizations**
   - More efficient rendering of large histories
   - Better memory management
   - Optimized terminal updates

These architectural directions align with the goal of creating a more dynamic, flexible, and feature-rich UI that outperforms comparable tools like Gemini CLI.