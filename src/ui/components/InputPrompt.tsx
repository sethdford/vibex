/**
 * Input Prompt Component
 * 
 * Handles user input, including multiline editing, history navigation,
 * and command suggestions.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useClipboard } from '../hooks/useClipboard';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors';
import { Command } from './Help';
import { TextBuffer } from './shared/text-buffer';

/**
 * Input prompt props
 */
interface InputPromptProps {
  /**
   * Text buffer for input management
   */
  buffer: TextBuffer;
  
  /**
   * Width of the input field
   */
  inputWidth: number;
  
  /**
   * Width of the suggestions panel
   */
  suggestionsWidth: number;
  
  /**
   * Handler for input submission
   */
  onSubmit: (text: string) => void;
  
  /**
   * Previous user messages for history
   */
  userMessages: string[];
  
  /**
   * Handler for clearing the screen
   */
  onClearScreen: () => void;
  
  /**
   * Application configuration
   */
  config: any;
  
  /**
   * Available slash commands
   */
  slashCommands: Command[];
  
  /**
   * Whether shell mode is active
   */
  shellModeActive?: boolean;
  
  /**
   * Function to set shell mode active state
   */
  setShellModeActive?: (active: boolean) => void;
}

/**
 * Input prompt component
 */
export const InputPrompt: React.FC<InputPromptProps> = ({
  buffer,
  inputWidth,
  suggestionsWidth,
  onSubmit,
  userMessages,
  onClearScreen,
  config,
  slashCommands,
  shellModeActive = false,
}) => {
  // State for handling input history
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [historyCache, setHistoryCache] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number>(-1);
  const isFirstRender = useRef(true);
  
  // Reset history index when user messages change
  useEffect(() => {
    setHistoryIndex(-1);
  }, [userMessages]);
  
  // Navigate input history
  const navigateHistory = useCallback(
    (direction: 'up' | 'down') => {
      if (userMessages.length === 0) {
        return;
      }
      
      if (direction === 'up') {
        if (historyIndex === -1) {
          // Save current input before navigating history
          setHistoryCache(buffer.text);
        }
        
        if (historyIndex < userMessages.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          buffer.setText(userMessages[newIndex]);
        }
      } else if (direction === 'down') {
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          buffer.setText(userMessages[newIndex]);
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          buffer.setText(historyCache);
        }
      }
    },
    [buffer, historyCache, historyIndex, userMessages],
  );
  
  // Generate command suggestions based on input
  const updateSuggestions = useCallback(
    (text: string) => {
      if (text.startsWith('/')) {
        const commandText = text.slice(1).toLowerCase();
        const filtered = slashCommands
          .filter((cmd) => 
            !cmd.hidden && 
            (cmd.name.toLowerCase().includes(commandText) || 
             (cmd.altName && cmd.altName.toLowerCase().includes(commandText)))
          )
          .map((cmd) => `/${cmd.name}`);
        
        setSuggestions(filtered);
        setSelectedSuggestion(filtered.length > 0 ? 0 : -1);
      } else {
        setSuggestions([]);
        setSelectedSuggestion(-1);
      }
    },
    [slashCommands],
  );
  
  // Handle input submission
  const handleSubmit = useCallback(() => {
    const trimmedText = buffer.text.trim();
    if (trimmedText) {
      onSubmit(trimmedText);
      buffer.setText('');
      setSuggestions([]);
      setSelectedSuggestion(-1);
      setHistoryIndex(-1);
    }
  }, [buffer, onSubmit]);
  
  // Apply selected suggestion
  const applySuggestion = useCallback(() => {
    if (selectedSuggestion >= 0 && selectedSuggestion < suggestions.length) {
      buffer.setText(suggestions[selectedSuggestion]);
      setSuggestions([]);
      setSelectedSuggestion(-1);
    }
  }, [buffer, selectedSuggestion, suggestions]);
  
  // Clipboard integration
  const { copyToClipboard, pasteFromClipboard } = useClipboard();
  
  // Handle clipboard copy/paste
  const handlePaste = useCallback(async () => {
    const text = await pasteFromClipboard();
    if (text) {
      // Get current cursor position
      const cursorPosition = buffer.cursorOffset;
      
      // Insert pasted text at cursor position
      const currentText = buffer.text;
      const newText = 
        currentText.substring(0, cursorPosition) +
        text +
        currentText.substring(cursorPosition);
      
      buffer.setText(newText);
      
      // Move cursor after the pasted text
      buffer.setCursorOffset(cursorPosition + text.length);
    }
  }, [pasteFromClipboard, buffer]);
  
  const handleCopy = useCallback(() => {
    if (buffer.text) {
      copyToClipboard(buffer.text);
    }
  }, [copyToClipboard, buffer.text]);
  
  // Handle keyboard input
  useInput(
    (input, key) => {
      // Update suggestions when text changes
      if (isFirstRender.current) {
        isFirstRender.current = false;
      } else {
        updateSuggestions(buffer.text);
      }
      
      // Special key handling
      if (key.return) {
        if (selectedSuggestion >= 0) {
          applySuggestion();
        } else {
          handleSubmit();
        }
      } else if (key.upArrow) {
        if (suggestions.length > 0) {
          // Navigate suggestions
          setSelectedSuggestion((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
        } else {
          // Navigate history
          navigateHistory('up');
        }
      } else if (key.downArrow) {
        if (suggestions.length > 0) {
          // Navigate suggestions
          setSelectedSuggestion((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
        } else {
          // Navigate history
          navigateHistory('down');
        }
      } else if (key.tab && suggestions.length > 0) {
        applySuggestion();
      } else if (key.escape) {
        setSuggestions([]);
        setSelectedSuggestion(-1);
      } else if (key.ctrl && input === 'l') {
        onClearScreen();
      } else if (key.ctrl && input === 'v') {
        handlePaste();
      } else if (key.ctrl && input === 'c' && !window.getSelection()?.toString()) {
        // Only copy if no text is selected (to avoid interfering with terminal selection)
        handleCopy();
      } else if (key.ctrl && input === 'x') {
        // Cut: Copy then clear
        handleCopy();
        buffer.setText('');
      }
    },
    { isActive: true }
  );
  
  // Update buffer text effect
  useEffect(() => {
    updateSuggestions(buffer.text);
  }, [buffer.text, updateSuggestions]);
  
  // Determine prompt text based on mode
  let promptText = '> ';
  if (shellModeActive) {
    promptText = '$ ';
  }
  
  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        {/* Input prompt */}
        <Box marginRight={1}>
          <Text color={Colors.Primary}>
            {promptText}
          </Text>
        </Box>
        
        {/* Text buffer display */}
        <Box width={inputWidth}>
          <buffer.Component />
        </Box>
      </Box>
      
      {/* Command suggestions */}
      {suggestions.length > 0 && (
        <Box 
          flexDirection="column"
          marginLeft={2}
          marginTop={1}
          borderStyle="round"
          borderColor={Colors.TextDim}
          paddingX={1}
          paddingY={0}
          width={suggestionsWidth}
        >
          {suggestions.slice(0, 10).map((suggestion, index) => (
            <Text
              key={suggestion}
              color={
                index === selectedSuggestion
                  ? Colors.Primary
                  : Colors.Text
              }
            >
              {index === selectedSuggestion ? '› ' : '  '}
              {suggestion}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
};