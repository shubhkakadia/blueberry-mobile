import { request } from '@/lib/api';

export type TimerTransition = 'start' | 'stop';

export interface SchedulePayload {
  mode?: string;
  fanSpeed?: string;
  setpoint?: number;
}

export interface Schedule {
  id: number;
  name: string;
  enabled: boolean;
  days: number;
  startTime: string;
  stopTime: string;
  acNumber: number;
  zones: number[];
  payload: SchedulePayload;
  lastRunAt: string | null;
  nextTransition: {
    transition: TimerTransition;
    date: string;
    time: string;
    inDays: number;
  } | null;
}

export interface ScheduleRun {
  id: number;
  transition: TimerTransition;
  ranAt: string;
  status: 'ok' | 'error';
  detail: string | null;
}

export interface ScheduleInput {
  name: string;
  days: number;
  startTime: string;
  stopTime: string;
  zones: number[];
  enabled?: boolean;
  payload?: SchedulePayload;
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const EVERY_DAY = 0b1111111;
export const WEEKDAYS = 0b0111110;
export const WEEKENDS = 0b1000001;

/** Monday first, as the house reads a week. Values are `days` bit indexes. */
export const WEEK = [
  { bit: 1, letter: 'M', name: 'Monday' },
  { bit: 2, letter: 'T', name: 'Tuesday' },
  { bit: 3, letter: 'W', name: 'Wednesday' },
  { bit: 4, letter: 'T', name: 'Thursday' },
  { bit: 5, letter: 'F', name: 'Friday' },
  { bit: 6, letter: 'S', name: 'Saturday' },
  { bit: 0, letter: 'S', name: 'Sunday' },
] as const;

export const schedulesApi = {
  list: () => request<{ timeZone: string; schedules: Schedule[] }>('/api/schedules'),
  create: (input: ScheduleInput) =>
    request<Schedule>('/api/schedules', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: number, changes: Partial<ScheduleInput>) =>
    request<Schedule>(`/api/schedules/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
  remove: (id: number) => request<void>(`/api/schedules/${id}`, { method: 'DELETE' }),
  runNow: (id: number, transition: TimerTransition) =>
    request<{ schedule: Schedule; lastRun: ScheduleRun | null }>(`/api/schedules/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({ transition }),
    }),
  runs: (id: number) => request<ScheduleRun[]>(`/api/schedules/${id}/runs`),
};

export function describeDays(days: number): string {
  if (days === EVERY_DAY) return 'Every day';
  if (days === WEEKDAYS) return 'Weekdays';
  if (days === WEEKENDS) return 'Weekends';
  return DAY_NAMES.filter((_, index) => (days & (1 << index)) !== 0).join(', ');
}

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

// --- Overlaps -----------------------------------------------------------------

const DAY_MINUTES = 24 * 60;
const WEEK_MINUTES = 7 * DAY_MINUTES;

function minutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (mins ?? 0);
}

/** Every stretch of the week a timer covers, as [start, end) minutes. */
function weeklyWindows(schedule: Pick<Schedule, 'days' | 'startTime' | 'stopTime'>): [number, number][] {
  const start = minutes(schedule.startTime);
  const stop = minutes(schedule.stopTime);
  const length = stop > start ? stop - start : DAY_MINUTES - start + stop;
  const windows: [number, number][] = [];
  for (let day = 0; day < 7; day++) {
    if ((schedule.days & (1 << day)) === 0) continue;
    const from = day * DAY_MINUTES + start;
    const to = from + length;
    // An overnight Saturday run spills into Sunday morning, which is the
    // start of the week again.
    if (to <= WEEK_MINUTES) windows.push([from, to]);
    else windows.push([from, WEEK_MINUTES], [0, to - WEEK_MINUTES]);
  }
  return windows;
}

function clock(totalMinutes: number): string {
  const inDay = totalMinutes % DAY_MINUTES;
  return formatClock(`${Math.floor(inDay / 60)}:${String(inDay % 60).padStart(2, '0')}`);
}

/**
 * Pairs of switched-on timers that run at the same time. The scheduler merges
 * their rooms while both are active, which is worth saying out loud before it
 * surprises someone.
 */
export function findOverlaps(
  schedules: Pick<Schedule, 'name' | 'enabled' | 'days' | 'startTime' | 'stopTime'>[],
): { a: string; b: string; from: string; to: string }[] {
  const enabled = schedules.filter((schedule) => schedule.enabled);
  const found: { a: string; b: string; from: string; to: string }[] = [];
  for (let i = 0; i < enabled.length; i++) {
    for (let j = i + 1; j < enabled.length; j++) {
      const first = enabled[i]!;
      const second = enabled[j]!;
      let shared: [number, number] | null = null;
      for (const [aFrom, aTo] of weeklyWindows(first)) {
        for (const [bFrom, bTo] of weeklyWindows(second)) {
          const from = Math.max(aFrom, bFrom);
          const to = Math.min(aTo, bTo);
          if (from < to) {
            shared = [from, to];
            break;
          }
        }
        if (shared) break;
      }
      if (shared) found.push({ a: first.name, b: second.name, from: clock(shared[0]), to: clock(shared[1]) });
    }
  }
  return found;
}
