# Clipboard Integration

Claude Code provides comprehensive clipboard integration to allow easy copying and pasting of text between the terminal and other applications.

## Features

- **Copy Text**: Copy conversation history, code snippets, or other text from Claude Code
- **Paste Text**: Paste text from external applications into the input prompt
- **Keyboard Shortcuts**: Convenient keyboard shortcuts for clipboard operations
- **Visual Feedback**: Notifications when clipboard operations are performed
- **Cross-Platform Support**: Works on Windows, macOS, and Linux

## Keyboard Shortcuts

- `Ctrl+C` - Copy selected text or current input
- `Ctrl+V` - Paste text from clipboard into input
- `Ctrl+X` - Cut text from input (copies to clipboard then clears)
- `Ctrl+Y` - Copy the last assistant response

## Components

### ClipboardActions

The `ClipboardActions` component provides copy/paste functionality for specific content. It displays buttons and handles keyboard shortcuts for clipboard operations.

```tsx
<ClipboardActions 
  content="Text to be copied" 
  showPaste={true} 
  onPaste={(text) => handlePastedText(text)} 
/>
```

### ClipboardNotification

The `ClipboardNotification` component displays temporary notifications for clipboard operations.

```tsx
<ClipboardNotification 
  message="Copied to clipboard" 
  type="success" 
  duration={3000} 
  onDismiss={() => setNotificationVisible(false)} 
/>
```

## Hooks

### useClipboard

The `useClipboard` hook provides access to clipboard functionality from any component.

```tsx
const { 
  copyToClipboard, 
  pasteFromClipboard, 
  clearClipboard, 
  error, 
  isLoading, 
  lastCopiedText 
} = useClipboard();
```

## Utility Functions

The clipboard utilities provide standalone functions for clipboard operations:

```tsx
import { 
  copyToClipboard, 
  readFromClipboard, 
  clearClipboard, 
  formatForClipboard 
} from './utils/clipboardUtils';

// Copy text to clipboard
await copyToClipboard('Text to copy');

// Read from clipboard
const clipboardContent = await readFromClipboard();

// Clear clipboard
await clearClipboard();

// Format text for clipboard (removes ANSI color codes, normalizes line endings)
const formattedText = formatForClipboard(text);
```

## Implementation Details

The clipboard integration uses the `clipboardy` library for cross-platform clipboard access. This library is a pure JavaScript implementation that works reliably across different operating systems.

## Browser Environment

When running in a browser environment, the clipboard integration falls back to using the browser's Clipboard API through `navigator.clipboard`. This ensures the functionality works in both terminal and web environments.