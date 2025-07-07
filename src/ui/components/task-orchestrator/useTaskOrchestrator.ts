/**
 * Task Orchestrator Hook - Clean Architecture like Gemini CLI
 * 
 * Focused hook for managing task orchestration state and operations
 */

import { useState } from 'react';
import type { WorkflowDefinition, TaskDefinition, TaskExecutionContext } from './types.js';

/**
 * Task orchestrator hook for managing workflows and tasks
 */
export function useTaskOrchestrator() {
  const [workflows, setWorkflows] = useState<Map<string, WorkflowDefinition>>(new Map());
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);

  /**
   * Create a new workflow
   */
  const createWorkflow = (
    id: string,
    name: string,
    description: string,
    tasks: TaskDefinition[],
    context: TaskExecutionContext
  ): WorkflowDefinition => {
    const workflow: WorkflowDefinition = {
      id,
      name,
      description,
      tasks,
      context,
      status: 'idle',
      progress: 0,
    };
    
    setWorkflows(prev => new Map(prev.set(id, workflow)));
    return workflow;
  };

  /**
   * Update workflow properties
   */
  const updateWorkflow = (id: string, updates: Partial<WorkflowDefinition>) => {
    setWorkflows(prev => {
      const current = prev.get(id);
      if (!current) return prev;
      
      const updated = { ...current, ...updates };
      return new Map(prev.set(id, updated));
    });
  };

  /**
   * Update a specific task within a workflow
   */
  const updateTask = (workflowId: string, taskId: string, updates: Partial<TaskDefinition>) => {
    setWorkflows(prev => {
      const workflow = prev.get(workflowId);
      if (!workflow) return prev;
      
      const updatedTasks = workflow.tasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      
      const updatedWorkflow = { ...workflow, tasks: updatedTasks };
      return new Map(prev.set(workflowId, updatedWorkflow));
    });
  };

  /**
   * Start workflow execution
   */
  const startWorkflow = (id: string) => {
    updateWorkflow(id, {
      status: 'running',
      startTime: Date.now(),
    });
    setActiveWorkflowId(id);
  };

  /**
   * Pause workflow execution
   */
  const pauseWorkflow = (id: string) => {
    updateWorkflow(id, { status: 'paused' });
  };

  /**
   * Resume workflow execution
   */
  const resumeWorkflow = (id: string) => {
    updateWorkflow(id, { status: 'running' });
  };

  /**
   * Cancel workflow execution
   */
  const cancelWorkflow = (id: string) => {
    updateWorkflow(id, {
      status: 'failed',
      endTime: Date.now(),
    });
    
    if (activeWorkflowId === id) {
      setActiveWorkflowId(null);
    }
  };

  /**
   * Complete workflow execution
   */
  const completeWorkflow = (id: string) => {
    updateWorkflow(id, {
      status: 'completed',
      endTime: Date.now(),
      progress: 100,
    });
    
    if (activeWorkflowId === id) {
      setActiveWorkflowId(null);
    }
  };

  /**
   * Get workflow by ID
   */
  const getWorkflow = (id: string) => workflows.get(id);

  /**
   * Get currently active workflow
   */
  const getActiveWorkflow = () => activeWorkflowId ? workflows.get(activeWorkflowId) : undefined;

  /**
   * Get all workflows as array
   */
  const getAllWorkflows = () => Array.from(workflows.values());

  /**
   * Delete workflow
   */
  const deleteWorkflow = (id: string) => {
    setWorkflows(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
    
    if (activeWorkflowId === id) {
      setActiveWorkflowId(null);
    }
  };

  /**
   * Add task to workflow
   */
  const addTask = (workflowId: string, task: TaskDefinition) => {
    setWorkflows(prev => {
      const workflow = prev.get(workflowId);
      if (!workflow) return prev;
      
      const updatedWorkflow = {
        ...workflow,
        tasks: [...workflow.tasks, task]
      };
      
      return new Map(prev.set(workflowId, updatedWorkflow));
    });
  };

  /**
   * Remove task from workflow
   */
  const removeTask = (workflowId: string, taskId: string) => {
    setWorkflows(prev => {
      const workflow = prev.get(workflowId);
      if (!workflow) return prev;
      
      const updatedWorkflow = {
        ...workflow,
        tasks: workflow.tasks.filter(task => task.id !== taskId)
      };
      
      return new Map(prev.set(workflowId, updatedWorkflow));
    });
  };

  return {
    // State
    workflows: Array.from(workflows.values()),
    activeWorkflow: getActiveWorkflow(),
    
    // Workflow operations
    createWorkflow,
    updateWorkflow,
    startWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    completeWorkflow,
    deleteWorkflow,
    getWorkflow,
    getAllWorkflows,
    
    // Task operations
    updateTask,
    addTask,
    removeTask,
  };
} 