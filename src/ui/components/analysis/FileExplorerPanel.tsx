/**
 * File Explorer Panel
 * 
 * Displays a hierarchical view of files and directories with quality metrics.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { DirectoryMetrics, FileMetrics, MetricCategory, FileType } from './types.js';
import { QualityScoreBadge } from './QualityScoreBadge.js';

/**
 * File explorer panel props
 */
export interface FileExplorerPanelProps {
  /**
   * Root directory metrics
   */
  rootDirectory: DirectoryMetrics;
  
  /**
   * Selected category filter
   */
  selectedCategory: MetricCategory | null;
  
  /**
   * Panel width
   */
  width?: number;
  
  /**
   * Panel height
   */
  height?: number;
  
  /**
   * Callback for file selection
   */
  onFileSelect?: (filePath: string) => void;
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
 * Get color for quality score
 */
const getQualityColor = (score: number): string => {
  if (score >= 90) return Colors.Success;
  if (score >= 80) return Colors.AccentGreen;
  if (score >= 70) return Colors.Info;
  if (score >= 60) return Colors.Warning;
  if (score >= 50) return Colors.AccentOrange;
  return Colors.Error;
};

/**
 * Directory tree node component
 */
interface DirectoryNodeProps {
  directory: DirectoryMetrics;
  depth: number;
  isExpanded: boolean;
  expandedDirs: Set<string>;
  selectedFile: string | null;
  onToggleDir: (path: string) => void;
  onSelectFile: (file: FileMetrics) => void;
  selectedCategory: MetricCategory | null;
}

const DirectoryNode: React.FC<DirectoryNodeProps> = ({
  directory,
  depth,
  isExpanded,
  expandedDirs,
  selectedFile,
  onToggleDir,
  onSelectFile,
  selectedCategory
}) => {
  // Create indent based on depth
  const indent = '  '.repeat(depth);
  
  // Filter files by selected category if any
  const filteredFiles = selectedCategory
    ? directory.files.filter(file => {
        return file.metrics[selectedCategory] !== undefined && 
               file.metrics[selectedCategory]! < 70; // Only show files that need improvement
      })
    : directory.files;
  
  // Determine if this directory should be highlighted based on selected category
  const shouldHighlight = selectedCategory && 
    directory.files.some(file => file.metrics[selectedCategory] !== undefined && 
                              file.metrics[selectedCategory]! < 70);
  
  return (
    <Box flexDirection="column">
      {/* Directory name */}
      <Box>
        <Text>
          {indent}
          <Text 
            color={shouldHighlight ? Colors.Warning : Colors.Text}
            bold={shouldHighlight}
            onClick={() => onToggleDir(directory.path)}
          >
            {isExpanded ? '▼' : '▶'} {directory.path.split('/').pop()}
          </Text>
          <Text color={Colors.TextDim}>
            {' '}({directory.fileCount} file{directory.fileCount !== 1 ? 's' : ''})
          </Text>
        </Text>
        <Box marginLeft={2}>
          <Text color={getQualityColor(directory.score)}>
            {directory.score}
          </Text>
        </Box>
      </Box>
      
      {/* Files (if expanded) */}
      {isExpanded && (
        <Box flexDirection="column">
          {filteredFiles.map(file => (
            <Box 
              key={file.path}
              marginLeft={depth + 2}
              backgroundColor={file.path === selectedFile ? Colors.DimBackground : undefined}
              onClick={() => onSelectFile(file)}
            >
              <Text>
                <Text color={getFileTypeColor(file.type)}>
                  {file.path.split('/').pop()}
                </Text>
                {file.issues > 0 && (
                  <Text color={Colors.Warning}> ({file.issues})</Text>
                )}
              </Text>
              <Box marginLeft={2}>
                <Text color={getQualityColor(file.score)}>
                  {file.score}
                </Text>
              </Box>
            </Box>
          ))}
          
          {/* Subdirectories (if expanded) */}
          {directory.directories?.map(subdir => (
            <DirectoryNode
              key={subdir.path}
              directory={subdir}
              depth={depth + 1}
              isExpanded={expandedDirs.has(subdir.path)}
              expandedDirs={expandedDirs}
              selectedFile={selectedFile}
              onToggleDir={onToggleDir}
              onSelectFile={onSelectFile}
              selectedCategory={selectedCategory}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

/**
 * File details component
 */
interface FileDetailsProps {
  file: FileMetrics;
}

const FileDetails: React.FC<FileDetailsProps> = ({ file }) => {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>
          {file.path.split('/').pop()}
        </Text>
        <Text color={getFileTypeColor(file.type)}>
          {' '}({file.type})
        </Text>
      </Box>
      
      <Box marginBottom={1}>
        <Box marginRight={2}>
          <Text color={Colors.TextDim}>
            Lines: <Text color={Colors.Text}>{file.linesOfCode}</Text>
          </Text>
        </Box>
        <Box marginRight={2}>
          <Text color={Colors.TextDim}>
            Functions: <Text color={Colors.Text}>{file.functions}</Text>
          </Text>
        </Box>
        <Box marginRight={2}>
          <Text color={Colors.TextDim}>
            Classes: <Text color={Colors.Text}>{file.classes}</Text>
          </Text>
        </Box>
        <Box marginRight={2}>
          <Text color={Colors.TextDim}>
            Complexity: <Text color={Colors.Text}>{file.complexity}</Text>
          </Text>
        </Box>
      </Box>
      
      <Box marginBottom={1}>
        <Text bold>Quality Metrics:</Text>
      </Box>
      
      <Box flexDirection="column" marginBottom={1}>
        {Object.entries(file.metrics)
          .sort(([, valueA], [, valueB]) => (valueB || 0) - (valueA || 0))
          .map(([category, value]) => (
            <Box key={category} marginBottom={0}>
              <Box width={20}>
                <Text color={Colors.TextDim}>
                  {category}:
                </Text>
              </Box>
              <Box>
                <Text color={getQualityColor(value || 0)}>
                  {value}
                </Text>
              </Box>
            </Box>
          ))}
      </Box>
      
      <Box>
        <Text color={Colors.TextDim}>
          Overall score:
        </Text>
        <Box marginLeft={1}>
          <QualityScoreBadge 
            score={file.score}
            size="small" 
            showGrade={true}
          />
        </Box>
      </Box>
    </Box>
  );
};

/**
 * File explorer panel component
 */
export const FileExplorerPanel: React.FC<FileExplorerPanelProps> = ({
  rootDirectory,
  selectedCategory,
  width = 80,
  height = 20,
  onFileSelect
}) => {
  // Track expanded directories
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set([rootDirectory.path]));
  
  // Track selected file
  const [selectedFile, setSelectedFile] = useState<FileMetrics | null>(null);
  
  // Toggle directory expansion
  const handleToggleDir = useCallback((path: string) => {
    setExpandedDirs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);
  
  // Handle file selection
  const handleSelectFile = useCallback((file: FileMetrics) => {
    setSelectedFile(prev => prev?.path === file.path ? null : file);
    if (onFileSelect) {
      onFileSelect(file.path);
    }
  }, [onFileSelect]);
  
  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Top panel with filters and info */}
      <Box 
        borderStyle="round" 
        borderColor={Colors.Secondary}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        marginBottom={1}
      >
        <Box>
          <Text bold>Repository Explorer</Text>
          
          <Box flexGrow={1} justifyContent="flex-end">
            {selectedCategory ? (
              <Box>
                <Text color={Colors.Info}>
                  Filtering by: <Text bold>{selectedCategory}</Text>
                </Text>
                <Text 
                  color={Colors.TextDim} 
                  marginLeft={1}
                  onClick={() => { /* Clear filter */ }}
                >
                  [x]
                </Text>
              </Box>
            ) : (
              <Text color={Colors.TextDim}>
                {rootDirectory.totalLinesOfCode.toLocaleString()} lines in {rootDirectory.fileCount} files
              </Text>
            )}
          </Box>
        </Box>
      </Box>
      
      <Box flexDirection="row" height={height - 10}>
        {/* File tree */}
        <Box 
          borderStyle="round" 
          borderColor={Colors.Secondary}
          paddingX={2}
          paddingY={1}
          flexDirection="column"
          width="60%"
          height="100%"
          overflowY="auto"
        >
          <DirectoryNode 
            directory={rootDirectory}
            depth={0}
            isExpanded={expandedDirs.has(rootDirectory.path)}
            expandedDirs={expandedDirs}
            selectedFile={selectedFile?.path || null}
            onToggleDir={handleToggleDir}
            onSelectFile={handleSelectFile}
            selectedCategory={selectedCategory}
          />
        </Box>
        
        {/* File details */}
        <Box 
          borderStyle="round" 
          borderColor={Colors.Secondary}
          paddingX={2}
          paddingY={1}
          flexDirection="column"
          marginLeft={1}
          flexGrow={1}
        >
          {selectedFile ? (
            <FileDetails file={selectedFile} />
          ) : (
            <Box justifyContent="center" alignItems="center" height="100%">
              <Text color={Colors.TextDim}>Select a file to view details</Text>
            </Box>
          )}
        </Box>
      </Box>
      
      {/* Legend */}
      <Box 
        borderStyle="round" 
        borderColor={Colors.Secondary}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        marginTop={1}
      >
        <Text bold marginBottom={1}>Legend</Text>
        
        <Box>
          <Box marginRight={2}>
            <Text>
              <Text color={Colors.Text}>▼</Text> Expanded directory
            </Text>
          </Box>
          <Box marginRight={2}>
            <Text>
              <Text color={Colors.Text}>▶</Text> Collapsed directory
            </Text>
          </Box>
          <Box marginRight={2}>
            <Text>
              <Text color={Colors.Warning}>(3)</Text> Issue count
            </Text>
          </Box>
          <Box flexGrow={1} justifyContent="flex-end">
            <Text color={Colors.TextDim}>
              Click on items to expand/select
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default FileExplorerPanel;