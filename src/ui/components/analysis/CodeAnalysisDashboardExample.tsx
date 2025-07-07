/**
 * Code Analysis Dashboard Example
 * 
 * This file demonstrates the usage of the Code Analysis Dashboard with example data.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import { MetricCategory, IssueSeverity } from './types.js';
import { CodeAnalysisDashboard, DashboardPanel } from './CodeAnalysisDashboard.js';
import { exampleAnalysisResult } from './exampleData.js';

/**
 * Code analysis dashboard example component
 */
export const CodeAnalysisDashboardExample: React.FC = () => {
  // Track selected item info for demonstration
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  
  // Handle keyboard input for instructions
  useInput((input, key) => {
    if (input === 'q' || (key.escape && key.meta)) {
      // In a real app, this would exit the dashboard
      setSelectedFile(null);
      setSelectedIssue(null);
    }
  });
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1} padding={1} borderStyle="round" borderColor={Colors.AccentBlue}>
        <Text bold>Code Analysis Dashboard Example</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={Colors.TextDim}>Press Q to reset selections</Text>
        </Box>
      </Box>
      
      <CodeAnalysisDashboard
        analysisResult={exampleAnalysisResult}
        width={100}
        height={35}
        initialPanel={DashboardPanel.REPOSITORY_SUMMARY}
        onFileSelect={setSelectedFile}
        onIssueSelect={setSelectedIssue}
      />
      
      {/* Selections display (for demo purposes) */}
      <Box marginTop={1} padding={1} borderStyle="round" borderColor={Colors.TextDim}>
        <Box flexDirection="column">
          {selectedFile && (
            <Text>
              Selected File: <Text color={Colors.AccentBlue} bold>{selectedFile}</Text>
            </Text>
          )}
          
          {selectedIssue && (
            <Text>
              Selected Issue: <Text color={Colors.AccentBlue} bold>{selectedIssue}</Text>
            </Text>
          )}
          
          {!selectedFile && !selectedIssue && (
            <Text color={Colors.TextDim}>
              No items selected. Click on files or issues to select them.
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default CodeAnalysisDashboardExample;