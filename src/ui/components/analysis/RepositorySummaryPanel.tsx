/**
 * Repository Summary Panel
 * 
 * Displays an overview of the repository analysis results including
 * file statistics, overall quality score, and issue distribution.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { RepositorySummary, MetricCategory, IssueSeverity, FileType } from './types.js';
import { QualityScoreBadge } from './QualityScoreBadge.js';

/**
 * Repository summary panel props
 */
export interface RepositorySummaryPanelProps {
  /**
   * Repository summary data
   */
  repository: RepositorySummary;
  
  /**
   * Panel width
   */
  width?: number;
  
  /**
   * Panel height
   */
  height?: number;
  
  /**
   * Callback for category selection
   */
  onCategorySelect?: (category: MetricCategory | null) => void;
}

/**
 * Get color for file type
 */
const getFileTypeColor = (fileType: FileType): string => {
  switch (fileType) {
    case FileType.JAVASCRIPT:
      return Colors.Warning;
    case FileType.TYPESCRIPT:
      return Colors.AccentBlue;
    case FileType.REACT:
      return Colors.Info;
    case FileType.CSS:
      return Colors.AccentPurple;
    case FileType.HTML:
      return Colors.Error;
    case FileType.JSON:
      return Colors.Success;
    case FileType.MARKDOWN:
      return Colors.TextDim;
    case FileType.OTHER:
    default:
      return Colors.Text;
  }
};

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
 * Repository summary panel component
 */
export const RepositorySummaryPanel: React.FC<RepositorySummaryPanelProps> = ({
  repository,
  width = 80,
  height = 20,
  onCategorySelect
}) => {
  // Calculate total issues
  const totalIssues = Object.values(repository.issueSummary).reduce(
    (total, count) => total + (count || 0), 
    0
  );
  
  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Core stats */}
      <Box marginBottom={1}>
        <Box 
          borderStyle="round" 
          borderColor={Colors.Secondary} 
          paddingX={2} 
          paddingY={1}
          flexDirection="column"
          width="60%"
        >
          <Box marginBottom={1}>
            <Text bold>{repository.name}</Text>
          </Box>
          
          <Box>
            <Text color={Colors.TextDim}>Files: </Text>
            <Text bold>{repository.totalFiles}</Text>
          </Box>
          
          <Box>
            <Text color={Colors.TextDim}>Lines of Code: </Text>
            <Text bold>{repository.totalLinesOfCode.toLocaleString()}</Text>
          </Box>
          
          <Box>
            <Text color={Colors.TextDim}>Issues Found: </Text>
            <Text bold>{totalIssues}</Text>
          </Box>
        </Box>
        
        {/* Quality score */}
        <Box 
          marginLeft={1}
          borderStyle="round" 
          borderColor={Colors.Secondary}
          paddingX={2}
          paddingY={1}
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          flexGrow={1}
        >
          <Text bold marginBottom={1}>Overall Quality Score</Text>
          <QualityScoreBadge score={repository.overallScore} size="large" />
        </Box>
      </Box>
      
      {/* File type distribution */}
      <Box 
        borderStyle="round" 
        borderColor={Colors.Secondary}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        marginBottom={1}
      >
        <Text bold marginBottom={1}>File Type Distribution</Text>
        
        <Box>
          {Object.entries(repository.fileTypeDistribution)
            .filter(([_, count]) => count && count > 0)
            .map(([fileType, count]) => (
              <Box key={fileType} marginRight={2}>
                <Text color={getFileTypeColor(fileType as FileType)}>
                  {fileType}: <Text bold>{count}</Text>
                </Text>
              </Box>
            ))
          }
        </Box>
      </Box>
      
      {/* Issue severity distribution */}
      <Box 
        borderStyle="round" 
        borderColor={Colors.Secondary}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        marginBottom={1}
      >
        <Text bold marginBottom={1}>Issue Distribution</Text>
        
        <Box>
          {Object.entries(repository.issueSummary)
            .filter(([_, count]) => count && count > 0)
            .sort((a, b) => {
              // Sort by severity (critical first)
              const severities = Object.values(IssueSeverity);
              return severities.indexOf(a[0] as IssueSeverity) - 
                     severities.indexOf(b[0] as IssueSeverity);
            })
            .map(([severity, count]) => (
              <Box key={severity} marginRight={2}>
                <Text color={getSeverityColor(severity as IssueSeverity)}>
                  {severity}: <Text bold>{count}</Text>
                </Text>
              </Box>
            ))
          }
        </Box>
      </Box>
      
      {/* Recommended actions */}
      <Box 
        borderStyle="round" 
        borderColor={Colors.Secondary}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Text bold marginBottom={1}>Recommended Actions</Text>
        
        <Box flexDirection="column">
          {/* Show recommendations based on issues */}
          {repository.issueSummary[IssueSeverity.CRITICAL] && (
            <Text color={Colors.Error}>
              • Address <Text bold>{repository.issueSummary[IssueSeverity.CRITICAL]}</Text> critical issues
            </Text>
          )}
          
          {repository.issueSummary[IssueSeverity.HIGH] && (
            <Text color={Colors.Warning}>
              • Fix <Text bold>{repository.issueSummary[IssueSeverity.HIGH]}</Text> high severity issues
            </Text>
          )}
          
          {/* Recommend checking metrics if score is below threshold */}
          {repository.overallScore < 70 && (
            <Text color={Colors.Info}>
              • Review code quality metrics to improve overall score
            </Text>
          )}
          
          {/* Generic recommendations */}
          <Text color={Colors.Text}>
            • Check the Issues tab for detailed problem descriptions
          </Text>
          
          <Text color={Colors.Text}>
            • Use File Explorer to find files that need improvement
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default RepositorySummaryPanel;