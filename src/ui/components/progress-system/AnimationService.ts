/**
 * Progress Animation Service - Clean Architecture
 * 
 * Single Responsibility: Animation management for progress components
 * Following Gemini CLI's focused service patterns
 */

import type { 
  AnimationStyle, 
  ProgressAnimationState, 
  ProgressMode 
} from './types.js';

/**
 * Animation configuration
 */
interface AnimationConfig {
  speed: number;
  frames: string[] | number[];
  direction: 'forward' | 'reverse' | 'bounce';
}

/**
 * Progress Animation Service
 * Focus: Animation logic and state management
 */
export class ProgressAnimationService {
  private animationConfigs: Record<AnimationStyle, AnimationConfig>;
  private spinnerFrames = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];
  private bounceFrames = [3, 2, 1];
  private slideFrames = [5, 4, 3, 2, 1];

  constructor() {
    this.animationConfigs = {
      simple: { speed: 100, frames: this.spinnerFrames, direction: 'forward' },
      gradient: { speed: 80, frames: this.spinnerFrames, direction: 'forward' },
      pulse: { speed: 60, frames: [0.3, 0.5, 0.7, 1.0, 0.7, 0.5], direction: 'bounce' },
      wave: { speed: 120, frames: this.slideFrames, direction: 'forward' },
      bounce: { speed: 100, frames: this.bounceFrames, direction: 'bounce' },
      slide: { speed: 80, frames: this.slideFrames, direction: 'forward' }
    };
  }

  /**
   * Create initial animation state
   */
  createInitialState(): ProgressAnimationState {
    return {
      frame: 0,
      position: 0,
      reverse: false,
      opacity: 1,
      animatedValue: 0
    };
  }

  /**
   * Update animation frame for spinner-style animations
   */
  updateSpinnerFrame(currentFrame: number, style: AnimationStyle): number {
    const config = this.animationConfigs[style];
    const frames = config.frames as string[];
    return (currentFrame + 1) % frames.length;
  }

  /**
   * Update position-based animation (slide, bounce, wave)
   */
  updatePositionAnimation(
    state: ProgressAnimationState,
    style: AnimationStyle,
    width: number
  ): ProgressAnimationState {
    const config = this.animationConfigs[style];
    const frames = config.frames as number[];
    const maxWidth = width - Math.max(...frames);

    let newPosition = state.position;
    let newReverse = state.reverse;

    if (state.reverse) {
      if (state.position <= 0) {
        newReverse = false;
        newPosition = 0;
      } else {
        newPosition = state.position - 1;
      }
    } else {
      if (state.position >= maxWidth) {
        newReverse = config.direction === 'bounce';
        newPosition = config.direction === 'bounce' ? state.position : 0;
      } else {
        newPosition = state.position + 1;
      }
    }

    return {
      ...state,
      position: newPosition,
      reverse: newReverse
    };
  }

  /**
   * Update pulse animation opacity
   */
  updatePulseAnimation(state: ProgressAnimationState): ProgressAnimationState {
    const config = this.animationConfigs.pulse;
    const frames = config.frames as number[];
    
    let newOpacity = state.opacity;
    let newReverse = state.reverse;

    if (state.reverse) {
      if (state.opacity <= 0.3) {
        newReverse = false;
        newOpacity = 0.3;
      } else {
        newOpacity = Math.max(0.3, state.opacity - 0.1);
      }
    } else {
      if (state.opacity >= 1.0) {
        newReverse = true;
        newOpacity = 0.9;
      } else {
        newOpacity = Math.min(1.0, state.opacity + 0.1);
      }
    }

    return {
      ...state,
      opacity: newOpacity,
      reverse: newReverse
    };
  }

  /**
   * Update smooth value animation
   */
  updateSmoothValueAnimation(
    currentValue: number,
    targetValue: number,
    animatedValue: number,
    duration: number = 300
  ): number {
    const diff = targetValue - currentValue;
    
    // If difference is large or starting from 0, jump immediately
    if (Math.abs(diff) > 20 || animatedValue === 0) {
      return targetValue;
    }

    // Simple easing - in a real implementation you'd use requestAnimationFrame
    const progress = 0.1; // 10% per frame
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
    
    return animatedValue + diff * easeProgress;
  }

  /**
   * Generate animated progress bar string
   */
  generateAnimatedProgressBar(
    value: number,
    width: number,
    character: string,
    emptyCharacter: string,
    mode: ProgressMode,
    style: AnimationStyle,
    state: ProgressAnimationState,
    active: boolean
  ): string {
    if (mode === 'indeterminate') {
      return this.generateIndeterminateBar(
        width, 
        character, 
        emptyCharacter, 
        style, 
        state, 
        active
      );
    }

    // Standard progress bar
    const normalizedValue = Math.min(100, Math.max(0, state.animatedValue));
    const filledWidth = Math.round((normalizedValue / 100) * width);
    return character.repeat(filledWidth) + emptyCharacter.repeat(width - filledWidth);
  }

  /**
   * Generate indeterminate progress bar
   */
  generateIndeterminateBar(
    width: number,
    character: string,
    emptyCharacter: string,
    style: AnimationStyle,
    state: ProgressAnimationState,
    active: boolean
  ): string {
    if (!active) {
      return emptyCharacter.repeat(width);
    }

    if (style === 'pulse') {
      return character.repeat(width);
    }

    // Position-based animations
    let bar = emptyCharacter.repeat(width);
    const config = this.animationConfigs[style];
    const frames = config.frames as number[];

    frames.forEach((frameWidth, index) => {
      const pos = state.position + index;
      if (pos >= 0 && pos < width) {
        bar = bar.substring(0, pos) + character + bar.substring(pos + 1);
      }
    });

    return bar;
  }

  /**
   * Get spinner character for current frame
   */
  getSpinnerCharacter(frame: number, style: AnimationStyle = 'simple'): string {
    const config = this.animationConfigs[style];
    const frames = config.frames as string[];
    return frames[frame % frames.length];
  }

  /**
   * Get animation speed for style
   */
  getAnimationSpeed(style: AnimationStyle): number {
    return this.animationConfigs[style].speed;
  }

  /**
   * Check if animation style uses position
   */
  isPositionBasedAnimation(style: AnimationStyle): boolean {
    return ['slide', 'bounce', 'wave'].includes(style);
  }

  /**
   * Check if animation style uses opacity
   */
  isOpacityBasedAnimation(style: AnimationStyle): boolean {
    return style === 'pulse';
  }

  /**
   * Update animation configuration
   */
  updateAnimationConfig(style: AnimationStyle, config: Partial<AnimationConfig>): void {
    this.animationConfigs[style] = { ...this.animationConfigs[style], ...config };
  }

  /**
   * Get all available animation styles
   */
  getAvailableStyles(): AnimationStyle[] {
    return Object.keys(this.animationConfigs) as AnimationStyle[];
  }
}

/**
 * Factory function for creating animation service
 */
export function createProgressAnimationService(): ProgressAnimationService {
  return new ProgressAnimationService();
} 