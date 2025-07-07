/**
 * WorkflowGraph Component Tests
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { 
  WorkflowGraph, 
  Node, 
  Edge, 
  NodeType, 
  NodeStatus, 
  LayoutType,
  WorkflowGraph as WorkflowGraphType
} from '../../../../src/ui/components/workflow';

// Mock data for testing
const createMockGraph = (): WorkflowGraphType => {
  // Create nodes
  const nodes: Node[] = [
    {
      id: 'start',
      label: 'Start',
      type: NodeType.START,
      status: NodeStatus.COMPLETED,
      position: { x: 0, y: 0 }
    },
    {
      id: 'task1',
      label: 'Task 1',
      type: NodeType.TASK,
      status: NodeStatus.COMPLETED,
      position: { x: 100, y: 0 }
    },
    {
      id: 'end',
      label: 'End',
      type: NodeType.END,
      status: NodeStatus.PENDING,
      position: { x: 200, y: 0 }
    }
  ];
  
  // Create edges
  const edges: Edge[] = [
    {
      id: 'e1',
      source: 'start',
      target: 'task1'
    },
    {
      id: 'e2',
      source: 'task1',
      target: 'end'
    }
  ];
  
  return {
    nodes,
    edges,
    meta: {
      title: 'Test Workflow'
    }
  };
};

describe('WorkflowGraph Component', () => {
  // Test rendering
  test('renders without crashing', () => {
    const graph = createMockGraph();
    const { lastFrame } = render(
      <WorkflowGraph
        graph={graph}
        width={100}
        height={30}
        layoutOptions={{
          type: LayoutType.HORIZONTAL
        }}
      />
    );
    
    expect(lastFrame()).toBeDefined();
  });
  
  // Test graph title
  test('renders graph title', () => {
    const graph = createMockGraph();
    const { lastFrame } = render(
      <WorkflowGraph
        graph={graph}
        width={100}
        height={30}
      />
    );
    
    expect(lastFrame()).toContain('Test Workflow');
  });
  
  // Test node rendering
  test('renders all nodes', () => {
    const graph = createMockGraph();
    const { lastFrame } = render(
      <WorkflowGraph
        graph={graph}
        width={100}
        height={30}
      />
    );
    
    // Check if node labels are in the output
    expect(lastFrame()).toContain('Start');
    expect(lastFrame()).toContain('Task 1');
    expect(lastFrame()).toContain('End');
  });
  
  // Test node selection callback
  test('calls onNodeSelect when node is selected', () => {
    const graph = createMockGraph();
    const handleNodeSelect = jest.fn();
    
    render(
      <WorkflowGraph
        graph={graph}
        width={100}
        height={30}
        onNodeSelect={handleNodeSelect}
      />
    );
    
    // Note: We can't directly test the selection in ink-testing-library
    // This would require UI event simulation that's not fully supported
    // This test is a placeholder for proper interaction testing
  });
  
  // Test layout calculation
  test('applies layout to nodes', () => {
    // Create a graph with unpositioned nodes
    const unpositionedGraph: WorkflowGraphType = {
      nodes: [
        {
          id: 'node1',
          label: 'Node 1',
          type: NodeType.TASK,
          status: NodeStatus.PENDING,
          position: { x: 0, y: 0 }
        },
        {
          id: 'node2',
          label: 'Node 2',
          type: NodeType.TASK,
          status: NodeStatus.PENDING,
          position: { x: 0, y: 0 }
        }
      ],
      edges: [
        {
          id: 'edge1',
          source: 'node1',
          target: 'node2'
        }
      ]
    };
    
    const { lastFrame } = render(
      <WorkflowGraph
        graph={unpositionedGraph}
        width={100}
        height={30}
        layoutOptions={{
          type: LayoutType.HORIZONTAL,
          nodeSpacing: 50,
          rankSpacing: 100
        }}
      />
    );
    
    expect(lastFrame()).toContain('Node 1');
    expect(lastFrame()).toContain('Node 2');
  });
  
  // Test controls visibility
  test('renders controls when enabled', () => {
    const graph = createMockGraph();
    const { lastFrame } = render(
      <WorkflowGraph
        graph={graph}
        width={100}
        height={30}
        controls={true}
      />
    );
    
    expect(lastFrame()).toContain('Zoom');
    expect(lastFrame()).toContain('Pan');
  });
  
  test('does not render controls when disabled', () => {
    const graph = createMockGraph();
    const { lastFrame } = render(
      <WorkflowGraph
        graph={graph}
        width={100}
        height={30}
        controls={false}
      />
    );
    
    expect(lastFrame()).not.toContain('[+/-]: Zoom');
  });
});