import { request } from '@/lib/api';

/** Only what Aircon · Now reads; the timers module (M4) fills in the rest. */
export interface Schedule {
  id: number;
  name: string;
  enabled: boolean;
  nextTransition: {
    transition: 'start' | 'stop';
    date: string;
    time: string;
    inDays: number;
  } | null;
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const schedulesApi = {
  list: () => request<{ timeZone: string; schedules: Schedule[] }>('/api/schedules'),
};

export function describeNextRun(schedule: Schedule): string {
  if (!schedule.enabled) return 'disabled';
  if (!schedule.nextTransition) return 'no next transition';
  const { transition, date, inDays, time } = schedule.nextTransition;
  const verb = transition === 'start' ? 'starts' : 'stops';
  const at = formatClock(time);
  if (inDays === 0) return `${verb} at ${at} today`;
  if (inDays === 1) return `${verb} at ${at} tomorrow`;
  return `${verb} ${DAY_NAMES[new Date(date + 'T00:00:00').getDay()]} at ${at}`;
}

/** `17:30` becomes `5:30 pm`, which is how the house says a time. */
export function formatClock(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (hours === undefined || minutes === undefined || Number.isNaN(hours)) return time;
  const suffix = hours < 12 ? 'am' : 'pm';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}
