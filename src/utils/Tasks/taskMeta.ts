import type { Task } from '../../types';

export type TaskStatus = Task['status'];
export const TASKS_UPDATED_EVENT = 'careerhub:tasks-updated';

export const STATUS_META: Array<{ key: TaskStatus; label: string; color: string }> = [
  { key: 'TODO', label: 'To Do', color: 'default' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'processing' },
  { key: 'DONE', label: 'Done', color: 'success' },
];

export const PRIORITY_COLOR: Record<Task['priority'], string> = {
  LOW: 'green',
  MEDIUM: 'gold',
  HIGH: 'red',
};
