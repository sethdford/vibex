/**
 * Code Analysis Dashboard
 * 
 * A comprehensive dashboard for visualizing code quality metrics,
 * issues, and insights from the CodeAnalyzerTool.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { 
  CodeAnalysisResult, 
  MetricCategory, 
  IssueSeverity 
} from './types.js';
import { RepositorySummaryPanel } from './RepositorySummaryPanel.js';
import { QualityMetricsPanel } from './QualityMetricsPanel.js';
import { IssueListPanel } from './IssueListPanel.js';
import { FileExplorerPanel } from './FileExplorerPanel.js';

/**
 * Dashboard panel types
 */
export enum DashboardPanel {
  REPOSITORY_SUMMARY = 'summary',
  QUALITY_METRICS = 'metrics',
  ISSUES = 'issues',
  FILE_EXPLORER = 'files',
}

/**
 * Code analysis dashboard props
 */
export interface CodeAnalysisDashboardProps {
  /**
   * Analysis result data
   */
  analysisResult: CodeAnalysisResult;
  
  /**
   * Terminal width for responsive layout
   */
  width?: number;
  
  /**
   * Terminal height for responsive layout
   */
  height?: number;
  
  /**
   * Initial active panel
   */
  initialPanel?: DashboardPanel;
  
  /**
   * Whether to show the header
   */
  showHeader?: boolean;
  
  /**
   * Callback for file selection
   */
  onFileSelect?: (filePath: string) => void;
  
  /**
   * Callback for issue selection
   */
  onIssueSelect?: (issueId: string) => void;
}

/**
 * Code analysis dashboard component
 */
export const CodeAnalysisDashboard: React.FC<CodeAnalysisDashboardProps> = ({
  analysisResult,
  width = 100,
  height = 30,
  initialPanel = DashboardPanel.REPOSITORY_SUMMARY,
  showHeader = true,
  onFileSelect,
  onIssueSelect,
}) => {
  // Active panel state
  const [activePanel, setActivePanel] = useState<DashboardPanel>(initialPanel);
  
  // Selected category/severity filters
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<IssueSeverity | null>(null);
  
  // Panel content height (accounting for header and navigation)
  const contentHeight = showHeader ? height - 4 : height - 2;
  
  // Render panel content based on active panel
  const renderPanelContent = () => {
    switch (activePanel) {
      case DashboardPanel.REPOSITORY_SUMMARY:
        return (
          <RepositorySummaryPanel 
            repository={analysisResult.repository} 
            width={width} 
            height={contentHeight}
            onCategorySelect={setSelectedCategory}
          />
        );
      
      case DashboardPanel.QUALITY_METRICS:
        return (
          <QualityMetricsPanel 
            metrics={analysisResult.qualityMetrics} 
            selectedCategory={selectedCategory}
            width={width} 
            height={contentHeight}
            onCategorySelect={setSelectedCategory}
          />
        );
      
      case DashboardPanel.ISSUES:
        return (
          <IssueListPanel 
            issues={analysisResult.issues} 
            selectedCategory={selectedCategory}
            selectedSeverity={selectedSeverity}
            width={width} 
            height={contentHeight}
            onIssueSelect={onIssueSelect}
            onSeveritySelect={setSelectedSeverity}
            onCategorySelect={setSelectedCategory}
          />
        );
      
      case DashboardPanel.FILE_EXPLORER:
        return (
          <FileExplorerPanel 
            rootDirectory={analysisResult.rootDirectory} 
            selectedCategory={selectedCategory}
            width={width} 
            height={contentHeight}
            onFileSelect={onFileSelect}
          />
        );
      
      default:
        return (
          <Box flexDirection="column">
            <Text>Select a panel to view</Text>
          </Box>
        );
    }
  };
  
  // Panel title
  const getPanelTitle = () => {
    switch (activePanel) {
      case DashboardPanel.REPOSITORY_SUMMARY:
        return 'Repository Summary';
      
      case DashboardPanel.QUALITY_METRICS:
        return 'Code Quality Metrics';
      
      case DashboardPanel.ISSUES:
        return 'Code Issues';
      
      case DashboardPanel.FILE_EXPLORER:
        return 'File Explorer';
      
      default:
        return 'Code Analysis Dashboard';
    }
  };
  
  // Handle panel navigation
  const handlePanelSelect = (panel: DashboardPanel) => {
    setActivePanel(panel);
  };
  
  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Header */}
      {showHeader && (
        <Box 
          borderStyle="round" 
          borderColor={Colors.Secondary}
          paddingX={1}
          marginBottom={1}
        >
          <Text bold color={Colors.AccentBlue}>
            Code Analysis Dashboard
          </Text>
          <Box flexGrow={1} justifyContent="flex-end">
            <Text color={Colors.TextDim}>
              {analysisResult.repository.name} • {new Date(analysisResult.timestamp).toLocaleString()}
            </Text>
          </Box>
        </Box>
      )}
      
      {/* Navigation tabs */}
      <Box marginBottom={1}>
        {Object.values(DashboardPanel).map(panel => (
          <Box
            key={panel}
            paddingX={2}
            paddingY={0}
            borderStyle={panel === activePanel ? 'bold' : 'single'}
            borderColor={panel === activePanel ? Colors.AccentBlue : Colors.TextDim}
            marginRight={1}
            onClick={() => handlePanelSelect(panel)}
          >
            <Text
              color={panel === activePanel ? Colors.AccentBlue : Colors.TextDim}
              bold={panel === activePanel}
            >
              {panel}
            </Text>
          </Box>
        ))}
      </Box>
      
      {/* Panel title */}
      <Box paddingX={1} marginBottom={1}>
        <Text bold>{getPanelTitle()}</Text>
        
        {/* Filter indicators */}
        {selectedCategory && (
          <Box marginLeft={2} onClick={() => setSelectedCategory(null)}>
            <Text color={Colors.Info}>
              Category: <Text bold>{selectedCategory}</Text>
            </Text>
            <Text 
              color={Colors.TextDim} 
              marginLeft={1}
            >
              [x]
            </Text>
          </Box>
        )}
        
        {selectedSeverity && (
          <Box marginLeft={2} onClick={() => setSelectedSeverity(null)}>
            <Text color={Colors.Info}>
              Severity: <Text bold>{selectedSeverity}</Text>
            </Text>
            <Text 
              color={Colors.TextDim} 
              marginLeft={1}
            >
              [x]
            </Text>
          </Box>
        )}
      </Box>
      
      {/* Panel content */}
      <Box flexGrow={1}>
        {renderPanelContent()}
      </Box>
    </Box>
  );
};

export default CodeAnalysisDashboard;