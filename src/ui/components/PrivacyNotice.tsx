/**
 * Privacy Notice Component
 * 
 * Displays privacy information and consent notices to users.
 * Can be used for GDPR, telemetry opt-out, and similar notifications.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

interface PrivacyNoticeProps {
  /**
   * Notice title
   */
  title?: string;
  
  /**
   * Main notice message
   */
  message: string;
  
  /**
   * Additional details (shown when expanded)
   */
  details?: string;
  
  /**
   * Whether the notice can be dismissed
   */
  dismissable?: boolean;
  
  /**
   * Callback when user acknowledges or dismisses the notice
   */
  onAcknowledge?: () => void;
  
  /**
   * Show the full details by default
   */
  expanded?: boolean;
  
  /**
   * Urgency level for styling
   */
  level?: 'info' | 'warning' | 'critical';
}

/**
 * Privacy notice component for displaying consent notices and privacy information
 */
export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({
  title = 'Privacy Notice',
  message,
  details,
  dismissable = true,
  onAcknowledge,
  expanded: initiallyExpanded = false,
  level = 'info',
}) => {
  const [expanded, setExpanded] = useState<boolean>(initiallyExpanded);
  const [dismissed, setDismissed] = useState<boolean>(false);
  
  // Don't show if dismissed
  if (dismissed) {
    return null;
  }
  
  // Determine colors based on level
  const getBorderColor = () => {
    switch (level) {
      case 'critical': return Colors.Error;
      case 'warning': return Colors.Warning;
      default: return Colors.Info;
    }
  };
  
  const getTitleColor = () => {
    switch (level) {
      case 'critical': return Colors.Error;
      case 'warning': return Colors.Warning;
      default: return Colors.Info;
    }
  };
  
  const handleDismiss = () => {
    if (dismissable) {
      setDismissed(true);
      if (onAcknowledge) {
        onAcknowledge();
      }
    }
  };
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  return (
    <Box 
      flexDirection="column" 
      borderStyle="round" 
      borderColor={getBorderColor()} 
      paddingX={1} 
      paddingY={1}
      marginY={1}
    >
      {/* Header */}
      <Box>
        <Text bold color={getTitleColor()}>{title}</Text>
      </Box>
      
      {/* Main message */}
      <Box marginY={1}>
        <Text>{message}</Text>
      </Box>
      
      {/* Expandable details */}
      {details && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text 
              color={Colors.Info}
              dimColor
            >
              {expanded ? '▼ Hide details' : '▶ Show details'}
            </Text>
          </Box>
          
          {expanded && (
            <Box marginTop={1} marginLeft={1} flexDirection="column">
              <Text color={Colors.TextDim}>{details}</Text>
            </Box>
          )}
        </Box>
      )}
      
      {/* Actions */}
      {dismissable && (
        <Box marginTop={1}>
          <Text 
            color={Colors.Primary}
          >
            [Press Enter to acknowledge]
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default PrivacyNotice;