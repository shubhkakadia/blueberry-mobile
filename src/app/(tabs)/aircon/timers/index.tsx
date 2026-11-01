import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Segments } from '@/components/segments';
import { ThemedText } from '@/components/themed-text';
import { TimerCard } from '@/components/timer-card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { settle } from '@/components/ui/motion';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { Icons } from '@/constants/icons';
import { AIRCON_SECTIONS } from '@/constants/sections';
import { Gutter } from '@/constants/theme';
import { useSystemState } from '@/hooks/use-system-state';
import { useTheme } from '@/hooks/use-theme';
import { findOverlaps, schedulesApi, type Schedule } from '@/lib/schedules';

/** Aircon · Timers, ported from the web's `Schedules.tsx`; the form is the `[id]` route. */
export default function TimersScreen() {
  const { state } = useSystemState();
  const theme = useTheme();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [timeZone, setTimeZone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await schedulesApi.list();
      setSchedules(data.schedules);
      setTimeZone(data.timeZone);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Coming back from the form shows what was saved.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const guard = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const openForm = (id: number | 'new') => router.push(`/aircon/timers/${id}`);
  const overlaps = findOverlaps(schedules);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button variant="primary" size="sm" pill icon={Icons.plus} onPress={() => openForm('new')}>
              New timer
            </Button>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.accent}
            colors={[theme.accent]}
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          />
        }>
        <Segments items={AIRCON_SECTIONS} selected={1} />

        <View style={styles.list}>
          {error && (
            <Alert tone="danger" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          {overlaps.length > 0 && (
            <Alert tone="info">
              {/* Plain nested Text inherits the alert's ink and font. */}
              {overlaps.map((overlap, index) => (
                <Text key={index}>
                  {index > 0 && ' '}
                  <Text style={styles.semibold}>{overlap.a}</Text> and <Text style={styles.semibold}>{overlap.b}</Text>
                  {` overlap from ${overlap.from} to ${overlap.to}.`}
                </Text>
              ))}{' '}
              While both run, their rooms are combined.
            </Alert>
          )}

          {loading ? (
            <View accessibilityLabel="Loading timers" style={styles.list}>
              {[0, 1].map((key) => (
                <Card key={key} level="tile" padding="lg" style={styles.skeleton}>
                  <SkeletonBlock style={{ height: 20, width: '40%' }} />
                  <SkeletonBlock style={{ height: 14, width: '100%' }} />
                  <SkeletonBlock style={{ height: 14, width: '50%' }} />
                </Card>
              ))}
            </View>
          ) : schedules.length === 0 ? (
            <EmptyState
              icon={Icons.clock}
              title="No timers yet"
              body="A timer runs the rooms you choose between two times, on the days you pick."
              action={
                <Button variant="primary" icon={Icons.plus} onPress={() => openForm('new')}>
                  New timer
                </Button>
              }
            />
          ) : (
            schedules.map((schedule, index) => (
              <TimerCard
                key={schedule.id}
                index={index}
                schedule={schedule}
                zoneNames={state.zones.filter((zone) => schedule.zones.includes(zone.number)).map((zone) => zone.name)}
                onToggle={() => guard(() => schedulesApi.update(schedule.id, { enabled: !schedule.enabled }))}
                onEdit={() => openForm(schedule.id)}
                onRun={(transition) => guard(() => schedulesApi.runNow(schedule.id, transition))}
              />
            ))
          )}

          <Animated.View layout={settle}>
            <ThemedText type="meta" themeColor="fgMuted" style={styles.footer}>
              {timeZone ? `Times follow ${timeZone} time. ` : ''}A timer that ends before it starts runs overnight and
              stops the next day.
            </ThemedText>
          </Animated.View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Gutter, paddingBottom: 40 },
  list: { gap: 12 },
  semibold: { fontWeight: '600' },
  skeleton: { gap: 10 },
  footer: { paddingHorizontal: 4, paddingTop: 8 },
});
