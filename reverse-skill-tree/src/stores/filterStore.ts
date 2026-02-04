import { create } from 'zustand';
import type { NodeStatus, NodePriority } from '../types';

interface FilterState {
  statusFilter: NodeStatus[];
  priorityFilter: NodePriority[];
  searchQuery: string;
  showArchived: boolean;
  categoryFilter: Record<string, string[]>; // { categoryTypeId: [categoryId, ...] }

  // Actions
  setStatusFilter: (statuses: NodeStatus[]) => void;
  toggleStatusFilter: (status: NodeStatus) => void;
  setPriorityFilter: (priorities: NodePriority[]) => void;
  togglePriorityFilter: (priority: NodePriority) => void;
  setSearchQuery: (query: string) => void;
  setShowArchived: (show: boolean) => void;
  setCategoryFilter: (categoryTypeId: string, categoryIds: string[]) => void;
  toggleCategoryFilter: (categoryTypeId: string, categoryId: string) => void;
  resetCategoryFilters: () => void;
  resetFilters: () => void;
}

const initialState = {
  statusFilter: [] as NodeStatus[],
  priorityFilter: [] as NodePriority[],
  searchQuery: '',
  showArchived: false,
  categoryFilter: {} as Record<string, string[]>,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,

  setStatusFilter: (statuses) => set({ statusFilter: statuses }),

  toggleStatusFilter: (status) =>
    set((state) => ({
      statusFilter: state.statusFilter.includes(status)
        ? state.statusFilter.filter((s) => s !== status)
        : [...state.statusFilter, status],
    })),

  setPriorityFilter: (priorities) => set({ priorityFilter: priorities }),

  togglePriorityFilter: (priority) =>
    set((state) => ({
      priorityFilter: state.priorityFilter.includes(priority)
        ? state.priorityFilter.filter((p) => p !== priority)
        : [...state.priorityFilter, priority],
    })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setShowArchived: (show) => set({ showArchived: show }),

  setCategoryFilter: (categoryTypeId, categoryIds) =>
    set((state) => ({
      categoryFilter: {
        ...state.categoryFilter,
        [categoryTypeId]: categoryIds,
      },
    })),

  toggleCategoryFilter: (categoryTypeId, categoryId) =>
    set((state) => {
      const currentIds = state.categoryFilter[categoryTypeId] || [];
      const newIds = currentIds.includes(categoryId)
        ? currentIds.filter((id) => id !== categoryId)
        : [...currentIds, categoryId];
      return {
        categoryFilter: {
          ...state.categoryFilter,
          [categoryTypeId]: newIds,
        },
      };
    }),

  resetCategoryFilters: () =>
    set({ categoryFilter: {} }),

  resetFilters: () => set(initialState),
}));
