import type { TreeNode, NodeProgress } from '../../types';
import { getDirectChildren } from './traversal';

export function calculateNodeProgress(nodes: TreeNode[], nodeId: string): NodeProgress {
  const children = getDirectChildren(nodes, nodeId);

  if (children.length === 0) {
    const node = nodes.find((n) => n.id === nodeId);
    const isCompleted = node?.status === 'completed' ? 1 : 0;
    return {
      completed: isCompleted,
      total: 1,
      percentage: isCompleted * 100,
    };
  }

  let completed = 0;
  let total = 0;

  for (const child of children) {
    const childProgress = calculateNodeProgress(nodes, child.id);
    completed += childProgress.completed;
    total += childProgress.total;
  }

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function calculateProjectProgress(nodes: TreeNode[]): NodeProgress {
  const rootNodes = nodes.filter((n) => n.parentId === null);

  if (rootNodes.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  let completed = 0;
  let total = 0;

  for (const root of rootNodes) {
    const progress = calculateNodeProgress(nodes, root.id);
    completed += progress.completed;
    total += progress.total;
  }

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function shouldAutoCompleteParent(
  nodes: TreeNode[],
  parentId: string,
  pendingCompleted: Set<string> = new Set()
): boolean {
  const children = getDirectChildren(nodes, parentId);
  if (children.length === 0) return false;
  // Check if all children are either already completed OR pending to be completed
  return children.every((child) =>
    child.status === 'completed' || pendingCompleted.has(child.id)
  );
}

export function getParentsToAutoComplete(nodes: TreeNode[], nodeId: string): string[] {
  const parentsToComplete: string[] = [];
  // Track nodes that will be completed (including the initial node)
  const pendingCompleted = new Set<string>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  let current = nodeMap.get(nodeId);
  while (current?.parentId) {
    const parent = nodeMap.get(current.parentId);
    if (parent && parent.status !== 'completed') {
      if (shouldAutoCompleteParent(nodes, parent.id, pendingCompleted)) {
        parentsToComplete.push(parent.id);
        // Mark this parent as pending completed for the next iteration
        pendingCompleted.add(parent.id);
        current = parent;
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return parentsToComplete;
}
