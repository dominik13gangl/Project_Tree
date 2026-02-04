import { useState } from 'react';
import { Button, Input, Textarea, Select } from '../ui';
import { CategoryTypeEditor } from './CategoryTypeEditor';
import { useProjectStore, useCurrentProject, useTreeStore } from '../../stores';
import { PROJECT_COLORS } from '../../constants';
import { getBackups, createBackup, deleteBackup, restoreFromBackup, downloadBackup } from '../../services/backup';
import type { CategoryType, NodeSizeSettings } from '../../types';

const BACKUP_INTERVALS = [
  { value: '5', label: '5 Minuten' },
  { value: '15', label: '15 Minuten' },
  { value: '30', label: '30 Minuten' },
  { value: '60', label: '1 Stunde' },
  { value: '120', label: '2 Stunden' },
  { value: '240', label: '4 Stunden' },
];

const MAX_BACKUPS_OPTIONS = [
  { value: '3', label: '3 Backups' },
  { value: '5', label: '5 Backups' },
  { value: '10', label: '10 Backups' },
  { value: '20', label: '20 Backups' },
];

interface ProjectSettingsProps {
  onClose: () => void;
}

export function ProjectSettings({ onClose }: ProjectSettingsProps) {
  const project = useCurrentProject();
  const { updateProject, archiveProject, unarchiveProject, deleteProject, loadProjects } = useProjectStore();
  const { nodes, loadNodes, repairProject, setNodeSize: setStoreNodeSize } = useTreeStore();

  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [color, setColor] = useState(project?.color || '');
  const [icon, setIcon] = useState(project?.icon || '');
  const [autoCompleteParent, setAutoCompleteParent] = useState(
    project?.settings.autoCompleteParent ?? true
  );
  const [showCompletedNodes, setShowCompletedNodes] = useState(
    project?.settings.showCompletedNodes ?? true
  );
  
  // Backup settings
  const [backupEnabled, setBackupEnabled] = useState(
    project?.settings.backup?.enabled ?? false
  );
  const [backupInterval, setBackupInterval] = useState(
    String(project?.settings.backup?.intervalMinutes ?? 30)
  );
  const [maxBackups, setMaxBackups] = useState(
    String(project?.settings.backup?.maxBackups ?? 5)
  );
  
  const [showBackups, setShowBackups] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);

  // Category types
  const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>(
    project?.settings.categoryTypes ?? []
  );

  // Node size settings
  const defaultNodeSize: NodeSizeSettings = {
    baseWidth: 280,
    baseHeight: 120,
    depthScalePercent: 85,
    minScalePercent: 50,
  };
  const [nodeSize, setNodeSize] = useState<NodeSizeSettings>(
    project?.settings.nodeSize ?? defaultNodeSize
  );

  if (!project) return null;

  const backups = showBackups ? getBackups(project.id) : [];

  const handleSave = async () => {
    await updateProject(project.id, {
      name: name.trim(),
      description: description.trim() || null,
      color,
      icon: icon.trim() || null,
      settings: {
        autoCompleteParent,
        showCompletedNodes,
        backup: {
          enabled: backupEnabled,
          intervalMinutes: parseInt(backupInterval, 10),
          maxBackups: parseInt(maxBackups, 10),
          lastBackupAt: project.settings.backup?.lastBackupAt ?? null,
        },
        categoryTypes,
        nodeSize,
      },
    });
    // Update tree layout with new node size
    setStoreNodeSize(nodeSize);
    onClose();
  };

  const handleCreateBackup = async () => {
    await createBackup(project, nodes, false);
    setShowBackups(true); // Refresh backup list
    alert('Backup created successfully!');
  };

  const handleRestoreBackup = async (backup: ReturnType<typeof getBackups>[0]) => {
    if (!confirm('Are you sure you want to restore this backup? Current data will be replaced.')) {
      return;
    }
    
    setIsRestoring(true);
    try {
      await restoreFromBackup(backup);
      await loadNodes(project.id);
      await loadProjects();
      alert('Backup restored successfully!');
    } catch (error) {
      console.error('Restore error:', error);
      alert('Failed to restore backup.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = (backupAt: string) => {
    if (confirm('Möchten Sie dieses Backup wirklich löschen?')) {
      deleteBackup(project.id, backupAt);
      setShowBackups(false);
      setTimeout(() => setShowBackups(true), 0); // Force refresh
    }
  };

  const handleRepairProject = async () => {
    if (!confirm('Möchten Sie das Projekt reparieren? Dies behebt zirkuläre Referenzen und fehlende Verknüpfungen.')) {
      return;
    }
    
    setIsRepairing(true);
    try {
      const result = await repairProject(project.id);
      if (result.fixed > 0) {
        alert(`Reparatur abgeschlossen! ${result.fixed} Problem(e) behoben.`);
      } else {
        alert('Keine Probleme gefunden. Das Projekt ist in Ordnung.');
      }
    } catch (error) {
      console.error('Repair error:', error);
      alert('Fehler bei der Reparatur.');
    } finally {
      setIsRepairing(false);
    }
  };

  const handleArchive = async () => {
    if (project.isArchived) {
      await unarchiveProject(project.id);
    } else {
      await archiveProject(project.id);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (
      confirm(
        'Are you sure you want to delete this project? All tasks will be permanently deleted.'
      )
    ) {
      await deleteProject(project.id);
      onClose();
    }
  };

  const formatBackupDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border shadow-lg z-40 overflow-y-auto">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">Project Settings</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <Input
          label="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        <div>
          <label className="text-sm font-medium text-foreground block mb-2">
            Color
          </label>
          <div className="flex gap-2 flex-wrap">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                  color === c.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                }`}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <Input
          label="Icon (emoji)"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🚀"
          maxLength={10}
        />

        <div className="pt-4 border-t border-border">
          <h3 className="font-medium mb-3">Behavior Settings</h3>

          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={autoCompleteParent}
              onChange={(e) => setAutoCompleteParent(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">
              Auto-complete parent when all children are done
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompletedNodes}
              onChange={(e) => setShowCompletedNodes(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">Show completed tasks</span>
          </label>
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="font-medium mb-3">Kategorien</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Definieren Sie Kategorietypen (z.B. "Tunnel", "Region") und deren Kategorien.
          </p>
          <CategoryTypeEditor
            categoryTypes={categoryTypes}
            onChange={setCategoryTypes}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="font-medium mb-3">Zielgrößen-Skalierung</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Tiefere Ebenen werden proportional kleiner dargestellt. So sehen Sie auf den ersten Blick die wichtigsten Ziele und können bei Bedarf reinzoomen.
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={keepAspectRatio}
                onChange={(e) => setKeepAspectRatio(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm">Seitenverhältnis beibehalten</span>
            </label>

            <Input
              label="Basis-Breite (px)"
              type="number"
              min="200"
              max="500"
              value={nodeSize.baseWidth}
              onChange={(e) => {
                const newWidth = parseInt(e.target.value) || 280;
                if (keepAspectRatio) {
                  const ratio = nodeSize.baseHeight / nodeSize.baseWidth;
                  setNodeSize(prev => ({ ...prev, baseWidth: newWidth, baseHeight: Math.round(newWidth * ratio) }));
                } else {
                  setNodeSize(prev => ({ ...prev, baseWidth: newWidth }));
                }
              }}
            />

            <Input
              label="Basis-Höhe (px)"
              type="number"
              min="80"
              max="300"
              value={nodeSize.baseHeight}
              onChange={(e) => {
                const newHeight = parseInt(e.target.value) || 120;
                if (keepAspectRatio) {
                  const ratio = nodeSize.baseWidth / nodeSize.baseHeight;
                  setNodeSize(prev => ({ ...prev, baseHeight: newHeight, baseWidth: Math.round(newHeight * ratio) }));
                } else {
                  setNodeSize(prev => ({ ...prev, baseHeight: newHeight }));
                }
              }}
            />

            <Input
              label="Skalierung pro Ebene (%)"
              type="number"
              min="50"
              max="100"
              value={nodeSize.depthScalePercent}
              onChange={(e) => setNodeSize(prev => ({ ...prev, depthScalePercent: parseInt(e.target.value) || 85 }))}
            />
            <p className="text-xs text-muted-foreground -mt-2">
              Jede tiefere Ebene wird um diesen Faktor kleiner (z.B. 85% = Ebene 1 ist 85% von Ebene 0).
            </p>

            <Input
              label="Minimale Skalierung (%)"
              type="number"
              min="30"
              max="100"
              value={nodeSize.minScalePercent}
              onChange={(e) => setNodeSize(prev => ({ ...prev, minScalePercent: parseInt(e.target.value) || 50 }))}
            />
            <p className="text-xs text-muted-foreground -mt-2">
              Ziele werden nicht kleiner als dieser Prozentsatz der Basis-Größe.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="font-medium mb-3">Auto-Backup Settings</h3>

          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={backupEnabled}
              onChange={(e) => setBackupEnabled(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">Enable automatic backups</span>
          </label>

          {backupEnabled && (
            <div className="space-y-3 ml-6">
              <Select
                label="Backup Interval"
                value={backupInterval}
                onChange={(e) => setBackupInterval(e.target.value)}
                options={BACKUP_INTERVALS}
              />
              
              <Select
                label="Keep Maximum"
                value={maxBackups}
                onChange={(e) => setMaxBackups(e.target.value)}
                options={MAX_BACKUPS_OPTIONS}
              />
              
              {project.settings.backup?.lastBackupAt && (
                <p className="text-xs text-muted-foreground">
                  Last backup: {formatBackupDate(project.settings.backup.lastBackupAt)}
                </p>
              )}
            </div>
          )}

          <div className="mt-3 space-y-2">
            <Button variant="secondary" onClick={handleCreateBackup} className="w-full" size="sm">
              Create Backup Now
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => setShowBackups(!showBackups)} 
              className="w-full" 
              size="sm"
            >
              {showBackups ? 'Hide Backups' : `Show Backups (${getBackups(project.id).length})`}
            </Button>
          </div>

          {showBackups && backups.length > 0 && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {backups.map((backup) => (
                <div 
                  key={backup.backupAt} 
                  className="p-2 bg-muted rounded text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{formatBackupDate(backup.backupAt)}</div>
                    <div className="text-muted-foreground">
                      {backup.isAutoBackup ? 'Auto' : 'Manual'} • {backup.nodes.length} nodes
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => downloadBackup(backup)}
                      title="Download"
                    >
                      ⬇
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRestoreBackup(backup)}
                      disabled={isRestoring}
                      title="Restore"
                    >
                      ↩
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteBackup(backup.backupAt)}
                      title="Delete"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showBackups && backups.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground text-center">
              Keine Backups vorhanden
            </p>
          )}
        </div>

        {/* Repair Section */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-2">Projekt reparieren</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Falls das Projekt nicht richtig funktioniert oder sich aufhängt, können Sie es hier reparieren.
          </p>
          <Button 
            variant="secondary" 
            onClick={handleRepairProject} 
            className="w-full"
            disabled={isRepairing}
          >
            {isRepairing ? 'Repariere...' : '🔧 Projekt reparieren'}
          </Button>
        </div>

        <div className="pt-4 space-y-2">
          <Button onClick={handleSave} className="w-full">
            Änderungen speichern
          </Button>

          <Button variant="secondary" onClick={handleArchive} className="w-full">
            {project.isArchived ? 'Projekt wiederherstellen' : 'Projekt archivieren'}
          </Button>

          <Button variant="destructive" onClick={handleDelete} className="w-full">
            Projekt löschen
          </Button>
        </div>
      </div>
    </div>
  );
}
