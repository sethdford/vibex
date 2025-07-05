/**
 * Comprehensive Demo Application - Simplified Version
 * 
 * The ultimate demonstration of all Day 3 features
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Colors } from '../colors.js';
import { logger } from '../../utils/logger.js';

// Import demo components
import ComprehensiveTestingDemo from './ComprehensiveTestingDemo.js';
import IntelligentErrorRecoveryDemo from './IntelligentErrorRecoveryDemo.js';
import AdvancedWorkflowControlsDemo from './AdvancedWorkflowControlsDemo.js';

/**
 * Demo modes
 */
export type DemoMode = 
  | 'overview'
  | 'testing-framework'
  | 'error-recovery'
  | 'advanced-controls';

/**
 * Demo modes configuration
 */
const DEMO_MODES = [
  {
    id: 'overview' as DemoMode,
    name: 'Feature Overview',
    description: 'High-level overview of all Day 3 capabilities',
    icon: '🌟',
  },
  {
    id: 'testing-framework' as DemoMode,
    name: 'Testing Framework',
    description: 'Comprehensive testing with live results',
    icon: '🧪',
  },
  {
    id: 'error-recovery' as DemoMode,
    name: 'Intelligent Error Recovery',
    description: 'Smart error detection and automatic recovery',
    icon: '🛠️',
  },
  {
    id: 'advanced-controls' as DemoMode,
    name: 'Advanced Workflow Controls',
    description: 'Sophisticated debugging and workflow management',
    icon: '🎛️',
  },
];

/**
 * Comprehensive demo props
 */
export interface ComprehensiveDemoProps {
  isFocused?: boolean;
  maxWidth?: number;
  showPerformance?: boolean;
  enableAllFeatures?: boolean;
}

/**
 * Comprehensive demo component
 */
export const ComprehensiveDemo: React.FC<ComprehensiveDemoProps> = ({
  isFocused = true,
  maxWidth = 120,
  showPerformance = true,
}) => {
  const { exit } = useApp();
  
  // Demo state
  const [currentMode, setCurrentMode] = useState<DemoMode>('overview');
  const [selectedModeIndex, setSelectedModeIndex] = useState(0);
  const [demoStartTime] = useState(Date.now());
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Update session duration
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionDuration(Date.now() - demoStartTime);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [demoStartTime]);
  
  // Switch to selected mode
  const switchToMode = useCallback((mode: DemoMode) => {
    setCurrentMode(mode);
    setIsRunning(true);
    logger.info('Demo mode switched', { mode, timestamp: Date.now() });
  }, []);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (key.escape || input === 'q') {
      exit();
    } else if (input === 'h') {
      setShowHelp(prev => !prev);
    } else if (input === ' ') {
      setIsRunning(prev => !prev);
    } else if (key.return) {
      const selectedMode = DEMO_MODES[selectedModeIndex];
      switchToMode(selectedMode.id);
    } else if (key.upArrow) {
      setSelectedModeIndex(Math.max(0, selectedModeIndex - 1));
    } else if (key.downArrow) {
      setSelectedModeIndex(Math.min(DEMO_MODES.length - 1, selectedModeIndex + 1));
    }
  });
  
  // Get current mode configuration
  const currentModeConfig = DEMO_MODES.find(mode => mode.id === currentMode) || DEMO_MODES[0];
  
  // Render demo header
  const renderDemoHeader = (): React.ReactNode => {
    const uptime = Math.floor(sessionDuration / 1000);
    const minutes = Math.floor(uptime / 60);
    const seconds = uptime % 60;
    
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={Colors.Primary} bold>
            🌟 Vibex Day 3 - Comprehensive Demo Application
          </Text>
          <Box marginLeft={2}>
            <Text color={isRunning ? Colors.Success : Colors.TextDim}>
              [{isRunning ? 'RUNNING' : 'PAUSED'}]
            </Text>
          </Box>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            The ultimate showcase of all Day 3 features working together
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>
            Session: {minutes}m {seconds}s
          </Text>
          <Box marginLeft={4}>
            <Text color={Colors.Text}>
              Mode: {currentModeConfig.icon} {currentModeConfig.name}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };
  
  // Render mode selector
  const renderModeSelector = (): React.ReactNode => {
    if (showHelp || currentMode !== 'overview') return null;
    
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="blue">
        <Box marginBottom={1}>
          <Text color={Colors.Info} bold>
            🎮 Demo Modes (Press Enter to launch, ↑/↓ to navigate)
          </Text>
        </Box>
        
        {DEMO_MODES.map((mode, index) => {
          const isSelected = index === selectedModeIndex;
          
          return (
            <Box key={mode.id} marginBottom={1}>
              <Text color={isSelected ? Colors.Primary : Colors.TextDim}>
                {isSelected ? '▶ ' : '  '}
              </Text>
              <Text color={Colors.Text}>
                {mode.icon} {mode.name}
              </Text>
            </Box>
          );
        })}
      </Box>
    );
  };
  
  // Render current demo mode
  const renderCurrentMode = (): React.ReactNode => {
    if (!isRunning || currentMode === 'overview') return null;
    
    const commonProps = {
      isFocused: isFocused,
      maxWidth: maxWidth - 4,
    };
    
    switch (currentMode) {
      case 'testing-framework':
        return (
          <Box borderStyle="single" borderColor="cyan" padding={1}>
            <ComprehensiveTestingDemo {...commonProps} />
          </Box>
        );
        
      case 'error-recovery':
        return (
          <Box borderStyle="single" borderColor="yellow" padding={1}>
            <IntelligentErrorRecoveryDemo {...commonProps} />
          </Box>
        );
        
      case 'advanced-controls':
        return (
          <Box borderStyle="single" borderColor="blue" padding={1}>
            <AdvancedWorkflowControlsDemo {...commonProps} />
          </Box>
        );
        
      default:
        return (
          <Box justifyContent="center" padding={2}>
            <Text color={Colors.TextDim}>
              Demo mode "{currentMode}" ready to launch
            </Text>
          </Box>
        );
    }
  };
  
  // Render help screen
  const renderHelp = (): React.ReactNode => {
    if (!showHelp) return null;
    
    return (
      <Box flexDirection="column" borderStyle="double" borderColor="green" padding={1}>
        <Box marginBottom={1}>
          <Text color={Colors.Success} bold>
            📖 Help & Controls
          </Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text color={Colors.Text} bold>Navigation:</Text>
        </Box>
        <Text color={Colors.TextDim}>↑/↓: Navigate modes  Enter: Launch mode</Text>
        
        <Box marginTop={1}>
          <Text color={Colors.Text} bold>Quick Keys:</Text>
        </Box>
        <Text color={Colors.TextDim}>Space: Pause/Resume  Q/Esc: Quit</Text>
        
        <Box marginTop={1}>
          <Text color={Colors.Text} bold>Information:</Text>
        </Box>
        <Text color={Colors.TextDim}>H: Toggle help</Text>
        
        <Box marginTop={1}>
          <Text color={Colors.Text} bold>All Day 3 Features:</Text>
        </Box>
        <Text color={Colors.Info}>• Real-time State Management</Text>
        <Text color={Colors.Info}>• Advanced Workflow Controls</Text>
        <Text color={Colors.Info}>• Intelligent Error Recovery</Text>
        <Text color={Colors.Info}>• Comprehensive Testing Framework</Text>
        <Text color={Colors.Info}>• Performance Monitoring</Text>
        <Text color={Colors.Info}>• Dynamic UI Layouts</Text>
      </Box>
    );
  };
  
  // Render status bar
  const renderStatusBar = (): React.ReactNode => {
    return (
      <Box marginTop={1} borderStyle="single" borderColor="gray">
        <Text color={Colors.TextDim}>
          H: Help • Space: Pause • Q: Quit • Mode: {currentModeConfig.name}
        </Text>
      </Box>
    );
  };
  
  // Main render
  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Demo header */}
      {renderDemoHeader()}
      
      {/* Help screen */}
      {renderHelp()}
      
      {/* Mode selector (only in overview mode) */}
      {renderModeSelector()}
      
      {/* Current demo mode */}
      {renderCurrentMode()}
      
      {/* Status bar */}
      {renderStatusBar()}
    </Box>
  );
};

export default ComprehensiveDemo;
