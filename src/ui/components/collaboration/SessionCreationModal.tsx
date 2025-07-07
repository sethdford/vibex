/**
 * Session Creation Modal
 * 
 * Modal dialog for creating a new collaboration session.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { Colors } from '../../colors.js';
import { 
  SessionCreationModalProps,
  CollaborationSession,
  SessionAccess
} from './types.js';

/**
 * Form field interface
 */
interface FormField {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'select' | 'checkbox';
  options?: string[];
  required: boolean;
  maxLength?: number;
}

/**
 * Session Creation Modal Component
 */
export const SessionCreationModal: React.FC<SessionCreationModalProps> = ({
  width,
  isFocused = true,
  onSessionCreate,
  onCancel
}) => {
  // Form fields
  const [fields, setFields] = useState<FormField[]>([
    {
      key: 'name',
      label: 'Session Name',
      value: '',
      type: 'text',
      required: true,
      maxLength: 50
    },
    {
      key: 'description',
      label: 'Description',
      value: '',
      type: 'text',
      required: false,
      maxLength: 200
    },
    {
      key: 'access',
      label: 'Access Level',
      value: SessionAccess.TEAM,
      type: 'select',
      options: Object.values(SessionAccess),
      required: true
    },
    {
      key: 'password',
      label: 'Password (for restricted access)',
      value: '',
      type: 'text',
      required: false,
      maxLength: 20
    },
    {
      key: 'tags',
      label: 'Tags (comma separated)',
      value: '',
      type: 'text',
      required: false
    },
    {
      key: 'allowFileUploads',
      label: 'Allow File Uploads',
      value: 'true',
      type: 'checkbox',
      required: true
    },
    {
      key: 'allowComments',
      label: 'Allow Comments',
      value: 'true',
      type: 'checkbox',
      required: true
    },
    {
      key: 'allowEditing',
      label: 'Allow Editing',
      value: 'true',
      type: 'checkbox',
      required: true
    },
    {
      key: 'saveHistory',
      label: 'Save History',
      value: 'true',
      type: 'checkbox',
      required: true
    },
    {
      key: 'encrypt',
      label: 'Encrypt Session Data',
      value: 'false',
      type: 'checkbox',
      required: true
    }
  ]);
  
  // State for current field index
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  // State for validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Get current field
  const currentField = fields[currentFieldIndex];
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Cancel creation
    if (key.escape) {
      if (onCancel) {
        onCancel();
      }
      return;
    }
    
    // When not editing a field
    if (!isEditing) {
      // Navigate fields
      if (key.upArrow) {
        setCurrentFieldIndex(prev => (prev > 0 ? prev - 1 : prev));
        return;
      }
      
      if (key.downArrow) {
        setCurrentFieldIndex(prev => (prev < fields.length - 1 ? prev + 1 : prev));
        return;
      }
      
      // Start editing field
      if (key.return) {
        setIsEditing(true);
        return;
      }
      
      // Submit form
      if (input === 's') {
        handleSubmit();
        return;
      }
    }
    // When editing a field
    else {
      // Cancel editing
      if (key.escape) {
        setIsEditing(false);
        return;
      }
      
      // Finish editing
      if (key.return) {
        setIsEditing(false);
        return;
      }
      
      // Handle field input based on type
      if (currentField.type === 'text') {
        // Backspace/delete
        if (key.backspace || key.delete) {
          updateFieldValue(currentField.key, currentField.value.slice(0, -1));
          return;
        }
        
        // Ignore control keys
        if (key.ctrl || key.meta || key.shift) {
          return;
        }
        
        // Add character if within max length
        if (input && (!currentField.maxLength || currentField.value.length < currentField.maxLength)) {
          updateFieldValue(currentField.key, currentField.value + input);
          return;
        }
      }
      else if (currentField.type === 'select' && currentField.options) {
        // Navigate options
        if (key.upArrow || key.leftArrow) {
          const currentIndex = currentField.options.indexOf(currentField.value);
          const newIndex = (currentIndex > 0) 
            ? currentIndex - 1 
            : currentField.options.length - 1;
          updateFieldValue(currentField.key, currentField.options[newIndex]);
          return;
        }
        
        if (key.downArrow || key.rightArrow) {
          const currentIndex = currentField.options.indexOf(currentField.value);
          const newIndex = (currentIndex < currentField.options.length - 1) 
            ? currentIndex + 1 
            : 0;
          updateFieldValue(currentField.key, currentField.options[newIndex]);
          return;
        }
      }
      else if (currentField.type === 'checkbox') {
        // Toggle checkbox
        if (key.return || key.space || key.leftArrow || key.rightArrow) {
          updateFieldValue(
            currentField.key, 
            currentField.value === 'true' ? 'false' : 'true'
          );
          return;
        }
      }
    }
  }, { isActive: isFocused });
  
  /**
   * Update field value
   */
  const updateFieldValue = (key: string, value: string) => {
    setFields(prev => 
      prev.map(field => 
        field.key === key ? { ...field, value } : field
      )
    );
    
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = () => {
    // Validate form
    const newErrors: Record<string, string> = {};
    
    fields.forEach(field => {
      if (field.required && !field.value) {
        newErrors[field.key] = 'This field is required';
      }
    });
    
    setErrors(newErrors);
    
    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      return;
    }
    
    // Create session data
    if (onSessionCreate) {
      const sessionData: Partial<CollaborationSession> = {
        name: fields.find(f => f.key === 'name')?.value || 'New Session',
        description: fields.find(f => f.key === 'description')?.value,
        access: fields.find(f => f.key === 'access')?.value as SessionAccess,
        password: fields.find(f => f.key === 'password')?.value,
        tags: fields.find(f => f.key === 'tags')?.value.split(',').map((tag: string) => tag.trim()).filter(Boolean),
        settings: {
          allowFileUploads: fields.find(f => f.key === 'allowFileUploads')?.value === 'true',
          allowComments: fields.find(f => f.key === 'allowComments')?.value === 'true',
          allowEditing: fields.find(f => f.key === 'allowEditing')?.value === 'true',
          saveHistory: fields.find(f => f.key === 'saveHistory')?.value === 'true',
          encrypt: fields.find(f => f.key === 'encrypt')?.value === 'true'
        }
      };
      
      onSessionCreate(sessionData);
    }
  };
  
  /**
   * Render field based on type
   */
  const renderField = (field: FormField, isCurrent: boolean, isBeingEdited: boolean) => {
    const hasError = Boolean(errors[field.key]);
    
    return (
      <Box 
        key={field.key} 
        flexDirection="column" 
        marginBottom={1}
      >
        <Box>
          <Text bold={isCurrent} color={isCurrent ? Colors.Primary : Colors.Text}>
            {field.label}
            {field.required && <Text color={Colors.Error}> *</Text>}
          </Text>
        </Box>
        
        <Box 
          marginLeft={2} 
          marginTop={0}
          borderStyle={isCurrent ? "single" : undefined}
          borderColor={hasError ? Colors.Error : Colors.Border}
          paddingX={isCurrent ? 1 : 0}
          paddingY={0}
          backgroundColor={isBeingEdited ? Colors.DimBackground : undefined}
        >
          {field.type === 'text' && (
            <Text>
              {field.value || (
                <Text color={Colors.TextDim}>
                  {isBeingEdited ? 'Type here...' : '(empty)'}
                </Text>
              )}
            </Text>
          )}
          
          {field.type === 'select' && field.options && (
            <Box>
              {field.options.map((option, i) => (
                <Text 
                  key={option}
                  color={option === field.value ? Colors.Primary : Colors.TextDim}
                  backgroundColor={option === field.value ? Colors.DimBackground : undefined}
                  bold={option === field.value}
                  paddingX={1}
                  marginRight={1}
                >
                  {option}
                </Text>
              ))}
            </Box>
          )}
          
          {field.type === 'checkbox' && (
            <Box>
              <Text 
                color={field.value === 'true' ? Colors.Success : Colors.TextDim}
                bold
              >
                [{field.value === 'true' ? '×' : ' '}]
                {' '}
                {field.value === 'true' ? 'Yes' : 'No'}
              </Text>
            </Box>
          )}
        </Box>
        
        {hasError && (
          <Box marginLeft={2}>
            <Text color={Colors.Error}>{errors[field.key]}</Text>
          </Box>
        )}
      </Box>
    );
  };
  
  return (
    <Box
      flexDirection="column"
      width={width}
      padding={2}
      borderStyle="bold"
      borderColor={Colors.Primary}
    >
      <Text bold color={Colors.Primary}>Create New Collaboration Session</Text>
      
      <Box flexDirection="column" marginTop={2}>
        {fields.map((field, index) => 
          renderField(
            field, 
            index === currentFieldIndex,
            index === currentFieldIndex && isEditing
          )
        )}
      </Box>
      
      <Box marginTop={2}>
        <Text
          backgroundColor={Colors.Primary}
          color={Colors.Background}
          paddingX={2}
          paddingY={0}
          marginRight={2}
          onClick={handleSubmit}
        >
          Create Session (S)
        </Text>
        
        <Text
          backgroundColor={Colors.Error}
          color={Colors.Background}
          paddingX={2}
          paddingY={0}
          onClick={onCancel}
        >
          Cancel (Esc)
        </Text>
      </Box>
      
      <Box marginTop={2}>
        <Text color={Colors.TextDim}>
          <Text color={Colors.AccentBlue}>↑/↓</Text> Navigate fields | 
          <Text color={Colors.AccentBlue}> Enter</Text> Edit field | 
          <Text color={Colors.AccentBlue}> Esc</Text> Cancel
        </Text>
      </Box>
    </Box>
  );
};

export default SessionCreationModal;