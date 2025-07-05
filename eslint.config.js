/**
 * Vibex CLI ESLint Configuration
 * 
 * Superior ESLint configuration that enforces our architectural excellence
 * and maintains our competitive advantage over Gemini CLI.
 * 
 * Key improvements over Gemini CLI:
 * - Stricter TypeScript rules for better type safety
 * - Performance-focused rules to maintain our 6x speed advantage
 * - Architecture enforcement rules for our modular design
 * - Code quality rules that prevent technical debt
 * - Custom rules for our specific patterns
 */

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import path from 'node:path';
import url from 'node:url';
import noGeminiAntipatterns from './eslint-rules/no-gemini-antipatterns.js';

// ESM way to get __dirname
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default tseslint.config(
  {
    // Global ignores - cleaner than Gemini CLI
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.d.ts',
      'benchmarks/**',
      '.cursor/**',
      'eslint.config.js',
    ],
  },
  
  // Base configurations
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict, // Stricter than Gemini CLI
  
  {
    // Main TypeScript configuration - SUPERIOR TO GEMINI CLI
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022, // More modern than Gemini CLI's es2021
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
         plugins: {
       import: importPlugin,
       'vibex-custom': {
         rules: {
           'no-gemini-antipatterns': noGeminiAntipatterns,
         },
       },
     },
         settings: {
       'import/resolver': {
         node: true,
       },
     },
    rules: {
      // TYPESCRIPT EXCELLENCE (Stricter than Gemini CLI)
      '@typescript-eslint/no-explicit-any': 'error', // Error vs Gemini's warn
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit', overrides: { constructors: 'no-public' } },
      ],
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            'signature',
            'public-static-field',
            'protected-static-field',
            'private-static-field',
            'public-instance-field',
            'protected-instance-field',
            'private-instance-field',
            'public-constructor',
            'protected-constructor',
            'private-constructor',
            'public-instance-method',
            'protected-instance-method',
            'private-instance-method',
          ],
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: false }, // No Hungarian notation
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
          suffix: ['Type'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'function',
          format: ['camelCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
        },
      ],
      '@typescript-eslint/no-inferrable-types': [
        'error',
        { ignoreParameters: false, ignoreProperties: false },
      ],
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: false }],
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for our use case
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      
             // IMPORT EXCELLENCE (Better than Gemini CLI)
       'import/no-default-export': 'error', // Enforce named exports
       'import/no-duplicates': 'error',
       'import/no-self-import': 'error',
      
      // PERFORMANCE RULES (Our Competitive Edge)
      'no-console': 'error', // Zero console pollution vs Gemini's 100+
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      'prefer-spread': 'error',
      'prefer-rest-params': 'error',
      
      // ARCHITECTURE ENFORCEMENT (Our Patterns)
      'max-lines': ['error', { max: 300, skipComments: true }], // File size discipline
      'max-lines-per-function': ['error', { max: 50, skipComments: true }],
      'complexity': ['error', { max: 10 }],
      'max-depth': ['error', { max: 4 }],
      'max-params': ['error', { max: 4 }],
      'max-statements': ['error', { max: 20 }],
      
      // ERROR HANDLING EXCELLENCE
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      'no-return-await': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      
      // CODE QUALITY (Superior to Gemini CLI)
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'curly': ['error', 'all'], // Stricter than Gemini's multi-line
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-new-wrappers': 'error',
      'no-proto': 'error',
      'no-script-url': 'error',
      'no-sequences': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'radix': 'error',
      'yoda': 'error',
      
      // MODERN JAVASCRIPT (Ahead of Gemini CLI)
      'arrow-body-style': ['error', 'as-needed'],
      'arrow-parens': ['error', 'as-needed'],
      'arrow-spacing': 'error',
      'generator-star-spacing': ['error', { before: false, after: true }],
      'no-confusing-arrow': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'rest-spread-spacing': ['error', 'never'],
      'template-curly-spacing': ['error', 'never'],
      'yield-star-spacing': ['error', 'after'],
      
      // SECURITY (Better than Gemini CLI)
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      
      // ANTI-PATTERNS (Avoid Gemini CLI Mistakes)
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="require"]',
          message: 'Use ES6 imports instead of require(). Avoid Gemini CLI anti-pattern.',
        },
        {
          selector: 'CallExpression[callee.object.name="console"]',
          message: 'Use proper logging instead of console statements. Gemini CLI has 100+ console calls.',
        },
        {
          selector: 'ThrowStatement > Literal',
          message: 'Throw Error objects, not string literals. Better than Gemini CLI error handling.',
        },
        {
          selector: 'VariableDeclarator[id.name=/^(data|result|item|temp|tmp)$/]',
          message: 'Use descriptive variable names. Avoid generic names like Gemini CLI.',
        },
      ],
      
             // DOCUMENTATION REQUIREMENTS
       'valid-jsdoc': 'off', // Disabled in favor of TypeScript
       'require-jsdoc': 'off', // We use TypeScript types
       
       // CUSTOM RULES (Our Competitive Edge)
       'vibex-custom/no-gemini-antipatterns': 'error', // Prevent Gemini CLI anti-patterns
    },
  },
  
  {
    // Test files - slightly relaxed rules
    files: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      'no-console': 'off', // Allow console in tests
    },
  },
  
  {
    // Configuration files
    files: ['*.config.{js,ts}', 'scripts/**/*.{js,ts}'],
    rules: {
      'no-console': 'off',
      'import/no-default-export': 'off',
    },
  },
  
  {
    // CLI entry points
    files: ['src/cli.ts', 'src/index.ts'],
    rules: {
      'no-console': 'off', // CLI needs console output
    },
  }
); 