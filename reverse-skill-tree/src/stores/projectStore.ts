import { create } from 'zustand';
import type { Project, CreateProjectInput, UpdateProjectInput } from '../types';
import { projectService } from '../services/storage';

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProjects: () => Promise<void>;
  selectProject: (projectId: string | null) => void;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, input: UpdateProjectInput) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  unarchiveProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProjectId: null,
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await projectService.getAll();
      set({ projects, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  selectProject: (projectId) => {
    set({ currentProjectId: projectId });
  },

  createProject: async (input) => {
    const project = await projectService.create(input);
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },

  updateProject: async (id, input) => {
    const updated = await projectService.update(id, input);
    if (updated) {
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updated : p)),
      }));
    }
  },

  deleteProject: async (id) => {
    await projectService.delete(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
    }));
  },

  archiveProject: async (id) => {
    const updated = await projectService.archive(id);
    if (updated) {
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updated : p)),
      }));
    }
  },

  unarchiveProject: async (id) => {
    const updated = await projectService.unarchive(id);
    if (updated) {
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updated : p)),
      }));
    }
  },
}));

// Selector for current project
export const useCurrentProject = () => {
  const { projects, currentProjectId } = useProjectStore();
  return projects.find((p) => p.id === currentProjectId) ?? null;
};
