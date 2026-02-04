import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { Project, CreateProjectInput, UpdateProjectInput, ProjectSettings } from '../../types';
import { DEFAULT_PROJECT_COLOR } from '../../constants';

const defaultNodeSize = {
  baseWidth: 280,
  baseHeight: 120,
  depthScalePercent: 85,
  minScalePercent: 50,
};

// Migrate old nodeSize format to new format
function migrateNodeSize(nodeSize: Record<string, number> | undefined): typeof defaultNodeSize {
  if (!nodeSize) return defaultNodeSize;

  // Check if it's already in new format
  if ('baseWidth' in nodeSize && 'depthScalePercent' in nodeSize) {
    return {
      baseWidth: nodeSize.baseWidth ?? defaultNodeSize.baseWidth,
      baseHeight: nodeSize.baseHeight ?? defaultNodeSize.baseHeight,
      depthScalePercent: nodeSize.depthScalePercent ?? defaultNodeSize.depthScalePercent,
      minScalePercent: nodeSize.minScalePercent ?? defaultNodeSize.minScalePercent,
    };
  }

  // Convert from old format (mainGoalWidth, subGoalWidth, depthShrinkPercent, minWidth)
  // to new format (baseWidth, baseHeight, depthScalePercent, minScalePercent)
  const oldFormat = nodeSize as { mainGoalWidth?: number; subGoalWidth?: number; depthShrinkPercent?: number; minWidth?: number };
  return {
    baseWidth: oldFormat.mainGoalWidth ?? defaultNodeSize.baseWidth,
    baseHeight: defaultNodeSize.baseHeight,
    depthScalePercent: oldFormat.depthShrinkPercent ?? defaultNodeSize.depthScalePercent,
    minScalePercent: oldFormat.minWidth ? Math.round((oldFormat.minWidth / (oldFormat.mainGoalWidth ?? 280)) * 100) : defaultNodeSize.minScalePercent,
  };
}

const defaultSettings: ProjectSettings = {
  autoCompleteParent: true,
  showCompletedNodes: true,
  backup: {
    enabled: false,
    intervalMinutes: 30,
    maxBackups: 5,
    lastBackupAt: null,
  },
  categoryTypes: [],
  nodeSize: defaultNodeSize,
};

export const projectService = {
  async getAll(): Promise<Project[]> {
    const projects = await db.projects.orderBy('createdAt').reverse().toArray();
    // Migration: ensure all settings fields exist
    return projects.map(project => ({
      ...project,
      settings: {
        ...project.settings,
        categoryTypes: (project.settings.categoryTypes ?? []).map(ct => ({
          ...ct,
          showInNodeView: ct.showInNodeView ?? false,
        })),
        nodeSize: migrateNodeSize(project.settings.nodeSize as Record<string, number> | undefined),
      },
    }));
  },

  async getActive(): Promise<Project[]> {
    const projects = await db.projects.where('isArchived').equals(0).toArray();
    // Migration: ensure all settings fields exist
    return projects.map(project => ({
      ...project,
      settings: {
        ...project.settings,
        categoryTypes: (project.settings.categoryTypes ?? []).map(ct => ({
          ...ct,
          showInNodeView: ct.showInNodeView ?? false,
        })),
        nodeSize: migrateNodeSize(project.settings.nodeSize as Record<string, number> | undefined),
      },
    }));
  },

  async getById(id: string): Promise<Project | undefined> {
    const project = await db.projects.get(id);
    if (project) {
      // Migration: ensure all settings fields exist
      project.settings.categoryTypes = (project.settings.categoryTypes ?? []).map(ct => ({
        ...ct,
        showInNodeView: ct.showInNodeView ?? false,
      }));
      project.settings.nodeSize = migrateNodeSize(project.settings.nodeSize as Record<string, number> | undefined);
    }
    return project;
  },

  async create(input: CreateProjectInput): Promise<Project> {
    const now = new Date();
    const project: Project = {
      id: uuidv4(),
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? DEFAULT_PROJECT_COLOR,
      icon: input.icon ?? null,
      isArchived: input.isArchived ?? false,
      settings: input.settings ?? defaultSettings,
      createdAt: now,
      updatedAt: now,
    };

    await db.projects.add(project);
    return project;
  },

  async update(id: string, input: UpdateProjectInput): Promise<Project | undefined> {
    const project = await db.projects.get(id);
    if (!project) return undefined;

    const updated: Project = {
      ...project,
      ...input,
      settings: input.settings ? { ...project.settings, ...input.settings } : project.settings,
      updatedAt: new Date(),
    };

    await db.projects.put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.projects, db.nodes], async () => {
      await db.nodes.where('projectId').equals(id).delete();
      await db.projects.delete(id);
    });
  },

  async archive(id: string): Promise<Project | undefined> {
    return this.update(id, { isArchived: true });
  },

  async unarchive(id: string): Promise<Project | undefined> {
    return this.update(id, { isArchived: false });
  },
};
