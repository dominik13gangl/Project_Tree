import { useEffect } from 'react';
import { useProjectStore, useTreeStore, useFilterStore } from '../../stores';
import { ProjectCard } from './ProjectCard';
import { Button } from '../ui';

interface ProjectListProps {
  onCreateProject: () => void;
}

export function ProjectList({ onCreateProject }: ProjectListProps) {
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
        <Button onClick={onCreateProject}>+ New Project</Button>
      </div>

      {activeProjects.length === 0 && archivedProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No projects yet</p>
          <Button onClick={onCreateProject}>Create Your First Project</Button>
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
