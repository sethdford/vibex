/**
 * WorkflowGraph Component
 * 
 * Main component for rendering workflow graph visualizations.
 * Supports different layout types, node/edge rendering, and interactive features.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { 
  Node, 
  Edge, 
  WorkflowGraph as WorkflowGraphType, 
  WorkflowGraphProps, 
  Viewport,
  LayoutType,
  LayoutOptions,
  NodeChangeEvent,
  EdgeChangeEvent,
  ViewportChangeEvent
} from './types';
import { calculateLayout } from './layout/calculateLayout';
import { NodeRenderer } from './renderers/NodeRenderer';
import { EdgeRenderer } from './renderers/EdgeRenderer';
import { MinimapRenderer } from './renderers/MinimapRenderer';

/**
 * Default viewport settings
 */
const DEFAULT_VIEWPORT: Viewport = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  width: 100,
  height: 30
};

/**
 * Default layout options
 */
const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  type: LayoutType.HORIZONTAL,
  nodeSpacing: 50,
  rankSpacing: 100
};

/**
 * WorkflowGraph Component
 * 
 * @param props Component props
 * @returns WorkflowGraph component
 */
export const WorkflowGraph: React.FC<WorkflowGraphProps> = ({
  graph,
  width,
  height,
  initialViewport,
  layoutOptions = DEFAULT_LAYOUT_OPTIONS,
  readOnly = false,
  interactive = true,
  fitView = true,
  minimap = true,
  grid = true,
  controls = true,
  nodeDraggable = true,
  connectingEdgesEnabled = false,
  deleteEdgeEnabled = false,
  isFocused = true,
  onNodeSelect,
  onEdgeSelect,
  onNodeChange,
  onEdgeChange,
  onViewportChange,
  onNodeDoubleClick,
  onFocusChange
}) => {
  // Viewport state
  const [viewport, setViewport] = useState<Viewport>({
    ...DEFAULT_VIEWPORT,
    ...initialViewport,
    width,
    height
  });

  // Selected elements state
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  
  // Focused state
  const [focused, setFocused] = useState<boolean>(isFocused);

  // Ref for double-click detection
  const lastClickTime = useRef<number>(0);
  const lastClickNode = useRef<string | null>(null);
  
  // Calculate the layout once when the graph changes
  const layoutGraph = useMemo(() => {
    return calculateLayout(graph, layoutOptions);
  }, [graph, layoutOptions]);
  
  // Find a node by ID
  const findNode = useCallback((id: string): Node | undefined => {
    return layoutGraph.nodes.find(node => node.id === id);
  }, [layoutGraph]);
  
  // Find an edge by ID
  const findEdge = useCallback((id: string): Edge | undefined => {
    return layoutGraph.edges.find(edge => edge.id === id);
  }, [layoutGraph]);
  
  // Handle node selection
  const handleNodeSelect = useCallback((nodeId: string) => {
    const node = findNode(nodeId);
    if (!node) return;
    
    // Double-click detection
    const now = Date.now();
    const isDoubleClick = nodeId === lastClickNode.current && (now - lastClickTime.current < 300);
    lastClickTime.current = now;
    lastClickNode.current = nodeId;
    
    if (isDoubleClick && onNodeDoubleClick) {
      onNodeDoubleClick(node);
      return;
    }
    
    // Deselect edge if any
    if (selectedEdge !== null) {
      setSelectedEdge(null);
    }
    
    // Select or deselect node
    if (selectedNode === nodeId) {
      setSelectedNode(null);
      
      // Notify callback
      if (onNodeSelect) {
        onNodeSelect(undefined);
      }
      
      if (onNodeChange) {
        onNodeChange({
          node: { ...node, selected: false },
          type: 'select',
          previous: { selected: true }
        });
      }
    } else {
      // Deselect previous node if any
      if (selectedNode !== null) {
        const prevNode = findNode(selectedNode);
        if (prevNode && onNodeChange) {
          onNodeChange({
            node: { ...prevNode, selected: false },
            type: 'select',
            previous: { selected: true }
          });
        }
      }
      
      // Select new node
      setSelectedNode(nodeId);
      
      // Notify callbacks
      if (onNodeSelect) {
        onNodeSelect(node);
      }
      
      if (onNodeChange) {
        onNodeChange({
          node: { ...node, selected: true },
          type: 'select',
          previous: { selected: false }
        });
      }
    }
  }, [selectedNode, selectedEdge, findNode, onNodeSelect, onNodeChange, onNodeDoubleClick]);
  
  // Handle edge selection
  const handleEdgeSelect = useCallback((edgeId: string) => {
    const edge = findEdge(edgeId);
    if (!edge) return;
    
    // Deselect node if any
    if (selectedNode !== null) {
      setSelectedNode(null);
    }
    
    // Select or deselect edge
    if (selectedEdge === edgeId) {
      setSelectedEdge(null);
      
      // Notify callback
      if (onEdgeSelect) {
        onEdgeSelect(undefined);
      }
      
      if (onEdgeChange) {
        onEdgeChange({
          edge: { ...edge, selected: false },
          type: 'select',
          previous: { selected: true }
        });
      }
    } else {
      // Deselect previous edge if any
      if (selectedEdge !== null) {
        const prevEdge = findEdge(selectedEdge);
        if (prevEdge && onEdgeChange) {
          onEdgeChange({
            edge: { ...prevEdge, selected: false },
            type: 'select',
            previous: { selected: true }
          });
        }
      }
      
      // Select new edge
      setSelectedEdge(edgeId);
      
      // Notify callbacks
      if (onEdgeSelect) {
        onEdgeSelect(edge);
      }
      
      if (onEdgeChange) {
        onEdgeChange({
          edge: { ...edge, selected: true },
          type: 'select',
          previous: { selected: false }
        });
      }
    }
  }, [selectedNode, selectedEdge, findEdge, onEdgeSelect, onEdgeChange]);
  
  // Handle viewport change
  const updateViewport = useCallback((newViewport: Partial<Viewport>) => {
    setViewport(prev => {
      const updated = { ...prev, ...newViewport };
      
      // Notify callback
      if (onViewportChange) {
        onViewportChange({
          viewport: updated,
          previous: prev
        });
      }
      
      return updated;
    });
  }, [onViewportChange]);
  
  // Fit the graph to the viewport
  const fitGraphToViewport = useCallback(() => {
    if (!layoutGraph.nodes.length) return;
    
    // Calculate bounding box of the graph
    const minX = Math.min(...layoutGraph.nodes.map(node => node.position.x));
    const maxX = Math.max(...layoutGraph.nodes.map(node => node.position.x));
    const minY = Math.min(...layoutGraph.nodes.map(node => node.position.y));
    const maxY = Math.max(...layoutGraph.nodes.map(node => node.position.y));
    
    // Calculate graph dimensions
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    
    // Calculate center of the graph
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate zoom level to fit the graph
    const zoomX = graphWidth > 0 ? width / graphWidth : 1;
    const zoomY = graphHeight > 0 ? height / graphHeight : 1;
    const zoom = Math.min(zoomX, zoomY) * 0.8; // 80% to add some padding
    
    // Update viewport
    updateViewport({
      zoom,
      offsetX: -centerX * zoom + width / 2,
      offsetY: -centerY * zoom + height / 2
    });
  }, [layoutGraph, width, height, updateViewport]);
  
  // Handle keyboard navigation
  useInput((input, key) => {
    if (!focused || !interactive) return;
    
    // Pan the graph
    const panDistance = 10 / viewport.zoom;
    if (key.upArrow) {
      updateViewport({ offsetY: viewport.offsetY + panDistance });
    } else if (key.downArrow) {
      updateViewport({ offsetY: viewport.offsetY - panDistance });
    } else if (key.leftArrow) {
      updateViewport({ offsetX: viewport.offsetX + panDistance });
    } else if (key.rightArrow) {
      updateViewport({ offsetX: viewport.offsetX - panDistance });
    }
    
    // Zoom in/out
    if (input === '+' || input === '=') {
      updateViewport({ zoom: viewport.zoom * 1.2 });
    } else if (input === '-') {
      updateViewport({ zoom: viewport.zoom / 1.2 });
    }
    
    // Fit view
    if (input === 'f') {
      fitGraphToViewport();
    }
    
    // Navigate nodes
    if (input === 'n') {
      // Select next node
      if (layoutGraph.nodes.length > 0) {
        const currentIndex = selectedNode 
          ? layoutGraph.nodes.findIndex(node => node.id === selectedNode)
          : -1;
        const nextIndex = (currentIndex + 1) % layoutGraph.nodes.length;
        handleNodeSelect(layoutGraph.nodes[nextIndex].id);
      }
    }
    
    // Navigate edges
    if (input === 'e') {
      // Select next edge
      if (layoutGraph.edges.length > 0) {
        const currentIndex = selectedEdge 
          ? layoutGraph.edges.findIndex(edge => edge.id === selectedEdge)
          : -1;
        const nextIndex = (currentIndex + 1) % layoutGraph.edges.length;
        handleEdgeSelect(layoutGraph.edges[nextIndex].id);
      }
    }
    
    // Toggle focus
    if (key.tab) {
      setFocused(prev => !prev);
      if (onFocusChange) {
        onFocusChange(!focused);
      }
    }
  });
  
  // Fit view on initial render
  useEffect(() => {
    if (fitView && layoutGraph.nodes.length > 0) {
      fitGraphToViewport();
    }
  }, [fitView, fitGraphToViewport, layoutGraph.nodes.length]);
  
  // Transform a point from graph coordinates to screen coordinates
  const transformPoint = useCallback((x: number, y: number): [number, number] => {
    const screenX = x * viewport.zoom + viewport.offsetX;
    const screenY = y * viewport.zoom + viewport.offsetY;
    return [screenX, screenY];
  }, [viewport]);
  
  // Determine if a node is visible in the viewport
  const isNodeVisible = useCallback((node: Node): boolean => {
    const [screenX, screenY] = transformPoint(node.position.x, node.position.y);
    const nodeWidth = (node.size?.width || 10) * viewport.zoom;
    const nodeHeight = (node.size?.height || 5) * viewport.zoom;
    
    return (
      screenX + nodeWidth >= 0 &&
      screenX - nodeWidth <= width &&
      screenY + nodeHeight >= 0 &&
      screenY - nodeHeight <= height
    );
  }, [transformPoint, viewport.zoom, width, height]);
  
  // Get visible nodes
  const visibleNodes = useMemo(() => {
    return layoutGraph.nodes.filter(isNodeVisible);
  }, [layoutGraph.nodes, isNodeVisible]);
  
  // Render the graph
  return (
    <Box
      width={width}
      height={height}
      flexDirection="column"
      borderStyle={focused ? 'double' : 'single'}
      borderColor={focused ? 'blue' : 'gray'}
    >
      {/* Graph title */}
      <Box>
        <Text bold>{layoutGraph.meta?.title || 'Workflow Graph'}</Text>
        {viewport.zoom !== 1 && (
          <Text> (zoom: {viewport.zoom.toFixed(1)}x)</Text>
        )}
      </Box>
      
      {/* Main graph area */}
      <Box flexGrow={1}>
        {/* Grid (if enabled) */}
        {grid && (
          <Box position="absolute">
            {/* Grid lines would be rendered here */}
          </Box>
        )}
        
        {/* Edges */}
        <EdgeRenderer
          edges={layoutGraph.edges}
          nodes={layoutGraph.nodes}
          viewport={viewport}
          selectedEdge={selectedEdge}
          onEdgeSelect={handleEdgeSelect}
        />
        
        {/* Nodes */}
        <NodeRenderer
          nodes={visibleNodes}
          viewport={viewport}
          selectedNode={selectedNode}
          onNodeSelect={handleNodeSelect}
        />
        
        {/* Minimap (if enabled) */}
        {minimap && (
          <Box position="absolute" right={0} bottom={0} width={20} height={10}>
            <MinimapRenderer
              graph={layoutGraph}
              viewport={viewport}
              width={20}
              height={10}
              onViewportChange={updateViewport}
            />
          </Box>
        )}
      </Box>
      
      {/* Controls (if enabled) */}
      {controls && (
        <Box>
          <Text>
            [+/-]: Zoom | Arrows: Pan | F: Fit | N: Next Node | E: Next Edge | Tab: Focus
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default WorkflowGraph;