/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import {
  Tool,
  ToolCallRequest,
  ToolFactory,
  ToolConfig
} from '../tool-interfaces';
import {
  ToolOrchestrationService,
  ToolRegistryService,
  ToolSchedulerService,
  ToolDiscoveryService,
  ValidationService,
  ConfirmationService,
  ToolExecutionService,
  CheckpointService,
  ToolSystemConfig
} from '../tool-services';
import { EventBus, InMemoryEventBus } from '../tool-events';
import { createToolRegistry } from '../registry';
import { createValidationService } from '../validation';
import { createConfirmationService } from '../confirmation';
import { createCheckpointService } from '../checkpoint';
import { createToolExecutionService } from '../execution';
import { createToolScheduler } from '../scheduler';
import { createToolDiscovery } from '../registry';

/**
 * Implementation of the Tool Orchestration Service
 * 
 * This service is the main entry point for the tool system,
 * coordinating the interactions between the different services.
 */
export class ToolOrchestrationServiceImpl implements ToolOrchestrationService {
  /**
   * Registry service for tool registration and discovery
   */
  private registry: ToolRegistryService;
  
  /**
   * Scheduler service for tool execution
   */
  private scheduler: ToolSchedulerService;
  
  /**
   * Discovery service for finding tools
   */
  private discovery: ToolDiscoveryService;
  
  /**
   * Validation service for parameter validation
   */
  private validation: ValidationService;
  
  /**
   * Confirmation service for tool confirmations
   */
  private confirmation: ConfirmationService;
  
  /**
   * Execution service for tool execution
   */
  private execution: ToolExecutionService;
  
  /**
   * Checkpoint service for safety checkpoints
   */
  private checkpoint: CheckpointService;
  
  /**
   * Event bus for events
   */
  private eventBus: EventBus;
  
  /**
   * System configuration
   */
  private config: ToolSystemConfig;

  /**
   * Constructor
   */
  constructor(config: ToolSystemConfig) {
    this.config = config;
    
    // Create event bus
    this.eventBus = new InMemoryEventBus();
    
    // Create services
    this.validation = createValidationService(undefined, this.eventBus);
    this.registry = createToolRegistry(this.eventBus);
    this.confirmation = createConfirmationService(config.confirmation, undefined, this.eventBus);
    this.checkpoint = createCheckpointService(config.git, this.eventBus);
    this.execution = createToolExecutionService(this.validation, this.checkpoint, this.eventBus);
    this.discovery = createToolDiscovery(this.registry, {
      mcpServers: config.mcp?.servers?.map(s => s.url) || [],
      mcpTokens: config.mcp?.tokens || {},
      autoDiscoverProjectTools: true // Assuming this is desired default
    }, this.eventBus);
    
    this.scheduler = createToolScheduler(
      this.registry,
      this.validation,
      this.confirmation,
      this.execution,
      {
        onToolCallsUpdate: calls => this.handleToolCallsUpdate(calls)
      },
      this.eventBus
    );
    
    // Initialize
    this.registerTools();
  }

  /**
   * Register available tools
   */
  registerTools(): void {
    // Register built-in tools
    // TODO: Implement proper tool factory
    const toolFactory = {
      createBuiltInTools: () => ({
        'default': [] as Tool[],
        'system': [] as Tool[]
      }),
      createTool: (config: ToolConfig) => { throw new Error('Not implemented'); } // Placeholder
    } as ToolFactory;
    
    const builtInTools = toolFactory.createBuiltInTools();
    
    for (const [namespace, tools] of Object.entries(builtInTools)) {
      for (const tool of tools) {
        this.registry.registerTool(tool, namespace);
      }
    }
    
    // Discover external tools
    this.discovery.refreshAllTools().catch(error => {
      console.error('Error discovering tools:', error);
    });
  }

  /**
   * Execute one or more tools
   */
  async executeTools(
    requests: ToolCallRequest | ToolCallRequest[],
    signal: AbortSignal
  ): Promise<void> {
    return this.scheduler.schedule(requests, signal);
  }

  /**
   * Get a tool by name and namespace
   */
  getTool(name: string, namespace = 'default'): Tool | undefined {
    return this.registry.getTool(name, namespace);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return this.registry.getAllTools();
  }

  /**
   * Configure the tool system
   */
  configure(config: ToolSystemConfig): void {
    this.config = { ...this.config, ...config };
    
    // TODO: Update dependent services with new configuration
  }
  
  /**
   * Handle tool calls update event
   * @private
   */
  private handleToolCallsUpdate(calls: any[]): void {
    // Handle tool calls update
    // This would typically emit events or update UI
    // Left as a placeholder for implementation
  }
}

/**
 * Factory function to create a ToolOrchestrationService
 */
export function createToolOrchestration(config: ToolSystemConfig): ToolOrchestrationService {
  return new ToolOrchestrationServiceImpl(config);
}