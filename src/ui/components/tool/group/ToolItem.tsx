/**
 * Tool Item Component
 * 
 * Displays a single tool with expandable documentation and execution capability.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../../colors.js';
import { ToolItemProps } from './types.js';
import { ToolDocumentation } from './ToolDocumentation.js';

/**
 * Highlight text with matching search terms
 */
const highlightText = (text: string, searchTerms?: string[]) => {
  if (!searchTerms || searchTerms.length === 0) {
    return <Text>{text}</Text>;
  }
  
  // Create a regex pattern that matches any of the search terms
  const pattern = new RegExp(`(${searchTerms.join('|')})`, 'gi');
  const parts = text.split(pattern);
  
  return (
    <>
      {parts.map((part, i) => {
        // Check if this part matches any of the search terms
        const isMatch = searchTerms.some(term => 
          part.toLowerCase().includes(term.toLowerCase())
        );
        
        return isMatch ? (
          <Text key={i} backgroundColor={Colors.DimBackground} color={Colors.Primary}>{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        );
      })}
    </>
  );
};

/**
 * Tool Item component
 */
export const ToolItem: React.FC<ToolItemProps> = ({
  tool,
  expanded,
  selected,
  executionEnabled,
  executionOptions,
  width,
  searchTerms,
  onToggleExpand,
  onSelect,
  onExecute
}) => {
  return (
    <Box 
      flexDirection="column" 
      width={width}
      marginY={0}
      paddingY={0}
    >
      {/* Tool header */}
      <Box
        paddingX={1}
        backgroundColor={selected ? Colors.DimBackground : undefined}
        borderStyle="single"
        borderColor={Colors.Border}
      >
        <Box marginRight={1}>
          <Text
            color={Colors.Primary}
            onClick={onToggleExpand}
          >
            {expanded ? '▼' : '►'}
          </Text>
        </Box>
        
        <Text 
          bold={selected} 
          onClick={onSelect}
          color={selected ? Colors.Primary : undefined}
        >
          {highlightText(tool.name, searchTerms)}
        </Text>
        
        {tool.namespace && (
          <Box marginLeft={2}>
            <Text color={Colors.TextDim} dimColor>
              {highlightText(tool.namespace, searchTerms)}
            </Text>
          </Box>
        )}
        
        {tool.tags && tool.tags.length > 0 && (
          <Box marginLeft={2}>
            {tool.tags.map((tag) => (
              <Box key={tag} marginRight={1}>
                <Text color={Colors.TextDim} dimColor>
                  #{highlightText(tag, searchTerms)}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      
      {/* Tool description (always shown) */}
      <Box 
        paddingX={2} 
        paddingY={0}
        borderStyle={expanded ? undefined : "single"}
        borderTop={false}
        borderColor={Colors.Border}
      >
        <Text color={Colors.TextDim} wrap="truncate-end">
          {highlightText(tool.description, searchTerms)}
        </Text>
      </Box>
      
      {/* Tool documentation (expanded) */}
      {expanded && (
        <Box paddingX={1}>
          <ToolDocumentation
            tool={tool}
            width={width - 2}
            searchTerms={searchTerms}
            executionEnabled={executionEnabled}
            executionOptions={executionOptions}
            onExecute={onExecute}
          />
        </Box>
      )}
    </Box>
  );
};

export default ToolItem;