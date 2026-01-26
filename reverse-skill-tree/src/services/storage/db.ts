import Dexie, { type EntityTable } from 'dexie';
import type { TreeNode, Project } from '../../types';

const db = new Dexie('ReverseSkillTreeDB') as Dexie & {
  projects: EntityTable<Project, 'id'>;
  nodes: EntityTable<TreeNode, 'id'>;
};

db.version(1).stores({
  projects: 'id, name, isArchived, createdAt, updatedAt',
  nodes: 'id, projectId, parentId, status, priority, order, createdAt, updatedAt',
});

export { db };
