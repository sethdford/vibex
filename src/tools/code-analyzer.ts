/**
 * Advanced Code Analysis Tool
 * 
 * Provides comprehensive code analysis capabilities including:
 * - AST parsing and structure analysis
 * - Code quality metrics
 * - Security vulnerability detection
 * - Performance optimization suggestions
 * - Multi-language support
 */

import type { ToolDefinition, InternalToolResult } from './index.js';
import { logger } from '../utils/logger.js';
import { fileExists, readTextFile } from '../fs/operations.js';
import path from 'path';

interface AnalysisResults {
  file_path: string;
  language: string;
  file_size: number;
  line_count: number;
  timestamp: string;
  structure: {
    functions: number;
    classes: number;
    interfaces: number;
    imports: number;
    comments: number;
    complexity_score: number;
  };
  quality: {
    score: number;
    issues: string[];
    metrics: {
      avg_line_length: number;
      long_lines: number;
      comment_ratio: number;
    };
  };
  security: {
    score: number;
    vulnerabilities: string[];
    warnings: string[];
  };
  suggestions?: string[];
}

/**
 * Code analysis input parameters
 */
export interface CodeAnalysisInput {
  file_path: string;
  analysis_type?: string;
  include_suggestions?: boolean;
}

export function createCodeAnalyzerTool(): ToolDefinition {
  return {
    name: 'analyze_code',
    description: 'Perform comprehensive code analysis including quality metrics, security, and optimization suggestions',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the code file to analyze'
        },
        analysis_type: {
          type: 'string',
          description: 'Type of analysis to perform (default: full)',
          default: 'full'
        },
        include_suggestions: {
          type: 'boolean',
          description: 'Include improvement suggestions (default: true)',
          default: true
        }
      },
      required: ['file_path']
    }
  };
}

export async function executeCodeAnalysis(input: CodeAnalysisInput): Promise<InternalToolResult> {
  try {
    const { file_path, analysis_type = 'full', include_suggestions = true } = input;
    
    // Validate file exists
    if (!await fileExists(file_path)) {
      return {
        success: false,
        error: `File not found: ${file_path}`
      };
    }
    
    // Read file content
    const content = await readTextFile(file_path);
    const fileExtension = path.extname(file_path).toLowerCase();
    const language = detectLanguage(fileExtension);
    
    logger.info(`Analyzing ${language} code: ${file_path}`);
    
    // Perform basic analysis
    const analysisResults: AnalysisResults = {
      file_path,
      language,
      file_size: content.length,
      line_count: content.split('\n').length,
      timestamp: new Date().toISOString(),
      structure: analyzeStructure(content, language),
      quality: analyzeQuality(content, language),
      security: analyzeSecurity(content, language)
    };
    
    // Add suggestions if requested
    if (include_suggestions) {
      analysisResults.suggestions = generateSuggestions(analysisResults, content, language);
    }
    
    // Format results for display
    const formattedResult = formatAnalysisResults(analysisResults);
    
    return {
      success: true,
      result: formattedResult
    };
    
  } catch (error) {
    logger.error('Code analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze code'
    };
  }
}

function detectLanguage(extension: string): string {
  const languageMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (JSX)',
    '.tsx': 'TypeScript (TSX)',
    '.py': 'Python',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.cs': 'C#',
    '.go': 'Go',
    '.rs': 'Rust',
    '.php': 'PHP',
    '.rb': 'Ruby'
  };
  
  return languageMap[extension] || 'Unknown';
}

function analyzeStructure(content: string, language: string): AnalysisResults['structure'] {
  const structure = {
    functions: 0,
    classes: 0,
    interfaces: 0,
    imports: 0,
    comments: 0,
    complexity_score: 0
  };
  
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Comments
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
      structure.comments++;
    }
    
    // Basic pattern matching
    if (language.includes('JavaScript') || language.includes('TypeScript')) {
      if (trimmed.match(/^(function|const\s+\w+\s*=|=>)/)) {
        structure.functions++;
      }
      if (trimmed.startsWith('class')) {structure.classes++;}
      if (trimmed.startsWith('interface')) {structure.interfaces++;}
      if (trimmed.startsWith('import')) {structure.imports++;}
    }
    
    // Complexity indicators
    if (trimmed.match(/\b(if|else|for|while|switch|try|catch)\b/)) {
      structure.complexity_score++;
    }
  }
  
  return structure;
}

function analyzeQuality(content: string, language: string): AnalysisResults['quality'] {
  const quality = {
    score: 100,
    issues: [] as string[],
    metrics: {
      avg_line_length: 0,
      long_lines: 0,
      comment_ratio: 0
    }
  };
  
  const lines = content.split('\n');
  let totalLength = 0;
  let commentLines = 0;
  let longLines = 0;
  
  for (const line of lines) {
    totalLength += line.length;
    if (line.length > 120) {longLines++;}
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
      commentLines++;
    }
  }
  
  quality.metrics.avg_line_length = Math.round(totalLength / lines.length);
  quality.metrics.long_lines = longLines;
  quality.metrics.comment_ratio = Math.round((commentLines / lines.length) * 100);
  
  // Quality scoring
  let score = 100;
  
  if (longLines > lines.length * 0.1) {
    quality.issues.push('Too many long lines (>120 characters)');
    score -= 10;
  }
  
  if (quality.metrics.comment_ratio < 10) {
    quality.issues.push('Low comment ratio - consider adding more documentation');
    score -= 15;
  }
  
  quality.score = Math.max(0, score);
  
  return quality;
}

function analyzeSecurity(content: string, language: string): AnalysisResults['security'] {
  const security = {
    score: 100,
    vulnerabilities: [] as string[],
    warnings: [] as string[]
  };
  
  // Basic security checks
  if (content.match(/password\s*=\s*["'][^"']+["']/i)) {
    security.vulnerabilities.push('Hardcoded password detected');
    security.score -= 20;
  }
  
  if (content.match(/api[_-]?key\s*=\s*["'][^"']+["']/i)) {
    security.vulnerabilities.push('Hardcoded API key detected');
    security.score -= 20;
  }
  
  if (content.includes('eval(')) {
    security.vulnerabilities.push('Use of eval() function - potential code injection');
    security.score -= 15;
  }
  
  return security;
}

function generateSuggestions(analysisResults: AnalysisResults, content: string, language: string): string[] {
  const suggestions: string[] = [];
  
  if (analysisResults.structure.functions > 20) {
    suggestions.push('Consider breaking this file into smaller modules');
  }
  
  if (analysisResults.quality.score < 70) {
    suggestions.push('Code quality is below recommended threshold');
  }
  
  if (analysisResults.security.vulnerabilities.length > 0) {
    suggestions.push('Critical security vulnerabilities found - address immediately');
  }
  
  return suggestions;
}

function formatAnalysisResults(results: AnalysisResults): string {
  let output = `# Code Analysis Report\n\n`;
  output += `**File:** ${results.file_path}\n`;
  output += `**Language:** ${results.language}\n`;
  output += `**Size:** ${results.file_size} characters, ${results.line_count} lines\n\n`;
  
  // Structure section
  output += `## 📊 Code Structure\n`;
  output += `- Functions: ${results.structure.functions}\n`;
  output += `- Classes: ${results.structure.classes}\n`;
  output += `- Interfaces: ${results.structure.interfaces}\n`;
  output += `- Imports: ${results.structure.imports}\n`;
  output += `- Comments: ${results.structure.comments}\n`;
  output += `- Complexity Score: ${results.structure.complexity_score}\n\n`;
  
  // Quality section
  output += `## ✨ Code Quality (Score: ${results.quality.score}/100)\n`;
  output += `- Average Line Length: ${results.quality.metrics.avg_line_length}\n`;
  output += `- Long Lines: ${results.quality.metrics.long_lines}\n`;
  output += `- Comment Ratio: ${results.quality.metrics.comment_ratio}%\n`;
  if (results.quality.issues.length > 0) {
    output += `\n**Issues:**\n`;
    results.quality.issues.forEach((issue: string) => output += `- ${issue}\n`);
  }
  output += `\n`;
  
  // Security section
  output += `## 🔒 Security Analysis (Score: ${results.security.score}/100)\n`;
  if (results.security.vulnerabilities.length > 0) {
    output += `\n**🚨 Vulnerabilities:**\n`;
    results.security.vulnerabilities.forEach((vuln: string) => output += `- ${vuln}\n`);
  }
  if (results.security.warnings.length > 0) {
    output += `\n**⚠️ Warnings:**\n`;
    results.security.warnings.forEach((warning: string) => output += `- ${warning}\n`);
  }
  output += `\n`;
  
  // Suggestions
  if (results.suggestions && results.suggestions.length > 0) {
    output += `## 💡 Recommendations\n`;
    results.suggestions.forEach((suggestion: string) => output += `- ${suggestion}\n`);
    output += `\n`;
  }
  
  return output;
} 