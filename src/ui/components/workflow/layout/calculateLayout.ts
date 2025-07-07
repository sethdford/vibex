/**
 * Calculate Layout Utility
 * 
 * Provides automatic layout calculation functions for workflow graphs.
 */

import { 
  Node, 
  Edge, 
  Position, 
  WorkflowGraph, 
  LayoutType, 
  LayoutOptions, 
  NodeType
} from '../types.js';

/**
 * Node with layout-specific properties
 */
interface LayoutNode extends Node {
  // Add layout-specific properties
  level?: number;
  rank?: number;
  processed?: boolean;
  children?: string[];
  parents?: string[];
  siblings?: string[];
}

/**
 * Calculate horizontal tree layout
 * 
 * @param nodes Nodes to position
 * @param edges Edges connecting nodes
 * @param options Layout options
 * @returns Positioned nodes
 */
function calculateHorizontalTreeLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Node[] {
  // Clone nodes to avoid modifying the originals
  const layoutNodes = JSON.parse(JSON.stringify(nodes)) as LayoutNode[];
  
  // Create node lookup for quick access
  const nodeMap = new Map<string, LayoutNode>();
  layoutNodes.forEach(node => {
    node.children = [];
    node.parents = [];
    nodeMap.set(node.id, node);
  });
  
  // Calculate node relationships based on edges
  edges.forEach(edge => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    
    if (source && target) {
      source.children?.push(target.id);
      target.parents?.push(source.id);
    }
  });
  
  // Find root nodes (nodes with no parents)
  const rootNodes = layoutNodes.filter(node => !node.parents?.length);
  
  // If no root nodes found, use the first node as root
  if (rootNodes.length === 0 && layoutNodes.length > 0) {
    rootNodes.push(layoutNodes[0]);
  }
  
  // Assign levels to nodes (depth in the tree)
  const assignLevels = (node: LayoutNode, level: number, visited = new Set<string>()) => {
    if (visited.has(node.id)) return;
    
    visited.add(node.id);
    node.level = Math.max(level, node.level || 0);
    
    const children = node.children || [];
    children.forEach(childId => {
      const childNode = nodeMap.get(childId);
      if (childNode) {
        assignLevels(childNode, level + 1, visited);
      }
    });
  };
  
  rootNodes.forEach(root => assignLevels(root, 0));
  
  // Group nodes by level
  const levelGroups = new Map<number, LayoutNode[]>();
  layoutNodes.forEach(node => {
    const level = node.level || 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)?.push(node);
  });
  
  // Calculate node positions based on levels
  const nodeSpacing = options.nodeSpacing || 50;
  const rankSpacing = options.rankSpacing || 100;
  
  // Position nodes level by level
  const levels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  levels.forEach(level => {
    const nodesInLevel = levelGroups.get(level) || [];
    const levelWidth = nodesInLevel.length * nodeSpacing;
    
    nodesInLevel.forEach((node, index) => {
      // Calculate node position in its level
      node.position = {
        x: level * rankSpacing + 50,
        y: index * nodeSpacing + (nodeSpacing / 2) - (levelWidth / 2) + 50
      };
    });
  });
  
  return layoutNodes;
}

/**
 * Calculate vertical tree layout
 * 
 * @param nodes Nodes to position
 * @param edges Edges connecting nodes
 * @param options Layout options
 * @returns Positioned nodes
 */
function calculateVerticalTreeLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Node[] {
  // Clone nodes to avoid modifying the originals
  const layoutNodes = JSON.parse(JSON.stringify(nodes)) as LayoutNode[];
  
  // Create node lookup for quick access
  const nodeMap = new Map<string, LayoutNode>();
  layoutNodes.forEach(node => {
    node.children = [];
    node.parents = [];
    nodeMap.set(node.id, node);
  });
  
  // Calculate node relationships based on edges
  edges.forEach(edge => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    
    if (source && target) {
      source.children?.push(target.id);
      target.parents?.push(source.id);
    }
  });
  
  // Find root nodes (nodes with no parents)
  const rootNodes = layoutNodes.filter(node => !node.parents?.length);
  
  // If no root nodes found, use the first node as root
  if (rootNodes.length === 0 && layoutNodes.length > 0) {
    rootNodes.push(layoutNodes[0]);
  }
  
  // Assign levels to nodes (depth in the tree)
  const assignLevels = (node: LayoutNode, level: number, visited = new Set<string>()) => {
    if (visited.has(node.id)) return;
    
    visited.add(node.id);
    node.level = Math.max(level, node.level || 0);
    
    const children = node.children || [];
    children.forEach(childId => {
      const childNode = nodeMap.get(childId);
      if (childNode) {
        assignLevels(childNode, level + 1, visited);
      }
    });
  };
  
  rootNodes.forEach(root => assignLevels(root, 0));
  
  // Group nodes by level
  const levelGroups = new Map<number, LayoutNode[]>();
  layoutNodes.forEach(node => {
    const level = node.level || 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)?.push(node);
  });
  
  // Calculate node positions based on levels
  const nodeSpacing = options.nodeSpacing || 50;
  const rankSpacing = options.rankSpacing || 100;
  
  // Position nodes level by level
  const levels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  levels.forEach(level => {
    const nodesInLevel = levelGroups.get(level) || [];
    const levelWidth = nodesInLevel.length * nodeSpacing;
    
    nodesInLevel.forEach((node, index) => {
      // Calculate node position in its level
      node.position = {
        x: index * nodeSpacing + (nodeSpacing / 2) - (levelWidth / 2) + 50,
        y: level * rankSpacing + 50
      };
    });
  });
  
  return layoutNodes;
}

/**
 * Calculate radial layout
 * 
 * @param nodes Nodes to position
 * @param edges Edges connecting nodes
 * @param options Layout options
 * @returns Positioned nodes
 */
function calculateRadialLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Node[] {
  // Clone nodes to avoid modifying the originals
  const layoutNodes = JSON.parse(JSON.stringify(nodes)) as LayoutNode[];
  
  // Create node lookup for quick access
  const nodeMap = new Map<string, LayoutNode>();
  layoutNodes.forEach(node => {
    node.children = [];
    node.parents = [];
    nodeMap.set(node.id, node);
  });
  
  // Calculate node relationships based on edges
  edges.forEach(edge => {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    
    if (source && target) {
      source.children?.push(target.id);
      target.parents?.push(source.id);
    }
  });
  
  // Find root nodes (nodes with no parents)
  let rootNodes = layoutNodes.filter(node => !node.parents?.length);
  
  // If no root nodes found, use nodes with most connections as roots
  if (rootNodes.length === 0 && layoutNodes.length > 0) {
    // Find nodes with most connections
    const nodeDegrees = new Map<string, number>();
    
    layoutNodes.forEach(node => {
      const degree = (node.children?.length || 0) + (node.parents?.length || 0);
      nodeDegrees.set(node.id, degree);
    });
    
    // Sort nodes by degree
    const nodesSortedByDegree = [...layoutNodes].sort((a, b) => 
      (nodeDegrees.get(b.id) || 0) - (nodeDegrees.get(a.id) || 0)
    );
    
    // Use the node with highest degree as root
    rootNodes = [nodesSortedByDegree[0]];
  }
  
  // Assign levels to nodes (depth from root)
  const assignLevels = (node: LayoutNode, level: number, visited = new Set<string>()) => {
    if (visited.has(node.id)) return;
    
    visited.add(node.id);
    node.level = Math.max(level, node.level || 0);
    
    const children = node.children || [];
    children.forEach(childId => {
      const childNode = nodeMap.get(childId);
      if (childNode) {
        assignLevels(childNode, level + 1, visited);
      }
    });
  };
  
  rootNodes.forEach(root => assignLevels(root, 0));
  
  // Group nodes by level
  const levelGroups = new Map<number, LayoutNode[]>();
  layoutNodes.forEach(node => {
    const level = node.level || 0;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)?.push(node);
  });
  
  // Calculate center position
  const centerX = 0;
  const centerY = 0;
  
  // Calculate radius for each level
  const levelRadius = options.rankSpacing || 100;
  
  // Position nodes in concentric circles
  const levels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  
  levels.forEach(level => {
    const nodesInLevel = levelGroups.get(level) || [];
    const radius = level * levelRadius;
    
    nodesInLevel.forEach((node, index) => {
      const angle = (index / nodesInLevel.length) * 2 * Math.PI;
      
      node.position = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
  });
  
  // Center the layout
  const centerLayout = (nodes: Node[]) => {
    // Calculate bounding box
    const minX = Math.min(...nodes.map(node => node.position.x));
    const maxX = Math.max(...nodes.map(node => node.position.x));
    const minY = Math.min(...nodes.map(node => node.position.y));
    const maxY = Math.max(...nodes.map(node => node.position.y));
    
    // Calculate center of bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Adjust all nodes to center the layout
    nodes.forEach(node => {
      node.position.x -= centerX;
      node.position.y -= centerY;
    });
  };
  
  centerLayout(layoutNodes);
  
  return layoutNodes;
}

/**
 * Calculate grid layout
 * 
 * @param nodes Nodes to position
 * @param edges Edges connecting nodes
 * @param options Layout options
 * @returns Positioned nodes
 */
function calculateGridLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Node[] {
  // Clone nodes to avoid modifying the originals
  const layoutNodes = JSON.parse(JSON.stringify(nodes)) as Node[];
  
  const nodeSpacing = options.nodeSpacing || 100;
  const gridSize = Math.ceil(Math.sqrt(layoutNodes.length));
  
  layoutNodes.forEach((node, index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    
    node.position = {
      x: col * nodeSpacing,
      y: row * nodeSpacing
    };
  });
  
  // Center the layout
  const centerLayout = (nodes: Node[]) => {
    // Calculate bounding box
    const minX = Math.min(...nodes.map(node => node.position.x));
    const maxX = Math.max(...nodes.map(node => node.position.x));
    const minY = Math.min(...nodes.map(node => node.position.y));
    const maxY = Math.max(...nodes.map(node => node.position.y));
    
    // Calculate center of bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Adjust all nodes to center the layout
    nodes.forEach(node => {
      node.position.x = node.position.x - centerX;
      node.position.y = node.position.y - centerY;
    });
  };
  
  centerLayout(layoutNodes);
  
  return layoutNodes;
}

/**
 * Calculate force-directed layout
 * 
 * @param nodes Nodes to position
 * @param edges Edges connecting nodes
 * @param options Layout options
 * @returns Positioned nodes
 */
function calculateForceLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions
): Node[] {
  // Clone nodes to avoid modifying the originals
  const layoutNodes = JSON.parse(JSON.stringify(nodes)) as Node[];
  
  // For a simplified force-directed layout, start with a grid layout
  const initialLayout = calculateGridLayout(nodes, edges, options);
  
  // Apply simple force simulation
  const repulsionForce = 1000; // Repulsion between nodes
  const attractionForce = 0.01; // Attraction along edges
  const damping = 0.9; // Damping factor
  const iterations = 50; // Number of iterations
  
  // Copy initial positions
  layoutNodes.forEach((node, i) => {
    node.position = { ...initialLayout[i].position };
    // Add velocity for simulation
    (node as any).vx = 0;
    (node as any).vy = 0;
  });
  
  // Create node lookup for quick access
  const nodeMap = new Map<string, Node & { vx: number; vy: number }>();
  layoutNodes.forEach(node => {
    nodeMap.set(node.id, node as any);
  });
  
  // Run force simulation
  for (let i = 0; i < iterations; i++) {
    // Calculate repulsion forces
    layoutNodes.forEach((nodeA) => {
      layoutNodes.forEach((nodeB) => {
        if (nodeA.id === nodeB.id) return;
        
        const dx = nodeB.position.x - nodeA.position.x;
        const dy = nodeB.position.y - nodeA.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const force = repulsionForce / (distance * distance);
        
        const forceX = (dx / distance) * force;
        const forceY = (dy / distance) * force;
        
        (nodeA as any).vx -= forceX;
        (nodeA as any).vy -= forceY;
        (nodeB as any).vx += forceX;
        (nodeB as any).vy += forceY;
      });
    });
    
    // Calculate attraction forces along edges
    edges.forEach(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (sourceNode && targetNode) {
        const dx = targetNode.position.x - sourceNode.position.x;
        const dy = targetNode.position.y - sourceNode.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const force = distance * attractionForce;
        
        const forceX = (dx / distance) * force;
        const forceY = (dy / distance) * force;
        
        sourceNode.vx += forceX;
        sourceNode.vy += forceY;
        targetNode.vx -= forceX;
        targetNode.vy -= forceY;
      }
    });
    
    // Apply velocities to positions with damping
    layoutNodes.forEach(node => {
      const typedNode = node as any;
      typedNode.vx *= damping;
      typedNode.vy *= damping;
      
      node.position.x += typedNode.vx;
      node.position.y += typedNode.vy;
    });
  }
  
  // Center the layout
  const centerLayout = (nodes: Node[]) => {
    // Calculate bounding box
    const minX = Math.min(...nodes.map(node => node.position.x));
    const maxX = Math.max(...nodes.map(node => node.position.x));
    const minY = Math.min(...nodes.map(node => node.position.y));
    const maxY = Math.max(...nodes.map(node => node.position.y));
    
    // Calculate center of bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Adjust all nodes to center the layout
    nodes.forEach(node => {
      node.position.x -= centerX;
      node.position.y -= centerY;
    });
  };
  
  centerLayout(layoutNodes);
  
  return layoutNodes;
}

/**
 * Calculate automatic layout for a workflow graph
 * 
 * @param graph Workflow graph to lay out
 * @param options Layout options
 * @returns Updated graph with positioned nodes
 */
export function calculateLayout(
  graph: WorkflowGraph,
  options: LayoutOptions
): WorkflowGraph {
  const { nodes, edges } = graph;
  
  let layoutNodes: Node[];
  
  switch (options.type) {
    case LayoutType.HORIZONTAL:
      layoutNodes = calculateHorizontalTreeLayout(nodes, edges, options);
      break;
    case LayoutType.VERTICAL:
      layoutNodes = calculateVerticalTreeLayout(nodes, edges, options);
      break;
    case LayoutType.RADIAL:
      layoutNodes = calculateRadialLayout(nodes, edges, options);
      break;
    case LayoutType.FORCE:
      layoutNodes = calculateForceLayout(nodes, edges, options);
      break;
    case LayoutType.GRID:
      layoutNodes = calculateGridLayout(nodes, edges, options);
      break;
    default:
      // Default to horizontal layout
      layoutNodes = calculateHorizontalTreeLayout(nodes, edges, options);
  }
  
  return {
    ...graph,
    nodes: layoutNodes
  };
}