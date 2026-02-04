import { memo } from 'react';
import { BaseEdge, type EdgeProps } from '@xyflow/react';

/**
 * Custom edge that draws orthogonal (horizontal/vertical only) lines
 * with rounded corners, like an org chart.
 * 
 * Pattern:
 * - From source: go down vertically to midpoint
 * - At midpoint: go horizontally to target X
 * - From midpoint: go down vertically to target
 */
function TreeEdgeInner({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
}: EdgeProps) {
  // Calculate the vertical point where horizontal line will be
  // Position it further down (45%) so the vertical line from parent is longer
  const midY = sourceY + (targetY - sourceY) * 0.5;
  
  // Corner radius for rounded corners
  const radius = 8;
  
  // Determine direction
  const goingRight = targetX > sourceX;
  const goingLeft = targetX < sourceX;
  const horizontalDistance = Math.abs(targetX - sourceX);
  
  let path: string;
  
  if (horizontalDistance < 1) {
    // Straight vertical line - no horizontal segment needed
    path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  } else {
    // Calculate effective radius (can't be larger than half the distances)
    const verticalDistance1 = midY - sourceY;
    const verticalDistance2 = targetY - midY;
    const effectiveRadius = Math.min(
      radius,
      horizontalDistance / 2,
      verticalDistance1,
      verticalDistance2
    );
    
    if (effectiveRadius < 2) {
      // Too small for curves, use straight lines
      path = `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
    } else if (goingRight) {
      // Going right: source -> down -> right -> down -> target
      path = `
        M ${sourceX} ${sourceY}
        L ${sourceX} ${midY - effectiveRadius}
        Q ${sourceX} ${midY} ${sourceX + effectiveRadius} ${midY}
        L ${targetX - effectiveRadius} ${midY}
        Q ${targetX} ${midY} ${targetX} ${midY + effectiveRadius}
        L ${targetX} ${targetY}
      `;
    } else {
      // Going left: source -> down -> left -> down -> target
      path = `
        M ${sourceX} ${sourceY}
        L ${sourceX} ${midY - effectiveRadius}
        Q ${sourceX} ${midY} ${sourceX - effectiveRadius} ${midY}
        L ${targetX + effectiveRadius} ${midY}
        Q ${targetX} ${midY} ${targetX} ${midY + effectiveRadius}
        L ${targetX} ${targetY}
      `;
    }
  }

  return (
    <BaseEdge
      path={path}
      style={style}
    />
  );
}

export const TreeEdge = memo(TreeEdgeInner);
