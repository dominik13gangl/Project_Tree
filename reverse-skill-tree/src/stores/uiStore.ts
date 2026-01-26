import { create } from 'zustand';

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  nodeId: string | null;
}

interface UIState {
  isSidebarOpen: boolean;
  isNodeEditorOpen: boolean;
  contextMenu: ContextMenuState;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openNodeEditor: () => void;
  closeNodeEditor: () => void;
  openContextMenu: (x: number, y: number, nodeId: string) => void;
  closeContextMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isNodeEditorOpen: false,
  contextMenu: {
    isOpen: false,
    x: 0,
    y: 0,
    nodeId: null,
  },

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  openNodeEditor: () => set({ isNodeEditorOpen: true }),

  closeNodeEditor: () => set({ isNodeEditorOpen: false }),

  openContextMenu: (x, y, nodeId) =>
    set({ contextMenu: { isOpen: true, x, y, nodeId } }),

  closeContextMenu: () =>
    set({ contextMenu: { isOpen: false, x: 0, y: 0, nodeId: null } }),
}));
