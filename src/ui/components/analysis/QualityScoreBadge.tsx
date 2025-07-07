/**
 * Quality Score Badge
 * 
 * Displays a quality score with appropriate color-coding and grading.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

/**
 * Badge size options
 */
export type BadgeSize = 'small' | 'medium' | 'large';

/**
 * Quality score badge props
 */
export interface QualityScoreBadgeProps {
  /**
   * Quality score (0-100)
   */
  score: number;
  
  /**
   * Badge size
   */
  size?: BadgeSize;
  
  /**
   * Optional label
   */
  label?: string;
  
  /**
   * Whether to show letter grade
   */
  showGrade?: boolean;
}

/**
 * Get color based on score
 */
const getScoreColor = (score: number): string => {
  if (score >= 90) return Colors.Success;
  if (score >= 80) return Colors.AccentGreen;
  if (score >= 70) return Colors.Info;
  if (score >= 60) return Colors.Warning;
  if (score >= 50) return Colors.AccentOrange;
  return Colors.Error;
};

/**
 * Get letter grade based on score
 */
const getLetterGrade = (score: number): string => {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
};

/**
 * Quality score badge component
 */
export const QualityScoreBadge: React.FC<QualityScoreBadgeProps> = ({
  score,
  size = 'medium',
  label,
  showGrade = true
}) => {
  // Normalize score
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  
  // Determine color based on score
  const scoreColor = getScoreColor(normalizedScore);
  
  // Get letter grade
  const letterGrade = showGrade ? getLetterGrade(normalizedScore) : undefined;
  
  // Badge size styles
  const getBadgeStyles = () => {
    switch (size) {
      case 'small':
        return {
          scoreSize: undefined,
          gradeSize: undefined,
          borderStyle: 'single' as const
        };
      case 'large':
        return {
          scoreSize: true,
          gradeSize: true,
          borderStyle: 'double' as const
        };
      case 'medium':
      default:
        return {
          scoreSize: undefined,
          gradeSize: undefined,
          borderStyle: 'round' as const
        };
    }
  };
  
  const styles = getBadgeStyles();
  
  return (
    <Box flexDirection="column" alignItems="center">
      {label && (
        <Text color={Colors.TextDim} marginBottom={1}>
          {label}
        </Text>
      )}
      
      <Box
        borderStyle={styles.borderStyle}
        borderColor={scoreColor}
        paddingX={size === 'large' ? 3 : 2}
        paddingY={size === 'large' ? 1 : 0}
        alignItems="center"
      >
        <Text color={scoreColor} bold={styles.scoreSize}>
          {normalizedScore}
        </Text>
      </Box>
      
      {showGrade && (
        <Box marginTop={1}>
          <Text color={scoreColor} bold={styles.gradeSize}>
            Grade: {letterGrade}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default QualityScoreBadge;