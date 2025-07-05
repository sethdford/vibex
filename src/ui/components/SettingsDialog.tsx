/**
 * Settings Dialog Component
 * 
 * Dialog for viewing and editing user settings.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { Colors } from '../colors.js';

/**
 * Setting value type
 */
export type SettingValue = string | number | boolean;

/**
 * Setting definition
 */
export interface SettingDefinition {
  /**
   * Setting key
   */
  key: string;
  
  /**
   * Setting display name
   */
  label: string;
  
  /**
   * Setting description
   */
  description: string;
  
  /**
   * Setting type
   */
  type: 'string' | 'number' | 'boolean' | 'select';
  
  /**
   * Current setting value
   */
  value: SettingValue;
  
  /**
   * Default setting value
   */
  default?: SettingValue;
  
  /**
   * Options for select type
   */
  options?: Array<{
    label: string;
    value: SettingValue;
  }>;
  
  /**
   * Category for grouping settings
   */
  category: string;
}

/**
 * Settings dialog props
 */
interface SettingsDialogProps {
  /**
   * List of settings
   */
  settings: SettingDefinition[];
  
  /**
   * Handler for saving settings
   */
  onSave: (key: string, value: SettingValue) => void;
  
  /**
   * Handler for closing dialog
   */
  onClose: () => void;
  
  /**
   * Available terminal width
   */
  terminalWidth: number;
  
  /**
   * Available terminal height
   */
  availableTerminalHeight?: number;
}

/**
 * Settings dialog component
 */
export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  settings,
  onSave,
  onClose,
  terminalWidth,
  availableTerminalHeight,
}) => {
  // Current view state: 'categories', 'settings', 'edit'
  const [view, setView] = useState<'categories' | 'settings' | 'edit'>('categories');
  
  // Currently selected category
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Currently editing setting
  const [editingSetting, setEditingSetting] = useState<SettingDefinition | null>(null);
  
  // New value for editing setting
  const [editValue, setEditValue] = useState<string>('');
  
  // Get unique categories
  const categories = [...new Set(settings.map(s => s.category))];
  
  // Get settings for current category
  const categorySettings = settings.filter(s => s.category === selectedCategory);
  
  // Handle category selection
  const handleCategorySelect = useCallback(({ value }: { value: string }) => {
    setSelectedCategory(value);
    setView('settings');
  }, []);
  
  // Handle setting selection
  const handleSettingSelect = useCallback(({ value }: { value: string }) => {
    const setting = settings.find(s => s.key === value);
    if (setting) {
      setEditingSetting(setting);
      setEditValue(String(setting.value));
      setView('edit');
    }
  }, [settings]);
  
  // Handle back button
  const handleBack = useCallback(() => {
    if (view === 'settings') {
      setView('categories');
    } else if (view === 'edit') {
      setView('settings');
    }
  }, [view]);
  
  // Handle save
  const handleSave = useCallback(() => {
    if (editingSetting) {
      let parsedValue: SettingValue = editValue;
      
      // Parse value based on type
      if (editingSetting.type === 'number') {
        parsedValue = Number(editValue);
      } else if (editingSetting.type === 'boolean') {
        parsedValue = editValue === 'true';
      }
      
      // Save setting
      onSave(editingSetting.key, parsedValue);
      
      // Return to settings view
      setView('settings');
    }
  }, [editingSetting, editValue, onSave]);
  
  // Format value for display
  const formatValue = (value: SettingValue): string => {
    if (value === undefined || value === null) {
      return '(not set)';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'enabled' : 'disabled';
    }
    
    return String(value);
  };
  
  // Categories view
  if (view === 'categories') {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={Colors.Primary}
        paddingX={1}
        paddingY={0}
        width={Math.min(terminalWidth, 70)}
      >
        <Box marginBottom={1}>
          <Text bold>Settings</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text>Select a category:</Text>
        </Box>
        
        <SelectInput
          items={categories.map(category => ({
            label: category,
            value: category,
          }))}
          onSelect={handleCategorySelect}
          itemComponent={({ isSelected, label }) => (
            <Text color={isSelected ? Colors.Primary : undefined}>
              {isSelected ? '› ' : '  '}{label}
            </Text>
          )}
        />
        
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            Press Escape to close
          </Text>
        </Box>
      </Box>
    );
  }
  
  // Settings view
  if (view === 'settings') {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={Colors.Primary}
        paddingX={1}
        paddingY={0}
        width={Math.min(terminalWidth, 70)}
      >
        <Box marginBottom={1}>
          <Text bold>{selectedCategory} Settings</Text>
        </Box>
        
        <SelectInput
          items={[
            { label: '« Back to Categories', value: 'back' },
            ...categorySettings.map(setting => ({
              label: `${setting.label} (${formatValue(setting.value)})`,
              value: setting.key,
            })),
          ]}
          onSelect={({ value }) => {
            if (value === 'back') {
              handleBack();
            } else {
              handleSettingSelect({ value });
            }
          }}
          itemComponent={({ isSelected, label }) => (
            <Text color={isSelected ? Colors.Primary : undefined}>
              {isSelected ? '› ' : '  '}{label}
            </Text>
          )}
        />
        
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            Press Escape to close
          </Text>
        </Box>
      </Box>
    );
  }
  
  // Edit view
  if (view === 'edit' && editingSetting) {
    return (
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={Colors.Primary}
        paddingX={1}
        paddingY={0}
        width={Math.min(terminalWidth, 70)}
      >
        <Box marginBottom={1}>
          <Text bold>Edit {editingSetting.label}</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text>{editingSetting.description}</Text>
        </Box>
        
        {editingSetting.type === 'select' && editingSetting.options ? (
          <SelectInput
            items={editingSetting.options}
            onSelect={({ value }) => {
              setEditValue(String(value));
              handleSave();
            }}
            initialIndex={editingSetting.options.findIndex(
              option => String(option.value) === editValue
            )}
            itemComponent={({ isSelected, label }) => (
              <Text color={isSelected ? Colors.Primary : undefined}>
                {isSelected ? '› ' : '  '}{label}
              </Text>
            )}
          />
        ) : editingSetting.type === 'boolean' ? (
          <SelectInput
            items={[
              { label: 'Enabled', value: 'true' },
              { label: 'Disabled', value: 'false' },
            ]}
            onSelect={({ value }) => {
              setEditValue(value);
              handleSave();
            }}
            initialIndex={editValue === 'true' ? 0 : 1}
            itemComponent={({ isSelected, label }) => (
              <Text color={isSelected ? Colors.Primary : undefined}>
                {isSelected ? '› ' : '  '}{label}
              </Text>
            )}
          />
        ) : (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text>Current value: </Text>
              <Text color={Colors.Info}>
                {formatValue(editingSetting.value)}
              </Text>
            </Box>
            
            <Box>
              <Text>New value: </Text>
              <TextInput
                value={editValue}
                onChange={setEditValue}
                onSubmit={handleSave}
              />
            </Box>
            
            {editingSetting.default !== undefined && (
              <Box marginTop={1}>
                <Text color={Colors.TextDim}>
                  Default: {formatValue(editingSetting.default)}
                </Text>
              </Box>
            )}
          </Box>
        )}
        
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            Press Enter to save, Escape to cancel
          </Text>
        </Box>
      </Box>
    );
  }
  
  // Should never reach here
  return null;
};