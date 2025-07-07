/**
 * Analysis Interface
 * 
 * A dedicated interface for code analysis, providing a comprehensive view of
 * code quality metrics, issues, and insights with integrated tool execution.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../../colors.js';
import { CodeAnalysisDashboard, DashboardPanel } from '../../analysis/index.js';
import { CodeAnalysisResult, MetricCategory, IssueSeverity, FileType } from '../../analysis/types.js';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';
import { useCodeAnalyzer } from './hooks/useCodeAnalyzer.js';
import { CommandBar, AnalysisLoader } from './components/index.js';
import { ErrorDisplay } from '../../ErrorDisplay.js';

/**
 * Analysis mode enum
 */
export enum AnalysisMode {
  DASHBOARD = 'dashboard',
  FILE_VIEW = 'file_view',
  CONFIG = 'config'
}

/**
 * Analysis interface props
 */
export interface AnalysisInterfaceProps {
  /**
   * Terminal width for responsive layout
   */
  terminalWidth: number;
  
  /**
   * Terminal height for responsive layout
   */
  terminalHeight: number;
  
  /**
   * Current working directory
   */
  workingDirectory?: string;
  
  /**
   * Optional pre-loaded analysis result
   */
  preloadedResult?: CodeAnalysisResult;
  
  /**
   * Whether the interface is focused
   */
  isFocused?: boolean;
  
  /**
   * Callback when starting analysis
   */
  onAnalysisStart?: () => void;
  
  /**
   * Callback when analysis completes
   */
  onAnalysisComplete?: (result: CodeAnalysisResult) => void;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;
  
  /**
   * Callback when exiting the interface
   */
  onExit?: () => void;
}

/**
 * Analysis interface component
 */
export const AnalysisInterface: React.FC<AnalysisInterfaceProps> = ({
  terminalWidth,
  terminalHeight,
  workingDirectory = process.cwd(),
  preloadedResult,
  isFocused = true,
  onAnalysisStart,
  onAnalysisComplete,
  onError,
  onExit
}) => {
  // State for current mode
  const [currentMode, setCurrentMode] = useState<AnalysisMode>(AnalysisMode.DASHBOARD);
  
  // State for selected file and issue
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  
  // State for analysis configuration
  const [analysisConfig, setAnalysisConfig] = useState({
    path: workingDirectory,
    includeTests: false,
    depth: 'standard' as 'quick' | 'standard' | 'deep',
    categories: Object.values(MetricCategory),
  });
  
  // Get code analyzer hook
  const {
    analysisResult,
    isAnalyzing,
    progress,
    error,
    startAnalysis,
    cancelAnalysis
  } = useCodeAnalyzer(workingDirectory);
  
  // Keyboard navigation hook
  const { 
    handleKeyPress,
    registerKeyHandler 
  } = useKeyboardNavigation(isFocused);
  
  // Register keyboard handlers
  useEffect(() => {
    // Register key handlers
    registerKeyHandler('escape', () => {
      if (onExit) onExit();
    });
    
    registerKeyHandler('f5', () => {
      if (!isAnalyzing) {
        handleStartAnalysis();
      }
    });
    
    registerKeyHandler('f6', () => {
      if (isAnalyzing) {
        cancelAnalysis();
      }
    });
    
    registerKeyHandler('tab', () => {
      setCurrentMode(prev => {
        switch (prev) {
          case AnalysisMode.DASHBOARD:
            return AnalysisMode.FILE_VIEW;
          case AnalysisMode.FILE_VIEW:
            return AnalysisMode.CONFIG;
          case AnalysisMode.CONFIG:
          default:
            return AnalysisMode.DASHBOARD;
        }
      });
    });
    
    registerKeyHandler('d', () => {
      setCurrentMode(AnalysisMode.DASHBOARD);
    });
    
    registerKeyHandler('f', () => {
      setCurrentMode(AnalysisMode.FILE_VIEW);
    });
    
    registerKeyHandler('c', () => {
      setCurrentMode(AnalysisMode.CONFIG);
    });
  }, [isAnalyzing, registerKeyHandler]);
  
  // Initialize with preloaded result if available
  useEffect(() => {
    if (preloadedResult) {
      onAnalysisComplete?.(preloadedResult);
    }
  }, [preloadedResult, onAnalysisComplete]);
  
  // Handle start analysis
  const handleStartAnalysis = useCallback(() => {
    if (onAnalysisStart) {
      onAnalysisStart();
    }
    
    startAnalysis(analysisConfig)
      .then(result => {
        if (onAnalysisComplete) {
          onAnalysisComplete(result);
        }
      })
      .catch(err => {
        if (onError) {
          onError(err);
        }
      });
  }, [analysisConfig, startAnalysis, onAnalysisStart, onAnalysisComplete, onError]);
  
  // Handle file selection
  const handleFileSelect = useCallback((filePath: string) => {
    setSelectedFile(filePath);
    setCurrentMode(AnalysisMode.FILE_VIEW);
  }, []);
  
  // Handle issue selection
  const handleIssueSelect = useCallback((issueId: string) => {
    setSelectedIssue(issueId);
    
    // If the issue has a file path, also select that file and switch to file view
    const issue = analysisResult?.issues.find(i => i.id === issueId);
    if (issue) {
      setSelectedFile(issue.filePath);
      setCurrentMode(AnalysisMode.FILE_VIEW);
    }
  }, [analysisResult]);
  
  // Get content height
  const contentHeight = terminalHeight - 4; // Account for header and command bar
  
  // Render content based on mode
  const renderContent = () => {
    // If analyzing, show loader
    if (isAnalyzing) {
      return (
        <AnalysisLoader 
          progress={progress} 
          width={terminalWidth} 
          height={contentHeight}
        />
      );
    }
    
    // If error, show error display
    if (error) {
      return (
        <ErrorDisplay 
          error={error}
          width={terminalWidth} 
          height={contentHeight}
          onRetry={handleStartAnalysis}
          onDismiss={() => onExit?.()}
        />
      );
    }
    
    // If no analysis result, show empty state
    if (!analysisResult && !preloadedResult) {
      return (
        <Box 
          width={terminalWidth} 
          height={contentHeight} 
          justifyContent="center"
          alignItems="center"
          flexDirection="column"
        >
          <Text bold color={Colors.Primary}>Code Analysis Interface</Text>
          <Box marginY={1}>
            <Text>Press <Text color={Colors.AccentBlue} bold>F5</Text> to start analysis</Text>
          </Box>
          <Text color={Colors.TextDim}>
            Current directory: {workingDirectory}
          </Text>
        </Box>
      );
    }
    
    // If analysis result, show the appropriate mode
    const result = analysisResult || preloadedResult!;
    
    switch (currentMode) {
      case AnalysisMode.DASHBOARD:
        return (
          <CodeAnalysisDashboard
            analysisResult={result}
            width={terminalWidth}
            height={contentHeight}
            initialPanel={DashboardPanel.REPOSITORY_SUMMARY}
            onFileSelect={handleFileSelect}
            onIssueSelect={handleIssueSelect}
          />
        );
      
      case AnalysisMode.FILE_VIEW:
        return (
          <Box 
            width={terminalWidth} 
            height={contentHeight} 
            flexDirection="column"
            padding={1}
          >
            <Text bold>File View Mode</Text>
            
            {selectedFile ? (
              <Box flexDirection="column" marginTop={1}>
                <Text>
                  Selected file: <Text color={Colors.AccentBlue}>{selectedFile}</Text>
                </Text>
                
                {selectedIssue && (
                  <Box marginTop={1}>
                    <Text>
                      Selected issue: <Text color={Colors.AccentBlue}>{selectedIssue}</Text>
                    </Text>
                  </Box>
                )}
                
                <Box 
                  borderStyle="round" 
                  borderColor={Colors.Secondary}
                  marginTop={1}
                  padding={1}
                  flexGrow={1}
                >
                  <Text color={Colors.TextDim}>
                    File content viewer will be implemented in a future update.
                  </Text>
                </Box>
              </Box>
            ) : (
              <Box 
                justifyContent="center"
                alignItems="center"
                flexGrow={1}
              >
                <Text color={Colors.TextDim}>
                  Select a file from the dashboard to view it here.
                </Text>
              </Box>
            )}
          </Box>
        );
      
      case AnalysisMode.CONFIG:
        return (
          <Box 
            width={terminalWidth} 
            height={contentHeight} 
            flexDirection="column"
            padding={1}
          >
            <Text bold>Analysis Configuration</Text>
            
            <Box flexDirection="column" marginTop={1}>
              <Box marginBottom={1}>
                <Box width={15}>
                  <Text color={Colors.TextDim}>Path:</Text>
                </Box>
                <Text>{analysisConfig.path}</Text>
              </Box>
              
              <Box marginBottom={1}>
                <Box width={15}>
                  <Text color={Colors.TextDim}>Include Tests:</Text>
                </Box>
                <Text>{analysisConfig.includeTests ? 'Yes' : 'No'}</Text>
              </Box>
              
              <Box marginBottom={1}>
                <Box width={15}>
                  <Text color={Colors.TextDim}>Analysis Depth:</Text>
                </Box>
                <Text>{analysisConfig.depth}</Text>
              </Box>
              
              <Box marginBottom={1} flexDirection="column">
                <Text color={Colors.TextDim}>Categories:</Text>
                <Box marginLeft={2} marginTop={1} flexWrap="wrap">
                  {analysisConfig.categories.map(category => (
                    <Box key={category} marginRight={2} marginBottom={1}>
                      <Text>{category}</Text>
                    </Box>
                  ))}
                </Box>
              </Box>
              
              <Box marginTop={2}>
                <Text color={Colors.TextDim}>
                  Configuration editor will be implemented in a future update.
                </Text>
              </Box>
            </Box>
          </Box>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <Box 
      flexDirection="column" 
      width={terminalWidth} 
      height={terminalHeight}
      borderStyle={isFocused ? "bold" : undefined}
      borderColor={isFocused ? Colors.Primary : undefined}
    >
      {/* Header */}
      <Box 
        borderStyle="single"
        borderColor={Colors.Secondary}
        width={terminalWidth}
        paddingX={1}
        backgroundColor={Colors.BackgroundAlt}
      >
        <Text bold color={Colors.Primary}>Code Analysis</Text>
        
        <Box marginLeft={2}>
          <Text 
            color={currentMode === AnalysisMode.DASHBOARD ? Colors.Primary : Colors.TextDim}
            bold={currentMode === AnalysisMode.DASHBOARD}
            underline
            onClick={() => setCurrentMode(AnalysisMode.DASHBOARD)}
          >
            Dashboard
          </Text>
        </Box>
        
        <Box marginLeft={2}>
          <Text 
            color={currentMode === AnalysisMode.FILE_VIEW ? Colors.Primary : Colors.TextDim}
            bold={currentMode === AnalysisMode.FILE_VIEW}
            underline
            onClick={() => setCurrentMode(AnalysisMode.FILE_VIEW)}
          >
            File View
          </Text>
        </Box>
        
        <Box marginLeft={2}>
          <Text 
            color={currentMode === AnalysisMode.CONFIG ? Colors.Primary : Colors.TextDim}
            bold={currentMode === AnalysisMode.CONFIG}
            underline
            onClick={() => setCurrentMode(AnalysisMode.CONFIG)}
          >
            Configuration
          </Text>
        </Box>
        
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={Colors.TextDim}>
            {isAnalyzing ? 'Analyzing...' : (analysisResult ? 'Analysis Complete' : 'Ready')}
          </Text>
        </Box>
      </Box>
      
      {/* Main content */}
      {renderContent()}
      
      {/* Command bar */}
      <CommandBar 
        commands={[
          { key: 'F5', label: 'Start Analysis', isEnabled: !isAnalyzing, action: handleStartAnalysis },
          { key: 'F6', label: 'Cancel', isEnabled: isAnalyzing, action: cancelAnalysis },
          { key: 'Tab', label: 'Switch Mode', isEnabled: true },
          { key: 'Esc', label: 'Exit', isEnabled: true, action: onExit }
        ]}
        width={terminalWidth}
      />
    </Box>
  );
};

export default AnalysisInterface;