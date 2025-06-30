// src/ai/prompts.ts
var MESSAGE_ROLE = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system"
};
var CODE_ASSISTANT_SYSTEM_PROMPT = `
You are Claude, an AI assistant with expertise in programming and software development.
Your task is to assist with coding-related questions, debugging, refactoring, and explaining code.

Guidelines:
- Provide clear, concise, and accurate responses
- Include code examples where helpful
- Prioritize modern best practices
- If you're unsure, acknowledge limitations instead of guessing
- Focus on understanding the user's intent, even if the question is ambiguous
`;
var CODE_GENERATION_SYSTEM_PROMPT = `
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
var CODE_REVIEW_SYSTEM_PROMPT = `
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
var CODE_EXPLANATION_SYSTEM_PROMPT = `
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
var PROMPT_TEMPLATES = {
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
function formatPrompt(template, values, defaults = {}) {
  const mergedValues = { ...defaults, ...values };
  return template.replace(
    /{(\w+)}/g,
    (match, key) => {
      const value = mergedValues[key];
      return value !== void 0 ? String(value) : match;
    }
  );
}
function usePromptTemplate(templateName, values) {
  const template = PROMPT_TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Prompt template "${templateName}" not found`);
  }
  return {
    prompt: formatPrompt(template.template, values, template.defaults),
    system: template.system
  };
}
function createConversation(prompt, system) {
  const messages = [];
  if (system) {
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
function createUserMessage(content) {
  return {
    role: MESSAGE_ROLE.USER,
    content
  };
}
function createSystemMessage(content) {
  return {
    role: MESSAGE_ROLE.SYSTEM,
    content
  };
}
function createAssistantMessage(content) {
  return {
    role: MESSAGE_ROLE.ASSISTANT,
    content
  };
}
function createFileContextMessage(filePath, content, language) {
  return `File: ${filePath}

\`\`\`${language || getLanguageFromFilePath(filePath)}
${content}
\`\`\``;
}
function getLanguageFromFilePath(filePath) {
  const extension = filePath.split(".").pop()?.toLowerCase() || "";
  const languageMap = {
    js: "javascript",
    ts: "typescript",
    jsx: "javascript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    go: "go",
    rs: "rust",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    sh: "bash",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    md: "markdown",
    json: "json",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    sql: "sql",
    graphql: "graphql",
    xml: "xml"
  };
  return languageMap[extension] || "";
}

export {
  CODE_ASSISTANT_SYSTEM_PROMPT,
  CODE_GENERATION_SYSTEM_PROMPT,
  CODE_REVIEW_SYSTEM_PROMPT,
  CODE_EXPLANATION_SYSTEM_PROMPT,
  PROMPT_TEMPLATES,
  formatPrompt,
  usePromptTemplate,
  createConversation,
  createUserMessage,
  createSystemMessage,
  createAssistantMessage,
  createFileContextMessage
};
//# sourceMappingURL=chunk-Z2JMWTMB.js.map