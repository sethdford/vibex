/**
 * Command Services Index
 * 
 * Central export point for all command-related services
 * Following Gemini CLI patterns - clean exports, organized structure
 */

// Core services
export { CommandRegistryService, commandRegistryService } from './command-registry-service.js';
export { CommandExecutionService, commandExecutionService } from './command-execution-service.js';
export { CommandHistoryService, commandHistoryService } from './command-history-service.js';

// Types
export type {
  Command,
  CommandContext,
  CommandResult,
  CommandHistoryEntry,
  CommandSuggestion,
  CommandHelpInfo
} from './types.js';

// Import types for internal use
import type { Command, CommandContext, CommandResult } from './types.js';

// Convenience factory for creating command instances
export function createCommand(
  id: string,
  name: string,
  description: string,
  handler: (args: string[], context?: CommandContext) => Promise<CommandResult>,
  options?: {
    aliases?: string[];
    category?: string;
    usage?: string;
    examples?: string[];
    hidden?: boolean;
  }
): Command {
  return {
    id,
    name,
    description,
    handler,
    ...options
  };
} 