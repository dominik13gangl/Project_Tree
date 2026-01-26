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
import type { TreeNode } from '../../types';

const nodeTypes: NodeTypes = {
  treeNode: TreeNodeComponent,
};

export function TreeCanvas() {
  const { flowNodes, flowEdges, nodes, selectedNodeId, deleteNode } = useTreeStore();
  const { contextMenu, closeContextMenu } = useUIStore();
  const { statusFilter, priorityFilter, searchQuery } = useFilterStore();

  // Handle DEL key to delete selected node
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNodeId) {
        // Don't delete if user is typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        if (confirm('Möchten Sie dieses Ziel und alle Unterziele löschen?')) {
          await deleteNode(selectedNodeId);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, deleteNode]);

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

  // Update display nodes when filtered data changes
  useEffect(() => {
    setNodes(filteredData.nodes as never[]);
    setEdges(filteredData.edges);
  }, [filteredData, setNodes, setEdges]);

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
