/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { ConversationMessage, ToolCall, ToolCallResult, TurnStatus, Thought } from '../interfaces/types';

/**
 * Events emitted by the TurnSystem
 */
export enum TurnEvent {
  START = 'start',
  CONTENT = 'content',
  TOOL_CALL = 'tool-call',
  TOOL_RESULT = 'tool-result',
  THOUGHT = 'thought',
  ERROR = 'error',
  COMPLETE = 'complete',
  STATUS_CHANGE = 'status-change'
}

/**
 * Result of a conversation turn
 */
export interface TurnResult {
  content: string;
  toolCalls: ToolCall[];
  messages: ConversationMessage[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  status: TurnStatus;
  error?: Error;
}

/**
 * Core domain entity representing a conversation turn
 */
export class Turn {
  private status: TurnStatus = TurnStatus.IDLE;
  private messages: ConversationMessage[] = [];
  private currentContent: string = '';
  private currentToolCalls: ToolCall[] = [];
  private currentThought?: Thought;
  private toolCallResults: ToolCallResult[] = [];
  private error?: Error;

  /**
   * Start a new turn with initial messages
   */
  start(initialMessages: ConversationMessage[]) {
    if (this.status !== TurnStatus.IDLE) {
      throw new Error('Turn is already in progress');
    }
    this.messages = [...initialMessages];
    this.status = TurnStatus.IN_PROGRESS;
    return this;
  }

  /**
   * Add content to the current turn
   */
  addContent(content: string) {
    this.currentContent += content;
    return this;
  }

  /**
   * Add a tool call to the current turn
   */
  addToolCall(toolCall: ToolCall) {
    this.currentToolCalls.push(toolCall);
    this.status = TurnStatus.WAITING_FOR_TOOL;
    return this;
  }

  /**
   * Add a tool result to the current turn
   */
  addToolResult(toolResult: ToolCallResult) {
    this.toolCallResults.push(toolResult);
    const pendingToolCalls = this.getPendingToolCalls();
    
    if (pendingToolCalls.length === 0) {
      this.status = TurnStatus.COMPLETED;
    }
    
    return this;
  }

  /**
   * Set the current thought
   */
  setThought(thought: Thought) {
    this.currentThought = thought;
    return this;
  }

  /**
   * Mark the turn as complete
   */
  complete(finalMessage: ConversationMessage) {
    this.messages.push(finalMessage);
    this.status = TurnStatus.COMPLETED;
    return this;
  }

  /**
   * Mark the turn as error
   */
  fail(error: Error) {
    this.error = error;
    this.status = TurnStatus.ERROR;
    return this;
  }

  /**
   * Get the current status
   */
  getStatus(): TurnStatus {
    return this.status;
  }

  /**
   * Get all messages in the turn
   */
  getMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Get the current content
   */
  getContent(): string {
    return this.currentContent;
  }

  /**
   * Get all tool calls
   */
  getToolCalls(): ToolCall[] {
    return [...this.currentToolCalls];
  }

  /**
   * Get pending tool calls (those without results)
   */
  getPendingToolCalls(): ToolCall[] {
    const resultIds = this.toolCallResults.map(result => result.toolCallId);
    return this.currentToolCalls.filter(call => !resultIds.includes(call.id));
  }

  /**
   * Check if there are pending tool calls
   */
  hasPendingToolCalls(): boolean {
    return this.getPendingToolCalls().length > 0;
  }

  /**
   * Get the current thought
   */
  getThought(): Thought | undefined {
    return this.currentThought;
  }

  /**
   * Get the error if any
   */
  getError(): Error | undefined {
    return this.error;
  }

  /**
   * Reset the turn
   */
  reset() {
    this.status = TurnStatus.IDLE;
    this.messages = [];
    this.currentContent = '';
    this.currentToolCalls = [];
    this.toolCallResults = [];
    this.currentThought = undefined;
    this.error = undefined;
    return this;
  }

  /**
   * Get the result of the turn
   */
  getResult(): TurnResult {
    return {
      content: this.currentContent,
      toolCalls: this.currentToolCalls,
      messages: this.messages,
      status: this.status,
      error: this.error
    };
  }
}