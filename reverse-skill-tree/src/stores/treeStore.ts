import { create } from 'zustand';
import type { Edge } from '@xyflow/react';
import type { TreeNode, CreateNodeInput, UpdateNodeInput, NodeProgress, CategoryType, NodeSizeSettings } from '../types';
import { nodeService } from '../services/storage';
import { calculateLayout, calculateNodeDepth } from '../utils/tree/layout';
import { calculateNodeProgress, calculateProjectProgress, getParentsToAutoComplete } from '../utils/tree/progress';

// Default node size settings
const defaultNodeSize: NodeSizeSettings = {
  baseWidth: 280,
  baseHeight: 120,
  depthScalePercent: 85,
  minScalePercent: 50,
};

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
  selectedNodeIds: string[];
  isLoading: boolean;
  error: string | null;
  collapsedNodeIds: Set<string>;
  nodeSize: NodeSizeSettings;

  // Actions
  loadNodes: (projectId: string, nodeSize?: NodeSizeSettings) => Promise<void>;
  setNodeSize: (nodeSize: NodeSizeSettings) => void;
  clearNodes: () => void;
  createNode: (input: CreateNodeInput, categoryTypes?: CategoryType[]) => Promise<TreeNode>;
  updateNode: (id: string, input: UpdateNodeInput, autoComplete?: boolean) => Promise<void>;
  updateNodes: (ids: string[], input: UpdateNodeInput, autoComplete?: boolean) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  deleteNodes: (ids: string[]) => Promise<void>;
  moveNode: (id: string, newParentId: string | null) => Promise<void>;
  reorderNode: (id: string, newOrder: number) => Promise<void>;
  swapNodeOrder: (nodeId1: string, nodeId2: string) => Promise<void>;
  swapNodesFully: (nodeId1: string, nodeId2: string) => Promise<void>;
  moveNodeToParent: (nodeId: string, newParentId: string | null) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  toggleNodeSelection: (nodeId: string) => void;
  selectNodeWithDescendants: (nodeId: string) => void;
  clearSelection: () => void;
  updateLayout: () => void;
  toggleCollapse: (nodeId: string) => void;
  collapseAllAtDepth: (depth: number) => void;
  expandAllAtDepth: (depth: number) => void;
  collapseAll: () => void;
  expandAll: () => void;
  repairProject: (projectId: string) => Promise<{ fixed: number; removed: number }>;
  getFirstChild: (nodeId: string) => TreeNode | undefined;
  getDescendants: (nodeId: string) => string[];

  // Selectors
  getNode: (id: string) => TreeNode | undefined;
  getNodeProgress: (id: string) => NodeProgress;
  getProjectProgress: () => NodeProgress;
  getSiblings: (nodeId: string) => TreeNode[];
  isCollapsed: (nodeId: string) => boolean;
  getMaxDepth: () => number;
  getNodeDepth: (nodeId: string) => number;
  getLeftNeighbor: (nodeId: string) => TreeNode | null;
  getRightNeighbor: (nodeId: string) => TreeNode | null;
}

export const useTreeStore = create<TreeState>((set, get) => ({
  nodes: [],
  flowNodes: [],
  flowEdges: [],
  selectedNodeIds: [],
  isLoading: false,
  error: null,
  collapsedNodeIds: new Set<string>(),
  nodeSize: defaultNodeSize,

  setNodeSize: (nodeSize) => {
    set({ nodeSize });
    // Recalculate layout with new size
    const { nodes, collapsedNodeIds } = get();
    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, collapsedNodeIds, nodeSize);
    set({ flowNodes, flowEdges });
  },

  loadNodes: async (projectId, nodeSize) => {
    set({ isLoading: true, error: null });
    try {
      let nodes = await nodeService.getByProjectId(projectId);
      
      // Auto-repair: Check for and fix circular references before layout calculation
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const nodesToFix: string[] = [];
      
      for (const node of nodes) {
        if (!node.parentId) continue;
        
        // Check for circular reference by walking up the tree
        const visited = new Set<string>();
        let current: TreeNode | undefined = node;
        let hasCircle = false;
        
        while (current?.parentId) {
          if (visited.has(current.id)) {
            hasCircle = true;
            break;
          }
          visited.add(current.id);
          current = nodeMap.get(current.parentId);
        }
        
        // Also check if parentId points to non-existent node
        if (hasCircle || (node.parentId && !nodeMap.has(node.parentId))) {
          nodesToFix.push(node.id);
        }
      }
      
      // Fix any problematic nodes
      if (nodesToFix.length > 0) {
        console.warn(`Auto-repairing ${nodesToFix.length} nodes with circular/invalid references`);
        for (const nodeId of nodesToFix) {
          await nodeService.update(nodeId, { parentId: null });
        }
        // Reload after repair
        nodes = await nodeService.getByProjectId(projectId);
      }
      
      // Initialize collapsed state from nodes
      const collapsedNodeIds = new Set(nodes.filter(n => n.isCollapsed).map(n => n.id));
      const currentNodeSize = nodeSize ?? get().nodeSize;
      const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, collapsedNodeIds, currentNodeSize);
      set({ nodes, flowNodes, flowEdges, isLoading: false, collapsedNodeIds, nodeSize: currentNodeSize });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  clearNodes: () => {
    set({ nodes: [], flowNodes: [], flowEdges: [], selectedNodeIds: [], collapsedNodeIds: new Set() });
  },

  createNode: async (input, categoryTypes) => {
    // Apply default categories from project settings if not provided
    let finalInput = input;
    if (categoryTypes && !input.categories) {
      const defaultCategories: Record<string, string> = {};
      for (const categoryType of categoryTypes) {
        if (categoryType.defaultCategoryId) {
          defaultCategories[categoryType.id] = categoryType.defaultCategoryId;
        }
      }
      if (Object.keys(defaultCategories).length > 0) {
        finalInput = { ...input, categories: defaultCategories };
      }
    }

    const node = await nodeService.create(finalInput);
    const nodes = [...get().nodes, node];
    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, get().collapsedNodeIds, get().nodeSize);
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

    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, get().collapsedNodeIds, get().nodeSize);
    set({ nodes, flowNodes, flowEdges });
  },

  updateNodes: async (ids, input, autoComplete = true) => {
    let nodes = get().nodes;

    for (const id of ids) {
      const updated = await nodeService.update(id, input);
      if (!updated) continue;

      nodes = nodes.map((n) => (n.id === id ? updated : n));

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
    }

    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, get().collapsedNodeIds, get().nodeSize);
    set({ nodes, flowNodes, flowEdges });
  },

  deleteNode: async (id) => {
    await nodeService.delete(id);
    const nodes = get().nodes.filter((n) => n.id !== id && !isDescendantOf(get().nodes, n.id, id));
    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, get().collapsedNodeIds, get().nodeSize);
    set({
      nodes,
      flowNodes,
      flowEdges,
      selectedNodeIds: get().selectedNodeIds.filter(sid => sid !== id),
    });
  },

  deleteNodes: async (ids) => {
    // Delete all nodes and their descendants
    for (const id of ids) {
      await nodeService.delete(id);
    }
    const deletedSet = new Set(ids);
    const nodes = get().nodes.filter((n) => {
      if (deletedSet.has(n.id)) return false;
      // Also filter out descendants
      for (const deletedId of ids) {
        if (isDescendantOf(get().nodes, n.id, deletedId)) return false;
      }
      return true;
    });
    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, get().collapsedNodeIds, get().nodeSize);
    set({
      nodes,
      flowNodes,
      flowEdges,
      selectedNodeIds: [],
    });
  },

  moveNode: async (id, newParentId) => {
    await nodeService.moveToParent(id, newParentId);
    const updatedNode = await nodeService.getById(id);
    if (!updatedNode) return;

    const nodes = get().nodes.map((n) => (n.id === id ? updatedNode : n));
    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, get().collapsedNodeIds, get().nodeSize);
    set({ nodes, flowNodes, flowEdges });
  },

  reorderNode: async (id, newOrder) => {
    await nodeService.reorder(id, newOrder);
    // Reload all nodes to get updated order values
    const node = get().nodes.find(n => n.id === id);
    if (!node) return;

    const allNodes = await nodeService.getByProjectId(node.projectId);
    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(allNodes, get().collapsedNodeIds, get().nodeSize);
    set({ nodes: allNodes, flowNodes, flowEdges });
  },

  swapNodeOrder: async (nodeId1, nodeId2) => {
    const node1 = get().nodes.find(n => n.id === nodeId1);
    const node2 = get().nodes.find(n => n.id === nodeId2);
    if (!node1 || !node2) return;
    
    // Swap orders
    const order1 = node1.order;
    const order2 = node2.order;
    
    await nodeService.update(nodeId1, { order: order2 });
    await nodeService.update(nodeId2, { order: order1 });
    
    // Update local state
    const nodes = get().nodes.map(n => {
      if (n.id === nodeId1) return { ...n, order: order2 };
      if (n.id === nodeId2) return { ...n, order: order1 };
      return n;
    });

    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, get().collapsedNodeIds, get().nodeSize);
    set({ nodes, flowNodes, flowEdges });
  },

  // Swap two nodes completely - each takes the other's position AND children
  swapNodesFully: async (nodeId1, nodeId2) => {
    const node1 = get().nodes.find(n => n.id === nodeId1);
    const node2 = get().nodes.find(n => n.id === nodeId2);
    if (!node1 || !node2) return;
    
    // Check if one is parent of the other (special case)
    const node1IsChildOfNode2 = node1.parentId === nodeId2;
    const node2IsChildOfNode1 = node2.parentId === nodeId1;
    
    if (node1IsChildOfNode2 || node2IsChildOfNode1) {
      // Special handling for parent-child swap
      // They swap positions AND children (just like horizontal swap)
      const parent = node1IsChildOfNode2 ? node2 : node1;
      const child = node1IsChildOfNode2 ? node1 : node2;
      
      const grandparentId = parent.parentId;
      const parentOrder = parent.order;
      const childOrder = child.order;
      
      // Get children of both (excluding the direct relationship)
      const parentOtherChildren = get().nodes.filter(n => n.parentId === parent.id && n.id !== child.id);
      const childChildren = get().nodes.filter(n => n.parentId === child.id);
      
      // Child moves to parent's position
      await nodeService.update(child.id, { parentId: grandparentId, order: parentOrder });
      
      // Parent becomes child of the former child
      await nodeService.update(parent.id, { parentId: child.id, order: childOrder });
      
      // Parent's other children become children of the child (swap!)
      for (const otherChild of parentOtherChildren) {
        await nodeService.update(otherChild.id, { parentId: child.id });
      }
      
      // Child's children become children of the parent (swap!)
      for (const childChild of childChildren) {
        await nodeService.update(childChild.id, { parentId: parent.id });
      }
      
      // Update local state
      let nodes = get().nodes.map(n => {
        if (n.id === child.id) return { ...n, parentId: grandparentId, order: parentOrder };
        if (n.id === parent.id) return { ...n, parentId: child.id, order: childOrder };
        if (parentOtherChildren.some(c => c.id === n.id)) return { ...n, parentId: child.id };
        if (childChildren.some(c => c.id === n.id)) return { ...n, parentId: parent.id };
        return n;
      });

      const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, get().collapsedNodeIds, get().nodeSize);
      set({ nodes, flowNodes, flowEdges });
      return;
    }
    
    // Normal case: nodes are not in parent-child relationship
    // Get children of both nodes
    const children1 = get().nodes.filter(n => n.parentId === nodeId1);
    const children2 = get().nodes.filter(n => n.parentId === nodeId2);
    
    // Swap parentId and order
    const parent1 = node1.parentId;
    const parent2 = node2.parentId;
    const order1 = node1.order;
    const order2 = node2.order;
    
    await nodeService.update(nodeId1, { parentId: parent2, order: order2 });
    await nodeService.update(nodeId2, { parentId: parent1, order: order1 });
    
    // Swap children ownership
    for (const child of children1) {
      await nodeService.update(child.id, { parentId: nodeId2 });
    }
    for (const child of children2) {
      await nodeService.update(child.id, { parentId: nodeId1 });
    }
    
    // Update local state
    let nodes = get().nodes.map(n => {
      if (n.id === nodeId1) return { ...n, parentId: parent2, order: order2 };
      if (n.id === nodeId2) return { ...n, parentId: parent1, order: order1 };
      if (children1.some(c => c.id === n.id)) return { ...n, parentId: nodeId2 };
      if (children2.some(c => c.id === n.id)) return { ...n, parentId: nodeId1 };
      return n;
    });

    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, get().collapsedNodeIds, get().nodeSize);
    set({ nodes, flowNodes, flowEdges });
  },

  // Move a node to a new parent (vertical movement)
  moveNodeToParent: async (nodeId, newParentId) => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // Prevent moving a node under itself or its descendants
    if (newParentId) {
      let current = get().nodes.find(n => n.id === newParentId);
      while (current) {
        if (current.id === nodeId) return; // Would create circular reference
        current = current.parentId ? get().nodes.find(n => n.id === current?.parentId) : undefined;
      }
    }
    
    const oldParentId = node.parentId;
    
    // Calculate new order based on context
    let newOrder: number;
    const newSiblings = get().nodes.filter(n => n.parentId === newParentId && n.id !== nodeId);
    
    if (oldParentId && newParentId === get().nodes.find(n => n.id === oldParentId)?.parentId) {
      // Moving UP: Place directly after the old parent
      const oldParent = get().nodes.find(n => n.id === oldParentId);
      if (oldParent) {
        const oldParentOrder = oldParent.order;
        // Shift all siblings with order > oldParentOrder to make room
        for (const sibling of newSiblings) {
          if (sibling.order > oldParentOrder) {
            await nodeService.update(sibling.id, { order: sibling.order + 1 });
          }
        }
        newOrder = oldParentOrder + 1;
      } else {
        newOrder = newSiblings.length > 0 ? Math.max(...newSiblings.map(n => n.order)) + 1 : 0;
      }
    } else {
      // Moving DOWN or other: Add to end
      newOrder = newSiblings.length > 0 ? Math.max(...newSiblings.map(n => n.order)) + 1 : 0;
    }
    
    await nodeService.update(nodeId, { parentId: newParentId, order: newOrder });
    
    // Reload to get correct order values after shifts
    const projectId = node.projectId;
    const nodes = await nodeService.getByProjectId(projectId);

    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, get().collapsedNodeIds, get().nodeSize);
    set({ nodes, flowNodes, flowEdges });
  },

  selectNode: (nodeId) => {
    set({ selectedNodeIds: nodeId ? [nodeId] : [] });
  },

  toggleNodeSelection: (nodeId) => {
    const current = get().selectedNodeIds;
    if (current.includes(nodeId)) {
      set({ selectedNodeIds: current.filter(id => id !== nodeId) });
    } else {
      set({ selectedNodeIds: [...current, nodeId] });
    }
  },

  selectNodeWithDescendants: (nodeId) => {
    const descendants = get().getDescendants(nodeId);
    const current = get().selectedNodeIds;
    const newSelection = new Set([...current, nodeId, ...descendants]);
    set({ selectedNodeIds: Array.from(newSelection) });
  },

  clearSelection: () => {
    set({ selectedNodeIds: [] });
  },

  updateLayout: () => {
    const { nodes, collapsedNodeIds, nodeSize } = get();
    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, collapsedNodeIds, nodeSize);
    set({ flowNodes, flowEdges });
  },

  toggleCollapse: (nodeId) => {
    const collapsedNodeIds = new Set(get().collapsedNodeIds);
    if (collapsedNodeIds.has(nodeId)) {
      collapsedNodeIds.delete(nodeId);
    } else {
      collapsedNodeIds.add(nodeId);
    }

    // Also update the node in the database
    nodeService.update(nodeId, { isCollapsed: collapsedNodeIds.has(nodeId) });

    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(get().nodes, collapsedNodeIds, get().nodeSize);
    set({ collapsedNodeIds, flowNodes, flowEdges });
  },

  collapseAllAtDepth: (depth) => {
    const nodes = get().nodes;
    const collapsedNodeIds = new Set(get().collapsedNodeIds);

    for (const node of nodes) {
      const nodeDepth = calculateNodeDepth(nodes, node.id);
      // Only collapse nodes that have children
      const hasChildren = nodes.some(n => n.parentId === node.id);
      if (nodeDepth === depth && hasChildren) {
        collapsedNodeIds.add(node.id);
        nodeService.update(node.id, { isCollapsed: true });
      }
    }

    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, collapsedNodeIds, get().nodeSize);
    set({ collapsedNodeIds, flowNodes, flowEdges });
  },

  expandAllAtDepth: (depth) => {
    const nodes = get().nodes;
    const collapsedNodeIds = new Set(get().collapsedNodeIds);

    for (const node of nodes) {
      const nodeDepth = calculateNodeDepth(nodes, node.id);
      if (nodeDepth === depth && collapsedNodeIds.has(node.id)) {
        collapsedNodeIds.delete(node.id);
        nodeService.update(node.id, { isCollapsed: false });
      }
    }

    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, collapsedNodeIds, get().nodeSize);
    set({ collapsedNodeIds, flowNodes, flowEdges });
  },

  collapseAll: () => {
    const nodes = get().nodes;
    const collapsedNodeIds = new Set<string>();

    for (const node of nodes) {
      const hasChildren = nodes.some(n => n.parentId === node.id);
      if (hasChildren) {
        collapsedNodeIds.add(node.id);
        nodeService.update(node.id, { isCollapsed: true });
      }
    }

    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, collapsedNodeIds, get().nodeSize);
    set({ collapsedNodeIds, flowNodes, flowEdges });
  },

  expandAll: () => {
    const nodes = get().nodes;
    const collapsedNodeIds = new Set<string>();

    // Update all nodes to not collapsed
    for (const node of nodes) {
      if (get().collapsedNodeIds.has(node.id)) {
        nodeService.update(node.id, { isCollapsed: false });
      }
    }

    const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, collapsedNodeIds, get().nodeSize);
    set({ collapsedNodeIds, flowNodes, flowEdges });
  },

  getNode: (id) => get().nodes.find((n) => n.id === id),

  getNodeProgress: (id) => calculateNodeProgress(get().nodes, id),

  getProjectProgress: () => calculateProjectProgress(get().nodes),

  getSiblings: (nodeId) => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (!node) return [];
    return get().nodes
      .filter(n => n.parentId === node.parentId && n.id !== nodeId)
      .sort((a, b) => a.order - b.order);
  },

  isCollapsed: (nodeId) => get().collapsedNodeIds.has(nodeId),

  getMaxDepth: () => {
    const nodes = get().nodes;
    if (nodes.length === 0) return 0;
    let maxDepth = 0;
    for (const node of nodes) {
      const depth = calculateNodeDepth(nodes, node.id);
      if (depth > maxDepth) maxDepth = depth;
    }
    return maxDepth;
  },

  getNodeDepth: (nodeId) => {
    return calculateNodeDepth(get().nodes, nodeId);
  },

  getLeftNeighbor: (nodeId) => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (!node) return null;
    const siblings = get().nodes
      .filter(n => n.parentId === node.parentId)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex(s => s.id === nodeId);
    return idx > 0 ? siblings[idx - 1] : null;
  },

  getRightNeighbor: (nodeId) => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (!node) return null;
    const siblings = get().nodes
      .filter(n => n.parentId === node.parentId)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex(s => s.id === nodeId);
    return idx < siblings.length - 1 ? siblings[idx + 1] : null;
  },

  getFirstChild: (nodeId) => {
    return get().nodes
      .filter(n => n.parentId === nodeId)
      .sort((a, b) => a.order - b.order)[0];
  },

  getDescendants: (nodeId) => {
    const descendants: string[] = [];
    const collectDescendants = (parentId: string) => {
      const children = get().nodes.filter(n => n.parentId === parentId);
      for (const child of children) {
        descendants.push(child.id);
        collectDescendants(child.id);
      }
    };
    collectDescendants(nodeId);
    return descendants;
  },

  repairProject: async (projectId) => {
    const result = await nodeService.repairProject(projectId);
    if (result.fixed > 0) {
      // Reload nodes after repair
      const nodes = await nodeService.getByProjectId(projectId);
      const collapsedNodeIds = new Set(nodes.filter(n => n.isCollapsed).map(n => n.id));
      const { nodes: flowNodes, edges: flowEdges } = calculateLayout(nodes, collapsedNodeIds, get().nodeSize);
      set({ nodes, flowNodes, flowEdges, collapsedNodeIds });
    }
    return result;
  },
}));

// Helper function
function isDescendantOf(nodes: TreeNode[], nodeId: string, ancestorId: string): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || !node.parentId) return false;
  if (node.parentId === ancestorId) return true;
  return isDescendantOf(nodes, node.parentId, ancestorId);
}
