import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTreeStore, useUIStore, useFilterStore } from '../../stores';
import { TreeNodeComponent } from './TreeNode';
import { TreeContextMenu } from './TreeContextMenu';
import type { TreeNode, NodeStatus } from '../../types';

const nodeTypes: NodeTypes = {
  treeNode: TreeNodeComponent,
};

export function TreeCanvas() {
  const { 
    flowNodes, 
    flowEdges, 
    nodes, 
    selectedNodeId, 
    deleteNode, 
    updateNode,
    swapNodeOrder,
    swapNodesFully,
    moveNodeToParent,
    getLeftNeighbor,
    getRightNeighbor,
    getNode,
    getNodeDepth,
    getFirstChild,
  } = useTreeStore();
  const { contextMenu, closeContextMenu, isNodeEditorOpen } = useUIStore();
  const { statusFilter, priorityFilter, searchQuery } = useFilterStore();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // DELETE - delete selected node
      if (e.key === 'Delete' && selectedNodeId) {
        if (confirm('Möchten Sie dieses Ziel und alle Unterziele löschen?')) {
          await deleteNode(selectedNodeId);
        }
      }

      // E - toggle completed status
      if ((e.key === 'e' || e.key === 'E') && selectedNodeId) {
        e.preventDefault();
        const node = nodes.find(n => n.id === selectedNodeId);
        if (node) {
          const newStatus: NodeStatus = node.status === 'completed' ? 'open' : 'completed';
          await updateNode(selectedNodeId, {
            status: newStatus,
            completedAt: newStatus === 'completed' ? new Date() : undefined,
          });
        }
      }

      // Arrow keys for moving nodes
      if (selectedNodeId && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const node = getNode(selectedNodeId);
        if (!node) return;

        const isCtrl = e.ctrlKey || e.metaKey;

        // HORIZONTAL MOVEMENT (Left/Right)
        if (e.key === 'ArrowLeft') {
          const leftNeighbor = getLeftNeighbor(selectedNodeId);
          if (leftNeighbor) {
            if (isCtrl) {
              // Ctrl+Left: Swap fully (exchange positions and children)
              await swapNodesFully(selectedNodeId, leftNeighbor.id);
            } else {
              // Left: Just swap order (horizontal position)
              await swapNodeOrder(selectedNodeId, leftNeighbor.id);
            }
          }
        }

        if (e.key === 'ArrowRight') {
          const rightNeighbor = getRightNeighbor(selectedNodeId);
          if (rightNeighbor) {
            if (isCtrl) {
              // Ctrl+Right: Swap fully (exchange positions and children)
              await swapNodesFully(selectedNodeId, rightNeighbor.id);
            } else {
              // Right: Just swap order (horizontal position)
              await swapNodeOrder(selectedNodeId, rightNeighbor.id);
            }
          }
        }

        // VERTICAL MOVEMENT (Up/Down)
        if (e.key === 'ArrowUp') {
          // Move to parent's level (one level up)
          if (node.parentId) {
            const parent = getNode(node.parentId);
            if (parent) {
              if (isCtrl) {
                // Ctrl+Up: Swap with parent (exchange positions and children)
                await swapNodesFully(selectedNodeId, parent.id);
              } else {
                // Up: Move to grandparent level (become sibling of parent)
                await moveNodeToParent(selectedNodeId, parent.parentId);
              }
            }
          }
        }

        if (e.key === 'ArrowDown') {
          // Move under left neighbor (one level down)
          const leftNeighbor = getLeftNeighbor(selectedNodeId);
          if (isCtrl) {
            // Ctrl+Down: Swap with first child (if any)
            const firstChild = getFirstChild(selectedNodeId);
            if (firstChild) {
              await swapNodesFully(selectedNodeId, firstChild.id);
            }
          } else if (leftNeighbor) {
            // Down: Move under left neighbor
            await moveNodeToParent(selectedNodeId, leftNeighbor.id);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, deleteNode, updateNode, nodes, swapNodeOrder, swapNodesFully, moveNodeToParent, getLeftNeighbor, getRightNeighbor, getNode, getFirstChild]);

  // Filter nodes based on filters
  const filteredData = useMemo(() => {
    let filteredNodes = nodes;

    // Status filter
    if (statusFilter.length > 0) {
      const nodeIdsToShow = new Set<string>();

      filteredNodes.forEach((node) => {
        if (statusFilter.includes(node.status)) {
          nodeIdsToShow.add(node.id);
          // Include ancestors
          let current = node;
          while (current.parentId) {
            nodeIdsToShow.add(current.parentId);
            const parent = nodes.find((n) => n.id === current.parentId);
            if (!parent) break;
            current = parent;
          }
        }
      });

      filteredNodes = filteredNodes.filter((n) => nodeIdsToShow.has(n.id));
    }

    // Priority filter
    if (priorityFilter.length > 0) {
      const nodeIdsToShow = new Set<string>();

      filteredNodes.forEach((node) => {
        if (priorityFilter.includes(node.priority)) {
          nodeIdsToShow.add(node.id);
          // Include ancestors
          let current = node;
          while (current.parentId) {
            nodeIdsToShow.add(current.parentId);
            const parent = nodes.find((n) => n.id === current.parentId);
            if (!parent) break;
            current = parent;
          }
        }
      });

      filteredNodes = filteredNodes.filter((n) => nodeIdsToShow.has(n.id));
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nodeIdsToShow = new Set<string>();

      filteredNodes.forEach((node) => {
        if (
          node.title.toLowerCase().includes(query) ||
          node.description?.toLowerCase().includes(query) ||
          node.notes?.toLowerCase().includes(query)
        ) {
          nodeIdsToShow.add(node.id);
          // Include ancestors
          let current = node;
          while (current.parentId) {
            nodeIdsToShow.add(current.parentId);
            const parent = nodes.find((n) => n.id === current.parentId);
            if (!parent) break;
            current = parent;
          }
        }
      });

      filteredNodes = filteredNodes.filter((n) => nodeIdsToShow.has(n.id));
    }

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

    return {
      nodes: flowNodes.filter((n) => filteredNodeIds.has(n.id)),
      edges: flowEdges.filter(
        (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
      ),
    };
  }, [nodes, flowNodes, flowEdges, statusFilter, priorityFilter, searchQuery]);

  const [displayNodes, setNodes, onNodesChange] = useNodesState(filteredData.nodes as never[]);
  const [displayEdges, setEdges, onEdgesChange] = useEdgesState(filteredData.edges);

  // Update display nodes when filtered data changes, preserving selection
  useEffect(() => {
    // Add selected property to nodes based on selectedNodeId
    const nodesWithSelection = filteredData.nodes.map(n => ({
      ...n,
      selected: n.id === selectedNodeId,
    }));
    setNodes(nodesWithSelection as never[]);
    setEdges(filteredData.edges);
  }, [filteredData, setNodes, setEdges, selectedNodeId]);

  const handlePaneClick = useCallback(() => {
    closeContextMenu();
  }, [closeContextMenu]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onPaneClick={handlePaneClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: 'hsl(var(--muted-foreground))', strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as unknown as TreeNode;
            switch (data.status) {
              case 'completed':
                return '#22c55e';
              case 'in_progress':
                return '#f59e0b';
              case 'blocked':
                return '#ef4444';
              default:
                return '#9ca3af';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>

      {contextMenu.isOpen && contextMenu.nodeId && (
        <TreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
