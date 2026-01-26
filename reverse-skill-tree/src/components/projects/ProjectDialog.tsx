import { useState, useEffect } from 'react';
import { Dialog, DialogFooter, Button, Input, Textarea } from '../ui';
import { useProjectStore } from '../../stores';
import type { Project } from '../../types';
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from '../../constants';

interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  project?: Project;
}

export function ProjectDialog({ open, onClose, project }: ProjectDialogProps) {
  const { createProject, updateProject } = useProjectStore();
  const isEdit = !!project;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR);
  const [icon, setIcon] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setColor(project.color);
      setIcon(project.icon || '');
    } else {
      setName('');
      setDescription('');
      setColor(DEFAULT_PROJECT_COLOR);
      setIcon('');
    }
  }, [project, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (isEdit && project) {
        await updateProject(project.id, {
          name: name.trim(),
          description: description.trim() || null,
          color,
          icon: icon.trim() || null,
        });
      } else {
        await createProject({
          name: name.trim(),
          description: description.trim() || null,
          color,
          icon: icon.trim() || null,
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Project' : 'Create Project'}
    >
      <div className="space-y-4">
        <Input
          label="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Awesome Project"
          autoFocus
        />

        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about?"
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
          label="Icon (emoji, optional)"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🚀"
          maxLength={10}
        />
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
          {isEdit ? 'Save Changes' : 'Create Project'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
