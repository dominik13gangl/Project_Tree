import type { NodePriority } from '../types';

export const PRIORITY_CONFIG: Record<NodePriority, { label: string; color: string; bgColor: string; order: number }> = {
  low: {
    label: 'Low',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    order: 0,
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-500',
    bgColor: 'bg-amber-100',
    order: 1,
  },
  high: {
    label: 'High',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100',
    order: 2,
  },
  critical: {
    label: 'Critical',
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    order: 3,
  },
};

export const PRIORITY_OPTIONS = Object.entries(PRIORITY_CONFIG)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([value, config]) => ({
    value: value as NodePriority,
    label: config.label,
  }));
