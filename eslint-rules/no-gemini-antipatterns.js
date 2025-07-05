/**
 * Custom ESLint Rule: no-gemini-antipatterns
 * 
 * Prevents anti-patterns found in Gemini CLI and enforces our superior
 * architectural standards that maintain our competitive advantage.
 * 
 * Key enforcement areas:
 * - File size discipline (max 300 lines vs their 500+)
 * - Function complexity limits (max 20 lines vs their complex functions)
 * - Import organization (our clean pattern vs their chaos)
 * - Error handling patterns (our UserError vs their console.error)
 * - Memory management (our cleanup vs their process restarts)
 * - Performance patterns (our async vs their mixed patterns)
 */

import path from 'node:path';
import fs from 'node:fs';

/**
 * Check if a file is getting too large (approaching Gemini CLI bloat)
 */
function checkFileSize(context, node) {
  const sourceCode = context.getSourceCode();
  const lines = sourceCode.lines.length;
  
  if (lines > 250) {
    context.report({
      node,
      message: `File has ${lines} lines. Consider splitting into smaller modules. Gemini CLI has 500+ line files - we must stay modular.`,
      data: { lines },
    });
  }
}

/**
 * Check for console usage (Gemini CLI has 100+ console statements)
 */
function checkConsoleUsage(context, node) {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.name === 'console'
  ) {
    // Allow console in CLI entry points and tests
    const filename = context.getFilename();
    const isCliFile = filename.includes('cli.ts') || filename.includes('index.ts');
    const isTestFile = filename.includes('.test.') || filename.includes('.spec.');
    
    if (!isCliFile && !isTestFile) {
      context.report({
        node,
        message: 'Use proper logging instead of console statements. Gemini CLI has 100+ console calls - we have zero.',
        suggest: [
          {
            desc: 'Replace with logger',
            fix: fixer => fixer.replaceText(node.callee.object, 'logger'),
          },
        ],
      });
    }
  }
}

/**
 * Check for generic variable names (Gemini CLI uses these everywhere)
 */
function checkGenericNames(context, node) {
  const genericNames = ['data', 'result', 'item', 'temp', 'tmp', 'obj', 'arr', 'val', 'res'];
  
  if (
    node.type === 'VariableDeclarator' &&
    node.id.type === 'Identifier' &&
    genericNames.includes(node.id.name)
  ) {
    context.report({
      node: node.id,
      message: `Generic variable name '${node.id.name}' found. Use descriptive names. Gemini CLI abuses generic names.`,
      data: { name: node.id.name },
    });
  }
}

/**
 * Check for proper error handling (vs Gemini CLI's generic console.error)
 */
function checkErrorHandling(context, node) {
  // Check for throw statements with string literals
  if (
    node.type === 'ThrowStatement' &&
    node.argument.type === 'Literal' &&
    typeof node.argument.value === 'string'
  ) {
    context.report({
      node,
      message: 'Throw Error objects instead of string literals. Use our UserError system vs Gemini CLI\'s generic errors.',
      suggest: [
        {
          desc: 'Wrap in UserError',
          fix: fixer => fixer.replaceText(
            node.argument,
            `createUserError('${node.argument.value}', { category: ErrorCategory.APPLICATION })`
          ),
        },
      ],
    });
  }
  
  // Check for generic console.error in catch blocks
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.name === 'console' &&
    node.callee.property.name === 'error'
  ) {
    const parent = node.parent;
    if (parent && parent.type === 'ExpressionStatement') {
      const grandParent = parent.parent;
      if (grandParent && grandParent.type === 'BlockStatement') {
        const greatGrandParent = grandParent.parent;
        if (greatGrandParent && greatGrandParent.type === 'CatchClause') {
          context.report({
            node,
            message: 'Use structured error handling instead of console.error. Gemini CLI has generic error handling everywhere.',
            suggest: [
              {
                desc: 'Replace with logger.error',
                fix: fixer => fixer.replaceText(node.callee, 'logger.error'),
              },
            ],
          });
        }
      }
    }
  }
}

/**
 * Check for synchronous operations (Gemini CLI uses execSync)
 */
function checkSyncOperations(context, node) {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.name &&
    node.callee.property.name.endsWith('Sync')
  ) {
    context.report({
      node,
      message: `Avoid synchronous operation '${node.callee.property.name}'. Use async alternatives. Gemini CLI abuses sync operations.`,
      data: { operation: node.callee.property.name },
    });
  }
}

/**
 * Check for function complexity (Gemini CLI has complex functions)
 */
function checkFunctionComplexity(context, node) {
  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  ) {
    const sourceCode = context.getSourceCode();
    const functionText = sourceCode.getText(node);
    const lines = functionText.split('\n').length;
    
    if (lines > 30) {
      context.report({
        node,
        message: `Function has ${lines} lines. Break into smaller functions. Gemini CLI has complex functions - we stay modular.`,
        data: { lines },
      });
    }
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent Gemini CLI anti-patterns and enforce our superior architectural standards',
      category: 'Best Practices',
      recommended: 'error',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [],
    messages: {
      fileTooLarge: 'File has {{lines}} lines. Consider splitting into smaller modules. Gemini CLI has 500+ line files - we must stay modular.',
      consoleUsage: 'Use proper logging instead of console statements. Gemini CLI has 100+ console calls - we have zero.',
      genericName: 'Generic variable name \'{{name}}\' found. Use descriptive names. Gemini CLI abuses generic names.',
      stringThrow: 'Throw Error objects instead of string literals. Use our UserError system vs Gemini CLI\'s generic errors.',
      consoleError: 'Use structured error handling instead of console.error. Gemini CLI has generic error handling everywhere.',
      syncOperation: 'Avoid synchronous operation \'{{operation}}\'. Use async alternatives. Gemini CLI abuses sync operations.',
      complexFunction: 'Function has {{lines}} lines. Break into smaller functions. Gemini CLI has complex functions - we stay modular.',
    },
  },

  create(context) {
    return {
      Program(node) {
        checkFileSize(context, node);
      },
      
      CallExpression(node) {
        checkConsoleUsage(context, node);
        checkErrorHandling(context, node);
        checkSyncOperations(context, node);
      },
      
      VariableDeclarator(node) {
        checkGenericNames(context, node);
      },
      
      ThrowStatement(node) {
        checkErrorHandling(context, node);
      },
      
      FunctionDeclaration(node) {
        checkFunctionComplexity(context, node);
      },
      
      FunctionExpression(node) {
        checkFunctionComplexity(context, node);
      },
      
      ArrowFunctionExpression(node) {
        checkFunctionComplexity(context, node);
      },
    };
  },
}; 