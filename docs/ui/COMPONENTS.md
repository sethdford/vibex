# Claude Code UI Components

This document provides an overview of the UI components available in Claude Code.

## Core Components

### App
The main application component that orchestrates the entire UI.
```tsx
<App config={config} settings={settings} startupWarnings={warnings} />
```

### Header
Displays the application header with logo and version.
```tsx
<Header terminalWidth={80} />
```

### Footer
Shows application status information at the bottom of the screen.
```tsx
<Footer
  model="claude-3-5-sonnet"
  targetDir="/current/directory"
  debugMode={false}
  errorCount={0}
  showErrorDetails={false}
  promptTokenCount={100}
  candidatesTokenCount={200}
  totalTokenCount={300}
/>
```

## Message Display

### HistoryItemDisplay
Renders a conversation message (user input or AI response).
```tsx
<HistoryItemDisplay
  item={messageItem}
  isPending={false}
  availableTerminalHeight={40}
  terminalWidth={80}
  config={config}
  isFocused={true}
/>
```

### StreamingText
Displays text with a typewriter-like streaming effect.
```tsx
<StreamingText
  text="Hello, I am Claude!"
  isStreaming={true}
  charsPerSecond={40}
  preserveWhitespace={true}
  onComplete={() => console.log('Streaming completed')}
/>
```

### DiffRenderer
Displays code or text diffs with syntax highlighting.
```tsx
<DiffRenderer
  oldText="function hello() {\n  console.log('hello');\n}"
  newText="function hello() {\n  console.log('hello world');\n}"
  showLineNumbers={true}
  contextLines={3}
  maxWidth={80}
  showHeader={true}
  oldFileName="a.js"
  newFileName="b.js"
  useColors={true}
/>
```

## Input Components

### InputPrompt
Handles user input, including multiline editing and command suggestions.
```tsx
<InputPrompt
  buffer={textBuffer}
  inputWidth={80}
  suggestionsWidth={60}
  onSubmit={handleSubmit}
  userMessages={previousMessages}
  onClearScreen={clearScreen}
  config={config}
  slashCommands={commands}
/>
```

## UI Elements

### LoadingIndicator
Shows a loading animation during AI processing.
```tsx
<LoadingIndicator
  thought="Thinking about your question..."
  currentLoadingPhrase="Analyzing code"
  elapsedTime={5.2}
/>
```

### ProgressBar
Displays a customizable progress bar.
```tsx
<ProgressBar
  value={75}
  width={40}
  color="#61afef"
  backgroundColor="#282c34"
  character="█"
  emptyCharacter="░"
  showPercentage={true}
  label="Loading:"
  completionMessage="Download complete!"
/>
```

### IndeterminateProgressBar
Shows an animated progress bar for operations with unknown duration.
```tsx
<IndeterminateProgressBar
  active={true}
  width={40}
  color="#61afef"
  backgroundColor="#282c34"
  character="█"
  emptyCharacter="░"
  speed={80}
  label="Processing:"
/>
```

### ProgressDisplay
Shows all active progress items from the ProgressContext.
```tsx
<ProgressDisplay maxItems={3} width={40} />
```

### Tips
Displays helpful tips for users.
```tsx
<Tips
  categories={['shortcuts', 'features']}
  rotateInterval={20000}
  minPriority="medium"
  maxWidth={60}
  autoCycle={true}
  enabled={true}
  onDismiss={(tipId) => console.log(`Tip ${tipId} dismissed`)}
/>
```

## Dialog Components

### SettingsDialog
Provides a user interface for viewing and modifying settings.
```tsx
<SettingsDialog
  settings={settingDefinitions}
  onSave={saveSetting}
  onClose={closeDialog}
  terminalWidth={80}
  availableTerminalHeight={24}
/>
```

### ThemeDialog
Allows users to select and preview themes.
```tsx
<ThemeDialog
  onSelect={handleThemeSelect}
  onHighlight={handleThemeHighlight}
  settings={settings}
  availableTerminalHeight={24}
  terminalWidth={80}
/>
```

## Clipboard Components

### ClipboardActions
Provides copy/paste functionality for text content.
```tsx
<ClipboardActions
  content="Text to be copied"
  showPaste={true}
  onPaste={(text) => handlePastedText(text)}
  boxStyle={{ justifyContent: 'flex-start' }}
  isFocused={true}
/>
```

### ClipboardNotification
Displays temporary notifications for clipboard operations.
```tsx
<ClipboardNotification
  message="Copied to clipboard"
  type="success"
  duration={3000}
  onDismiss={() => setNotificationVisible(false)}
/>
```

## Image Components

### ImageRenderer
Renders images in the terminal using ASCII/ANSI art.
```tsx
<ImageRenderer
  imagePath="/path/to/image.png"
  maxWidth={80}
  maxHeight={24}
  preserveAspectRatio={true}
  fit="contain"
  altText="Description of the image"
/>
```

### ImageDisplay
A higher-level component that handles different image sources and formats.
```tsx
<ImageDisplay
  source={{ type: 'url', url: 'https://example.com/image.jpg' }}
  maxWidth={80}
  maxHeight={24}
  altText="Example image"
  caption="Figure 1: Example diagram"
/>
```

## Status Components

### UpdateNotification
Shows notifications about available updates.
```tsx
<UpdateNotification message="New version available: v1.2.3" />
```

### ContextSummaryDisplay
Displays information about the current context files.
```tsx
<ContextSummaryDisplay
  contextFileCount={3}
  contextFileNames={['CLAUDE.md', 'README.md', 'config.json']}
  showToolDescriptions={true}
/>
```

## Utility Components

### Help
Displays available commands and keyboard shortcuts.
```tsx
<Help commands={slashCommands} />
```

### ShowMoreLines
Shows a "Show more" button when content is truncated due to height constraints.
```tsx
<ShowMoreLines constrainHeight={true} />
```

## Best Practices

1. **Use theme-aware colors**: Always use colors from the theme system instead of hardcoded values.
2. **Handle terminal size**: Consider the terminal dimensions when rendering components.
3. **Provide meaningful feedback**: Use loading indicators and progress bars for long operations.
4. **Support keyboard navigation**: Ensure all interactive elements are keyboard accessible.
5. **Handle overflow gracefully**: Use the OverflowContext for content that may exceed screen size.