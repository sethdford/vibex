/**
 * Tool Group Display Component
 * 
 * Displays tools organized into collapsible groups with search functionality
 * and interactive tool execution.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../../colors.js';
import { ToolGroupDisplayProps, ToolGroup, Tool } from './types.js';
import { ToolGroupItem } from './ToolGroupItem.js';
import { SearchBox } from './SearchBox.js';

/**
 * Filter tools and groups by search query
 */
const filterBySearch = (groups: ToolGroup[], searchQuery: string): ToolGroup[] => {
  if (!searchQuery) {
    return groups;
  }
  
  const query = searchQuery.toLowerCase();
  
  return groups
    .map(group => {
      // Filter tools within the group
      const filteredTools = group.tools.filter(tool => 
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        tool.namespace?.toLowerCase().includes(query)
      );
      
      // Return a new group with filtered tools
      return {
        ...group,
        tools: filteredTools,
        // Auto-expand groups with matches
        expanded: filteredTools.length > 0 ? true : group.expanded
      };
    })
    .filter(group => 
      // Only include groups with matching tools or group name matches
      group.tools.length > 0 || 
      group.name.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query) ||
      group.tags?.some(tag => tag.toLowerCase().includes(query))
    );
};

/**
 * Tool Group Display component
 */
export const ToolGroupDisplay: React.FC<ToolGroupDisplayProps> = ({
  groups,
  width,
  height,
  searchEnabled = true,
  initialSearch = '',
  executionEnabled = true,
  executionOptions = {
    showConfirmation: true,
    autoCollapse: false
  },
  groupByNamespace = true,
  onToolSelect,
  onToolExecute,
  isFocused = true,
  onFocusChange
}) => {
  // State for expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map(group => [group.id, Boolean(group.expanded)]))
  );
  
  // State for search query
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  
  // Handle search query change
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);
  
  // Toggle group expansion
  const toggleGroupExpand = useCallback((groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  }, []);
  
  // Filter groups by search query
  const filteredGroups = useMemo(() => 
    filterBySearch(groups, searchQuery),
    [groups, searchQuery]
  );
  
  // Handle tool select
  const handleToolSelect = useCallback((tool: Tool) => {
    if (onToolSelect) {
      onToolSelect(tool);
    }
  }, [onToolSelect]);
  
  // Handle tool execution
  const handleToolExecute = useCallback((tool: Tool, parameters: Record<string, any>) => {
    if (onToolExecute) {
      return onToolExecute(tool, parameters);
    }
    return Promise.resolve(null);
  }, [onToolExecute]);
  
  // Calculate content height
  const contentHeight = height ? height - (searchEnabled ? 3 : 0) : undefined;
  
  return (
    <Box flexDirection="column" width={width}>
      {/* Search box */}
      {searchEnabled && (
        <Box marginBottom={1}>
          <SearchBox 
            width={width} 
            initialQuery={initialSearch} 
            onSearch={handleSearch} 
            isFocused={isFocused}
            onFocusChange={onFocusChange}
          />
        </Box>
      )}
      
      {/* Groups list */}
      <Box 
        flexDirection="column"
        height={contentHeight}
        overflowY={contentHeight ? 'scroll' : undefined}
      >
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <Box key={group.id} marginBottom={1}>
              <ToolGroupItem
                group={group}
                expanded={!!expandedGroups[group.id]}
                width={width}
                searchQuery={searchQuery}
                executionEnabled={executionEnabled}
                executionOptions={executionOptions}
                onToggleExpand={() => toggleGroupExpand(group.id)}
                onToolSelect={handleToolSelect}
                onToolExecute={handleToolExecute}
              />
            </Box>
          ))
        ) : (
          <Box 
            width={width} 
            height={10} 
            alignItems="center" 
            justifyContent="center"
            flexDirection="column"
            borderStyle="single"
            borderColor={Colors.Border}
            padding={2}
          >
            <Text color={Colors.TextDim}>No tools found matching</Text>
            <Text bold color={Colors.Primary}>"{searchQuery}"</Text>
            <Box marginTop={1}>
              <Text color={Colors.TextDim}>Try a different search term</Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ToolGroupDisplay;