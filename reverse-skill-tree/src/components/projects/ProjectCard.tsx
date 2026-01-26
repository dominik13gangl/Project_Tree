import type { Project } from '../../types';
import { Badge } from '../ui';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  isSelected?: boolean;
}

export function ProjectCard({ project, onClick, isSelected }: ProjectCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${project.isArchived ? 'opacity-60' : ''}`}
      style={{ borderColor: project.color }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {project.icon && <span className="text-xl">{project.icon}</span>}
          <h3 className="font-semibold text-foreground">{project.name}</h3>
        </div>
        {project.isArchived && (
          <Badge variant="secondary" className="text-[10px]">
            Archived
          </Badge>
        )}
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {project.description}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
