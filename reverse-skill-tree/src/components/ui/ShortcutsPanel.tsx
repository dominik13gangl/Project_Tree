import { useState } from 'react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Node Actions
  { keys: ['E'], description: 'Status auf Erledigt/Offen umschalten', category: 'Aktionen' },
  { keys: ['Entf'], description: 'Ausgewähltes Ziel löschen', category: 'Aktionen' },
  { keys: ['Strg', 'S'], description: 'Änderungen im Editor speichern', category: 'Aktionen' },
  
  // Horizontal Movement
  { keys: ['←'], description: 'Mit linkem Nachbarn tauschen', category: 'Verschieben' },
  { keys: ['→'], description: 'Mit rechtem Nachbarn tauschen', category: 'Verschieben' },
  
  // Vertical Movement
  { keys: ['↑'], description: 'Eine Ebene nach oben verschieben', category: 'Verschieben' },
  { keys: ['↓'], description: 'Unter linken Nachbarn verschieben', category: 'Verschieben' },
  
  // Full Swap (with children)
  { keys: ['Strg', '←'], description: 'Vollständig mit linkem Nachbarn tauschen (inkl. Unterziele)', category: 'Tauschen' },
  { keys: ['Strg', '→'], description: 'Vollständig mit rechtem Nachbarn tauschen (inkl. Unterziele)', category: 'Tauschen' },
  { keys: ['Strg', '↑'], description: 'Mit Elternziel tauschen (inkl. Unterziele)', category: 'Tauschen' },
  { keys: ['Strg', '↓'], description: 'Mit erstem Unterziel tauschen', category: 'Tauschen' },
];

export function ShortcutsPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const categories = [...new Set(shortcuts.map(s => s.category))];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white shadow-lg flex items-center justify-center transition-all"
        title="Tastaturkürzel anzeigen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.001" />
          <path d="M10 8h.001" />
          <path d="M14 8h.001" />
          <path d="M18 8h.001" />
          <path d="M6 12h.001" />
          <path d="M10 12h.001" />
          <path d="M14 12h.001" />
          <path d="M18 12h.001" />
          <path d="M8 16h8" />
        </svg>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-3 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Tastaturkürzel</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto p-2">
            {categories.map(category => (
              <div key={category} className="mb-3">
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-2">
                  {category}
                </h4>
                <div className="space-y-1">
                  {shortcuts
                    .filter(s => s.category === category)
                    .map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, kidx) => (
                            <span key={kidx}>
                              <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-200 dark:bg-slate-600 rounded border border-slate-300 dark:border-slate-500">
                                {key}
                              </kbd>
                              {kidx < shortcut.keys.length - 1 && (
                                <span className="text-slate-400 mx-0.5">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-2 bg-slate-50 dark:bg-slate-750 border-t border-slate-200 dark:border-slate-600">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
              Ziel muss ausgewählt sein • Nicht in Textfeldern
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
