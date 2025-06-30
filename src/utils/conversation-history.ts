/**
 * Conversation History Manager
 * 
 * Manages persistent storage and retrieval of conversation history
 * between CLI sessions, providing continuity and context.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { logger } from './logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';

/**
 * Conversation message interface
 */
export interface ConversationMessage {
  /**
   * Unique message ID
   */
  id: string;
  
  /**
   * Message timestamp
   */
  timestamp: number;
  
  /**
   * Message role (user or assistant)
   */
  role: 'user' | 'assistant' | 'system';
  
  /**
   * Message content
   */
  content: string;
  
  /**
   * Optional metadata
   */
  metadata?: {
    model?: string;
    tokens?: {
      input: number;
      output: number;
    };
    command?: string;
    file?: string;
  };
}

/**
 * Conversation session interface
 */
export interface ConversationSession {
  /**
   * Session ID
   */
  id: string;
  
  /**
   * Session start time
   */
  startTime: number;
  
  /**
   * Session end time (if ended)
   */
  endTime?: number;
  
  /**
   * Session title/description
   */
  title?: string;
  
  /**
   * Messages in this session
   */
  messages: ConversationMessage[];
  
  /**
   * Session statistics
   */
  stats?: {
    messageCount: number;
    totalTokens: number;
    duration: number;
  };
}

/**
 * History storage options
 */
export interface HistoryOptions {
  /**
   * Maximum number of sessions to keep
   */
  maxSessions?: number;
  
  /**
   * Maximum age of sessions in days
   */
  maxAgeInDays?: number;
  
  /**
   * Storage directory path
   */
  storageDir?: string;
  
  /**
   * Enable compression for old sessions
   */
  enableCompression?: boolean;
}

/**
 * Conversation History Manager
 */
export class ConversationHistoryManager {
  private storageDir: string;
  private options: Required<HistoryOptions>;
  private currentSession: ConversationSession | null = null;

  constructor(options: HistoryOptions = {}) {
    this.options = {
      maxSessions: options.maxSessions || 100,
      maxAgeInDays: options.maxAgeInDays || 30,
      storageDir: options.storageDir || path.join(os.homedir(), '.claude-code', 'history'),
      enableCompression: options.enableCompression || true
    };
    
    this.storageDir = this.options.storageDir;
  }

  /**
   * Initialize the history manager
   */
  async initialize(): Promise<void> {
    try {
      // Ensure storage directory exists
      await fs.mkdir(this.storageDir, { recursive: true });
      
      // Clean up old sessions
      await this.cleanupOldSessions();
      
      logger.debug('Conversation history manager initialized', {
        storageDir: this.storageDir,
        maxSessions: this.options.maxSessions
      });
    } catch (error) {
      logger.error('Failed to initialize conversation history manager:', error);
      throw createUserError('Failed to initialize conversation history', {
        cause: error,
        category: ErrorCategory.INITIALIZATION
      });
    }
  }

  /**
   * Start a new conversation session
   */
  async startSession(title?: string): Promise<string> {
    const sessionId = this.generateSessionId();
    
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      title: title || `Session ${new Date().toLocaleString()}`,
      messages: []
    };
    
    logger.debug(`Started new conversation session: ${sessionId}`);
    return sessionId;
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }
    
    this.currentSession.endTime = Date.now();
    this.currentSession.stats = this.calculateSessionStats(this.currentSession);
    
    // Save the session
    await this.saveSession(this.currentSession);
    
    logger.debug(`Ended conversation session: ${this.currentSession.id}`);
    this.currentSession = null;
  }

  /**
   * Add a message to the current session
   */
  async addMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: ConversationMessage['metadata']
  ): Promise<string> {
    if (!this.currentSession) {
      await this.startSession();
    }
    
    const messageId = this.generateMessageId();
    const message: ConversationMessage = {
      id: messageId,
      timestamp: Date.now(),
      role,
      content,
      metadata
    };
    
    this.currentSession!.messages.push(message);
    
    // Auto-save every few messages to prevent data loss
    if (this.currentSession!.messages.length % 5 === 0) {
      await this.saveSession(this.currentSession!);
    }
    
    return messageId;
  }

  /**
   * Get the current session
   */
  getCurrentSession(): ConversationSession | null {
    return this.currentSession;
  }

  /**
   * Get recent messages from current session
   */
  getRecentMessages(count: number = 10): ConversationMessage[] {
    if (!this.currentSession) {
      return [];
    }
    
    return this.currentSession.messages.slice(-count);
  }

  /**
   * Search messages across all sessions
   */
  async searchMessages(query: string, limit: number = 50): Promise<ConversationMessage[]> {
    const sessions = await this.listSessions();
    const results: ConversationMessage[] = [];
    
    for (const sessionSummary of sessions) {
      if (results.length >= limit) break;
      
      try {
        const session = await this.loadSession(sessionSummary.id);
        const matchingMessages = session.messages.filter(msg =>
          msg.content.toLowerCase().includes(query.toLowerCase())
        );
        
        results.push(...matchingMessages.slice(0, limit - results.length));
      } catch (error) {
        logger.warn(`Failed to search in session ${sessionSummary.id}:`, error);
      }
    }
    
    return results.slice(0, limit);
  }

  /**
   * List all saved sessions
   */
  async listSessions(): Promise<Array<{
    id: string;
    title: string;
    startTime: number;
    endTime?: number;
    messageCount: number;
  }>> {
    try {
      const files = await fs.readdir(this.storageDir);
      const sessionFiles = files.filter(f => f.endsWith('.json'));
      
      const sessions = await Promise.all(
        sessionFiles.map(async (file) => {
          try {
            const sessionPath = path.join(this.storageDir, file);
            const content = await fs.readFile(sessionPath, 'utf-8');
            const session: ConversationSession = JSON.parse(content);
            
            return {
              id: session.id,
              title: session.title || 'Untitled Session',
              startTime: session.startTime,
              endTime: session.endTime,
              messageCount: session.messages.length
            };
          } catch (error) {
            logger.warn(`Failed to read session file ${file}:`, error);
            return null;
          }
        })
      );
      
      return sessions
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .sort((a, b) => b.startTime - a.startTime);
    } catch (error) {
      logger.error('Failed to list sessions:', error);
      return [];
    }
  }

  /**
   * Load a specific session
   */
  async loadSession(sessionId: string): Promise<ConversationSession> {
    const sessionPath = path.join(this.storageDir, `${sessionId}.json`);
    
    try {
      const content = await fs.readFile(sessionPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw createUserError(`Session not found: ${sessionId}`, {
        cause: error,
        category: ErrorCategory.FILE_NOT_FOUND
      });
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const sessionPath = path.join(this.storageDir, `${sessionId}.json`);
    
    try {
      await fs.unlink(sessionPath);
      logger.debug(`Deleted session: ${sessionId}`);
    } catch (error) {
      throw createUserError(`Failed to delete session: ${sessionId}`, {
        cause: error,
        category: ErrorCategory.FILE_SYSTEM
      });
    }
  }

  /**
   * Export session to a file
   */
  async exportSession(sessionId: string, outputPath: string): Promise<void> {
    const session = await this.loadSession(sessionId);
    
    // Create a readable export format
    const exportData = {
      session: {
        id: session.id,
        title: session.title,
        startTime: new Date(session.startTime).toISOString(),
        endTime: session.endTime ? new Date(session.endTime).toISOString() : null,
        stats: session.stats
      },
      messages: session.messages.map(msg => ({
        timestamp: new Date(msg.timestamp).toISOString(),
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata
      }))
    };
    
    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
    logger.info(`Session exported to: ${outputPath}`);
  }

  /**
   * Save a session to disk
   */
  private async saveSession(session: ConversationSession): Promise<void> {
    const sessionPath = path.join(this.storageDir, `${session.id}.json`);
    
    try {
      await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
      logger.debug(`Saved session: ${session.id}`);
    } catch (error) {
      logger.error(`Failed to save session ${session.id}:`, error);
    }
  }

  /**
   * Clean up old sessions
   */
  private async cleanupOldSessions(): Promise<void> {
    try {
      const sessions = await this.listSessions();
      const now = Date.now();
      const maxAge = this.options.maxAgeInDays * 24 * 60 * 60 * 1000;
      
      // Delete sessions that are too old
      const oldSessions = sessions.filter(s => 
        now - s.startTime > maxAge
      );
      
      for (const session of oldSessions) {
        await this.deleteSession(session.id);
      }
      
      // Delete excess sessions (keep only the most recent)
      const recentSessions = sessions
        .filter(s => now - s.startTime <= maxAge)
        .sort((a, b) => b.startTime - a.startTime);
      
      if (recentSessions.length > this.options.maxSessions) {
        const excessSessions = recentSessions.slice(this.options.maxSessions);
        for (const session of excessSessions) {
          await this.deleteSession(session.id);
        }
      }
      
      if (oldSessions.length > 0 || recentSessions.length > this.options.maxSessions) {
        logger.debug(`Cleaned up ${oldSessions.length} old sessions and ${Math.max(0, recentSessions.length - this.options.maxSessions)} excess sessions`);
      }
    } catch (error) {
      logger.warn('Failed to cleanup old sessions:', error);
    }
  }

  /**
   * Calculate session statistics
   */
  private calculateSessionStats(session: ConversationSession): ConversationSession['stats'] {
    const messageCount = session.messages.length;
    const totalTokens = session.messages.reduce((sum, msg) => {
      return sum + (msg.metadata?.tokens?.input || 0) + (msg.metadata?.tokens?.output || 0);
    }, 0);
    
    const duration = session.endTime ? session.endTime - session.startTime : Date.now() - session.startTime;
    
    return {
      messageCount,
      totalTokens,
      duration
    };
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `msg_${timestamp}_${random}`;
  }
}

/**
 * Global conversation history manager instance
 */
export const conversationHistory = new ConversationHistoryManager(); 