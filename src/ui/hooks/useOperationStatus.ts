/**
 * Operation Status Hook
 * 
 * Tracks actual operations being performed by VibeX, providing detailed status
 * information similar to Gemini CLI's tool status system.
 */

import { useState, useEffect } from 'react';

export interface OperationStatus {
  id: string;
  name: string;
  status: 'pending' | 'executing' | 'success' | 'error';
  description: string;
  startTime: number;
  endTime?: number;
  details?: string;
}

export interface OperationTracker {
  operations: OperationStatus[];
  currentOperation: OperationStatus | null;
  startOperation: (name: string, description: string) => string;
  updateOperation: (id: string, status: OperationStatus['status'], details?: string) => void;
  completeOperation: (id: string, success: boolean, details?: string) => void;
  clearOperations: () => void;
}

/**
 * Hook for tracking operations with detailed status information
 * 
 * @returns Operation tracker with methods to manage operations
 */
export function useOperationStatus(): OperationTracker {
  const [operations, setOperations] = useState<OperationStatus[]>([]);
  const [currentOperation, setCurrentOperation] = useState<OperationStatus | null>(null);
  
  const startOperation = (name: string, description: string): string => {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const operation: OperationStatus = {
      id,
      name,
      status: 'pending',
      description,
      startTime: Date.now(),
    };
    
    setOperations(prev => [...prev, operation]);
    setCurrentOperation(operation);
    
    return id;
  };
  
  const updateOperation = (id: string, status: OperationStatus['status'], details?: string) => {
    setOperations(prev => prev.map(op => 
      op.id === id ? { ...op, status, details } : op
    ));
    
    // Update current operation if it's the one being updated
    setCurrentOperation(prev => 
      prev?.id === id ? { ...prev, status, details } : prev
    );
  };
  
  const completeOperation = (id: string, success: boolean, details?: string) => {
    const endTime = Date.now();
    const status = success ? 'success' : 'error';
    
    setOperations(prev => prev.map(op => 
      op.id === id ? { ...op, status, endTime, details } : op
    ));
    
    // Clear current operation if it's the one being completed
    setCurrentOperation(prev => 
      prev?.id === id ? null : prev
    );
  };
  
  const clearOperations = () => {
    setOperations([]);
    setCurrentOperation(null);
  };
  
  return {
    operations,
    currentOperation,
    startOperation,
    updateOperation,
    completeOperation,
    clearOperations,
  };
} 