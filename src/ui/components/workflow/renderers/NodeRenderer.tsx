/**
 * NodeRenderer Component
 * 
 * Renders workflow graph nodes with appropriate styling based on type and status.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Node, NodeType, NodeStatus, Viewport } from '../types';

// Node type to style mapping
const nodeTypeStyles: Record<NodeType, { symbol: string; color: string }> = {
  [NodeType.START]: { symbol: '●', color: 'green' },
  [NodeType.TASK]: { symbol: '■', color: 'blue' },
  [NodeType.DECISION]: { symbol: '◆', color: 'yellow' },
  [NodeType.PARALLEL]: { symbol: '⧖', color: 'magenta' },
  [NodeType.WAIT]: { symbol: '⧗', color: 'cyan' },
  [NodeType.END]: { symbol: '◉', color: 'red' },
  [NodeType.SUBPROCESS]: { symbol: '□', color: 'blue' },
  [NodeType.ERROR]: { symbol: '⚠', color: 'red' },
  [NodeType.CUSTOM]: { symbol: '⬙', color: 'white' }
};

// Node status to color mapping
const nodeStatusColors: Record<NodeStatus, string> = {
  [NodeStatus.PENDING]: 'gray',
  [NodeStatus.IN_PROGRESS]: 'yellow',
  [NodeStatus.COMPLETED]: 'green',
  [NodeStatus.ERROR]: 'red',
  [NodeStatus.SKIPPED]: 'blue',
  [NodeStatus.WAITING]: 'cyan',
  [NodeStatus.CANCELED]: 'gray'
};

// NodeRenderer props
interface NodeRendererProps {
  nodes: Node[];
  viewport: Viewport;
  selectedNode: string | null;
  onNodeSelect?: (nodeId: string) => void;
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
 * Get node dimensions based on type and content
 * 
 * @param node Node to measure
 * @returns Node dimensions [width, height]
 */
const getNodeDimensions = (node: Node): [number, number] => {
  // Use provided size if available
  if (node.size) {
    return [node.size.width, node.size.height];
  }
  
  // Calculate based on label length
  const width = Math.max(node.label.length + 4, 10);
  const height = 3;
  
  return [width, height];
};

/**
 * Single Node component
 */
const NodeComponent: React.FC<{
  node: Node;
  isSelected: boolean;
  viewport: Viewport;
  onSelect?: (nodeId: string) => void;
}> = ({ node, isSelected, viewport, onSelect }) => {
  // Calculate screen position
  const [screenX, screenY] = transformPoint(node.position.x, node.position.y, viewport);
  
  // Get node dimensions
  const [width, height] = getNodeDimensions(node);
  
  // Get style based on type
  const typeStyle = nodeTypeStyles[node.type] || nodeTypeStyles[NodeType.CUSTOM];
  
  // Get color based on status
  const statusColor = nodeStatusColors[node.status] || 'white';
  
  // Handle node selection
  const handleSelect = () => {
    if (onSelect) {
      onSelect(node.id);
    }
  };
  
  return (
    <Box
      position="absolute"
      left={screenX - Math.floor(width / 2)}
      top={screenY - Math.floor(height / 2)}
      width={width}
      height={height}
      borderStyle={isSelected ? 'double' : 'single'}
      borderColor={isSelected ? 'white' : statusColor}
      alignItems="center"
      justifyContent="center"
      onClick={handleSelect}
    >
      <Text color={typeStyle.color}>
        {typeStyle.symbol} <Text bold={isSelected} color={statusColor}>{node.label}</Text>
      </Text>
    </Box>
  );
};

/**
 * NodeRenderer component
 */
export const NodeRenderer: React.FC<NodeRendererProps> = ({
  nodes,
  viewport,
  selectedNode,
  onNodeSelect
}) => {
  return (
    <>
      {nodes.map(node => (
        <NodeComponent
          key={node.id}
          node={node}
          isSelected={selectedNode === node.id}
          viewport={viewport}
          onSelect={onNodeSelect}
        />
      ))}
    </>
  );
};

export default NodeRenderer;