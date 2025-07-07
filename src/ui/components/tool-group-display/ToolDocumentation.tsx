/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

import { ToolDocumentationProps } from './types.js';
import { ToolExampleItem } from './ToolExampleItem.js';

/**
 * Tool Documentation Component
 * 
 * Displays detailed documentation for a tool including parameters,
 * return type, and usage examples.
 */
export const ToolDocumentation: React.FC<ToolDocumentationProps> = ({
  metadata,
  showExamples = true,
  terminalWidth = 80,
}) => {
  // Extract parameter schema for display
  const parameters = metadata.parameters;
  
  // Format a parameter schema for display
  const formatParameterSchema = (schema: any): string => {
    try {
      if (typeof schema === 'string') {
        return schema;
      }
      
      if (schema.type) {
        let result = schema.type;
        
        if (schema.enum) {
          result += ` (one of: ${schema.enum.join(', ')})`;
        } else if (schema.type === 'array' && schema.items) {
          result += ` of ${formatParameterSchema(schema.items)}`;
        } else if (schema.type === 'object' && schema.properties) {
          result += ' with properties';
        }
        
        return result;
      }
      
      return JSON.stringify(schema);
    } catch (error) {
      return 'unknown';
    }
  };

  return (
    <Box flexDirection="column">
      {/* Parameters section */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={Colors.AccentBlue}>Parameters:</Text>
        
        {Object.entries(parameters).length === 0 ? (
          <Text color={Colors.TextDim}>No parameters required</Text>
        ) : (
          Object.entries(parameters).map(([name, schema]) => (
            <Box key={`param-${name}`} flexDirection="column" marginLeft={2} marginTop={1}>
              <Box>
                <Text bold>{name}</Text>
                <Text color={Colors.TextDim}> - {formatParameterSchema(schema)}</Text>
                {(schema as any).required && (
                  <Text color={Colors.Warning}> (required)</Text>
                )}
              </Box>
              
              {(schema as any).description && (
                <Box marginLeft={2}>
                  <Text color={Colors.TextDim}>{(schema as any).description}</Text>
                </Box>
              )}
            </Box>
          ))
        )}
      </Box>
      
      {/* Version */}
      {metadata.version && (
        <Box marginTop={1}>
          <Text bold color={Colors.TextDim}>Version:</Text>
          <Text color={Colors.TextDim}> {metadata.version}</Text>
        </Box>
      )}
      
      {/* Tags */}
      {metadata.tags && metadata.tags.length > 0 && (
        <Box marginTop={1}>
          <Text bold color={Colors.TextDim}>Tags:</Text>
          <Text color={Colors.TextDim}> {metadata.tags.join(', ')}</Text>
        </Box>
      )}
      
      {/* Examples */}
      {showExamples && metadata.examples && metadata.examples.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={Colors.AccentBlue}>Examples:</Text>
          
          <Box flexDirection="column" marginLeft={2} marginTop={1}>
            {metadata.examples.map((example, index) => (
              <ToolExampleItem
                key={`example-${index}`}
                name={example.name}
                params={example.params}
                result={example.result}
                description={example.description}
                toolName={metadata.name}
                toolNamespace={metadata.namespace}
                // onExecute prop would be passed here if execution is supported
              />
            ))}
          </Box>
        </Box>
      )}
      
      {/* Additional metadata */}
      {Object.entries(metadata)
        .filter(([key]) => !['name', 'description', 'namespace', 'parameters', 'version', 'tags', 'examples'].includes(key))
        .map(([key, value]) => (
          <Box key={`meta-${key}`} marginTop={1}>
            <Text bold color={Colors.TextDim}>{key}:</Text>
            <Text color={Colors.TextDim}> {typeof value === 'object' ? JSON.stringify(value) : String(value)}</Text>
          </Box>
        ))
      }
    </Box>
  );
};

export default ToolDocumentation;