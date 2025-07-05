/**
 * Error Display Component
 * 
 * A component for displaying errors with stack traces, contextual information,
 * and suggestions for resolution.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { UserError, ErrorCategory, ErrorLevel } from '../../errors/types.js';

interface ErrorDisplayProps {
  /**
   * The error to display
   */
  error: Error | UserError | string;
  
  /**
   * Show the full stack trace
   */
  showStackTrace?: boolean;
  
  /**
   * Show suggestions for fixing the error
   */
  showSuggestions?: boolean;
  
  /**
   * Additional context about the error
   */
  context?: {
    component?: string;
    action?: string;
    file?: string;
    line?: number;
    module?: string;
    category?: ErrorCategory;
    level?: ErrorLevel;
  };
  
  /**
   * Automatic suggestions for fixing the error
   */
  suggestions?: string[];
  
  /**
   * Resolution steps for the error
   */
  resolution?: string | string[];
  
  /**
   * Callback for when a suggestion is selected
   */
  onSuggestionSelect?: (suggestion: string, index: number) => void;
}

/**
 * Formats a stack trace for better readability by highlighting files,
 * line numbers, and function names
 */
const formatStackTrace = (stack: string): React.ReactElement[] => {
  const lines = stack.split('\n');
  return lines.map((line, index) => {
    // Highlight file paths, line numbers, and function names
    const filePathMatch = line.match(/(at\s+)(.+)(\s+\()(.+):(\d+):(\d+)(\))/);
    if (filePathMatch) {
      const [, prefix, fnName, spaceParen, filePath, lineNum, colNum, closeParen] = filePathMatch;
      return (
        <Box key={index}>
          <Text color={Colors.TextDim}>{prefix}</Text>
          <Text bold color={Colors.Primary}>{fnName}</Text>
          <Text color={Colors.TextDim}>{spaceParen}</Text>
          <Text color={Colors.Info}>{filePath}</Text>
          <Text color={Colors.TextDim}>:</Text>
          <Text color={Colors.Warning}>{lineNum}</Text>
          <Text color={Colors.TextDim}>:{colNum}{closeParen}</Text>
        </Box>
      );
    }
    
    return (
      <Box key={index}>
        <Text color={Colors.TextDim}>{line}</Text>
      </Box>
    );
  });
};

/**
 * Error display component
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  showStackTrace = false,
  showSuggestions = true,
  context = {},
  suggestions = [],
  resolution,
  onSuggestionSelect
}) => {
  const [expanded, setExpanded] = useState(showStackTrace);
  
  // Normalize error to string and get stack trace
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack || '' : '';
  
  // Extract UserError specific properties if available
  const isUserError = error instanceof UserError;
  const errorCategory = isUserError ? error.category : context.category;
  const errorLevel = isUserError ? error.level : context.level;
  const errorResolution = isUserError ? error.resolution : resolution;
  
  // Determine border color based on error level
  const getBorderColor = () => {
    if (errorLevel === ErrorLevel.CRITICAL) {return Colors.Error;}
    if (errorLevel === ErrorLevel.MAJOR) {return Colors.Warning;}
    if (errorLevel === ErrorLevel.MINOR) {return Colors.Info;}
    return Colors.Error; // Default
  };
  
  // Get a readable category name
  const getCategoryName = () => {
    if (errorCategory === undefined) {return '';}
    return ErrorCategory[errorCategory]?.replace(/_/g, ' ').toLowerCase() || '';
  };
  
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={getBorderColor()} padding={1}>
      {/* Error Header */}
      <Box>
        <Text bold color={Colors.Error}>Error: </Text>
        <Text bold>{errorMessage}</Text>
      </Box>
      
      {/* Error Category */}
      {errorCategory !== undefined && (
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>Category: </Text>
          <Text color={Colors.Primary}>{getCategoryName()}</Text>
        </Box>
      )}
      
      {/* Context Information */}
      {Object.keys(context).length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={Colors.TextDim}>Context:</Text>
          {context.component && (
            <Box marginLeft={2}>
              <Text color={Colors.TextDim}>Component: </Text>
              <Text>{context.component}</Text>
            </Box>
          )}
          {context.action && (
            <Box marginLeft={2}>
              <Text color={Colors.TextDim}>Action: </Text>
              <Text>{context.action}</Text>
            </Box>
          )}
          {context.file && (
            <Box marginLeft={2}>
              <Text color={Colors.TextDim}>File: </Text>
              <Text color={Colors.Info}>{context.file}</Text>
              {context.line && (
                <>
                  <Text color={Colors.TextDim}>:</Text>
                  <Text color={Colors.Warning}>{context.line}</Text>
                </>
              )}
            </Box>
          )}
          {context.module && (
            <Box marginLeft={2}>
              <Text color={Colors.TextDim}>Module: </Text>
              <Text>{context.module}</Text>
            </Box>
          )}
        </Box>
      )}
      
      {/* Stack Trace Toggle */}
      {stackTrace && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text 
              color={Colors.Info}
              bold
            >
              {expanded ? '▼ Hide Stack Trace' : '▶ Show Stack Trace'}
            </Text>
          </Box>
          
          {/* Stack Trace Content */}
          {expanded && (
            <Box flexDirection="column" marginTop={1}>
              {formatStackTrace(stackTrace)}
            </Box>
          )}
        </Box>
      )}
      
      {/* Resolution Steps */}
      {errorResolution && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={Colors.Success}>To resolve this issue:</Text>
          {Array.isArray(errorResolution) ? (
            errorResolution.map((step, index) => (
              <Box key={index} marginLeft={2}>
                <Text color={Colors.Primary}>•</Text>
                <Box marginLeft={1}>
                  <Text>{step}</Text>
                </Box>
              </Box>
            ))
          ) : (
            <Box marginLeft={2}>
              <Text color={Colors.Primary}>•</Text>
              <Box marginLeft={1}>
                <Text>{errorResolution}</Text>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={Colors.Success}>Suggestions:</Text>
          {suggestions.map((suggestion, index) => (
            <Box key={index} marginLeft={2}>
              <Text color={Colors.Primary}>•</Text>
              <Box marginLeft={1}>
                <Text>{suggestion}</Text>
                {onSuggestionSelect && (
                  <Text color={Colors.Info}>
                    {' '}[Apply]
                  </Text>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ErrorDisplay;