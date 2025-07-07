/**
 * Control State Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for managing workflow control state and transitions
 */

import { 
  WorkflowControlState, 
  DebugBreakpoint, 
  RetryConfiguration, 
  InteractiveControlsState,
  ControlAction,
  ConfirmationAction
} from './types.js';

/**
 * Service for managing interactive workflow control state
 */
export class ControlStateService {
  private state: InteractiveControlsState;
  private listeners: Array<(state: InteractiveControlsState) => void> = [];

  constructor(defaultRetryConfig: RetryConfiguration) {
    this.state = {
      controlState: 'idle',
      selectedTaskIndex: 0,
      showConfirmation: null,
      showRetryDialog: false,
      customRetryConfig: {},
      breakpoints: [],
      retryHistory: new Map<string, number>()
    };
  }

  /**
   * Get current state
   */
  getState(): InteractiveControlsState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: InteractiveControlsState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Update state
   */
  private updateState(updates: Partial<InteractiveControlsState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Set control state
   */
  setControlState(controlState: WorkflowControlState): void {
    this.updateState({ controlState });
  }

  /**
   * Set selected task index
   */
  setSelectedTaskIndex(index: number): void {
    this.updateState({ selectedTaskIndex: index });
  }

  /**
   * Show confirmation dialog
   */
  showConfirmation(action: ConfirmationAction): void {
    this.updateState({ showConfirmation: action });
  }

  /**
   * Hide confirmation dialog
   */
  hideConfirmation(): void {
    this.updateState({ showConfirmation: null });
  }

  /**
   * Show retry dialog
   */
  showRetryDialog(): void {
    this.updateState({ showRetryDialog: true });
  }

  /**
   * Hide retry dialog
   */
  hideRetryDialog(): void {
    this.updateState({ 
      showRetryDialog: false,
      customRetryConfig: {}
    });
  }

  /**
   * Update custom retry configuration
   */
  updateCustomRetryConfig(config: Partial<RetryConfiguration>): void {
    this.updateState({
      customRetryConfig: { ...this.state.customRetryConfig, ...config }
    });
  }

  /**
   * Add breakpoint
   */
  addBreakpoint(breakpoint: DebugBreakpoint): void {
    const breakpoints = [...this.state.breakpoints, breakpoint];
    this.updateState({ breakpoints });
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(breakpointId: string): void {
    const breakpoints = this.state.breakpoints.filter(bp => bp.id !== breakpointId);
    this.updateState({ breakpoints });
  }

  /**
   * Toggle breakpoint
   */
  toggleBreakpoint(breakpointId: string): void {
    const breakpoints = this.state.breakpoints.map(bp =>
      bp.id === breakpointId ? { ...bp, enabled: !bp.enabled } : bp
    );
    this.updateState({ breakpoints });
  }

  /**
   * Update breakpoint hit count
   */
  incrementBreakpointHitCount(breakpointId: string): void {
    const breakpoints = this.state.breakpoints.map(bp =>
      bp.id === breakpointId ? { ...bp, hitCount: bp.hitCount + 1 } : bp
    );
    this.updateState({ breakpoints });
  }

  /**
   * Set breakpoints
   */
  setBreakpoints(breakpoints: DebugBreakpoint[]): void {
    this.updateState({ breakpoints });
  }

  /**
   * Increment retry count for task
   */
  incrementRetryCount(taskId: string): void {
    const retryHistory = new Map(this.state.retryHistory);
    retryHistory.set(taskId, (retryHistory.get(taskId) || 0) + 1);
    this.updateState({ retryHistory });
  }

  /**
   * Get retry count for task
   */
  getRetryCount(taskId: string): number {
    return this.state.retryHistory.get(taskId) || 0;
  }

  /**
   * Reset retry history
   */
  resetRetryHistory(): void {
    this.updateState({ retryHistory: new Map() });
  }

  /**
   * Reset retry history for specific task
   */
  resetTaskRetryHistory(taskId: string): void {
    const retryHistory = new Map(this.state.retryHistory);
    retryHistory.delete(taskId);
    this.updateState({ retryHistory });
  }

  /**
   * Check if control state allows action
   */
  canExecuteAction(action: ControlAction): boolean {
    const { controlState } = this.state;

    switch (action) {
      case 'play':
        return controlState === 'idle';
      case 'pause':
        return controlState === 'running';
      case 'resume':
        return controlState === 'paused';
      case 'cancel':
        return controlState === 'running' || controlState === 'paused';
      case 'abort':
        return controlState !== 'idle' && controlState !== 'completed';
      case 'step':
      case 'step_into':
      case 'step_over':
      case 'step_out':
        return controlState === 'paused' || controlState === 'debugging';
      case 'reset':
        return controlState !== 'running';
      default:
        return false;
    }
  }

  /**
   * Get next valid actions
   */
  getValidActions(): ControlAction[] {
    const actions: ControlAction[] = [];
    
    (['play', 'pause', 'resume', 'cancel', 'abort', 'step', 'step_into', 'step_over', 'step_out', 'reset'] as ControlAction[])
      .forEach(action => {
        if (this.canExecuteAction(action)) {
          actions.push(action);
        }
      });

    return actions;
  }

  /**
   * Get control state icon
   */
  getControlStateIcon(): string {
    switch (this.state.controlState) {
      case 'idle':
        return '⏹️';
      case 'running':
        return '▶️';
      case 'paused':
        return '⏸️';
      case 'debugging':
        return '🐛';
      case 'cancelling':
        return '⏹️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Get control state label
   */
  getControlStateLabel(): string {
    switch (this.state.controlState) {
      case 'idle':
        return 'Ready';
      case 'running':
        return 'Running';
      case 'paused':
        return 'Paused';
      case 'debugging':
        return 'Debugging';
      case 'cancelling':
        return 'Cancelling';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.state = {
      controlState: 'idle',
      selectedTaskIndex: 0,
      showConfirmation: null,
      showRetryDialog: false,
      customRetryConfig: {},
      breakpoints: [],
      retryHistory: new Map()
    };
    this.notifyListeners();
  }

  /**
   * Get state summary for debugging
   */
  getStateSummary(): {
    controlState: WorkflowControlState;
    breakpointCount: number;
    activeBreakpoints: number;
    taskRetryCount: number;
    hasConfirmation: boolean;
    hasRetryDialog: boolean;
  } {
    return {
      controlState: this.state.controlState,
      breakpointCount: this.state.breakpoints.length,
      activeBreakpoints: this.state.breakpoints.filter(bp => bp.enabled).length,
      taskRetryCount: this.state.retryHistory.size,
      hasConfirmation: this.state.showConfirmation !== null,
      hasRetryDialog: this.state.showRetryDialog
    };
  }
} 