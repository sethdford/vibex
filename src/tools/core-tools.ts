/**
 * Core Tools Registry
 * 
 * Essential tools that should always be available, following Gemini's approach.
 * These are the fundamental tools that Claude needs for basic file operations.
 */

import { readFileTool } from './read-file.js';
import { writeFileTool } from './write-file.js';
import { shellTool } from './shell.js';

/**
 * Core tool definitions
 */
export const coreTools = [
  readFileTool,
  writeFileTool,
  shellTool
] as const;

/**
 * Get all core tool definitions
 */
export function getCoreTools() {
  return coreTools;
}

/**
 * Get core tool by name
 */
export function getCoreTool(name: string) {
  return coreTools.find(tool => tool.name === name);
}

/**
 * Get core tool names
 */
export function getCoreToolNames() {
  return coreTools.map(tool => tool.name);
}

/**
 * Execute a core tool by name
 */
export async function executeCoreToolByName(name: string, params: any) {
  const tool = getCoreTool(name);
  if (!tool) {
    throw new Error(`Core tool not found: ${name}`);
  }
  
  return await tool.handler(params);
}

/**
 * Tool registry integration
 */
export function registerCoreTools(registry: any) {
  for (const tool of coreTools) {
    registry.registerTool({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      handler: tool.handler
    });
  }
} 