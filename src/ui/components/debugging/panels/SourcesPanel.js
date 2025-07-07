/**
 * Sources Panel Component
 * 
 * Panel for browsing and selecting source files.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../../colors.js';
import path from 'path';

/**
 * Sources Panel Component
 */
export const SourcesPanel = ({
  width,
  height,
  isFocused = false,
  currentFile,
  currentLine,
  onSourceOpen,
  onFocusChange
}) => {
  // Mock directory structure for demo purposes
  // In a real implementation, this would be loaded dynamically
  const mockSources = [
    {
      type: 'directory',
      name: 'src',
      path: '/Users/sethford/Downloads/Projects/vibex/src',
      expanded: true,
      children: [
        {
          type: 'directory',
          name: 'core',
          path: '/Users/sethford/Downloads/Projects/vibex/src/core',
          expanded: false,
          children: [
            {
              type: 'directory',
              name: 'usecases',
              path: '/Users/sethford/Downloads/Projects/vibex/src/core/usecases',
              expanded: false,
              children: [
                {
                  type: 'file',
                  name: 'process-items.js',
                  path: '/Users/sethford/Downloads/Projects/vibex/src/core/usecases/process-items.js',
                },
                {
                  type: 'file',
                  name: 'process-item.js',
                  path: '/Users/sethford/Downloads/Projects/vibex/src/core/usecases/process-item.js',
                }
              ]
            }
          ]
        },
        {
          type: 'directory',
          name: 'services',
          path: '/Users/sethford/Downloads/Projects/vibex/src/services',
          expanded: false,
          children: [
            {
              type: 'file',
              name: 'item-service.js',
              path: '/Users/sethford/Downloads/Projects/vibex/src/services/item-service.js',
            }
          ]
        },
        {
          type: 'directory',
          name: 'ui',
          path: '/Users/sethford/Downloads/Projects/vibex/src/ui',
          expanded: false,
          children: [
            {
              type: 'directory',
              name: 'components',
              path: '/Users/sethford/Downloads/Projects/vibex/src/ui/components',
              expanded: false,
              children: [
                {
                  type: 'file',
                  name: 'ItemList.js',
                  path: '/Users/sethford/Downloads/Projects/vibex/src/ui/components/ItemList.js',
                },
                {
                  type: 'file',
                  name: 'ItemForm.js',
                  path: '/Users/sethford/Downloads/Projects/vibex/src/ui/components/ItemForm.js',
                },
                {
                  type: 'file',
                  name: 'SubmitButton.js',
                  path: '/Users/sethford/Downloads/Projects/vibex/src/ui/components/SubmitButton.js',
                }
              ]
            }
          ]
        }
      ]
    }
  ];
  
  // State
  const [sources, setSources] = useState(mockSources);
  const [selectedPath, setSelectedPath] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [flattenedItems, setFlattenedItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Focus handler
  useEffect(() => {
    if (isFocused && onFocusChange) {
      onFocusChange(true);
    }
  }, [isFocused, onFocusChange]);
  
  // Flatten the source tree for easier navigation
  useEffect(() => {
    const flattened = [];
    
    const flattenTree = (items, depth = 0) => {
      if (!items) return;
      
      for (const item of items) {
        flattened.push({ ...item, depth });
        
        if (item.type === 'directory' && item.expanded && item.children) {
          flattenTree(item.children, depth + 1);
        }
      }
    };
    
    flattenTree(sources);
    setFlattenedItems(flattened);
    
    // If currentFile is set, try to select it
    if (currentFile) {
      const index = flattened.findIndex(item => item.path === currentFile);
      if (index !== -1) {
        setSelectedIndex(index);
      }
    }
  }, [sources, currentFile]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Handle search mode
    if (searchMode) {
      if (key.return) {
        setSearchMode(false);
        
        // If there are results, select the first match
        if (searchText) {
          const results = flattenedItems.filter(item => 
            item.name.toLowerCase().includes(searchText.toLowerCase())
          );
          
          if (results.length > 0) {
            const index = flattenedItems.findIndex(item => item.path === results[0].path);
            if (index !== -1) {
              setSelectedIndex(index);
            }
          }
        }
      } else if (key.escape) {
        setSearchMode(false);
        setSearchText('');
      } else if (key.backspace) {
        setSearchText(prev => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && input && input.length === 1) {
        setSearchText(prev => prev + input);
      }
      return;
    }
    
    // Navigation keys
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(flattenedItems.length - 1, prev + 1));
    }
    
    // Expand/collapse directory
    if ((key.return || input === ' ') && selectedItem?.type === 'directory') {
      toggleDirectory(selectedItem.path);
    }
    
    // Open file
    if ((key.return || input === ' ') && selectedItem?.type === 'file') {
      if (onSourceOpen) {
        onSourceOpen(selectedItem.path);
      }
    }
    
    // Toggle search mode
    if (input === '/') {
      setSearchMode(true);
      setSearchText('');
    }
  }, { isActive: isFocused });
  
  // Get the selected item
  const selectedItem = flattenedItems[selectedIndex];
  
  // Toggle directory expanded/collapsed state
  const toggleDirectory = useCallback((dirPath) => {
    setSources(prev => {
      // We need to clone the nested structure to avoid direct state mutation
      const clone = JSON.parse(JSON.stringify(prev));
      
      const toggleDir = (items) => {
        if (!items) return false;
        
        for (let i = 0; i < items.length; i++) {
          if (items[i].path === dirPath) {
            items[i].expanded = !items[i].expanded;
            return true;
          }
          
          if (items[i].children && toggleDir(items[i].children)) {
            return true;
          }
        }
        
        return false;
      };
      
      toggleDir(clone);
      return clone;
    });
  }, []);
  
  // Filter items based on search
  const filteredItems = searchText
    ? flattenedItems.filter(item => 
        item.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : flattenedItems;
  
  return (
    <Box 
      flexDirection="column" 
      width={width} 
      height={height}
      borderColor={isFocused ? Colors.Primary : Colors.Border}
    >
      {/* Panel header */}
      <Box 
        width="100%"
        height={1}
        backgroundColor={isFocused ? Colors.Primary : Colors.BackgroundAlt}
        paddingX={1}
      >
        <Text bold>Sources</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          {searchMode ? (
            <Text>Search: <Text underline>{searchText}</Text></Text>
          ) : (
            <Text>{flattenedItems.filter(i => i.type === 'file').length} files</Text>
          )}
        </Box>
      </Box>
      
      {/* Source file browser */}
      <Box 
        flexDirection="column"
        width="100%"
        height={height - 2}
        paddingX={1}
        overflow="hidden"
      >
        {filteredItems.length > 0 ? (
          filteredItems.map((item, index) => {
            const isSelected = index === selectedIndex;
            const indent = ' '.repeat(item.depth * 2);
            const isCurrentFile = item.path === currentFile;
            
            return (
              <Box key={item.path}>
                <Text
                  backgroundColor={isSelected ? Colors.BackgroundSelected : undefined}
                  color={
                    isSelected ? Colors.ForegroundSelected : 
                    isCurrentFile ? Colors.Primary : undefined
                  }
                  bold={isSelected || isCurrentFile}
                >
                  {indent}
                  {item.type === 'directory' ? (
                    <>
                      {item.expanded ? '▼ ' : '▶ '}
                      <Text>{item.name}/</Text>
                    </>
                  ) : (
                    <>
                      {'  '}
                      <Text>{item.name}</Text>
                      {isCurrentFile && currentLine && (
                        <Text dimColor>{` (line ${currentLine})`}</Text>
                      )}
                    </>
                  )}
                </Text>
              </Box>
            );
          })
        ) : (
          <Text color={Colors.TextDim}>
            {searchText ? 'No matches found.' : 'No source files available.'}
          </Text>
        )}
      </Box>
      
      {/* Panel footer */}
      <Box 
        width="100%"
        height={1}
        backgroundColor={Colors.BackgroundAlt}
        paddingX={1}
        justifyContent="space-between"
      >
        <Text>
          <Text color={Colors.AccentBlue}>↵</Text> {selectedItem?.type === 'directory' ? 'Expand/Collapse' : 'Open'} | 
          <Text color={Colors.AccentBlue}> /</Text> Search
        </Text>
        
        <Text color={Colors.TextDim}>↑/↓: Navigate</Text>
      </Box>
    </Box>
  );
};

export default SourcesPanel;