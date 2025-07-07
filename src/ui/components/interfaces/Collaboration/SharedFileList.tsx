/**
 * SharedFileList Component
 * 
 * Displays a list of shared files in a collaboration session.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { SharedFile } from './collaboration-types';

interface SharedFileListProps {
  files: SharedFile[];
  width: number;
  selectedFileId?: string;
  onSelectFile: (fileId: string) => void;
}

/**
 * Format last modified date to readable format
 */
const formatLastModified = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  }
};

export const SharedFileList: React.FC<SharedFileListProps> = ({
  files,
  width,
  selectedFileId,
  onSelectFile
}) => {
  return (
    <Box flexDirection="column" width={width} borderStyle="single" borderColor="gray">
      <Box paddingX={1} backgroundColor="blue">
        <Text bold>Shared Files ({files.length})</Text>
      </Box>
      
      <Box flexDirection="column" paddingX={1}>
        {files.length === 0 ? (
          <Text dimColor>No shared files</Text>
        ) : (
          files.map((file, index) => {
            const isSelected = file.id === selectedFileId;
            
            return (
              <Box 
                key={file.id}
                flexDirection="column"
                paddingX={1}
                paddingY={0}
                backgroundColor={isSelected ? 'blue' : undefined}
              >
                <Box>
                  <Text 
                    bold={isSelected}
                    color={isSelected ? 'white' : undefined}
                  >
                    {index + 1}. {file.name}
                  </Text>
                </Box>
                
                <Box>
                  <Text 
                    dimColor={!isSelected}
                    color={isSelected ? 'white' : undefined}
                  >
                    {file.viewerCount} viewer{file.viewerCount !== 1 ? 's' : ''} • 
                    Modified {formatLastModified(file.lastModified)}
                  </Text>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
      
      <Box paddingX={1} paddingY={0} marginTop={1}>
        <Text dimColor>Press number to select file</Text>
      </Box>
    </Box>
  );
};

export default SharedFileList;