import { Button, Badge } from '../ui';
import { useProjectStore, useCurrentProject, useTreeStore } from '../../stores';

interface HeaderProps {
  onOpenSettings: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function Header({ onOpenSettings, onExport, onImport }: HeaderProps) {
  const { selectProject } = useProjectStore();
  const { clearNodes } = useTreeStore();
  const currentProject = useCurrentProject();

  const handleBack = () => {
    selectProject(null);
    clearNodes();
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        {currentProject ? (
          <>
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </Button>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: currentProject.color }}
              />
              {currentProject.icon && <span>{currentProject.icon}</span>}
              <h1 className="font-semibold">{currentProject.name}</h1>
              {currentProject.isArchived && (
                <Badge variant="secondary" className="text-[10px]">
                  Archived
                </Badge>
              )}
            </div>
          </>
        ) : (
          <h1 className="text-xl font-bold text-primary">Reverse Skill Tree</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {currentProject && (
          <>
            <Button variant="ghost" size="sm" onClick={onImport}>
              Import
            </Button>
            <Button variant="ghost" size="sm" onClick={onExport}>
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={onOpenSettings}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
