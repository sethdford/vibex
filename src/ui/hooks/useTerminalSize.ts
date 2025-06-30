/**
 * Terminal Size Hook
 * 
 * This hook provides access to and monitors terminal dimensions.
 * It updates the size when the terminal is resized.
 */

import { useState, useEffect } from 'react';
import { useStdout } from 'ink';

/**
 * Hook to get and monitor terminal dimensions
 * 
 * @returns Object containing terminal rows and columns
 */
export const useTerminalSize = () => {
  const { stdout } = useStdout();
  const [size, setSize] = useState<{
    columns: number;
    rows: number;
  }>({
    columns: stdout.columns || 80,
    rows: stdout.rows || 24
  });
  
  useEffect(() => {
    // Update size on mount
    setSize({
      columns: stdout.columns || 80,
      rows: stdout.rows || 24
    });
    
    // Handle resize events
    const handleResize = () => {
      setSize({
        columns: stdout.columns || 80,
        rows: stdout.rows || 24
      });
    };
    
    // Listen for resize events
    stdout.on('resize', handleResize);
    
    // Clean up event listener
    return () => {
      stdout.removeListener('resize', handleResize);
    };
  }, [stdout]);
  
  return size;
};