/**
 * Tool Confirmation Dialog Example
 * 
 * This file demonstrates how to use the ToolConfirmationDialog component
 * with different confirmation types and scenarios.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import { 
  ToolConfirmationDialog, 
  ConfirmationType,
  TrustLevel
} from './ToolConfirmationDialog.js';

/**
 * Example component demonstrating ToolConfirmationDialog usage
 */
export const ToolConfirmationDialogExample: React.FC = () => {
  // State to track example number and results
  const [currentExample, setCurrentExample] = useState(0);
  const [results, setResults] = useState<Array<{
    toolName: string;
    trustLevel: TrustLevel | null;
    modified: boolean;
  }>>([]);
  
  // Example confirmation scenarios
  const examples = [
    // File edit example
    {
      toolName: 'edit_file',
      toolNamespace: 'file',
      toolDescription: 'Edits content in a file',
      parameters: {
        file_path: './src/app.js',
        old_string: 'function hello() {',
        new_string: 'function helloWorld() {'
      },
      confirmationType: ConfirmationType.EDIT,
      previewContent: `diff --git a/src/app.js b/src/app.js
index 123abc..456def 100644
--- a/src/app.js
+++ b/src/app.js
@@ -15,7 +15,7 @@ import { useState } from 'react';
 
-function hello() {
+function helloWorld() {
   console.log('Hello');
   return true;
 }`
    },
    
    // Command execution example
    {
      toolName: 'execute_command',
      toolNamespace: 'shell',
      toolDescription: 'Executes a shell command',
      parameters: {
        command: 'rm -rf ./build',
        timeout: 30000
      },
      confirmationType: ConfirmationType.EXEC,
      previewContent: 'This will delete the ./build directory and all its contents.'
    },
    
    // Sensitive operation example
    {
      toolName: 'generate_token',
      toolNamespace: 'security',
      toolDescription: 'Generates a new API access token',
      parameters: {
        user: 'admin',
        permissions: ['read', 'write', 'delete'],
        expires_in: '30d'
      },
      confirmationType: ConfirmationType.SENSITIVE,
      previewContent: 'This will create a new API token with admin permissions.'
    },
    
    // MCP tool example
    {
      toolName: 'external_api',
      toolNamespace: 'mcp',
      toolDescription: 'Calls an external API provided by MCP',
      parameters: {
        endpoint: 'https://api.example.com/data',
        method: 'POST',
        data: {
          username: 'user',
          action: 'fetch_stats'
        }
      },
      confirmationType: ConfirmationType.MCP,
      previewContent: 'This will send data to an external API via MCP.'
    },
    
    // Info access example
    {
      toolName: 'read_logs',
      toolNamespace: 'system',
      toolDescription: 'Reads system log files',
      parameters: {
        log_file: '/var/log/system.log',
        lines: 100,
        filter: 'error'
      },
      confirmationType: ConfirmationType.INFO,
      previewContent: 'This will read the last 100 error lines from system logs.'
    }
  ];
  
  // Handle confirmation result
  const handleConfirm = (trustLevel: TrustLevel, modifiedParams?: any) => {
    const example = examples[currentExample];
    
    setResults(prev => [
      ...prev,
      {
        toolName: example.toolName,
        trustLevel,
        modified: !!modifiedParams
      }
    ]);
    
    if (currentExample < examples.length - 1) {
      setCurrentExample(prev => prev + 1);
    } else {
      // End of examples
      setCurrentExample(-1);
    }
  };
  
  // Handle cancellation
  const handleCancel = () => {
    const example = examples[currentExample];
    
    setResults(prev => [
      ...prev,
      {
        toolName: example.toolName,
        trustLevel: null,
        modified: false
      }
    ]);
    
    if (currentExample < examples.length - 1) {
      setCurrentExample(prev => prev + 1);
    } else {
      // End of examples
      setCurrentExample(-1);
    }
  };
  
  // Handle key input for showing next example
  useInput((input, key) => {
    if (currentExample === -1 && key.return) {
      // Reset the demo
      setCurrentExample(0);
      setResults([]);
    }
  });
  
  // Show results if examples are finished
  if (currentExample === -1) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1} padding={1} borderStyle="round" borderColor={Colors.AccentBlue}>
          <Text bold>Tool Confirmation Results</Text>
        </Box>
        
        {results.map((result, index) => (
          <Box key={index} marginBottom={1}>
            <Box marginRight={2}>
              <Text>{index + 1}.</Text>
            </Box>
            <Box flexDirection="column">
              <Text>
                <Text bold>{result.toolName}: </Text>
                {result.trustLevel === null ? (
                  <Text color={Colors.Error}>Canceled</Text>
                ) : (
                  <Text>
                    <Text color={Colors.Success}>Confirmed</Text>
                    <Text> with trust level </Text>
                    <Text color={Colors.AccentBlue}>{result.trustLevel}</Text>
                    {result.modified && (
                      <Text color={Colors.Warning}> (parameters modified)</Text>
                    )}
                  </Text>
                )}
              </Text>
            </Box>
          </Box>
        ))}
        
        <Box marginTop={1} padding={1} borderStyle="round" borderColor={Colors.TextDim}>
          <Text>Press Enter to restart examples</Text>
        </Box>
      </Box>
    );
  }
  
  // Show current example
  const example = examples[currentExample];
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1} padding={1} borderStyle="round" borderColor={Colors.AccentBlue}>
        <Text bold>Tool Confirmation Dialog Example {currentExample + 1}/{examples.length}</Text>
      </Box>
      
      <ToolConfirmationDialog
        toolName={example.toolName}
        toolNamespace={example.toolNamespace}
        toolDescription={example.toolDescription}
        parameters={example.parameters}
        confirmationType={example.confirmationType}
        previewContent={example.previewContent}
        terminalWidth={100}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
};

export default ToolConfirmationDialogExample;