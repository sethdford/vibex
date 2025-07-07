/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { Tool } from '../tool-interfaces';
import { ToolRegistryService } from '../tool-services';
import { ToolRegisteredEvent } from '../tool-events';
import { EventBus } from '../tool-events';

/**
 * Implementation of the Tool Registry Service
 * 
 * This service handles the registration and discovery of tools,
 * with support for namespaces to organize tools by category.
 */
export class ToolRegistryServiceImpl implements ToolRegistryService {
  /**
   * Map of tool names to tool instances
   * For non-default namespaces, the key is "namespace__name"
   */
  private tools = new Map<string, Tool>();
  
  /**
   * Map of namespace names to sets of tool names in that namespace
   */
  private namespaces = new Map<string, Set<string>>();
  
  /**
   * Optional event bus for publishing events
   */
  private eventBus?: EventBus;

  /**
   * Constructor
   */
  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
    
    // Initialize default namespace
    this.namespaces.set('default', new Set<string>());
  }

  /**
   * Register a tool with an optional namespace
   */
  registerTool(tool: Tool, namespace = 'default'): void {
    // Generate the full name with namespace
    const fullName = this.getFullToolName(namespace, tool.name);
    
    // Store the tool
    this.tools.set(fullName, tool);
    
    // Track namespace membership
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Set());
    }
    
    this.namespaces.get(namespace)!.add(fullName);
    
    // Publish event if event bus is available
    if (this.eventBus) {
      this.eventBus.publish(new ToolRegisteredEvent(tool, namespace));
    }
  }

  /**
   * Get a tool by name and optional namespace
   */
  getTool(name: string, namespace = 'default'): Tool | undefined {
    // Handle potential MCP tool format (mcp__toolName)
    if (name.includes('__') && !namespace) {
      const [ns, toolName] = name.split('__', 2);
      return this.tools.get(name) || this.tools.get(this.getFullToolName(ns, toolName));
    }
    
    const fullName = this.getFullToolName(namespace, name);
    return this.tools.get(fullName);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by namespace
   */
  getToolsByNamespace(namespace: string): Tool[] {
    const toolNames = this.namespaces.get(namespace);
    if (!toolNames) return [];
    
    return Array.from(toolNames)
      .map(name => this.tools.get(name)!)
      .filter(Boolean);
  }

  /**
   * Get all namespaces
   */
  getNamespaces(): string[] {
    return Array.from(this.namespaces.keys());
  }

  /**
   * Get the full tool name including namespace
   * @private
   */
  private getFullToolName(namespace: string, name: string): string {
    return namespace === 'default' ? name : `${namespace}__${name}`;
  }
}

/**
 * Factory function to create a ToolRegistryService
 */
export function createToolRegistry(eventBus?: EventBus): ToolRegistryService {
  return new ToolRegistryServiceImpl(eventBus);
}