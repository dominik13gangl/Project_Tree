import type { NodeStatus } from '../types';

export const NODE_STATUS_CONFIG: Record<NodeStatus, {
  label: string;
  color: string;
  bgColor: string;
  nodeBg: string;
  nodeText: string;
}> = {
  open: {
    label: 'Offen',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    nodeBg: 'bg-white',
    nodeText: 'text-gray-800',
  },
  in_progress: {
    label: 'In Bearbeitung',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    nodeBg: 'bg-amber-50',
    nodeText: 'text-amber-900',
  },
  completed: {
    label: 'Erledigt',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    nodeBg: 'bg-green-500',
    nodeText: 'text-white',
  },
  blocked: {
    label: 'Blockiert',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    nodeBg: 'bg-red-100',
    nodeText: 'text-red-900',
  },
};

export const NODE_STATUS_OPTIONS = Object.entries(NODE_STATUS_CONFIG).map(([value, config]) => ({
  value: value as NodeStatus,
  label: config.label,
}));
