/**
 * Versioning View Component - Clean Architecture like Gemini CLI
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

interface VersioningViewProps {
  workflowVersions: any;
  currentVersion: string;
  workflow: any;
  onCreateVersion: any;
  onRestoreVersion: any;
  config: any;
}

export const VersioningView: React.FC<VersioningViewProps> = ({
  workflowVersions,
  currentVersion,
}) => {
  return (
    <Box flexDirection="column">
      <Text color={Colors.Primary} bold>📝 Workflow Versions</Text>
      <Text color={Colors.Text}>Current: {currentVersion}</Text>
      <Text color={Colors.TextDim}>Total: {workflowVersions.size}</Text>
    </Box>
  );
}; 