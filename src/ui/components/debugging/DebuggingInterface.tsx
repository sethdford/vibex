/**
 * Debugging Interface Component
 * 
 * A comprehensive interface for interactive debugging and runtime inspection.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { Colors } from '../../colors.js';
import { useDebugState } from './useDebugState.js';
import {
  DebuggingInterfaceProps,
  DebugPanelType,
  DebugCommand,
  DebugVariable,
  DebugBreakpoint,
  DebugWatchExpression
} from './types.js';
import { DebugToolbar } from './DebugToolbar.js';
import { VariablesPanel } from './panels/VariablesPanel.js';
import { CallStackPanel } from './panels/CallStackPanel.js';
import { BreakpointsPanel } from './panels/BreakpointsPanel.js';
import { ConsolePanel } from './panels/ConsolePanel.js';
import { WatchesPanel } from './panels/WatchesPanel.js';
import { ThreadsPanel } from './panels/ThreadsPanel.js';
import { SourcesPanel } from './panels/SourcesPanel.js';
import { SourceView } from './SourceView.js';

/**
 * Layout configuration
 */
interface LayoutConfig {
  leftPanelWidth: number;
  rightPanelWidth: number;
  mainAreaHeight: number;
  bottomPanelHeight: number;
  toolbarHeight: number;
}

/**
 * Debugging Interface Component
 */
export const DebuggingInterface: React.FC<DebuggingInterfaceProps> = ({
  width,
  height,
  initialState,
  isFocused = true,
  onExit,
  onCommand,
  onVariableEdit,
  onBreakpointAdd,
  onBreakpointRemove,
  onBreakpointUpdate,
  onWatchAdd,
  onWatchRemove,
  onWatchUpdate,
  onConsoleClear
}) => {
  // Get debug state
  const {
    state,
    commands,
    executeCommand,
    updateVariable,
    addBreakpoint,
    removeBreakpoint,
    updateBreakpoint,
    addWatch,
    removeWatch,
    updateWatch,
    clearConsole,
    selectStackFrame,
    selectThread,
    toggleVariableExpansion,
    openSource
  } = useDebugState(initialState);
  
  // State for active panels
  const [leftPanel, setLeftPanel] = useState<DebugPanelType>(DebugPanelType.VARIABLES);
  const [rightPanel, setRightPanel] = useState<DebugPanelType>(DebugPanelType.CALL_STACK);
  const [bottomPanel, setBottomPanel] = useState<DebugPanelType>(DebugPanelType.CONSOLE);
  const [focusedPanel, setFocusedPanel] = useState<'left' | 'right' | 'bottom' | 'source' | 'toolbar'>('toolbar');
  const [sourceVisible, setSourceVisible] = useState<boolean>(true);
  const [currentSourcePath, setCurrentSourcePath] = useState<string | undefined>(undefined);
  const [currentSourceContent, setCurrentSourceContent] = useState<string | undefined>(undefined);
  
  // Layout calculations
  const layout = useMemo<LayoutConfig>(() => {
    const leftPanelWidth = Math.floor(width * 0.25);
    const rightPanelWidth = Math.floor(width * 0.25);
    const toolbarHeight = 1;
    const bottomPanelHeight = Math.floor(height * 0.3);
    const mainAreaHeight = height - bottomPanelHeight - toolbarHeight - 2; // 2 for borders
    
    return {
      leftPanelWidth,
      rightPanelWidth,
      mainAreaHeight,
      bottomPanelHeight,
      toolbarHeight
    };
  }, [width, height]);
  
  // Source area width calculation
  const sourceAreaWidth = width - layout.leftPanelWidth - layout.rightPanelWidth - 2; // 2 for borders
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Exit debugging interface
    if (key.escape) {
      if (onExit) onExit();
      return;
    }
    
    // Panel navigation
    if (key.tab) {
      // Cycle through panels
      setFocusedPanel(prev => {
        switch (prev) {
          case 'left':
            return 'source';
          case 'source':
            return 'right';
          case 'right':
            return 'bottom';
          case 'bottom':
            return 'toolbar';
          case 'toolbar':
          default:
            return 'left';
        }
      });
      return;
    }
    
    // Toolbar shortcuts
    if (key.f5) {
      // Continue/Start debugging
      executeCommand('continue');
      return;
    }
    
    if (key.f10) {
      // Step over
      executeCommand('step-over');
      return;
    }
    
    if (key.f11) {
      // Step into
      if (key.shift) {
        // Step out
        executeCommand('step-out');
      } else {
        // Step into
        executeCommand('step-into');
      }
      return;
    }
    
    if (key.f9) {
      // Toggle breakpoint at current line
      if (currentSourcePath && state.currentThread?.frames[0]?.line) {
        executeCommand('toggle-breakpoint', [currentSourcePath, state.currentThread.frames[0].line]);
      }
      return;
    }
    
    // Panel shortcuts
    if (input === '1') {
      setLeftPanel(DebugPanelType.VARIABLES);
      setFocusedPanel('left');
      return;
    }
    
    if (input === '2') {
      setLeftPanel(DebugPanelType.CALL_STACK);
      setFocusedPanel('left');
      return;
    }
    
    if (input === '3') {
      setRightPanel(DebugPanelType.BREAKPOINTS);
      setFocusedPanel('right');
      return;
    }
    
    if (input === '4') {
      setRightPanel(DebugPanelType.WATCHES);
      setFocusedPanel('right');
      return;
    }
    
    if (input === '5') {
      setBottomPanel(DebugPanelType.CONSOLE);
      setFocusedPanel('bottom');
      return;
    }
    
    if (input === '6') {
      setRightPanel(DebugPanelType.THREADS);
      setFocusedPanel('right');
      return;
    }
    
    if (input === '7') {
      setLeftPanel(DebugPanelType.SOURCES);
      setFocusedPanel('left');
      return;
    }
    
    // Toggle source view
    if (input === 's') {
      setSourceVisible(prev => !prev);
      return;
    }
  }, { isActive: isFocused });
  
  // Handle command execution
  const handleCommand = useCallback(async (command: string, args?: any[]) => {
    // Execute command in the debug state
    executeCommand(command, args);
    
    // Pass to parent if provided
    if (onCommand) {
      try {
        await onCommand(command, args);
      } catch (error) {
        console.error(`Error executing command ${command}:`, error);
      }
    }
  }, [executeCommand, onCommand]);
  
  // Handle variable edit
  const handleVariableEdit = useCallback(async (variable: DebugVariable, newValue: any) => {
    // Update variable in the debug state
    updateVariable(variable, newValue);
    
    // Pass to parent if provided
    if (onVariableEdit) {
      try {
        await onVariableEdit(variable, newValue);
      } catch (error) {
        console.error(`Error updating variable ${variable.name}:`, error);
      }
    }
  }, [updateVariable, onVariableEdit]);
  
  // Handle breakpoint add
  const handleBreakpointAdd = useCallback(async (path: string, line: number, condition?: string) => {
    // Add breakpoint to the debug state
    const breakpoint = addBreakpoint(path, line, condition);
    
    // Pass to parent if provided
    if (onBreakpointAdd) {
      try {
        await onBreakpointAdd(path, line, condition);
      } catch (error) {
        console.error(`Error adding breakpoint at ${path}:${line}:`, error);
      }
    }
    
    return breakpoint;
  }, [addBreakpoint, onBreakpointAdd]);
  
  // Handle breakpoint remove
  const handleBreakpointRemove = useCallback(async (id: string) => {
    // Remove breakpoint from the debug state
    removeBreakpoint(id);
    
    // Pass to parent if provided
    if (onBreakpointRemove) {
      try {
        await onBreakpointRemove(id);
      } catch (error) {
        console.error(`Error removing breakpoint ${id}:`, error);
      }
    }
  }, [removeBreakpoint, onBreakpointRemove]);
  
  // Handle breakpoint update
  const handleBreakpointUpdate = useCallback(async (id: string, updates: Partial<DebugBreakpoint>) => {
    // Update breakpoint in the debug state
    const breakpoint = updateBreakpoint(id, updates);
    
    // Pass to parent if provided
    if (onBreakpointUpdate) {
      try {
        await onBreakpointUpdate(id, updates);
      } catch (error) {
        console.error(`Error updating breakpoint ${id}:`, error);
      }
    }
    
    return breakpoint;
  }, [updateBreakpoint, onBreakpointUpdate]);
  
  // Handle watch add
  const handleWatchAdd = useCallback(async (expression: string) => {
    // Add watch to the debug state
    const watch = addWatch(expression);
    
    // Pass to parent if provided
    if (onWatchAdd) {
      try {
        await onWatchAdd(expression);
      } catch (error) {
        console.error(`Error adding watch expression ${expression}:`, error);
      }
    }
    
    return watch;
  }, [addWatch, onWatchAdd]);
  
  // Handle watch remove
  const handleWatchRemove = useCallback(async (id: string) => {
    // Remove watch from the debug state
    removeWatch(id);
    
    // Pass to parent if provided
    if (onWatchRemove) {
      try {
        await onWatchRemove(id);
      } catch (error) {
        console.error(`Error removing watch expression ${id}:`, error);
      }
    }
  }, [removeWatch, onWatchRemove]);
  
  // Handle watch update
  const handleWatchUpdate = useCallback(async (id: string, updates: Partial<DebugWatchExpression>) => {
    // Update watch in the debug state
    const watch = updateWatch(id, updates);
    
    // Pass to parent if provided
    if (onWatchUpdate) {
      try {
        await onWatchUpdate(id, updates);
      } catch (error) {
        console.error(`Error updating watch expression ${id}:`, error);
      }
    }
    
    return watch;
  }, [updateWatch, onWatchUpdate]);
  
  // Handle console clear
  const handleConsoleClear = useCallback(() => {
    // Clear console in the debug state
    clearConsole();
    
    // Pass to parent if provided
    if (onConsoleClear) {
      onConsoleClear();
    }
  }, [clearConsole, onConsoleClear]);
  
  // Handle stack frame select
  const handleFrameSelect = useCallback((frame: any) => {
    selectStackFrame(frame.id);
  }, [selectStackFrame]);
  
  // Handle thread select
  const handleThreadSelect = useCallback((thread: any) => {
    selectThread(thread.id);
  }, [selectThread]);
  
  // Handle source open
  const handleSourceOpen = useCallback((path: string, line?: number) => {
    openSource(path, line);
    setCurrentSourcePath(path);
    
    // In a real implementation, we would load the source content
    // For now, we'll just set a placeholder
    setCurrentSourceContent(`// Source code for ${path}\n// Line ${line || 1}`);
    
    setSourceVisible(true);
  }, [openSource]);
  
  // Render left panel based on active panel type
  const renderLeftPanel = () => {
    const panelProps = {
      width: layout.leftPanelWidth,
      height: layout.mainAreaHeight,
      isFocused: focusedPanel === 'left',
      state,
      onCommand: handleCommand,
      onFocusChange: () => setFocusedPanel('left')
    };
    
    switch (leftPanel) {
      case DebugPanelType.VARIABLES:
        return (
          <VariablesPanel
            {...panelProps}
            variables={state.variables}
            onVariableEdit={handleVariableEdit}
            onVariableToggle={toggleVariableExpansion}
          />
        );
      case DebugPanelType.CALL_STACK:
        return (
          <CallStackPanel
            {...panelProps}
            callstack={state.callstack}
            onFrameSelect={handleFrameSelect}
          />
        );
      case DebugPanelType.SOURCES:
        return (
          <SourcesPanel
            {...panelProps}
            currentFile={currentSourcePath}
            currentLine={state.currentThread?.frames[0]?.line}
            onSourceOpen={handleSourceOpen}
          />
        );
      default:
        return null;
    }
  };
  
  // Render right panel based on active panel type
  const renderRightPanel = () => {
    const panelProps = {
      width: layout.rightPanelWidth,
      height: layout.mainAreaHeight,
      isFocused: focusedPanel === 'right',
      state,
      onCommand: handleCommand,
      onFocusChange: () => setFocusedPanel('right')
    };
    
    switch (rightPanel) {
      case DebugPanelType.BREAKPOINTS:
        return (
          <BreakpointsPanel
            {...panelProps}
            breakpoints={state.breakpoints}
            onBreakpointAdd={handleBreakpointAdd}
            onBreakpointRemove={handleBreakpointRemove}
            onBreakpointUpdate={handleBreakpointUpdate}
          />
        );
      case DebugPanelType.WATCHES:
        return (
          <WatchesPanel
            {...panelProps}
            watches={state.watches}
            onWatchAdd={handleWatchAdd}
            onWatchRemove={handleWatchRemove}
            onWatchUpdate={handleWatchUpdate}
          />
        );
      case DebugPanelType.THREADS:
        return (
          <ThreadsPanel
            {...panelProps}
            threads={state.threads}
            onThreadSelect={handleThreadSelect}
          />
        );
      default:
        return null;
    }
  };
  
  // Render bottom panel based on active panel type
  const renderBottomPanel = () => {
    const panelProps = {
      width: width - 2,
      height: layout.bottomPanelHeight,
      isFocused: focusedPanel === 'bottom',
      state,
      onCommand: handleCommand,
      onFocusChange: () => setFocusedPanel('bottom')
    };
    
    switch (bottomPanel) {
      case DebugPanelType.CONSOLE:
        return (
          <ConsolePanel
            {...panelProps}
            messages={state.console}
            onClear={handleConsoleClear}
            onCommand={handleCommand}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Debugging toolbar */}
      <DebugToolbar
        commands={commands}
        state={state}
        width={width}
        onCommand={handleCommand}
      />
      
      {/* Main content area */}
      <Box height={layout.mainAreaHeight}>
        {/* Left panel */}
        <Box
          width={layout.leftPanelWidth}
          height={layout.mainAreaHeight}
          borderStyle="single"
          borderColor={focusedPanel === 'left' ? Colors.Primary : Colors.Border}
        >
          {renderLeftPanel()}
        </Box>
        
        {/* Source view (middle panel) */}
        {sourceVisible && currentSourcePath && (
          <Box 
            width={sourceAreaWidth} 
            height={layout.mainAreaHeight}
            borderStyle="single"
            borderColor={focusedPanel === 'source' ? Colors.Primary : Colors.Border}
          >
            <SourceView
              path={currentSourcePath}
              content={currentSourceContent || ''}
              currentLine={state.currentThread?.frames[0]?.line}
              breakpoints={state.breakpoints.filter(bp => bp.path === currentSourcePath)}
              width={sourceAreaWidth - 2}
              height={layout.mainAreaHeight - 2}
              isFocused={focusedPanel === 'source'}
              onBreakpointToggle={(line) => handleBreakpointAdd(currentSourcePath, line)}
            />
          </Box>
        )}
        
        {/* Right panel */}
        <Box
          width={layout.rightPanelWidth}
          height={layout.mainAreaHeight}
          borderStyle="single"
          borderColor={focusedPanel === 'right' ? Colors.Primary : Colors.Border}
        >
          {renderRightPanel()}
        </Box>
      </Box>
      
      {/* Bottom panel */}
      <Box
        width={width}
        height={layout.bottomPanelHeight}
        borderStyle="single"
        borderColor={focusedPanel === 'bottom' ? Colors.Primary : Colors.Border}
      >
        {renderBottomPanel()}
      </Box>
      
      {/* Status bar */}
      <Box width={width} height={1}>
        <Text color={Colors.Primary}>
          {state.paused 
            ? `Paused at ${state.currentThread?.frames[0]?.path}:${state.currentThread?.frames[0]?.line}` 
            : state.running 
              ? 'Running' 
              : 'Stopped'}
        </Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={Colors.TextDim}>
            <Text color={Colors.AccentBlue}>Tab</Text> to switch panels | 
            <Text color={Colors.AccentBlue}> F5</Text> continue | 
            <Text color={Colors.AccentBlue}> F10</Text> step over | 
            <Text color={Colors.AccentBlue}> F11</Text> step into | 
            <Text color={Colors.AccentBlue}> S</Text> toggle source | 
            <Text color={Colors.AccentBlue}> Esc</Text> exit
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default DebuggingInterface;