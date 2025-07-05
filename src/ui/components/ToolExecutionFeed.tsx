/**
 * Tool Execution Feed Component
 * 
 * Displays a real-time feed of tool executions with organized status updates,
 * matching and exceeding Claude Code's interface design.
 */

import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { ToolExecutionDisplay, useToolExecutionTracking } from './ToolExecutionDisplay.js';
import type { ToolExecutionEntry } from './ToolExecutionDisplay.js';

/**
 * Feed display mode
 */
export type FeedDisplayMode = 'compact' | 'detailed' | 'minimal';

/**
 * Props for tool execution feed
 */
interface ToolExecutionFeedProps {
  /**
   * Display mode
   */
  mode?: FeedDisplayMode;
  
  /**
   * Maximum number of executions to show
   */
  maxItems?: number;
  
  /**
   * Whether to show completed executions
   */
  showCompleted?: boolean;
  
  /**
   * Whether to auto-scroll to latest
   */
  autoScroll?: boolean;
  
  /**
   * Maximum width for the feed
   */
  maxWidth?: number;
  
  /**
   * Whether the feed is focused for input
   */
  isFocused?: boolean;
  
  /**
   * Title for the feed
   */
  title?: string;
}

/**
 * Tool execution feed component
 */
export const ToolExecutionFeed: React.FC<ToolExecutionFeedProps> = ({
  mode = 'detailed',
  maxItems = 10,
  showCompleted = true,
  autoScroll = true,
  maxWidth = 100,
  isFocused = false,
  title = 'Tool Execution Feed',
}) => {
  const { executions } = useToolExecutionTracking();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAll, setShowAll] = useState(showCompleted);
  
  // Get active executions
  const getActiveExecutions = (): ToolExecutionEntry[] => {
    return executions.filter(e => e.state === 'executing' || e.state === 'pending');
  };
  
  // Get all executions
  const getAllExecutions = (): ToolExecutionEntry[] => {
    return executions;
  };
  
  // Filter executions based on settings
  const getDisplayExecutions = (): ToolExecutionEntry[] => {
    let filtered = showAll ? getAllExecutions() : getActiveExecutions();
    
    // Sort by start time (newest first)
    filtered.sort((a: ToolExecutionEntry, b: ToolExecutionEntry) => b.startTime - a.startTime);
    
    // Limit items
    if (maxItems > 0) {
      filtered = filtered.slice(0, maxItems);
    }
    
    return filtered;
  };
  
  const displayExecutions = getDisplayExecutions();
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(displayExecutions.length - 1, selectedIndex + 1));
    } else if (input === 't') {
      setShowAll(!showAll);
    } else if (input === 'c') {
      // Clear completed executions (would need implementation)
    }
  });
  
  // Auto-scroll to latest when new executions arrive
  useEffect(() => {
    if (autoScroll && displayExecutions.length > 0) {
      setSelectedIndex(0);
    }
  }, [displayExecutions.length, autoScroll]);
  
  // Render execution summary
  const renderSummary = () => {
    const active = getActiveExecutions();
    const completed = getAllExecutions().filter((e: ToolExecutionEntry) => 
      e.state === 'completed' || e.state === 'failed' || e.state === 'cancelled'
    );
    
    if (mode === 'minimal') return null;
    
    return (
      <Box marginBottom={1}>
        <Text color={Colors.TextDim}>
          Active: </Text>
        <Text color={Colors.Info} bold>{active.length}</Text>
        <Text color={Colors.TextDim}> | Completed: </Text>
        <Text color={Colors.Success} bold>{completed.length}</Text>
        {isFocused && (
          <>
            <Text color={Colors.TextDim}> | Press </Text>
            <Text color={Colors.Primary} bold>t</Text>
            <Text color={Colors.TextDim}> to toggle view</Text>
          </>
        )}
      </Box>
    );
  };
  
  // Render empty state
  const renderEmptyState = () => (
    <Box 
      borderStyle="round" 
      borderColor={Colors.TextDim} 
      padding={2}
      justifyContent="center"
    >
      <Text color={Colors.TextDim}>
        No tool executions {showAll ? '' : 'active'}
      </Text>
    </Box>
  );
  
  // Render compact mode
  const renderCompactMode = () => (
    <Box flexDirection="column">
      {displayExecutions.map((execution, index) => {
        const isSelected = isFocused && index === selectedIndex;
        const statusIcon = getCompactStatusIcon(execution.state);
        const statusColor = getCompactStatusColor(execution.state);
        
        return (
          <Box 
            key={execution.id}
            borderStyle={isSelected ? "single" : undefined}
            borderColor={isSelected ? Colors.Primary : undefined}
            paddingX={isSelected ? 1 : 0}
          >
            <Box marginRight={1}>
              <Text color={statusColor}>{statusIcon}</Text>
            </Box>
            
            <Box width={15}>
              <Text color={Colors.Primary}>{String(execution.toolCall.tool)}</Text>
            </Box>
            
            <Box width={20}>
              <Text color={Colors.TextDim}>
                {execution.toolCall.parameters ? 'With params' : 'No params'}
              </Text>
            </Box>
            
            <Box width={10}>
              <Text color={statusColor}>
                {execution.state}
              </Text>
            </Box>
            
            <Box>
              <Text color={Colors.TextDim}>
                {formatCompactTime(execution)}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
  
  // Render detailed mode
  const renderDetailedMode = () => (
    <Box flexDirection="column">
      {displayExecutions.map((execution, index) => {
        return (
          <Box key={execution.id} marginBottom={1}>
            <ToolExecutionDisplay
              executions={[execution]}
              maxEntries={1}
              showCompleted={true}
              showDetails={true}
              compact={false}
              maxWidth={maxWidth - 4}
              showMetrics={false}
            />
          </Box>
        );
      })}
    </Box>
  );
  
  // Main render
  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={Colors.Primary} bold>
          {title}
        </Text>
      </Box>
      
      {/* Summary */}
      {renderSummary()}
      
      {/* Content */}
      {displayExecutions.length === 0 ? (
        renderEmptyState()
      ) : mode === 'compact' ? (
        renderCompactMode()
      ) : (
        renderDetailedMode()
      )}
    </Box>
  );
};

// Helper functions
function getCompactStatusIcon(state: string): string {
  switch (state) {
    case 'pending': return '⏳';
    case 'executing': return '⚡';
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'cancelled': return '⏹️';
    default: return '❓';
  }
}

function getCompactStatusColor(state: string): string {
  switch (state) {
    case 'pending': return Colors.Warning;
    case 'executing': return Colors.Info;
    case 'completed': return Colors.Success;
    case 'failed': return Colors.Error;
    case 'cancelled': return Colors.TextDim;
    default: return Colors.TextDim;
  }
}

function formatCompactTime(execution: ToolExecutionEntry): string {
  const now = Date.now();
  const elapsed = now - execution.startTime;
  
  if (elapsed < 1000) return `${elapsed}ms`;
  if (elapsed < 60000) return `${Math.floor(elapsed / 1000)}s`;
  return `${Math.floor(elapsed / 60000)}m`;
}

/**
 * Hook for managing tool execution feed
 */
export function useToolExecutionFeed() {
  const [feedVisible, setFeedVisible] = useState(false);
  const [feedMode, setFeedMode] = useState<FeedDisplayMode>('detailed');
  
  const showFeed = () => setFeedVisible(true);
  const hideFeed = () => setFeedVisible(false);
  const toggleFeed = () => setFeedVisible(!feedVisible);
  
  const setMode = (mode: FeedDisplayMode) => setFeedMode(mode);
  
  return {
    feedVisible,
    feedMode,
    showFeed,
    hideFeed,
    toggleFeed,
    setMode,
  };
} 