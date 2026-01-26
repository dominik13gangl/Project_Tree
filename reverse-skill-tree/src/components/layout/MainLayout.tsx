import { useState, useRef } from 'react';
import { Header } from './Header';
import { ProjectList, ProjectDialog, ProjectSettings } from '../projects';
import { TreeCanvas, TreeControls } from '../tree';
import { NodeEditor } from '../nodes';
import { useProjectStore, useCurrentProject, useTreeStore } from '../../stores';
import { exportToJSON, importFromJSON, exportToPDF } from '../../services/export';
import { Dialog, DialogFooter, Button } from '../ui';

export function MainLayout() {
  const { currentProjectId } = useProjectStore();
  const currentProject = useCurrentProject();
  const { nodes } = useTreeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProjectDialogOpen, setProjectDialogOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);

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

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importFromJSON(file);
        window.location.reload();
      } catch (error) {
        alert('Failed to import file. Please check the format.');
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
          <ProjectList onCreateProject={() => setProjectDialogOpen(true)} />
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

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
