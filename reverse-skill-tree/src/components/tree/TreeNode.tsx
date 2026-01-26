import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TreeNode } from '../../types';
import { NODE_STATUS_CONFIG } from '../../constants/nodeStatus';
import { PRIORITY_CONFIG } from '../../constants/priorities';
import { Badge, ProgressBar } from '../ui';
import { useTreeStore, useUIStore, useProjectStore } from '../../stores';

// Different styles for different depth levels
const depthStyles = [
  // Depth 0 - Main Goals (Root)
  {
    container: 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-800',
    title: 'text-white font-bold',
    description: 'text-blue-100',
    badge: 'bg-blue-500/50 text-white border-blue-400',
    addButton: 'bg-blue-500 hover:bg-blue-400 text-white',
  },
  // Depth 1 - Sub-Goals
  {
    container: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white border-purple-700',
    title: 'text-white font-semibold',
    description: 'text-purple-100',
    badge: 'bg-purple-400/50 text-white border-purple-300',
    addButton: 'bg-purple-400 hover:bg-purple-300 text-white',
  },
  // Depth 2 - Sub-Sub-Goals
  {
    container: 'bg-gradient-to-br from-teal-500 to-teal-600 text-white border-teal-700',
    title: 'text-white font-medium',
    description: 'text-teal-100',
    badge: 'bg-teal-400/50 text-white border-teal-300',
    addButton: 'bg-teal-400 hover:bg-teal-300 text-white',
  },
  // Depth 3+ - Deep Goals
  {
    container: 'bg-gradient-to-br from-slate-500 to-slate-600 text-white border-slate-700',
    title: 'text-white',
    description: 'text-slate-200',
    badge: 'bg-slate-400/50 text-white border-slate-300',
    addButton: 'bg-slate-400 hover:bg-slate-300 text-white',
  },
];

// Completed style override
const completedStyle = {
  container: 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-700',
  title: 'text-white',
  description: 'text-green-100',
  badge: 'bg-green-400/50 text-white border-green-300',
  addButton: 'bg-green-400 hover:bg-green-300 text-white',
};

function TreeNodeInner({ data, selected }: NodeProps) {
  const node = data as unknown as TreeNode & { depth: number };
  const { selectNode, getNodeProgress, createNode } = useTreeStore();
  const { currentProjectId } = useProjectStore();
  const { openNodeEditor } = useUIStore();

  const depth = node.depth ?? 0;
  const isCompleted = node.status === 'completed';
  const style = isCompleted ? completedStyle : depthStyles[Math.min(depth, depthStyles.length - 1)];

  const statusConfig = NODE_STATUS_CONFIG[node.status];
  const priorityConfig = PRIORITY_CONFIG[node.priority];
  const progress = getNodeProgress(node.id);

  const handleClick = () => {
    selectNode(node.id);
    openNodeEditor();
  };

  const handleAddChild = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProjectId) return;

    await createNode({
      projectId: currentProjectId,
      parentId: node.id,
      title: 'Neues Unterziel',
    });
  };

  // Determine label based on depth
  const getDepthLabel = () => {
    if (depth === 0) return 'Hauptziel';
    if (depth === 1) return 'Unterziel';
    if (depth === 2) return 'Teilziel';
    return `Ebene ${depth + 1}`;
  };

  return (
    <div className="relative">
      {/* Target handle at top */}
      {depth > 0 && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-slate-400 !w-3 !h-3 !border-2 !border-white"
        />
      )}

      {/* Main node container */}
      <div
        className={`rounded-xl shadow-lg min-w-[240px] max-w-[280px] cursor-pointer transition-shadow hover:shadow-xl border-2 ${style.container} ${
          selected ? 'ring-4 ring-yellow-400 ring-offset-2' : ''
        }`}
        onClick={handleClick}
      >
        {/* Header with depth indicator */}
        <div className="px-3 py-1.5 border-b border-white/20 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider opacity-75">
            {getDepthLabel()}
          </span>
          {node.priority !== 'low' && (
            <Badge
              variant="outline"
              className={`${style.badge} text-[9px] border`}
            >
              {priorityConfig.label}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className={`text-sm mb-1 line-clamp-2 ${style.title}`}>
            {node.title}
          </h3>

          {node.description && (
            <p className={`text-xs line-clamp-2 mb-2 ${style.description}`}>
              {node.description}
            </p>
          )}

          {/* Status and Progress */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <Badge className={`${style.badge} text-[10px] border`}>
              {statusConfig.label}
            </Badge>

            {progress.total > 1 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] opacity-75">
                  {progress.completed}/{progress.total}
                </span>
                <ProgressBar
                  value={progress.percentage}
                  size="sm"
                  className="w-10"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Source handle and Add button at bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !w-0 !h-0 !border-0"
      />

      {/* Add Child Button */}
      <button
        onClick={handleAddChild}
        className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10 ${style.addButton}`}
        title="Unterziel hinzufügen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}

export const TreeNodeComponent = memo(TreeNodeInner);
