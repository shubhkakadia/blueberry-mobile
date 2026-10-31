import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

import { energyApi, type EnergyCostsResponse } from '@/lib/energy';

/**
 * Bills, costs and the runtime profile, re-read whenever the screen comes into
 * view - which is also how a saved bill shows up after the form closes.
 * `poll` refreshes every minute while in view, so Costs rolls over at midnight.
 */
export function useEnergy({ poll = false }: { poll?: boolean } = {}) {
  const [data, setData] = useState<EnergyCostsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await energyApi.costs());
      setError(null);
    } catch (e) {
      setError((e as Error).message || 'Energy data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      const appState = AppState.addEventListener('change', (status) => {
        if (status === 'active') void load();
      });
      const timer = poll ? setInterval(() => void load(), 60_000) : undefined;
      return () => {
        appState.remove();
        clearInterval(timer);
      };
    }, [load, poll]),
  );

  return { data, error, loading, reload: load };
}
