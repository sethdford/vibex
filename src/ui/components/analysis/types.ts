/**
 * Code Analysis Dashboard Types
 * 
 * Type definitions for the code analysis visualization components.
 */

/**
 * Code quality metric categories
 */
export enum MetricCategory {
  MAINTAINABILITY = 'maintainability',
  COMPLEXITY = 'complexity',
  DUPLICATION = 'duplication',
  COVERAGE = 'coverage',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  STYLE = 'style'
}

/**
 * Issue severity levels
 */
export enum IssueSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

/**
 * File type categories
 */
export enum FileType {
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  REACT = 'react',
  CSS = 'css',
  HTML = 'html',
  JSON = 'json',
  MARKDOWN = 'markdown',
  OTHER = 'other'
}

/**
 * Code quality metric
 */
export interface CodeQualityMetric {
  /**
   * Metric name
   */
  name: string;
  
  /**
   * Metric category
   */
  category: MetricCategory;
  
  /**
   * Metric value (0-100)
   */
  value: number;
  
  /**
   * Metric baseline value (optional)
   */
  baseline?: number;
  
  /**
   * Metric trend (percentage change from previous)
   */
  trend?: number;
  
  /**
   * Description of the metric
   */
  description?: string;
}

/**
 * Code issue
 */
export interface CodeIssue {
  /**
   * Issue ID
   */
  id: string;
  
  /**
   * Issue title
   */
  title: string;
  
  /**
   * Issue severity
   */
  severity: IssueSeverity;
  
  /**
   * Issue category
   */
  category: MetricCategory;
  
  /**
   * File path where the issue was found
   */
  filePath: string;
  
  /**
   * Line number where the issue was found
   */
  line?: number;
  
  /**
   * Column number where the issue was found
   */
  column?: number;
  
  /**
   * Issue description
   */
  description: string;
  
  /**
   * Code snippet context
   */
  codeSnippet?: string;
  
  /**
   * Suggested fix
   */
  suggestion?: string;
}

/**
 * File metrics
 */
export interface FileMetrics {
  /**
   * File path
   */
  path: string;
  
  /**
   * File type
   */
  type: FileType;
  
  /**
   * Lines of code
   */
  linesOfCode: number;
  
  /**
   * Number of functions
   */
  functions: number;
  
  /**
   * Number of classes
   */
  classes: number;
  
  /**
   * Cyclomatic complexity
   */
  complexity: number;
  
  /**
   * Number of issues
   */
  issues: number;
  
  /**
   * Overall quality score (0-100)
   */
  score: number;
  
  /**
   * Detailed metrics
   */
  metrics: {
    [key in MetricCategory]?: number;
  };
}

/**
 * Directory metrics
 */
export interface DirectoryMetrics {
  /**
   * Directory path
   */
  path: string;
  
  /**
   * Number of files in directory (including subdirectories)
   */
  fileCount: number;
  
  /**
   * Total lines of code in directory
   */
  totalLinesOfCode: number;
  
  /**
   * Average complexity
   */
  avgComplexity: number;
  
  /**
   * Total issues
   */
  totalIssues: number;
  
  /**
   * Overall quality score (0-100)
   */
  score: number;
  
  /**
   * Files in the directory
   */
  files: FileMetrics[];
  
  /**
   * Subdirectories
   */
  directories?: DirectoryMetrics[];
}

/**
 * Repository summary
 */
export interface RepositorySummary {
  /**
   * Repository name
   */
  name: string;
  
  /**
   * Total files
   */
  totalFiles: number;
  
  /**
   * Total lines of code
   */
  totalLinesOfCode: number;
  
  /**
   * Distribution of file types
   */
  fileTypeDistribution: {
    [key in FileType]?: number;
  };
  
  /**
   * Overall quality score (0-100)
   */
  overallScore: number;
  
  /**
   * Issue summary
   */
  issueSummary: {
    [key in IssueSeverity]?: number;
  };
}

/**
 * Complete code analysis result
 */
export interface CodeAnalysisResult {
  /**
   * Analysis timestamp
   */
  timestamp: number;
  
  /**
   * Repository summary
   */
  repository: RepositorySummary;
  
  /**
   * Quality metrics
   */
  qualityMetrics: CodeQualityMetric[];
  
  /**
   * Issues found
   */
  issues: CodeIssue[];
  
  /**
   * Root directory metrics
   */
  rootDirectory: DirectoryMetrics;
  
  /**
   * Analysis duration in milliseconds
   */
  analysisTime: number;
  
  /**
   * Used analysis tool versions
   */
  toolVersions?: Record<string, string>;
}