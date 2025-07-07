/**
 * WorkflowGraphExample Component
 * 
 * Example usage of the WorkflowGraph component with sample data.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { 
  WorkflowGraph, 
  Node, 
  Edge, 
  NodeType, 
  NodeStatus, 
  EdgeType, 
  LayoutType, 
  WorkflowGraph as WorkflowGraphType
} from './index';

// Example workflow graph props
interface WorkflowGraphExampleProps {
  width?: number;
  height?: number;
}

/**
 * Creates a sample workflow graph with different node types and statuses
 * 
 * @returns Sample workflow graph
 */
const createSampleGraph = (): WorkflowGraphType => {
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
      id: 'fetchData',
      label: 'Fetch Data',
      type: NodeType.TASK,
      status: NodeStatus.COMPLETED,
      position: { x: 100, y: 0 }
    },
    {
      id: 'validateData',
      label: 'Validate Data',
      type: NodeType.TASK,
      status: NodeStatus.COMPLETED,
      position: { x: 200, y: 0 }
    },
    {
      id: 'dataValid',
      label: 'Data Valid?',
      type: NodeType.DECISION,
      status: NodeStatus.COMPLETED,
      position: { x: 300, y: 0 }
    },
    {
      id: 'processData',
      label: 'Process Data',
      type: NodeType.TASK,
      status: NodeStatus.IN_PROGRESS,
      position: { x: 400, y: -50 }
    },
    {
      id: 'handleError',
      label: 'Handle Error',
      type: NodeType.ERROR,
      status: NodeStatus.PENDING,
      position: { x: 400, y: 50 }
    },
    {
      id: 'saveResults',
      label: 'Save Results',
      type: NodeType.TASK,
      status: NodeStatus.PENDING,
      position: { x: 500, y: -50 }
    },
    {
      id: 'notifyUser',
      label: 'Notify User',
      type: NodeType.TASK,
      status: NodeStatus.PENDING,
      position: { x: 600, y: 0 }
    },
    {
      id: 'end',
      label: 'End',
      type: NodeType.END,
      status: NodeStatus.PENDING,
      position: { x: 700, y: 0 }
    }
  ];
  
  // Create edges
  const edges: Edge[] = [
    {
      id: 'e1',
      source: 'start',
      target: 'fetchData'
    },
    {
      id: 'e2',
      source: 'fetchData',
      target: 'validateData'
    },
    {
      id: 'e3',
      source: 'validateData',
      target: 'dataValid'
    },
    {
      id: 'e4',
      source: 'dataValid',
      target: 'processData',
      label: 'Yes',
      type: EdgeType.SUCCESS
    },
    {
      id: 'e5',
      source: 'dataValid',
      target: 'handleError',
      label: 'No',
      type: EdgeType.FAILURE
    },
    {
      id: 'e6',
      source: 'processData',
      target: 'saveResults'
    },
    {
      id: 'e7',
      source: 'saveResults',
      target: 'notifyUser'
    },
    {
      id: 'e8',
      source: 'handleError',
      target: 'notifyUser'
    },
    {
      id: 'e9',
      source: 'notifyUser',
      target: 'end'
    }
  ];
  
  return {
    nodes,
    edges,
    meta: {
      title: 'Data Processing Workflow'
    }
  };
};

/**
 * WorkflowGraphExample Component
 */
export const WorkflowGraphExample: React.FC<WorkflowGraphExampleProps> = ({
  width = 120,
  height = 40
}) => {
  // Sample graph
  const [graph] = useState<WorkflowGraphType>(createSampleGraph());
  
  // Currently selected node/edge
  const [selectedNode, setSelectedNode] = useState<Node | undefined>(undefined);
  
  // Layout type
  const [layoutType, setLayoutType] = useState<LayoutType>(LayoutType.HORIZONTAL);
  
  // Handle node selection
  const handleNodeSelect = (node: Node | undefined) => {
    setSelectedNode(node);
  };
  
  // Toggle layout type
  const toggleLayout = () => {
    const layouts = [
      LayoutType.HORIZONTAL,
      LayoutType.VERTICAL,
      LayoutType.RADIAL,
      LayoutType.FORCE,
      LayoutType.GRID
    ];
    
    const currentIndex = layouts.indexOf(layoutType);
    const nextIndex = (currentIndex + 1) % layouts.length;
    setLayoutType(layouts[nextIndex]);
  };
  
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>Workflow Graph Example</Text>
        <Text dimColor> (Press 'L' to toggle layout: {layoutType})</Text>
      </Box>
      
      <WorkflowGraph
        graph={graph}
        width={width}
        height={height - 4}
        layoutOptions={{
          type: layoutType,
          nodeSpacing: 50,
          rankSpacing: 100
        }}
        onNodeSelect={handleNodeSelect}
        controls={true}
        minimap={true}
        fitView={true}
      />
      
      {/* Status bar */}
      <Box>
        {selectedNode ? (
          <Text>Selected: <Text bold>{selectedNode.label}</Text> ({selectedNode.type}, {selectedNode.status})</Text>
        ) : (
          <Text>No node selected. Press 'N' to select nodes, 'E' to select edges, arrow keys to navigate.</Text>
        )}
      </Box>
    </Box>
  );
};

export default WorkflowGraphExample;