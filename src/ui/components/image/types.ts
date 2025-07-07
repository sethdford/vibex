/**
 * Screenshot Preview Types
 * 
 * Type definitions for the Screenshot Preview component.
 */

/**
 * Image format types supported by the component
 */
export enum ImageFormat {
  PNG = 'png',
  JPG = 'jpg',
  JPEG = 'jpeg',
  GIF = 'gif',
  SVG = 'svg',
  WEBP = 'webp'
}

/**
 * Image size information
 */
export interface ImageSize {
  width: number;
  height: number;
}

/**
 * Image metadata
 */
export interface ImageMetadata {
  /**
   * Image size in pixels
   */
  size: ImageSize;
  
  /**
   * File size in bytes
   */
  fileSize: number;
  
  /**
   * Image format
   */
  format: ImageFormat | string;
  
  /**
   * Date created or modified
   */
  date?: Date;
  
  /**
   * Additional metadata fields
   */
  [key: string]: any;
}

/**
 * Position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Rectangle definition for highlighting or selection
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  label?: string;
}

/**
 * Image adjustment properties
 */
export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  invert: boolean;
  grayscale: boolean;
}

/**
 * View state for image viewing
 */
export interface ViewState {
  zoom: number;
  position: Position;
  rotation: number;
}

/**
 * Screenshot preview props
 */
export interface ScreenshotPreviewProps {
  /**
   * Path to the image file
   */
  imagePath: string;
  
  /**
   * Alternate image source as a data URL (base64)
   */
  imageData?: string;
  
  /**
   * Available width for the component
   */
  width: number;
  
  /**
   * Available height for the component
   */
  height: number;
  
  /**
   * Whether to show controls
   */
  showControls?: boolean;
  
  /**
   * Whether to show image metadata
   */
  showMetadata?: boolean;
  
  /**
   * Maximum display resolution
   */
  maxDisplayResolution?: ImageSize;
  
  /**
   * Regions to highlight on the image
   */
  highlightRegions?: Rectangle[];
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Initial view state
   */
  initialViewState?: Partial<ViewState>;
  
  /**
   * Initial image adjustments
   */
  initialAdjustments?: Partial<ImageAdjustments>;
  
  /**
   * Whether keyboard controls are enabled
   */
  keyboardEnabled?: boolean;
  
  /**
   * Alternative text for the image
   */
  altText?: string;
  
  /**
   * Callback when focus changes
   */
  onFocusChange?: (focused: boolean) => void;
  
  /**
   * Callback when view state changes
   */
  onViewStateChange?: (viewState: ViewState) => void;
  
  /**
   * Callback when adjustments change
   */
  onAdjustmentsChange?: (adjustments: ImageAdjustments) => void;
  
  /**
   * Callback when a region is selected
   */
  onRegionSelect?: (region: Rectangle) => void;
}

/**
 * Controls panel props
 */
export interface ControlsPanelProps {
  /**
   * View state
   */
  viewState: ViewState;
  
  /**
   * Image adjustments
   */
  adjustments: ImageAdjustments;
  
  /**
   * Available width for the component
   */
  width: number;
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when view state changes
   */
  onViewStateChange: (viewState: ViewState) => void;
  
  /**
   * Callback when adjustments change
   */
  onAdjustmentsChange: (adjustments: ImageAdjustments) => void;
}

/**
 * Metadata panel props
 */
export interface MetadataPanelProps {
  /**
   * Image metadata
   */
  metadata: ImageMetadata;
  
  /**
   * Available width for the component
   */
  width: number;
}

/**
 * Image canvas props
 */
export interface ImageCanvasProps {
  /**
   * Path to the image file
   */
  imagePath: string;
  
  /**
   * Alternate image source as a data URL (base64)
   */
  imageData?: string;
  
  /**
   * Available width for the component
   */
  width: number;
  
  /**
   * Available height for the component
   */
  height: number;
  
  /**
   * View state
   */
  viewState: ViewState;
  
  /**
   * Image adjustments
   */
  adjustments: ImageAdjustments;
  
  /**
   * Regions to highlight on the image
   */
  highlightRegions?: Rectangle[];
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when focus changes
   */
  onFocusChange?: (focused: boolean) => void;
  
  /**
   * Callback when a region is selected
   */
  onRegionSelect?: (region: Rectangle) => void;
  
  /**
   * Callback when the image is loaded
   */
  onImageLoad?: (metadata: ImageMetadata) => void;
  
  /**
   * Alternative text for the image
   */
  altText?: string;
}