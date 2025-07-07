/**
 * Shared File List Component
 * 
 * Displays a list of shared files in the collaboration session
 * with selection and interaction capabilities.
 */

import React, { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { Colors } from '../../colors.js';
import { SharedFileListProps, SharedFile } from './types.js';

/**
 * Format file size
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format time ago
 */
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

/**
 * Get file type color
 */
const getFileTypeColor = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'javascript':
    case 'js':
      return '#F0DB4F';
    case 'typescript':
    case 'ts':
      return '#3178C6';
    case 'react':
    case 'jsx':
    case 'tsx':
      return '#61DAFB';
    case 'html':
      return '#E44D26';
    case 'css':
      return '#264DE4';
    case 'python':
    case 'py':
      return '#3776AB';
    case 'json':
      return '#000000';
    case 'markdown':
    case 'md':
      return '#083fa1';
    default:
      return Colors.TextMuted;
  }
};

/**
 * File filter options
 */
type FileFilter = 'all' | 'code' | 'docs' | 'mine' | 'editing';

/**
 * File sort options
 */
type FileSort = 'name' | 'modified' | 'size' | 'type';

/**
 * Shared File List Component
 */
export const SharedFileList: React.FC<SharedFileListProps> = ({
  files,
  currentUserId,
  width,
  isFocused = true,
  onFileSelect,
  onFileShare
}) => {
  // State for selected file index
  const [selectedIndex, setSelectedIndex] = useState(0);
  // State for filter
  const [filter, setFilter] = useState<FileFilter>('all');
  // State for sort
  const [sort, setSort] = useState<FileSort>('modified');
  
  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    // Apply filter
    let filtered = files;
    
    if (filter === 'code') {
      filtered = files.filter(file => 
        ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'php'].includes(
          file.type.toLowerCase()
        )
      );
    } else if (filter === 'docs') {
      filtered = files.filter(file => 
        ['md', 'txt', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(
          file.type.toLowerCase()
        )
      );
    } else if (filter === 'mine') {
      filtered = files.filter(file => file.ownerId === currentUserId);
    } else if (filter === 'editing') {
      filtered = files.filter(file => file.editors?.includes(currentUserId));
    }
    
    // Apply sort
    let sorted = [...filtered];
    
    if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'modified') {
      sorted.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    } else if (sort === 'size') {
      sorted.sort((a, b) => b.size - a.size);
    } else if (sort === 'type') {
      sorted.sort((a, b) => a.type.localeCompare(b.type));
    }
    
    return sorted;
  }, [files, filter, sort, currentUserId]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Navigate files
    if (key.upArrow) {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      return;
    }
    
    if (key.downArrow) {
      setSelectedIndex(prev => 
        (prev < filteredAndSortedFiles.length - 1 ? prev + 1 : prev)
      );
      return;
    }
    
    // Change filter
    if (input === 'f') {
      // Cycle through filters
      setFilter(prev => {
        const filters: FileFilter[] = ['all', 'code', 'docs', 'mine', 'editing'];
        const currentIndex = filters.indexOf(prev);
        const nextIndex = (currentIndex + 1) % filters.length;
        return filters[nextIndex];
      });
      setSelectedIndex(0); // Reset selection
      return;
    }
    
    // Change sort
    if (input === 's') {
      // Cycle through sorts
      setSort(prev => {
        const sorts: FileSort[] = ['name', 'modified', 'size', 'type'];
        const currentIndex = sorts.indexOf(prev);
        const nextIndex = (currentIndex + 1) % sorts.length;
        return sorts[nextIndex];
      });
      setSelectedIndex(0); // Reset selection
      return;
    }
    
    // Select file
    if (key.return && onFileSelect && filteredAndSortedFiles.length > 0) {
      const selectedFile = filteredAndSortedFiles[selectedIndex];
      onFileSelect(selectedFile);
      return;
    }
    
    // Add file (placeholder, would integrate with file picker)
    if (input === 'a' && onFileShare) {
      // In a real implementation, this would open a file picker
      // For now, we'll just create a mock file
      const newFile: Partial<SharedFile> = {
        name: `New File ${files.length + 1}.txt`,
        path: `/shared/new-file-${files.length + 1}.txt`,
        type: 'text',
        size: 1024,
        content: 'This is a new shared file.',
        ownerId: currentUserId
      };
      
      onFileShare(newFile);
      return;
    }
  }, { isActive: isFocused });
  
  return (
    <Box flexDirection="column" width={width} padding={1}>
      <Box>
        <Text bold color={Colors.Primary}>
          Files ({filteredAndSortedFiles.length})
        </Text>
        
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={Colors.TextDim}>
            Filter: <Text color={Colors.AccentBlue}>{filter}</Text> (F)
          </Text>
          <Text color={Colors.TextDim}> | </Text>
          <Text color={Colors.TextDim}>
            Sort: <Text color={Colors.AccentBlue}>{sort}</Text> (S)
          </Text>
        </Box>
      </Box>
      
      <Box flexDirection="column" marginTop={1}>
        {filteredAndSortedFiles.length > 0 ? (
          filteredAndSortedFiles.map((file, index) => {
            const isSelected = index === selectedIndex;
            const isOwner = file.ownerId === currentUserId;
            const isEditor = file.editors?.includes(currentUserId) || false;
            const isViewer = file.viewers?.includes(currentUserId) || false;
            
            return (
              <Box
                key={file.id}
                flexDirection="column"
                paddingX={1}
                paddingY={0}
                backgroundColor={isSelected ? Colors.DimBackground : undefined}
                borderStyle={isSelected ? "single" : undefined}
                borderColor={isSelected ? Colors.Border : undefined}
                marginBottom={1}
              >
                <Box>
                  <Text color={getFileTypeColor(file.type)} marginRight={1}>
                    {file.type}
                  </Text>
                  
                  <Text bold={isSelected}>
                    {file.name}
                  </Text>
                  
                  {isOwner && (
                    <Text color={Colors.AccentPurple} marginLeft={1}>
                      (Owner)
                    </Text>
                  )}
                  
                  {!isOwner && isEditor && (
                    <Text color={Colors.AccentBlue} marginLeft={1}>
                      (Editor)
                    </Text>
                  )}
                  
                  {file.readOnly && (
                    <Text color={Colors.TextDim} marginLeft={1}>
                      (Read-only)
                    </Text>
                  )}
                </Box>
                
                {isSelected && (
                  <Box flexDirection="column" marginTop={1} marginLeft={2}>
                    <Box>
                      <Text color={Colors.TextDim}>Size: </Text>
                      <Text>{formatFileSize(file.size)}</Text>
                    </Box>
                    
                    <Box>
                      <Text color={Colors.TextDim}>Modified: </Text>
                      <Text>{formatTimeAgo(file.lastModified)}</Text>
                    </Box>
                    
                    <Box>
                      <Text color={Colors.TextDim}>Path: </Text>
                      <Text>{file.path}</Text>
                    </Box>
                    
                    {file.comments && file.comments.length > 0 && (
                      <Box>
                        <Text color={Colors.TextDim}>Comments: </Text>
                        <Text>{file.comments.length}</Text>
                      </Box>
                    )}
                    
                    {file.editors && file.editors.length > 0 && (
                      <Box>
                        <Text color={Colors.TextDim}>Editors: </Text>
                        <Text>{file.editors.length}</Text>
                      </Box>
                    )}
                    
                    {file.viewers && file.viewers.length > 0 && (
                      <Box>
                        <Text color={Colors.TextDim}>Viewers: </Text>
                        <Text>{file.viewers.length}</Text>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            );
          })
        ) : (
          <Box
            borderStyle="single"
            borderColor={Colors.Border}
            padding={1}
            justifyContent="center"
          >
            <Text color={Colors.TextDim}>No files found</Text>
          </Box>
        )}
      </Box>
      
      {/* Add file button */}
      {isFocused && onFileShare && (
        <Box marginTop={1} justifyContent="center">
          <Text
            backgroundColor={Colors.Primary}
            color={Colors.Background}
            paddingX={2}
            paddingY={0}
          >
            Add File (A)
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default SharedFileList;