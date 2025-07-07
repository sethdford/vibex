/**
 * EdgeRenderer Component
 * 
 * Renders workflow graph edges with appropriate styling based on type and status.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Edge, Node, EdgeType, Viewport } from '../types';

// Edge type to style mapping
const edgeTypeStyles: Record<EdgeType, { symbol: string; color: string }> = {
  [EdgeType.DEFAULT]: { symbol: '─', color: 'white' },
  [EdgeType.SUCCESS]: { symbol: '─', color: 'green' },
  [EdgeType.FAILURE]: { symbol: '─', color: 'red' },
  [EdgeType.CONDITION]: { symbol: '─', color: 'yellow' }
};

// EdgeRenderer props
interface EdgeRendererProps {
  edges: Edge[];
  nodes: Node[];
  viewport: Viewport;
  selectedEdge: string | null;
  onEdgeSelect?: (edgeId: string) => void;
}

/**
 * Transform a point from graph coordinates to screen coordinates
 * 
 * @param x X coordinate in graph space
 * @param y Y coordinate in graph space
 * @param viewport Current viewport
 * @returns Screen coordinates [x, y]
 */
const transformPoint = (x: number, y: number, viewport: Viewport): [number, number] => {
  const screenX = x * viewport.zoom + viewport.offsetX;
  const screenY = y * viewport.zoom + viewport.offsetY;
  return [Math.round(screenX), Math.round(screenY)];
};

/**
 * Find node by ID
 * 
 * @param id Node ID
 * @param nodes Array of nodes
 * @returns Node or undefined if not found
 */
const findNode = (id: string, nodes: Node[]): Node | undefined => {
  return nodes.find(node => node.id === id);
};

/**
 * Calculate points for an edge path
 * 
 * @param edge Edge to calculate path for
 * @param nodes Array of nodes
 * @param viewport Current viewport
 * @returns Array of screen coordinates for the edge path
 */
const calculateEdgePath = (
  edge: Edge, 
  nodes: Node[], 
  viewport: Viewport
): [number, number][] => {
  const sourceNode = findNode(edge.source, nodes);
  const targetNode = findNode(edge.target, nodes);
  
  if (!sourceNode || !targetNode) {
    return [];
  }
  
  // Start with source and target positions
  const points: [number, number][] = [];
  
  // Add source position
  points.push(transformPoint(sourceNode.position.x, sourceNode.position.y, viewport));
  
  // Add waypoints if any
  if (edge.waypoints && edge.waypoints.length > 0) {
    edge.waypoints.forEach(point => {
      points.push(transformPoint(point.x, point.y, viewport));
    });
  }
  
  // Add target position
  points.push(transformPoint(targetNode.position.x, targetNode.position.y, viewport));
  
  return points;
};

/**
 * Calculate simple segments for an edge (straight line approximation)
 * 
 * @param points Array of points for the edge
 * @returns Array of line segments
 */
const calculateEdgeSegments = (points: [number, number][]): Array<{ from: [number, number], to: [number, number] }> => {
  const segments = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({
      from: points[i],
      to: points[i + 1]
    });
  }
  
  return segments;
};

/**
 * Single Edge component
 */
const EdgeComponent: React.FC<{
  edge: Edge;
  nodes: Node[];
  viewport: Viewport;
  isSelected: boolean;
  onSelect?: (edgeId: string) => void;
}> = ({ edge, nodes, viewport, isSelected, onSelect }) => {
  // Get edge style based on type
  const typeStyle = edgeTypeStyles[edge.type || EdgeType.DEFAULT];
  
  // Calculate edge path
  const points = calculateEdgePath(edge, nodes, viewport);
  
  // If not enough points to draw an edge, return nothing
  if (points.length < 2) {
    return null;
  }
  
  // Calculate segments
  const segments = calculateEdgeSegments(points);
  
  // Edge label position (middle of the path)
  const middleIndex = Math.floor(points.length / 2);
  const labelPosition = points[middleIndex] || points[0];
  
  // Handle edge selection
  const handleSelect = () => {
    if (onSelect) {
      onSelect(edge.id);
    }
  };
  
  return (
    <>
      {/* Draw line segments */}
      {segments.map((segment, index) => {
        // Simple approximation for terminal rendering
        const dx = segment.to[0] - segment.from[0];
        const dy = segment.to[1] - segment.from[1];
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Skip segments that are too short
        if (length < 2) return null;
        
        // Determine line character based on angle
        let lineChar = '─';
        if (Math.abs(dy) > Math.abs(dx)) {
          lineChar = '│';
        } else if (Math.abs(dx) > 0 && Math.abs(dy) > 0) {
          lineChar = dx * dy > 0 ? '\\' : '/';
        }
        
        return (
          <Box key={index} position="absolute" left={segment.from[0]} top={segment.from[1]}>
            <Text 
              color={isSelected ? 'white' : typeStyle.color} 
              backgroundColor={isSelected ? typeStyle.color : undefined}
              bold={isSelected}
              onClick={handleSelect}
            >
              {lineChar}
            </Text>
          </Box>
        );
      })}
      
      {/* Edge label */}
      {edge.label && (
        <Box position="absolute" left={labelPosition[0]} top={labelPosition[1]}>
          <Text 
            color={isSelected ? 'white' : typeStyle.color}
            backgroundColor={isSelected ? typeStyle.color : undefined}
            onClick={handleSelect}
          >
            {edge.label}
          </Text>
        </Box>
      )}
    </>
  );
};

/**
 * EdgeRenderer component
 */
export const EdgeRenderer: React.FC<EdgeRendererProps> = ({
  edges,
  nodes,
  viewport,
  selectedEdge,
  onEdgeSelect
}) => {
  return (
    <>
      {edges.map(edge => (
        <EdgeComponent
          key={edge.id}
          edge={edge}
          nodes={nodes}
          viewport={viewport}
          isSelected={selectedEdge === edge.id}
          onSelect={onEdgeSelect}
        />
      ))}
    </>
  );
};

export default EdgeRenderer;