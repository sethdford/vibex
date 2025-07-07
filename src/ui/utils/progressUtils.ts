/**
 * Progress Utilities
 * 
 * Helper functions for managing progress indicators for common operations
 */

import fs from 'fs';
import path from 'path';
import { useProgressBar } from '../hooks/useProgressBar.js';

/**
 * Hook for tracking file upload progress
 */
export function useFileUploadProgress() {
  const progress = useProgressBar({
    initialValue: 0,
    max: 100,
  });

  /**
   * Upload a file with progress tracking
   * 
   * @param filePath - Path to the file
   * @param uploadFn - Function to upload the file
   * @returns Promise resolving to the upload result
   */
  const uploadWithProgress = async <T>(
    filePath: string,
    uploadFn: (data: Buffer) => Promise<T>
  ): Promise<T> => {
    try {
      // Update the label with the filename
      progress.setLabel(path.basename(filePath));
      
      // Get file size
      const stats = await fs.promises.stat(filePath);
      
      // Read file
      const data = await fs.promises.readFile(filePath);
      
      // Update progress to 50% after reading
      progress.setValue(50);
      
      // Upload file
      const result = await uploadFn(data);
      
      // Complete progress
      progress.complete();
      
      return result;
    } catch (error) {
      // Handle error
      progress.setLabel(`Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };
  
  return {
    progress,
    uploadWithProgress
  };
}

/**
 * Hook for tracking file download progress
 */
export function useFileDownloadProgress() {
  const progress = useProgressBar({
    initialValue: 0,
    max: 100,
  });
  
  /**
   * Download a file with progress tracking
   * 
   * @param url - URL to download
   * @param destinationPath - Path to save the file
   * @returns Promise resolving to the destination path
   */
  const downloadWithProgress = async (
    url: string,
    destinationPath: string
  ): Promise<string> => {
    try {
      // Update label with filename
      const fileName = path.basename(url);
      progress.setLabel(fileName);
      
      // Create directory if it doesn't exist
      await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
      
      // Simulate download progress for now
      // In a real implementation, you would use a fetch with progress events
      for (let i = 0; i <= 10; i++) {
        progress.setValue(i * 10);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Complete progress
      progress.complete();
      
      return destinationPath;
    } catch (error) {
      // Handle error
      progress.setLabel(`Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };
  
  return {
    progress,
    downloadWithProgress
  };
}

/**
 * Hook for tracking long-running operations
 */
export function useOperationProgress() {
  const progress = useProgressBar({
    initialValue: 0,
    max: 100,
  });
  
  /**
   * Run an operation with progress tracking
   * 
   * @param label - Operation label
   * @param operation - Function to run
   * @returns Promise resolving to the operation result
   */
  const runWithProgress = async <T>(
    label: string,
    operation: (updateProgress: (value: number, message?: string) => void) => Promise<T>
  ): Promise<T> => {
    try {
      // Update label
      progress.setLabel(label);
      progress.setIndeterminate(false);
      
      // Run operation
      const result = await operation((value, message) => {
        progress.setValue(value);
        if (message) {
          progress.setLabel(message);
        }
      });
      
      // Complete progress
      progress.complete();
      
      return result;
    } catch (error) {
      // Handle error
      progress.setLabel(`Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };
  
  return {
    progress,
    runWithProgress
  };
}
