/**
 * Content List View - Clean Architecture like Gemini CLI
 * 
 * Focused component for displaying content items list
 */

import React from 'react';
import { Box, Text } from 'ink';
import path from 'path';
import { ContentDisplayService } from './ContentDisplayService.js';
import { 
  MultimodalTheme, 
  MultimodalContentItem, 
  ProcessingStatus 
} from './types.js';

interface ContentListViewProps {
  contentItems: MultimodalContentItem[];
  selectedItems: Set<string>;
  processingFiles: Set<string>;
  showAnalysis: boolean;
  viewMode: 'list' | 'grid' | 'details';
  displayService: ContentDisplayService;
  theme: MultimodalTheme;
  terminalWidth: number;
  terminalHeight: number;
  onItemInteraction: (contentId: string, action: 'view' | 'edit' | 'share' | 'export') => void;
}

export const ContentListView: React.FC<ContentListViewProps> = ({
  contentItems,
  selectedItems,
  processingFiles,
  showAnalysis,
  viewMode,
  displayService,
  theme,
  terminalWidth,
  terminalHeight,
  onItemInteraction
}) => {
  
  // Empty state
  if (contentItems.length === 0) {
    return (
      <Box justifyContent="center" alignItems="center" height={Math.max(5, terminalHeight - 10)}>
        <Box flexDirection="column" alignItems="center">
          <Text color={theme.muted}>No content items found</Text>
          <Box flexDirection="column" alignItems="center" marginTop={1}>
            <Text color={theme.accent} bold>📁 File Operations:</Text>
            <Text color={theme.muted}>• Press Ctrl+U to add file paths</Text>
            <Text color={theme.muted}>• Press Ctrl+O to see current directory</Text>
            <Text color={theme.muted}>• Type file paths separated by commas</Text>
            <Text color={theme.muted}>• Supports: ./file.txt, ~/docs/file.pdf, /absolute/path</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Render content items
  return (
    <Box flexDirection="column">
      {contentItems.map(item => {
        const isSelected = selectedItems.has(item.id);
        const statusColor = displayService.getStatusColor(item.status);
        
        return (
          <Box 
            key={item.id}
            borderStyle={isSelected ? "double" : "single"}
            borderColor={isSelected ? theme.accent : theme.muted}
            paddingX={1}
            marginY={0}
          >
            <Box flexDirection="column">
              {/* Item header */}
              <Box justifyContent="space-between">
                <Box>
                  <Text color={theme.primary}>
                    {displayService.getContentIcon(item.type)} {item.name}
                  </Text>
                  <Text color={statusColor}>
                    {' '}{displayService.getStatusIcon(item.status)} {displayService.getProcessingStatusLabel(item.status)}
                  </Text>
                </Box>
                <Box>
                  <Text color={theme.muted}>
                    {displayService.formatFileSize(item.size)}
                  </Text>
                  {item.metadata?.duration && (
                    <Text color={theme.muted}>
                      {' '}• {displayService.formatDuration(item.metadata.duration)}
                    </Text>
                  )}
                </Box>
              </Box>
              
              {/* Progress bar for processing items */}
              {item.progress !== undefined && item.progress < 100 && (
                <Box marginTop={1}>
                  <Text color={theme.accent}>
                    Progress: {item.progress}% {displayService.getProgressBar(item.progress, 20)}
                  </Text>
                </Box>
              )}
              
              {/* Analysis results */}
              {showAnalysis && item.analysis && (
                <Box marginTop={1} borderStyle="round" borderColor={theme.secondary} paddingX={1}>
                  <Box flexDirection="column">
                    <Text color={theme.secondary} bold>Analysis Results:</Text>
                    <Text color={theme.muted}>
                      Summary: {displayService.truncateText(item.analysis.summary, 100)}
                    </Text>
                    <Text color={theme.muted}>
                      Confidence: {displayService.formatConfidence(item.analysis.confidence)} 
                      • Processing: {displayService.formatProcessingTime(item.analysis.processingTime)}
                    </Text>
                    {item.analysis.keyPoints.length > 0 && (
                      <Box flexDirection="column" marginTop={1}>
                        <Text color={theme.secondary}>Key Points:</Text>
                        {item.analysis.keyPoints.slice(0, 3).map((point, index) => (
                          <Text key={index} color={theme.muted}>
                            • {displayService.truncateText(point, 80)}
                          </Text>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
              
              {/* Error display */}
              {item.error && (
                <Box marginTop={1}>
                  <Text color={theme.error}>Error: {item.error}</Text>
                </Box>
              )}
            </Box>
          </Box>
        );
      })}
      
      {/* Show processing files */}
      {processingFiles.size > 0 && (
        <Box borderStyle="round" borderColor={theme.warning} paddingX={1} marginTop={1}>
          <Box flexDirection="column">
            <Text color={theme.warning} bold>⏳ Processing Files:</Text>
            {Array.from(processingFiles).map(filePath => (
              <Text key={filePath} color={theme.muted}>
                • {path.basename(filePath)}
              </Text>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}; 