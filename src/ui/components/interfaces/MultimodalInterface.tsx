/**
 * Multimodal Interface Component - Clean Architecture like Gemini CLI
 * 
 * Single responsibility: Media content handling (images, audio, video, documents)
 * Extracted from ModernInterface.tsx monolith
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { MultimodalContent, MediaType, InterfaceTheme } from '../types/interface-types.js';

/**
 * Multimodal interface props
 */
export interface MultimodalInterfaceProps {
  terminalWidth: number;
  terminalHeight: number;
  multimodalContent: MultimodalContent[];
  uploadProgress?: Record<string, number>;
  theme?: InterfaceTheme;
  onContentUpload?: (content: MultimodalContent) => void;
}

/**
 * Get media icon for different content types
 */
const getMediaIcon = (type: MediaType): string => {
  switch (type) {
    case MediaType.IMAGE: return '🖼️';
    case MediaType.AUDIO: return '🎵';
    case MediaType.VIDEO: return '🎬';
    case MediaType.DOCUMENT: return '📄';
    case MediaType.CODE: return '💻';
    case MediaType.TEXT: return '📝';
    default: return '📎';
  }
};

/**
 * Format file size
 */
const formatFileSize = (size?: number): string => {
  if (!size) return '';
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
  return `${Math.round(size / (1024 * 1024))}MB`;
};

/**
 * Multimodal interface component - focused on media content only
 */
export const MultimodalInterface: React.FC<MultimodalInterfaceProps> = ({
  terminalWidth,
  terminalHeight,
  multimodalContent,
  uploadProgress = {},
  theme = {
    primary: Colors.Primary,
    secondary: Colors.Secondary,
    accent: Colors.AccentBlue,
    background: Colors.Background,
    text: Colors.Text,
    thinking: Colors.AccentPurple,
    response: Colors.Text,
    muted: Colors.TextMuted,
    error: Colors.Error,
    success: Colors.Success,
    warning: Colors.Warning
  },
  onContentUpload,
}) => {
  return (
    <Box flexDirection="column" height={terminalHeight - 4}>
      {/* Header */}
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1}>
        <Text color={theme.accent}>🎭 Multimodal Mode</Text>
        <Text color={theme.text} dimColor> • Images • Audio • Video • Documents</Text>
      </Box>
      
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {multimodalContent.length === 0 ? (
          <Box justifyContent="center" alignItems="center" height="100%">
            <Text color={theme.secondary}>Drop files here or paste content...</Text>
          </Box>
        ) : (
          multimodalContent.map(content => (
            <Box 
              key={content.id} 
              borderStyle="round" 
              borderColor={theme.secondary}
              paddingX={1}
              marginY={0}
            >
              <Box flexDirection="column">
                <Box justifyContent="space-between">
                  <Text color={theme.accent}>
                    {getMediaIcon(content.type)} {content.metadata?.filename || content.type}
                  </Text>
                  <Text color={theme.text} dimColor>
                    {formatFileSize(content.metadata?.size)}
                  </Text>
                </Box>
                
                {content.processing && (
                  <Box marginTop={1}>
                    <Text color={theme.secondary}>
                      Status: {content.processing.status} 
                      {content.processing.progress && ` (${content.processing.progress}%)`}
                    </Text>
                    {uploadProgress[content.id] !== undefined && (
                      <Text color={theme.accent}>
                        Upload: {uploadProgress[content.id]}%
                      </Text>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default MultimodalInterface; 