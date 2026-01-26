import { ProgressBar } from '../ui';
import type { NodeProgress as NodeProgressType } from '../../types';

interface NodeProgressProps {
  progress: NodeProgressType;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function NodeProgress({ progress, showLabel = true, size = 'md' }: NodeProgressProps) {
  return (
    <div className="flex items-center gap-2">
      <ProgressBar value={progress.percentage} size={size} />
      {showLabel && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {progress.completed}/{progress.total}
        </span>
      )}
    </div>
  );
}
