import type { Project, TreeNode } from '../../types';
import { projectService } from '../storage';
import { db } from '../storage/db';
import { v4 as uuidv4 } from 'uuid';

interface ExportData {
  version: string;
  exportedAt: string;
  project: Project;
  nodes: TreeNode[];
}

export function exportToJSON(project: Project, nodes: TreeNode[]): void {
  const data: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    project,
    nodes,
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importFromJSON(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json) as ExportData;

        if (!data.version || !data.project || !data.nodes) {
          throw new Error('Invalid file format');
        }

        // Generate new IDs to avoid conflicts
        const idMap = new Map<string, string>();
        
        // Create new project ID
        const newProjectId = uuidv4();
        idMap.set(data.project.id, newProjectId);

        // Create the project
        const project = await projectService.create({
          name: data.project.name + ' (Imported)',
          description: data.project.description,
          color: data.project.color,
          icon: data.project.icon,
          settings: data.project.settings,
        });

        // Generate new IDs for all nodes first
        for (const node of data.nodes) {
          idMap.set(node.id, uuidv4());
        }

        // Create nodes with exact values - bypass nodeService.create to preserve order/position
        const now = new Date();
        const nodesToInsert: TreeNode[] = data.nodes.map((node) => ({
          id: idMap.get(node.id)!,
          projectId: project.id,
          parentId: node.parentId ? idMap.get(node.parentId) || null : null,
          title: node.title,
          description: node.description,
          notes: node.notes,
          status: node.status,
          completedAt: node.completedAt ? new Date(node.completedAt) : null,
          priority: node.priority,
          estimatedHours: node.estimatedHours,
          dueDate: node.dueDate ? new Date(node.dueDate) : null,
          position: node.position,
          order: node.order,
          isCollapsed: node.isCollapsed,
          categories: node.categories ?? {},
          createdAt: node.createdAt ? new Date(node.createdAt) : now,
          updatedAt: now,
        }));

        // Bulk insert all nodes at once
        await db.nodes.bulkAdd(nodesToInsert);

        resolve();
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
