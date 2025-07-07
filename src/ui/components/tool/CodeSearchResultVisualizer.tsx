/**
 * Code Search Result Visualizer Component
 * 
 * A specialized component for visualizing code search results
 * from tools like RipgrepTool with syntax highlighting and context.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

/**
 * Code match interface
 */
export interface CodeMatch {
  /**
   * Path to the file
   */
  path: string;
  
  /**
   * Line number of the match
   */
  lineNumber: number;
  
  /**
   * Column number of the match start
   */
  columnStart: number;
  
  /**
   * Column number of the match end
   */
  columnEnd: number;
  
  /**
   * Line content with the match
   */
  line: string;
  
  /**
   * Context lines before the match
   */
  beforeContext?: string[];
  
  /**
   * Context lines after the match
   */
  afterContext?: string[];
  
  /**
   * Match groups (if regex was used)
   */
  groups?: string[];
}

/**
 * Code search result interface
 */
export interface CodeSearchResult {
  /**
   * Original search pattern
   */
  pattern: string;
  
  /**
   * Search directory
   */
  searchDir?: string;
  
  /**
   * Total number of matches
   */
  totalMatches: number;
  
  /**
   * Total number of files with matches
   */
  matchedFiles: number;
  
  /**
   * Total files searched
   */
  totalFiles?: number;
  
  /**
   * Search time in milliseconds
   */
  searchTime?: number;
  
  /**
   * Whether the search was case sensitive
   */
  caseSensitive?: boolean;
  
  /**
   * Grouped matches by file
   */
  fileMatches: {
    /**
     * File path
     */
    path: string;
    
    /**
     * Number of matches in this file
     */
    matchCount: number;
    
    /**
     * Matches in this file
     */
    matches: CodeMatch[];
  }[];
}

/**
 * File match component props
 */
interface FileMatchProps {
  /**
   * File path
   */
  path: string;
  
  /**
   * Match count
   */
  matchCount: number;
  
  /**
   * Matches in this file
   */
  matches: CodeMatch[];
  
  /**
   * Whether the file is expanded
   */
  isExpanded: boolean;
  
  /**
   * Callback when toggling expansion
   */
  onToggle: () => void;
  
  /**
   * Whether to show context lines
   */
  showContext: boolean;
  
  /**
   * Search pattern for highlighting
   */
  pattern: string;
  
  /**
   * Width constraint for rendering
   */
  width?: number;
}

/**
 * File match component
 */
const FileMatch: React.FC<FileMatchProps> = ({
  path,
  matchCount,
  matches,
  isExpanded,
  onToggle,
  showContext,
  pattern,
  width = 80,
}) => {
  // Extract filename from path
  const filename = path.split('/').pop() || path;
  
  // Determine path display
  const pathDisplay = width < 60 
    ? filename 
    : path;
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* File header */}
      <Box>
        <Text 
          color={Colors.AccentBlue} 
          bold 
          underline 
          dimColor={!isExpanded}
          onClick={onToggle}
        >
          {pathDisplay}
        </Text>
        <Box marginLeft={1}>
          <Text color={Colors.TextDim}>
            ({matchCount} {matchCount === 1 ? 'match' : 'matches'})
          </Text>
        </Box>
        <Box marginLeft={1}>
          <Text color={Colors.TextDim} italic>
            [{isExpanded ? 'collapse' : 'expand'}]
          </Text>
        </Box>
      </Box>
      
      {/* Match details */}
      {isExpanded && (
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          {matches.map((match, index) => (
            <Box key={index} flexDirection="column" marginBottom={1}>
              {/* Line number and info */}
              <Box>
                <Text color={Colors.TextMuted}>
                  {match.lineNumber}:
                </Text>
              </Box>
              
              {/* Context before */}
              {showContext && match.beforeContext && match.beforeContext.map((line, i) => (
                <Box key={`before-${i}`}>
                  <Box width={5} marginRight={1}>
                    <Text color={Colors.TextDim}>
                      {match.lineNumber - match.beforeContext!.length + i}
                    </Text>
                  </Box>
                  <Text color={Colors.TextDim}>{line}</Text>
                </Box>
              ))}
              
              {/* Match line */}
              <Box>
                <Box width={5} marginRight={1}>
                  <Text color={Colors.Secondary} bold>
                    {match.lineNumber}
                  </Text>
                </Box>
                
                {/* Highlight the matched part */}
                <Text>
                  {match.line.substring(0, match.columnStart)}
                  <Text backgroundColor={Colors.AccentBlue} color={Colors.Text} bold>
                    {match.line.substring(match.columnStart, match.columnEnd)}
                  </Text>
                  {match.line.substring(match.columnEnd)}
                </Text>
              </Box>
              
              {/* Context after */}
              {showContext && match.afterContext && match.afterContext.map((line, i) => (
                <Box key={`after-${i}`}>
                  <Box width={5} marginRight={1}>
                    <Text color={Colors.TextDim}>
                      {match.lineNumber + i + 1}
                    </Text>
                  </Box>
                  <Text color={Colors.TextDim}>{line}</Text>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

/**
 * Code search result visualizer props
 */
export interface CodeSearchResultVisualizerProps {
  /**
   * Search result
   */
  result: CodeSearchResult;
  
  /**
   * Whether to expand all files by default
   */
  expandAll?: boolean;
  
  /**
   * Whether to show context lines
   */
  showContext?: boolean;
  
  /**
   * Maximum files to show
   */
  maxFiles?: number;
  
  /**
   * Maximum matches per file to show
   */
  maxMatchesPerFile?: number;
  
  /**
   * Width constraint for rendering
   */
  width?: number;
}

/**
 * Code search result visualizer component
 */
export const CodeSearchResultVisualizer: React.FC<CodeSearchResultVisualizerProps> = ({
  result,
  expandAll = false,
  showContext = true,
  maxFiles = 0,
  maxMatchesPerFile = 0,
  width = 80,
}) => {
  // State to track expanded files
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    new Set(expandAll ? result.fileMatches.map(f => f.path) : [])
  );
  
  // Toggle file expansion
  const toggleFile = useCallback((path: string) => {
    setExpandedFiles(current => {
      const newSet = new Set(current);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);
  
  // Expand all files
  const handleExpandAll = useCallback(() => {
    setExpandedFiles(new Set(result.fileMatches.map(f => f.path)));
  }, [result.fileMatches]);
  
  // Collapse all files
  const handleCollapseAll = useCallback(() => {
    setExpandedFiles(new Set());
  }, []);
  
  // Filter file matches based on maxFiles
  const displayedFileMatches = useMemo(() => {
    if (maxFiles <= 0 || result.fileMatches.length <= maxFiles) {
      return result.fileMatches;
    }
    
    return result.fileMatches.slice(0, maxFiles);
  }, [result.fileMatches, maxFiles]);
  
  // Process match limits per file
  const limitedFileMatches = useMemo(() => {
    if (maxMatchesPerFile <= 0) {
      return displayedFileMatches;
    }
    
    return displayedFileMatches.map(fileMatch => ({
      ...fileMatch,
      matches: fileMatch.matches.slice(0, maxMatchesPerFile),
      hasMoreMatches: fileMatch.matches.length > maxMatchesPerFile,
    }));
  }, [displayedFileMatches, maxMatchesPerFile]);
  
  return (
    <Box flexDirection="column">
      {/* Summary header */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold>
            Search: 
          </Text>
          <Text color={Colors.AccentBlue} bold>
            {' '}{result.pattern}
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.TextDim}>
            {result.totalMatches} {result.totalMatches === 1 ? 'match' : 'matches'} in {result.matchedFiles} {result.matchedFiles === 1 ? 'file' : 'files'}
            {result.totalFiles ? ` (searched ${result.totalFiles} files)` : ''}
            {result.searchTime ? ` in ${result.searchTime}ms` : ''}
          </Text>
        </Box>
      </Box>
      
      {/* Controls */}
      <Box marginBottom={1}>
        <Box marginRight={2}>
          <Text color={Colors.AccentBlue} underline onClick={handleExpandAll}>
            [Expand All]
          </Text>
        </Box>
        <Box marginRight={2}>
          <Text color={Colors.AccentBlue} underline onClick={handleCollapseAll}>
            [Collapse All]
          </Text>
        </Box>
      </Box>
      
      {/* File matches */}
      <Box flexDirection="column">
        {limitedFileMatches.map((fileMatch) => (
          <FileMatch
            key={fileMatch.path}
            path={fileMatch.path}
            matchCount={fileMatch.matchCount}
            matches={fileMatch.matches}
            isExpanded={expandedFiles.has(fileMatch.path)}
            onToggle={() => toggleFile(fileMatch.path)}
            showContext={showContext}
            pattern={result.pattern}
            width={width}
          />
        ))}
      </Box>
      
      {/* Show message if results are limited */}
      {maxFiles > 0 && result.fileMatches.length > maxFiles && (
        <Box marginTop={1}>
          <Text color={Colors.TextDim} italic>
            Showing {maxFiles} of {result.fileMatches.length} files with matches
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Utility function to parse ripgrep output into a CodeSearchResult
 */
export function parseRipgrepOutput(
  output: string,
  pattern: string,
  searchDir?: string,
  startTime?: number,
  endTime?: number
): CodeSearchResult {
  // Initialize result structure
  const result: CodeSearchResult = {
    pattern,
    searchDir,
    totalMatches: 0,
    matchedFiles: 0,
    searchTime: startTime && endTime ? endTime - startTime : undefined,
    fileMatches: [],
  };
  
  // Skip empty output
  if (!output || output.trim().length === 0) {
    return result;
  }
  
  // Parse the output lines
  const lines = output.split('\n');
  let currentFilePath: string | null = null;
  let currentFileMatches: CodeMatch[] = [];
  
  for (const line of lines) {
    // Skip empty lines
    if (line.trim().length === 0) continue;
    
    // File path lines usually start with the path followed by a colon
    const filePathMatch = line.match(/^([^:]+):/);
    
    if (filePathMatch) {
      // New file detected
      if (currentFilePath && currentFileMatches.length > 0) {
        // Save the previous file's matches
        result.fileMatches.push({
          path: currentFilePath,
          matchCount: currentFileMatches.length,
          matches: [...currentFileMatches],
        });
        result.matchedFiles++;
        result.totalMatches += currentFileMatches.length;
        currentFileMatches = [];
      }
      
      // Parse the new file line
      const lineMatch = line.match(/^([^:]+):(\d+):(\d+):(.*)/);
      if (lineMatch) {
        currentFilePath = lineMatch[1];
        const lineNumber = parseInt(lineMatch[2], 10);
        const columnStart = parseInt(lineMatch[3], 10);
        const lineContent = lineMatch[4];
        
        // Estimate end column - would need a more sophisticated approach for accurate matching
        const columnEnd = Math.min(
          columnStart + pattern.length,
          lineContent.length
        );
        
        currentFileMatches.push({
          path: currentFilePath,
          lineNumber,
          columnStart,
          columnEnd,
          line: lineContent,
          beforeContext: [],
          afterContext: [],
        });
      }
    } else if (currentFilePath && line.match(/^\d+[-:]/)) {
      // This is a line number reference for context or another match in the same file
      const lineMatch = line.match(/^(\d+)[-:](\d+)?[-:]?(.*)/);
      if (lineMatch) {
        const lineNumber = parseInt(lineMatch[1], 10);
        const columnStart = lineMatch[2] ? parseInt(lineMatch[2], 10) : 0;
        const lineContent = lineMatch[3];
        
        // Estimate end column
        const columnEnd = Math.min(
          columnStart + pattern.length,
          lineContent.length
        );
        
        currentFileMatches.push({
          path: currentFilePath,
          lineNumber,
          columnStart,
          columnEnd,
          line: lineContent,
          beforeContext: [],
          afterContext: [],
        });
      }
    }
  }
  
  // Add the last file's matches if any
  if (currentFilePath && currentFileMatches.length > 0) {
    result.fileMatches.push({
      path: currentFilePath,
      matchCount: currentFileMatches.length,
      matches: currentFileMatches,
    });
    result.matchedFiles++;
    result.totalMatches += currentFileMatches.length;
  }
  
  return result;
}

export default CodeSearchResultVisualizer;