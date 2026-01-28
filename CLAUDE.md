# CLAUDE.md - Project Tree

## Project Overview

Project Tree ("Reverse Skill Tree") is a client-side web application for hierarchical project/goal management. Users create projects, break goals into nested sub-goals of arbitrary depth, and track progress bottom-up — child completion automatically rolls up to parent nodes.

**Key domain concepts:** Projects contain tree-structured nodes. Each node has a status (open, in_progress, completed, blocked), priority (low, medium, high, critical), optional estimated hours, and due date. Parent nodes auto-complete when all children are done.

The UI language is **German** (labels like "Offen", "Erledigt", "In Bearbeitung").

## Tech Stack

- **React 19** with **TypeScript ~5.9** (strict mode)
- **Vite 7** — build tool and dev server
- **Zustand 5** — state management (4 stores)
- **@xyflow/react 12** + **dagre** — tree visualization and graph layout
- **Dexie.js 4** — IndexedDB wrapper (client-side database, no backend)
- **Tailwind CSS 4** — utility-first styling
- **@dnd-kit** — drag and drop
- **xlsx / jspdf / html2canvas** — export to Excel, PDF, JSON

## Commands

All commands run from the `reverse-skill-tree/` directory:

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
npm run build        # TypeScript check + Vite production build (tsc -b && vite build)
npm run lint         # ESLint across the project
npm run preview      # Preview production build locally
```

**There is no test suite.** No testing framework is configured.

## Project Structure

```
reverse-skill-tree/
└── src/
    ├── main.tsx, App.tsx          # Entry points
    ├── index.css                  # Global styles + Tailwind
    ├── components/
    │   ├── ui/                    # Reusable primitives (Button, Input, Dialog, Badge, Select, etc.)
    │   ├── layout/                # Header, MainLayout
    │   ├── tree/                  # TreeCanvas, TreeNode, TreeControls (xyflow-based)
    │   ├── nodes/                 # NodeEditor, NodeProgress
    │   └── projects/              # ProjectCard, ProjectList, ProjectDialog
    ├── stores/                    # Zustand stores
    │   ├── treeStore.ts           # Node CRUD, layout, selection, collapse state
    │   ├── projectStore.ts        # Project CRUD, current project
    │   ├── uiStore.ts             # Sidebar, editor panels, context menus
    │   └── filterStore.ts         # Status/priority/search filters
    ├── services/
    │   ├── storage/               # Dexie database operations (nodeService, projectService)
    │   ├── export/                # JSON, Excel, PDF export/import
    │   └── backup/                # Auto-backup management (localStorage)
    ├── types/                     # TypeScript interfaces (node.ts, project.ts)
    ├── constants/                 # Colors, status config, priority config
    ├── utils/tree/                # Tree algorithms (layout, progress, traversal, buildTree)
    ├── hooks/                     # Custom hooks (useAutoBackup)
    └── assets/                    # Static assets
```

Barrel exports (`index.ts`) are used throughout — import from the folder, not individual files.

## Architecture & Data Flow

```
UI Components → Zustand Stores → Services → Dexie (IndexedDB)
                                           → localStorage (backups)
```

- **Stores** hold app state and expose actions. Components subscribe via hooks (`useTreeStore`, `useProjectStore`, etc.).
- **Services** encapsulate database operations and business logic. Never call Dexie directly from components.
- **Tree algorithms** (`utils/tree/`) handle layout calculation (dagre), progress aggregation, depth computation, and flat-to-nested conversion.

### Database (Dexie/IndexedDB)

Two tables: `projects` and `nodes`. Key indexed fields on nodes: `projectId`, `parentId`, `status`, `priority`, `order`, `createdAt`, `updatedAt`.

### Auto-Complete Logic

When a node is marked completed, the system checks if all siblings are also completed. If so, the parent auto-completes recursively upward.

## Code Conventions

### Naming
- **Components & types**: PascalCase (`TreeNode`, `ProjectCard`)
- **Functions, variables, hooks**: camelCase (`createNode`, `useAutoBackup`)
- **Files**: PascalCase for components, camelCase for utilities/services

### Component Patterns
- Functional components with hooks; `memo()` for performance-critical components
- `forwardRef` for UI primitives that need ref forwarding
- Props defined via TypeScript interfaces

### Store Pattern (Zustand)
```typescript
export const useStore = create<StateType>((set, get) => ({
  // state
  items: [],
  // actions
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  // derived
  getItem: (id) => get().items.find(i => i.id === id),
}));
```

### Styling
- Tailwind CSS utility classes in JSX
- Variant-based styling via object maps
- Depth-based color coding for tree nodes (blue -> purple -> teal -> slate)
- Custom color system using CSS variables in `index.css`

### TypeScript
- Strict mode enabled; avoid `any`
- All data structures have explicit interfaces in `src/types/`
- Core types: `TreeNode`, `TreeNodeWithChildren`, `NodeProgress`, `Project`, `ProjectSettings`
- Status union: `'open' | 'in_progress' | 'completed' | 'blocked'`
- Priority union: `'low' | 'medium' | 'high' | 'critical'`

## Key Files for Common Tasks

| Task | Key files |
|------|-----------|
| Add/modify a tree node feature | `types/node.ts`, `stores/treeStore.ts`, `services/storage/nodeService.ts`, `components/tree/TreeNode.tsx` |
| Change tree layout/visualization | `utils/tree/layout.ts`, `components/tree/TreeCanvas.tsx` |
| Add a new UI component | `components/ui/` (follow existing patterns, add to barrel export) |
| Modify project settings | `types/project.ts`, `stores/projectStore.ts`, `services/storage/projectService.ts` |
| Add export format | `services/export/` |
| Change database schema | `services/storage/db.ts` (Dexie schema versioning required) |
| Modify keyboard shortcuts | `components/tree/TreeCanvas.tsx` (keyboard handler section) |
| Update status/priority options | `constants/nodeStatus.ts`, `constants/priorities.ts` |

## Important Notes

- **No backend** — everything runs client-side with IndexedDB and localStorage.
- **No tests** — validate changes via `npm run build` (includes TypeScript type checking) and `npm run lint`.
- **German UI labels** — status and priority labels are in German. Keep this consistent.
- **Backups in localStorage** — stored as `project_backup_{projectId}_{timestamp}`.
- IDs are generated with the `uuid` library.
- The app uses React 19 features — be aware of concurrent rendering semantics.
