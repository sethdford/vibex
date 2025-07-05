/**
 * AI Prompts
 * 
 * Contains prompt templates and utilities for formatting prompts 
 * for different AI tasks and scenarios.
 */

/**
 * System prompt for code assistance
 */
export const CODE_ASSISTANT_SYSTEM_PROMPT = `
You are Claude, an AI assistant with expertise in programming and software development.
Your task is to assist with coding-related questions, debugging, refactoring, and explaining code.

Guidelines:
- Provide clear, concise, and accurate responses
- Include code examples where helpful
- Prioritize modern best practices
- If you're unsure, acknowledge limitations instead of guessing
- Focus on understanding the user's intent, even if the question is ambiguous
`;

/**
 * System prompt for code generation
 */
export const CODE_GENERATION_SYSTEM_PROMPT = `
You are Claude, an AI assistant focused on helping write high-quality code.
Your task is to generate code based on user requirements and specifications.

Guidelines:
- Write clean, efficient, and well-documented code
- Follow language-specific best practices and conventions
- Include helpful comments explaining complex sections
- Prioritize maintainability and readability
- Structure code logically with appropriate error handling
- Consider edge cases and potential issues
`;

/**
 * System prompt for code review
 */
export const CODE_REVIEW_SYSTEM_PROMPT = `
You are Claude, an AI code reviewer with expertise in programming best practices.
Your task is to analyze code, identify issues, and suggest improvements.

Guidelines:
- Look for bugs, security issues, and performance problems
- Suggest improvements for readability and maintainability
- Identify potential edge cases and error handling gaps
- Point out violations of best practices or conventions
- Provide constructive feedback with clear explanations
- Be thorough but prioritize important issues over minor stylistic concerns
`;

/**
 * System prompt for explaining code
 */
export const CODE_EXPLANATION_SYSTEM_PROMPT = `
You are Claude, an AI assistant that specializes in explaining code.
Your task is to break down and explain code in a clear, educational manner.

Guidelines:
- Explain the purpose and functionality of the code
- Break down complex parts step by step
- Define technical terms and concepts when relevant
- Use analogies or examples to illustrate concepts
- Focus on the core logic rather than trivial details
- Adjust explanation depth based on the apparent complexity of the question
`;

/**
 * Interface for prompt templates
 */
export interface PromptTemplate {
  /**
   * Template string with {placeholders}
   */
  template: string;
  
  /**
   * Optional system message to set context
   */
  system?: string;
  
  /**
   * Default values for placeholders
   */
  defaults?: Record<string, string>;
}

/**
 * Collection of prompt templates for common tasks
 */
export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  // Code assistance prompt templates
  explainCode: {
    template: "Please explain what this code does:\n\n{code}",
    system: CODE_EXPLANATION_SYSTEM_PROMPT,
    defaults: {
      code: "// Paste code here"
    }
  },
  
  refactorCode: {
    template: "Please refactor this code to improve its {focus}:\n\n{code}\n\nAdditional context: {context}",
    system: CODE_GENERATION_SYSTEM_PROMPT,
    defaults: {
      focus: "readability and maintainability",
      code: "// Paste code here",
      context: "None"
    }
  },
  
  debugCode: {
    template: "Please help me debug the following code:\n\n{code}\n\nThe issue I'm seeing is: {issue}\n\nAny error messages: {errorMessages}",
    system: CODE_ASSISTANT_SYSTEM_PROMPT,
    defaults: {
      code: "// Paste code here",
      issue: "Describe the issue you're experiencing",
      errorMessages: "None"
    }
  },
  
  reviewCode: {
    template: "Please review this code and provide feedback:\n\n{code}",
    system: CODE_REVIEW_SYSTEM_PROMPT,
    defaults: {
      code: "// Paste code here"
    }
  },
  
  generateCode: {
    template: "Please write code to {task}.\n\nLanguage/Framework: {language}\n\nRequirements:\n{requirements}",
    system: CODE_GENERATION_SYSTEM_PROMPT,
    defaults: {
      task: "Describe what you want the code to do",
      language: "Specify language or framework",
      requirements: "- List your requirements here"
    }
  },
  
  documentCode: {
    template: "Please add documentation to this code:\n\n{code}\n\nDocumentation style: {style}",
    system: CODE_GENERATION_SYSTEM_PROMPT,
    defaults: {
      code: "// Paste code here",
      style: "Standard comments and docstrings"
    }
  },
  
  testCode: {
    template: "Please write tests for this code:\n\n{code}\n\nTesting framework: {framework}",
    system: CODE_GENERATION_SYSTEM_PROMPT,
    defaults: {
      code: "// Paste code here",
      framework: "Specify testing framework or 'standard'"
    }
  }
};

// Import enterprise templates from separate file
import {
  ENTERPRISE_SYSTEM_PROMPT,
  ENTERPRISE_SCAFFOLDING_PROMPT as PROJECT_SCAFFOLDING_SYSTEM_PROMPT,
  ENTERPRISE_PROMPT_TEMPLATES
} from './enterprise-prompts.js';

// Re-export enterprise templates
export {
  ENTERPRISE_SYSTEM_PROMPT,
  PROJECT_SCAFFOLDING_SYSTEM_PROMPT,
  ENTERPRISE_PROMPT_TEMPLATES
};

// Import utility functions from separate file
export { 
  formatPrompt,
  usePromptTemplate,
  createConversation,
  createUserMessage,
  createSystemMessage,
  createAssistantMessage,
  createFileContextMessage
} from './prompt-utils.js'; 