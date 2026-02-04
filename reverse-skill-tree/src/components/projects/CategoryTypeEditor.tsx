import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button, Input, Select } from '../ui';
import type { CategoryType, Category } from '../../types';

interface CategoryTypeEditorProps {
  categoryTypes: CategoryType[];
  onChange: (categoryTypes: CategoryType[]) => void;
}

export function CategoryTypeEditor({ categoryTypes, onChange }: CategoryTypeEditorProps) {
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState<Record<string, string>>({});

  const handleAddType = () => {
    if (!newTypeName.trim()) return;
    const newType: CategoryType = {
      id: uuidv4(),
      name: newTypeName.trim(),
      categories: [],
      defaultCategoryId: null,
      showInNodeView: false,
    };
    onChange([...categoryTypes, newType]);
    setNewTypeName('');
  };

  const handleDeleteType = (typeId: string) => {
    if (!confirm('Möchten Sie diesen Kategorietyp wirklich löschen?')) return;
    onChange(categoryTypes.filter((t) => t.id !== typeId));
  };

  const handleUpdateTypeName = (typeId: string, name: string) => {
    onChange(
      categoryTypes.map((t) =>
        t.id === typeId ? { ...t, name } : t
      )
    );
  };

  const handleAddCategory = (typeId: string) => {
    const name = newCategoryName[typeId]?.trim();
    if (!name) return;
    const newCategory: Category = {
      id: uuidv4(),
      name,
    };
    onChange(
      categoryTypes.map((t) =>
        t.id === typeId
          ? { ...t, categories: [...t.categories, newCategory] }
          : t
      )
    );
    setNewCategoryName((prev) => ({ ...prev, [typeId]: '' }));
  };

  const handleDeleteCategory = (typeId: string, categoryId: string) => {
    onChange(
      categoryTypes.map((t) =>
        t.id === typeId
          ? {
              ...t,
              categories: t.categories.filter((c) => c.id !== categoryId),
              defaultCategoryId:
                t.defaultCategoryId === categoryId ? null : t.defaultCategoryId,
            }
          : t
      )
    );
  };

  const handleUpdateCategoryName = (
    typeId: string,
    categoryId: string,
    name: string
  ) => {
    onChange(
      categoryTypes.map((t) =>
        t.id === typeId
          ? {
              ...t,
              categories: t.categories.map((c) =>
                c.id === categoryId ? { ...c, name } : c
              ),
            }
          : t
      )
    );
  };

  const handleSetDefaultCategory = (typeId: string, categoryId: string | null) => {
    onChange(
      categoryTypes.map((t) =>
        t.id === typeId ? { ...t, defaultCategoryId: categoryId } : t
      )
    );
  };

  const handleToggleShowInNodeView = (typeId: string) => {
    onChange(
      categoryTypes.map((t) =>
        t.id === typeId ? { ...t, showInNodeView: !t.showInNodeView } : t
      )
    );
  };

  return (
    <div className="space-y-4">
      {categoryTypes.map((type) => (
        <div
          key={type.id}
          className="p-3 bg-muted rounded-lg space-y-3"
        >
          <div className="flex items-center gap-2">
            {editingTypeId === type.id ? (
              <Input
                value={type.name}
                onChange={(e) => handleUpdateTypeName(type.id, e.target.value)}
                onBlur={() => setEditingTypeId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingTypeId(null);
                }}
                autoFocus
                className="flex-1 h-8"
              />
            ) : (
              <span
                className="font-medium flex-1 cursor-pointer hover:text-primary"
                onClick={() => setEditingTypeId(type.id)}
              >
                {type.name}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteType(type.id)}
              className="text-destructive hover:text-destructive h-7 px-2"
            >
              Löschen
            </Button>
          </div>

          {/* Categories list */}
          <div className="space-y-1 ml-2">
            {type.categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2 text-sm"
              >
                <Input
                  value={category.name}
                  onChange={(e) =>
                    handleUpdateCategoryName(type.id, category.id, e.target.value)
                  }
                  className="flex-1 h-7 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(type.id, category.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Kategorie löschen"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
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
                </button>
              </div>
            ))}

            {/* Add new category */}
            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder="Neue Kategorie..."
                value={newCategoryName[type.id] || ''}
                onChange={(e) =>
                  setNewCategoryName((prev) => ({
                    ...prev,
                    [type.id]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory(type.id);
                  }
                }}
                className="flex-1 h-7 text-sm"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAddCategory(type.id)}
                className="h-7 px-2"
              >
                +
              </Button>
            </div>
          </div>

          {/* Default category selector */}
          {type.categories.length > 0 && (
            <div className="ml-2">
              <Select
                label="Standard-Kategorie"
                value={type.defaultCategoryId || ''}
                onChange={(e) =>
                  handleSetDefaultCategory(
                    type.id,
                    e.target.value || null
                  )
                }
                options={[
                  { value: '', label: 'Keine Standard-Kategorie' },
                  ...type.categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
                ]}
                className="text-sm"
              />
            </div>
          )}

          {/* Show in node view checkbox */}
          <label className="flex items-center gap-2 cursor-pointer ml-2 mt-2">
            <input
              type="checkbox"
              checked={type.showInNodeView ?? false}
              onChange={() => handleToggleShowInNodeView(type.id)}
              className="rounded border-input"
            />
            <span className="text-sm">In Ziel-Übersicht anzeigen</span>
          </label>
        </div>
      ))}

      {/* Add new type */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Neuer Kategorietyp..."
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddType();
            }
          }}
          className="flex-1"
        />
        <Button variant="secondary" onClick={handleAddType}>
          + Typ hinzufügen
        </Button>
      </div>
    </div>
  );
}
