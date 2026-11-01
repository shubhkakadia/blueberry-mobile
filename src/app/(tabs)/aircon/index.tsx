import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AirconNow, type NextTimer } from '@/components/aircon-now';
import { ConnectionPill } from '@/components/connection-pill';
import { Segments } from '@/components/segments';
import { Alert } from '@/components/ui/alert';
import { easeChanges } from '@/components/ui/motion';
import { Toast } from '@/components/ui/toast';
import { AIRCON_SECTIONS } from '@/constants/sections';
import { climateTint, getClimateTheme, Gutter } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSystemState } from '@/hooks/use-system-state';
import { ThemeOverride } from '@/hooks/use-theme';
import { isOn } from '@/lib/aircon';
import { describeNextRun, schedulesApi } from '@/lib/schedules';

export default function AirconScreen() {
  const { state, mutate, error, pending, loading, dismissError, room } = useSystemState();
  const nextTimer = useNextTimer();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  const ac = state.acs[0];
  const climate = getClimateTheme(state.connected && ac && isOn(ac.power) ? ac.mode : undefined);
  const tint = climateTint(climate, scheme);
  // The page and every accent on it take the running mode's colours.
  const override = { accent: tint.accent, accentFg: tint.accentFg, accentDeep: tint.deep };

  return (
    <ThemeOverride value={override}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: tint.page },
          // Headers render outside this tree, so the pill needs the override passed in again.
          headerRight: () => (
            <ThemeOverride value={override}>
              <ConnectionPill connected={state.connected} pending={pending} />
            </ThemeOverride>
          ),
        }}
      />
      <Animated.View style={[styles.page, easeChanges, { backgroundColor: tint.page }]}>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <Segments items={AIRCON_SECTIONS} selected={0} />
          {room.error && (
            <Alert tone="warning" title="Your default room wasn't saved." onDismiss={room.dismissError} style={styles.alert}>
              {room.error}
            </Alert>
          )}
          <AirconNow
            state={state}
            mutate={mutate}
            loading={loading}
            climate={climate}
            selectedZoneNumber={room.selectedZoneNumber}
            nextTimer={nextTimer}
            onOpenTimers={() => router.replace('/aircon/timers')}
          />
        </ScrollView>
        {error && (
          <View style={styles.toast}>
            <Toast message={error} onDismiss={dismissError} />
          </View>
        )}
      </Animated.View>
    </ThemeOverride>
  );
}

/**
 * The one line of automation the home screen shows. Refetched when the app
 * comes back to the front, since "starts at 6:30 today" goes stale in the background.
 */
function useNextTimer(): NextTimer | null {
  const [next, setNext] = useState<NextTimer | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      schedulesApi
        .list()
        .then(({ schedules }) => {
          if (cancelled) return;
          const upcoming = schedules
            .filter((schedule) => schedule.enabled && schedule.nextTransition)
            .sort((a, b) => {
              const at = `${a.nextTransition!.date}T${a.nextTransition!.time}`;
              const bt = `${b.nextTransition!.date}T${b.nextTransition!.time}`;
              return at < bt ? -1 : at > bt ? 1 : 0;
            })[0];
          setNext(
            upcoming
              ? { name: upcoming.name, when: describeNextRun(upcoming) }
              : { name: null, when: 'No timer is switched on' },
          );
        })
        .catch(() => {
          // The home screen is about the aircon; a schedules outage hides this
          // line rather than putting an error on the primary screen.
          if (!cancelled) setNext(null);
        });

    void load();
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') void load();
    });
    return () => {
      cancelled = true;
      appState.remove();
    };
  }, []);

  return next;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: Gutter, paddingBottom: 96 },
  alert: { marginBottom: 12 },
  toast: { position: 'absolute', left: Gutter, right: Gutter, bottom: 12 },
});
