import { request } from '@/lib/api';

export interface Dish {
  id: number;
  name: string;
  createdByUserId: number | null;
  createdByUsername: string;
  createdAt: string;
  updatedAt: string;
}

export interface DinnerDay {
  /** 0 = Monday .. 6 = Sunday. */
  dayOffset: number;
  date: string;
  /** Null once the chosen dish has been removed from the library. */
  dishId: number | null;
  /** Snapshot taken when the dish was chosen, so history survives a deletion. */
  dishName: string | null;
  dishSetByUserId: number | null;
  dishSetByUsername: string | null;
  dishSetAt: string | null;
  notes: string | null;
  notesSetByUserId: number | null;
  notesSetByUsername: string | null;
  notesSetAt: string | null;
}

export interface DinnerWeek {
  timeZone: string;
  weekStartDate: string;
  currentWeekStart: string;
  previousWeekStart: string;
  /** Null on the current week - there is no forward navigation past today. */
  nextWeekStart: string | null;
  days: DinnerDay[];
}

export const dineApi = {
  dishes: () => request<{ dishes: Dish[] }>('/api/dishes'),
  createDish: (name: string) => request<Dish>('/api/dishes', { method: 'POST', body: JSON.stringify({ name }) }),
  renameDish: (id: number, name: string) =>
    request<Dish>(`/api/dishes/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  removeDish: (id: number) => request<void>(`/api/dishes/${id}`, { method: 'DELETE' }),

  /** Omit `week` for the current week. */
  week: (week?: string) =>
    request<DinnerWeek>(week ? `/api/dinner-menu?week=${encodeURIComponent(week)}` : '/api/dinner-menu'),
  setDayDish: (weekStart: string, dayOffset: number, dishId: number | null) =>
    request<DinnerDay>(`/api/dinner-menu/${weekStart}/days/${dayOffset}`, {
      method: 'PATCH',
      body: JSON.stringify({ dishId }),
    }),
  setDayNotes: (weekStart: string, dayOffset: number, notes: string) =>
    request<DinnerDay>(`/api/dinner-menu/${weekStart}/days/${dayOffset}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * `new Date('2026-08-04')` is parsed as UTC midnight, which renders as the day
 * before anywhere west of Greenwich. Build the local date explicitly instead.
 */
export function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export const formatWeekday = (date: Date) => WEEKDAYS[date.getDay()]!;

/** `This week`, `Last week`, `3 weeks ago`. */
export function weekLabel(week: Pick<DinnerWeek, 'currentWeekStart' | 'weekStartDate'>): string {
  const weeks = Math.round(
    (Date.parse(`${week.currentWeekStart}T00:00:00Z`) - Date.parse(`${week.weekStartDate}T00:00:00Z`)) /
      (7 * 86_400_000),
  );
  if (weeks <= 0) return 'This week';
  if (weeks === 1) return 'Last week';
  return `${weeks} weeks ago`;
}

/** `19 – 25 Oct`, or `28 Sep – 4 Oct` across a month boundary. */
export function formatWeekRange(days: Pick<DinnerDay, 'date'>[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return '';
  const start = parseLocalDate(first.date);
  const end = parseLocalDate(last.date);
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()} – ${end.getDate()} ${MONTHS[end.getMonth()]}`
    : `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]}`;
}

/** Today in the home's zone, not the phone's, so "Today" matches the server. */
export function todayInZone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
      new Date(),
    );
  } catch {
    // An engine without time zone data: the phone's own date is right for a phone at home.
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}
