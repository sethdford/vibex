/**
 * Layout Service
 * 
 * Handles terminal dimensions and responsive layout calculations
 * Following Gemini CLI patterns - single responsibility, clean interface
 */

import { logger } from '../utils/logger.js';

export interface LayoutDimensions {
  terminalWidth: number;
  terminalHeight: number;
  inputWidth: number;
  mainAreaWidth: number;
  debugConsoleMaxHeight: number;
  availableTerminalHeight: number;
  staticExtraHeight: number;
}

export interface LayoutOptions {
  footerHeight?: number;
  constrainHeight?: boolean;
  debugMode?: boolean;
}

export class LayoutService {
  private static readonly DEFAULT_WIDTH = 80;
  private static readonly DEFAULT_HEIGHT = 24;
  private static readonly MIN_INPUT_WIDTH = 20;
  private static readonly MAIN_AREA_RATIO = 0.9;
  private static readonly DEBUG_CONSOLE_RATIO = 0.2;
  private static readonly MIN_DEBUG_HEIGHT = 5;
  private static readonly STATIC_EXTRA_HEIGHT = 3;

  /**
   * Calculate responsive layout dimensions
   */
  calculateDimensions(options: LayoutOptions = {}): LayoutDimensions {
    try {
      const terminalWidth = this.getTerminalWidth();
      const terminalHeight = this.getTerminalHeight();
      
      const inputWidth = this.calculateInputWidth(terminalWidth);
      const mainAreaWidth = this.calculateMainAreaWidth(terminalWidth);
      const debugConsoleMaxHeight = this.calculateDebugConsoleHeight(terminalHeight);
      
      const { footerHeight = 0, constrainHeight = false } = options;
      const staticExtraHeight = LayoutService.STATIC_EXTRA_HEIGHT;
      
      const availableTerminalHeight = constrainHeight 
        ? terminalHeight - footerHeight - staticExtraHeight
        : terminalHeight - footerHeight - staticExtraHeight;

      const dimensions: LayoutDimensions = {
        terminalWidth,
        terminalHeight,
        inputWidth,
        mainAreaWidth,
        debugConsoleMaxHeight,
        availableTerminalHeight: Math.max(availableTerminalHeight, 10), // Minimum height
        staticExtraHeight
      };

      logger.debug('Layout dimensions calculated', dimensions);
      return dimensions;
    } catch (error) {
      logger.error('Failed to calculate layout dimensions:', error);
      return this.getDefaultDimensions();
    }
  }

  /**
   * Get terminal width with fallback
   */
  private getTerminalWidth(): number {
    return process.stdout.columns || LayoutService.DEFAULT_WIDTH;
  }

  /**
   * Get terminal height with fallback
   */
  private getTerminalHeight(): number {
    return process.stdout.rows || LayoutService.DEFAULT_HEIGHT;
  }

  /**
   * Calculate input width based on terminal width
   */
  private calculateInputWidth(terminalWidth: number): number {
    const calculated = Math.floor(terminalWidth * LayoutService.MAIN_AREA_RATIO) - 3;
    return Math.max(LayoutService.MIN_INPUT_WIDTH, calculated);
  }

  /**
   * Calculate main area width based on terminal width
   */
  private calculateMainAreaWidth(terminalWidth: number): number {
    return Math.floor(terminalWidth * LayoutService.MAIN_AREA_RATIO);
  }

  /**
   * Calculate debug console height based on terminal height
   */
  private calculateDebugConsoleHeight(terminalHeight: number): number {
    const calculated = Math.floor(terminalHeight * LayoutService.DEBUG_CONSOLE_RATIO);
    return Math.max(calculated, LayoutService.MIN_DEBUG_HEIGHT);
  }

  /**
   * Get default dimensions for fallback
   */
  private getDefaultDimensions(): LayoutDimensions {
    const terminalWidth = LayoutService.DEFAULT_WIDTH;
    const terminalHeight = LayoutService.DEFAULT_HEIGHT;
    
    return {
      terminalWidth,
      terminalHeight,
      inputWidth: this.calculateInputWidth(terminalWidth),
      mainAreaWidth: this.calculateMainAreaWidth(terminalWidth),
      debugConsoleMaxHeight: this.calculateDebugConsoleHeight(terminalHeight),
      availableTerminalHeight: terminalHeight - LayoutService.STATIC_EXTRA_HEIGHT,
      staticExtraHeight: LayoutService.STATIC_EXTRA_HEIGHT
    };
  }

  /**
   * Check if terminal is too small for optimal display
   */
  isTerminalTooSmall(dimensions?: LayoutDimensions): boolean {
    const dims = dimensions || this.calculateDimensions();
    return dims.terminalWidth < 60 || dims.terminalHeight < 20;
  }

  /**
   * Get layout warnings for small terminals
   */
  getLayoutWarnings(dimensions?: LayoutDimensions): string[] {
    const dims = dimensions || this.calculateDimensions();
    const warnings: string[] = [];

    if (dims.terminalWidth < 80) {
      warnings.push(`Terminal width (${dims.terminalWidth}) is below recommended 80 columns`);
    }

    if (dims.terminalHeight < 24) {
      warnings.push(`Terminal height (${dims.terminalHeight}) is below recommended 24 rows`);
    }

    if (dims.inputWidth < 40) {
      warnings.push('Input area may be too narrow for comfortable typing');
    }

    return warnings;
  }

  /**
   * Calculate responsive font sizes (for future use)
   */
  calculateFontSizes(dimensions?: LayoutDimensions): {
    normal: number;
    small: number;
    large: number;
  } {
    const dims = dimensions || this.calculateDimensions();
    
    // Base font size calculation based on terminal width
    const baseFontSize = Math.max(12, Math.min(16, dims.terminalWidth / 6));
    
    return {
      normal: baseFontSize,
      small: Math.max(10, baseFontSize - 2),
      large: Math.min(20, baseFontSize + 4)
    };
  }

  /**
   * Get optimal content height for different components
   */
  getOptimalContentHeight(
    componentType: 'history' | 'input' | 'dialog' | 'debug',
    dimensions?: LayoutDimensions
  ): number {
    const dims = dimensions || this.calculateDimensions();
    
    switch (componentType) {
      case 'history':
        return Math.floor(dims.availableTerminalHeight * 0.7);
      case 'input':
        return 3; // Fixed height for input
      case 'dialog':
        return Math.floor(dims.availableTerminalHeight * 0.8);
      case 'debug':
        return dims.debugConsoleMaxHeight;
      default:
        return Math.floor(dims.availableTerminalHeight * 0.5);
    }
  }

  /**
   * Calculate responsive margins and padding
   */
  getSpacing(dimensions?: LayoutDimensions): {
    marginX: number;
    marginY: number;
    paddingX: number;
    paddingY: number;
  } {
    const dims = dimensions || this.calculateDimensions();
    
    // Adjust spacing based on terminal size
    const baseSpacing = dims.terminalWidth > 100 ? 2 : 1;
    
    return {
      marginX: baseSpacing,
      marginY: Math.max(1, Math.floor(baseSpacing / 2)),
      paddingX: baseSpacing,
      paddingY: Math.max(1, Math.floor(baseSpacing / 2))
    };
  }
}

// Singleton instance
export const layoutService = new LayoutService(); 