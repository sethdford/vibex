/**
 * Progress Theme Service - Clean Architecture
 * 
 * Single Responsibility: Theme and color management for progress components
 * Following Gemini CLI's focused service patterns
 */

import { Colors } from '../../colors.js';
import type { StatusType } from '../StatusIcon.js';
import type { ProgressTheme, ProgressThemeColors } from './types.js';

/**
 * Progress Theme Service
 * Focus: Color themes and styling only
 */
export class ProgressThemeService {
  /**
   * Get theme colors for a specific theme
   */
  getThemeColors(
    theme: ProgressTheme, 
    customColor?: string, 
    customBackground?: string
  ): ProgressThemeColors {
    const themes: Record<ProgressTheme, ProgressThemeColors> = {
      default: { 
        fill: customColor || Colors.Primary, 
        background: customBackground || Colors.TextDim 
      },
      success: { 
        fill: customColor || Colors.Success, 
        background: customBackground || Colors.TextDim 
      },
      warning: { 
        fill: customColor || Colors.Warning, 
        background: customBackground || Colors.TextDim 
      },
      error: { 
        fill: customColor || Colors.Error, 
        background: customBackground || Colors.TextDim 
      },
      info: { 
        fill: customColor || Colors.Info, 
        background: customBackground || Colors.TextDim 
      },
    };

    return themes[theme];
  }

  /**
   * Get status colors mapping
   */
  getStatusColors(): Record<StatusType, string> {
    return {
      running: Colors.AccentBlue,
      success: Colors.Success,
      completed: Colors.Success,
      error: Colors.Error,
      failed: Colors.Error,
      warning: Colors.Warning,
      info: Colors.Info,
      waiting: Colors.TextMuted,
      paused: Colors.TextDim,
    };
  }

  /**
   * Get color for specific status
   */
  getStatusColor(status: StatusType): string {
    return this.getStatusColors()[status];
  }

  /**
   * Get theme-based progress color with opacity for animations
   */
  getAnimatedColor(theme: ProgressTheme, opacity: number = 1): string {
    const colors = this.getThemeColors(theme);
    
    // For now, return the base color (Ink doesn't support opacity)
    // In a real terminal implementation, you might apply ANSI color codes
    return colors.fill;
  }

  /**
   * Get contrasting text color for a background
   */
  getContrastingTextColor(backgroundColor: string): string {
    // Simple contrast logic - in a real implementation you'd calculate luminance
    const darkColors = [Colors.Primary, Colors.Error, Colors.Success];
    return darkColors.includes(backgroundColor) ? Colors.Text : Colors.TextMuted;
  }

  /**
   * Get semantic color based on progress value
   */
  getProgressSemanticColor(value: number): string {
    if (value >= 100) return Colors.Success;
    if (value >= 75) return Colors.Info;
    if (value >= 50) return Colors.Primary;
    if (value >= 25) return Colors.Warning;
    return Colors.Error;
  }

  /**
   * Get velocity-based color
   */
  getVelocityColor(velocity: number, threshold: number = 1): string {
    if (velocity >= threshold * 2) return Colors.Success;
    if (velocity >= threshold) return Colors.Info;
    if (velocity >= threshold * 0.5) return Colors.Warning;
    return Colors.Error;
  }

  /**
   * Get accuracy-based color
   */
  getAccuracyColor(accuracy: number): string {
    if (accuracy >= 80) return Colors.Success;
    if (accuracy >= 60) return Colors.Info;
    if (accuracy >= 40) return Colors.Warning;
    return Colors.Error;
  }

  /**
   * Apply theme to component styles
   */
  applyTheme(
    theme: ProgressTheme,
    customColor?: string,
    customBackground?: string
  ): {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
  } {
    const themeColors = this.getThemeColors(theme, customColor, customBackground);
    
    return {
      primaryColor: themeColors.fill,
      backgroundColor: themeColors.background,
      textColor: this.getContrastingTextColor(themeColors.background),
      accentColor: this.getStatusColor('info')
    };
  }
}

/**
 * Factory function for creating theme service
 */
export function createProgressThemeService(): ProgressThemeService {
  return new ProgressThemeService();
}