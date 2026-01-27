import type { Project, TreeNode } from '../../types';
import { projectService } from '../storage';
import { db } from '../storage/db';

interface BackupData {
  version: string;
  backupAt: string;
  isAutoBackup: boolean;
  project: Project;
  nodes: TreeNode[];
}

const BACKUP_STORAGE_KEY_PREFIX = 'project_backup_';

// Get all backups for a project
export function getBackups(projectId: string): BackupData[] {
  const backups: BackupData[] = [];
  const prefix = `${BACKUP_STORAGE_KEY_PREFIX}${projectId}_`;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          backups.push(JSON.parse(data));
        }
      } catch {
        // Ignore invalid backups
      }
    }
  }
  
  // Sort by backup date, newest first
  return backups.sort((a, b) => 
    new Date(b.backupAt).getTime() - new Date(a.backupAt).getTime()
  );
}

// Create a backup
export async function createBackup(
  project: Project, 
  nodes: TreeNode[], 
  isAutoBackup: boolean = false
): Promise<void> {
  const backupData: BackupData = {
    version: '1.0',
    backupAt: new Date().toISOString(),
    isAutoBackup,
    project,
    nodes,
  };

  const timestamp = new Date().getTime();
  const key = `${BACKUP_STORAGE_KEY_PREFIX}${project.id}_${timestamp}`;
  
  localStorage.setItem(key, JSON.stringify(backupData));

  // Clean up old backups if we exceed maxBackups
  if (project.settings.backup.maxBackups > 0) {
    const backups = getBackups(project.id);
    const autoBackups = backups.filter(b => b.isAutoBackup);
    
    // Only clean up auto-backups, keep manual backups
    if (autoBackups.length > project.settings.backup.maxBackups) {
      const toDelete = autoBackups.slice(project.settings.backup.maxBackups);
      for (const backup of toDelete) {
        deleteBackup(project.id, backup.backupAt);
      }
    }
  }

  // Update last backup time
  if (isAutoBackup) {
    await projectService.update(project.id, {
      settings: {
        ...project.settings,
        backup: {
          ...project.settings.backup,
          lastBackupAt: backupData.backupAt,
        },
      },
    });
  }
}

// Delete a specific backup
export function deleteBackup(projectId: string, backupAt: string): void {
  const prefix = `${BACKUP_STORAGE_KEY_PREFIX}${projectId}_`;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const backup = JSON.parse(data) as BackupData;
          if (backup.backupAt === backupAt) {
            localStorage.removeItem(key);
            return;
          }
        }
      } catch {
        // Ignore
      }
    }
  }
}

// Delete all backups for a project
export function deleteAllBackups(projectId: string): void {
  const prefix = `${BACKUP_STORAGE_KEY_PREFIX}${projectId}_`;
  const keysToDelete: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => localStorage.removeItem(key));
}

// Restore from a backup
export async function restoreFromBackup(backup: BackupData): Promise<void> {
  const { project, nodes } = backup;

  // Delete existing nodes for this project
  await db.nodes.where('projectId').equals(project.id).delete();

  // Restore nodes
  await db.nodes.bulkAdd(nodes.map(node => ({
    ...node,
    createdAt: new Date(node.createdAt),
    updatedAt: new Date(node.updatedAt),
    completedAt: node.completedAt ? new Date(node.completedAt) : null,
    dueDate: node.dueDate ? new Date(node.dueDate) : null,
  })));
}

// Check if auto-backup is needed
export function isBackupNeeded(project: Project): boolean {
  if (!project.settings.backup?.enabled) {
    return false;
  }

  const lastBackup = project.settings.backup.lastBackupAt;
  if (!lastBackup) {
    return true;
  }

  const lastBackupTime = new Date(lastBackup).getTime();
  const now = Date.now();
  const intervalMs = project.settings.backup.intervalMinutes * 60 * 1000;

  return (now - lastBackupTime) >= intervalMs;
}

// Download backup as JSON file
export function downloadBackup(backup: BackupData): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const date = new Date(backup.backupAt).toISOString().split('T')[0];
  const time = new Date(backup.backupAt).toTimeString().split(' ')[0].replace(/:/g, '-');
  a.download = `backup_${backup.project.name.replace(/[^a-z0-9]/gi, '_')}_${date}_${time}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
