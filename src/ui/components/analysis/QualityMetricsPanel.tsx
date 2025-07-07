/**
 * Quality Metrics Panel
 * 
 * Displays detailed code quality metrics with visualizations.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { CodeQualityMetric, MetricCategory } from './types.js';
import { QualityScoreBadge } from './QualityScoreBadge.js';

/**
 * Quality metrics panel props
 */
export interface QualityMetricsPanelProps {
  /**
   * Quality metrics data
   */
  metrics: CodeQualityMetric[];
  
  /**
   * Selected category filter
   */
  selectedCategory: MetricCategory | null;
  
  /**
   * Panel width
   */
  width?: number;
  
  /**
   * Panel height
   */
  height?: number;
  
  /**
   * Callback for category selection
   */
  onCategorySelect?: (category: MetricCategory | null) => void;
}

/**
 * Get color for metric category
 */
const getCategoryColor = (category: MetricCategory): string => {
  switch (category) {
    case MetricCategory.MAINTAINABILITY:
      return Colors.AccentBlue;
    case MetricCategory.COMPLEXITY:
      return Colors.Warning;
    case MetricCategory.DUPLICATION:
      return Colors.AccentOrange;
    case MetricCategory.COVERAGE:
      return Colors.Success;
    case MetricCategory.SECURITY:
      return Colors.Error;
    case MetricCategory.PERFORMANCE:
      return Colors.AccentPurple;
    case MetricCategory.STYLE:
      return Colors.Info;
    default:
      return Colors.Text;
  }
};

/**
 * Metric bar component
 */
const MetricBar: React.FC<{
  value: number;
  width: number;
  color?: string;
  showPercentage?: boolean;
}> = ({
  value,
  width,
  color = Colors.AccentBlue,
  showPercentage = true
}) => {
  // Normalize value
  const normalizedValue = Math.max(0, Math.min(100, value));
  
  // Calculate filled width
  const filledWidth = Math.floor((normalizedValue / 100) * width);
  const emptyWidth = Math.max(0, width - filledWidth);
  
  return (
    <Box>
      <Text color={color}>{'█'.repeat(filledWidth)}</Text>
      <Text color={Colors.TextDim}>{'▒'.repeat(emptyWidth)}</Text>
      
      {showPercentage && (
        <Box marginLeft={1}>
          <Text color={color}>{normalizedValue}%</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Quality metrics panel component
 */
export const QualityMetricsPanel: React.FC<QualityMetricsPanelProps> = ({
  metrics,
  selectedCategory,
  width = 80,
  height = 20,
  onCategorySelect
}) => {
  // Selected metric for details view
  const [selectedMetric, setSelectedMetric] = useState<CodeQualityMetric | null>(null);
  
  // Filter metrics by category if selected
  const filteredMetrics = selectedCategory
    ? metrics.filter(metric => metric.category === selectedCategory)
    : metrics;
  
  // Group metrics by category
  const metricsByCategory = filteredMetrics.reduce((grouped, metric) => {
    if (!grouped[metric.category]) {
      grouped[metric.category] = [];
    }
    grouped[metric.category].push(metric);
    return grouped;
  }, {} as Record<MetricCategory, CodeQualityMetric[]>);
  
  // Calculate average score per category
  const categoryScores = Object.entries(metricsByCategory).map(([category, categoryMetrics]) => {
    const sum = categoryMetrics.reduce((total, metric) => total + metric.value, 0);
    const average = Math.round(sum / categoryMetrics.length);
    return {
      category: category as MetricCategory,
      score: average,
      count: categoryMetrics.length
    };
  }).sort((a, b) => b.score - a.score); // Sort by highest score first
  
  // Handle category selection
  const handleCategorySelect = useCallback((category: MetricCategory) => {
    if (onCategorySelect) {
      if (selectedCategory === category) {
        onCategorySelect(null);
      } else {
        onCategorySelect(category);
      }
    }
  }, [selectedCategory, onCategorySelect]);
  
  // Handle metric selection for details
  const handleMetricSelect = useCallback((metric: CodeQualityMetric) => {
    setSelectedMetric(prev => prev?.name === metric.name ? null : metric);
  }, []);
  
  // Calculate bar width for category view
  const categoryBarWidth = Math.max(10, Math.floor((width - 35) * 0.8));
  
  // Calculate bar width for detailed metrics view
  const metricBarWidth = Math.max(10, Math.floor((width - 40) * 0.8));
  
  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Category summary view */}
      <Box 
        borderStyle="round" 
        borderColor={Colors.Secondary}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        marginBottom={1}
      >
        <Text bold marginBottom={1}>Quality Metrics by Category</Text>
        
        <Box flexDirection="column">
          {categoryScores.map(({ category, score, count }) => (
            <Box key={category} marginBottom={1}>
              <Box width={20}>
                <Text 
                  color={getCategoryColor(category)}
                  bold={selectedCategory === category}
                  underline
                  onClick={() => handleCategorySelect(category)}
                >
                  {category} ({count})
                </Text>
              </Box>
              
              <Box width={categoryBarWidth}>
                <MetricBar 
                  value={score} 
                  width={categoryBarWidth}
                  color={getCategoryColor(category)}
                />
              </Box>
              
              <Box marginLeft={2}>
                <QualityScoreBadge 
                  score={score}
                  size="small" 
                  showGrade={false}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      
      {/* Detailed metrics view */}
      <Box 
        borderStyle="round" 
        borderColor={Colors.Secondary}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        flexGrow={1}
      >
        <Box marginBottom={1}>
          <Text bold>
            {selectedCategory 
              ? `${selectedCategory} Metrics` 
              : 'All Metrics'}
          </Text>
          
          {selectedCategory && (
            <Box marginLeft={2}>
              <Text 
                color={Colors.TextDim}
                onClick={() => onCategorySelect?.(null)}
              >
                [clear filter]
              </Text>
            </Box>
          )}
        </Box>
        
        <Box flexDirection="column">
          {filteredMetrics.map(metric => (
            <Box 
              key={metric.name} 
              marginBottom={1}
              paddingX={1}
              paddingY={0}
              backgroundColor={selectedMetric?.name === metric.name ? Colors.DimBackground : undefined}
              onClick={() => handleMetricSelect(metric)}
            >
              <Box width={25}>
                <Text bold={selectedMetric?.name === metric.name}>
                  {metric.name}
                </Text>
              </Box>
              
              <Box width={metricBarWidth + 10}>
                <MetricBar 
                  value={metric.value} 
                  width={metricBarWidth}
                  color={getCategoryColor(metric.category)}
                />
              </Box>
              
              {metric.trend !== undefined && (
                <Box marginLeft={2}>
                  <Text color={metric.trend >= 0 ? Colors.Success : Colors.Error}>
                    {metric.trend > 0 ? '↑' : '↓'} {Math.abs(metric.trend)}%
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>
      
      {/* Selected metric details */}
      {selectedMetric && (
        <Box 
          borderStyle="round" 
          borderColor={Colors.Secondary}
          paddingX={2}
          paddingY={1}
          flexDirection="column"
          marginTop={1}
        >
          <Box>
            <Text bold color={getCategoryColor(selectedMetric.category)}>
              {selectedMetric.name}
            </Text>
            <Text color={Colors.TextDim}>
              {' '}({selectedMetric.category})
            </Text>
            
            <Box flexGrow={1} justifyContent="flex-end">
              <QualityScoreBadge 
                score={selectedMetric.value}
                size="small" 
                showGrade={true}
              />
            </Box>
          </Box>
          
          {selectedMetric.description && (
            <Box marginTop={1}>
              <Text>{selectedMetric.description}</Text>
            </Box>
          )}
          
          {selectedMetric.baseline !== undefined && (
            <Box marginTop={1}>
              <Text color={Colors.TextDim}>
                Baseline: {selectedMetric.baseline}
                {selectedMetric.trend !== undefined && (
                  <Text>
                    {' '}({selectedMetric.trend > 0 ? '+' : ''}{selectedMetric.trend}% change)
                  </Text>
                )}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default QualityMetricsPanel;