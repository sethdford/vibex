/**
 * Example data for the Code Analysis Dashboard
 */

import { 
  CodeAnalysisResult, 
  MetricCategory, 
  IssueSeverity,
  FileType
} from './types.js';

/**
 * Example code analysis result for demonstration purposes
 */
export const exampleAnalysisResult: CodeAnalysisResult = {
  timestamp: Date.now(),
  analysisTime: 3456,
  repository: {
    name: 'vibex',
    totalFiles: 127,
    totalLinesOfCode: 15743,
    fileTypeDistribution: {
      [FileType.TYPESCRIPT]: 86,
      [FileType.JAVASCRIPT]: 22,
      [FileType.JSON]: 12,
      [FileType.MARKDOWN]: 5,
      [FileType.CSS]: 2
    },
    overallScore: 78,
    issueSummary: {
      [IssueSeverity.CRITICAL]: 3,
      [IssueSeverity.HIGH]: 12,
      [IssueSeverity.MEDIUM]: 28,
      [IssueSeverity.LOW]: 46,
      [IssueSeverity.INFO]: 18
    }
  },
  qualityMetrics: [
    {
      name: 'Maintainability Index',
      category: MetricCategory.MAINTAINABILITY,
      value: 82,
      description: 'Indicates how maintainable the code is',
      baseline: 80,
      trend: 2
    },
    {
      name: 'Technical Debt Ratio',
      category: MetricCategory.MAINTAINABILITY,
      value: 71,
      description: 'Ratio of remediation cost to development cost',
      baseline: 65,
      trend: 6
    },
    {
      name: 'Documentation Coverage',
      category: MetricCategory.MAINTAINABILITY,
      value: 68,
      description: 'Percentage of code that is documented',
      baseline: 75,
      trend: -7
    },
    {
      name: 'Cyclomatic Complexity',
      category: MetricCategory.COMPLEXITY,
      value: 76,
      description: 'Measures the complexity of code based on control flow',
      baseline: 74,
      trend: 2
    },
    {
      name: 'Cognitive Complexity',
      category: MetricCategory.COMPLEXITY,
      value: 72,
      description: 'Measures how difficult the code is to understand',
      baseline: 70,
      trend: 2
    },
    {
      name: 'Nesting Depth',
      category: MetricCategory.COMPLEXITY,
      value: 85,
      description: 'Measures the depth of nested control structures',
      baseline: 82,
      trend: 3
    },
    {
      name: 'Code Duplication',
      category: MetricCategory.DUPLICATION,
      value: 78,
      description: 'Measures code duplication across the codebase',
      baseline: 76,
      trend: 2
    },
    {
      name: 'Test Coverage',
      category: MetricCategory.COVERAGE,
      value: 73,
      description: 'Percentage of code covered by tests',
      baseline: 68,
      trend: 5
    },
    {
      name: 'Branch Coverage',
      category: MetricCategory.COVERAGE,
      value: 64,
      description: 'Percentage of branches covered by tests',
      baseline: 61,
      trend: 3
    },
    {
      name: 'Security Score',
      category: MetricCategory.SECURITY,
      value: 84,
      description: 'Overall security assessment score',
      baseline: 80,
      trend: 4
    },
    {
      name: 'Dependency Vulnerabilities',
      category: MetricCategory.SECURITY,
      value: 91,
      description: 'Score based on vulnerability-free dependencies',
      baseline: 88,
      trend: 3
    },
    {
      name: 'Performance Score',
      category: MetricCategory.PERFORMANCE,
      value: 79,
      description: 'Overall performance assessment score',
      baseline: 75,
      trend: 4
    },
    {
      name: 'Code Style Compliance',
      category: MetricCategory.STYLE,
      value: 92,
      description: 'Adherence to coding style guidelines',
      baseline: 90,
      trend: 2
    }
  ],
  issues: [
    {
      id: 'SEC-001',
      title: 'Use of weak cryptographic algorithm',
      severity: IssueSeverity.CRITICAL,
      category: MetricCategory.SECURITY,
      filePath: 'src/auth/tokens.ts',
      line: 37,
      column: 12,
      description: 'The code uses MD5 which is a cryptographically weak hashing algorithm.',
      codeSnippet: 'const hash = crypto.createHash("md5").update(data).digest("hex");',
      suggestion: 'Use a strong hashing algorithm like SHA-256 or better.'
    },
    {
      id: 'SEC-002',
      title: 'Hardcoded credentials',
      severity: IssueSeverity.CRITICAL,
      category: MetricCategory.SECURITY,
      filePath: 'src/config/defaults.ts',
      line: 23,
      column: 16,
      description: 'Hardcoded API key detected in source code.',
      codeSnippet: 'const apiKey = "A1B2C3D4E5F6G7H8I9J0";',
      suggestion: 'Use environment variables or secure credential storage.'
    },
    {
      id: 'SEC-003',
      title: 'SQL Injection vulnerability',
      severity: IssueSeverity.CRITICAL,
      category: MetricCategory.SECURITY,
      filePath: 'src/db/queries.ts',
      line: 105,
      column: 24,
      description: 'Direct interpolation of user input into SQL query creates SQL injection risk.',
      codeSnippet: `const query = \`SELECT * FROM users WHERE username = '\${username}'\`;`,
      suggestion: 'Use parameterized queries with prepared statements.'
    },
    {
      id: 'PERF-001',
      title: 'Inefficient loop operation',
      severity: IssueSeverity.HIGH,
      category: MetricCategory.PERFORMANCE,
      filePath: 'src/utils/dataProcessing.ts',
      line: 78,
      column: 3,
      description: 'Array is being modified inside a loop which causes reallocation.',
      codeSnippet: 'for (let i = 0; i < items.length; i++) {\n  items.push(process(items[i]));\n}',
      suggestion: 'Use a separate array to collect results.'
    },
    {
      id: 'MAINT-001',
      title: 'Excessive function length',
      severity: IssueSeverity.MEDIUM,
      category: MetricCategory.MAINTAINABILITY,
      filePath: 'src/ai/claude-content-generator.ts',
      line: 142,
      description: 'Function is 215 lines long, which exceeds the recommended maximum of 50 lines.',
      suggestion: 'Break the function into smaller, focused functions with clear responsibilities.'
    },
    {
      id: 'COMP-001',
      title: 'High cyclomatic complexity',
      severity: IssueSeverity.MEDIUM,
      category: MetricCategory.COMPLEXITY,
      filePath: 'src/ai/tool-scheduler.ts',
      line: 56,
      description: 'Function has a cyclomatic complexity of 24, which exceeds the recommended maximum of 10.',
      suggestion: 'Refactor to reduce nested conditions and break logic into smaller functions.'
    },
    {
      id: 'DUP-001',
      title: 'Duplicated code',
      severity: IssueSeverity.LOW,
      category: MetricCategory.DUPLICATION,
      filePath: 'src/ui/hooks/useLoadingIndicator.ts',
      line: 28,
      description: 'This code appears to be duplicated in 3 other locations.',
      suggestion: 'Extract the common functionality into a shared utility function.'
    },
    {
      id: 'STYLE-001',
      title: 'Inconsistent naming convention',
      severity: IssueSeverity.INFO,
      category: MetricCategory.STYLE,
      filePath: 'src/ui/components/LoadingIndicator.tsx',
      line: 15,
      description: 'Variable name uses snake_case instead of camelCase as used in the rest of the codebase.',
      codeSnippet: 'const loading_text = "Loading...";',
      suggestion: 'Rename to camelCase (loadingText) for consistency.'
    }
  ],
  rootDirectory: {
    path: '/',
    fileCount: 127,
    totalLinesOfCode: 15743,
    avgComplexity: 7.4,
    totalIssues: 107,
    score: 78,
    files: [],
    directories: [
      {
        path: '/src',
        fileCount: 115,
        totalLinesOfCode: 14982,
        avgComplexity: 7.6,
        totalIssues: 94,
        score: 76,
        files: [],
        directories: [
          {
            path: '/src/ai',
            fileCount: 24,
            totalLinesOfCode: 3875,
            avgComplexity: 9.2,
            totalIssues: 31,
            score: 72,
            files: [
              {
                path: '/src/ai/claude-client.ts',
                type: FileType.TYPESCRIPT,
                linesOfCode: 325,
                functions: 14,
                classes: 2,
                complexity: 8.5,
                issues: 4,
                score: 78,
                metrics: {
                  [MetricCategory.MAINTAINABILITY]: 75,
                  [MetricCategory.COMPLEXITY]: 76,
                  [MetricCategory.COVERAGE]: 82,
                  [MetricCategory.SECURITY]: 85,
                  [MetricCategory.PERFORMANCE]: 72,
                  [MetricCategory.STYLE]: 90
                }
              },
              {
                path: '/src/ai/claude-content-generator.ts',
                type: FileType.TYPESCRIPT,
                linesOfCode: 587,
                functions: 21,
                classes: 1,
                complexity: 12.4,
                issues: 8,
                score: 65,
                metrics: {
                  [MetricCategory.MAINTAINABILITY]: 58,
                  [MetricCategory.COMPLEXITY]: 62,
                  [MetricCategory.DUPLICATION]: 73,
                  [MetricCategory.COVERAGE]: 67,
                  [MetricCategory.SECURITY]: 88,
                  [MetricCategory.PERFORMANCE]: 70,
                  [MetricCategory.STYLE]: 84
                }
              },
              {
                path: '/src/ai/tool-scheduler.ts',
                type: FileType.TYPESCRIPT,
                linesOfCode: 412,
                functions: 16,
                classes: 2,
                complexity: 10.8,
                issues: 7,
                score: 68,
                metrics: {
                  [MetricCategory.MAINTAINABILITY]: 64,
                  [MetricCategory.COMPLEXITY]: 58,
                  [MetricCategory.DUPLICATION]: 72,
                  [MetricCategory.COVERAGE]: 70,
                  [MetricCategory.SECURITY]: 82,
                  [MetricCategory.PERFORMANCE]: 75,
                  [MetricCategory.STYLE]: 88
                }
              }
            ]
          },
          {
            path: '/src/ui',
            fileCount: 42,
            totalLinesOfCode: 5246,
            avgComplexity: 5.8,
            totalIssues: 28,
            score: 82,
            files: [
              {
                path: '/src/ui/App.tsx',
                type: FileType.TYPESCRIPT,
                linesOfCode: 440,
                functions: 18,
                classes: 1,
                complexity: 7.2,
                issues: 3,
                score: 81,
                metrics: {
                  [MetricCategory.MAINTAINABILITY]: 80,
                  [MetricCategory.COMPLEXITY]: 78,
                  [MetricCategory.DUPLICATION]: 85,
                  [MetricCategory.COVERAGE]: 88,
                  [MetricCategory.SECURITY]: 92,
                  [MetricCategory.PERFORMANCE]: 84,
                  [MetricCategory.STYLE]: 94
                }
              },
              {
                path: '/src/ui/hooks/useLoadingIndicator.ts',
                type: FileType.TYPESCRIPT,
                linesOfCode: 87,
                functions: 4,
                classes: 0,
                complexity: 3.5,
                issues: 2,
                score: 84,
                metrics: {
                  [MetricCategory.MAINTAINABILITY]: 88,
                  [MetricCategory.COMPLEXITY]: 90,
                  [MetricCategory.DUPLICATION]: 68,
                  [MetricCategory.COVERAGE]: 75,
                  [MetricCategory.PERFORMANCE]: 82,
                  [MetricCategory.STYLE]: 95
                }
              },
              {
                path: '/src/ui/components/LoadingIndicator.tsx',
                type: FileType.TYPESCRIPT,
                linesOfCode: 124,
                functions: 5,
                classes: 1,
                complexity: 4.2,
                issues: 1,
                score: 88,
                metrics: {
                  [MetricCategory.MAINTAINABILITY]: 92,
                  [MetricCategory.COMPLEXITY]: 86,
                  [MetricCategory.DUPLICATION]: 94,
                  [MetricCategory.COVERAGE]: 79,
                  [MetricCategory.PERFORMANCE]: 85,
                  [MetricCategory.STYLE]: 82
                }
              }
            ],
            directories: [
              {
                path: '/src/ui/components',
                fileCount: 28,
                totalLinesOfCode: 3214,
                avgComplexity: 5.1,
                totalIssues: 16,
                score: 85,
                files: [
                  {
                    path: '/src/ui/components/HistoryItemDisplay.tsx',
                    type: FileType.TYPESCRIPT,
                    linesOfCode: 182,
                    functions: 7,
                    classes: 1,
                    complexity: 6.8,
                    issues: 2,
                    score: 83,
                    metrics: {
                      [MetricCategory.MAINTAINABILITY]: 85,
                      [MetricCategory.COMPLEXITY]: 79,
                      [MetricCategory.DUPLICATION]: 90,
                      [MetricCategory.COVERAGE]: 72,
                      [MetricCategory.PERFORMANCE]: 88,
                      [MetricCategory.STYLE]: 96
                    }
                  }
                ]
              }
            ]
          },
          {
            path: '/src/auth',
            fileCount: 8,
            totalLinesOfCode: 986,
            avgComplexity: 6.3,
            totalIssues: 7,
            score: 76,
            files: [
              {
                path: '/src/auth/tokens.ts',
                type: FileType.TYPESCRIPT,
                linesOfCode: 153,
                functions: 9,
                classes: 1,
                complexity: 5.7,
                issues: 4,
                score: 71,
                metrics: {
                  [MetricCategory.MAINTAINABILITY]: 75,
                  [MetricCategory.COMPLEXITY]: 82,
                  [MetricCategory.SECURITY]: 55,
                  [MetricCategory.COVERAGE]: 68,
                  [MetricCategory.PERFORMANCE]: 78,
                  [MetricCategory.STYLE]: 90
                }
              }
            ]
          },
          {
            path: '/src/config',
            fileCount: 6,
            totalLinesOfCode: 574,
            avgComplexity: 4.2,
            totalIssues: 5,
            score: 80,
            files: [
              {
                path: '/src/config/defaults.ts',
                type: FileType.TYPESCRIPT,
                linesOfCode: 142,
                functions: 3,
                classes: 0,
                complexity: 3.4,
                issues: 3,
                score: 74,
                metrics: {
                  [MetricCategory.MAINTAINABILITY]: 78,
                  [MetricCategory.COMPLEXITY]: 92,
                  [MetricCategory.SECURITY]: 62,
                  [MetricCategory.COVERAGE]: 70,
                  [MetricCategory.STYLE]: 88
                }
              }
            ]
          },
          {
            path: '/src/db',
            fileCount: 5,
            totalLinesOfCode: 427,
            avgComplexity: 5.6,
            totalIssues: 5,
            score: 75,
            files: [
              {
                path: '/src/db/queries.ts',
                type: FileType.TYPESCRIPT,
                linesOfCode: 218,
                functions: 12,
                classes: 0,
                complexity: 6.4,
                issues: 3,
                score: 68,
                metrics: {
                  [MetricCategory.MAINTAINABILITY]: 72,
                  [MetricCategory.COMPLEXITY]: 78,
                  [MetricCategory.SECURITY]: 58,
                  [MetricCategory.COVERAGE]: 65,
                  [MetricCategory.PERFORMANCE]: 72,
                  [MetricCategory.STYLE]: 85
                }
              }
            ]
          },
          {
            path: '/src/utils',
            fileCount: 12,
            totalLinesOfCode: 764,
            avgComplexity: 4.8,
            totalIssues: 6,
            score: 82,
            files: [
              {
                path: '/src/utils/dataProcessing.ts',
                type: FileType.TYPESCRIPT,
                linesOfCode: 183,
                functions: 14,
                classes: 0,
                complexity: 5.2,
                issues: 3,
                score: 75,
                metrics: {
                  [MetricCategory.MAINTAINABILITY]: 80,
                  [MetricCategory.COMPLEXITY]: 82,
                  [MetricCategory.PERFORMANCE]: 65,
                  [MetricCategory.COVERAGE]: 72,
                  [MetricCategory.STYLE]: 88
                }
              }
            ]
          }
        ]
      },
      {
        path: '/tests',
        fileCount: 12,
        totalLinesOfCode: 761,
        avgComplexity: 3.8,
        totalIssues: 3,
        score: 87,
        files: []
      }
    ]
  },
  toolVersions: {
    'eslint': '8.33.0',
    'typescript': '4.9.5',
    'jest': '29.4.1'
  }
};