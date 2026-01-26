import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '../ui';
import { useTreeStore, useProjectStore } from '../../stores';
import type { NodeStatus } from '../../types';
import { NODE_STATUS_CONFIG } from '../../constants';

interface TreeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
}

export function TreeContextMenu({ x, y, nodeId, onClose }: TreeContextMenuProps) {
  const { getNode, createNode, updateNode, deleteNode } = useTreeStore();
  const { currentProjectId } = useProjectStore();
  const node = getNode(nodeId);

  if (!node || !currentProjectId) return null;

  const handleAddChild = async () => {
    await createNode({
      projectId: currentProjectId,
      parentId: nodeId,
      title: 'New Task',
    });
    onClose();
  };

  const handleSetStatus = async (status: NodeStatus) => {
    await updateNode(nodeId, { status });
    onClose();
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this node and all its children?')) {
      await deleteNode(nodeId);
    }
    onClose();
  };

  return (
    <ContextMenu x={x} y={y} onClose={onClose}>
      <ContextMenuItem onClick={handleAddChild}>
        Add Child Task
      </ContextMenuItem>

      <ContextMenuSeparator />

      {Object.entries(NODE_STATUS_CONFIG).map(([status, config]) => (
        <ContextMenuItem
          key={status}
          onClick={() => handleSetStatus(status as NodeStatus)}
          disabled={node.status === status}
        >
          Mark as {config.label}
        </ContextMenuItem>
      ))}

      <ContextMenuSeparator />

      <ContextMenuItem onClick={handleDelete} destructive>
        Delete Task
      </ContextMenuItem>
    </ContextMenu>
  );
}
