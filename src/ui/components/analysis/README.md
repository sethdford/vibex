# Code Analysis Dashboard Components

This directory contains UI components for the Code Analysis Dashboard, which visualizes code quality metrics, issues, and insights from the CodeAnalyzerTool.

## Components Overview

### 1. CodeAnalysisDashboard

The main dashboard component that coordinates different panels and manages shared state.

**Key Features:**
- Tab-based navigation between different views
- Filter management across panels
- Responsive layout based on terminal dimensions

### 2. RepositorySummaryPanel

Displays an overview of the repository analysis results.

**Key Features:**
- Summary of file statistics
- Overall quality score
- Issue distribution by severity
- File type distribution
- Recommended actions based on analysis

### 3. QualityMetricsPanel

Visualizes code quality metrics with categorization and details.

**Key Features:**
- Metric categorization and scoring
- Metric details with descriptions
- Visual representations with bar charts
- Trend indicators for metric changes

### 4. IssueListPanel

Displays a list of code issues with filtering and details.

**Key Features:**
- Issues grouped by severity
- Issue details with code snippets
- Filtering by category and severity
- Suggested fixes for issues

### 5. FileExplorerPanel

Provides a hierarchical view of files and directories with quality metrics.

**Key Features:**
- Tree view of repository structure
- Quality scores for files and directories
- Highlighting of problematic files
- Detailed file metrics

### 6. QualityScoreBadge

A reusable component for displaying quality scores with color-coding.

**Key Features:**
- Dynamic color based on score
- Multiple size options
- Optional letter grade display

## Data Models

The dashboard uses a comprehensive set of data models defined in `types.ts`:

- **CodeAnalysisResult**: The complete analysis result with repository metrics, issues, and quality scores
- **RepositorySummary**: Summary statistics for the repository
- **DirectoryMetrics**: Metrics for a directory, including file counts and scores
- **FileMetrics**: Detailed metrics for an individual file
- **CodeQualityMetric**: Definition of a specific quality metric
- **CodeIssue**: Detailed information about a code issue

## Integration with Tool System

The Code Analysis Dashboard integrates with the VibeX tool system through the CodeAnalyzerTool adapter. The dashboard visualizes the output from this specialized tool, providing an interactive interface for exploring code quality metrics and issues.

### Tool Result Processing

The dashboard components are designed to work with the CodeAnalyzerTool output format, but they can also be used with data from other code analysis tools with appropriate data transformation.

## Example Usage

```tsx
import { CodeAnalysisDashboard } from '../components/analysis';

// In your component:
<CodeAnalysisDashboard
  analysisResult={analysisResult}
  width={100}
  height={35}
  initialPanel={DashboardPanel.REPOSITORY_SUMMARY}
  onFileSelect={handleFileSelect}
  onIssueSelect={handleIssueSelect}
/>
```

## Example Component

An example component `CodeAnalysisDashboardExample` is provided to demonstrate the usage of the dashboard with sample data. The example data in `exampleData.ts` shows the expected data structure and can be used as a reference for integration with real analysis tools.

## Planned Enhancements

1. **Historical Data Comparison**: Compare metrics across different points in time
2. **Customizable Dashboard Layout**: Allow users to configure which panels to display
3. **Issue Lifecycle Management**: Track issue resolution and status
4. **Integration with CI/CD**: Display trends from continuous integration runs