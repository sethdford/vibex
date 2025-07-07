/**
 * Progress Display Component
 * 
 * Displays active progress bars from the ProgressContext
 * with enhanced visuals and detailed information
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ProgressData } from '../contexts/ProgressContext.js';
import { useProgress } from '../contexts/ProgressContext.js';
import { ProgressSystem } from './progress-system/index.js';
import { DetailedProgressInfo } from './DetailedProgressInfo.js';
import { Colors } from '../colors.js';

/**
 * Progress display props
 */
interface ProgressDisplayProps {
  /**
   * Maximum number of progress bars to show
   */
  maxItems?: number;
  
  /**
   * Maximum width for progress bars
   */
  width?: number;
  
  /**
   * Display style ('default' | 'compact' | 'detailed' | 'mini')
   */
  style?: 'default' | 'compact' | 'detailed' | 'mini';
  
  /**
   * Whether to show detailed info for each progress item
   */
  showDetailed?: boolean;
  
  /**
   * Whether to show status icons
   */
  showStatus?: boolean;
  
  /**
   * Whether to show time estimates
   */
  showTimeEstimate?: boolean;
  
  /**
   * Whether to show step counters
   */
  showSteps?: boolean;
  
  /**
   * Whether to animate progress bars
   */
  animated?: boolean;
}

/**
 * Progress display component
 */
export const ProgressDisplay: React.FC<ProgressDisplayProps> = ({
  maxItems = 3,
  width = 40,
  style = 'default',
  showDetailed = false,
  showStatus = true,
  showTimeEstimate = true,
  showSteps = true,
  animated = true,
}) => {
  const { progressItems } = useProgress();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  
  // Convert progress items to array and sort by start time
  const items = Array.from(progressItems.values())
    .sort((a, b) => a.startTime - b.startTime)
    .slice(0, maxItems);
  
  // No progress items to show
  if (items.length === 0) {
    return null;
  }
  
  // Toggle expanded state for an item
  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  // Handle keyboard navigation
  useInput((input, key) => {
    if (style === 'detailed') {
      // Move focus with arrow keys
      if (key.downArrow) {
        setFocusedIndex(prev => Math.min(items.length - 1, prev + 1));
      } else if (key.upArrow) {
        setFocusedIndex(prev => Math.max(0, prev - 1));
      }
      
      // Toggle expanded state with space/enter
      if ((key.return || input === ' ') && focusedIndex >= 0 && focusedIndex < items.length) {
        toggleExpanded(items[focusedIndex].id);
      }
    }
  });
  
  // Determine border style based on display style
  const borderStyle = style === 'compact' || style === 'mini' ? undefined : 'round';
  const usePadding = style !== 'mini';
  
  // Render based on display style
  const renderProgressItem = (item: ProgressData, index: number) => {
    const isExpanded = expandedItems.has(item.id);
    const isFocused = index === focusedIndex;
    const percentage = (item.value / item.total) * 100;
    
    // Mini style: just show indicators
    if (style === 'mini') {
      return (
        <Box key={item.id} marginRight={2}>
          <ProgressSystem 
            mode="mini"
            label={item.label}
            value={item.value / item.total * 100}
            active={item.active}
            status={item.status}
            showPercentage={true}
            size="small"
            animated={animated}
          />
        </Box>
      );
    }
    
    // Compact style: simpler display
    if (style === 'compact') {
      return (
        <Box key={item.id} marginBottom={1}>
          <Box marginRight={1}>
            {showStatus && (
              <ProgressSystem 
                mode={item.indeterminate ? "indeterminate" : "mini"}
                status={item.status}
                active={item.active}
                size="small"
                animated={animated}
              />
            )}
          </Box>
          
          <Box flexGrow={1}>
            <Text bold>{item.label}</Text>
            {item.message && <Text dimColor> - {item.message}</Text>}
          </Box>
          
          <Box marginLeft={1}>
            <Text>{percentage.toFixed(0)}%</Text>
          </Box>
        </Box>
      );
    }
    
    // Detailed style: rich information
    if (style === 'detailed' || showDetailed) {
      return (
        <DetailedProgressInfo 
          key={item.id}
          id={item.id}
          label={item.label}
          value={item.value}
          total={item.total}
          steps={item.steps}
          status={item.status}
          startTime={item.startTime}
          updateTime={item.updateTime}
          endTime={item.endTime}
          active={item.active}
          message={item.message}
          estimatedTimeRemaining={item.estimatedTimeRemaining}
          initiallyExpanded={isExpanded}
          showExpandControl={true}
        />
      );
    }
    
    // Default style: standard progress bars
    return (
      <Box key={item.id} flexDirection="column" marginBottom={1}>
        <Box marginBottom={0}>
          <Text bold>{item.label}</Text>
          {item.message && (
            <Box marginLeft={1}>
              <Text dimColor>{item.message}</Text>
            </Box>
          )}
        </Box>
        
        {item.indeterminate ? (
          <ProgressSystem 
            mode="indeterminate"
            active={item.active}
            width={width}
            label=""
            status={item.status}
            showStatus={showStatus}
            stepNumber={item.currentStep}
            totalSteps={item.totalSteps}
            showSteps={showSteps}
            animationStyle="bounce"
            message={item.message}
          />
        ) : (
          <ProgressSystem 
            mode="standard"
            value={percentage}
            width={width}
            label=""
            showPercentage={true}
            status={item.status}
            showStatus={showStatus}
            stepNumber={item.currentStep}
            totalSteps={item.totalSteps}
            showSteps={showSteps}
            estimatedTimeRemaining={item.estimatedTimeRemaining}
            showETA={showTimeEstimate}
            animated={animated}
          />
        )}
      </Box>
    );
  };
  
  // Render mini-style specially (horizontal)
  if (style === 'mini') {
    return (
      <Box>
        {items.map((item, index) => renderProgressItem(item, index))}
        {progressItems.size > maxItems && (
          <Text dimColor>+{progressItems.size - maxItems}</Text>
        )}
      </Box>
    );
  }
  
  // Render all other styles (vertical)
  return (
    <Box 
      flexDirection="column" 
      borderStyle={borderStyle} 
      borderColor={borderStyle ? Colors.TextDim : undefined}
      padding={usePadding ? 1 : 0}
    >
      {style !== 'compact' && (
        <Box marginBottom={1}>
          <Text bold>Active Tasks</Text>
          {items.length > 0 && (
            <Text dimColor> ({items.length})</Text>
          )}
        </Box>
      )}
      
      {items.map((item, index) => renderProgressItem(item, index))}
      
      {progressItems.size > maxItems && (
        <Box marginTop={1}>
          <Text dimColor>
            +{progressItems.size - maxItems} more tasks...
          </Text>
        </Box>
      )}
    </Box>
  );
};