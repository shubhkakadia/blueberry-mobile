import { request } from '@/lib/api';

export interface ChecklistSummary {
  id: number;
  name: string;
  position: number;
  /** Absent until the bridge is rebuilt with the count. */
  openCount?: number;
}

export interface ChecklistItem {
  id: number;
  checklistId: number;
  name: string;
  completed: boolean;
  addedByUserId: number | null;
  addedByUsername: string;
  createdAt: string;
  updatedAt: string;
}

export const checklistApi = {
  list: () => request<{ checklists: ChecklistSummary[] }>('/api/checklists'),
  items: (checklistId: number) =>
    request<{ checklist: ChecklistSummary; items: ChecklistItem[] }>(`/api/checklists/${checklistId}/items`),
  createItem: (checklistId: number, name: string) =>
    request<ChecklistItem>(`/api/checklists/${checklistId}/items`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  setCompleted: (checklistId: number, itemId: number, completed: boolean) =>
    request<ChecklistItem>(`/api/checklists/${checklistId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    }),
  removeItem: (checklistId: number, itemId: number) =>
    request<void>(`/api/checklists/${checklistId}/items/${itemId}`, { method: 'DELETE' }),
};

/**
 * The server's order: still to buy first, then newest first. Optimistic
 * changes sort the same way, so the reload that confirms them moves nothing.
 */
export function byListOrder(a: ChecklistItem, b: ChecklistItem): number {
  return (
    Number(a.completed) - Number(b.completed) ||
    (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0) ||
    b.id - a.id
  );
}

/** The list a phone opens on: the Indian Store if it exists, as on the web. */
export function defaultChecklistId(checklists: ChecklistSummary[]): number | null {
  return (checklists.find((checklist) => checklist.name === 'Indian Store') ?? checklists[0])?.id ?? null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * `today 9:12 am`, `yesterday`, `Mon`, then `12 Oct`. On a list shopped from
 * this week, the date is only worth its width once it is not this week.
 */
export function formatAddedAt(value: string, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown time';
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days <= 0) {
    const hours = date.getHours();
    const time = `${hours % 12 || 12}:${String(date.getMinutes()).padStart(2, '0')} ${hours < 12 ? 'am' : 'pm'}`;
    return `today ${time}`;
  }
  if (days === 1) return 'yesterday';
  if (days < 7) return WEEKDAYS[date.getDay()]!;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}
