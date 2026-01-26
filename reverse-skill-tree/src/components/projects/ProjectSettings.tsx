import { useState } from 'react';
import { Button, Input, Textarea } from '../ui';
import { useProjectStore, useCurrentProject } from '../../stores';
import { PROJECT_COLORS } from '../../constants';

interface ProjectSettingsProps {
  onClose: () => void;
}

export function ProjectSettings({ onClose }: ProjectSettingsProps) {
  const project = useCurrentProject();
  const { updateProject, archiveProject, unarchiveProject, deleteProject } = useProjectStore();

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

  if (!project) return null;

  const handleSave = async () => {
    await updateProject(project.id, {
      name: name.trim(),
      description: description.trim() || null,
      color,
      icon: icon.trim() || null,
      settings: {
        autoCompleteParent,
        showCompletedNodes,
      },
    });
    onClose();
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

        <div className="pt-4 space-y-2">
          <Button onClick={handleSave} className="w-full">
            Save Changes
          </Button>

          <Button variant="secondary" onClick={handleArchive} className="w-full">
            {project.isArchived ? 'Unarchive Project' : 'Archive Project'}
          </Button>

          <Button variant="destructive" onClick={handleDelete} className="w-full">
            Delete Project
          </Button>
        </div>
      </div>
    </div>
  );
}
