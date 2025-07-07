/**
 * Debug Toolbar Component
 * 
 * A toolbar for displaying debug controls and status indicators.
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

/**
 * Debug Toolbar Props
 */
const DebugToolbarProps = {
  /**
   * Available debug commands
   */
  commands: [],
  
  /**
   * Debug state
   */
  state: null,
  
  /**
   * Component width
   */
  width: 80,
  
  /**
   * Callback when a command is executed
   */
  onCommand: () => {}
};

/**
 * Debug Toolbar Component
 */
export const DebugToolbar = ({
  commands,
  state,
  width,
  onCommand
}) => {
  // Filter commands to show only control commands
  const controlCommands = useMemo(() => {
    return commands.filter(cmd => cmd.category === 'control');
  }, [commands]);
  
  // Handle command execution
  const handleCommand = (command) => {
    if (command.enabled && onCommand) {
      onCommand(command.name);
    }
  };
  
  // Toolbar status indicator
  const statusIndicator = useMemo(() => {
    if (!state.connected) {
      return { text: 'Disconnected', color: Colors.Error };
    }
    
    if (state.paused) {
      return { text: 'Paused', color: Colors.Warning };
    }
    
    if (state.running) {
      return { text: 'Running', color: Colors.Success };
    }
    
    return { text: 'Stopped', color: Colors.TextDim };
  }, [state]);
  
  return (
    <Box 
      width={width} 
      height={1} 
      backgroundColor={Colors.BackgroundAlt}
      paddingX={1}
    >
      {/* Status indicator */}
      <Text bold color={statusIndicator.color}>{statusIndicator.text}</Text>
      
      <Text color={Colors.TextDim}> | </Text>
      
      {/* Command buttons */}
      {controlCommands.map((cmd, index) => (
        <React.Fragment key={cmd.name}>
          <Text 
            color={cmd.enabled ? Colors.Primary : Colors.TextDim}
            bold={cmd.enabled}
            dimColor={!cmd.enabled}
            underline={cmd.enabled}
            backgroundColor={cmd.enabled ? undefined : Colors.BackgroundAlt}
            onPress={cmd.enabled ? () => handleCommand(cmd) : undefined}
          >
            {cmd.icon} {cmd.name}
          </Text>
          
          {index < controlCommands.length - 1 && (
            <Text color={Colors.TextDim}> | </Text>
          )}
        </React.Fragment>
      ))}
      
      <Box flexGrow={1} justifyContent="flex-end">
        {state.lastException && (
          <Text color={Colors.Error}>
            {state.lastException.name}: {state.lastException.message}
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default DebugToolbar;