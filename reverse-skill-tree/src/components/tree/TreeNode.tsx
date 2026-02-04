import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TreeNode } from '../../types';
import { NODE_STATUS_CONFIG } from '../../constants/nodeStatus';
import { PRIORITY_CONFIG } from '../../constants/priorities';
import { Badge, ProgressBar } from '../ui';
import { useTreeStore, useUIStore, useProjectStore, useCurrentProject } from '../../stores';

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
  const node = data as unknown as TreeNode & { depth: number; hasChildren: boolean; isCollapsed: boolean; scale: number };
  const { selectNode, toggleNodeSelection, selectNodeWithDescendants, getNodeProgress, createNode, toggleCollapse } = useTreeStore();
  const { currentProjectId } = useProjectStore();
  const currentProject = useCurrentProject();
  const { openNodeEditor } = useUIStore();

  // Get category types that should be shown in node view
  const categoryTypes = currentProject?.settings.categoryTypes ?? [];
  const visibleCategoryTypes = categoryTypes.filter(ct => ct.showInNodeView);

  // Get node size settings
  const nodeSize = currentProject?.settings.nodeSize ?? {
    baseWidth: 280,
    baseHeight: 120,
    depthScalePercent: 85,
    minScalePercent: 50,
  };

  const depth = node.depth ?? 0;
  const borderColor = depthBorderColors[Math.min(depth, depthBorderColors.length - 1)];
  const addButtonColor = depthAddButtonColors[Math.min(depth, depthAddButtonColors.length - 1)];

  // Use scale from layout data
  const scale = node.scale ?? 1;

  const statusConfig = NODE_STATUS_CONFIG[node.status];
  const priorityConfig = PRIORITY_CONFIG[node.priority];
  const progress = getNodeProgress(node.id);

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Click: Toggle selection
      toggleNodeSelection(node.id);
      openNodeEditor();
    } else if (e.shiftKey) {
      // Shift+Click: Select node and all descendants
      selectNodeWithDescendants(node.id);
      openNodeEditor();
    } else {
      // Normal click: Single selection
      selectNode(node.id);
      openNodeEditor();
    }
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

  // Determine label based on depth
  const getDepthLabel = () => {
    if (depth === 0) return 'Hauptziel';
    if (depth === 1) return 'Unterziel';
    if (depth === 2) return 'Teilziel';
    return `Ebene ${depth + 1}`;
  };

  // Calculate actual scaled dimensions
  const scaledWidth = nodeSize.baseWidth * scale;
  const scaledHeight = nodeSize.baseHeight * scale;

  // Scale factor for add button
  const buttonScale = Math.max(0.6, scale);

  return (
    <div
      className="relative"
      style={{
        width: scaledWidth,
        height: scaledHeight,
      }}
    >
      {/* Hidden target handle for edge connections - positioned at center of scaled container */}
      {depth > 0 && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-transparent !border-0 !min-w-0 !min-h-0"
          style={{ width: 1, height: 1, opacity: 0, left: '50%', transform: 'translateX(-50%)' }}
        />
      )}

      {/* Main node container - scaled content inside */}
      <div
        className={`absolute top-0 left-0 rounded-xl shadow-lg cursor-pointer transition-all hover:shadow-xl border-[3px] overflow-hidden ${borderColor} ${statusConfig.nodeBg} ${
          selected ? 'ring-4 ring-yellow-400 ring-offset-2' : ''
        }`}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: nodeSize.baseWidth,
          height: nodeSize.baseHeight,
        }}
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
            <div className="flex items-center gap-1 flex-wrap">
              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} text-[10px] border border-current`}>
                {statusConfig.label}
              </Badge>

              {/* Category badges */}
              {visibleCategoryTypes.map(categoryType => {
                const categoryId = node.categories?.[categoryType.id];
                if (!categoryId) return null;
                const category = categoryType.categories.find(c => c.id === categoryId);
                if (!category) return null;
                return (
                  <Badge
                    key={categoryType.id}
                    variant="outline"
                    className="text-[9px] bg-slate-100 text-slate-700 border-slate-300"
                    title={categoryType.name}
                  >
                    {category.name}
                  </Badge>
                );
              })}
            </div>

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

      {/* Source handle at bottom - positioned at center of scaled container */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-transparent !border-0 !min-w-0 !min-h-0"
        style={{ width: 1, height: 1, opacity: 0, left: '50%', transform: 'translateX(-50%)' }}
      />

      {/* Add Child Button - scaled */}
      <button
        onClick={handleAddChild}
        className={`absolute left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10 ${addButtonColor} text-white`}
        style={{
          bottom: -Math.round(16 * buttonScale),
          width: Math.round(32 * buttonScale),
          height: Math.round(32 * buttonScale),
        }}
        title="Unterziel hinzufügen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={Math.round(18 * buttonScale)}
          height={Math.round(18 * buttonScale)}
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
