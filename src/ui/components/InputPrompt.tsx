/**
 * Input Prompt Component
 * 
 * Handles user input, including multiline editing, history navigation,
 * and command suggestions.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useClipboard } from '../hooks/useClipboard.js';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import type { Command } from './Help.js';
import type { TextBuffer } from './shared/text-buffer.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';

/**
 * Application configuration interface
 */
export interface AppConfig {
  [key: string]: unknown;
}

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
  config: AppConfig;
  
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

// File path detection utilities (based on Gemini CLI implementation)
const isFilePath = (text: string): boolean => {
  // Check for common file path patterns
  const patterns = [
    /^\/[^\s]+/,                    // Unix absolute path
    /^~\/[^\s]+/,                   // Unix home path  
    /^[A-Z]:\\[^\s]+/,              // Windows absolute path
    /^\.\/[^\s]+/,                  // Relative path starting with ./
    /^\.\.\/[^\s]+/,                // Relative path starting with ../
    /^[^\s]+\.[a-zA-Z0-9]{1,10}$/,  // File with extension
    /^[^\s]*\/[^\s]*$/,             // Path with slash
  ];
  
  return patterns.some(pattern => pattern.test(text.trim()));
};

const isValidPath = (filePath: string): boolean => {
  try {
    // Resolve path to handle relative paths
    const resolvedPath = path.resolve(filePath);
    
    // Check if file or directory exists
    return fs.existsSync(resolvedPath);
  } catch (error) {
    return false;
  }
};

const unescapePath = (pathStr: string): string => {
  // Handle @ prefix
  if (pathStr.startsWith('@')) {
    pathStr = pathStr.substring(1);
  }
  
  // Unescape spaces and other characters
  return pathStr.replace(/\\(.)/g, '$1');
};

const stripUnsafeCharacters = (str: string): string => {
  // Remove control characters but keep newlines and tabs
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
};

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
          .filter(cmd => 
            !cmd.hidden && 
            (cmd.name.toLowerCase().includes(commandText) || 
             (cmd.altName?.toLowerCase().includes(commandText)))
          )
          .map(cmd => `/${cmd.name}`);
        
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
      // Auto-detect file paths and prefix with @ (Gemini CLI feature)
      let processedText = text;
      
      // Arbitrary threshold to avoid false positives on normal key presses
      // while still detecting virtually all reasonable length file paths.
      const minLengthToInferAsDragDrop = 3;
      
      if (text.length >= minLengthToInferAsDragDrop) {
        // Possible drag and drop of a file path.
        let potentialPath = text;
        
        // Handle quoted paths
        if (
          potentialPath.length > 2 &&
          potentialPath.startsWith("'") &&
          potentialPath.endsWith("'")
        ) {
          potentialPath = text.slice(1, -1);
        }
        
        potentialPath = potentialPath.trim();
        
        // Be conservative and only add an @ if the path is valid.
        if (isValidPath(unescapePath(potentialPath))) {
          processedText = `@${potentialPath}`;
          logger.debug('Auto-detected file path and added @ prefix', { 
            original: text, 
            processed: processedText 
          });
        }
      }
      
      // Get current cursor position - use text length as fallback
      const cursorPosition = (buffer as any).cursorOffset || buffer.text.length;
      
      // Insert processed text at cursor position
      const currentText = buffer.text;
      const newText = 
        currentText.substring(0, cursorPosition) +
        processedText +
        currentText.substring(cursorPosition);
      
      buffer.setText(newText);
      
      // Move cursor after the pasted text - if setCursorOffset exists
      if (typeof (buffer as any).setCursorOffset === 'function') {
        (buffer as any).setCursorOffset(cursorPosition + processedText.length);
      }
    }
  }, [pasteFromClipboard, buffer]);
  
  const handleCopy = useCallback(() => {
    if (buffer.text) {
      copyToClipboard(buffer.text);
    }
  }, [copyToClipboard, buffer.text]);
  
  // Note: Input handling is done by the TextBuffer component
  // We'll handle special keys through the buffer's onChange callback and key events
  
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