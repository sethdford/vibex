/**
 * Tool Group Item Component
 * 
 * Displays a collapsible group of tools with a header and expandable content.
 */

import React, { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../../colors.js';
import { ToolGroupItemProps, Tool } from './types.js';
import { ToolItem } from './ToolItem.js';

/**
 * Highlight text with matching search terms
 */
const highlightText = (text: string, searchQuery?: string) => {
  if (!searchQuery) {
    return <Text>{text}</Text>;
  }
  
  const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => (
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <Text key={i} backgroundColor={Colors.DimBackground} color={Colors.Primary}>{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      ))}
    </>
  );
};

/**
 * Tool Group Item component
 */
export const ToolGroupItem: React.FC<ToolGroupItemProps> = ({
  group,
  expanded,
  executionEnabled,
  executionOptions,
  width,
  searchQuery,
  onToggleExpand,
  onToolSelect,
  onToolExecute
}) => {
  // State for expanded tools
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  // State for selected tool
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  
  // Handle tool expansion toggle
  const handleToolToggleExpand = (toolId: string) => {
    setExpandedTools(prev => ({
      ...prev,
      [toolId]: !prev[toolId]
    }));
  };
  
  // Handle tool selection
  const handleToolSelect = (tool: Tool) => {
    setSelectedToolId(tool.id);
    if (onToolSelect) {
      onToolSelect(tool);
    }
  };
  
  // Parse search terms for highlighting
  const searchTerms = useMemo(() => {
    return searchQuery ? searchQuery.toLowerCase().split(/\s+/) : [];
  }, [searchQuery]);
  
  // Get background color based on group selection state
  const getBackgroundColor = () => {
    if (group.tools.some(t => t.id === selectedToolId)) {
      return Colors.DimBackground;
    }
    return undefined;
  };
  
  return (
    <Box 
      flexDirection="column" 
      width={width}
      borderStyle="single"
      borderColor={Colors.Border}
    >
      {/* Group header */}
      <Box 
        paddingX={1}
        paddingY={0}
        backgroundColor={getBackgroundColor()}
      >
        <Box marginRight={1}>
          <Text color={Colors.Primary} bold>
            {expanded ? '▼' : '►'}
          </Text>
        </Box>
        
        <Text bold onClick={onToggleExpand}>
          {highlightText(group.name, searchQuery)}
        </Text>
        
        {group.tags && group.tags.length > 0 && (
          <Box marginLeft={2}>
            {group.tags.map((tag, i) => (
              <Box key={tag} marginRight={1}>
                <Text color={Colors.TextDim} dimColor>
                  #{highlightText(tag, searchQuery)}
                </Text>
              </Box>
            ))}
          </Box>
        )}
        
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={Colors.TextDim}>({group.tools.length})</Text>
        </Box>
      </Box>
      
      {/* Group description */}
      {expanded && group.description && (
        <Box paddingX={2} paddingY={0}>
          <Text color={Colors.TextDim} wrap="truncate-end">
            {highlightText(group.description, searchQuery)}
          </Text>
        </Box>
      )}
      
      {/* Tool list */}
      {expanded && (
        <Box flexDirection="column">
          {group.tools.map((tool) => (
            <Box key={tool.id} paddingLeft={2}>
              <ToolItem
                tool={tool}
                expanded={!!expandedTools[tool.id]}
                selected={tool.id === selectedToolId}
                executionEnabled={executionEnabled}
                executionOptions={executionOptions}
                width={width - 4}
                searchTerms={searchTerms}
                onToggleExpand={() => handleToolToggleExpand(tool.id)}
                onSelect={() => handleToolSelect(tool)}
                onExecute={
                  onToolExecute 
                    ? (parameters) => onToolExecute(tool, parameters) 
                    : undefined
                }
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ToolGroupItem;