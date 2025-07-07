/**
 * Tool Documentation Component
 * 
 * Displays detailed documentation for a tool, including parameters,
 * examples, and execution form.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../../colors.js';
import { ToolDocumentationProps, ToolParameter, ToolExample } from './types.js';
import { ToolExampleItem } from './ToolExampleItem.js';

/**
 * Highlight text with matching search terms
 */
const highlightText = (text: string, searchTerms?: string[]) => {
  if (!searchTerms || searchTerms.length === 0 || !text) {
    return <Text>{text}</Text>;
  }
  
  // Create a regex pattern that matches any of the search terms
  const pattern = new RegExp(`(${searchTerms.join('|')})`, 'gi');
  const parts = text.split(pattern);
  
  return (
    <>
      {parts.map((part, i) => {
        // Check if this part matches any of the search terms
        const isMatch = searchTerms.some(term => 
          part.toLowerCase().includes(term.toLowerCase())
        );
        
        return isMatch ? (
          <Text key={i} backgroundColor={Colors.DimBackground} color={Colors.Primary}>{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        );
      })}
    </>
  );
};

/**
 * Get type color for parameter type
 */
const getTypeColor = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'string':
      return Colors.AccentGreen;
    case 'number':
    case 'integer':
      return Colors.AccentBlue;
    case 'boolean':
      return Colors.AccentPurple;
    case 'object':
      return Colors.AccentYellow;
    case 'array':
      return Colors.AccentCyan;
    default:
      return Colors.TextMuted;
  }
};

/**
 * Tool Documentation component
 */
export const ToolDocumentation: React.FC<ToolDocumentationProps> = ({
  tool,
  width,
  searchTerms,
  executionEnabled,
  executionOptions,
  onExecute
}) => {
  // State for parameter values
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  // State for execution status
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'executing' | 'success' | 'error'>('idle');
  // State for execution result
  const [executionResult, setExecutionResult] = useState<any>(null);
  // State for expanded examples
  const [expandedExample, setExpandedExample] = useState<string | null>(null);
  
  // Handle parameter value change
  const handleParamChange = useCallback((name: string, value: any) => {
    setParamValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);
  
  // Handle tool execution
  const handleExecute = useCallback(async () => {
    if (!onExecute) return;
    
    try {
      setExecutionStatus('executing');
      const result = await onExecute(paramValues);
      setExecutionResult(result);
      setExecutionStatus('success');
    } catch (error) {
      setExecutionResult(error);
      setExecutionStatus('error');
    }
  }, [onExecute, paramValues]);
  
  // Handle example execution
  const handleExampleExecute = useCallback(async (parameters: Record<string, any>) => {
    if (!onExecute) return;
    
    try {
      setExecutionStatus('executing');
      setParamValues(parameters);
      const result = await onExecute(parameters);
      setExecutionResult(result);
      setExecutionStatus('success');
      return result;
    } catch (error) {
      setExecutionResult(error);
      setExecutionStatus('error');
      throw error;
    }
  }, [onExecute]);
  
  // Toggle example expansion
  const toggleExample = useCallback((id: string) => {
    setExpandedExample(prev => prev === id ? null : id);
  }, []);
  
  return (
    <Box 
      flexDirection="column" 
      width={width}
      borderStyle="single"
      borderColor={Colors.Border}
      paddingX={1}
      paddingY={1}
    >
      {/* Additional documentation */}
      {tool.documentation && (
        <Box flexDirection="column" marginBottom={1}>
          <Text wrap="wrap" dimColor>
            {highlightText(tool.documentation, searchTerms)}
          </Text>
        </Box>
      )}
      
      {/* Parameters */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={Colors.AccentBlue}>Parameters:</Text>
        
        {tool.parameters.length > 0 ? (
          <Box flexDirection="column" marginLeft={2} marginTop={1}>
            {tool.parameters.map((param: ToolParameter) => (
              <Box key={param.name} marginBottom={1}>
                <Box flexDirection="column">
                  <Box>
                    <Text bold>
                      {highlightText(param.name, searchTerms)}
                      {param.required && <Text color={Colors.Error}> *</Text>}
                    </Text>
                    <Box marginLeft={1}>
                      <Text color={getTypeColor(param.type)}>
                        ({param.type})
                      </Text>
                    </Box>
                    {param.defaultValue !== undefined && (
                      <Box marginLeft={1}>
                        <Text color={Colors.TextDim}>
                          default: {JSON.stringify(param.defaultValue)}
                        </Text>
                      </Box>
                    )}
                  </Box>
                  <Box marginLeft={2}>
                    <Text dimColor wrap="wrap">
                      {highlightText(param.description, searchTerms)}
                    </Text>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box marginLeft={2} marginTop={1}>
            <Text color={Colors.TextDim}>No parameters required</Text>
          </Box>
        )}
      </Box>
      
      {/* Examples */}
      {tool.examples && tool.examples.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={Colors.AccentBlue}>Examples:</Text>
          
          <Box flexDirection="column" marginLeft={1} marginTop={1}>
            {tool.examples.map((example: ToolExample, i) => (
              <Box key={example.title || `example-${i}`} marginBottom={1}>
                <ToolExampleItem
                  example={example}
                  tool={tool}
                  width={width - 3}
                  executionEnabled={executionEnabled}
                  onExecute={
                    onExecute 
                      ? (parameters) => handleExampleExecute(parameters) 
                      : undefined
                  }
                />
              </Box>
            ))}
          </Box>
        </Box>
      )}
      
      {/* Execution controls */}
      {executionEnabled && onExecute && (
        <Box flexDirection="column" marginTop={1}>
          <Box 
            borderStyle="single" 
            borderColor={Colors.Border} 
            padding={1}
          >
            <Text bold color={Colors.Primary}>Execute Tool</Text>
            <Box flexGrow={1} justifyContent="flex-end">
              <Text 
                backgroundColor={Colors.Primary} 
                color={Colors.Background}
                paddingX={1}
                onClick={handleExecute}
              >
                {executionStatus === 'executing' ? 'Running...' : 'Run'}
              </Text>
            </Box>
          </Box>
          
          {/* Execution status/result */}
          {executionStatus !== 'idle' && (
            <Box 
              flexDirection="column" 
              marginTop={1} 
              paddingX={1}
              borderStyle="single"
              borderColor={
                executionStatus === 'executing' ? Colors.Info :
                executionStatus === 'success' ? Colors.Success :
                Colors.Error
              }
            >
              <Text bold color={
                executionStatus === 'executing' ? Colors.Info :
                executionStatus === 'success' ? Colors.Success :
                Colors.Error
              }>
                {executionStatus === 'executing' ? 'Executing...' :
                 executionStatus === 'success' ? 'Success' :
                 'Error'}
              </Text>
              
              {executionStatus !== 'executing' && executionResult && (
                <Box marginTop={1} flexDirection="column">
                  <Text wrap="wrap">
                    {typeof executionResult === 'object' 
                      ? JSON.stringify(executionResult, null, 2)
                      : String(executionResult)
                    }
                  </Text>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ToolDocumentation;