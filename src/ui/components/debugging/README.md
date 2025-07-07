# Debugging Interface

The Debugging Interface provides a comprehensive, terminal-based interface for interactive debugging and runtime inspection of applications. It's designed to be used within the Vibex environment and offers a complete set of tools for examining and controlling program execution.

## Features

- **Interactive Debugging**: Control program execution with continue, pause, step over/into/out operations
- **Variable Inspection and Editing**: View and modify variables during debugging
- **Breakpoint Management**: Set, remove, and configure breakpoints, including conditional breakpoints
- **Call Stack Navigation**: View and navigate the call stack to understand program flow
- **Watch Expressions**: Add expressions to monitor their values as the program executes
- **Console Integration**: View console output and execute debug commands
- **Thread Management**: Handle multiple threads in multi-threaded applications
- **Source Code Viewing**: Browse and view source code with syntax highlighting
- **Keyboard Navigation**: Comprehensive keyboard shortcuts for efficient debugging

## Components

The Debugging Interface consists of several interconnected components:

1. **DebuggingInterface**: Main component that orchestrates the entire debugging interface
2. **DebugToolbar**: Provides controls for program execution (continue, pause, step)
3. **SourceView**: Displays source code with line numbers, breakpoints, and current execution line
4. **Panel Components**:
   - **VariablesPanel**: Displays and allows editing of variables in the current scope
   - **CallStackPanel**: Shows the call stack with function names and locations
   - **BreakpointsPanel**: Lists and manages breakpoints
   - **ConsolePanel**: Shows console output and accepts debug commands
   - **WatchesPanel**: Displays watch expressions and their values
   - **ThreadsPanel**: Shows and allows selection of execution threads
   - **SourcesPanel**: Provides a file browser for selecting source files

## Usage

```tsx
import { DebuggingInterface } from '../ui/components/debugging';

// In your component
<DebuggingInterface
  width={120}
  height={40}
  initialState={initialDebugState}
  onExit={handleExitDebugging}
  onCommand={handleDebugCommand}
  onVariableEdit={handleVariableEdit}
  onBreakpointAdd={handleBreakpointAdd}
  onBreakpointRemove={handleBreakpointRemove}
  onBreakpointUpdate={handleBreakpointUpdate}
  onWatchAdd={handleWatchAdd}
  onWatchRemove={handleWatchRemove}
  onWatchUpdate={handleWatchUpdate}
/>
```

See `DebuggingInterfaceExample.tsx` for a complete example of using the Debugging Interface.

## Keyboard Controls

### Global Controls
- **Tab**: Cycle through panels
- **F5**: Continue/start debugging
- **F10**: Step over
- **F11**: Step into
- **Shift+F11**: Step out
- **Esc**: Exit debugging mode

### Variables Panel
- **↑/↓**: Navigate variables
- **Enter/Space**: Expand/collapse object or array
- **E**: Edit variable value (for primitive types)
- **/**: Search variables

### Breakpoints Panel
- **↑/↓**: Navigate breakpoints
- **A**: Add new breakpoint
- **E**: Enable/disable breakpoint
- **D**: Delete breakpoint
- **C**: Edit condition

### Console Panel
- **↑/↓**: Navigate command history
- **Enter**: Execute command
- **Ctrl+L**: Clear console
- **Page Up/Down**: Scroll console output

## Integration

The Debugging Interface can be integrated with different debugger backends by implementing the callback props provided by the `DebuggingInterface` component:

- **onCommand**: Handle debugging commands (continue, step, etc.)
- **onVariableEdit**: Update variable values
- **onBreakpointAdd/Remove/Update**: Manage breakpoints
- **onWatchAdd/Remove/Update**: Manage watch expressions

The hook `useDebugState` provides a default implementation with mock data for demonstration purposes.

## Customization

The Debugging Interface can be customized in several ways:

1. **Layout**: Adjust the width and height props to fit your terminal dimensions
2. **Panels**: Configure which panels are visible by default
3. **Initial State**: Provide an initialState object to pre-populate the debugging state
4. **Callbacks**: Implement the callback props to connect to your debugging backend

## Dependencies

- React
- Ink (for terminal UI rendering)
- TypeScript (for type definitions)

## License

MIT