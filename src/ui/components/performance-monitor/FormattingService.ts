/**
 * Formatting Service - Clean Architecture
 * 
 * Single Responsibility: Data formatting and display utilities
 * Following Gemini CLI's focused service patterns
 */

import type { PerformanceMetrics, PerformanceAlert, AlertSeverity } from './types.js';
import { Colors } from '../../colors.js';

/**
 * Formatting Service
 * Focus: Data formatting, display utilities, and text processing
 */
export class FormattingService {
  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Format uptime to human readable string
   */
  formatUptime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    } else {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return `${days}d ${hours}h`;
    }
  }

  /**
   * Format percentage with precision
   */
  formatPercentage(value: number, precision: number = 1): string {
    return `${value.toFixed(precision)}%`;
  }

  /**
   * Format number with precision
   */
  formatNumber(value: number, precision: number = 1): string {
    return value.toFixed(precision);
  }

  /**
   * Format timestamp to time string
   */
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  /**
   * Format timestamp to date string
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  /**
   * Format timestamp to full date-time string
   */
  formatDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Format duration in milliseconds
   */
  formatDuration(milliseconds: number): string {
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
   * Get color for alert severity
   */
  getAlertColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return Colors.Error;
      case 'high':
        return Colors.Warning;
      case 'medium':
        return Colors.Info;
      case 'low':
        return Colors.TextDim;
      default:
        return Colors.Text;
    }
  }

  /**
   * Get color for metric value based on thresholds
   */
  getMetricColor(value: number, warningThreshold: number, criticalThreshold: number): string {
    if (value >= criticalThreshold) {
      return Colors.Error;
    } else if (value >= warningThreshold) {
      return Colors.Warning;
    } else {
      return Colors.Success;
    }
  }

  /**
   * Get status color based on percentage
   */
  getStatusColor(percentage: number): string {
    if (percentage >= 90) {
      return Colors.Error;
    } else if (percentage >= 70) {
      return Colors.Warning;
    } else if (percentage >= 50) {
      return Colors.Info;
    } else {
      return Colors.Success;
    }
  }

  /**
   * Format memory metrics summary
   */
  formatMemorySummary(metrics: PerformanceMetrics): string {
    const used = this.formatBytes(metrics.memory.used);
    const total = this.formatBytes(metrics.memory.total);
    const percentage = this.formatPercentage(metrics.memory.percentage);
    return `${used} / ${total} (${percentage})`;
  }

  /**
   * Format CPU metrics summary
   */
  formatCpuSummary(metrics: PerformanceMetrics): string {
    const usage = this.formatPercentage(metrics.cpu.usage);
    const cores = metrics.cpu.cores;
    const loadAvg = metrics.cpu.loadAverage[0].toFixed(2);
    return `${usage} (${cores} cores, load: ${loadAvg})`;
  }

  /**
   * Format network metrics summary
   */
  formatNetworkSummary(metrics: PerformanceMetrics): string {
    const received = this.formatBytes(metrics.network.bytesReceived);
    const sent = this.formatBytes(metrics.network.bytesSent);
    const rps = this.formatNumber(metrics.network.requestsPerSecond);
    return `↓${received} ↑${sent} (${rps} req/s)`;
  }

  /**
   * Format system metrics summary
   */
  formatSystemSummary(metrics: PerformanceMetrics): string {
    const uptime = this.formatUptime(metrics.system.uptime);
    const platform = metrics.system.platform;
    const nodeVersion = metrics.system.nodeVersion;
    return `${platform} ${nodeVersion} (up ${uptime})`;
  }

  /**
   * Format alert message with context
   */
  formatAlertMessage(alert: PerformanceAlert): string {
    const timestamp = this.formatTimestamp(alert.timestamp);
    const severity = alert.severity.toUpperCase();
    return `[${timestamp}] ${severity}: ${alert.message}`;
  }

  /**
   * Format metrics for export
   */
  formatMetricsForExport(metrics: PerformanceMetrics): Record<string, any> {
    return {
      timestamp: this.formatDateTime(metrics.timestamp),
      memory: {
        used: this.formatBytes(metrics.memory.used),
        total: this.formatBytes(metrics.memory.total),
        percentage: this.formatPercentage(metrics.memory.percentage),
        heap_used: this.formatBytes(metrics.memory.heapUsed),
        heap_total: this.formatBytes(metrics.memory.heapTotal),
        rss: this.formatBytes(metrics.memory.rss),
      },
      cpu: {
        usage: this.formatPercentage(metrics.cpu.usage),
        cores: metrics.cpu.cores,
        load_average_1m: this.formatNumber(metrics.cpu.loadAverage[0], 2),
        load_average_5m: this.formatNumber(metrics.cpu.loadAverage[1], 2),
        load_average_15m: this.formatNumber(metrics.cpu.loadAverage[2], 2),
      },
      network: {
        bytes_received: this.formatBytes(metrics.network.bytesReceived),
        bytes_sent: this.formatBytes(metrics.network.bytesSent),
        requests_per_second: this.formatNumber(metrics.network.requestsPerSecond),
        latency: `${metrics.network.latency}ms`,
        errors: metrics.network.errors,
      },
      system: {
        uptime: this.formatUptime(metrics.system.uptime),
        platform: metrics.system.platform,
        node_version: metrics.system.nodeVersion,
        pid: metrics.system.pid,
      },
    };
  }

  /**
   * Get progress bar representation
   */
  getProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Get trend arrow indicator
   */
  getTrendIndicator(direction: 'increasing' | 'decreasing' | 'stable'): string {
    switch (direction) {
      case 'increasing':
        return '↗';
      case 'decreasing':
        return '↘';
      case 'stable':
        return '→';
      default:
        return '•';
    }
  }

  /**
   * Format load average values
   */
  formatLoadAverage(loadAverage: number[]): string {
    return loadAverage.map(load => load.toFixed(2)).join(', ');
  }

  /**
   * Get severity icon
   */
  getSeverityIcon(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  }

  /**
   * Get metric icon
   */
  getMetricIcon(type: 'memory' | 'cpu' | 'network' | 'system'): string {
    switch (type) {
      case 'memory':
        return '💾';
      case 'cpu':
        return '⚡';
      case 'network':
        return '🌐';
      case 'system':
        return '🖥️';
      default:
        return '📊';
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
   * Pad text to specific width
   */
  padText(text: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
    if (text.length >= width) {
      return text;
    }

    const padding = width - text.length;
    
    switch (align) {
      case 'right':
        return ' '.repeat(padding) + text;
      case 'center':
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
      default:
        return text + ' '.repeat(padding);
    }
  }
}

/**
 * Factory function for creating formatting service
 */
export function createFormattingService(): FormattingService {
  return new FormattingService();
} 