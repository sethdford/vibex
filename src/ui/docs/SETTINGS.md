# Settings System

The Claude Code CLI includes a comprehensive settings system that allows users to customize their experience. This document explains how the settings system works and how to use it.

## Overview

The settings system consists of the following components:

1. **Settings Dialog UI** - A user interface for viewing and modifying settings
2. **Settings Hook** - A React hook for loading, saving and accessing settings
3. **Settings Schema** - Type definitions and validation for settings

## Using the Settings Dialog

The settings dialog can be accessed by pressing `Ctrl+,` in the terminal interface. It provides a categorized view of all available settings and allows you to modify them.

### Navigation

The settings dialog has three views:

1. **Categories** - Shows a list of setting categories
2. **Settings** - Shows all settings in a selected category
3. **Edit** - Interface for editing a specific setting

Use arrow keys to navigate and Enter to select. Press Escape to go back or close the dialog.

## Available Settings

Settings are organized into the following categories:

### Terminal

- **Terminal Theme** - Color theme (light, dark, or system)
- **Use Colors** - Enable colored output
- **Show Progress Indicators** - Show loading animations
- **Code Highlighting** - Enable syntax highlighting for code blocks
- **Streaming Speed** - Characters per second for streaming text effect

### AI

- **AI Model** - Claude model to use
- **Temperature** - Randomness of AI responses (0-1)
- **Max Tokens** - Maximum tokens in AI response

### Accessibility

- **Disable Loading Phrases** - Replace loading phrases with a simple indicator (better for screen readers)

### Developer

- **Debug Mode** - Enable debug logging and features

## Technical Implementation

### Settings Storage

Settings are stored in a JSON file at:

```
~/.claude-code/settings.json
```

### Settings Hook

The `useSettings` hook provides access to settings from any component:

```tsx
const { 
  settings,             // Current settings object
  settingDefinitions,   // Metadata about available settings
  saveSetting,          // Function to save a single setting
  saveAllSettings,      // Function to save all settings
  resetToDefaults,      // Function to reset to defaults
  isLoading,            // Whether settings are loading
  error                 // Any error that occurred
} = useSettings();
```

### Settings Schema

Settings are validated against a schema defined in `src/config/schema.ts` using Zod.

## Adding New Settings

To add new settings:

1. Update the schema in `src/config/schema.ts`
2. Add the setting definition in `useSettings.ts`
3. Use the setting in your components

## Best Practices

- Always access settings through the `useSettings` hook
- Provide sensible defaults for all settings
- Include descriptive labels and help text
- Group related settings into categories
- Use appropriate input types (boolean, string, number, select)