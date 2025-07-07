/**
 * MinimapRenderer Component
 * 
 * Renders a minimap view of the workflow graph for navigation.
 */

import React, { useCallback } from 'react';
import { Box, Text } from 'ink';
import { WorkflowGraph, Viewport, NodeType, NodeStatus } from '../types';

// MinimapRenderer props
interface MinimapRendererProps {
  graph: WorkflowGraph;
  viewport: Viewport;
  width: number;
  height: number;
  onViewportChange?: (viewport: Partial<Viewport>) => void;
}

/**
 * MinimapRenderer component
 */
export const MinimapRenderer: React.FC<MinimapRendererProps> = ({
  graph,
  viewport,
  width,
  height,
  onViewportChange
}) => {
  // Calculate bounding box of the graph
  const minX = Math.min(...graph.nodes.map(node => node.position.x));
  const maxX = Math.max(...graph.nodes.map(node => node.position.x));
  const minY = Math.min(...graph.nodes.map(node => node.position.y));
  const maxY = Math.max(...graph.nodes.map(node => node.position.y));
  
  // Calculate graph dimensions
  const graphWidth = maxX - minX || 1;
  const graphHeight = maxY - minY || 1;
  
  // Calculate scale factors
  const scaleX = (width - 2) / graphWidth;
  const scaleY = (height - 2) / graphHeight;
  const scale = Math.min(scaleX, scaleY);
  
  // Calculate node position in minimap
  const getMinimapPosition = useCallback((x: number, y: number): [number, number] => {
    const minimapX = Math.floor((x - minX) * scale);
    const minimapY = Math.floor((y - minY) * scale);
    return [minimapX, minimapY];
  }, [minX, minY, scale]);
  
  // Calculate viewport rectangle in minimap
  const viewportRect = {
    left: Math.floor((-viewport.offsetX / viewport.zoom - minX) * scale),
    top: Math.floor((-viewport.offsetY / viewport.zoom - minY) * scale),
    width: Math.floor((viewport.width / viewport.zoom) * scale),
    height: Math.floor((viewport.height / viewport.zoom) * scale)
  };
  
  // Handle click on minimap
  const handleMinimapClick = (x: number, y: number) => {
    if (!onViewportChange) return;
    
    // Convert minimap coordinates to graph coordinates
    const graphX = (x / scale) + minX;
    const graphY = (y / scale) + minY;
    
    // Calculate new viewport offsets to center on the clicked point
    const newOffsetX = -graphX * viewport.zoom + viewport.width / 2;
    const newOffsetY = -graphY * viewport.zoom + viewport.height / 2;
    
    // Update viewport
    onViewportChange({
      offsetX: newOffsetX,
      offsetY: newOffsetY
    });
  };
  
  // Create a 2D grid for the minimap
  const grid = Array(height).fill(0).map(() => Array(width).fill(' '));
  
  // Plot nodes on the grid
  graph.nodes.forEach(node => {
    const [x, y] = getMinimapPosition(node.position.x, node.position.y);
    
    // Skip if outside the minimap
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }
    
    // Set character based on node type
    let char = '●';
    if (node.type === NodeType.START) char = 'S';
    else if (node.type === NodeType.END) char = 'E';
    else if (node.type === NodeType.DECISION) char = 'D';
    else if (node.type === NodeType.SUBPROCESS) char = 'P';
    
    // Set color based on node status
    let color = 'white';
    if (node.status === NodeStatus.COMPLETED) color = 'green';
    else if (node.status === NodeStatus.IN_PROGRESS) color = 'yellow';
    else if (node.status === NodeStatus.ERROR) color = 'red';
    
    grid[y][x] = char;
  });
  
  // Plot edges on the grid (simplified)
  graph.edges.forEach(edge => {
    const sourceNode = graph.nodes.find(node => node.id === edge.source);
    const targetNode = graph.nodes.find(node => node.id === edge.target);
    
    if (!sourceNode || !targetNode) {
      return;
    }
    
    const [sourceX, sourceY] = getMinimapPosition(sourceNode.position.x, sourceNode.position.y);
    const [targetX, targetY] = getMinimapPosition(targetNode.position.x, targetNode.position.y);
    
    // Simple line drawing algorithm
    const dx = Math.abs(targetX - sourceX);
    const dy = Math.abs(targetY - sourceY);
    const sx = sourceX < targetX ? 1 : -1;
    const sy = sourceY < targetY ? 1 : -1;
    let err = dx - dy;
    
    let x = sourceX;
    let y = sourceY;
    
    while (true) {
      // Stop if we've reached the target
      if (x === targetX && y === targetY) {
        break;
      }
      
      // Check if we're inside the grid
      if (x >= 0 && x < width && y >= 0 && y < height) {
        // Don't overwrite nodes
        if (grid[y][x] === ' ') {
          grid[y][x] = '·';
        }
      }
      
      // Calculate next point
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  });
  
  // Mark viewport area
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Check if this point is on the viewport rectangle border
      const isOnViewportBorder = 
        (x === viewportRect.left || x === viewportRect.left + viewportRect.width) && 
        (y >= viewportRect.top && y <= viewportRect.top + viewportRect.height) ||
        (y === viewportRect.top || y === viewportRect.top + viewportRect.height) && 
        (x >= viewportRect.left && x <= viewportRect.left + viewportRect.width);
      
      if (isOnViewportBorder) {
        grid[y][x] = '#';
      }
    }
  }
  
  return (
    <Box 
      width={width} 
      height={height} 
      flexDirection="column"
      borderStyle="single" 
      borderColor="gray"
    >
      {grid.map((row, y) => (
        <Box key={y}>
          <Text>
            {row.map((cell, x) => {
              // Create a clickable character for each cell
              return (
                <Text 
                  key={x} 
                  onClick={() => handleMinimapClick(x, y)}
                >
                  {cell}
                </Text>
              );
            })}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

export default MinimapRenderer;