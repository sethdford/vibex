/**
 * Turn Manager
 * 
 * Manages conversation turns with tool calling and context handling.
 */

import { EventEmitter } from 'events';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { ContentGenerator, ContentEvent, ContentRequestConfig } from '../../infrastructure/content-generator.js';

/**
 * Tool input parameters (structured data)
 */
export interface ToolInputParameters {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Tool result data (structured response)
 */
export interface ToolResultData {
  [key: string]: unknown;
}

/**
 * Tool Call Definition
 */
export interface ToolCall {
  id: string;
  name: string;
  input: ToolInputParameters;
}

/**
 * Tool Result Definition
 */
export interface ToolResult {
  toolCallId: string;
  result: ToolResultData;
  error?: string;
}

/**
 * Message Types
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL = 'tool',
}

/**
 * Turn Status
 */
export enum TurnStatus {
  IDLE = 'idle',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_TOOL = 'waiting_for_tool',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Turn Result
 */
export interface TurnResult {
  content: string;
  toolCalls: ToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  thinking?: string;
}

/**
 * Events emitted by TurnManager
 */
export enum TurnEvent {
  START = 'start',
  CONTENT = 'content',
  THINKING = 'thinking',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',
  COMPLETE = 'complete',
  ERROR = 'error',
}

/**
 * Turn Manager Class
 * 
 * Manages a single conversation turn including tool calls
 */
export class TurnManager extends EventEmitter {
  private contentGenerator: ContentGenerator;
  private messages: MessageParam[] = [];
  private config: ContentRequestConfig;
  private status: TurnStatus = TurnStatus.IDLE;
  private content: string = '';
  private thinking: string = '';
  private pendingToolCalls: ToolCall[] = [];
  private completedToolCalls: ToolResult[] = [];
  
  constructor(
    contentGenerator: ContentGenerator,
    config: ContentRequestConfig,
    initialMessages: MessageParam[] = []
  ) {
    super();
    this.contentGenerator = contentGenerator;
    this.config = config;
    this.messages = [...initialMessages];
    
    // Forward content generator events
    this.setupEventForwarding();
  }
  
  /**
   * Execute the current turn with the given user message
   */
  public async execute(
    userMessage: string | MessageParam,
    signal?: AbortSignal
  ): Promise<TurnResult> {
    if (this.status === TurnStatus.IN_PROGRESS || this.status === TurnStatus.WAITING_FOR_TOOL) {
      throw new Error('Turn is already in progress');
    }
    
    try {
      this.status = TurnStatus.IN_PROGRESS;
      this.content = '';
      this.thinking = '';
      this.pendingToolCalls = [];
      this.completedToolCalls = [];
      
      // Add user message
      const formattedUserMessage = typeof userMessage === 'string'
        ? { role: 'user' as const, content: userMessage }
        : userMessage;
        
      this.messages.push(formattedUserMessage);
      
      // Forward event first
      this.emit(TurnEvent.START, { 
        model: this.config.model,
        messages: this.messages
      });
      
      // Set up stream handling
      await this.generateResponse(signal);
      
      // Process any tool calls
      if (this.pendingToolCalls.length > 0) {
        this.status = TurnStatus.WAITING_FOR_TOOL;
      } else {
        this.status = TurnStatus.COMPLETED;
      }
      
      // Return the result
      return {
        content: this.content,
        toolCalls: this.pendingToolCalls,
        thinking: this.thinking
      };
    } catch (error) {
      this.status = TurnStatus.FAILED;
      this.emit(TurnEvent.ERROR, error);
      throw error;
    }
  }
  
  /**
   * Submit a tool result to continue the turn
   */
  public async submitToolResult(
    toolResult: ToolResult,
    signal?: AbortSignal
  ): Promise<TurnResult> {
    if (this.status !== TurnStatus.WAITING_FOR_TOOL) {
      throw new Error('No pending tool calls to process');
    }
    
    try {
      // Find the pending tool call
      const toolCallIndex = this.pendingToolCalls.findIndex(
        call => call.id === toolResult.toolCallId
      );
      
      if (toolCallIndex === -1) {
        throw new Error(`No pending tool call found with ID: ${toolResult.toolCallId}`);
      }
      
      // Remove from pending and add to completed
      const [toolCall] = this.pendingToolCalls.splice(toolCallIndex, 1);
      this.completedToolCalls.push(toolResult);
      
      // Add tool message
      // We need to cast to any here to bypass MessageParam type constraints
      // since MessageParam doesn't explicitly support tool messages yet
      this.messages.push({
        role: 'tool',
        content: JSON.stringify(toolResult.result),
        tool_call_id: toolResult.toolCallId,
      } as any);
      
      // Emit tool result event
      this.emit(TurnEvent.TOOL_RESULT, {
        toolCallId: toolResult.toolCallId,
        toolName: toolCall.name,
        result: toolResult.result,
      });
      
      // If we still have pending tool calls, stay in waiting state
      if (this.pendingToolCalls.length > 0) {
        return {
          content: this.content,
          toolCalls: this.pendingToolCalls,
          thinking: this.thinking
        };
      }
      
      // Otherwise, continue the conversation
      this.status = TurnStatus.IN_PROGRESS;
      await this.generateResponse(signal);
      
      if (this.pendingToolCalls.length > 0) {
        this.status = TurnStatus.WAITING_FOR_TOOL;
      } else {
        this.status = TurnStatus.COMPLETED;
      }
      
      return {
        content: this.content,
        toolCalls: this.pendingToolCalls,
        thinking: this.thinking
      };
    } catch (error) {
      this.status = TurnStatus.FAILED;
      this.emit(TurnEvent.ERROR, error);
      throw error;
    }
  }
  
  /**
   * Get all messages in the current turn
   */
  public getMessages(): MessageParam[] {
    return [...this.messages];
  }
  
  /**
   * Get current turn status
   */
  public getStatus(): TurnStatus {
    return this.status;
  }
  
  /**
   * Check if the turn has pending tool calls
   */
  public hasPendingToolCalls(): boolean {
    return this.pendingToolCalls.length > 0;
  }
  
  /**
   * Get pending tool calls
   */
  public getPendingToolCalls(): ToolCall[] {
    return [...this.pendingToolCalls];
  }
  
  /**
   * Get completed tool calls
   */
  public getCompletedToolCalls(): ToolResult[] {
    return [...this.completedToolCalls];
  }
  
  /**
   * Reset the turn state
   */
  public reset(): void {
    this.status = TurnStatus.IDLE;
    this.content = '';
    this.thinking = '';
    this.pendingToolCalls = [];
    this.completedToolCalls = [];
    this.messages = [];
  }
  
  /**
   * Generate response from the content generator
   */
  private async generateResponse(signal?: AbortSignal): Promise<void> {
    // Create stream handler
    const handleStream = async (): Promise<void> => {
      // Use the content generator to stream response
      await this.contentGenerator.generateStream(
        this.messages,
        {
          ...this.config,
          ...(signal && { abortSignal: signal })
        }
      );
    };
    
    // Execute the stream
    await handleStream();
    
    // Add assistant response to messages if we have content
    if (this.content) {
      this.messages.push({
        role: 'assistant' as const,
        content: this.content
      });
      
      this.emit(TurnEvent.COMPLETE, {
        content: this.content,
        toolCalls: this.pendingToolCalls,
        thinking: this.thinking
      });
    }
  }
  
  /**
   * Set up event forwarding from content generator
   */
  private setupEventForwarding(): void {
    // Forward content events
    this.contentGenerator.on(ContentEvent.CONTENT, (text: string) => {
      this.content += text;
      this.emit(TurnEvent.CONTENT, text);
    });
    
    // Handle thinking events
    this.contentGenerator.on(ContentEvent.THINKING, (text: string) => {
      this.thinking += text;
      this.emit(TurnEvent.THINKING, text);
    });
    
    // Handle tool call events
    this.contentGenerator.on(ContentEvent.TOOL_CALL, (toolCall: ToolCall) => {
      if (toolCall && toolCall.id && toolCall.name) {
        const formattedToolCall: ToolCall = {
          id: toolCall.id,
          name: toolCall.name,
          input: toolCall.input || {}
        };
        
        this.pendingToolCalls.push(formattedToolCall);
        this.emit(TurnEvent.TOOL_CALL, formattedToolCall);
      }
    });
    
    // Forward error events
    this.contentGenerator.on(ContentEvent.ERROR, (error: unknown) => {
      this.emit(TurnEvent.ERROR, error);
    });
  }
}

/**
 * Create a new turn manager
 */
export function createTurnManager(
  contentGenerator: ContentGenerator,
  config: ContentRequestConfig,
  initialMessages: MessageParam[] = []
): TurnManager {
  return new TurnManager(contentGenerator, config, initialMessages);
}