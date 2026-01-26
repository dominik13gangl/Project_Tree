import { create } from 'zustand';
import type { Edge } from '@xyflow/react';
import type { TreeNode, CreateNodeInput, UpdateNodeInput, NodeProgress } from '../types';
import { nodeService } from '../services/storage';
import { calculateLayout } from '../utils/tree/layout';
import { calculateNodeProgress, calculateProjectProgress, getParentsToAutoComplete } from '../utils/tree/progress';

interface LayoutNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: TreeNode;
}

interface TreeState {
  nodes: TreeNode[];
  flowNodes: LayoutNode[];
  flowEdges: Edge[];
  selectedNodeId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadNodes: (projectId: string) => Promise<void>;
  clearNodes: () => void;
  createNode: (input: CreateNodeInput) => Promise<TreeNode>;
  updateNode: (id: string, input: UpdateNodeInput, autoComplete?: boolean) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  moveNode: (id: string, newParentId: string | null) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  updateLayout: () => void;
  toggleCollapse: (nodeId: string) => Promise<void>;

  // Selectors
  getNode: (id: string) => TreeNode | undefined;
  getNodeProgress: (id: string) => NodeProgress;
  getProjectProgress: () => NodeProgress;
}

export const useTreeStore = create<TreeState>((set, get) => ({
  nodes: [],
  flowNodes: [],
  flowEdges: [],
  selectedNodeId: null,
  isLoading: false,
  error: null,

  loadNodes: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const nodes = await nodeService.getByProjectId(projectId);
      const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes);
      set({ nodes, flowNodes, flowEdges, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearNodes: () => {
    set({ nodes: [], flowNodes: [], flowEdges: [], selectedNodeId: null });
  },

  createNode: async (input) => {
    const node = await nodeService.create(input);
    const nodes = [...get().nodes, node];
    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes);
    set({ nodes, flowNodes, flowEdges });
    return node;
  },

  updateNode: async (id, input, autoComplete = true) => {
    const updated = await nodeService.update(id, input);
    if (!updated) return;

    let nodes = get().nodes.map((n) => (n.id === id ? updated : n));

    // Auto-complete parent nodes if all children are completed
    if (autoComplete && input.status === 'completed') {
      const parentsToComplete = getParentsToAutoComplete(nodes, id);
      for (const parentId of parentsToComplete) {
        const parentUpdated = await nodeService.update(parentId, { status: 'completed' });
        if (parentUpdated) {
          nodes = nodes.map((n) => (n.id === parentId ? parentUpdated : n));
        }
      }
    }

    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes);
    set({ nodes, flowNodes, flowEdges });
  },

  deleteNode: async (id) => {
    await nodeService.delete(id);
    const nodes = get().nodes.filter((n) => n.id !== id && !isDescendantOf(get().nodes, n.id, id));
    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes);
    set({
      nodes,
      flowNodes,
      flowEdges,
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  moveNode: async (id, newParentId) => {
    await nodeService.moveToParent(id, newParentId);
    const updatedNode = await nodeService.getById(id);
    if (!updatedNode) return;

    const nodes = get().nodes.map((n) => (n.id === id ? updatedNode : n));
    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes);
    set({ nodes, flowNodes, flowEdges });
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  updateLayout: () => {
    const { nodes } = get();
    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes);
    set({ flowNodes, flowEdges });
  },

  toggleCollapse: async (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;

    await get().updateNode(nodeId, { isCollapsed: !node.isCollapsed }, false);
  },

  getNode: (id) => get().nodes.find((n) => n.id === id),

  getNodeProgress: (id) => calculateNodeProgress(get().nodes, id),

  getProjectProgress: () => calculateProjectProgress(get().nodes),
}));

// Helper function
function isDescendantOf(nodes: TreeNode[], nodeId: string, ancestorId: string): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || !node.parentId) return false;
  if (node.parentId === ancestorId) return true;
  return isDescendantOf(nodes, node.parentId, ancestorId);
}
