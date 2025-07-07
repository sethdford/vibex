/**
 * Issue List Panel
 * 
 * Displays a list of code issues with filtering and details view.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { CodeIssue, MetricCategory, IssueSeverity } from './types.js';

/**
 * Issue list panel props
 */
export interface IssueListPanelProps {
  /**
   * Issues data
   */
  issues: CodeIssue[];
  
  /**
   * Selected category filter
   */
  selectedCategory: MetricCategory | null;
  
  /**
   * Selected severity filter
   */
  selectedSeverity: IssueSeverity | null;
  
  /**
   * Panel width
   */
  width?: number;
  
  /**
   * Panel height
   */
  height?: number;
  
  /**
   * Callback for issue selection
   */
  onIssueSelect?: (issueId: string) => void;
  
  /**
   * Callback for category selection
   */
  onCategorySelect?: (category: MetricCategory | null) => void;
  
  /**
   * Callback for severity selection
   */
  onSeveritySelect?: (severity: IssueSeverity | null) => void;
}

/**
 * Get color for severity
 */
const getSeverityColor = (severity: IssueSeverity): string => {
  switch (severity) {
    case IssueSeverity.CRITICAL:
      return Colors.Error;
    case IssueSeverity.HIGH:
      return Colors.Warning;
    case IssueSeverity.MEDIUM:
      return Colors.AccentOrange;
    case IssueSeverity.LOW:
      return Colors.Info;
    case IssueSeverity.INFO:
    default:
      return Colors.TextDim;
  }
};

/**
 * Get color for category
 */
const getCategoryColor = (category: MetricCategory): string => {
  switch (category) {
    case MetricCategory.MAINTAINABILITY:
      return Colors.AccentBlue;
    case MetricCategory.COMPLEXITY:
      return Colors.Warning;
    case MetricCategory.DUPLICATION:
      return Colors.AccentOrange;
    case MetricCategory.COVERAGE:
      return Colors.Success;
    case MetricCategory.SECURITY:
      return Colors.Error;
    case MetricCategory.PERFORMANCE:
      return Colors.AccentPurple;
    case MetricCategory.STYLE:
      return Colors.Info;
    default:
      return Colors.Text;
  }
};

/**
 * Issue list panel component
 */
export const IssueListPanel: React.FC<IssueListPanelProps> = ({
  issues,
  selectedCategory,
  selectedSeverity,
  width = 80,
  height = 20,
  onIssueSelect,
  onCategorySelect,
  onSeveritySelect
}) => {
  // Selected issue for details view
  const [selectedIssue, setSelectedIssue] = useState<CodeIssue | null>(null);
  
  // Filter issues
  const filteredIssues = issues.filter(issue => {
    if (selectedCategory && issue.category !== selectedCategory) {
      return false;
    }
    if (selectedSeverity && issue.severity !== selectedSeverity) {
      return false;
    }
    return true;
  });
  
  // Sort issues by severity (critical first)
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    // Map severities to numeric values for sorting
    const severityValues: Record<IssueSeverity, number> = {
      [IssueSeverity.CRITICAL]: 1,
      [IssueSeverity.HIGH]: 2,
      [IssueSeverity.MEDIUM]: 3,
      [IssueSeverity.LOW]: 4,
      [IssueSeverity.INFO]: 5
    };
    
    return severityValues[a.severity] - severityValues[b.severity];
  });
  
  // Group issues by severity for summary display
  const issuesBySeverity = sortedIssues.reduce((grouped, issue) => {
    if (!grouped[issue.severity]) {
      grouped[issue.severity] = [];
    }
    grouped[issue.severity].push(issue);
    return grouped;
  }, {} as Record<IssueSeverity, CodeIssue[]>);
  
  // Handle issue selection
  const handleIssueSelect = useCallback((issue: CodeIssue) => {
    setSelectedIssue(prev => prev?.id === issue.id ? null : issue);
    if (onIssueSelect) {
      onIssueSelect(issue.id);
    }
  }, [onIssueSelect]);
  
  // Handle severity filter
  const handleSeveritySelect = useCallback((severity: IssueSeverity) => {
    if (onSeveritySelect) {
      if (selectedSeverity === severity) {
        onSeveritySelect(null);
      } else {
        onSeveritySelect(severity);
      }
    }
  }, [selectedSeverity, onSeveritySelect]);
  
  // Handle category filter
  const handleCategorySelect = useCallback((category: MetricCategory) => {
    if (onCategorySelect) {
      if (selectedCategory === category) {
        onCategorySelect(null);
      } else {
        onCategorySelect(category);
      }
    }
  }, [selectedCategory, onCategorySelect]);
  
  // Calculate list height (accounting for headers and filters)
  const listHeight = height - (selectedIssue ? 10 : 4);
  
  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Severity summary/filter */}
      <Box 
        borderStyle="round" 
        borderColor={Colors.Secondary}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        marginBottom={1}
      >
        <Text bold marginBottom={1}>Issues by Severity</Text>
        
        <Box>
          {Object.entries(IssueSeverity).map(([key, severity]) => {
            const count = issuesBySeverity[severity]?.length || 0;
            const totalCount = issues.filter(i => i.severity === severity).length;
            
            return (
              <Box key={severity} marginRight={3}>
                <Text 
                  color={getSeverityColor(severity)}
                  bold={selectedSeverity === severity}
                  underline
                  onClick={() => handleSeveritySelect(severity)}
                >
                  {severity}: <Text bold>{count}</Text>
                  {count < totalCount && (
                    <Text color={Colors.TextDim}>/{totalCount}</Text>
                  )}
                </Text>
              </Box>
            );
          })}
          
          <Box flexGrow={1} justifyContent="flex-end">
            <Text color={Colors.TextDim}>
              Total: <Text bold>{filteredIssues.length}</Text>
              {filteredIssues.length < issues.length && (
                <Text>/{issues.length}</Text>
              )}
            </Text>
          </Box>
        </Box>
      </Box>
      
      {/* Issue list */}
      <Box 
        borderStyle="round" 
        borderColor={Colors.Secondary}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        height={selectedIssue ? height - 14 : height - 8}
        marginBottom={1}
      >
        <Text bold marginBottom={1}>Issues</Text>
        
        <Box flexDirection="column">
          {sortedIssues.length > 0 ? (
            sortedIssues
              .slice(0, listHeight)
              .map(issue => (
                <Box 
                  key={issue.id}
                  marginBottom={1}
                  paddingX={1}
                  paddingY={0}
                  backgroundColor={selectedIssue?.id === issue.id ? Colors.DimBackground : undefined}
                  onClick={() => handleIssueSelect(issue)}
                >
                  <Box marginRight={2} width={10}>
                    <Text 
                      color={getSeverityColor(issue.severity)}
                      bold={selectedIssue?.id === issue.id}
                    >
                      {issue.severity}
                    </Text>
                  </Box>
                  
                  <Box marginRight={2} width={12}>
                    <Text 
                      color={getCategoryColor(issue.category)}
                      underline
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategorySelect(issue.category);
                      }}
                    >
                      {issue.category}
                    </Text>
                  </Box>
                  
                  <Text 
                    color={Colors.Text}
                    bold={selectedIssue?.id === issue.id}
                    wrap="truncate"
                  >
                    {issue.title}
                  </Text>
                </Box>
              ))
          ) : (
            <Text color={Colors.TextDim}>No issues found matching the selected filters.</Text>
          )}
          
          {/* Show count if there are more issues than can fit */}
          {sortedIssues.length > listHeight && (
            <Text color={Colors.TextDim} italic>
              + {sortedIssues.length - listHeight} more issues
            </Text>
          )}
        </Box>
      </Box>
      
      {/* Issue details */}
      {selectedIssue && (
        <Box 
          borderStyle="round" 
          borderColor={Colors.Secondary}
          paddingX={2}
          paddingY={1}
          flexDirection="column"
          flexGrow={1}
        >
          <Box marginBottom={1}>
            <Text bold color={getSeverityColor(selectedIssue.severity)}>
              {selectedIssue.severity}:
            </Text>
            <Text bold> {selectedIssue.title}</Text>
          </Box>
          
          <Box marginBottom={1}>
            <Text color={Colors.TextDim}>
              File: <Text color={Colors.AccentBlue}>{selectedIssue.filePath}</Text>
              {selectedIssue.line !== undefined && (
                <Text>:{selectedIssue.line}</Text>
              )}
              {selectedIssue.column !== undefined && (
                <Text>:{selectedIssue.column}</Text>
              )}
            </Text>
          </Box>
          
          <Box marginBottom={1}>
            <Text>{selectedIssue.description}</Text>
          </Box>
          
          {/* Code snippet */}
          {selectedIssue.codeSnippet && (
            <Box flexDirection="column" marginBottom={1}>
              <Text color={Colors.TextDim}>Code:</Text>
              <Box 
                marginTop={0}
                paddingX={1}
                paddingY={0}
                borderStyle="single"
                borderColor={Colors.TextDim}
              >
                <Text>{selectedIssue.codeSnippet}</Text>
              </Box>
            </Box>
          )}
          
          {/* Suggested fix */}
          {selectedIssue.suggestion && (
            <Box flexDirection="column">
              <Text color={Colors.TextDim}>Suggested fix:</Text>
              <Box marginLeft={2}>
                <Text color={Colors.Success}>{selectedIssue.suggestion}</Text>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default IssueListPanel;