/**
 * Command System Types
 * 
 * Shared type definitions for command services
 * Following Gemini CLI patterns - clean interfaces, single responsibility
 */

export interface Command {
  id: string;
  name: string;
  description: string;
  aliases?: string[];
  category?: string;
  usage?: string;
  examples?: string[];
  hidden?: boolean;
  handler: (args: string[], context?: CommandContext) => Promise<CommandResult>;
}

export interface CommandContext {
  workingDirectory: string;
  environment: Record<string, string>;
  user?: string;
  session?: string;
}

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
  data?: unknown;
}

export interface CommandHistoryEntry {
  command: string;
  result: CommandResult;
  timestamp: number;
}

export interface CommandSuggestion {
  name: string;
  description: string;
  category?: string;
  aliases?: string[];
  relevance: number;
}

export interface CommandHelpInfo {
  name: string;
  description: string;
  usage?: string;
  aliases?: string[];
  examples?: string[];
  category?: string;
} 