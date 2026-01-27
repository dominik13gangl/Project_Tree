import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TreeNode } from '../../types';
import { NODE_STATUS_CONFIG } from '../../constants/nodeStatus';
import { PRIORITY_CONFIG } from '../../constants/priorities';
import { Badge, ProgressBar } from '../ui';
import { useTreeStore, useUIStore, useProjectStore } from '../../stores';

// Border colors for different depth levels (group colors)
const depthBorderColors = [
  'border-blue-500',    // Depth 0 - Main Goals
  'border-purple-500',  // Depth 1 - Sub-Goals
  'border-teal-500',    // Depth 2 - Sub-Sub-Goals
  'border-slate-500',   // Depth 3+ - Deep Goals
];

const depthAddButtonColors = [
  'bg-blue-500 hover:bg-blue-400',
  'bg-purple-500 hover:bg-purple-400',
  'bg-teal-500 hover:bg-teal-400',
  'bg-slate-500 hover:bg-slate-400',
];

function TreeNodeInner({ data, selected }: NodeProps) {
  const node = data as unknown as TreeNode & { depth: number; hasChildren: boolean; isCollapsed: boolean };
  const { selectNode, getNodeProgress, createNode, toggleCollapse, getSiblings, swapNodeOrder } = useTreeStore();
  const { currentProjectId } = useProjectStore();
  const { openNodeEditor } = useUIStore();

  const depth = node.depth ?? 0;
  const borderColor = depthBorderColors[Math.min(depth, depthBorderColors.length - 1)];
  const addButtonColor = depthAddButtonColors[Math.min(depth, depthAddButtonColors.length - 1)];

  const statusConfig = NODE_STATUS_CONFIG[node.status];
  const priorityConfig = PRIORITY_CONFIG[node.priority];
  const progress = getNodeProgress(node.id);
  const siblings = getSiblings(node.id);

  // Find left and right neighbors
  const allSiblings = [...siblings, node].sort((a, b) => a.order - b.order);
  const currentIndex = allSiblings.findIndex(s => s.id === node.id);
  const leftNeighbor = currentIndex > 0 ? allSiblings[currentIndex - 1] : null;
  const rightNeighbor = currentIndex < allSiblings.length - 1 ? allSiblings[currentIndex + 1] : null;

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

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCollapse(node.id);
  };

  const handleMoveLeft = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (leftNeighbor) {
      await swapNodeOrder(node.id, leftNeighbor.id);
    }
  };

  const handleMoveRight = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (rightNeighbor) {
      await swapNodeOrder(node.id, rightNeighbor.id);
    }
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

      {/* Move Left Button */}
      {leftNeighbor && (
        <button
          onClick={handleMoveLeft}
          className="absolute -left-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-500/60 hover:bg-slate-600 text-white flex items-center justify-center transition-colors z-20"
          title="Nach links verschieben"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Move Right Button */}
      {rightNeighbor && (
        <button
          onClick={handleMoveRight}
          className="absolute -right-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-500/60 hover:bg-slate-600 text-white flex items-center justify-center transition-colors z-20"
          title="Nach rechts verschieben"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Main node container */}
      <div
        className={`rounded-xl shadow-lg min-w-[240px] max-w-[280px] cursor-pointer transition-all hover:shadow-xl border-[3px] ${borderColor} ${statusConfig.nodeBg} ${
          selected ? 'ring-4 ring-yellow-400 ring-offset-2' : ''
        }`}
        onClick={handleClick}
      >
        {/* Header with depth indicator */}
        <div className={`px-3 py-1.5 border-b border-gray-200 flex items-center justify-between ${statusConfig.nodeText}`}>
          <span className="text-[10px] uppercase tracking-wider opacity-75">
            {getDepthLabel()}
          </span>
          <div className="flex items-center gap-1">
            {node.priority !== 'low' && (
              <Badge
                variant="outline"
                className={`text-[9px] border ${statusConfig.color} border-current`}
              >
                {priorityConfig.label}
              </Badge>
            )}
            {/* Collapse/Expand Button */}
            {node.hasChildren && (
              <button
                onClick={handleToggleCollapse}
                className="ml-1 w-5 h-5 rounded flex items-center justify-center bg-gray-200 hover:bg-gray-300 transition-colors"
                title={node.isCollapsed ? 'Ausklappen' : 'Einklappen'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform text-gray-600 ${node.isCollapsed ? '' : 'rotate-90'}`}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={`p-3 ${statusConfig.nodeText}`}>
          <h3 className="text-sm mb-1 line-clamp-2 font-semibold">
            {node.title}
          </h3>

          {node.description && (
            <p className="text-xs line-clamp-2 mb-2 opacity-75">
              {node.description}
            </p>
          )}

          {/* Status and Progress */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <Badge className={`${statusConfig.bgColor} ${statusConfig.color} text-[10px] border border-current`}>
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
        className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10 ${addButtonColor} text-white`}
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
