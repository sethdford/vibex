/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { v4 as uuidv4 } from 'uuid';

import { Tool } from '../../../core/domain/tool/tool-interfaces.js';
import { ToolGroup, ToolGroupDisplayProps } from './types.js';
import { ToolGroupItem } from './ToolGroupItem.js';
import { SearchBox } from './SearchBox.js';

/**
 * Tool Group Display Component
 * 
 * Organizes tools into logical groups by namespace/category and
 * provides an interface for browsing, searching, and executing tools.
 * 
 * Part of the VibeX UI Enhancement Plan.
 */
export const ToolGroupDisplay: React.FC<ToolGroupDisplayProps> = ({
  groups,
  groupingFunction,
  filterFunction,
  initialSearch = '',
  showSearch = true,
  showDocumentation = true,
  showExamples = true,
  allowExecution = true,
  terminalWidth = 80,
  onToolSelect,
  onToolExecute,
  onGroupToggle,
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [selectedToolIndex, setSelectedToolIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Group tools by namespace or use provided groups
  const toolGroups = useMemo(() => {
    if (groups) return groups;

    if (!availableTools.length) return [];

    // Use provided grouping function or default to namespace grouping
    if (groupingFunction) {
      return groupingFunction(availableTools);
    }

    // Default grouping by namespace
    const toolsByNamespace = new Map<string, Tool[]>();
    
    availableTools.forEach(tool => {
      const metadata = tool.getMetadata();
      const namespace = metadata.namespace || 'default';
      
      if (!toolsByNamespace.has(namespace)) {
        toolsByNamespace.set(namespace, []);
      }
      
      toolsByNamespace.get(namespace)!.push(tool);
    });
    
    // Convert to array of ToolGroup objects
    return Array.from(toolsByNamespace.entries()).map(([namespace, tools]) => ({
      name: namespace,
      description: `Tools in the ${namespace} namespace`,
      tools,
      isExpanded: expandedGroups.has(namespace)
    }));
  }, [availableTools, groups, groupingFunction, expandedGroups]);

  // Filter groups and tools based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return toolGroups;
    
    return toolGroups
      .map(group => {
        // Filter tools in this group
        const filteredTools = group.tools.filter(tool => {
          const metadata = tool.getMetadata();
          const searchTarget = `${metadata.name} ${metadata.description} ${metadata.namespace || ''} ${(metadata.tags || []).join(' ')}`.toLowerCase();
          return searchTarget.includes(searchQuery.toLowerCase());
        });
        
        // Return group with filtered tools
        return {
          ...group,
          tools: filteredTools
        };
      })
      .filter(group => group.tools.length > 0); // Only keep groups with matching tools
  }, [toolGroups, searchQuery]);

  // Toggle group expansion
  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(groupName)) {
        newExpanded.delete(groupName);
      } else {
        newExpanded.add(groupName);
      }
      
      // Call the callback if provided
      if (onGroupToggle) {
        onGroupToggle(groupName);
      }
      
      return newExpanded;
    });
  }, [onGroupToggle]);

  // Handle tool selection
  const handleToolSelect = useCallback((tool: Tool) => {
    if (onToolSelect) {
      onToolSelect(tool);
    }
  }, [onToolSelect]);

  // Handle tool execution
  const handleToolExecute = useCallback((tool: Tool, params: Record<string, unknown>) => {
    if (onToolExecute) {
      const request = {
        callId: uuidv4(),
        name: tool.name,
        namespace: tool.getMetadata().namespace,
        params
      };
      
      onToolExecute(request);
    }
  }, [onToolExecute]);

  // Placeholder for loading available tools
  // In a real implementation, this would fetch tools from the registry
  useEffect(() => {
    // Simulate loading tools
    setIsLoading(true);
    
    // This should be replaced with actual tool registry access
    const loadTools = async () => {
      try {
        // Here we would fetch tools from the registry
        // const registry = await getToolRegistry();
        // const tools = registry.getAllTools();
        
        // Apply filter function if provided
        // const filtered = filterFunction ? tools.filter(filterFunction) : tools;
        
        // For now, just use an empty array
        const mockTools: Tool[] = [];
        setAvailableTools(mockTools);
      } catch (error) {
        console.error('Error loading tools:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTools();
  }, [filterFunction]);

  // Show loading state
  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Text color={Colors.Info}>Loading tool groups...</Text>
      </Box>
    );
  }

  // Show empty state if no tools are available
  if (filteredGroups.length === 0) {
    return (
      <Box flexDirection="column">
        {showSearch && (
          <SearchBox
            query={searchQuery}
            onQueryChange={setSearchQuery}
            terminalWidth={terminalWidth}
          />
        )}
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>No tools available{searchQuery ? ` matching "${searchQuery}"` : ''}.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Search box */}
      {showSearch && (
        <SearchBox
          query={searchQuery}
          onQueryChange={setSearchQuery}
          terminalWidth={terminalWidth}
        />
      )}

      {/* Group list */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold color={Colors.Text}>Tool Groups ({filteredGroups.length})</Text>
        
        {filteredGroups.map((group, index) => (
          <ToolGroupItem
            key={`group-${group.name}-${index}`}
            group={group}
            isExpanded={expandedGroups.has(group.name)}
            showDocumentation={showDocumentation}
            showExamples={showExamples}
            allowExecution={allowExecution}
            terminalWidth={terminalWidth}
            onToggle={() => toggleGroup(group.name)}
            onToolSelect={handleToolSelect}
            onToolExecute={handleToolExecute}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ToolGroupDisplay;