/**
 * Content Display Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for content display utilities, icons, and formatting
 */

import { ContentType, ProcessingStatus, MultimodalTheme } from './types.js';
import { Colors } from '../../colors.js';

/**
 * Service for managing content display utilities
 */
export class ContentDisplayService {
  private theme: MultimodalTheme;

  constructor(theme?: Partial<MultimodalTheme>) {
    this.theme = {
      primary: Colors.Primary,
      secondary: Colors.Secondary,
      accent: Colors.AccentBlue,
      success: Colors.Success,
      warning: Colors.Warning,
      error: Colors.Error,
      muted: Colors.TextMuted,
      ...theme
    };
  }

  /**
   * Get icon for content type
   */
  getContentIcon(type: ContentType): string {
    switch (type) {
      case ContentType.IMAGE:
        return '🖼️';
      case ContentType.AUDIO:
        return '🎵';
      case ContentType.VIDEO:
        return '🎬';
      case ContentType.DOCUMENT:
        return '📄';
      case ContentType.CODE:
        return '💻';
      case ContentType.SPREADSHEET:
        return '📊';
      case ContentType.PRESENTATION:
        return '📽️';
      case ContentType.TEXT:
      default:
        return '📝';
    }
  }

  /**
   * Get icon for processing status
   */
  getStatusIcon(status: ProcessingStatus): string {
    switch (status) {
      case ProcessingStatus.PENDING:
        return '⏳';
      case ProcessingStatus.ANALYZING:
        return '🔍';
      case ProcessingStatus.EXTRACTING:
        return '📤';
      case ProcessingStatus.TRANSCRIBING:
        return '🎤';
      case ProcessingStatus.COMPLETE:
        return '✅';
      case ProcessingStatus.ERROR:
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Get color for processing status
   */
  getStatusColor(status: ProcessingStatus): string {
    switch (status) {
      case ProcessingStatus.ERROR:
        return this.theme.error;
      case ProcessingStatus.COMPLETE:
        return this.theme.success;
      case ProcessingStatus.PENDING:
      case ProcessingStatus.ANALYZING:
      case ProcessingStatus.EXTRACTING:
      case ProcessingStatus.TRANSCRIBING:
        return this.theme.warning;
      default:
        return this.theme.muted;
    }
  }

  /**
   * Get color for content type
   */
  getContentTypeColor(type: ContentType): string {
    switch (type) {
      case ContentType.IMAGE:
        return this.theme.accent;
      case ContentType.AUDIO:
        return this.theme.secondary;
      case ContentType.VIDEO:
        return this.theme.primary;
      case ContentType.DOCUMENT:
        return this.theme.success;
      case ContentType.CODE:
        return this.theme.warning;
      case ContentType.SPREADSHEET:
        return '#2E7D32'; // Green
      case ContentType.PRESENTATION:
        return '#F57C00'; // Orange
      case ContentType.TEXT:
      default:
        return this.theme.muted;
    }
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Format duration (seconds to human readable)
   */
  formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Format processing time
   */
  formatProcessingTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = Math.floor((milliseconds % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Format confidence percentage
   */
  formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  /**
   * Get confidence color
   */
  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) {
      return this.theme.success;
    } else if (confidence >= 0.6) {
      return this.theme.warning;
    } else {
      return this.theme.error;
    }
  }

  /**
   * Format timestamp
   */
  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Get progress bar representation
   */
  getProgressBar(progress: number, width: number = 20): string {
    const filled = Math.floor((progress / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Get content type label
   */
  getContentTypeLabel(type: ContentType): string {
    switch (type) {
      case ContentType.IMAGE:
        return 'Image';
      case ContentType.AUDIO:
        return 'Audio';
      case ContentType.VIDEO:
        return 'Video';
      case ContentType.DOCUMENT:
        return 'Document';
      case ContentType.CODE:
        return 'Code';
      case ContentType.SPREADSHEET:
        return 'Spreadsheet';
      case ContentType.PRESENTATION:
        return 'Presentation';
      case ContentType.TEXT:
        return 'Text';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get processing status label
   */
  getProcessingStatusLabel(status: ProcessingStatus): string {
    switch (status) {
      case ProcessingStatus.PENDING:
        return 'Pending';
      case ProcessingStatus.ANALYZING:
        return 'Analyzing';
      case ProcessingStatus.EXTRACTING:
        return 'Extracting';
      case ProcessingStatus.TRANSCRIBING:
        return 'Transcribing';
      case ProcessingStatus.COMPLETE:
        return 'Complete';
      case ProcessingStatus.ERROR:
        return 'Error';
      default:
        return 'Unknown';
    }
  }

  /**
   * Truncate text with ellipsis
   */
  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength - 3) + '...';
  }

  /**
   * Format key-value pairs for display
   */
  formatKeyValue(key: string, value: string | number, maxValueLength: number = 30): string {
    const formattedValue = typeof value === 'string' 
      ? this.truncateText(value, maxValueLength)
      : value.toString();
    
    return `${key}: ${formattedValue}`;
  }

  /**
   * Get layout dimensions for terminal
   */
  getLayoutDimensions(terminalWidth: number, terminalHeight: number): {
    contentWidth: number;
    contentHeight: number;
    itemWidth: number;
    maxItems: number;
  } {
    const contentWidth = Math.max(40, terminalWidth - 4); // Leave margin
    const contentHeight = Math.max(10, terminalHeight - 8); // Leave space for header/footer
    const itemWidth = Math.max(30, contentWidth - 2); // Leave border space
    const maxItems = Math.max(3, contentHeight - 2); // Leave space for borders

    return {
      contentWidth,
      contentHeight,
      itemWidth,
      maxItems
    };
  }

  /**
   * Create border string
   */
  createBorder(width: number, style: 'single' | 'double' | 'round' = 'single'): string {
    const chars = {
      single: { horizontal: '─', vertical: '│', topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘' },
      double: { horizontal: '═', vertical: '║', topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝' },
      round: { horizontal: '─', vertical: '│', topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯' }
    };
    
    const char = chars[style];
    return char.horizontal.repeat(Math.max(0, width - 2));
  }

  /**
   * Get help text for controls
   */
  getControlsHelp(): string[] {
    return [
      'Navigation: ↑↓ select • Space toggle • Enter analyze • Ctrl+A select all',
      'Actions: Ctrl+R remove • Ctrl+P batch process • Ctrl+V view mode • Ctrl+F filter • Ctrl+I analysis',
      'Files: Ctrl+U add files • Ctrl+O current dir • Escape cancel'
    ];
  }

  /**
   * Get capabilities help text
   */
  getCapabilitiesHelp(): string[] {
    return [
      'Supported features depend on your configuration:',
      '• Image Analysis: Visual content recognition and description',
      '• Audio Transcription: Speech-to-text conversion',
      '• Video Analysis: Frame analysis and motion detection',
      '• Document Extraction: Text and structure extraction',
      '• Code Analysis: Syntax analysis and structure detection',
      '• Real-time Processing: Live content analysis',
      '• Batch Processing: Multiple file processing',
      '• Cloud Processing: Enhanced analysis capabilities'
    ];
  }

  /**
   * Update theme
   */
  updateTheme(theme: Partial<MultimodalTheme>): void {
    this.theme = { ...this.theme, ...theme };
  }

  /**
   * Get current theme
   */
  getTheme(): MultimodalTheme {
    return { ...this.theme };
  }

  /**
   * Create status summary
   */
  createStatusSummary(stats: {
    total: number;
    selected: number;
    processing: number;
    byStatus: Record<ProcessingStatus, number>;
  }): string {
    const parts: string[] = [];
    
    if (stats.total > 0) {
      parts.push(`${stats.total} items`);
    }
    
    if (stats.selected > 0) {
      parts.push(`${stats.selected} selected`);
    }
    
    if (stats.processing > 0) {
      parts.push(`${stats.processing} processing`);
    }
    
    const completed = stats.byStatus[ProcessingStatus.COMPLETE] || 0;
    if (completed > 0) {
      parts.push(`${completed} complete`);
    }
    
    const errors = stats.byStatus[ProcessingStatus.ERROR] || 0;
    if (errors > 0) {
      parts.push(`${errors} errors`);
    }
    
    return parts.join(' • ');
  }
} 