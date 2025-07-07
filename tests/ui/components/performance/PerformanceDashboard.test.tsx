/**
 * Performance Dashboard Tests
 */

import React from 'react';
import { render } from 'ink-testing-library';
import {
  PerformanceDashboard,
  MetricType,
  MetricCategory,
  VisualizationType
} from '../../../../src/ui/components/performance';

// Mock metrics data
const mockMetrics = [
  {
    id: 'system.cpu.load1',
    name: 'CPU Load (1m)',
    type: MetricType.GAUGE,
    category: MetricCategory.CPU,
    value: 1.25,
    timestamp: Date.now()
  },
  {
    id: 'system.memory.percentUsed',
    name: 'Memory Usage %',
    type: MetricType.GAUGE,
    category: MetricCategory.MEMORY,
    value: 65.2,
    unit: '%',
    timestamp: Date.now()
  }
];

// Sample dashboard config for testing
const testDashboardConfig = {
  title: 'Test Dashboard',
  layout: [
    { id: 'cpu', x: 0, y: 0, width: 1, height: 1 },
    { id: 'memory', x: 1, y: 0, width: 1, height: 1 }
  ],
  panels: [
    {
      id: 'cpu',
      title: 'CPU Usage',
      metrics: ['system.cpu.load1'],
      visualization: {
        type: VisualizationType.GAUGE
      }
    },
    {
      id: 'memory',
      title: 'Memory Usage',
      metrics: ['system.memory.percentUsed'],
      visualization: {
        type: VisualizationType.GAUGE
      }
    }
  ]
};

describe('PerformanceDashboard Component', () => {
  // Test basic rendering
  test('renders without crashing', () => {
    const { lastFrame } = render(
      <PerformanceDashboard
        width={100}
        height={30}
        initialMetrics={mockMetrics}
        config={testDashboardConfig}
        realTime={false}
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });
  
  // Test dashboard title
  test('renders dashboard title', () => {
    const { lastFrame } = render(
      <PerformanceDashboard
        width={100}
        height={30}
        initialMetrics={mockMetrics}
        config={testDashboardConfig}
        realTime={false}
      />
    );
    
    expect(lastFrame()).toContain('Test Dashboard');
  });
  
  // Test panel rendering
  test('renders panels based on config', () => {
    const { lastFrame } = render(
      <PerformanceDashboard
        width={100}
        height={30}
        initialMetrics={mockMetrics}
        config={testDashboardConfig}
        realTime={false}
      />
    );
    
    // Check if panel titles are in the output
    expect(lastFrame()).toContain('CPU Usage');
    expect(lastFrame()).toContain('Memory Usage');
  });
  
  // Test focus behavior
  test('applies focused style when focused', () => {
    const { lastFrame } = render(
      <PerformanceDashboard
        width={100}
        height={30}
        initialMetrics={mockMetrics}
        config={testDashboardConfig}
        realTime={false}
        isFocused={true}
      />
    );
    
    // Check for focus indicators in the output
    expect(lastFrame()).toContain('Use Tab to navigate');
  });
  
  // Test with no metrics
  test('handles empty metrics gracefully', () => {
    const { lastFrame } = render(
      <PerformanceDashboard
        width={100}
        height={30}
        initialMetrics={[]}
        config={testDashboardConfig}
        realTime={false}
      />
    );
    
    expect(lastFrame()).toBeDefined();
    expect(lastFrame()).toContain('0 metrics');
  });
  
  // Test with no config
  test('uses default config when not provided', () => {
    const { lastFrame } = render(
      <PerformanceDashboard
        width={100}
        height={30}
        initialMetrics={mockMetrics}
        realTime={false}
      />
    );
    
    expect(lastFrame()).toBeDefined();
    expect(lastFrame()).toContain('Performance Dashboard');
  });
});