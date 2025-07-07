/**
 * Input Handler Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for handling keyboard input and shortcuts
 */

import { ControlAction, ConfirmationAction, InteractiveControlsCallbacks } from './types.js';
import { ControlStateService } from './ControlStateService.js';

/**
 * Keyboard input mapping
 */
interface KeyMapping {
  [key: string]: ControlAction | 'confirmation_yes' | 'confirmation_no' | 'escape' | 'enter' | 'task_up' | 'task_down' | 'breakpoint_toggle' | 'retry_dialog';
}

/**
 * Service for handling keyboard input and shortcuts
 */
export class InputHandlerService {
  private controlStateService: ControlStateService;
  private callbacks: InteractiveControlsCallbacks;
  private keyMappings: KeyMapping;

  constructor(
    controlStateService: ControlStateService,
    callbacks: InteractiveControlsCallbacks
  ) {
    this.controlStateService = controlStateService;
    this.callbacks = callbacks;
    this.keyMappings = this.createDefaultKeyMappings();
  }

  /**
   * Create default key mappings
   */
  private createDefaultKeyMappings(): KeyMapping {
    return {
      ' ': 'play', // Spacebar for play/pause/resume
      's': 'step',
      'i': 'step_into',
      'o': 'step_over',
      'u': 'step_out',
      'c': 'cancel',
      'a': 'abort',
      'r': 'retry_dialog',
      'b': 'breakpoint_toggle',
      'R': 'reset',
      'y': 'confirmation_yes',
      'Y': 'confirmation_yes',
      'n': 'confirmation_no',
      'N': 'confirmation_no',
      'ArrowUp': 'task_up',
      'ArrowDown': 'task_down',
      'Enter': 'enter',
      'Escape': 'escape'
    };
  }

  /**
   * Handle keyboard input
   */
  handleInput(input: string, key: any): boolean {
    const state = this.controlStateService.getState();

    // Handle confirmation dialogs first
    if (state.showConfirmation) {
      return this.handleConfirmationInput(input, key);
    }

    // Handle retry dialog
    if (state.showRetryDialog) {
      return this.handleRetryDialogInput(input, key);
    }

    // Handle main controls
    return this.handleMainControlsInput(input, key);
  }

  /**
   * Handle confirmation dialog input
   */
  private handleConfirmationInput(input: string, key: any): boolean {
    const action = this.keyMappings[input] || this.keyMappings[key.name];
    
    switch (action) {
      case 'confirmation_yes':
        this.executeConfirmationAction();
        this.controlStateService.hideConfirmation();
        return true;
      case 'confirmation_no':
      case 'escape':
        this.controlStateService.hideConfirmation();
        return true;
      default:
        return false;
    }
  }

  /**
   * Handle retry dialog input
   */
  private handleRetryDialogInput(input: string, key: any): boolean {
    const action = this.keyMappings[input] || this.keyMappings[key.name];
    
    switch (action) {
      case 'enter':
        this.executeRetryAction();
        this.controlStateService.hideRetryDialog();
        return true;
      case 'escape':
        this.controlStateService.hideRetryDialog();
        return true;
      default:
        // Handle retry configuration changes here if needed
        return false;
    }
  }

  /**
   * Handle main controls input
   */
  private handleMainControlsInput(input: string, key: any): boolean {
    const action = this.keyMappings[input] || this.keyMappings[key.name];
    const state = this.controlStateService.getState();

    switch (action) {
      case 'play':
        return this.handlePlayPauseResume();
      case 'step':
        return this.executeAction('step');
      case 'step_into':
        return this.executeAction('step_into');
      case 'step_over':
        return this.executeAction('step_over');
      case 'step_out':
        return this.executeAction('step_out');
      case 'cancel':
        this.controlStateService.showConfirmation('cancel');
        return true;
      case 'abort':
        this.controlStateService.showConfirmation('abort');
        return true;
      case 'reset':
        this.controlStateService.showConfirmation('reset');
        return true;
      case 'retry_dialog':
        this.controlStateService.showRetryDialog();
        return true;
      case 'breakpoint_toggle':
        return this.handleBreakpointToggle();
      case 'task_up':
        this.moveTaskSelection(-1);
        return true;
      case 'task_down':
        this.moveTaskSelection(1);
        return true;
      default:
        return false;
    }
  }

  /**
   * Handle play/pause/resume based on current state
   */
  private handlePlayPauseResume(): boolean {
    const state = this.controlStateService.getState();
    
    if (state.controlState === 'idle') {
      return this.executeAction('play');
    } else if (state.controlState === 'paused') {
      return this.executeAction('resume');
    } else if (state.controlState === 'running') {
      return this.executeAction('pause');
    }
    
    return false;
  }

  /**
   * Execute control action if allowed
   */
  private executeAction(action: ControlAction): boolean {
    if (!this.controlStateService.canExecuteAction(action)) {
      return false;
    }

    switch (action) {
      case 'play':
        this.callbacks.onPlay?.();
        this.controlStateService.setControlState('running');
        break;
      case 'pause':
        this.callbacks.onPause?.();
        this.controlStateService.setControlState('paused');
        break;
      case 'resume':
        this.callbacks.onResume?.();
        this.controlStateService.setControlState('running');
        break;
      case 'step':
        this.callbacks.onStep?.();
        break;
      case 'step_into':
        this.callbacks.onStepInto?.();
        break;
      case 'step_over':
        this.callbacks.onStepOver?.();
        break;
      case 'step_out':
        this.callbacks.onStepOut?.();
        break;
      default:
        return false;
    }

    return true;
  }

  /**
   * Execute confirmation action
   */
  private executeConfirmationAction(): void {
    const state = this.controlStateService.getState();
    
    if (!state.showConfirmation) return;

    switch (state.showConfirmation) {
      case 'cancel':
        this.callbacks.onCancel?.();
        this.controlStateService.setControlState('cancelling');
        // Simulate cleanup time
        setTimeout(() => {
          this.controlStateService.setControlState('idle');
        }, 1000);
        break;
      case 'abort':
        this.callbacks.onAbort?.();
        this.controlStateService.setControlState('idle');
        break;
      case 'reset':
        this.callbacks.onReset?.();
        this.controlStateService.reset();
        break;
    }
  }

  /**
   * Execute retry action
   */
  private executeRetryAction(): void {
    const state = this.controlStateService.getState();
    
    if (this.callbacks.onRetry) {
      // Get current task ID (this would need to be passed from workflow)
      const taskId = `task-${state.selectedTaskIndex}`; // Simplified
      this.callbacks.onRetry(taskId, state.customRetryConfig);
    }
  }

  /**
   * Handle breakpoint toggle
   */
  private handleBreakpointToggle(): boolean {
    const state = this.controlStateService.getState();
    
    // Get current task ID (this would need to be passed from workflow)
    const taskId = `task-${state.selectedTaskIndex}`; // Simplified
    
    // Check if breakpoint exists for current task
    const existingBreakpoint = state.breakpoints.find(bp => bp.taskId === taskId);
    
    if (existingBreakpoint) {
      this.callbacks.onToggleBreakpoint?.(existingBreakpoint.id);
    } else {
      this.callbacks.onAddBreakpoint?.(taskId);
    }
    
    return true;
  }

  /**
   * Move task selection
   */
  private moveTaskSelection(direction: number): void {
    const state = this.controlStateService.getState();
    const newIndex = Math.max(0, state.selectedTaskIndex + direction);
    this.controlStateService.setSelectedTaskIndex(newIndex);
  }

  /**
   * Get available shortcuts for current state
   */
  getAvailableShortcuts(): Array<{ key: string; description: string; available: boolean }> {
    const state = this.controlStateService.getState();
    const validActions = this.controlStateService.getValidActions();

    const shortcuts = [
      { key: 'Space', description: 'Play/Pause/Resume', available: validActions.includes('play') || validActions.includes('pause') || validActions.includes('resume') },
      { key: 'S', description: 'Step', available: validActions.includes('step') },
      { key: 'I', description: 'Step Into', available: validActions.includes('step_into') },
      { key: 'O', description: 'Step Over', available: validActions.includes('step_over') },
      { key: 'U', description: 'Step Out', available: validActions.includes('step_out') },
      { key: 'C', description: 'Cancel', available: validActions.includes('cancel') },
      { key: 'A', description: 'Abort', available: validActions.includes('abort') },
      { key: 'R', description: 'Retry', available: true },
      { key: 'B', description: 'Toggle Breakpoint', available: true },
      { key: 'Shift+R', description: 'Reset', available: validActions.includes('reset') },
      { key: '↑/↓', description: 'Select Task', available: true }
    ];

    return shortcuts;
  }

  /**
   * Update callbacks
   */
  updateCallbacks(callbacks: Partial<InteractiveControlsCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Update key mappings
   */
  updateKeyMappings(mappings: Partial<KeyMapping>): void {
    // Filter out undefined values to maintain type safety
    const filteredMappings = Object.fromEntries(
      Object.entries(mappings).filter(([_, value]) => value !== undefined)
    ) as KeyMapping;
    this.keyMappings = { ...this.keyMappings, ...filteredMappings };
  }

  /**
   * Get help text for current context
   */
  getContextualHelp(): string {
    const state = this.controlStateService.getState();

    if (state.showConfirmation) {
      return 'Y to confirm, N to cancel';
    }

    if (state.showRetryDialog) {
      return 'Enter to retry, Esc to cancel';
    }

    const availableShortcuts = this.getAvailableShortcuts()
      .filter(s => s.available)
      .map(s => `${s.key}: ${s.description}`)
      .join(' • ');

    return `Interactive Controls: ${availableShortcuts}`;
  }
} 