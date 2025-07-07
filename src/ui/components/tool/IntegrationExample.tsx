/**
 * Tool Components Integration Example
 * 
 * This example demonstrates how the various tool components work together
 * in a typical tool execution flow.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import { 
  EnhancedToolMessage,
  ToolConfirmationDialog,
  CodeSearchResultVisualizer,
  ToolExecutionStatus,
  ToolResultType,
  ConfirmationType,
  TrustLevel
} from './index.js';

/**
 * Flow stage enum for the demo
 */
enum FlowStage {
  CONFIRMATION,
  RUNNING,
  RESULT
}

/**
 * Integration example component
 */
export const IntegrationExample: React.FC = () => {
  // Demo state
  const [flowStage, setFlowStage] = useState<FlowStage>(FlowStage.CONFIRMATION);
  const [progress, setProgress] = useState<number>(0);
  const [trustLevel, setTrustLevel] = useState<TrustLevel | null>(null);
  const [showCodeSearchVisualizer, setShowCodeSearchVisualizer] = useState<boolean>(false);
  
  // Tool execution demo data
  const toolData = {
    name: 'search_code',
    id: 'tool-demo-123',
    input: { 
      pattern: 'function.*\\(', 
      path: './src', 
      case_sensitive: false 
    },
    namespace: 'code',
    description: 'Searches for code patterns in files'
  };
  
  // Code search result data (same as in CodeSearchResultVisualizerExample)
  const searchResult = {
    pattern: 'function.*\\(',
    searchDir: './src',
    totalMatches: 8,
    matchedFiles: 3,
    totalFiles: 42,
    searchTime: 153,
    fileMatches: [
      {
        path: 'src/utils/helpers.js',
        matchCount: 4,
        matches: [
          {
            path: 'src/utils/helpers.js',
            lineNumber: 12,
            columnStart: 0,
            columnEnd: 17,
            line: 'function formatDate(date) {',
            beforeContext: [
              '/**',
              ' * Format a date into a string',
              ' * @param {Date} date - The date to format',
              ' * @returns {string} Formatted date string',
              ' */'
            ],
            afterContext: [
              '  const year = date.getFullYear();',
              '  const month = String(date.getMonth() + 1).padStart(2, \'0\');',
              '  const day = String(date.getDate()).padStart(2, \'0\');',
              '  return `${year}-${month}-${day}`;'
            ]
          },
          // Additional matches from CodeSearchResultVisualizerExample...
          {
            path: 'src/utils/helpers.js',
            lineNumber: 25,
            columnStart: 0,
            columnEnd: 28,
            line: 'function calculateDiscount(price, percent) {',
            beforeContext: [],
            afterContext: []
          },
          {
            path: 'src/utils/helpers.js',
            lineNumber: 38,
            columnStart: 0,
            columnEnd: 23,
            line: 'function validateEmail(email) {',
            beforeContext: [],
            afterContext: []
          },
          {
            path: 'src/utils/helpers.js',
            lineNumber: 47,
            columnStart: 0,
            columnEnd: 24,
            line: 'function debounce(func, wait) {',
            beforeContext: [],
            afterContext: []
          }
        ]
      },
      {
        path: 'src/components/Button.js',
        matchCount: 3,
        matches: [
          {
            path: 'src/components/Button.js',
            lineNumber: 15,
            columnStart: 9,
            columnEnd: 28,
            line: '  const function handleClick(event) {',
            beforeContext: [],
            afterContext: []
          },
          {
            path: 'src/components/Button.js',
            lineNumber: 32,
            columnStart: 9,
            columnEnd: 30,
            line: '  const function getButtonStyle(variant) {',
            beforeContext: [],
            afterContext: []
          },
          {
            path: 'src/components/Button.js',
            lineNumber: 53,
            columnStart: 16,
            columnEnd: 35,
            line: 'export function createButton(config) {',
            beforeContext: [],
            afterContext: []
          }
        ]
      },
      {
        path: 'src/App.js',
        matchCount: 1,
        matches: [
          {
            path: 'src/App.js',
            lineNumber: 8,
            columnStart: 16,
            columnEnd: 27,
            line: 'const function App() {',
            beforeContext: [],
            afterContext: []
          }
        ]
      }
    ]
  };
  
  // Progress simulation effect
  React.useEffect(() => {
    if (flowStage !== FlowStage.RUNNING) return;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setFlowStage(FlowStage.RESULT);
          return 100;
        }
        return prev + 5;
      });
    }, 200);
    
    return () => clearInterval(interval);
  }, [flowStage]);
  
  // Handle confirmation
  const handleConfirm = (trustLevel: TrustLevel, modifiedParams?: any) => {
    setTrustLevel(trustLevel);
    setFlowStage(FlowStage.RUNNING);
  };
  
  // Handle cancellation
  const handleCancel = () => {
    setFlowStage(FlowStage.RESULT);
    setTrustLevel(null);
  };
  
  // Handle keyboard input
  useInput((input, key) => {
    if (key.return && flowStage === FlowStage.RESULT) {
      if (showCodeSearchVisualizer) {
        // Reset the demo
        setFlowStage(FlowStage.CONFIRMATION);
        setProgress(0);
        setTrustLevel(null);
        setShowCodeSearchVisualizer(false);
      } else {
        setShowCodeSearchVisualizer(true);
      }
    }
  });
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1} padding={1} borderStyle="round" borderColor={Colors.AccentBlue}>
        <Text bold>Tool Components Integration Example</Text>
        <Text>Current Stage: {FlowStage[flowStage]}</Text>
      </Box>
      
      {/* Confirmation Stage */}
      {flowStage === FlowStage.CONFIRMATION && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold marginBottom={1}>1. Tool Confirmation Stage</Text>
          
          <ToolConfirmationDialog
            toolName={toolData.name}
            toolNamespace={toolData.namespace}
            toolDescription={toolData.description}
            parameters={toolData.input}
            confirmationType={ConfirmationType.INFO}
            terminalWidth={100}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </Box>
      )}
      
      {/* Running Stage */}
      {flowStage === FlowStage.RUNNING && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold marginBottom={1}>2. Tool Execution Stage</Text>
          
          <EnhancedToolMessage
            toolUse={{
              ...toolData,
              status: ToolExecutionStatus.RUNNING,
              metadata: {
                progress,
                message: `Searching files: ${Math.floor(progress * 0.42)} of 42 processed`,
                startTime: Date.now() - 1000
              }
            }}
            isFocused={true}
          />
        </Box>
      )}
      
      {/* Result Stage */}
      {flowStage === FlowStage.RESULT && (
        <Box flexDirection="column">
          <Text bold marginBottom={1}>3. Tool Result Stage</Text>
          
          {trustLevel === null ? (
            <EnhancedToolMessage
              toolUse={{
                ...toolData,
                status: ToolExecutionStatus.CANCELED
              }}
              isFocused={true}
            />
          ) : (
            <EnhancedToolMessage
              toolUse={{
                ...toolData,
                status: ToolExecutionStatus.SUCCESS,
                metadata: {
                  startTime: Date.now() - 3000,
                  endTime: Date.now(),
                  totalFiles: 42,
                  matchedFiles: 3,
                  totalMatches: 8
                }
              }}
              toolResult={{
                content: `Found 8 matches in 3 files (searched 42 files in 153ms)\n\nsrc/utils/helpers.js:12:function formatDate(date) {\nsrc/utils/helpers.js:25:function calculateDiscount(price, percent) {\n...`,
                isError: false,
                toolUseId: toolData.id,
                resultType: ToolResultType.TEXT,
                metadata: {
                  contentLength: 8
                }
              }}
              isFocused={true}
            />
          )}
          
          {trustLevel !== null && !showCodeSearchVisualizer && (
            <Box marginTop={1} padding={1} borderStyle="round" borderColor={Colors.TextDim}>
              <Text>Press <Text bold>Enter</Text> to show detailed results in CodeSearchResultVisualizer</Text>
            </Box>
          )}
          
          {trustLevel !== null && showCodeSearchVisualizer && (
            <Box flexDirection="column" marginTop={2}>
              <Text bold marginBottom={1}>4. Specialized Result Visualization</Text>
              
              <CodeSearchResultVisualizer
                result={searchResult}
                showContext={true}
                expandAll={false}
                width={100}
              />
              
              <Box marginTop={1} padding={1} borderStyle="round" borderColor={Colors.TextDim}>
                <Text>Press <Text bold>Enter</Text> to restart demo</Text>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default IntegrationExample;