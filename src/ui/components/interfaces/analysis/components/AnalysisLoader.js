/**
 * Analysis Loader Component
 * 
 * Displays analysis progress with a progress bar, phase information,
 * and file processing details.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../../../colors.js';
import { ProgressBar } from '../../../ProgressDisplay.js';

/**
 * Analysis progress interface
 * @typedef {Object} AnalysisProgress
 * @property {string} phase - Current phase of analysis
 * @property {number} percentage - Percentage complete (0-100)
 * @property {string} [currentFile] - Current file being analyzed
 * @property {number} [filesProcessed] - Number of files processed
 * @property {number} [totalFiles] - Total number of files to process
 */

/**
 * Analysis loader props
 * @typedef {Object} AnalysisLoaderProps
 * @property {AnalysisProgress} progress - Analysis progress information
 * @property {number} width - Available width for the component
 * @property {number} height - Available height for the component
 * @property {boolean} [showRecentFiles=true] - Whether to show recently processed files
 * @property {boolean} [showRecentFindings=false] - Whether to show recent findings
 */

/**
 * Analysis loader component
 * 
 * @param {AnalysisLoaderProps} props - Component props
 * @returns {React.Element} Analysis loader component
 */
export const AnalysisLoader = ({
  progress,
  width,
  height,
  showRecentFiles = true,
  showRecentFindings = false
}) => {
  // State for recent files
  const [recentFiles, setRecentFiles] = useState([]);
  const maxRecentFiles = 5;
  
  // Update recent files when currentFile changes
  useEffect(() => {
    if (progress.currentFile) {
      setRecentFiles(prev => {
        const updated = [progress.currentFile, ...prev.filter(f => f !== progress.currentFile)];
        return updated.slice(0, maxRecentFiles);
      });
    }
  }, [progress.currentFile]);
  
  // Format phase name
  const formatPhase = (phase) => {
    return phase
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Calculate content height
  const contentHeight = height - 4; // Account for header and footer
  
  // Get phase color
  const getPhaseColor = (phase) => {
    switch (phase) {
      case 'starting':
      case 'discovering':
        return Colors.Info;
      case 'indexing':
      case 'syntax':
      case 'quality':
        return Colors.AccentBlue;
      case 'security':
        return Colors.AccentOrange;
      case 'complexity':
      case 'performance':
        return Colors.AccentPurple;
      case 'generating_report':
        return Colors.AccentGreen;
      case 'complete':
        return Colors.Success;
      case 'canceled':
        return Colors.TextDim;
      default:
        return Colors.Primary;
    }
  };
  
  return (
    <Box 
      flexDirection="column" 
      width={width} 
      height={height}
      padding={1}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={Colors.Primary}>Analyzing Code</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text bold color={getPhaseColor(progress.phase)}>
            {formatPhase(progress.phase)}
          </Text>
        </Box>
      </Box>
      
      {/* Progress bar */}
      <Box marginBottom={1} flexDirection="column">
        <ProgressBar 
          value={progress.percentage} 
          width={width - 4}
          color={getPhaseColor(progress.phase)}
          showPercentage
        />
      </Box>
      
      {/* File counts */}
      {progress.totalFiles > 0 && (
        <Box marginBottom={1}>
          <Text color={Colors.TextDim}>Files: </Text>
          <Text color={Colors.Text}>
            {progress.filesProcessed} / {progress.totalFiles}
          </Text>
        </Box>
      )}
      
      {/* Current file */}
      {progress.currentFile && (
        <Box marginBottom={1} flexDirection="column">
          <Text color={Colors.TextDim}>Current file:</Text>
          <Text color={Colors.AccentBlue} marginLeft={2}>
            {progress.currentFile}
          </Text>
        </Box>
      )}
      
      {/* Recent files */}
      {showRecentFiles && recentFiles.length > 0 && (
        <Box flexDirection="column" marginY={1}>
          <Text color={Colors.TextDim}>Recently processed:</Text>
          <Box 
            flexDirection="column" 
            marginLeft={2} 
            marginTop={1}
            height={Math.min(recentFiles.length, contentHeight - 10)}
            overflow="hidden"
          >
            {recentFiles.map((file, index) => (
              <Text 
                key={file + index} 
                color={Colors.TextMuted}
                dimColor={index > 0}
              >
                {file}
              </Text>
            ))}
          </Box>
        </Box>
      )}
      
      {/* Recent findings - placeholder for future implementation */}
      {showRecentFindings && (
        <Box flexDirection="column" marginY={1}>
          <Text color={Colors.TextDim}>Recent findings:</Text>
          <Box marginLeft={2} marginTop={1}>
            <Text color={Colors.TextDim}>
              (Feature coming soon)
            </Text>
          </Box>
        </Box>
      )}
      
      {/* Footer */}
      <Box 
        marginTop="auto"
        borderStyle="single"
        borderColor={Colors.Border}
        paddingX={1}
        paddingY={0}
      >
        <Text color={Colors.TextDim}>
          Press <Text color={Colors.AccentBlue} bold>F6</Text> to cancel analysis
        </Text>
      </Box>
    </Box>
  );
};

export default AnalysisLoader;