/**
 * Prompt Utilities
 * 
 * Utility functions for formatting and manipulating prompts.
 */

import type { Message, MessageRoleType } from './types.js';
import type { PromptTemplate } from './prompts.js';

// Define MessageRole consts since we're using the type as values
const MESSAGE_ROLE = {
  USER: 'user' as const,
  ASSISTANT: 'assistant' as const,
  SYSTEM: 'system' as const
} as const;

/**
 * Format a prompt by replacing placeholders with values
 */
export function formatPrompt(
  template: string,
  values: Record<string, string | number | boolean>,
  defaults: Record<string, string> = {}
): string {
  const mergedValues = { ...defaults, ...values };
  
  return template.replace(
    /{(\w+)}/g, 
    (match, key) => {
      const value = mergedValues[key];
      return value !== undefined ? String(value) : match;
    }
  );
}

/**
 * Format a prompt using a predefined template
 */
export function usePromptTemplate(
  templateName: string,
  values: Record<string, string | number | boolean>,
  templates: Record<string, PromptTemplate>
): { prompt: string; system?: string } {
  const template = templates[templateName];
  
  if (template === undefined) {
    throw new Error(`Prompt template "${templateName}" not found`);
  }
  
  return {
    prompt: formatPrompt(template.template, values, template.defaults),
    system: template.system
  };
}

/**
 * Create a conversation from a prompt
 */
export function createConversation(
  prompt: string,
  system?: string
): Array<{ role: MessageRoleType; content: string }> {
  const messages: Array<{ role: MessageRoleType; content: string }> = [];
  
  if (typeof system === 'string' && system.length > 0) {
    messages.push({
      role: MESSAGE_ROLE.SYSTEM,
      content: system
    });
  }
  
  messages.push({
    role: MESSAGE_ROLE.USER,
    content: prompt
  });
  
  return messages;
}

/**
 * Create a user message
 */
export function createUserMessage(content: string): Message {
  return {
    role: MESSAGE_ROLE.USER,
    content
  };
}

/**
 * Create a system message
 */
export function createSystemMessage(content: string): Message {
  return {
    role: MESSAGE_ROLE.SYSTEM,
    content
  };
}

/**
 * Create an assistant message
 */
export function createAssistantMessage(content: string): Message {
  return {
    role: MESSAGE_ROLE.ASSISTANT,
    content
  };
}

/**
 * Get language from file extension
 */
function getLanguageFromExtension(extension: string): string {
  const languageMap: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    sh: 'bash',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    md: 'markdown',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    sql: 'sql',
    graphql: 'graphql',
    xml: 'xml'
  };
  
  return languageMap[extension] ?? '';
}

/**
 * Get language from file path
 */
function getLanguageFromFilePath(filePath: string): string {
  const parts = filePath.split('.');
  const extension = parts.length > 1 ? parts[parts.length - 1]?.toLowerCase() ?? '' : '';
  
  return getLanguageFromExtension(extension);
}

/**
 * Create a message with file context
 */
export function createFileContextMessage(
  filePath: string,
  content: string,
  language?: string
): string {
  const detectedLanguage = typeof language === 'string' && language.length > 0 
    ? language 
    : getLanguageFromFilePath(filePath);
    
  return `File: ${filePath}\n\n\`\`\`${detectedLanguage}\n${content}\n\`\`\``;
} 