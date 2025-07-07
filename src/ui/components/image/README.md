# Screenshot Preview Component

The Screenshot Preview component provides a comprehensive interface for viewing and interacting with images in the terminal environment, particularly useful for screenshots captured by tools.

## Features

- **Terminal Image Display**: Renders images directly in terminal environments that support it
- **ASCII Art Fallback**: Provides ASCII art representation for terminals without image support
- **Zoom and Pan**: Interactive controls for examining image details
- **Region Highlighting**: Support for highlighting specific areas of interest
- **Image Adjustments**: Controls for brightness, contrast, grayscale, and inversion
- **Metadata Display**: View detailed information about the image file
- **Keyboard Navigation**: Comprehensive keyboard shortcuts for all functions

## Components

### 1. ScreenshotPreview

The main component that orchestrates the image display, controls, and metadata panels.

```tsx
import { ScreenshotPreview } from './ui/components/image';

// In your component
<ScreenshotPreview
  imagePath="/path/to/screenshot.png"
  width={100}
  height={40}
  showControls={true}
  showMetadata={true}
  highlightRegions={[
    { x: 10, y: 20, width: 100, height: 50, color: 'blue', label: 'Button' }
  ]}
/>
```

### 2. ImageCanvas

Handles the actual rendering of the image in the terminal with support for zooming, panning, and highlighting.

### 3. ControlsPanel

Provides interactive controls for adjusting the view state and image appearance.

### 4. MetadataPanel

Displays detailed metadata about the image file.

## Terminal Image Support

The component supports various methods of displaying images in terminals:

1. **Sixel Graphics**: For terminals like xterm with sixel support
2. **iTerm2 Image Protocol**: For iTerm2 on macOS
3. **Kitty Terminal Graphics Protocol**: For Kitty terminal
4. **ASCII Art Fallback**: For terminals without image support

## Props

### ScreenshotPreview Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imagePath` | `string` | - | Path to the image file |
| `imageData` | `string` | - | Optional image data as a base64 string |
| `width` | `number` | - | Available width for the component |
| `height` | `number` | - | Available height for the component |
| `showControls` | `boolean` | `true` | Whether to show control panel |
| `showMetadata` | `boolean` | `true` | Whether to show metadata panel |
| `maxDisplayResolution` | `{ width: number, height: number }` | - | Maximum display resolution |
| `highlightRegions` | `Rectangle[]` | `[]` | Regions to highlight on the image |
| `isFocused` | `boolean` | `true` | Whether the component is focused |
| `initialViewState` | `Partial<ViewState>` | - | Initial view state |
| `initialAdjustments` | `Partial<ImageAdjustments>` | - | Initial image adjustments |
| `keyboardEnabled` | `boolean` | `true` | Whether keyboard controls are enabled |
| `altText` | `string` | - | Alternative text for the image |
| `onFocusChange` | `(focused: boolean) => void` | - | Focus change callback |
| `onViewStateChange` | `(viewState: ViewState) => void` | - | View state change callback |
| `onAdjustmentsChange` | `(adjustments: ImageAdjustments) => void` | - | Adjustments change callback |
| `onRegionSelect` | `(region: Rectangle) => void` | - | Region selection callback |

## Data Types

### ViewState

```typescript
interface ViewState {
  zoom: number;
  position: { x: number, y: number };
  rotation: number;
}
```

### ImageAdjustments

```typescript
interface ImageAdjustments {
  brightness: number;
  contrast: number;
  invert: boolean;
  grayscale: boolean;
}
```

### Rectangle (for highlighting regions)

```typescript
interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  label?: string;
}
```

## Keyboard Controls

| Key | Function |
|-----|----------|
| `Tab` | Switch between panels |
| `+` / `-` | Zoom in/out |
| `Arrow Keys` | Pan image |
| `R` | Reset view |
| `B` / `D` | Increase/decrease brightness |
| `C` / `V` | Increase/decrease contrast |
| `G` | Toggle grayscale |
| `I` | Toggle invert |
| `H` | Cycle through highlight regions |
| `Enter` | Select highlighted region |
| `Esc` | Exit focused mode |

## Example Usage

```tsx
import React, { useState } from 'react';
import { Box } from 'ink';
import { ScreenshotPreview, Rectangle } from './ui/components/image';

export const ScreenshotViewer = ({ imagePath }) => {
  const [selectedRegion, setSelectedRegion] = useState<Rectangle | null>(null);

  // Define regions to highlight
  const regions: Rectangle[] = [
    { x: 10, y: 20, width: 100, height: 50, color: '#4299E1', label: 'Header' },
    { x: 50, y: 100, width: 200, height: 30, color: '#48BB78', label: 'Button' }
  ];

  const handleRegionSelect = (region: Rectangle) => {
    setSelectedRegion(region);
    console.log(`Selected region: ${region.label}`);
  };

  return (
    <Box flexDirection="column">
      <ScreenshotPreview
        imagePath={imagePath}
        width={100}
        height={40}
        highlightRegions={regions}
        onRegionSelect={handleRegionSelect}
      />
      
      {selectedRegion && (
        <Box marginTop={1}>
          <Text>Selected: {selectedRegion.label}</Text>
        </Box>
      )}
    </Box>
  );
};
```

## Integration with Tool System

The Screenshot Preview component can be integrated with the tool system to display screenshots captured by tools:

```tsx
import { ScreenshotPreview } from './ui/components/image';
import { ToolResult } from './types';

export const ToolResultDisplay = ({ result }: { result: ToolResult }) => {
  // Check if the result includes a screenshot
  if (result.screenshot) {
    return (
      <ScreenshotPreview
        imagePath={result.screenshot.path}
        width={100}
        height={40}
        highlightRegions={result.screenshot.regions || []}
      />
    );
  }
  
  // Otherwise render regular result
  return <RegularResultDisplay result={result} />;
};
```

## Technical Considerations

1. **Image Rendering**: The component uses multiple strategies to render images in terminals with varying capabilities.

2. **Performance**: For large images, the component uses efficient rendering techniques to maintain performance.

3. **Accessibility**: The component supports alt text and keyboard navigation for accessibility.

4. **Terminal Compatibility**: The component detects terminal capabilities and adapts accordingly.

## Limitations

1. **Terminal Support**: Image display quality depends on terminal capabilities. Not all terminals support direct image display.

2. **Color Depth**: Terminal color limitations may affect image quality.

3. **Resolution**: Terminal character cell resolution limits the detail level of displayed images.

4. **Interactivity**: Some terminals may have limited support for mouse interactions.