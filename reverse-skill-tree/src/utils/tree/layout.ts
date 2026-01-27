import type { TreeNode } from '../../types';
import type { Edge } from '@xyflow/react';
import { buildTree } from './traversal';

const NODE_WIDTH = 250;
const NODE_HEIGHT = 120;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 80;

interface LayoutNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: TreeNode & { depth: number; hasChildren: boolean; isCollapsed: boolean };
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
  collapsedNodeIds: Set<string> = new Set()
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

  // Calculate the width needed for each subtree
  const subtreeWidths = new Map<string, number>();

  const calculateSubtreeWidth = (nodeId: string, children: TreeNode[]): number => {
    // If this node is collapsed, only count its own width
    if (collapsedNodeIds.has(nodeId)) {
      subtreeWidths.set(nodeId, NODE_WIDTH);
      return NODE_WIDTH;
    }

    if (children.length === 0) {
      subtreeWidths.set(nodeId, NODE_WIDTH);
      return NODE_WIDTH;
    }

    let totalWidth = 0;
    const nodeChildren = nodes.filter(n => n.parentId === nodeId).sort((a, b) => a.order - b.order);

    for (const child of nodeChildren) {
      const childChildren = nodes.filter(n => n.parentId === child.id);
      totalWidth += calculateSubtreeWidth(child.id, childChildren);
    }

    totalWidth += (nodeChildren.length - 1) * HORIZONTAL_GAP;
    const width = Math.max(NODE_WIDTH, totalWidth);
    subtreeWidths.set(nodeId, width);
    return width;
  };

  // First pass: calculate subtree widths
  for (const root of tree) {
    const rootChildren = nodes.filter(n => n.parentId === root.id);
    calculateSubtreeWidth(root.id, rootChildren);
  }

  // Calculate total width for root level
  let totalRootWidth = 0;
  for (const root of tree) {
    totalRootWidth += subtreeWidths.get(root.id) || NODE_WIDTH;
  }
  totalRootWidth += (tree.length - 1) * HORIZONTAL_GAP;

  // Position nodes
  const positionNode = (
    nodeId: string,
    depth: number,
    startX: number,
    _parentCenterX?: number
  ): void => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Skip hidden nodes
    if (isHidden(nodeId)) return;

    const subtreeWidth = subtreeWidths.get(nodeId) || NODE_WIDTH;
    const centerX = startX + subtreeWidth / 2;
    const x = centerX - NODE_WIDTH / 2;
    const y = depth * (NODE_HEIGHT + VERTICAL_GAP);
    const nodeHasChildren = hasChildren(nodeId);
    const nodeIsCollapsed = collapsedNodeIds.has(nodeId);

    layoutedNodes.push({
      id: node.id,
      type: 'treeNode',
      position: { x, y },
      data: { ...node, depth, hasChildren: nodeHasChildren, isCollapsed: nodeIsCollapsed },
      draggable: false, // Disable free dragging
    });

    // Don't position children if this node is collapsed
    if (nodeIsCollapsed) return;

    // Position children
    const children = nodes.filter(n => n.parentId === nodeId).sort((a, b) => a.order - b.order);
    let childStartX = startX;

    for (const child of children) {
      const childWidth = subtreeWidths.get(child.id) || NODE_WIDTH;
      positionNode(child.id, depth + 1, childStartX, centerX);
      childStartX += childWidth + HORIZONTAL_GAP;
    }
  };

  // Position all root nodes
  let currentX = 0;
  for (const root of tree) {
    positionNode(root.id, 0, currentX);
    currentX += (subtreeWidths.get(root.id) || NODE_WIDTH) + HORIZONTAL_GAP;
  }

  // Create edges (only for visible nodes)
  const visibleNodeIds = new Set(layoutedNodes.map(n => n.id));
  const edges: Edge[] = nodes
    .filter((node) => node.parentId && visibleNodeIds.has(node.id) && visibleNodeIds.has(node.parentId))
    .map((node) => ({
      id: `e-${node.parentId}-${node.id}`,
      source: node.parentId!,
      target: node.id,
      type: 'smoothstep',
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    }));

  return { nodes: layoutedNodes, edges };
}
