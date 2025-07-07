# Workflow Graph Visualization

A comprehensive, terminal-based workflow graph visualization system for Vibex. This component renders interactive workflow graphs with support for different layout algorithms, node types, and interactive features.

## Features

- **Multiple Layout Algorithms**: Horizontal, vertical, radial, grid, and force-directed layouts
- **Interactive Navigation**: Pan, zoom, and select nodes/edges
- **Custom Node Types**: Support for various workflow node types with distinct visual representations
- **Status Visualization**: Visual indicators for node status (pending, in-progress, completed, error)
- **Minimap Navigation**: Overview navigation with viewport indicator
- **Keyboard Controls**: Full keyboard navigation and interaction
- **Customizable Styling**: Theming support for nodes, edges, and controls

## Components

### Main Components

- `WorkflowGraph`: Main component that renders the graph with interactive features
- `WorkflowGraphExample`: Example implementation with sample data

### Renderers

- `NodeRenderer`: Renders workflow nodes with appropriate styling
- `EdgeRenderer`: Renders connections between nodes with path calculation
- `MinimapRenderer`: Renders a minimap overview for navigation

### Utilities

- `calculateLayout`: Implements various layout algorithms for graph visualization

## Usage

### Basic Example

```tsx
import { WorkflowGraph, NodeType, NodeStatus } from './components/workflow';

// Create graph data
const graph = {
  nodes: [
    { 
      id: 'start', 
      label: 'Start', 
      type: NodeType.START, 
      status: NodeStatus.COMPLETED,
      position: { x: 0, y: 0 }
    },
    { 
      id: 'process', 
      label: 'Process Data', 
      type: NodeType.TASK, 
      status: NodeStatus.IN_PROGRESS,
      position: { x: 100, y: 0 }
    },
    { 
      id: 'end', 
      label: 'End', 
      type: NodeType.END, 
      status: NodeStatus.PENDING,
      position: { x: 200, y: 0 }
    }
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'process' },
    { id: 'e2', source: 'process', target: 'end' }
  ]
};

// Render the graph
const MyWorkflowView = () => (
  <WorkflowGraph
    graph={graph}
    width={100}
    height={40}
    layoutOptions={{ type: LayoutType.HORIZONTAL }}
    fitView={true}
    minimap={true}
    controls={true}
  />
);
```

### Automatic Layout

The component includes automatic layout algorithms that position nodes for you:

```tsx
import { WorkflowGraph, LayoutType } from './components/workflow';

// Only specify connections, layout will be calculated automatically
const graph = {
  nodes: [
    { id: 'start', label: 'Start', type: NodeType.START, status: NodeStatus.COMPLETED },
    { id: 'process', label: 'Process', type: NodeType.TASK, status: NodeStatus.IN_PROGRESS },
    { id: 'end', label: 'End', type: NodeType.END, status: NodeStatus.PENDING }
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'process' },
    { id: 'e2', source: 'process', target: 'end' }
  ]
};

const MyAutoLayoutView = () => (
  <WorkflowGraph
    graph={graph}
    width={100}
    height={40}
    layoutOptions={{
      type: LayoutType.HORIZONTAL,
      nodeSpacing: 50,
      rankSpacing: 100
    }}
    fitView={true}
  />
);
```

## Keyboard Controls

- **Arrow Keys**: Pan the graph
- **+/-**: Zoom in/out
- **F**: Fit graph to viewport
- **N**: Cycle through nodes
- **E**: Cycle through edges
- **Tab**: Toggle focus

## Node Types

The component supports the following node types:

- `START`: Start of workflow
- `TASK`: Standard workflow task
- `DECISION`: Decision point/branch
- `PARALLEL`: Parallel execution
- `WAIT`: Waiting for external event
- `END`: End of workflow
- `SUBPROCESS`: Nested workflow
- `ERROR`: Error handler
- `CUSTOM`: Custom node type

## Node Status

Nodes can have the following status indicators:

- `PENDING`: Task not yet started
- `IN_PROGRESS`: Currently executing
- `COMPLETED`: Successfully completed
- `ERROR`: Failed with error
- `SKIPPED`: Bypassed in workflow
- `WAITING`: Waiting for condition
- `CANCELED`: Execution canceled

## Edge Types

Connections between nodes can have the following types:

- `DEFAULT`: Standard connection
- `SUCCESS`: Success path
- `FAILURE`: Failure/error path
- `CONDITION`: Conditional path

## Props

### WorkflowGraph Props

| Prop | Type | Description |
|------|------|-------------|
| graph | WorkflowGraph | Graph data with nodes and edges |
| width | number | Component width |
| height | number | Component height |
| initialViewport | Partial<Viewport> | Initial viewport state |
| layoutOptions | LayoutOptions | Options for automatic layout |
| readOnly | boolean | Whether the graph is editable |
| interactive | boolean | Whether the graph responds to input |
| fitView | boolean | Auto-fit graph to viewport |
| minimap | boolean | Show navigation minimap |
| grid | boolean | Show background grid |
| controls | boolean | Show control panel |
| nodeDraggable | boolean | Allow node dragging |
| connectingEdgesEnabled | boolean | Allow creating new edges |
| deleteEdgeEnabled | boolean | Allow deleting edges |
| isFocused | boolean | Whether the component has focus |
| onNodeSelect | function | Callback when node is selected |
| onEdgeSelect | function | Callback when edge is selected |
| onNodeChange | function | Callback when node changes |
| onEdgeChange | function | Callback when edge changes |
| onViewportChange | function | Callback when viewport changes |
| onNodeDoubleClick | function | Callback for double-click on node |
| onFocusChange | function | Callback when focus changes |

## Integration with Other Components

The Workflow Graph Visualization component can be integrated with other Vibex components:

### Debugging Interface Integration

```tsx
import { DebuggingInterface } from '../debugging';
import { WorkflowGraph } from '../workflow';

const DebugWorkflowView = () => {
  // State for workflow and debug data
  const [workflowGraph, setWorkflowGraph] = useState(initialGraph);
  const [selectedNode, setSelectedNode] = useState(null);
  
  // Handle node debugging
  const handleNodeDebug = (node) => {
    // Open debugging interface for the selected node
  };
  
  return (
    <Box flexDirection="column">
      {/* Workflow visualization */}
      <WorkflowGraph
        graph={workflowGraph}
        width={100}
        height={30}
        onNodeSelect={setSelectedNode}
        onNodeDoubleClick={handleNodeDebug}
      />
      
      {/* Debugging interface for selected node */}
      {selectedNode && (
        <DebuggingInterface
          width={100}
          height={30}
          initialState={getNodeDebugState(selectedNode)}
        />
      )}
    </Box>
  );
};
```

### Performance Dashboard Integration

The workflow graph can be enhanced with performance metrics visualization:

```tsx
import { WorkflowGraph } from '../workflow';
import { PerformanceDashboard } from '../performance';

const PerformanceWorkflowView = () => {
  // Track performance metrics for workflow nodes
  const [nodeMetrics, setNodeMetrics] = useState({});
  
  // Update node styling based on metrics
  const enhanceGraphWithMetrics = (graph) => {
    return {
      ...graph,
      nodes: graph.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          metrics: nodeMetrics[node.id]
        }
      }))
    };
  };
  
  return (
    <Box flexDirection="column">
      {/* Workflow with performance data */}
      <WorkflowGraph
        graph={enhanceGraphWithMetrics(workflowGraph)}
        width={100}
        height={30}
      />
      
      {/* Performance dashboard */}
      <PerformanceDashboard
        metrics={nodeMetrics}
        width={100}
        height={20}
      />
    </Box>
  );
};
```

## Extending the Component

The component architecture is designed for extensibility:

### Custom Node Renderers

```tsx
import { NodeRenderer } from '../workflow/renderers/NodeRenderer';

// Extend with custom node visualization
const CustomNodeRenderer = ({ node, ...props }) => {
  if (node.type === 'my-custom-type') {
    return (
      <CustomNode node={node} {...props} />
    );
  }
  
  // Fall back to default renderer
  return <NodeRenderer node={node} {...props} />;
};
```

### Custom Layout Algorithms

```tsx
import { calculateLayout } from '../workflow/layout/calculateLayout';

// Add custom layout algorithm
const customLayout = (graph, options) => {
  // Implement custom positioning logic
  const nodes = graph.nodes.map(node => ({
    ...node,
    position: calculateCustomPosition(node, graph.edges)
  }));
  
  return {
    ...graph,
    nodes
  };
};

// Use custom layout
const MyCustomLayoutView = () => (
  <WorkflowGraph
    graph={graph}
    width={100}
    height={40}
    layoutOptions={{
      type: 'custom',
      algorithm: customLayout
    }}
  />
);
```