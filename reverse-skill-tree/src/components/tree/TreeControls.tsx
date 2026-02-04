import { useState } from 'react';
import { Button, Input, Badge } from '../ui';
import { useTreeStore, useProjectStore, useFilterStore, useCurrentProject } from '../../stores';
import { NODE_STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../constants';

export function TreeControls() {
  const { createNode, getProjectProgress, getMaxDepth, collapseAllAtDepth, expandAllAtDepth, collapseAll, expandAll } = useTreeStore();
  const { currentProjectId } = useProjectStore();
  const currentProject = useCurrentProject();
  const {
    statusFilter,
    priorityFilter,
    searchQuery,
    categoryFilter,
    toggleStatusFilter,
    togglePriorityFilter,
    setSearchQuery,
    toggleCategoryFilter,
    resetFilters,
  } = useFilterStore();
  
  const [showLevelControls, setShowLevelControls] = useState(false);

  const progress = getProjectProgress();
  const categoryTypes = currentProject?.settings.categoryTypes ?? [];
  const hasCategoryFilters = Object.values(categoryFilter).some((ids) => ids.length > 0);
  const hasFilters = statusFilter.length > 0 || priorityFilter.length > 0 || searchQuery || hasCategoryFilters;
  const maxDepth = getMaxDepth();

  const handleAddRootNode = async () => {
    if (!currentProjectId) return;
    await createNode(
      {
        projectId: currentProjectId,
        parentId: null,
        title: 'Neues Ziel',
      },
      currentProject?.settings.categoryTypes
    );
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-card border-b border-border">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={handleAddRootNode} size="sm">
            + Ziel hinzufügen
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Filter zurücksetzen
            </Button>
          )}
          
          {/* Level collapse controls toggle */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowLevelControls(!showLevelControls)}
            className="ml-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Ebenen
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {progress.completed}/{progress.total} erledigt
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

      {/* Level collapse controls */}
      {showLevelControls && (
        <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <span className="text-xs text-muted-foreground mr-2">Ebenen:</span>
          
          <Button variant="outline" size="sm" onClick={expandAll} className="text-xs h-7">
            Alle ausklappen
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs h-7">
            Alle einklappen
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          {Array.from({ length: maxDepth + 1 }, (_, depth) => (
            <div key={depth} className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">E{depth}:</span>
              <button
                onClick={() => expandAllAtDepth(depth)}
                className="w-6 h-6 rounded bg-green-100 hover:bg-green-200 text-green-700 text-xs flex items-center justify-center"
                title={`Ebene ${depth} ausklappen`}
              >
                +
              </button>
              <button
                onClick={() => collapseAllAtDepth(depth)}
                className="w-6 h-6 rounded bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs flex items-center justify-center"
                title={`Ebene ${depth} einklappen`}
              >
                −
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Input
          placeholder="Ziele suchen..."
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

        {/* Category Filters */}
        {categoryTypes.map((categoryType) => (
          <div key={categoryType.id} className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">{categoryType.name}:</span>
            <Badge
              variant={(categoryFilter[categoryType.id] || []).includes('__none__') ? 'default' : 'outline'}
              className="cursor-pointer text-[10px]"
              onClick={() => toggleCategoryFilter(categoryType.id, '__none__')}
            >
              Keine
            </Badge>
            {categoryType.categories.map((category) => (
              <Badge
                key={category.id}
                variant={(categoryFilter[categoryType.id] || []).includes(category.id) ? 'default' : 'outline'}
                className="cursor-pointer text-[10px]"
                onClick={() => toggleCategoryFilter(categoryType.id, category.id)}
              >
                {category.name}
              </Badge>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
