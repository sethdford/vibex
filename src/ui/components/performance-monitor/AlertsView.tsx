/**
 * Alerts View Component - Clean Architecture
 * 
 * Single Responsibility: Performance alerts display
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { PerformanceAlert } from './types.js';
import { createFormattingService } from './FormattingService.js';

/**
 * Alerts view props
 */
export interface AlertsViewProps {
  alerts: PerformanceAlert[];
  maxAlerts?: number;
  showTimestamp?: boolean;
  compact?: boolean;
  maxWidth?: number;
}

/**
 * Alerts view component
 */
export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  maxAlerts = 5,
  showTimestamp = true,
  compact = false,
  maxWidth = 80,
}) => {
  const formatter = createFormattingService();
  
  if (alerts.length === 0) {
    return (
      <Box>
        <Text color={Colors.Success}>✅ No active alerts</Text>
      </Box>
    );
  }

  const displayAlerts = alerts.slice(0, maxAlerts);
  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;

  if (compact) {
    return (
      <Box>
        <Text color={Colors.Warning}>⚠️ Alerts: </Text>
        <Text color={Colors.Error}>{unacknowledgedCount} active</Text>
        {alerts.length > maxAlerts && (
          <Text color={Colors.TextDim}> (+{alerts.length - maxAlerts} more)</Text>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={maxWidth}>
      <Box>
        <Text color={Colors.Warning} bold>⚠️ Performance Alerts</Text>
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>
            ({unacknowledgedCount} active, {alerts.length} total)
          </Text>
        </Box>
      </Box>
      
      {displayAlerts.map((alert, index) => (
        <Box key={alert.id} marginTop={index === 0 ? 1 : 0}>
          <Box width={3}>
            <Text color={formatter.getAlertColor(alert.severity)}>
              {formatter.getSeverityIcon(alert.severity)}
            </Text>
          </Box>
          
          <Box flexDirection="column" flexGrow={1}>
            <Box>
              <Text color={formatter.getAlertColor(alert.severity)}>
                {alert.message}
              </Text>
              {alert.acknowledged && (
                <Box marginLeft={2}>
                  <Text color={Colors.TextDim}>✓ ACK</Text>
                </Box>
              )}
            </Box>
            
            {showTimestamp && (
              <Box>
                <Text color={Colors.TextDim}>
                  {formatter.formatTimestamp(alert.timestamp)} • {alert.type.toUpperCase()}
                </Text>
                <Box marginLeft={2}>
                  <Text color={Colors.TextDim}>
                    {formatter.formatNumber(alert.value)} / {formatter.formatNumber(alert.threshold)}
                  </Text>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      ))}
      
      {alerts.length > maxAlerts && (
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            ... and {alerts.length - maxAlerts} more alerts
          </Text>
        </Box>
      )}
    </Box>
  );
}; 