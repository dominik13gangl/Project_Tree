import { useEffect, useRef } from 'react';
import { useCurrentProject, useTreeStore } from '../stores';
import { createBackup, isBackupNeeded } from '../services/backup';

const CHECK_INTERVAL_MS = 60000; // Check every minute

export function useAutoBackup() {
  const project = useCurrentProject();
  const { nodes } = useTreeStore();
  const lastProjectIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!project || !project.settings.backup?.enabled) {
      return;
    }

    lastProjectIdRef.current = project.id;

    const checkAndBackup = async () => {
      // Double-check the project is still valid and backup is enabled
      if (!project || !project.settings.backup?.enabled) {
        return;
      }

      if (isBackupNeeded(project) && nodes.length > 0) {
        console.log('[AutoBackup] Creating automatic backup...');
        try {
          await createBackup(project, nodes, true);
          console.log('[AutoBackup] Backup created successfully');
        } catch (error) {
          console.error('[AutoBackup] Failed to create backup:', error);
        }
      }
    };

    // Initial check
    checkAndBackup();

    // Set up interval
    intervalRef.current = setInterval(checkAndBackup, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [project, project?.settings.backup?.enabled, project?.settings.backup?.intervalMinutes, nodes]);

  return null;
}
