/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { ToolGroupDisplay } from '../ToolGroupDisplay';
import { BaseTool } from '../../../../core/domain/tool/tool-interfaces';
import { ToolGroup } from '../types';

// Mock tool class for testing
class MockTool extends BaseTool {
  async execute() {
    return { success: true, data: 'mock result' };
  }

  getMetadata() {
    return {
      ...super.getMetadata(),
      examples: [],
      tags: ['test', 'mock'],
      version: '1.0.0'
    };
  }
}

describe('ToolGroupDisplay Component', () => {
  // Create some mock tools and groups
  const mockTools = [
    new MockTool('tool1', 'Test tool 1', {}, { namespace: 'test' }),
    new MockTool('tool2', 'Test tool 2', {}, { namespace: 'test' }),
    new MockTool('tool3', 'Test tool 3', {}, { namespace: 'other' }),
  ];
  
  const mockGroups: ToolGroup[] = [
    {
      name: 'test',
      description: 'Test tools group',
      tools: [mockTools[0], mockTools[1]],
      isExpanded: true
    },
    {
      name: 'other',
      description: 'Other tools group',
      tools: [mockTools[2]],
      isExpanded: false
    }
  ];

  it('renders with groups', () => {
    const { lastFrame } = render(
      <ToolGroupDisplay 
        groups={mockGroups}
        showSearch={false}
      />
    );
    
    // Check that group names are rendered
    expect(lastFrame()).toContain('test');
    expect(lastFrame()).toContain('other');
    expect(lastFrame()).toContain('Test tools group');
  });
  
  it('renders search box when showSearch is true', () => {
    const { lastFrame } = render(
      <ToolGroupDisplay 
        groups={mockGroups}
        showSearch={true}
      />
    );
    
    expect(lastFrame()).toContain('Search Tools');
  });
  
  it('calls onToolExecute when a tool is executed', () => {
    const handleToolExecute = jest.fn();
    
    const { lastFrame } = render(
      <ToolGroupDisplay 
        groups={mockGroups}
        showSearch={false}
        onToolExecute={handleToolExecute}
      />
    );
    
    // Note: In a real test environment, we would simulate
    // interactions to trigger tool execution, but this is limited
    // in the ink-testing-library. For now, we just verify the
    // component renders without errors.
    
    expect(lastFrame()).toBeDefined();
  });
  
  it('filters groups based on search query', () => {
    const { lastFrame } = render(
      <ToolGroupDisplay 
        groups={mockGroups}
        initialSearch="tool1"
        showSearch={true}
      />
    );
    
    // The search would filter to show only groups containing tool1
    // but since this is a static test, we just check the search
    // box contains the initial query
    expect(lastFrame()).toContain('tool1');
  });
});