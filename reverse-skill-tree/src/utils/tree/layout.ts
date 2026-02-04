import type { TreeNode, NodeSizeSettings } from '../../types';
import type { Edge } from '@xyflow/react';
import { buildTree } from './traversal';

// Base gaps at scale 1.0 - these will scale with depth
const BASE_HORIZONTAL_GAP = 40;
const BASE_VERTICAL_GAP = 60;

// Default node size settings
const defaultNodeSize: NodeSizeSettings = {
  baseWidth: 280,
  baseHeight: 120,
  depthScalePercent: 85,
  minScalePercent: 50,
};

// Calculate scale factor for a given depth
export function getScaleAtDepth(depth: number, nodeSize: NodeSizeSettings): number {
  if (depth === 0) return 1;
  let scale = 1;
  for (let i = 1; i <= depth; i++) {
    scale = scale * (nodeSize.depthScalePercent / 100);
  }
  return Math.max(scale, nodeSize.minScalePercent / 100);
}

// Get visual dimensions and gaps at a specific depth
function getLayoutMetrics(depth: number, nodeSize: NodeSizeSettings): {
  width: number;
  height: number;
  scale: number;
  horizontalGap: number;
  verticalGap: number;
} {
  const scale = getScaleAtDepth(depth, nodeSize);
  return {
    width: nodeSize.baseWidth * scale,
    height: nodeSize.baseHeight * scale,
    scale,
    // Gaps scale with depth for proportional appearance
    horizontalGap: BASE_HORIZONTAL_GAP * scale,
    verticalGap: BASE_VERTICAL_GAP * scale,
  };
}

interface LayoutNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: TreeNode & { depth: number; hasChildren: boolean; isCollapsed: boolean; scale: number };
  draggable: boolean;
}

export function calculateNodeDepth(nodes: TreeNode[], nodeId: string): number {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  let depth = 0;
  let current = nodeMap.get(nodeId);

  while (current?.parentId) {
    depth++;
    current = nodeMap.get(current.parentId);
  }

  return depth;
}

export function calculateLayout(
  nodes: TreeNode[],
  collapsedNodeIds: Set<string> = new Set(),
  nodeSize: NodeSizeSettings = defaultNodeSize
): { nodes: LayoutNode[]; edges: Edge[] } {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const tree = buildTree(nodes);
  const layoutedNodes: LayoutNode[] = [];

  // Check if a node has children
  const hasChildren = (nodeId: string): boolean => {
    return nodes.some(n => n.parentId === nodeId);
  };

  // Check if a node is hidden (parent is collapsed)
  const isHidden = (nodeId: string): boolean => {
    let current = nodes.find(n => n.id === nodeId);
    while (current?.parentId) {
      if (collapsedNodeIds.has(current.parentId)) {
        return true;
      }
      current = nodes.find(n => n.id === current?.parentId);
    }
    return false;
  };

  // Get depth of a node
  const getDepth = (nodeId: string): number => {
    let depth = 0;
    let current = nodes.find(n => n.id === nodeId);
    while (current?.parentId) {
      depth++;
      current = nodes.find(n => n.id === current?.parentId);
    }
    return depth;
  };

  // Calculate the width needed for each subtree (using visual/scaled dimensions)
  const subtreeWidths = new Map<string, number>();

  const calculateSubtreeWidth = (nodeId: string): number => {
    const depth = getDepth(nodeId);
    const metrics = getLayoutMetrics(depth, nodeSize);
    const { width: visualWidth, horizontalGap } = metrics;

    // If this node is collapsed or has no visible children, use its own width
    if (collapsedNodeIds.has(nodeId)) {
      subtreeWidths.set(nodeId, visualWidth);
      return visualWidth;
    }

    const nodeChildren = nodes.filter(n => n.parentId === nodeId).sort((a, b) => a.order - b.order);

    if (nodeChildren.length === 0) {
      subtreeWidths.set(nodeId, visualWidth);
      return visualWidth;
    }

    // Sum up children's subtree widths plus gaps between them
    let childrenTotalWidth = 0;
    for (const child of nodeChildren) {
      childrenTotalWidth += calculateSubtreeWidth(child.id);
    }

    // Use the child's depth for gap calculation (gaps between siblings at same level)
    const childMetrics = getLayoutMetrics(depth + 1, nodeSize);
    childrenTotalWidth += (nodeChildren.length - 1) * childMetrics.horizontalGap;

    // Subtree width is the max of node's own width and children's total width
    const width = Math.max(visualWidth, childrenTotalWidth);
    subtreeWidths.set(nodeId, width);
    return width;
  };

  // First pass: calculate all subtree widths
  for (const root of tree) {
    calculateSubtreeWidth(root.id);
  }

  // Pre-calculate Y positions for each depth level
  // Each level's Y is the sum of all previous levels' heights + gaps
  const depthYPositions = new Map<number, number>();
  let cumulativeY = 0;
  for (let d = 0; d <= 15; d++) {
    depthYPositions.set(d, cumulativeY);
    const metrics = getLayoutMetrics(d, nodeSize);
    // Use this level's scaled height + the gap to next level (which is this level's gap)
    cumulativeY += metrics.height + metrics.verticalGap;
  }

  // Position nodes - positions are top-left corners, nodes have actual scaled dimensions
  const positionNode = (
    nodeId: string,
    depth: number,
    subtreeStartX: number
  ): void => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    if (isHidden(nodeId)) return;

    const metrics = getLayoutMetrics(depth, nodeSize);
    const subtreeWidth = subtreeWidths.get(nodeId) || metrics.width;

    // Calculate center X of this node's subtree
    const subtreeCenterX = subtreeStartX + subtreeWidth / 2;

    // Node's top-left position: center minus half the scaled width
    const x = subtreeCenterX - metrics.width / 2;
    const y = depthYPositions.get(depth) || 0;

    const nodeHasChildren = hasChildren(nodeId);
    const nodeIsCollapsed = collapsedNodeIds.has(nodeId);

    layoutedNodes.push({
      id: node.id,
      type: 'treeNode',
      position: { x, y },
      data: { ...node, depth, hasChildren: nodeHasChildren, isCollapsed: nodeIsCollapsed, scale: metrics.scale },
      draggable: false,
    });

    // Position children if not collapsed
    if (nodeIsCollapsed) return;

    const children = nodes.filter(n => n.parentId === nodeId).sort((a, b) => a.order - b.order);
    if (children.length === 0) return;

    // Calculate where children start - centered under parent's subtree
    const childMetrics = getLayoutMetrics(depth + 1, nodeSize);
    let childStartX = subtreeStartX;

    for (const child of children) {
      const childSubtreeWidth = subtreeWidths.get(child.id) || childMetrics.width;
      positionNode(child.id, depth + 1, childStartX);
      childStartX += childSubtreeWidth + childMetrics.horizontalGap;
    }
  };

  // Position all root nodes
  const rootMetrics = getLayoutMetrics(0, nodeSize);
  let currentX = 0;
  for (const root of tree) {
    positionNode(root.id, 0, currentX);
    const rootSubtreeWidth = subtreeWidths.get(root.id) || rootMetrics.width;
    currentX += rootSubtreeWidth + rootMetrics.horizontalGap;
  }

  // Create edges with proper styling - use 'tree' for orthogonal lines like org chart
  const visibleNodeIds = new Set(layoutedNodes.map(n => n.id));
  const edges: Edge[] = nodes
    .filter((node) => node.parentId && visibleNodeIds.has(node.id) && visibleNodeIds.has(node.parentId))
    .map((node) => ({
      id: `e-${node.parentId}-${node.id}`,
      source: node.parentId!,
      target: node.id,
      type: 'tree',
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    }));

  return { nodes: layoutedNodes, edges };
}
