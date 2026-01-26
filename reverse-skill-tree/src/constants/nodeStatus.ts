import type { NodeStatus } from '../types';

export const NODE_STATUS_CONFIG: Record<NodeStatus, { label: string; color: string; bgColor: string }> = {
  open: {
    label: 'Open',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  blocked: {
    label: 'Blocked',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

export const NODE_STATUS_OPTIONS = Object.entries(NODE_STATUS_CONFIG).map(([value, config]) => ({
  value: value as NodeStatus,
  label: config.label,
}));
