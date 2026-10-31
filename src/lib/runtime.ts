import { request } from '@/lib/api';

export type RuntimeSource = 'manual' | 'schedule' | 'manual_schedule' | 'external' | 'recovery';

export interface RuntimeActor {
  source: RuntimeSource;
  userId?: number;
  username?: string;
  scheduleId?: number;
  scheduleName?: string;
  inferred?: boolean;
}

export interface RuntimeConfiguration {
  ac: { number: number; power: string; mode: string; fanSpeed: string; targetSetpoint: number; temperature: number | null };
  zone: {
    number: number;
    name: string;
    power: string;
    openPercentage: number;
    temperatureControlled: boolean;
    targetSetpoint: number;
    temperature: number | null;
  };
}

export interface RuntimeSummary {
  zoneNumber: number;
  zoneName: string;
  totalSeconds: number;
  formattedDuration: string;
  sessionCount: number;
  percentageShare: number;
}

/**
 * How much of the period each person or schedule set going. Aggregated over the
 * whole range on the server, so paging the timeline does not move the shares.
 */
export interface RuntimeActorSummary {
  key: string;
  label: string;
  source: RuntimeSource;
  totalSeconds: number;
  formattedDuration: string;
  sessionCount: number;
  percentageShare: number;
}

export interface RuntimeSession {
  id: number;
  zoneNumber: number;
  zoneName: string;
  startedAt: string;
  endedAt: string | null;
  lastObservedAt: string;
  startActor: RuntimeActor;
  endActor: RuntimeActor | null;
  startConfiguration: RuntimeConfiguration;
  endConfiguration: RuntimeConfiguration | null;
  endReason: string | null;
  inferred: boolean;
  status: 'running' | 'completed';
  durationSeconds: number;
  formattedDuration: string;
}

export interface RuntimeResponse {
  timeZone: string;
  from: string;
  to: string;
  total: number;
  limit: number;
  offset: number;
  summaries: RuntimeSummary[];
  actors: RuntimeActorSummary[];
  sessions: RuntimeSession[];
}

export type RuntimePreset = 'today' | '7d' | '30d' | 'all';
export type RuntimeRange = RuntimePreset | 'custom';

export interface RuntimeQuery {
  preset?: RuntimePreset;
  from?: string;
  to?: string;
  zone?: number;
  limit?: number;
  offset?: number;
}

export function fetchRuntime(query: RuntimeQuery): Promise<RuntimeResponse> {
  const params = [`limit=${query.limit ?? 30}`, `offset=${query.offset ?? 0}`];
  if (query.preset) params.push(`preset=${query.preset}`);
  if (query.from) params.push(`from=${encodeURIComponent(query.from)}`);
  if (query.to) params.push(`to=${encodeURIComponent(query.to)}`);
  if (query.zone !== undefined) params.push(`zone=${query.zone}`);
  return request<RuntimeResponse>(`/api/zone-runtime?${params.join('&')}`);
}

export const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All time' },
] as const satisfies readonly { value: RuntimePreset; label: string }[];

/** How a range reads mid-sentence: "Total airflow, last 7 days". */
export const PRESET_LABELS: Record<RuntimePreset, string> = {
  today: 'today',
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  all: 'all time',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** `2026-10-31` as `31 Oct`. */
export function shortDate(value: string): string {
  const [, month, day] = value.split('-').map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]}`;
}

export function localDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** The API's `to` is exclusive, so an inclusive end date has to be advanced. */
export function nextDateInput(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * `6900` seconds becomes `1 h 55 m`; `2700` is `45 m`. Past 100 hours the
 * minutes stop meaning anything, so it is whole hours: `1,520 h`.
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes === 0) return seconds > 0 ? '<1 m' : '0 m';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 100) return `${Math.round(seconds / 3600).toLocaleString('en-AU')} h`;
  if (hours === 0) return `${rest} m`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} m`;
}

/** How a room's or the whole period's airflow reads, zero included. */
export const airflow = (seconds: number) => (seconds > 0 ? formatDuration(seconds) : 'No airflow');

/** Initials for an avatar: `Wall controller` becomes `WC`, `priya` `PR`. */
export function initialsFor(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

/**
 * Every room the console knows, busiest first. Rooms with no airflow in the
 * period still get a row - "No airflow" is an answer, and leaving them out
 * reads as a room that has gone missing.
 */
export function roomTotals(
  summaries: { zoneNumber: number; zoneName: string; totalSeconds: number }[],
  zones: { number: number; name: string }[],
) {
  const seen = new Set(summaries.map((summary) => summary.zoneNumber));
  return [
    ...summaries
      .map((summary) => ({ zoneNumber: summary.zoneNumber, name: summary.zoneName, seconds: summary.totalSeconds }))
      .sort((a, b) => b.seconds - a.seconds),
    ...zones
      .filter((zone) => !seen.has(zone.number))
      .map((zone) => ({ zoneNumber: zone.number, name: zone.name, seconds: 0 })),
  ];
}

// --- Timeline -----------------------------------------------------------------

/** Wall-clock parts of an instant in the home's zone; the phone's own clock if the engine has no zone data. */
function zoneParts(instant: number, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(instant));
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
  } catch {
    const date = new Date(instant);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
    };
  }
}

/** The home's calendar day, so headings match the data rather than the phone. */
export function dayKey(instant: number, timeZone: string): string {
  const { year, month, day } = zoneParts(instant, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** `1:10 pm`, in the home's time zone. */
export function clock(instant: number, timeZone: string): string {
  const { hour, minute } = zoneParts(instant, timeZone);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
}

/** `Today · Thu 22 Oct`, `Yesterday · Wed 21 Oct`, `Tue 20 Oct`. */
export function dayLabel(key: string, todayKey: string): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  const label = `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  if (key === todayKey) return `Today · ${label}`;
  const yesterday = new Date(Date.parse(`${todayKey}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  return key === yesterday ? `Yesterday · ${label}` : label;
}

/** Sessions this close together, from the same source, are one run. */
const SAME_RUN_MS = 60_000;

export interface Run {
  key: string;
  sessions: RuntimeSession[];
  start: number;
  end: number | null;
  durationSeconds: number;
}

export interface Day {
  key: string;
  runs: Run[];
}

function actorKey(actor: RuntimeActor): string {
  return `${actor.source}:${actor.userId ?? ''}:${actor.scheduleId ?? ''}`;
}

/**
 * Splits the page into the home's days and folds rooms that ran together into
 * one row. The bridge records a session per room; the house thinks of "the
 * evening timer ran Living, Kitchen and Master bed".
 */
export function groupByDay(sessions: RuntimeSession[], timeZone: string): Day[] {
  const days: Day[] = [];
  for (const session of sessions) {
    const start = Date.parse(session.startedAt);
    const end = session.status === 'running' || !session.endedAt ? null : Date.parse(session.endedAt);
    const key = dayKey(start, timeZone);
    let day = days.find((item) => item.key === key);
    if (!day) {
      day = { key, runs: [] };
      days.push(day);
    }
    const run = day.runs.find(
      (candidate) =>
        actorKey(candidate.sessions[0]!.startActor) === actorKey(session.startActor) &&
        Math.abs(candidate.start - start) <= SAME_RUN_MS &&
        (candidate.end === null || end === null ? candidate.end === end : Math.abs(candidate.end - end) <= SAME_RUN_MS),
    );
    if (run) {
      run.sessions.push(session);
      run.start = Math.min(run.start, start);
      if (run.end !== null && end !== null) run.end = Math.max(run.end, end);
      run.durationSeconds = Math.max(run.durationSeconds, session.durationSeconds);
    } else {
      day.runs.push({ key: `run-${session.id}`, sessions: [session], start, end, durationSeconds: session.durationSeconds });
    }
  }
  return days;
}

export function tagLabel(actor: RuntimeActor): string {
  switch (actor.source) {
    case 'manual':
      return actor.username ?? 'Someone at home';
    case 'schedule':
    case 'manual_schedule':
      return actor.scheduleName ?? 'Timer';
    case 'external':
      return 'Console';
    case 'recovery':
      return 'Inferred';
  }
}

/** Only the endings worth a line of their own; ordinary stops say nothing. */
const INTERRUPTIONS: Record<string, string> = {
  disconnected: 'Connection lost',
  zone_unavailable: 'Room became unavailable',
  process_interrupted: 'Monitoring was interrupted',
};

/** The one thing worth saying about a run beyond who started it. */
export function noteFor(run: Run): string | null {
  const notes: string[] = [];
  const start = run.sessions[0]!.startActor;
  const end = run.sessions.find((session) => session.endActor)?.endActor;
  const timer = start.source === 'schedule' || start.source === 'manual_schedule';

  if (run.end === null) notes.push('Running now');
  if (start.source === 'manual_schedule' && start.username) notes.push(`Started by ${start.username}`);
  if (timer && end?.source === 'manual' && end.username) notes.push(`Stopped early by ${end.username}`);
  else if (timer && end?.source === 'external') notes.push('Stopped at the console');
  const interruption = run.sessions
    .map((session) => (session.endReason ? INTERRUPTIONS[session.endReason] : undefined))
    .find(Boolean);
  if (interruption) notes.push(interruption);
  return notes.length ? notes.join(' · ') : null;
}
