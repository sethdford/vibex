/**
 * Metadata Panel Component
 * 
 * Displays detailed metadata about an image file.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { MetadataPanelProps } from './types.js';
import { formatFileSize } from './utils.js';

/**
 * Metadata Panel Component
 */
export const MetadataPanel: React.FC<MetadataPanelProps> = ({
  metadata,
  width
}) => {
  // Format date for display
  const formatDate = (date?: Date): string => {
    if (!date) return 'Unknown';
    
    try {
      return date.toLocaleString();
    } catch {
      return date.toString();
    }
  };
  
  return (
    <Box 
      flexDirection="column" 
      width={width}
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text bold color={Colors.Primary}>Image Metadata</Text>
      </Box>
      
      <Box flexDirection="column">
        {/* Basic metadata */}
        <Box marginBottom={1} flexDirection="column">
          <Box>
            <Box width={15}>
              <Text color={Colors.TextDim}>Format:</Text>
            </Box>
            <Text>{metadata.format.toUpperCase()}</Text>
          </Box>
          
          <Box>
            <Box width={15}>
              <Text color={Colors.TextDim}>Dimensions:</Text>
            </Box>
            <Text>{metadata.size.width} × {metadata.size.height} pixels</Text>
          </Box>
          
          <Box>
            <Box width={15}>
              <Text color={Colors.TextDim}>File size:</Text>
            </Box>
            <Text>{formatFileSize(metadata.fileSize)}</Text>
          </Box>
          
          <Box>
            <Box width={15}>
              <Text color={Colors.TextDim}>Date:</Text>
            </Box>
            <Text>{formatDate(metadata.date)}</Text>
          </Box>
        </Box>
        
        {/* Additional metadata - Extension point for EXIF, etc. */}
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color={Colors.Secondary}>Additional Metadata</Text>
          </Box>
          
          {/* Display any additional metadata fields */}
          {Object.entries(metadata)
            .filter(([key]) => !['size', 'fileSize', 'format', 'date'].includes(key))
            .map(([key, value]) => (
              <Box key={key}>
                <Box width={15}>
                  <Text color={Colors.TextDim}>{key}:</Text>
                </Box>
                <Text>
                  {typeof value === 'object' 
                    ? JSON.stringify(value) 
                    : String(value)}
                </Text>
              </Box>
            ))}
            
          {/* Placeholder for when no additional metadata is available */}
          {Object.keys(metadata).filter(key => 
            !['size', 'fileSize', 'format', 'date'].includes(key)
          ).length === 0 && (
            <Box>
              <Text color={Colors.TextDim}>
                No additional metadata available
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MetadataPanel;