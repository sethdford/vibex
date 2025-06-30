# Image Rendering in Claude Code

This document describes the image rendering capabilities in Claude Code's terminal UI, including how images are processed, displayed, and integrated into Markdown content.

## Overview

Claude Code provides the ability to render images directly in the terminal, supporting:

- Local image files
- URL-based images
- Base64-encoded image data
- Images embedded in Markdown

The implementation uses the `terminal-image` library to render images as ANSI/ASCII art in the terminal, with `sharp` for image processing and resizing.

## Components

### ImageRenderer

The core component for rendering images in the terminal:

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

A higher-level component that handles different image sources and formats:

```tsx
<ImageDisplay
  source={{ type: 'url', url: 'https://example.com/image.jpg' }}
  maxWidth={80}
  maxHeight={24}
  altText="Example image"
  caption="Figure 1: Example diagram"
/>
```

#### Supported Source Types

- **URL**: `{ type: 'url', url: 'https://example.com/image.jpg' }`
- **File**: `{ type: 'file', path: '/path/to/image.png' }`
- **Base64**: `{ type: 'base64', data: 'base64EncodedData', format: 'png' }`
- **Buffer**: `{ type: 'buffer', data: imageBuffer, format: 'jpg' }`

## Markdown Integration

Claude Code automatically detects and renders images in Markdown content:

### Direct File References

If a message contains a path to an image file, it will be detected and rendered:

```
/path/to/image.png
```

### Markdown Image Syntax

Images embedded in Markdown using standard syntax are detected and rendered:

```markdown
Here's a diagram explaining the architecture:

![Architecture diagram](/path/to/diagram.png)

And here's another image from the web:

![Example image](https://example.com/image.jpg)
```

## Utilities

### imageUtils

The `imageUtils` module provides functions for working with images:

```typescript
import { 
  downloadImage, 
  processImageData,
  isImageFile,
  getImageDimensions,
  cleanupTempImages
} from '../utils/imageUtils';

// Download image from URL
const localPath = await downloadImage('https://example.com/image.jpg');

// Check if a file is an image
const isImage = isImageFile('/path/to/file.png');

// Get image dimensions
const { width, height } = await getImageDimensions('/path/to/image.png');
```

### markdownImageParser

The `markdownImageParser` module extracts and processes images from Markdown:

```typescript
import { 
  extractImages, 
  processMarkdownImages 
} from '../utils/markdownImageParser';

// Extract images from Markdown
const images = extractImages('![Alt text](image.png)');

// Process Markdown with images
const { markdown, images } = await processMarkdownImages(markdownText);
```

## Supported Image Formats

- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`)
- GIF (`.gif`)
- WebP (`.webp`)
- AVIF (`.avif`)
- TIFF (`.tiff`)

## Technical Implementation

1. **Image Detection**: 
   - Direct file references are detected based on file extension
   - Markdown images are extracted using regex patterns

2. **Image Processing**:
   - URL images are downloaded to a temporary directory
   - Images are processed and resized with `sharp`
   - Temporary files are automatically cleaned up

3. **Terminal Rendering**:
   - Images are rendered using `terminal-image`
   - Size is adjusted based on terminal dimensions
   - Color support is determined by the terminal capabilities

4. **Markdown Integration**:
   - Markdown parser extracts images and creates placeholders
   - After rendering the text, images are displayed separately

## Caching

Downloaded images are cached in a temporary directory:

```
/tmp/claude-code-images/
```

The cache is automatically cleaned up, removing images older than 24 hours by default.