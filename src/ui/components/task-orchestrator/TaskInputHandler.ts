/**
 * Task Input Handler - Clean Architecture like Gemini CLI
 * 
 * Handles keyboard input, navigation, and user interactions for task orchestrator
 */

import type { TaskDefinition, TaskDisplayState, TaskOrchestratorCallbacks } from './types.js';
import { TaskStatusService } from './TaskStatusService.js';

/**
 * Input handler configuration
 */
export interface InputHandlerConfig {
  isFocused: boolean;
  displayTasks: TaskDefinition[];
  displayState: TaskDisplayState;
  callbacks: TaskOrchestratorCallbacks;
}

/**
 * Task input handler service
 */
export class TaskInputHandler {
  /**
   * Handle keyboard input for task orchestrator
   */
  static handleInput(
    input: string,
    key: any,
    config: InputHandlerConfig,
    updateDisplayState: (updates: Partial<TaskDisplayState>) => void
  ): void {
    if (!config.isFocused) return;
    
    const { displayTasks, displayState, callbacks } = config;
    
    // Navigation
    if (key.upArrow) {
      updateDisplayState({
        selectedTaskIndex: Math.max(0, displayState.selectedTaskIndex - 1)
      });
      return;
    }
    
    if (key.downArrow) {
      updateDisplayState({
        selectedTaskIndex: Math.min(displayTasks.length - 1, displayState.selectedTaskIndex + 1)
      });
      return;
    }
    
    // Task expansion
    if (key.return) {
      const selectedTask = displayTasks[displayState.selectedTaskIndex];
      if (selectedTask) {
        const newExpandedTasks = new Set(displayState.expandedTasks);
        if (newExpandedTasks.has(selectedTask.id)) {
          newExpandedTasks.delete(selectedTask.id);
        } else {
          newExpandedTasks.add(selectedTask.id);
        }
        updateDisplayState({ expandedTasks: newExpandedTasks });
      }
      return;
    }
    
    // Character-based commands
    switch (input) {
      case 's':
        this.handleToggleSubTasks(displayTasks, displayState, updateDisplayState);
        break;
        
      case 'r':
        this.handleRetryTask(displayTasks, displayState, callbacks);
        break;
        
      case 'p':
        this.handlePauseResume(callbacks);
        break;
        
      case 'c':
        this.handleCancel(callbacks);
        break;
        
      case 'e':
        this.handleExpandAll(displayTasks, updateDisplayState);
        break;
        
      case 'o':
        this.handleCollapseAll(updateDisplayState);
        break;
    }
  }

  /**
   * Toggle sub-tasks display for selected task
   */
  private static handleToggleSubTasks(
    displayTasks: TaskDefinition[],
    displayState: TaskDisplayState,
    updateDisplayState: (updates: Partial<TaskDisplayState>) => void
  ): void {
    const selectedTask = displayTasks[displayState.selectedTaskIndex];
    if (selectedTask && selectedTask.subTasks) {
      const newShowSubTasks = new Set(displayState.showSubTasks);
      if (newShowSubTasks.has(selectedTask.id)) {
        newShowSubTasks.delete(selectedTask.id);
      } else {
        newShowSubTasks.add(selectedTask.id);
      }
      updateDisplayState({ showSubTasks: newShowSubTasks });
    }
  }

  /**
   * Retry failed task
   */
  private static handleRetryTask(
    displayTasks: TaskDefinition[],
    displayState: TaskDisplayState,
    callbacks: TaskOrchestratorCallbacks
  ): void {
    const selectedTask = displayTasks[displayState.selectedTaskIndex];
    if (selectedTask && TaskStatusService.canRetryTask(selectedTask.status, selectedTask.retryable) && callbacks.onRetry) {
      callbacks.onRetry(selectedTask.id);
    }
  }

  /**
   * Handle pause/resume workflow
   */
  private static handlePauseResume(callbacks: TaskOrchestratorCallbacks): void {
    // Note: This would need workflow status to determine pause vs resume
    // For now, try both callbacks
    if (callbacks.onPause) {
      callbacks.onPause();
    }
    if (callbacks.onResume) {
      callbacks.onResume();
    }
  }

  /**
   * Handle cancel workflow
   */
  private static handleCancel(callbacks: TaskOrchestratorCallbacks): void {
    if (callbacks.onCancel) {
      callbacks.onCancel();
    }
  }

  /**
   * Expand all tasks
   */
  private static handleExpandAll(
    displayTasks: TaskDefinition[],
    updateDisplayState: (updates: Partial<TaskDisplayState>) => void
  ): void {
    const expandedTasks = new Set(displayTasks.map(task => task.id));
    updateDisplayState({ expandedTasks });
  }

  /**
   * Collapse all tasks
   */
  private static handleCollapseAll(
    updateDisplayState: (updates: Partial<TaskDisplayState>) => void
  ): void {
    updateDisplayState({ 
      expandedTasks: new Set(),
      showSubTasks: new Set()
    });
  }

  /**
   * Get keyboard shortcuts help text
   */
  static getKeyboardShortcuts(): string {
    return '↑/↓: Navigate • Enter: Expand • S: Sub-tasks • R: Retry • P: Pause/Resume • C: Cancel • E: Expand All • O: Collapse All';
  }
} 