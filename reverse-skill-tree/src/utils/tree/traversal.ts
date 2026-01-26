import type { TreeNode, TreeNodeWithChildren } from '../../types';

export function buildTree(nodes: TreeNode[]): TreeNodeWithChildren[] {
  const nodeMap = new Map<string, TreeNodeWithChildren>();
  const roots: TreeNodeWithChildren[] = [];

  // First pass: create all nodes with empty children arrays
  for (const node of nodes) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  // Second pass: build parent-child relationships
  for (const node of nodes) {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parentId === null) {
      roots.push(treeNode);
    } else {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(treeNode);
      }
    }
  }

  // Sort children by order
  const sortChildren = (node: TreeNodeWithChildren): void => {
    node.children.sort((a, b) => a.order - b.order);
    node.children.forEach(sortChildren);
  };

  roots.sort((a, b) => a.order - b.order);
  roots.forEach(sortChildren);

  return roots;
}

export function flattenTree(roots: TreeNodeWithChildren[]): TreeNode[] {
  const result: TreeNode[] = [];

  const traverse = (node: TreeNodeWithChildren): void => {
    const { children, ...nodeWithoutChildren } = node;
    result.push(nodeWithoutChildren as TreeNode);
    children.forEach(traverse);
  };

  roots.forEach(traverse);
  return result;
}

export function findNode(roots: TreeNodeWithChildren[], id: string): TreeNodeWithChildren | null {
  for (const root of roots) {
    if (root.id === id) return root;
    const found = findNodeInTree(root, id);
    if (found) return found;
  }
  return null;
}

function findNodeInTree(node: TreeNodeWithChildren, id: string): TreeNodeWithChildren | null {
  for (const child of node.children) {
    if (child.id === id) return child;
    const found = findNodeInTree(child, id);
    if (found) return found;
  }
  return null;
}

export function getAncestors(nodes: TreeNode[], nodeId: string): TreeNode[] {
  const ancestors: TreeNode[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  let current = nodeMap.get(nodeId);
  while (current?.parentId) {
    const parent = nodeMap.get(current.parentId);
    if (parent) {
      ancestors.push(parent);
      current = parent;
    } else {
      break;
    }
  }

  return ancestors;
}

export function getDescendants(nodes: TreeNode[], nodeId: string): TreeNode[] {
  const descendants: TreeNode[] = [];
  const childrenMap = new Map<string | null, TreeNode[]>();

  for (const node of nodes) {
    const parentId = node.parentId;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(node);
  }

  const traverse = (id: string): void => {
    const children = childrenMap.get(id) || [];
    for (const child of children) {
      descendants.push(child);
      traverse(child.id);
    }
  };

  traverse(nodeId);
  return descendants;
}

export function getDirectChildren(nodes: TreeNode[], parentId: string | null): TreeNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}
