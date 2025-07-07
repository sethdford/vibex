/**
 * Debugging Interface Example
 * 
 * Example implementation showing how to integrate the Debugging Interface
 * into an application.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { DebuggingInterface } from './index.js';
import { DebugState } from './types.js';

interface DebuggingInterfaceExampleProps {
  /**
   * Width of the component
   */
  width?: number;
  
  /**
   * Height of the component
   */
  height?: number;
}

/**
 * Example component that demonstrates the usage of the DebuggingInterface
 */
export const DebuggingInterfaceExample: React.FC<DebuggingInterfaceExampleProps> = ({
  width = 120,
  height = 40
}) => {
  // State for managing debug state
  const [initialState, setInitialState] = useState<Partial<DebugState>>(undefined);
  
  // Example handlers for debugging commands
  const handleCommand = async (command: string, args?: any[]) => {
    console.log(`Executing debug command: ${command}`, args);
    // In a real implementation, this would forward commands to a debugger
    return true;
  };
  
  const handleVariableEdit = async (variable: any, newValue: any) => {
    console.log(`Editing variable ${variable.name} to ${newValue}`);
    // In a real implementation, this would update the variable in the debugger
    return true;
  };
  
  const handleBreakpointAdd = async (path: string, line: number, condition?: string) => {
    console.log(`Adding breakpoint at ${path}:${line}${condition ? ` with condition: ${condition}` : ''}`);
    // In a real implementation, this would add a breakpoint in the debugger
    return {
      id: `bp-${Date.now()}`,
      path,
      line,
      condition,
      enabled: true,
      hitCount: 0
    };
  };
  
  const handleBreakpointRemove = async (id: string) => {
    console.log(`Removing breakpoint ${id}`);
    // In a real implementation, this would remove the breakpoint from the debugger
  };
  
  const handleBreakpointUpdate = async (id: string, updates: any) => {
    console.log(`Updating breakpoint ${id}:`, updates);
    // In a real implementation, this would update the breakpoint in the debugger
    return {
      id,
      path: 'path/to/file.js',
      line: 1,
      enabled: true,
      hitCount: 0,
      ...updates
    };
  };
  
  const handleWatchAdd = async (expression: string) => {
    console.log(`Adding watch: ${expression}`);
    // In a real implementation, this would add a watch expression to the debugger
    return {
      id: `watch-${Date.now()}`,
      expression,
      value: 'Pending evaluation...',
      type: 'string',
      enabled: true,
      showType: true,
      timestamp: new Date()
    };
  };
  
  const handleWatchRemove = async (id: string) => {
    console.log(`Removing watch ${id}`);
    // In a real implementation, this would remove the watch from the debugger
  };
  
  const handleWatchUpdate = async (id: string, updates: any) => {
    console.log(`Updating watch ${id}:`, updates);
    // In a real implementation, this would update the watch in the debugger
    return {
      id,
      expression: 'expression',
      value: 'Updated value',
      type: 'string',
      enabled: true,
      showType: true,
      timestamp: new Date(),
      ...updates
    };
  };
  
  const handleExit = () => {
    console.log('Exiting debug mode');
    // In a real implementation, this would stop debugging and return to normal mode
  };
  
  return (
    <Box flexDirection="column">
      <Box
        paddingX={1}
        paddingY={0}
        borderStyle="single"
        borderColor={Colors.Border}
        backgroundColor={Colors.BackgroundAlt}
        marginBottom={1}
      >
        <Text bold color={Colors.Primary}>Debugging Interface Example</Text>
      </Box>
      
      <DebuggingInterface
        width={width}
        height={height - 2}
        initialState={initialState}
        onExit={handleExit}
        onCommand={handleCommand}
        onVariableEdit={handleVariableEdit}
        onBreakpointAdd={handleBreakpointAdd}
        onBreakpointRemove={handleBreakpointRemove}
        onBreakpointUpdate={handleBreakpointUpdate}
        onWatchAdd={handleWatchAdd}
        onWatchRemove={handleWatchRemove}
        onWatchUpdate={handleWatchUpdate}
      />
    </Box>
  );
};

export default DebuggingInterfaceExample;