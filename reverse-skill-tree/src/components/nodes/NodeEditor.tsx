import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, Textarea, Select } from '../ui';
import { useTreeStore, useUIStore, useProjectStore, useCurrentProject } from '../../stores';
import { NODE_STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../constants';
import type { NodeStatus, NodePriority, UpdateNodeInput } from '../../types';

export function NodeEditor() {
  const { selectedNodeIds, getNode, updateNode, updateNodes, createNode, deleteNode, deleteNodes } = useTreeStore();
  const { currentProjectId } = useProjectStore();
  const currentProject = useCurrentProject();
  const { isNodeEditorOpen, closeNodeEditor } = useUIStore();

  const isMultiSelect = selectedNodeIds.length > 1;
  const firstNode = selectedNodeIds.length > 0 ? getNode(selectedNodeIds[0]) : null;

  // Create a stable key for the selection to track when it actually changes
  const selectionKey = selectedNodeIds.join(',');
  const prevSelectionKeyRef = useRef<string>('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<NodeStatus | ''>('open');
  const [priority, setPriority] = useState<NodePriority | ''>('medium');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [categories, setCategories] = useState<Record<string, string>>({});

  // Load node data only when selection actually changes
  useEffect(() => {
    // Only reload data if the selection has changed
    if (prevSelectionKeyRef.current === selectionKey) {
      return;
    }
    prevSelectionKeyRef.current = selectionKey;

    if (selectedNodeIds.length === 0) {
      return;
    }

    if (isMultiSelect) {
      // For multi-select, check if values are the same across all selected nodes
      const selectedNodes = selectedNodeIds.map(id => getNode(id)).filter(Boolean);
      const statuses = new Set(selectedNodes.map(n => n?.status));
      const priorities = new Set(selectedNodes.map(n => n?.priority));

      setTitle('');
      setDescription('');
      setNotes('');
      setStatus(statuses.size === 1 ? [...statuses][0] as NodeStatus : '');
      setPriority(priorities.size === 1 ? [...priorities][0] as NodePriority : '');
      setEstimatedHours('');
      setDueDate('');
      setShowAdvanced(false);

      // For categories, check if all nodes have the same category for each type
      const categoryTypes = currentProject?.settings.categoryTypes ?? [];
      const newCategories: Record<string, string> = {};
      for (const categoryType of categoryTypes) {
        const categoryValues = new Set(selectedNodes.map(n => n?.categories?.[categoryType.id] || ''));
        if (categoryValues.size === 1) {
          const value = [...categoryValues][0];
          if (value) {
            newCategories[categoryType.id] = value;
          }
        }
      }
      setCategories(newCategories);
    } else if (firstNode) {
      setTitle(firstNode.title);
      setDescription(firstNode.description || '');
      setNotes(firstNode.notes || '');
      setStatus(firstNode.status);
      setPriority(firstNode.priority);
      setEstimatedHours(firstNode.estimatedHours?.toString() || '');
      setDueDate(firstNode.dueDate ? new Date(firstNode.dueDate).toISOString().split('T')[0] : '');
      setShowAdvanced(!!firstNode.estimatedHours || !!firstNode.dueDate);
      setCategories(firstNode.categories || {});
    }
  }, [selectionKey, isMultiSelect, firstNode, getNode, selectedNodeIds, currentProject]);

  // Save function
  const handleSave = useCallback(async () => {
    if (isMultiSelect) {
      // For multi-select, only update changed fields
      const input: UpdateNodeInput = {};
      if (status) input.status = status as NodeStatus;
      if (priority) input.priority = priority as NodePriority;
      if (Object.keys(categories).length > 0) input.categories = categories;

      await updateNodes(selectedNodeIds, input);
      closeNodeEditor();
    } else if (firstNode) {
      await updateNode(firstNode.id, {
        title: title.trim() || 'Untitled',
        description: description || null,
        notes: notes || null,
        status: status as NodeStatus,
        priority: priority as NodePriority,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        categories,
      });
      closeNodeEditor();
    }
  }, [firstNode, isMultiSelect, selectedNodeIds, title, description, notes, status, priority, estimatedHours, dueDate, categories, updateNode, updateNodes, closeNodeEditor]);

  // Ctrl+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isNodeEditorOpen && (firstNode || isMultiSelect)) {
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isNodeEditorOpen, firstNode, isMultiSelect, handleSave]);

  if (!isNodeEditorOpen || selectedNodeIds.length === 0) return null;

  const handleAddChild = async () => {
    if (!currentProjectId || !firstNode || isMultiSelect) return;
    await createNode(
      {
        projectId: currentProjectId,
        parentId: firstNode.id,
        title: 'New Task',
      },
      currentProject?.settings.categoryTypes
    );
  };

  const handleCategoryChange = (categoryTypeId: string, categoryId: string) => {
    setCategories((prev) => {
      if (categoryId === '') {
        const { [categoryTypeId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [categoryTypeId]: categoryId };
    });
  };

  const categoryTypes = currentProject?.settings.categoryTypes ?? [];

  const handleDelete = async () => {
    const count = selectedNodeIds.length;
    const message = count === 1
      ? 'Möchten Sie dieses Ziel und alle Unterziele löschen?'
      : `Möchten Sie ${count} Ziele und alle Unterziele löschen?`;

    if (confirm(message)) {
      if (count === 1) {
        await deleteNode(selectedNodeIds[0]);
      } else {
        await deleteNodes(selectedNodeIds);
      }
      closeNodeEditor();
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border shadow-lg z-40 overflow-y-auto">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">
          {isMultiSelect ? `${selectedNodeIds.length} Ziele bearbeiten` : 'Ziel bearbeiten'}
        </h2>
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
        {isMultiSelect && (
          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            Bei Mehrfachauswahl können nur Status, Priorität und Kategorien geändert werden.
            <br />
            <span className="text-xs">Strg+Klick zum Hinzufügen/Entfernen, Shift+Klick für Strang</span>
          </div>
        )}

        <Input
          label="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isMultiSelect ? '(Mehrere Ziele)' : 'Zieltitel'}
          disabled={isMultiSelect}
        />

        <Textarea
          label="Beschreibung"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isMultiSelect ? '(Mehrere Ziele)' : 'Was muss erledigt werden?'}
          rows={3}
          disabled={isMultiSelect}
        />

        <Textarea
          label="Notizen"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={isMultiSelect ? '(Mehrere Ziele)' : 'Zusätzliche Notizen...'}
          rows={3}
          disabled={isMultiSelect}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as NodeStatus)}
            options={[
              ...(isMultiSelect && !status ? [{ value: '', label: '(Gemischt)' }] : []),
              ...NODE_STATUS_OPTIONS,
            ]}
          />

          <Select
            label="Priorität"
            value={priority}
            onChange={(e) => setPriority(e.target.value as NodePriority)}
            options={[
              ...(isMultiSelect && !priority ? [{ value: '', label: '(Gemischt)' }] : []),
              ...PRIORITY_OPTIONS,
            ]}
          />
        </div>

        {/* Category Dropdowns */}
        {categoryTypes.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {categoryTypes.map((categoryType) => (
              <Select
                key={categoryType.id}
                label={categoryType.name}
                value={categories[categoryType.id] || ''}
                onChange={(e) => handleCategoryChange(categoryType.id, e.target.value)}
                options={[
                  { value: '', label: isMultiSelect ? '(Gemischt/Keine)' : `Keine ${categoryType.name}` },
                  ...categoryType.categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
                ]}
              />
            ))}
          </div>
        )}

        {/* Collapsible Advanced Section - only for single selection */}
        {!isMultiSelect && (
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
        )}

        <div className="pt-4 space-y-2">
          <Button onClick={handleSave} className="w-full">
            Speichern (Strg+S)
          </Button>

          <Button
            variant="secondary"
            onClick={handleAddChild}
            className="w-full"
            disabled={isMultiSelect}
          >
            + Unterziel hinzufügen
          </Button>

          <Button variant="destructive" onClick={handleDelete} className="w-full">
            {isMultiSelect ? `${selectedNodeIds.length} Ziele löschen` : 'Ziel löschen'}
          </Button>
        </div>

        {!isMultiSelect && firstNode?.completedAt && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Abgeschlossen: {new Date(firstNode.completedAt).toLocaleDateString('de-DE')}
          </p>
        )}
      </div>
    </div>
  );
}
