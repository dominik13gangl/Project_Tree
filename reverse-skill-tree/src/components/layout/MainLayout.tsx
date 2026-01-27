import { useState, useRef } from 'react';
import { Header } from './Header';
import { ProjectList, ProjectDialog, ProjectSettings } from '../projects';
import { TreeCanvas, TreeControls } from '../tree';
import { NodeEditor } from '../nodes';
import { useProjectStore, useCurrentProject, useTreeStore } from '../../stores';
import { exportToJSON, importFromJSON, exportToPDF, exportToExcel, importFromExcel } from '../../services/export';
import { Dialog, DialogFooter, Button, ShortcutsPanel } from '../ui';
import { useAutoBackup } from '../../hooks';

export function MainLayout() {
  const { currentProjectId, loadProjects } = useProjectStore();
  const currentProject = useCurrentProject();
  const { nodes } = useTreeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<'json' | 'excel'>('json');

  // Auto-backup hook
  useAutoBackup();

  const [isProjectDialogOpen, setProjectDialogOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    setExportDialogOpen(true);
  };

  const handleExportJSON = () => {
    if (currentProject) {
      exportToJSON(currentProject, nodes);
    }
    setExportDialogOpen(false);
  };

  const handleExportPDF = async () => {
    if (currentProject) {
      await exportToPDF(currentProject, nodes);
    }
    setExportDialogOpen(false);
  };

  const handleExportExcel = () => {
    if (currentProject) {
      exportToExcel(currentProject, nodes);
    }
    setExportDialogOpen(false);
  };

  const handleImport = () => {
    setImportDialogOpen(true);
  };

  const handleImportClick = (type: 'json' | 'excel') => {
    setImportType(type);
    setImportDialogOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImporting(true);
      try {
        if (importType === 'json') {
          await importFromJSON(file);
        } else {
          await importFromExcel(file);
        }
        await loadProjects();
        alert('Project imported successfully!');
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import file. Please check the format.');
      } finally {
        setIsImporting(false);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onExport={handleExport}
        onImport={handleImport}
      />

      <main className="flex-1 overflow-hidden">
        {currentProjectId ? (
          <div className="h-full flex flex-col">
            <TreeControls />
            <div className="flex-1">
              <TreeCanvas />
            </div>
          </div>
        ) : (
          <ProjectList 
            onCreateProject={() => setProjectDialogOpen(true)} 
            onImport={handleImport}
          />
        )}
      </main>

      <NodeEditor />

      {isSettingsOpen && <ProjectSettings onClose={() => setSettingsOpen(false)} />}

      <ProjectDialog
        open={isProjectDialogOpen}
        onClose={() => setProjectDialogOpen(false)}
      />

      <Dialog
        open={isExportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        title="Export Project"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Choose an export format:
        </p>
        <div className="space-y-2">
          <Button onClick={handleExportJSON} className="w-full">
            Export as JSON
          </Button>
          <Button variant="secondary" onClick={handleExportExcel} className="w-full">
            Export as Excel
          </Button>
          <Button variant="secondary" onClick={handleExportPDF} className="w-full">
            Export as PDF
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setExportDialogOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={isImportDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        title="Import Project"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Choose a file format to import:
        </p>
        <div className="space-y-2">
          <Button onClick={() => handleImportClick('json')} className="w-full" disabled={isImporting}>
            {isImporting ? 'Importing...' : 'Import JSON File'}
          </Button>
          <Button variant="secondary" onClick={() => handleImportClick('excel')} className="w-full" disabled={isImporting}>
            {isImporting ? 'Importing...' : 'Import Excel File'}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setImportDialogOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept={importType === 'json' ? '.json' : '.xlsx,.xls'}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Shortcuts Panel - only show when a project is open */}
      {currentProjectId && <ShortcutsPanel />}
    </div>
  );
}
