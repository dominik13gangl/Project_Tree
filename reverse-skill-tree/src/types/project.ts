import type { CategoryType } from './category';

export interface BackupSettings {
  enabled: boolean;
  intervalMinutes: number; // 5, 15, 30, 60, etc.
  maxBackups: number; // Maximum number of backups to keep
  lastBackupAt: string | null; // ISO string
}

export interface NodeSizeSettings {
  baseWidth: number;          // Base width for all nodes (e.g., 280)
  baseHeight: number;         // Base height for all nodes (e.g., 120)
  depthScalePercent: number;  // Scale factor per depth level (e.g., 85 = 85% of previous level)
  minScalePercent: number;    // Minimum scale (e.g., 50 = don't go below 50%)
}

export interface ProjectSettings {
  autoCompleteParent: boolean;
  showCompletedNodes: boolean;
  backup: BackupSettings;
  categoryTypes: CategoryType[];
  nodeSize: NodeSizeSettings;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  isArchived: boolean;
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateProjectInput = Pick<Project, 'name'> &
  Partial<Omit<Project, 'id' | 'name' | 'createdAt' | 'updatedAt'>>;

export type UpdateProjectInput = Partial<Omit<Project, 'id' | 'createdAt'>>;
