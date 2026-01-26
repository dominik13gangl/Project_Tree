import jsPDF from 'jspdf';
import type { Project, TreeNode, TreeNodeWithChildren } from '../../types';
import { buildTree } from '../../utils/tree/traversal';
import { calculateNodeProgress } from '../../utils/tree/progress';
import { PRIORITY_CONFIG } from '../../constants';

export async function exportToPDF(project: Project, nodes: TreeNode[]): Promise<void> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(project.name, margin, y);
  y += 10;

  // Description
  if (project.description) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100);
    const descLines = pdf.splitTextToSize(project.description, pageWidth - 2 * margin);
    pdf.text(descLines, margin, y);
    y += descLines.length * 5 + 5;
  }

  // Export date
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text(`Exported: ${new Date().toLocaleDateString()}`, margin, y);
  y += 15;

  pdf.setTextColor(0);

  // Build tree and render
  const tree = buildTree(nodes);

  const renderNode = (node: TreeNodeWithChildren, depth: number): void => {
    // Check if we need a new page
    if (y > pageHeight - margin - 20) {
      pdf.addPage();
      y = margin;
    }

    const indent = margin + depth * 15;
    const priorityConfig = PRIORITY_CONFIG[node.priority];
    const progress = calculateNodeProgress(nodes, node.id);

    // Status indicator
    const statusColors: Record<string, [number, number, number]> = {
      open: [156, 163, 175],
      in_progress: [245, 158, 11],
      completed: [34, 197, 94],
      blocked: [239, 68, 68],
    };
    const [r, g, b] = statusColors[node.status];
    pdf.setFillColor(r, g, b);
    pdf.circle(indent, y - 1, 2, 'F');

    // Title
    pdf.setFontSize(11);
    pdf.setFont('helvetica', node.status === 'completed' ? 'normal' : 'bold');
    pdf.text(node.title, indent + 5, y);

    // Progress for nodes with children
    if (node.children.length > 0) {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100);
      pdf.text(
        `(${progress.completed}/${progress.total})`,
        indent + 5 + pdf.getTextWidth(node.title) + 3,
        y
      );
      pdf.setTextColor(0);
    }

    y += 5;

    // Description
    if (node.description) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100);
      const descLines = pdf.splitTextToSize(node.description, pageWidth - indent - margin - 10);
      pdf.text(descLines, indent + 5, y);
      y += descLines.length * 4;
      pdf.setTextColor(0);
    }

    // Meta info
    const meta: string[] = [];
    if (node.priority !== 'low') meta.push(`Priority: ${priorityConfig.label}`);
    if (node.estimatedHours) meta.push(`Est: ${node.estimatedHours}h`);
    if (node.dueDate) meta.push(`Due: ${new Date(node.dueDate).toLocaleDateString()}`);

    if (meta.length > 0) {
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(meta.join(' | '), indent + 5, y);
      y += 4;
      pdf.setTextColor(0);
    }

    y += 3;

    // Render children
    node.children.forEach((child) => renderNode(child, depth + 1));
  };

  tree.forEach((root) => renderNode(root, 0));

  // Save
  pdf.save(`${project.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}
