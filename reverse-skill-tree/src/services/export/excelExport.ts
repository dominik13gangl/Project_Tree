import * as XLSX from 'xlsx';
import type { Project, TreeNode, TreeNodeWithChildren } from '../../types';
import { projectService, nodeService } from '../storage';
import { buildTree } from '../../utils/tree/traversal';

interface ExcelExportRow {
  Level: number;
  Title: string;
  Description: string;
  Notes: string;
  Status: string;
  Priority: string;
  EstimatedHours: number | null;
  DueDate: string;
  CreatedAt: string;
  UpdatedAt: string;
  CompletedAt: string;
}

interface ExcelProjectInfo {
  Name: string;
  Description: string;
  Color: string;
  Icon: string;
  ExportedAt: string;
  Version: string;
}

export function exportToExcel(project: Project, nodes: TreeNode[]): void {
  const workbook = XLSX.utils.book_new();

  // Project Info Sheet
  const projectInfo: ExcelProjectInfo[] = [
    {
      Name: project.name,
      Description: project.description || '',
      Color: project.color,
      Icon: project.icon || '',
      ExportedAt: new Date().toISOString(),
      Version: '1.0',
    },
  ];
  const projectSheet = XLSX.utils.json_to_sheet(projectInfo);
  XLSX.utils.book_append_sheet(workbook, projectSheet, 'Project');

  // Nodes Sheet - Flatten tree with levels
  const tree = buildTree(nodes);
  const rows: ExcelExportRow[] = [];

  const flattenTree = (node: TreeNodeWithChildren, level: number): void => {
    rows.push({
      Level: level,
      Title: node.title,
      Description: node.description || '',
      Notes: node.notes || '',
      Status: node.status,
      Priority: node.priority,
      EstimatedHours: node.estimatedHours,
      DueDate: node.dueDate ? new Date(node.dueDate).toISOString().split('T')[0] : '',
      CreatedAt: new Date(node.createdAt).toISOString(),
      UpdatedAt: new Date(node.updatedAt).toISOString(),
      CompletedAt: node.completedAt ? new Date(node.completedAt).toISOString() : '',
    });

    node.children.forEach((child) => flattenTree(child, level + 1));
  };

  tree.forEach((rootNode) => flattenTree(rootNode, 0));

  const nodesSheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  nodesSheet['!cols'] = [
    { wch: 6 },   // Level
    { wch: 40 },  // Title
    { wch: 50 },  // Description
    { wch: 50 },  // Notes
    { wch: 12 },  // Status
    { wch: 10 },  // Priority
    { wch: 15 },  // EstimatedHours
    { wch: 12 },  // DueDate
    { wch: 20 },  // CreatedAt
    { wch: 20 },  // UpdatedAt
    { wch: 20 },  // CompletedAt
  ];

  XLSX.utils.book_append_sheet(workbook, nodesSheet, 'Tasks');

  // Download
  const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

export async function importFromExcel(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        // Read Project Info
        const projectSheet = workbook.Sheets['Project'];
        if (!projectSheet) {
          throw new Error('Invalid Excel file: Missing Project sheet');
        }

        const projectData = XLSX.utils.sheet_to_json<ExcelProjectInfo>(projectSheet);
        if (projectData.length === 0) {
          throw new Error('Invalid Excel file: No project data found');
        }

        const projectInfo = projectData[0];

        // Read Tasks
        const tasksSheet = workbook.Sheets['Tasks'];
        if (!tasksSheet) {
          throw new Error('Invalid Excel file: Missing Tasks sheet');
        }

        const tasksData = XLSX.utils.sheet_to_json<ExcelExportRow>(tasksSheet);

        // Create the project
        const project = await projectService.create({
          name: projectInfo.Name + ' (Imported)',
          description: projectInfo.Description || null,
          color: projectInfo.Color || '#3b82f6',
          icon: projectInfo.Icon || null,
        });

        // Build the node tree from the flat structure with levels
        // We need to track parent IDs at each level
        const parentStack: string[] = [];
        let lastLevel = -1;

        for (const row of tasksData) {
          const level = Number(row.Level) || 0;

          // Adjust the parent stack based on the current level
          if (level <= lastLevel) {
            // Pop items from the stack until we're at the right level
            while (parentStack.length > level) {
              parentStack.pop();
            }
          }

          const parentId = level > 0 && parentStack.length > 0 
            ? parentStack[parentStack.length - 1] 
            : null;

          const newNode = await nodeService.create({
            projectId: project.id,
            parentId,
            title: row.Title || 'Untitled',
            description: row.Description || null,
            notes: row.Notes || null,
            status: validateStatus(row.Status),
            priority: validatePriority(row.Priority),
            estimatedHours: row.EstimatedHours || null,
            dueDate: row.DueDate ? new Date(row.DueDate) : null,
            position: { x: 0, y: 0 },
            order: 0,
            isCollapsed: false,
          });

          // Push the new node's ID onto the stack for potential children
          parentStack.push(newNode.id);
          lastLevel = level;
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function validateStatus(status: string): 'open' | 'in_progress' | 'completed' | 'blocked' {
  const validStatuses = ['open', 'in_progress', 'completed', 'blocked'];
  return validStatuses.includes(status) ? (status as 'open' | 'in_progress' | 'completed' | 'blocked') : 'open';
}

function validatePriority(priority: string): 'low' | 'medium' | 'high' | 'critical' {
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  return validPriorities.includes(priority) ? (priority as 'low' | 'medium' | 'high' | 'critical') : 'medium';
}
