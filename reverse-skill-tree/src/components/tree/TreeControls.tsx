import { Button, Input, Badge } from '../ui';
import { useTreeStore, useProjectStore, useFilterStore } from '../../stores';
import { NODE_STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../constants';

export function TreeControls() {
  const { createNode, getProjectProgress } = useTreeStore();
  const { currentProjectId } = useProjectStore();
  const {
    statusFilter,
    priorityFilter,
    searchQuery,
    toggleStatusFilter,
    togglePriorityFilter,
    setSearchQuery,
    resetFilters,
  } = useFilterStore();

  const progress = getProjectProgress();
  const hasFilters = statusFilter.length > 0 || priorityFilter.length > 0 || searchQuery;

  const handleAddRootNode = async () => {
    if (!currentProjectId) return;
    await createNode({
      projectId: currentProjectId,
      parentId: null,
      title: 'New Goal',
    });
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-card border-b border-border">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={handleAddRootNode} size="sm">
            + Add Goal
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {progress.completed}/{progress.total} completed
          </span>
          <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                progress.percentage === 100 ? 'bg-green-500' : 'bg-primary'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <span className="text-sm font-medium">{progress.percentage}%</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs h-8"
        />

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Status:</span>
          {NODE_STATUS_OPTIONS.map((option) => (
            <Badge
              key={option.value}
              variant={statusFilter.includes(option.value) ? 'default' : 'outline'}
              className="cursor-pointer text-[10px]"
              onClick={() => toggleStatusFilter(option.value)}
            >
              {option.label}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">Priority:</span>
          {PRIORITY_OPTIONS.map((option) => (
            <Badge
              key={option.value}
              variant={priorityFilter.includes(option.value) ? 'default' : 'outline'}
              className="cursor-pointer text-[10px]"
              onClick={() => togglePriorityFilter(option.value)}
            >
              {option.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
