export type NodeStatus = 'open' | 'in_progress' | 'completed' | 'blocked';
export type NodePriority = 'low' | 'medium' | 'high' | 'critical';

export interface TreeNode {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  status: NodeStatus;
  completedAt: Date | null;
  priority: NodePriority;
  estimatedHours: number | null;
  dueDate: Date | null;
  position: { x: number; y: number };
  order: number;
  isCollapsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreeNodeWithChildren extends TreeNode {
  children: TreeNodeWithChildren[];
}

export interface NodeProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface CreateNodeInput {
  projectId: string;
  parentId: string | null;
  title: string;
  description?: string | null;
  notes?: string | null;
  status?: NodeStatus;
  priority?: NodePriority;
  estimatedHours?: number | null;
  dueDate?: Date | null;
  position?: { x: number; y: number };
  order?: number;
  isCollapsed?: boolean;
}

export interface UpdateNodeInput {
  parentId?: string | null;
  title?: string;
  description?: string | null;
  notes?: string | null;
  status?: NodeStatus;
  priority?: NodePriority;
  estimatedHours?: number | null;
  dueDate?: Date | null;
  position?: { x: number; y: number };
  order?: number;
  isCollapsed?: boolean;
}
