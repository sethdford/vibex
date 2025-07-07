/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * VibeX core initialization module
 * 
 * This module handles the initialization of the VibeX core, including
 * setting up the tool system, registering tools, and configuring the
 * system.
 */

import { InMemoryEventBus } from './domain/tool';
import { configureToolSystem, registerAllTools } from './adapters/tools';
import { mcpClient } from '../tools/mcp-client';
import { createMCPService } from './domain/tool/mcp/mcp-service';

/**
 * Initialize the VibeX core
 * 
 * This function sets up all the necessary services and infrastructure
 * for the VibeX core to function properly.
 */
export async function initializeCore(config: Record<string, unknown> = {}) {
  // Create a global event bus
  const eventBus = new InMemoryEventBus();
  
  // Configure the tool system
  configureToolSystem(config);
  
  // Create MCP service
  const mcpService = createMCPService(mcpClient, eventBus);
  
  // Register all tools
  const tools = await registerAllTools(config);
  
  return {
    eventBus,
    tools,
    services: {
      mcpService
    }
  };
}

/**
 * Initialize the core asynchronously
 */
let coreInitPromise: Promise<{
  eventBus: InMemoryEventBus;
  tools: Record<string, any>;
  services: Record<string, any>;
}>;

export function getCoreInstance(config: Record<string, unknown> = {}): Promise<{
  eventBus: InMemoryEventBus;
  tools: Record<string, any>;
  services: Record<string, any>;
}> {
  if (!coreInitPromise) {
    coreInitPromise = initializeCore(config);
  }
  return coreInitPromise;
}