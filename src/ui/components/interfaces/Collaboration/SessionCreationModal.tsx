/**
 * SessionCreationModal Component
 * 
 * Modal for creating a new collaboration session.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface SessionCreationModalProps {
  width: number;
  onCancel: () => void;
  onCreateSession: (name: string, description: string) => void;
}

export const SessionCreationModal: React.FC<SessionCreationModalProps> = ({
  width,
  onCancel,
  onCreateSession
}) => {
  const [name, setName] = useState('New Collaboration Session');
  const [description, setDescription] = useState('');
  const [currentField, setCurrentField] = useState<'name' | 'description' | 'buttons'>('name');
  const [selectedButton, setSelectedButton] = useState<'create' | 'cancel'>('create');
  
  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    
    if (currentField === 'name') {
      if (key.return) {
        setCurrentField('description');
        return;
      }
      
      if (key.backspace) {
        setName(prev => prev.slice(0, -1));
        return;
      }
      
      if (input && !key.ctrl && !key.meta && input.length === 1) {
        setName(prev => prev + input);
      }
    } else if (currentField === 'description') {
      if (key.return) {
        setCurrentField('buttons');
        return;
      }
      
      if (key.backspace) {
        setDescription(prev => prev.slice(0, -1));
        return;
      }
      
      if (input && !key.ctrl && !key.meta && input.length === 1) {
        setDescription(prev => prev + input);
      }
    } else if (currentField === 'buttons') {
      if (key.return) {
        if (selectedButton === 'create') {
          onCreateSession(name, description);
        } else {
          onCancel();
        }
        return;
      }
      
      if (key.tab || key.rightArrow || key.leftArrow) {
        setSelectedButton(prev => prev === 'create' ? 'cancel' : 'create');
        return;
      }
    }
  });
  
  return (
    <Box
      flexDirection="column"
      width={width}
      height={14}
      borderStyle="round"
      borderColor="blue"
      paddingX={2}
      paddingY={1}
    >
      <Box paddingX={1} marginBottom={1}>
        <Text bold>Create New Collaboration Session</Text>
      </Box>
      
      <Box flexDirection="column" marginY={0}>
        <Text bold>Session Name:</Text>
        <Box 
          borderStyle="single" 
          borderColor={currentField === 'name' ? 'blue' : 'gray'} 
          marginY={0} 
          paddingX={1}
        >
          <Text>{name}</Text>
          {currentField === 'name' && <Text>|</Text>}
        </Box>
      </Box>
      
      <Box flexDirection="column" marginY={1}>
        <Text bold>Description (optional):</Text>
        <Box 
          borderStyle="single" 
          borderColor={currentField === 'description' ? 'blue' : 'gray'} 
          marginY={0} 
          paddingX={1}
        >
          <Text>{description}</Text>
          {currentField === 'description' && <Text>|</Text>}
        </Box>
      </Box>
      
      <Box justifyContent="space-between" marginTop={1}>
        <Box>
          <Box
            borderStyle="single"
            borderColor={currentField === 'buttons' && selectedButton === 'create' ? 'green' : 'gray'}
            paddingX={2}
            paddingY={0}
            marginRight={2}
          >
            <Text color={currentField === 'buttons' && selectedButton === 'create' ? 'green' : undefined}>
              Create
            </Text>
          </Box>
          
          <Box
            borderStyle="single"
            borderColor={currentField === 'buttons' && selectedButton === 'cancel' ? 'red' : 'gray'}
            paddingX={2}
            paddingY={0}
          >
            <Text color={currentField === 'buttons' && selectedButton === 'cancel' ? 'red' : undefined}>
              Cancel
            </Text>
          </Box>
        </Box>
        
        <Text dimColor>
          {currentField === 'buttons' ? 'Tab to switch, Enter to select' : 'Enter to continue'}
        </Text>
      </Box>
    </Box>
  );
};

export default SessionCreationModal;