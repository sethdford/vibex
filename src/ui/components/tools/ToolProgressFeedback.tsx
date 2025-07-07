/**
 * Tool Progress Feedback Component
 * 
 * Displays real-time feedback for long-running tool operations,
 * including progress bars, status updates, and estimated time remaining.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { ProgressSystem } from '../progress-system/index.js';
import { ToolCall } from '../../../core/domain/tool/tool-interfaces';

/**
 * Progress feedback data for a tool
 */
export interface ToolProgressData {
  /**
   * Message describing current operation
   */
  message?: string;
  
  /**
   * Current progress value (0-100)
   */
  percentage?: number;
  
  /**
   * Status of the operation
   */
  status?: 'pending' | 'in_progress' | 'completed' | 'error' | string;
  
  /**
   * Optional step information
   */
  step?: {
    /**
     * Current step number
     */
    current: number;
    
    /**
     * Total number of steps
     */
    total: number;
    
    /**
     * Description of current step
     */
    description?: string;
  };
  
  /**
   * Estimated time remaining in seconds
   */
  estimatedTimeRemaining?: number;
  
  /**
   * Optional detailed information
   */
  details?: Record<string, unknown>;
}

/**
 * Props for the ToolProgressFeedback component
 */
export interface ToolProgressFeedbackProps {
  /**
   * The tool call to display progress for
   */
  toolCall?: ToolCall;
  
  /**
   * Custom progress data (if not using toolCall)
   */
  progressData?: ToolProgressData;
  
  /**
   * Width of the progress bar
   */
  width?: number;
  
  /**
   * Display style
   */
  style?: 'default' | 'compact' | 'detailed' | 'mini';
  
  /**
   * Whether to show detailed information
   */
  showDetails?: boolean;
  
  /**
   * Whether to show time estimates
   */
  showTimeEstimate?: boolean;
  
  /**
   * Whether to animate the progress bar
   */
  animated?: boolean;
  
  /**
   * Whether to show step information
   */
  showSteps?: boolean;
}

/**
 * Tool Progress Feedback Component
 */
export const ToolProgressFeedback: React.FC<ToolProgressFeedbackProps> = ({
  toolCall,
  progressData,
  width = 40,
  style = 'default',
  showDetails = false,
  showTimeEstimate = true,
  animated = true,
  showSteps = true
}) => {
  // Use either toolCall or progressData
  const data: ToolProgressData = progressData || {};
  
  // Extract information from toolCall if available
  if (toolCall) {
    // Update data from toolCall
    data.status = toolCall.status;
    
    // Handle progress information from various places
    if (toolCall.progress) {
      data.message = toolCall.progress.message || data.message;
      data.percentage = toolCall.progress.percentage || data.percentage;
      
      if (toolCall.progress.step && toolCall.progress.totalSteps) {
        data.step = {
          current: toolCall.progress.step,
          total: toolCall.progress.totalSteps,
          description: toolCall.progress.stepDescription
        };
      }
      
      data.estimatedTimeRemaining = toolCall.progress.estimatedTimeRemaining || data.estimatedTimeRemaining;
      data.details = toolCall.progress.details || data.details;
    }
  }
  
  // Default values
  const status = data.status || 'pending';
  const message = data.message || getDefaultMessage(status);
  const percentage = data.percentage !== undefined ? data.percentage : 
    (status === 'completed' ? 100 : (status === 'in_progress' ? 25 : 0));
  const isIndeterminate = data.percentage === undefined && status === 'in_progress';
  
  // Compute time display
  let timeDisplay = '';
  if (showTimeEstimate && data.estimatedTimeRemaining !== undefined) {
    if (data.estimatedTimeRemaining < 60) {
      timeDisplay = `${Math.ceil(data.estimatedTimeRemaining)}s remaining`;
    } else {
      timeDisplay = `${Math.ceil(data.estimatedTimeRemaining / 60)}m remaining`;
    }
  }
  
  // Get label from toolCall or use default
  const label = toolCall ? 
    `${toolCall.tool?.name || toolCall.request.name}` : 
    'Tool Execution';
  
  // Mini style: just show indicators
  if (style === 'mini') {
    return (
      <Box marginRight={2}>
        <ProgressSystem 
          mode="mini"
          label={label}
          value={percentage}
          active={status === 'in_progress'}
          status={status}
          showPercentage={true}
          size="small"
          animated={animated}
        />
        <Text> {message}</Text>
      </Box>
    );
  }
  
  // Compact style: simpler display
  if (style === 'compact') {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Box marginRight={1}>
            <ProgressSystem 
              mode={isIndeterminate ? "indeterminate" : "mini"}
              status={status}
              active={status === 'in_progress'}
              size="small"
              animated={animated}
            />
          </Box>
          
          <Box flexGrow={1}>
            <Text bold>{label}</Text>
            {message && <Text dimColor> - {message}</Text>}
          </Box>
          
          <Box marginLeft={1}>
            {!isIndeterminate && <Text>{percentage.toFixed(0)}%</Text>}
            {timeDisplay && <Text dimColor> ({timeDisplay})</Text>}
          </Box>
        </Box>
      </Box>
    );
  }
  
  // Default style: standard progress bar with more info
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={0}>
        <Text bold>{label}</Text>
        {message && (
          <Box marginLeft={1}>
            <Text dimColor>{message}</Text>
          </Box>
        )}
      </Box>
      
      {isIndeterminate ? (
        <ProgressSystem 
          mode="indeterminate"
          active={status === 'in_progress'}
          width={width}
          label=""
          status={status}
          showStatus={true}
          stepNumber={data.step?.current}
          totalSteps={data.step?.total}
          showSteps={showSteps && !!data.step}
          animationStyle="bounce"
          message={data.step?.description}
        />
      ) : (
        <ProgressSystem 
          mode="standard"
          value={percentage}
          width={width}
          label=""
          showPercentage={true}
          status={status}
          showStatus={true}
          stepNumber={data.step?.current}
          totalSteps={data.step?.total}
          showSteps={showSteps && !!data.step}
          estimatedTimeRemaining={data.estimatedTimeRemaining}
          showETA={showTimeEstimate}
          animated={animated}
        />
      )}
      
      {/* Show details if requested and available */}
      {showDetails && data.details && Object.keys(data.details).length > 0 && (
        <Box flexDirection="column" marginTop={1} marginLeft={2}>
          {Object.entries(data.details).map(([key, value]) => (
            <Text key={key}>
              <Text color={Colors.TextDim}>{key}:</Text> {String(value)}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
};

/**
 * Get default message based on status
 */
function getDefaultMessage(status: string): string {
  switch (status) {
    case 'validating':
      return 'Validating parameters...';
    case 'awaiting_approval':
      return 'Waiting for approval...';
    case 'scheduled':
      return 'Scheduled for execution...';
    case 'executing':
      return 'Executing...';
    case 'completed':
      return 'Completed successfully';
    case 'error':
      return 'Failed with error';
    default:
      return '';
  }
}

export default ToolProgressFeedback;