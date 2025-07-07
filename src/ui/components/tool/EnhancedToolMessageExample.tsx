/**
 * Enhanced Tool Message Example
 * 
 * This file demonstrates how to use the EnhancedToolMessage component
 * with different tool types and states.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import { 
  EnhancedToolMessage, 
  ToolExecutionStatus, 
  ToolResultType,
  ToolVisibilityLevel 
} from './EnhancedToolMessage.js';

/**
 * Example component demonstrating EnhancedToolMessage usage
 */
export const EnhancedToolMessageExample: React.FC = () => {
  // Demo state
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  // Example tool executions
  const toolExamples = [
    // Simple success example
    {
      toolUse: {
        name: 'read_file',
        id: 'tool-1',
        input: { file_path: '/path/to/file.txt' },
        status: ToolExecutionStatus.SUCCESS,
        namespace: 'file',
        description: 'Reads content from a file'
      },
      toolResult: {
        content: 'This is the content of the file.\nIt has multiple lines.\nHere is the third line.',
        isError: false,
        toolUseId: 'tool-1',
        resultType: ToolResultType.TEXT
      }
    },
    
    // JSON result example
    {
      toolUse: {
        name: 'fetch_api',
        id: 'tool-2',
        input: { url: 'https://api.example.com/data' },
        status: ToolExecutionStatus.SUCCESS,
        namespace: 'web',
        description: 'Fetches data from a web API'
      },
      toolResult: {
        content: JSON.stringify({
          status: 'success',
          data: {
            items: [
              { id: 1, name: 'Item 1' },
              { id: 2, name: 'Item 2' },
              { id: 3, name: 'Item 3' }
            ],
            total: 3,
            page: 1
          }
        }, null, 2),
        isError: false,
        toolUseId: 'tool-2',
        resultType: ToolResultType.JSON
      }
    },
    
    // Error example
    {
      toolUse: {
        name: 'execute_command',
        id: 'tool-3',
        input: { command: 'invalid-command --option' },
        status: ToolExecutionStatus.ERROR,
        namespace: 'shell',
        description: 'Executes a shell command'
      },
      toolResult: {
        content: 'Error: Command not found: invalid-command\nPlease check that the command exists and is in your PATH.',
        isError: true,
        toolUseId: 'tool-3',
        resultType: ToolResultType.ERROR
      }
    },
    
    // Running example with progress
    {
      toolUse: {
        name: 'search_code',
        id: 'tool-4',
        input: { pattern: 'function', path: './src' },
        status: ToolExecutionStatus.RUNNING,
        namespace: 'code',
        description: 'Searches for code patterns in files',
        metadata: {
          progress: 65,
          message: 'Searching files: 65/100 processed',
          startTime: Date.now() - 3000, // 3 seconds ago
        }
      }
    },
    
    // Pending example
    {
      toolUse: {
        name: 'analyze_code',
        id: 'tool-5',
        input: { file_path: './src/main.js', analysis_type: 'full' },
        status: ToolExecutionStatus.PENDING,
        namespace: 'code',
        description: 'Analyzes code quality and structure'
      }
    },
    
    // File diff example
    {
      toolUse: {
        name: 'edit_file',
        id: 'tool-6',
        input: { 
          file_path: './src/app.js', 
          old_string: 'function hello() {', 
          new_string: 'function helloWorld() {'
        },
        status: ToolExecutionStatus.SUCCESS,
        namespace: 'file',
        description: 'Edits content in a file',
        metadata: {
          startTime: Date.now() - 2500,
          endTime: Date.now() - 2000
        }
      },
      toolResult: {
        content: `diff --git a/src/app.js b/src/app.js
index 123abc..456def 100644
--- a/src/app.js
+++ b/src/app.js
@@ -15,7 +15,7 @@ import { useState } from 'react';
 
-function hello() {
+function helloWorld() {
   console.log('Hello');
   return true;
 }`,
        isError: false,
        toolUseId: 'tool-6',
        resultType: ToolResultType.FILE_DIFF
      }
    },
    
    // File paths result example
    {
      toolUse: {
        name: 'glob',
        id: 'tool-7',
        input: { pattern: '**/*.js' },
        status: ToolExecutionStatus.SUCCESS,
        namespace: 'file',
        description: 'Finds files matching a pattern',
        metadata: {
          startTime: Date.now() - 1500,
          endTime: Date.now() - 1200
        }
      },
      toolResult: {
        content: `/src/app.js
/src/components/Button.js
/src/components/Input.js
/src/utils/helpers.js
/src/utils/formatting.js
/tests/app.test.js
/tests/components/Button.test.js`,
        isError: false,
        toolUseId: 'tool-7',
        resultType: ToolResultType.FILE_PATHS
      }
    }
  ];
  
  // Keyboard navigation
  useInput((input, key) => {
    if (key.upArrow) {
      setFocusedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setFocusedIndex(prev => Math.min(toolExamples.length - 1, prev + 1));
    }
  });
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1} padding={1} borderStyle="round" borderColor={Colors.AccentBlue}>
        <Text bold>Enhanced Tool Message Examples</Text>
        <Text> (Use ↑/↓ keys to navigate)</Text>
      </Box>
      
      {toolExamples.map((example, index) => (
        <EnhancedToolMessage
          key={example.toolUse.id}
          toolUse={example.toolUse}
          toolResult={example.toolResult}
          isFocused={index === focusedIndex}
          initialVisibility={ToolVisibilityLevel.DETAILED}
          autoCollapseResults={true}
          maxResultLines={10}
          terminalWidth={80}
        />
      ))}
      
      <Box marginTop={1} padding={1} borderStyle="round" borderColor={Colors.TextDim}>
        <Text>Press Q to exit example</Text>
      </Box>
    </Box>
  );
};

export default EnhancedToolMessageExample;