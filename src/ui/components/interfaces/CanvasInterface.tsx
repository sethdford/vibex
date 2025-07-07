/**
 * Canvas Interface Component - Clean Architecture like Gemini CLI
 * 
 * Single responsibility: Interactive canvas editing with drag & drop
 * Extracted from ModernInterface.tsx monolith
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { CanvasElement, InterfaceTheme } from '../types/interface-types.js';

/**
 * Canvas interface props
 */
export interface CanvasInterfaceProps {
  terminalWidth: number;
  terminalHeight: number;
  canvasElements: CanvasElement[];
  theme?: InterfaceTheme;
  onCanvasUpdate?: (elements: CanvasElement[]) => void;
}

/**
 * Canvas interface component - focused on interactive editing only
 */
export const CanvasInterface: React.FC<CanvasInterfaceProps> = ({
  terminalWidth,
  terminalHeight,
  canvasElements,
  theme = {
    primary: Colors.Primary,
    secondary: Colors.Secondary,
    accent: Colors.AccentBlue,
    background: Colors.Background,
    text: Colors.Text,
    thinking: Colors.AccentPurple,
    response: Colors.Text,
    muted: Colors.TextMuted,
    error: Colors.Error,
    success: Colors.Success,
    warning: Colors.Warning
  },
  onCanvasUpdate,
}) => {
  return (
    <Box flexDirection="column" height={terminalHeight - 4}>
      {/* Header */}
      <Box borderStyle="single" borderColor={theme.primary} paddingX={1}>
        <Text color={theme.accent}>🎨 Canvas Mode</Text>
        <Text color={theme.text} dimColor> • Interactive editing • Drag & drop • Multi-select</Text>
      </Box>
      
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {canvasElements.length === 0 ? (
          <Box justifyContent="center" alignItems="center" height="100%">
            <Text color={theme.secondary}>Canvas is empty. Start creating...</Text>
          </Box>
        ) : (
          canvasElements.map(element => (
            <Box 
              key={element.id} 
              borderStyle={element.selected ? "double" : "single"}
              borderColor={element.selected ? theme.accent : theme.secondary}
              paddingX={1}
              marginY={0}
            >
              <Box flexDirection="column">
                <Box justifyContent="space-between">
                  <Text color={theme.accent}>{element.type.toUpperCase()}</Text>
                  <Text color={theme.text} dimColor>
                    {element.size.width}x{element.size.height}
                  </Text>
                </Box>
                <Text color={theme.text}>{element.content.slice(0, 100)}...</Text>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default CanvasInterface; 