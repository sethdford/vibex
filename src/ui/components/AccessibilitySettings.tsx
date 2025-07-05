/**
 * Accessibility Settings Component
 * 
 * Dialog for configuring accessibility settings.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { Colors } from '../colors.js';
import { useSettings } from '../hooks/useSettings.js';
import { AccessibleText, Heading } from './AccessibleText.js';

/**
 * Accessibility settings props
 */
interface AccessibilitySettingsProps {
  /**
   * Handler for closing the dialog
   */
  onClose: () => void;
  
  /**
   * Available terminal width
   */
  terminalWidth: number;
}

/**
 * Accessibility settings component
 */
export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
  onClose,
  terminalWidth,
}) => {
  // Use settings hook
  const { settings, saveSetting } = useSettings();
  
  // Settings options
  const accessibilityOptions = [
    {
      key: 'accessibility.enabled',
      label: 'Enable Accessibility Mode',
      description: 'Optimize terminal output for screen readers and assistive technologies',
      value: settings?.['accessibility.enabled'] ?? false,
      options: [
        { label: 'Enabled', value: true },
        { label: 'Disabled', value: false },
      ],
    },
    {
      key: 'accessibility.disableLoadingPhrases',
      label: 'Disable Loading Phrases',
      description: 'Replace random loading phrases with simple static text for better screen reader experience',
      value: settings?.['accessibility.disableLoadingPhrases'] ?? false,
      options: [
        { label: 'Enabled (no phrases)', value: true },
        { label: 'Disabled (show phrases)', value: false },
      ],
    },
    {
      key: 'terminal.useHighContrast',
      label: 'High Contrast Mode',
      description: 'Use high contrast colors for better visibility',
      value: settings?.['terminal.useHighContrast'] ?? false,
      options: [
        { label: 'Enabled', value: true },
        { label: 'Disabled', value: false },
      ],
    },
    {
      key: 'terminal.fontSizeAdjustment',
      label: 'Font Size Adjustment',
      description: 'Adjust relative font size (requires terminal support)',
      value: settings?.['terminal.fontSizeAdjustment'] ?? 'normal',
      options: [
        { label: 'Smaller', value: 'small' },
        { label: 'Normal', value: 'normal' },
        { label: 'Larger', value: 'large' },
      ],
    },
    {
      key: 'terminal.reduceMotion',
      label: 'Reduce Motion',
      description: 'Minimize animations and motion effects',
      value: settings?.['terminal.reduceMotion'] ?? false,
      options: [
        { label: 'Enabled (reduced motion)', value: true },
        { label: 'Disabled (normal motion)', value: false },
      ],
    },
    {
      key: 'terminal.simplifyInterface',
      label: 'Simplify Interface',
      description: 'Use a simpler interface with fewer visual elements',
      value: settings?.['terminal.simplifyInterface'] ?? false,
      options: [
        { label: 'Enabled (simplified)', value: true },
        { label: 'Disabled (normal)', value: false },
      ],
    },
  ];
  
  // Current selected option index
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const currentOption = accessibilityOptions[selectedOptionIndex];
  
  // Handle option selection
  const handleSelectOption = (index: number) => {
    setSelectedOptionIndex(index);
  };
  
  // Handle value selection
  const handleSelectValue = ({ value }: { value: string | number | boolean }) => {
    if (currentOption) {
      saveSetting(currentOption.key, value);
    }
  };
  
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={Colors.Primary}
      paddingX={1}
      paddingY={0}
      width={Math.min(terminalWidth, 80)}
    >
      <Heading level={1} description="Dialog for configuring accessibility settings">
        Accessibility Settings
      </Heading>
      
      <Box marginY={1}>
        <AccessibleText>
          Configure settings to improve accessibility and usability with assistive technologies.
        </AccessibleText>
      </Box>
      
      <Box flexDirection="row" marginY={1}>
        {/* Options list */}
        <Box width="50%" marginRight={1}>
          <Heading level={2}>Options</Heading>
          {accessibilityOptions.map((option, index) => (
            <Box key={option.key} marginY={1}>
              <Text 
                color={selectedOptionIndex === index ? Colors.Primary : undefined}
                bold={selectedOptionIndex === index}
              >
                {selectedOptionIndex === index ? '› ' : '  '}
                {option.label}
              </Text>
            </Box>
          ))}
          
          <Box marginTop={2}>
            <AccessibleText role="button" description="Close settings dialog" color={Colors.Secondary}>
              [Escape] Close
            </AccessibleText>
          </Box>
        </Box>
        
        {/* Current option details */}
        <Box width="50%" flexDirection="column" marginLeft={1}>
          <Heading level={2}>{currentOption.label}</Heading>
          
          <Box marginY={1}>
            <AccessibleText>
              {currentOption.description}
            </AccessibleText>
          </Box>
          
          <Box marginY={1}>
            <SelectInput
              items={currentOption.options.map(opt => ({
                label: opt.label,
                value: opt.value,
              }))}
              initialIndex={currentOption.options.findIndex(opt => opt.value === currentOption.value)}
              onSelect={handleSelectValue}
              itemComponent={({ isSelected, label }) => (
                <Text color={isSelected ? Colors.Primary : undefined}>
                  {isSelected ? '› ' : '  '}{label}
                </Text>
              )}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};