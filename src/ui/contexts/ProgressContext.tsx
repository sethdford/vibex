/**
 * Progress Context
 * 
 * Provides a centralized way to manage progress indicators across the application.
 * Enhanced with step tracking, time estimation, and detailed progress information.
 */

import type { ReactNode} from 'react';
import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import type { StatusType } from '../components/StatusIcon.js';
import type { ProgressStep } from '../components/DetailedProgressInfo.js';

/**
 * Progress data structure
 */
export interface ProgressData {
  /**
   * Unique identifier for the progress
   */
  id: string;
  
  /**
   * Current value (0-100)
   */
  value: number;
  
  /**
   * Total value for calculating percentage
   */
  total: number;
  
  /**
   * Descriptive label
   */
  label: string;
  
  /**
   * Whether this is an indeterminate progress
   */
  indeterminate: boolean;
  
  /**
   * Whether this progress is active
   */
  active: boolean;
  
  /**
   * Progress details or status message
   */
  message?: string;
  
  /**
   * When the progress started
   */
  startTime: number;
  
  /**
   * When the progress was last updated
   */
  updateTime: number;
  
  /**
   * When the progress completed (if finished)
   */
  endTime?: number;
  
  /**
   * Current step (for multi-step operations)
   */
  currentStep?: number;
  
  /**
   * Total number of steps
   */
  totalSteps?: number;
  
  /**
   * Array of progress steps
   */
  steps?: ProgressStep[];
  
  /**
   * Status of the progress
   */
  status: StatusType;
  
  /**
   * Estimated time remaining (in seconds)
   */
  estimatedTimeRemaining?: number;
  
  /**
   * Rate of progress (units per second)
   */
  progressRate?: number;
  
  /**
   * History of progress updates for time estimation
   */
  progressHistory: Array<{ time: number; value: number }>;
}

/**
 * Progress context value interface
 */
interface ProgressContextValue {
  /**
   * Map of progress items by ID
   */
  progressItems: Map<string, ProgressData>;
  
  /**
   * Start a new progress tracking
   */
  startProgress: (id: string, options?: Partial<ProgressData>) => void;
  
  /**
   * Update an existing progress
   */
  updateProgress: (id: string, value: number, message?: string) => void;
  
  /**
   * Complete a progress tracking
   */
  completeProgress: (id: string, message?: string) => void;
  
  /**
   * Set a progress as indeterminate
   */
  setIndeterminate: (id: string, indeterminate: boolean) => void;
  
  /**
   * Get a specific progress item
   */
  getProgress: (id: string) => ProgressData | undefined;
  
  /**
   * Check if a progress item exists
   */
  hasProgress: (id: string) => boolean;
  
  /**
   * Update progress steps
   */
  updateSteps: (id: string, steps: ProgressStep[]) => void;
  
  /**
   * Start a new step
   */
  startStep: (id: string, stepName: string) => void;
  
  /**
   * Complete current step
   */
  completeStep: (id: string, status?: StatusType) => void;
  
  /**
   * Set status for progress
   */
  setStatus: (id: string, status: StatusType) => void;
}

// Create context
export const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

/**
 * Progress context provider props
 */
interface ProgressProviderProps {
  /**
   * Child components
   */
  children: ReactNode;
}

/**
 * Progress context provider component
 */
export const ProgressProvider: React.FC<ProgressProviderProps> = ({ children }) => {
  // State for progress items
  const [progressItems, setProgressItems] = useState<Map<string, ProgressData>>(
    new Map()
  );
  
  // Reference to interval for time estimation updates
  const estimationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Start a new progress tracking
   */
  const startProgress = useCallback((id: string, options: Partial<ProgressData> = {}) => {
    setProgressItems(prevItems => {
      const newItems = new Map(prevItems);
      const now = Date.now();
      
      newItems.set(id, {
        id,
        value: options.value ?? 0,
        total: options.total ?? 100,
        label: options.label ?? id,
        indeterminate: options.indeterminate ?? false,
        active: true,
        message: options.message,
        startTime: now,
        updateTime: now,
        currentStep: options.currentStep,
        totalSteps: options.totalSteps,
        steps: options.steps ?? [],
        status: options.status ?? 'running',
        progressHistory: [{ time: now, value: options.value ?? 0 }],
      });
      
      return newItems;
    });
  }, []);
  
  /**
   * Update an existing progress
   */
  const updateProgress = useCallback((id: string, value: number, message?: string) => {
    setProgressItems(prevItems => {
      if (!prevItems.has(id)) {return prevItems;}
      
      const newItems = new Map(prevItems);
      const item = prevItems.get(id)!;
      const now = Date.now();
      
      // Calculate progress rate and estimated time
      let estimatedTimeRemaining: number | undefined;
      let progressRate: number | undefined;
      
      // Store progress history (keeping last 10 points)
      const newHistory = [...item.progressHistory, { time: now, value }]
        .slice(-10);
      
      // Only calculate rate if we have multiple data points
      if (newHistory.length >= 2) {
        const oldestPoint = newHistory[0];
        const timeSpanSec = (now - oldestPoint.time) / 1000;
        if (timeSpanSec > 0) {
          const valueChange = value - oldestPoint.value;
          progressRate = valueChange / timeSpanSec;
          
          // Only calculate time remaining if making progress
          if (progressRate > 0) {
            const remaining = item.total - value;
            estimatedTimeRemaining = remaining / progressRate;
          }
        }
      }
      
      newItems.set(id, {
        ...item,
        value: Math.min(100, Math.max(0, value)),
        message: message ?? item.message,
        updateTime: now,
        progressRate,
        estimatedTimeRemaining,
        progressHistory: newHistory,
      });
      
      return newItems;
    });
  }, []);
  
  /**
   * Complete a progress tracking
   */
  const completeProgress = useCallback((id: string, message?: string) => {
    setProgressItems(prevItems => {
      if (!prevItems.has(id)) {return prevItems;}
      
      const newItems = new Map(prevItems);
      const item = prevItems.get(id)!;
      const now = Date.now();
      
      // Complete any in-progress steps
      const updatedSteps = item.steps?.map(step => {
        if (step.status === 'running') {
          return { ...step, status: 'completed' as StatusType, endTime: now };
        }
        return step;
      });
      
      newItems.set(id, {
        ...item,
        value: 100,
        active: false,
        message: message ?? item.message,
        updateTime: now,
        endTime: now,
        status: 'completed',
        estimatedTimeRemaining: 0,
        steps: updatedSteps,
      });
      
      // Auto-remove completed items after a delay
      setTimeout(() => {
        setProgressItems(items => {
          const updated = new Map(items);
          if (updated.has(id) && !updated.get(id)!.active) {
            updated.delete(id);
          }
          return updated;
        });
      }, 5000);
      
      return newItems;
    });
  }, []);
  
  /**
   * Set a progress as indeterminate
   */
  const setIndeterminate = useCallback((id: string, indeterminate: boolean) => {
    setProgressItems(prevItems => {
      if (!prevItems.has(id)) {return prevItems;}
      
      const newItems = new Map(prevItems);
      const item = prevItems.get(id)!;
      
      newItems.set(id, {
        ...item,
        indeterminate,
        updateTime: Date.now(),
      });
      
      return newItems;
    });
  }, []);
  
  /**
   * Get a specific progress item
   */
  const getProgress = useCallback((id: string) => progressItems.get(id), [progressItems]);
  
  /**
   * Check if a progress item exists
   */
  const hasProgress = useCallback((id: string) => progressItems.has(id), [progressItems]);
  
  /**
   * Update progress steps
   */
  const updateSteps = useCallback((id: string, steps: ProgressStep[]) => {
    setProgressItems(prevItems => {
      if (!prevItems.has(id)) {return prevItems;}
      
      const newItems = new Map(prevItems);
      const item = prevItems.get(id)!;
      
      newItems.set(id, {
        ...item,
        steps,
        updateTime: Date.now(),
      });
      
      return newItems;
    });
  }, []);
  
  /**
   * Start a new step
   */
  const startStep = useCallback((id: string, stepName: string) => {
    setProgressItems(prevItems => {
      if (!prevItems.has(id)) {return prevItems;}
      
      const newItems = new Map(prevItems);
      const item = prevItems.get(id)!;
      const now = Date.now();
      
      // Create new step
      const newStep: ProgressStep = {
        name: stepName,
        status: 'running',
        startTime: now,
      };
      
      // Complete any currently running steps
      const updatedSteps = item.steps?.map(step => {
        if (step.status === 'running') {
          return { ...step, status: 'completed' as StatusType, endTime: now };
        }
        return step;
      }) || [];
      
      // Add new step
      updatedSteps.push(newStep);
      
      // Update current step counter
      const currentStep = (item.currentStep || 0) + 1;
      
      newItems.set(id, {
        ...item,
        steps: updatedSteps,
        currentStep,
        updateTime: now,
        message: `Step ${currentStep}${item.totalSteps ? `/${item.totalSteps}` : ''}: ${stepName}`,
      });
      
      return newItems;
    });
  }, []);
  
  /**
   * Complete current step
   */
  const completeStep = useCallback((id: string, status: StatusType = 'completed') => {
    setProgressItems(prevItems => {
      if (!prevItems.has(id)) {return prevItems;}
      
      const newItems = new Map(prevItems);
      const item = prevItems.get(id)!;
      const now = Date.now();
      
      // Find and complete the current running step
      const updatedSteps = item.steps?.map(step => {
        if (step.status === 'running') {
          return { ...step, status, endTime: now };
        }
        return step;
      }) || [];
      
      newItems.set(id, {
        ...item,
        steps: updatedSteps,
        updateTime: now,
      });
      
      return newItems;
    });
  }, []);
  
  /**
   * Set status for progress
   */
  const setStatus = useCallback((id: string, status: StatusType) => {
    setProgressItems(prevItems => {
      if (!prevItems.has(id)) {return prevItems;}
      
      const newItems = new Map(prevItems);
      const item = prevItems.get(id)!;
      
      newItems.set(id, {
        ...item,
        status,
        updateTime: Date.now(),
      });
      
      return newItems;
    });
  }, []);
  
  // Periodically update time estimates
  useEffect(() => {
    // Update time estimates every 1 second
    estimationIntervalRef.current = setInterval(() => {
      setProgressItems(prevItems => {
        // Skip if no active items
        if (![...prevItems.values()].some(item => item.active)) {return prevItems;}
        
        const newItems = new Map(prevItems);
        const now = Date.now();
        
        // Update each active item
        prevItems.forEach(item => {
          if (item.active) {
            newItems.set(item.id, {
              ...item,
              // No need to update other fields
            });
          }
        });
        
        return newItems;
      });
    }, 1000);
    
    return () => {
      if (estimationIntervalRef.current) {
        clearInterval(estimationIntervalRef.current);
      }
    };
  }, []);

  const value: ProgressContextValue = {
    progressItems,
    startProgress,
    updateProgress,
    completeProgress,
    setIndeterminate,
    getProgress,
    hasProgress,
    updateSteps,
    startStep,
    completeStep,
    setStatus,
  };
  
  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};

/**
 * Hook for using the progress context
 */
export function useProgress() {
  const context = useContext(ProgressContext);
  
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  
  return context;
}