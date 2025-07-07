/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

import { SearchBoxProps } from './types.js';

/**
 * Search Box Component
 * 
 * Provides a search input for filtering tools.
 */
export const SearchBox: React.FC<SearchBoxProps> = ({
  query,
  onQueryChange,
  terminalWidth = 80,
}) => {
  // Calculate width for input field
  const inputWidth = Math.min(terminalWidth - 10, 50);

  return (
    <Box flexDirection="column">
      <Text bold color={Colors.Text}>Search Tools</Text>
      
      <Box 
        marginTop={1}
        borderStyle="round"
        borderColor={Colors.Info}
        paddingX={1}
      >
        <Text color={Colors.Info} bold>🔍</Text>
        
        <Box marginLeft={1} width={inputWidth}>
          <Text>{query}</Text>
        </Box>
        
        {query && (
          <Box marginLeft={1}>
            <Text color={Colors.TextDim} underline>
              [Clear]
            </Text>
          </Box>
        )}
      </Box>
      
      <Box marginTop={1}>
        <Text color={Colors.TextDim}>
          Type to search by name, description, namespace, or tags
        </Text>
      </Box>
    </Box>
  );
};

export default SearchBox;