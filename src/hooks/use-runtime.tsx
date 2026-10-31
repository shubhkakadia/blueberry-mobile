import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import {
  fetchRuntime,
  localDateInput,
  nextDateInput,
  PRESET_LABELS,
  shortDate,
  type RuntimeRange,
  type RuntimeResponse,
} from '@/lib/runtime';

const PAGE = 30;

interface Query {
  range: RuntimeRange;
  zone: number | undefined;
  custom: { from: string; to: string };
}

function toApiQuery({ range, zone, custom }: Query) {
  return {
    // Date-only values are resolved by the server in the home's zone.
    ...(range === 'custom' ? { from: custom.from, to: nextDateInput(custom.to) } : { preset: range }),
    ...(zone === undefined ? {} : { zone }),
  };
}

/**
 * One query behind both Activity segments. Rooms and Timeline are two readings
 * of the same period, so the range belongs to the tab rather than to either
 * screen - switching segments must not silently reset it.
 */
function useRuntimeSource() {
  const [query, setQuery] = useState<Query>(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return { range: '7d', zone: undefined, custom: { from: localDateInput(weekAgo), to: localDateInput(new Date()) } };
  });
  const [data, setData] = useState<RuntimeResponse | null>(null);
  // When `data` arrived, so "Today" means today as of that reading.
  const [fetchedAt, setFetchedAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const queryRef = useRef(query);
  const dataRef = useRef(data);

  /** Fetches a page of `q`; offset 0 replaces what is shown, later pages append. */
  const fetchPage = useCallback(async (q: Query, offset: number) => {
    const id = ++requestId.current;
    try {
      const next = await fetchRuntime({ ...toApiQuery(q), offset, limit: PAGE });
      if (id !== requestId.current) return;
      const merged = offset === 0 || !dataRef.current
        ? next
        : { ...next, sessions: [...dataRef.current.sessions, ...next.sessions] };
      dataRef.current = merged;
      setData(merged);
      setFetchedAt(Date.now());
      setError(null);
    } catch (e) {
      if (id === requestId.current) setError((e as Error).message || 'Runtime history could not be loaded.');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchPage(queryRef.current, 0);
  }, [fetchPage]);

  /** A new range or room: keep the old figures up, dimmed, while the new ones load. */
  const change = (next: Partial<Query>) => {
    const q = { ...queryRef.current, ...next };
    queryRef.current = q;
    setQuery(q);
    setLoading(true);
    setError(null);
    void fetchPage(q, 0);
  };

  const rangeLabel =
    query.range === 'custom'
      ? `${shortDate(query.custom.from)} – ${shortDate(query.custom.to)}`
      : PRESET_LABELS[query.range];

  return {
    range: query.range,
    zone: query.zone,
    custom: query.custom,
    rangeLabel,
    filtered: query.zone !== undefined || query.range === 'custom',
    data,
    fetchedAt,
    loading,
    loadingMore,
    error,
    setRange: (range: RuntimeRange) => change({ range }),
    setZone: (zone: number | undefined) => change({ zone }),
    setCustom: (custom: Query['custom']) => change({ custom, range: 'custom' }),
    reload: async () => {
      setError(null);
      await fetchPage(queryRef.current, 0);
    },
    loadMore: () => {
      setLoadingMore(true);
      void fetchPage(queryRef.current, dataRef.current?.sessions.length ?? 0);
    },
  };
}

type Runtime = ReturnType<typeof useRuntimeSource>;

const RuntimeContext = createContext<Runtime | null>(null);

export function RuntimeProvider({ children }: { children: ReactNode }) {
  return <RuntimeContext value={useRuntimeSource()}>{children}</RuntimeContext>;
}

export function useRuntime(): Runtime {
  const runtime = use(RuntimeContext);
  if (!runtime) throw new Error('useRuntime must be used inside RuntimeProvider');
  return runtime;
}
