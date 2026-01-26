import type { Project, TreeNode } from '../../types';
import { projectService, nodeService } from '../storage';

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
        const newProjectId = crypto.randomUUID();
        idMap.set(data.project.id, newProjectId);

        // Create the project
        const project = await projectService.create({
          name: data.project.name + ' (Imported)',
          description: data.project.description,
          color: data.project.color,
          icon: data.project.icon,
          settings: data.project.settings,
        });

        // Create nodes with new IDs
        for (const node of data.nodes) {
          const newNodeId = crypto.randomUUID();
          idMap.set(node.id, newNodeId);
        }

        // Create nodes in order (parents first)
        const sortedNodes = sortNodesByDepth(data.nodes);
        for (const node of sortedNodes) {
          await nodeService.create({
            projectId: project.id,
            parentId: node.parentId ? idMap.get(node.parentId) || null : null,
            title: node.title,
            description: node.description,
            notes: node.notes,
            status: node.status,
            priority: node.priority,
            estimatedHours: node.estimatedHours,
            dueDate: node.dueDate ? new Date(node.dueDate) : null,
            position: node.position,
            order: node.order,
            isCollapsed: node.isCollapsed,
          });
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function sortNodesByDepth(nodes: TreeNode[]): TreeNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const depths = new Map<string, number>();

  const getDepth = (nodeId: string): number => {
    if (depths.has(nodeId)) return depths.get(nodeId)!;

    const node = nodeMap.get(nodeId);
    if (!node || !node.parentId) {
      depths.set(nodeId, 0);
      return 0;
    }

    const depth = getDepth(node.parentId) + 1;
    depths.set(nodeId, depth);
    return depth;
  };

  nodes.forEach((n) => getDepth(n.id));

  return [...nodes].sort((a, b) => {
    const depthA = depths.get(a.id) || 0;
    const depthB = depths.get(b.id) || 0;
    return depthA - depthB;
  });
}
