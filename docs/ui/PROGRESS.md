# Progress Bars

Claude Code includes a comprehensive system for displaying progress indicators in the terminal. This document explains the progress bar components and how to use them.

## Components

### ProgressBar

The `ProgressBar` component displays a determinate progress bar with a specific completion percentage:

```tsx
<ProgressBar
  value={75}
  width={40}
  color={Colors.Primary}
  backgroundColor={Colors.TextDim}
  character="█"
  emptyCharacter="░"
  showPercentage={true}
  label="Loading:"
  completionMessage="Download complete!"
/>
```

### IndeterminateProgressBar

The `IndeterminateProgressBar` component shows an animated progress bar for operations with unknown duration:

```tsx
<IndeterminateProgressBar
  active={true}
  width={40}
  color={Colors.Primary}
  backgroundColor={Colors.TextDim}
  character="█"
  emptyCharacter="░"
  speed={80}
  label="Processing:"
/>
```

### ProgressDisplay

The `ProgressDisplay` component shows all active progress items from the ProgressContext:

```tsx
<ProgressDisplay 
  maxItems={3}
  width={40}
/>
```

## Context System

The progress system uses React Context to manage progress indicators across the application.

### ProgressProvider

Wrap your application with the `ProgressProvider` to enable progress tracking:

```tsx
<ProgressProvider>
  <App />
</ProgressProvider>
```

### useProgress Hook

The `useProgress` hook provides direct access to the progress context:

```tsx
const { 
  progressItems,
  startProgress,
  updateProgress,
  completeProgress,
  setIndeterminate,
  getProgress,
  hasProgress
} = useProgress();

// Start a progress indicator
startProgress('download', {
  label: 'Downloading file',
  total: 100,
  value: 0,
  indeterminate: false
});

// Update progress
updateProgress('download', 50, 'Halfway there');

// Complete progress
completeProgress('download', 'Download complete');
```

## Simplified API

### useProgressBar Hook

The `useProgressBar` hook provides a simplified interface for creating and updating progress bars:

```tsx
const { 
  id,
  update,
  complete,
  setIndeterminate,
  getValue,
  getMessage
} = useProgressBar({
  label: 'Downloading file',
  total: 100,
  initialValue: 0,
  indeterminate: false,
  initialMessage: 'Starting download...',
  autoRemove: true
});

// Update progress
update(50, 'Halfway there');

// Complete progress
complete('Download complete');
```

## Utility Functions

### File Upload Progress

Track file upload progress:

```tsx
const { uploadWithProgress } = useFileUploadProgress();

// Upload file with progress tracking
const result = await uploadWithProgress('/path/to/file.txt', async (data) => {
  // Upload implementation
  return 'result';
});
```

### File Download Progress

Track file download progress:

```tsx
const { downloadWithProgress } = useFileDownloadProgress();

// Download file with progress tracking
const filePath = await downloadWithProgress(
  'https://example.com/file.txt',
  '/path/to/save.txt'
);
```

### Long-Running Operations

Track progress of any long-running operation:

```tsx
const { runWithProgress } = useOperationProgress();

// Run operation with progress tracking
const result = await runWithProgress('Processing data', async (updateProgress) => {
  // Do work and update progress
  updateProgress(50, 'Processing records...');
  
  return 'result';
});
```

## Best Practices

1. **Use appropriate progress type**:
   - Use determinate progress bars when you know the total amount of work
   - Use indeterminate progress bars for operations with unknown duration

2. **Provide meaningful labels and messages**:
   - Include clear labels that describe what operation is in progress
   - Update messages to show current status or activity

3. **Clean up completed progress**:
   - Progress items are automatically removed after completion
   - You can manually remove them by setting `autoRemove: false` and calling `complete()`

4. **Avoid too many progress bars**:
   - Limit the number of concurrent progress bars to maintain readability
   - Group related operations into a single progress bar when possible

5. **Show progress for operations over 1 second**:
   - Only show progress for operations that take more than a second to complete
   - For very short operations, use messages or status indicators instead