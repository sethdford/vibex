# Accessibility Features in Claude Code UI

Claude Code includes a range of accessibility features to improve usability for users with disabilities. This document provides an overview of these features and how to configure them.

## Keyboard Shortcuts

| Shortcut             | Action                         | Description                                      |
|----------------------|--------------------------------|--------------------------------------------------|
| `Ctrl+Alt+A`         | Open accessibility settings    | Configure accessibility options                  |
| `Ctrl+,`             | Open settings dialog           | General settings configuration                   |
| `Ctrl+H`             | Show help                      | Display keyboard shortcuts and help information  |
| `Escape`             | Close dialog                   | Close any open dialog                            |
| `Ctrl+O`             | Toggle error details           | Show/hide error console                          |
| `Ctrl+T`             | Toggle tool descriptions       | Show/hide extended tool descriptions             |
| `Ctrl+S`             | Toggle height constraint       | Control text wrapping behavior                   |
| `Ctrl+I`             | Toggle tips                    | Show/hide helpful tips panel                     |

## Accessibility Settings

The following accessibility features can be configured via the Accessibility Settings dialog (Ctrl+Alt+A):

### Screen Reader Optimization

- **Disable Loading Phrases**: Replaces dynamic loading phrases with static text that's more screen reader friendly
- **Screen Reader Optimized Mode**: Simplifies output and adds additional context for screen readers

### Visual Adjustments

- **High Contrast Mode**: Increases contrast for better readability
- **Font Size Adjustment**: Changes relative font size (requires terminal support)
- **Reduce Motion**: Minimizes animations and motion effects

### Interface Simplification

- **Simplify Interface**: Uses a cleaner interface with fewer visual elements
- **Keyboard Navigation Enhanced**: Improved keyboard navigation and focus indicators

## Component Accessibility

The UI implements several accessibility best practices:

1. **Semantic Markup**: Elements use appropriate ARIA roles and labels
2. **Keyboard Navigation**: All interactions are keyboard accessible
3. **Focus Management**: Clear focus indicators and logical tab order
4. **Screen Reader Text**: Alternative text for complex UI elements
5. **Color Contrast**: Meets WCAG AA standards for color contrast

## AccessibleText Component

The `AccessibleText` component provides enhanced text rendering that:

- Formats special characters for better screen reader pronunciation
- Adds appropriate ARIA attributes
- Supports additional descriptive text for screen readers
- Maintains visual styling while improving accessibility

## Implementation Details

The accessibility system includes:

- **accessibilityUtils.ts**: Utility functions for screen reader optimization
- **AccessibilitySettings.tsx**: Configuration dialog for accessibility options
- **AccessibleText.tsx**: Enhanced text rendering component
- **shouldDisableLoadingPhrases()**: Helper function to check accessibility settings

## Future Enhancements

Planned accessibility improvements include:

- Full WCAG AA compliance
- Additional screen reader optimizations
- Customizable keyboard shortcuts
- Enhanced focus management
- Color vision deficiency modes