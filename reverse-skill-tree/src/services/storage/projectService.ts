import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { Project, CreateProjectInput, UpdateProjectInput, ProjectSettings } from '../../types';
import { DEFAULT_PROJECT_COLOR } from '../../constants';

const defaultSettings: ProjectSettings = {
  autoCompleteParent: true,
  showCompletedNodes: true,
  backup: {
    enabled: false,
    intervalMinutes: 30,
    maxBackups: 5,
    lastBackupAt: null,
  },
};

export const projectService = {
  async getAll(): Promise<Project[]> {
    return db.projects.orderBy('createdAt').reverse().toArray();
  },

  async getActive(): Promise<Project[]> {
    return db.projects.where('isArchived').equals(0).toArray();
  },

  async getById(id: string): Promise<Project | undefined> {
    return db.projects.get(id);
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
