/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Tool,
  ToolCall,
  ToolCallRequest,
  ToolConfirmationDetails,
  ToolConfirmationOutcome,
  ToolResult
} from '../tool-interfaces';
import {
  ToolRegistryService,
  ToolSchedulerService,
  ToolSchedulerCallbacks,
  ValidationService,
  ConfirmationService,
  ToolExecutionService
} from '../tool-services';
import {
  EventBus,
  ToolExecutionRequestedEvent,
  ToolExecutionStartedEvent,
  ToolExecutionCompletedEvent,
  ToolExecutionFailedEvent,
  ToolConfirmationRequestedEvent,
  ToolConfirmationReceivedEvent
} from '../tool-events';

/**
 * Implementation of the Tool Scheduler Service
 * 
 * This service manages the lifecycle of tool executions,
 * handling validation, confirmation, and execution.
 */
export class ToolSchedulerServiceImpl implements ToolSchedulerService {
  private toolCalls: ToolCall[] = [];
  private registry: ToolRegistryService;
  private validationService: ValidationService;
  private confirmationService: ConfirmationService;
  private executionService: ToolExecutionService;
  private eventBus?: EventBus;
  private callbacks: ToolSchedulerCallbacks;

  /**
   * Constructor
   */
  constructor(
    registry: ToolRegistryService,
    validationService: ValidationService,
    confirmationService: ConfirmationService,
    executionService: ToolExecutionService,
    callbacks: ToolSchedulerCallbacks = {},
    eventBus?: EventBus
  ) {
    this.registry = registry;
    this.validationService = validationService;
    this.confirmationService = confirmationService;
    this.executionService = executionService;
    this.callbacks = callbacks;
    this.eventBus = eventBus;
  }

  /**
   * Schedule tool calls for execution
   */
  async schedule(request: ToolCallRequest | ToolCallRequest[], signal: AbortSignal): Promise<void> {
    const requests = Array.isArray(request) ? request : [request];
    
    // Initialize tool calls
    const newToolCalls = requests.map(req => {
      // Generate call ID if not provided
      const callId = req.callId || uuidv4();
      const requestWithId = { ...req, callId };
      
      const tool = this.registry.getTool(req.name, req.namespace);
      if (!tool) {
        return {
          status: 'error' as const,
          request: requestWithId,
          response: {
            callId,
            error: new Error(`Tool "${req.name}" not found`),
            success: false
          },
          startTime: Date.now()
        };
      }
      
      const toolCall: ToolCall = {
        status: 'validating' as const,
        request: requestWithId,
        tool,
        startTime: Date.now()
      };
      
      // Publish event if event bus is available
      if (this.eventBus) {
        this.eventBus.publish(new ToolExecutionRequestedEvent(toolCall));
      }
      
      return toolCall;
    });

    // Add new calls to the collection
    this.toolCalls = [...this.toolCalls, ...newToolCalls];
    this.notifyToolCallsUpdate();

    // Process each tool call
    for (const toolCall of newToolCalls) {
      if (signal.aborted) break;
      if (toolCall.status !== 'validating' || !toolCall.tool) continue;

      const { request, tool } = toolCall;
      
      try {
        // Validate parameters
        const validationResult = this.validationService.validateAgainstSchema(
          request.params,
          tool.parameters
        );
        
        if (!validationResult.valid) {
          this.updateToolCallStatus(request.callId, 'error', {
            response: {
              callId: request.callId,
              error: new Error(
                `Invalid parameters: ${validationResult.errors?.join(', ') || 'Validation failed'}`
              ),
              success: false
            }
          });
          continue;
        }
        
        // Check if execution needs confirmation
        const confirmationDetails = request.options?.skipConfirmation ? 
          null : 
          await tool.shouldConfirmExecute(request.params);
        
        if (confirmationDetails) {
          this.updateToolCallStatus(request.callId, 'awaiting_approval', { 
            confirmationDetails
          });
          
          // Publish confirmation requested event if event bus is available
          if (this.eventBus) {
            this.eventBus.publish(
              new ToolConfirmationRequestedEvent(
                this.getToolCall(request.callId)!, 
                confirmationDetails
              )
            );
          }
          
          // Request confirmation from the confirmation service
          this.confirmationService.requestConfirmation(confirmationDetails)
            .then(outcome => this.handleConfirmation(request.callId, outcome))
            .catch(error => {
              this.updateToolCallStatus(request.callId, 'error', {
                response: {
                  callId: request.callId,
                  error: error instanceof Error ? error : new Error(String(error)),
                  success: false
                }
              });
            });
          
        } else {
          // No confirmation needed, schedule execution
          this.updateToolCallStatus(request.callId, 'scheduled');
          this.executeToolCall(this.getToolCall(request.callId)!, signal);
        }
      } catch (error) {
        this.updateToolCallStatus(request.callId, 'error', { 
          response: {
            callId: request.callId,
            error: error instanceof Error ? error : new Error(String(error)),
            success: false
          }
        });
      }
    }
  }

  /**
   * Handle confirmation response for a tool call
   */
  async handleConfirmation(callId: string, outcome: ToolConfirmationOutcome): Promise<void> {
    const toolCall = this.getToolCall(callId);
    if (!toolCall) {
      throw new Error(`Tool call not found: ${callId}`);
    }
    
    // Publish confirmation received event if event bus is available
    if (this.eventBus) {
      this.eventBus.publish(new ToolConfirmationReceivedEvent(toolCall, outcome));
    }
    
    switch (outcome) {
      case ToolConfirmationOutcome.ProceedOnce:
      case ToolConfirmationOutcome.ProceedAlways:
        // If always approved, mark as trusted
        if (outcome === ToolConfirmationOutcome.ProceedAlways && toolCall.tool) {
          this.confirmationService.markAsTrusted(
            toolCall.tool.name, 
            toolCall.request.namespace
          );
        }
        
        // Schedule execution
        this.updateToolCallStatus(callId, 'scheduled');
        this.executeToolCall(toolCall);
        break;
        
      case ToolConfirmationOutcome.ModifiedAndApproved:
        // TODO: Handle modified parameters
        // For now, just proceed with the original parameters
        this.updateToolCallStatus(callId, 'scheduled');
        this.executeToolCall(toolCall);
        break;
        
      case ToolConfirmationOutcome.Cancelled:
        // Mark as error with cancellation
        this.updateToolCallStatus(callId, 'error', {
          response: {
            callId,
            error: new Error('Execution cancelled by user'),
            success: false
          }
        });
        break;
        
      default:
        this.updateToolCallStatus(callId, 'error', {
          response: {
            callId,
            error: new Error(`Unknown confirmation outcome: ${outcome}`),
            success: false
          }
        });
    }
  }

  /**
   * Cancel a tool call by ID
   */
  cancelToolCall(callId: string): void {
    const toolCall = this.getToolCall(callId);
    if (!toolCall) return;
    
    this.updateToolCallStatus(callId, 'error', {
      response: {
        callId,
        error: new Error('Execution cancelled'),
        success: false
      }
    });
  }

  /**
   * Get all active tool calls
   */
  getActiveToolCalls(): ToolCall[] {
    return this.toolCalls.filter(call => 
      call.status !== 'completed' && call.status !== 'error'
    );
  }
  
  /**
   * Get a tool call by ID
   * @private
   */
  private getToolCall(callId: string): ToolCall | undefined {
    return this.toolCalls.find(call => call.request.callId === callId);
  }
  
  /**
   * Update the status of a tool call
   * @private
   */
  private updateToolCallStatus(callId: string, status: ToolCall['status'], data: Partial<ToolCall> = {}): void {
    const index = this.toolCalls.findIndex(call => call.request.callId === callId);
    if (index === -1) return;
    
    // Update the tool call
    this.toolCalls[index] = {
      ...this.toolCalls[index],
      ...data,
      status
    };
    
    // If status is completed or error, set endTime
    if (status === 'completed' || status === 'error') {
      this.toolCalls[index].endTime = Date.now();
    }
    
    this.notifyToolCallsUpdate();
    
    // Check if all calls are completed
    const allCompleted = this.toolCalls.every(
      call => call.status === 'completed' || call.status === 'error'
    );
    
    if (allCompleted && this.callbacks.onAllToolCallsComplete) {
      this.callbacks.onAllToolCallsComplete(this.toolCalls);
    }
  }
  
  /**
   * Notify about tool calls update
   * @private
   */
  private notifyToolCallsUpdate(): void {
    if (this.callbacks.onToolCallsUpdate) {
      this.callbacks.onToolCallsUpdate(this.toolCalls);
    }
  }
  
  /**
   * Execute a tool call
   * @private
   */
  private async executeToolCall(toolCall: ToolCall, signal?: AbortSignal): Promise<void> {
    if (!toolCall.tool) {
      this.updateToolCallStatus(toolCall.request.callId, 'error', {
        response: {
          callId: toolCall.request.callId,
          error: new Error('Tool not found'),
          success: false
        }
      });
      return;
    }
    
    try {
      // Update status to executing
      this.updateToolCallStatus(toolCall.request.callId, 'executing');
      
      // Publish execution started event if event bus is available
      if (this.eventBus) {
        this.eventBus.publish(new ToolExecutionStartedEvent(toolCall));
      }
      
      // Execute the tool
      const options = toolCall.request.options || {};
      const execSignal = signal || options.signal;
      
      const result = await this.executionService.execute(
        toolCall.tool,
        toolCall.request.params,
        execSignal!,
        options.onProgress
      );
      
      // Update result with call ID if not present
      if (!result.callId) {
        result.callId = toolCall.request.callId;
      }
      
      // Update status to completed
      this.updateToolCallStatus(toolCall.request.callId, 'completed', {
        response: result
      });
      
      // Publish execution completed event if event bus is available
      if (this.eventBus) {
        this.eventBus.publish(new ToolExecutionCompletedEvent(
          this.getToolCall(toolCall.request.callId)!,
          result
        ));
      }
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Update status to error
      this.updateToolCallStatus(toolCall.request.callId, 'error', {
        response: {
          callId: toolCall.request.callId,
          error: errorObj,
          success: false
        }
      });
      
      // Publish execution failed event if event bus is available
      if (this.eventBus) {
        this.eventBus.publish(new ToolExecutionFailedEvent(
          this.getToolCall(toolCall.request.callId)!,
          errorObj
        ));
      }
    }
  }
}

/**
 * Factory function to create a ToolSchedulerService
 */
export function createToolScheduler(
  registry: ToolRegistryService,
  validationService: ValidationService,
  confirmationService: ConfirmationService,
  executionService: ToolExecutionService,
  callbacks: ToolSchedulerCallbacks = {},
  eventBus?: EventBus
): ToolSchedulerService {
  return new ToolSchedulerServiceImpl(
    registry,
    validationService,
    confirmationService,
    executionService,
    callbacks,
    eventBus
  );
}