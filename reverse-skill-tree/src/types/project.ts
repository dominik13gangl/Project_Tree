export interface BackupSettings {
  enabled: boolean;
  intervalMinutes: number; // 5, 15, 30, 60, etc.
  maxBackups: number; // Maximum number of backups to keep
  lastBackupAt: string | null; // ISO string
}

export interface ProjectSettings {
  autoCompleteParent: boolean;
  showCompletedNodes: boolean;
  backup: BackupSettings;
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
