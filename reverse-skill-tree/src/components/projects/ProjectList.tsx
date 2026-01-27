import { useEffect } from 'react';
import { useProjectStore, useTreeStore, useFilterStore } from '../../stores';
import { ProjectCard } from './ProjectCard';
import { Button } from '../ui';

interface ProjectListProps {
  onCreateProject: () => void;
  onImport: () => void;
}

export function ProjectList({ onCreateProject, onImport }: ProjectListProps) {
  const { projects, loadProjects, isLoading, selectProject, currentProjectId } = useProjectStore();
  const { loadNodes, clearNodes } = useTreeStore();
  const { showArchived } = useFilterStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSelectProject = async (projectId: string) => {
    selectProject(projectId);
    await loadNodes(projectId);
  };

  // Clear nodes when going back (called from Header, not here)
  useEffect(() => {
    if (!currentProjectId) {
      clearNodes();
    }
  }, [currentProjectId, clearNodes]);

  const filteredProjects = showArchived
    ? projects
    : projects.filter((p) => !p.isArchived);

  const activeProjects = filteredProjects.filter((p) => !p.isArchived);
  const archivedProjects = filteredProjects.filter((p) => p.isArchived);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onImport}>
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
              className="mr-2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Import
          </Button>
          <Button onClick={onCreateProject}>+ New Project</Button>
        </div>
      </div>

      {activeProjects.length === 0 && archivedProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No projects yet</p>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={onCreateProject}>Create Your First Project</Button>
            <Button variant="secondary" onClick={onImport}>Import Project</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {activeProjects.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Active Projects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => handleSelectProject(project.id)}
                    isSelected={project.id === currentProjectId}
                  />
                ))}
              </div>
            </div>
          )}

          {showArchived && archivedProjects.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                Archived Projects
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => handleSelectProject(project.id)}
                    isSelected={project.id === currentProjectId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
