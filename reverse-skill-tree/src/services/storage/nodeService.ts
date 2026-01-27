import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { TreeNode, CreateNodeInput, UpdateNodeInput } from '../../types';

export const nodeService = {
  async getByProjectId(projectId: string): Promise<TreeNode[]> {
    return db.nodes.where('projectId').equals(projectId).toArray();
  },

  async getById(id: string): Promise<TreeNode | undefined> {
    return db.nodes.get(id);
  },

  async getChildren(parentId: string): Promise<TreeNode[]> {
    return db.nodes.where('parentId').equals(parentId).sortBy('order');
  },

  async getRootNodes(projectId: string): Promise<TreeNode[]> {
    return db.nodes
      .where('projectId')
      .equals(projectId)
      .filter((node) => node.parentId === null)
      .sortBy('order');
  },

  async create(input: CreateNodeInput): Promise<TreeNode> {
    const now = new Date();

    // Get the max order for siblings
    const siblings = input.parentId
      ? await this.getChildren(input.parentId)
      : await this.getRootNodes(input.projectId);

    const maxOrder = siblings.length > 0
      ? Math.max(...siblings.map((s) => s.order))
      : -1;

    const node: TreeNode = {
      id: uuidv4(),
      projectId: input.projectId,
      parentId: input.parentId,
      title: input.title,
      description: input.description ?? null,
      notes: input.notes ?? null,
      status: input.status ?? 'open',
      completedAt: null,
      priority: input.priority ?? 'medium',
      estimatedHours: input.estimatedHours ?? null,
      dueDate: input.dueDate ?? null,
      position: input.position ?? { x: 0, y: 0 },
      order: maxOrder + 1,
      isCollapsed: input.isCollapsed ?? false,
      createdAt: now,
      updatedAt: now,
    };

    await db.nodes.add(node);
    return node;
  },

  async update(id: string, input: UpdateNodeInput): Promise<TreeNode | undefined> {
    const node = await db.nodes.get(id);
    if (!node) return undefined;

    const updated: TreeNode = {
      ...node,
      ...input,
      completedAt: input.status === 'completed' && node.status !== 'completed'
        ? new Date()
        : input.status !== 'completed'
          ? null
          : node.completedAt,
      updatedAt: new Date(),
    };

    await db.nodes.put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    // Recursively delete all children
    const children = await this.getChildren(id);
    for (const child of children) {
      await this.delete(child.id);
    }
    await db.nodes.delete(id);
  },

  async moveToParent(id: string, newParentId: string | null): Promise<TreeNode | undefined> {
    const node = await db.nodes.get(id);
    if (!node) return undefined;

    // Get max order in new parent
    const newSiblings = newParentId
      ? await this.getChildren(newParentId)
      : await this.getRootNodes(node.projectId);

    const maxOrder = newSiblings.length > 0
      ? Math.max(...newSiblings.map((s) => s.order))
      : -1;

    return this.update(id, {
      parentId: newParentId,
      order: maxOrder + 1,
    });
  },

  async reorder(id: string, newOrder: number): Promise<void> {
    const node = await db.nodes.get(id);
    if (!node) return;

    const siblings = node.parentId
      ? await this.getChildren(node.parentId)
      : await this.getRootNodes(node.projectId);

    const oldOrder = node.order;

    await db.transaction('rw', db.nodes, async () => {
      for (const sibling of siblings) {
        if (sibling.id === id) continue;

        let newSiblingOrder = sibling.order;
        if (oldOrder < newOrder) {
          // Moving down
          if (sibling.order > oldOrder && sibling.order <= newOrder) {
            newSiblingOrder = sibling.order - 1;
          }
        } else {
          // Moving up
          if (sibling.order >= newOrder && sibling.order < oldOrder) {
            newSiblingOrder = sibling.order + 1;
          }
        }

        if (newSiblingOrder !== sibling.order) {
          await db.nodes.update(sibling.id, { order: newSiblingOrder, updatedAt: new Date() });
        }
      }

      await db.nodes.update(id, { order: newOrder, updatedAt: new Date() });
    });
  },

  async bulkUpdate(nodes: TreeNode[]): Promise<void> {
    await db.nodes.bulkPut(nodes);
  },

  // Repair circular references in a project
  async repairProject(projectId: string): Promise<{ fixed: number; removed: number }> {
    const nodes = await this.getByProjectId(projectId);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    let fixed = 0;
    let removed = 0;

    // Find and fix circular references
    for (const node of nodes) {
      if (!node.parentId) continue;

      // Check for circular reference by walking up the tree
      const visited = new Set<string>();
      let current: TreeNode | undefined = node;
      let hasCircle = false;

      while (current?.parentId) {
        if (visited.has(current.id)) {
          hasCircle = true;
          break;
        }
        visited.add(current.id);
        current = nodeMap.get(current.parentId);
      }

      if (hasCircle) {
        // Fix by setting parentId to null (make it a root node)
        await this.update(node.id, { parentId: null });
        fixed++;
      }

      // Also check if parentId points to non-existent node
      if (node.parentId && !nodeMap.has(node.parentId)) {
        await this.update(node.id, { parentId: null });
        fixed++;
      }
    }

    return { fixed, removed };
  },
};
