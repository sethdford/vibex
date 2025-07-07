/**
 * Command History Service
 * 
 * Manages command execution history with persistence and search
 * Following Gemini CLI patterns - single responsibility, clean interface
 */

import { logger } from '../../utils/logger.js';
import type { CommandHistoryEntry, CommandResult } from './types.js';

export class CommandHistoryService {
  private history: CommandHistoryEntry[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize = 1000) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Add command execution to history
   */
  addEntry(command: string, result: CommandResult): void {
    try {
      const entry: CommandHistoryEntry = {
        command: command.trim(),
        result: { ...result }, // Clone to avoid mutations
        timestamp: Date.now()
      };

      this.history.push(entry);

      // Trim history if it exceeds max size
      if (this.history.length > this.maxHistorySize) {
        const removed = this.history.splice(0, this.history.length - this.maxHistorySize);
        logger.debug(`Trimmed ${removed.length} old history entries`);
      }

      logger.debug(`Added command to history: ${command}`);
    } catch (error) {
      logger.error('Failed to add command to history:', error);
    }
  }

  /**
   * Get all history entries
   */
  getHistory(): CommandHistoryEntry[] {
    return [...this.history]; // Return copy to prevent mutations
  }

  /**
   * Get recent history entries
   */
  getRecentHistory(count: number): CommandHistoryEntry[] {
    if (count <= 0) return [];
    return this.history.slice(-count);
  }

  /**
   * Search history by command text
   */
  searchHistory(query: string, caseSensitive = false): CommandHistoryEntry[] {
    if (!query.trim()) return [];

    const searchTerm = caseSensitive ? query : query.toLowerCase();
    
    return this.history.filter(entry => {
      const command = caseSensitive ? entry.command : entry.command.toLowerCase();
      return command.includes(searchTerm);
    });
  }

  /**
   * Get history entries by success status
   */
  getHistoryByStatus(success: boolean): CommandHistoryEntry[] {
    return this.history.filter(entry => entry.result.success === success);
  }

  /**
   * Get failed commands
   */
  getFailedCommands(): CommandHistoryEntry[] {
    return this.getHistoryByStatus(false);
  }

  /**
   * Get successful commands
   */
  getSuccessfulCommands(): CommandHistoryEntry[] {
    return this.getHistoryByStatus(true);
  }

  /**
   * Get history entries within time range
   */
  getHistoryInTimeRange(startTime: number, endTime: number): CommandHistoryEntry[] {
    return this.history.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    );
  }

  /**
   * Get unique commands (deduplicated)
   */
  getUniqueCommands(): string[] {
    const uniqueCommands = new Set<string>();
    
    for (const entry of this.history) {
      uniqueCommands.add(entry.command);
    }
    
    return Array.from(uniqueCommands);
  }

  /**
   * Get command frequency statistics
   */
  getCommandFrequency(): Map<string, number> {
    const frequency = new Map<string, number>();
    
    for (const entry of this.history) {
      const count = frequency.get(entry.command) || 0;
      frequency.set(entry.command, count + 1);
    }
    
    return frequency;
  }

  /**
   * Get most frequently used commands
   */
  getMostFrequentCommands(limit = 10): Array<{ command: string; count: number }> {
    const frequency = this.getCommandFrequency();
    
    return Array.from(frequency.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Clear all history
   */
  clear(): void {
    const previousSize = this.history.length;
    this.history = [];
    logger.debug(`Cleared command history (${previousSize} entries)`);
  }

  /**
   * Remove entries older than specified time
   */
  removeOldEntries(olderThanMs: number): number {
    const cutoffTime = Date.now() - olderThanMs;
    const originalLength = this.history.length;
    
    this.history = this.history.filter(entry => entry.timestamp > cutoffTime);
    
    const removedCount = originalLength - this.history.length;
    if (removedCount > 0) {
      logger.debug(`Removed ${removedCount} old history entries`);
    }
    
    return removedCount;
  }

  /**
   * Get history statistics
   */
  getStatistics(): {
    totalEntries: number;
    successfulCommands: number;
    failedCommands: number;
    uniqueCommands: number;
    successRate: number;
    oldestEntry?: number;
    newestEntry?: number;
  } {
    const totalEntries = this.history.length;
    const successfulCommands = this.getSuccessfulCommands().length;
    const failedCommands = this.getFailedCommands().length;
    const uniqueCommands = this.getUniqueCommands().length;
    const successRate = totalEntries > 0 ? (successfulCommands / totalEntries) * 100 : 0;

    const stats = {
      totalEntries,
      successfulCommands,
      failedCommands,
      uniqueCommands,
      successRate
    };

    if (this.history.length > 0) {
      return {
        ...stats,
        oldestEntry: this.history[0].timestamp,
        newestEntry: this.history[this.history.length - 1].timestamp
      };
    }

    return stats;
  }

  /**
   * Export history to JSON
   */
  exportHistory(): string {
    try {
      return JSON.stringify(this.history, null, 2);
    } catch (error) {
      logger.error('Failed to export history:', error);
      throw new Error('Failed to export command history');
    }
  }

  /**
   * Import history from JSON
   */
  importHistory(jsonData: string, append = false): void {
    try {
      const imported = JSON.parse(jsonData) as CommandHistoryEntry[];
      
      if (!Array.isArray(imported)) {
        throw new Error('Invalid history format: expected array');
      }

      // Validate entries
      for (const entry of imported) {
        if (!this.isValidHistoryEntry(entry)) {
          throw new Error('Invalid history entry format');
        }
      }

      if (append) {
        this.history.push(...imported);
      } else {
        this.history = imported;
      }

      // Apply size limit
      if (this.history.length > this.maxHistorySize) {
        this.history = this.history.slice(-this.maxHistorySize);
      }

      logger.debug(`Imported ${imported.length} history entries`);
    } catch (error) {
      logger.error('Failed to import history:', error);
      throw new Error('Failed to import command history');
    }
  }

  /**
   * Validate history entry structure
   */
  private isValidHistoryEntry(entry: any): entry is CommandHistoryEntry {
    return (
      entry &&
      typeof entry.command === 'string' &&
      typeof entry.timestamp === 'number' &&
      entry.result &&
      typeof entry.result.success === 'boolean'
    );
  }
}

// Singleton instance
export const commandHistoryService = new CommandHistoryService(); 