import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { airconApi, isOn, subscribe, type AcState, type SystemState } from '@/lib/aircon';

const EMPTY: SystemState = { zones: [], acs: [], abilities: [], connected: false, lastUpdated: null };

type Patch = (state: SystemState) => SystemState;

/**
 * Optimistic state layering.
 *
 * The displayed state is the server's state with any in-flight patches applied on
 * top. Layering rather than overwriting matters because the bridge pushes a fresh
 * poll every 10s: a naive optimistic write would be clobbered by a poll that landed
 * mid-command, snapping the control back before the real value arrived.
 *
 * A patch lives exactly as long as its request. On success the server's post-command
 * state replaces the base and the patch drops in the same batch, so there is no
 * intermediate render. On failure the patch drops and the control reverts on its own.
 */
export function useSystemState() {
  const [server, setServer] = useState<SystemState>(EMPTY);
  const [patches, setPatches] = useState<ReadonlyMap<number, Patch>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const nextId = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setServer(await airconApi.state());
    } catch (e) {
      setError(sentence((e as Error).message));
    } finally {
      setLoading(false);
    }
  }, []);

  // The socket only runs while the app is in front: a backgrounded phone would hold it
  // open for nothing. Coming back refetches, because pushes were missed meanwhile.
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const start = () => {
      void refresh();
      unsubscribe = subscribe(setServer);
    };
    const stop = () => {
      unsubscribe?.();
      unsubscribe = null;
    };
    start();
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !unsubscribe) start();
      else if (next === 'background') stop();
    });
    return () => {
      appState.remove();
      stop();
    };
  }, [refresh]);

  const state = useMemo(() => {
    let out = server;
    for (const patch of patches.values()) out = patch(out);
    return out;
  }, [server, patches]);

  /**
   * `label` names the change in a sentence - "Study damper 70%", "Heat mode" -
   * so a refusal can say what was put back instead of only why.
   */
  const mutate = useCallback(
    async (patch: Patch, call: () => Promise<SystemState>, label?: string): Promise<void> => {
      const id = nextId.current++;
      setPatches((current) => new Map(current).set(id, patch));
      setError(null);

      try {
        setServer(await call());
      } catch (e) {
        setError(describeRefusal((e as Error).message, label));
      } finally {
        setPatches((current) => {
          const next = new Map(current);
          next.delete(id);
          return next;
        });
      }
    },
    [],
  );

  return {
    state,
    mutate,
    error,
    pending: patches.size,
    loading,
    dismissError: () => setError(null),
  };
}

export type Mutate = ReturnType<typeof useSystemState>['mutate'];

/** `The console didn't accept Study damper 70%, so it's been set back.` */
function describeRefusal(reason: string, label?: string): string {
  if (!label) return sentence(reason);
  const why = reason && reason !== 'signed out' ? ` ${sentence(reason)}` : '';
  return `The console didn't accept ${label}, so it's been set back.${why}`;
}

function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return 'Something went wrong.';
  const capital = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capital) ? capital : `${capital}.`;
}

// --- Patch builders -------------------------------------------------------

export function patchAc(number: number, changes: Partial<AcState>): Patch {
  return (state) => ({
    ...state,
    acs: state.acs.map((ac) => (ac.number === number ? { ...ac, ...changes } : ac)),
  });
}

export function patchZonePower(number: number, enabled: boolean): Patch {
  return (state) => {
    const zones = state.zones.map((zone) =>
      zone.number === number ? { ...zone, power: enabled ? ('On' as const) : ('Off' as const) } : zone,
    );
    const anyOn = zones.some((zone) => isOn(zone.power));
    return {
      ...state,
      zones,
      acs: state.acs.map((ac) => ({ ...ac, power: anyOn ? ('On' as const) : ('Off' as const) })),
    };
  };
}

export function patchZonePercentage(number: number, percent: number): Patch {
  return (state) => ({
    ...state,
    zones: state.zones.map((zone) =>
      zone.number === number ? { ...zone, openPercentage: percent, power: 'On' as const } : zone,
    ),
    acs: state.acs.map((ac) => ({ ...ac, power: 'On' as const })),
  });
}

export function patchMainPower(enabled: boolean, selectedZone?: number): Patch {
  return (state) => ({
    ...state,
    zones: state.zones.map((zone) => ({
      ...zone,
      power: enabled ? (zone.number === selectedZone ? ('On' as const) : zone.power) : ('Off' as const),
    })),
    acs: state.acs.map((ac) => ({ ...ac, power: enabled ? ('On' as const) : ('Off' as const) })),
  });
}

/**
 * Drives a slider that must feel continuous while each commit is a round trip.
 *
 * The displayed value follows the thumb immediately; the network call is debounced
 * so dragging 23 -> 28 sends one command instead of five. The draft is held until
 * the commit settles, then released so server state takes over again - and dropped
 * on failure, which reverts the slider.
 */
export function useDebouncedValue(actual: number, commit: (value: number) => Promise<void>, delayMs = 350) {
  const [draft, setDraft] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(actual);

  useEffect(() => () => clearTimeout(timer.current), []);

  const set = useCallback(
    (value: number) => {
      latest.current = value;
      setDraft(value);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const target = latest.current;
        commit(target).finally(() => {
          // Only release if no newer drag has started in the meantime.
          setDraft((current) => (current === target ? null : current));
        });
      }, delayMs);
    },
    [commit, delayMs],
  );

  return [draft ?? actual, set] as const;
}
