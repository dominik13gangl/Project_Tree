import { useState, useEffect } from 'react';
import { Button, Input, Textarea, Select } from '../ui';
import { useTreeStore, useUIStore, useProjectStore } from '../../stores';
import { NODE_STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../constants';
import type { NodeStatus, NodePriority } from '../../types';

export function NodeEditor() {
  const { selectedNodeId, getNode, updateNode, createNode, deleteNode } = useTreeStore();
  const { currentProjectId } = useProjectStore();
  const { isNodeEditorOpen, closeNodeEditor } = useUIStore();

  const node = selectedNodeId ? getNode(selectedNodeId) : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<NodeStatus>('open');
  const [priority, setPriority] = useState<NodePriority>('medium');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (node) {
      setTitle(node.title);
      setDescription(node.description || '');
      setNotes(node.notes || '');
      setStatus(node.status);
      setPriority(node.priority);
      setEstimatedHours(node.estimatedHours?.toString() || '');
      setDueDate(node.dueDate ? new Date(node.dueDate).toISOString().split('T')[0] : '');
      // Show advanced section if node has values for these fields
      setShowAdvanced(!!node.estimatedHours || !!node.dueDate);
    }
  }, [node]);

  if (!isNodeEditorOpen || !node) return null;

  const handleSave = async () => {
    await updateNode(node.id, {
      title,
      description: description || null,
      notes: notes || null,
      status,
      priority,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
    });
    closeNodeEditor();
  };

  const handleAddChild = async () => {
    if (!currentProjectId) return;
    await createNode({
      projectId: currentProjectId,
      parentId: node.id,
      title: 'New Task',
    });
  };

  const handleDelete = async () => {
    if (confirm('Möchten Sie dieses Ziel und alle Unterziele löschen?')) {
      await deleteNode(node.id);
      closeNodeEditor();
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border shadow-lg z-40 overflow-y-auto">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">Ziel bearbeiten</h2>
        <Button variant="ghost" size="icon" onClick={closeNodeEditor}>
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
          label="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Zieltitel"
        />

        <Textarea
          label="Beschreibung"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Was muss erledigt werden?"
          rows={3}
        />

        <Textarea
          label="Notizen"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Zusätzliche Notizen..."
          rows={3}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as NodeStatus)}
            options={NODE_STATUS_OPTIONS}
          />

          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as NodePriority)}
            options={PRIORITY_OPTIONS}
          />
        </div>

        {/* Collapsible Advanced Section */}
        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
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
              className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Erweiterte Optionen
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-4 mt-3">
              <Input
                label="Geschätzte Stunden"
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="0"
              />

              <Input
                label="Fälligkeitsdatum"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="pt-4 space-y-2">
          <Button onClick={handleSave} className="w-full">
            Speichern
          </Button>

          <Button variant="secondary" onClick={handleAddChild} className="w-full">
            + Unterziel hinzufügen
          </Button>

          <Button variant="destructive" onClick={handleDelete} className="w-full">
            Ziel löschen
          </Button>
        </div>

        {node.completedAt && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Abgeschlossen: {new Date(node.completedAt).toLocaleDateString('de-DE')}
          </p>
        )}
      </div>
    </div>
  );
}
