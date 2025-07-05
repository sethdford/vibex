/**
 * Accessible Text Component
 * 
 * A Text component with enhanced accessibility features for screen readers
 * and other assistive technologies.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { formatForScreenReader, generateAriaLabel } from '../utils/accessibilityUtils.js';

/**
 * Accessible text props
 */
interface AccessibleTextProps {
  /**
   * Main text content to display
   */
  children: React.ReactNode;
  
  /**
   * Whether to format the text for screen readers
   */
  screenReaderFormat?: boolean;
  
  /**
   * Additional description for screen readers
   */
  description?: string;
  
  /**
   * ARIA role for the text element
   */
  role?: string;
  
  /**
   * Text color
   */
  color?: string;
  
  /**
   * Whether text should be bold
   */
  bold?: boolean;
  
  /**
   * Whether text should be italic
   */
  italic?: boolean;
  
  /**
   * Whether text should be underlined
   */
  underline?: boolean;
  
  /**
   * Whether text should be dimmed
   */
  dimColor?: boolean;
}

/**
 * AccessibleText component
 */
export const AccessibleText: React.FC<AccessibleTextProps> = ({
  children,
  screenReaderFormat = false,
  description,
  role,
  color,
  bold = false,
  italic = false,
  underline = false,
  dimColor = false,
}) => {
  // Convert children to string if possible
  const textContent = React.Children.toArray(children)
    .map(child => ((typeof child === 'string' || typeof child === 'number') ? String(child) : ''))
    .join(' ');
  
  // Format text for screen readers if enabled
  const displayText = screenReaderFormat ? formatForScreenReader(textContent) : textContent;
  
  // Generate ARIA label combining text with description
  const ariaLabel = description ? generateAriaLabel(textContent, description) : undefined;
  
  // Process role and aria-label to be included as attributes
  const accessibilityProps = {
    role,
    'aria-label': ariaLabel,
  };
  
  return (
    <Box data-testid="accessible-text" {...accessibilityProps}>
      <Text 
        color={color} 
        bold={bold} 
        italic={italic} 
        underline={underline} 
        dimColor={dimColor}
      >
        {displayText}
      </Text>
    </Box>
  );
};

/**
 * Heading component based on AccessibleText
 */
export const Heading: React.FC<AccessibleTextProps & { level?: 1 | 2 | 3 }> = ({ 
  level = 1,
  children,
  description,
  color,
  ...rest
}) => {
  // Choose color based on heading level
  let headingColor = color;
  if (!headingColor) {
    if (level === 1) {headingColor = Colors.Primary;}
    else if (level === 2) {headingColor = Colors.Secondary;}
    else {headingColor = Colors.Info;}
  }
  
  return (
    <AccessibleText 
      role={`heading-${level}`}
      color={headingColor}
      bold
      description={description}
      {...rest}
    >
      {children}
    </AccessibleText>
  );
};