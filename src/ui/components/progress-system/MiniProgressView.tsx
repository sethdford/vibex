/**
 * Mini Progress View Component - Clean Architecture
 * 
 * Single Responsibility: Mini progress indicators
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Text } from 'ink';
import { Colors } from '../../colors.js';
import type { 
  ProgressSize, 
  ProgressThemeColors, 
  ProgressAnimationState,
  ProgressSizeConfig 
} from './types.js';
import type { StatusType } from '../StatusIcon.js';
import type { ProgressAnimationService } from './AnimationService.js';

/**
 * Mini progress view props
 */
interface MiniProgressViewProps {
  value: number;
  size: ProgressSize;
  active: boolean;
  animated: boolean;
  status: StatusType;
  themeColors: ProgressThemeColors;
  animationState: ProgressAnimationState;
  animationService: ProgressAnimationService;
  character: string;
  emptyCharacter: string;
}

/**
 * Mini Progress View Component
 * Focus: Compact progress indicators
 */
export const MiniProgressView: React.FC<MiniProgressViewProps> = ({
  value,
  size,
  active,
  animated,
  status,
  themeColors,
  animationState,
  animationService,
  character,
  emptyCharacter,
}) => {
  // Size configurations
  const sizeConfigs: Record<ProgressSize, ProgressSizeConfig> = {
    small: { width: 5, stages: ['○', '◔', '◑', '◕', '●'] },
    medium: { width: 10, stages: ['○', '◔', '◑', '◕', '●'] },
    large: { width: 15, stages: ['○', '◔', '◑', '◕', '●'] },
  };

  // Status colors
  const statusColors: Record<StatusType, string> = {
    running: Colors.AccentBlue,
    success: Colors.Success,
    completed: Colors.Success,
    error: Colors.Error,
    failed: Colors.Error,
    warning: Colors.Warning,
    info: Colors.Info,
    waiting: Colors.TextMuted,
    paused: Colors.TextDim,
  };

  // Render inactive state
  if (!active) {
    return <Text color={Colors.TextDim}>◦◦◦</Text>;
  }

  // Render indeterminate spinner
  if (animated) {
    const spinnerChar = animationService.getSpinnerCharacter(animationState.frame);
    return <Text color={statusColors[status]}>{spinnerChar}</Text>;
  }

  // Render static indeterminate
  return <Text color={statusColors[status]}>⣶</Text>;
};

/**
 * Render determinate mini progress
 */
const renderDeterminateProgress = (
  value: number,
  size: ProgressSize,
  themeColors: ProgressThemeColors,
  character: string,
  emptyCharacter: string,
  sizeConfigs: Record<ProgressSize, ProgressSizeConfig>
) => {
  const config = sizeConfigs[size];
  
  if (size === 'small') {
    const stageIndex = Math.min(4, Math.floor((value / 100) * config.stages.length));
    return <Text color={themeColors.fill}>{config.stages[stageIndex]}</Text>;
  }
  
  const filledWidth = Math.round((value / 100) * config.width);
  return (
    <>
      <Text color={themeColors.fill}>{character.repeat(filledWidth)}</Text>
      <Text color={themeColors.background}>{emptyCharacter.repeat(config.width - filledWidth)}</Text>
    </>
  );
}; 