/**
 * Keyboard Navigation Hook
 * 
 * Provides keyboard navigation functionality for the Analysis Interface.
 */

import { useCallback, useEffect, useState } from 'react';
import { useInput } from 'ink';

/**
 * Key handler type
 */
type KeyHandler = () => void;

/**
 * Key mapping type
 */
type KeyMap = Record<string, KeyHandler>;

/**
 * Keyboard navigation hook
 * 
 * @param isActive Whether keyboard navigation is active
 * @returns Keyboard navigation utilities
 */
export const useKeyboardNavigation = (isActive: boolean = true) => {
  // Key map for registered handlers
  const [keyMap, setKeyMap] = useState<KeyMap>({});
  
  // Register a key handler
  const registerKeyHandler = useCallback((key: string, handler: KeyHandler) => {
    setKeyMap(prev => ({
      ...prev,
      [key.toLowerCase()]: handler
    }));
  }, []);
  
  // Unregister a key handler
  const unregisterKeyHandler = useCallback((key: string) => {
    setKeyMap(prev => {
      const newMap = { ...prev };
      delete newMap[key.toLowerCase()];
      return newMap;
    });
  }, []);
  
  // Clear all key handlers
  const clearKeyHandlers = useCallback(() => {
    setKeyMap({});
  }, []);
  
  // Handle key press
  const handleKeyPress = useCallback((input: string, key: any) => {
    if (!isActive) return;
    
    // Check for single key matches
    const lowerInput = input.toLowerCase();
    if (keyMap[lowerInput]) {
      keyMap[lowerInput]();
      return;
    }
    
    // Check for special keys
    if (key.escape && keyMap['escape']) {
      keyMap['escape']();
      return;
    }
    
    if (key.return && keyMap['enter']) {
      keyMap['enter']();
      return;
    }
    
    if (key.tab && keyMap['tab']) {
      keyMap['tab']();
      return;
    }
    
    // Function keys
    if (key.f1 && keyMap['f1']) keyMap['f1']();
    if (key.f2 && keyMap['f2']) keyMap['f2']();
    if (key.f3 && keyMap['f3']) keyMap['f3']();
    if (key.f4 && keyMap['f4']) keyMap['f4']();
    if (key.f5 && keyMap['f5']) keyMap['f5']();
    if (key.f6 && keyMap['f6']) keyMap['f6']();
    if (key.f7 && keyMap['f7']) keyMap['f7']();
    if (key.f8 && keyMap['f8']) keyMap['f8']();
    if (key.f9 && keyMap['f9']) keyMap['f9']();
    if (key.f10 && keyMap['f10']) keyMap['f10']();
    if (key.f11 && keyMap['f11']) keyMap['f11']();
    if (key.f12 && keyMap['f12']) keyMap['f12']();
    
    // Arrow keys
    if (key.upArrow && keyMap['up']) keyMap['up']();
    if (key.downArrow && keyMap['down']) keyMap['down']();
    if (key.leftArrow && keyMap['left']) keyMap['left']();
    if (key.rightArrow && keyMap['right']) keyMap['right']();
    
    // Other common keys
    if (key.backspace && keyMap['backspace']) keyMap['backspace']();
    if (key.delete && keyMap['delete']) keyMap['delete']();
    if (key.pageUp && keyMap['pageup']) keyMap['pageup']();
    if (key.pageDown && keyMap['pagedown']) keyMap['pagedown']();
    if (key.home && keyMap['home']) keyMap['home']();
    if (key.end && keyMap['end']) keyMap['end']();
    
    // Modifier combinations
    if (key.ctrl) {
      const ctrlKey = `ctrl+${lowerInput}`;
      if (keyMap[ctrlKey]) {
        keyMap[ctrlKey]();
        return;
      }
    }
    
    if (key.shift) {
      const shiftKey = `shift+${lowerInput}`;
      if (keyMap[shiftKey]) {
        keyMap[shiftKey]();
        return;
      }
    }
    
    if (key.alt) {
      const altKey = `alt+${lowerInput}`;
      if (keyMap[altKey]) {
        keyMap[altKey]();
        return;
      }
    }
  }, [isActive, keyMap]);
  
  // Set up input handler
  useInput(handleKeyPress, { isActive });
  
  return {
    registerKeyHandler,
    unregisterKeyHandler,
    clearKeyHandlers,
    handleKeyPress
  };
};