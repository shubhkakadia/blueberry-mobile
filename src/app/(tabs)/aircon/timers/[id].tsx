import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TimerForm } from '@/components/timer-form';
import { Alert } from '@/components/ui/alert';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { Gutter, Radius } from '@/constants/theme';
import { schedulesApi, type Schedule } from '@/lib/schedules';

/** `/aircon/timers/new` or `/aircon/timers/<id>`. An edit waits for its timer rather than opening a blank form. */
export default function TimerFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  // undefined while an edit loads; null for a new timer.
  const [schedule, setSchedule] = useState<Schedule | null | undefined>(isNew ? null : undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    schedulesApi
      .list()
      .then(({ schedules }) => {
        const found = schedules.find((item) => String(item.id) === id);
        if (found) setSchedule(found);
        else setError('This timer no longer exists.');
      })
      .catch((e: Error) => setError(e.message));
  }, [id, isNew]);

  if (schedule !== undefined) return <TimerForm schedule={schedule} />;

  return (
    <View style={styles.content}>
      <Stack.Screen options={{ title: 'Edit timer' }} />
      {error ? (
        <Alert tone="danger">{error}</Alert>
      ) : (
        <View accessibilityLabel="Loading timer" style={styles.loading}>
          <SkeletonBlock style={{ height: 160, borderRadius: Radius.tile }} />
          <SkeletonBlock style={{ height: 120, borderRadius: Radius.tile }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Gutter },
  loading: { gap: 20 },
});
