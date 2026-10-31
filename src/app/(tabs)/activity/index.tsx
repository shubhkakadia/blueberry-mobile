import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { RuntimeRange } from '@/components/runtime-range';
import { Segments } from '@/components/segments';
import { ThemedText } from '@/components/themed-text';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { Icons } from '@/constants/icons';
import { ACTIVITY_SECTIONS } from '@/constants/sections';
import { Gutter, Radius, Type } from '@/constants/theme';
import { useRuntime } from '@/hooks/use-runtime';
import { useSystemState } from '@/hooks/use-system-state';
import { useTheme } from '@/hooks/use-theme';
import { airflow, formatDuration, initialsFor, roomTotals } from '@/lib/runtime';

/** Activity · Rooms, ported from the web's `ActivityRooms.tsx`. */
export default function RoomsScreen() {
  const theme = useTheme();
  const runtime = useRuntime();
  const { state } = useSystemState();
  const [refreshing, setRefreshing] = useState(false);
  const { data, loading, error, rangeLabel, zone } = runtime;

  const rooms = roomTotals(data?.summaries ?? [], zone === undefined ? state.zones : []);
  const totalSeconds = rooms.reduce((sum, room) => sum + room.seconds, 0);
  const max = Math.max(1, ...rooms.map((room) => room.seconds));
  const divider = { borderTopWidth: 1, borderColor: theme.hairline };

  return (
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
            await runtime.reload();
            setRefreshing(false);
          }}
        />
      }>
      <Segments items={ACTIVITY_SECTIONS} selected={0} />

      <View style={styles.stack}>
        <RuntimeRange />

        {error && (
          <Alert tone="danger" onRetry={() => void runtime.reload()}>
            {error}
          </Alert>
        )}

        {/* The skeleton is for the first load only. A new range keeps the old
            figures on screen, dimmed, rather than blinking through a placeholder. */}
        {loading && !data ? (
          <View accessibilityLabel="Loading room runtime" style={styles.stack}>
            <View style={styles.totals}>
              <SkeletonBlock style={{ height: 12, width: 160 }} />
              <SkeletonBlock style={{ height: 40, width: 144 }} />
              <SkeletonBlock style={{ height: 12, width: '75%' }} />
            </View>
            <SkeletonBlock style={{ height: 280, borderRadius: Radius.panel }} />
          </View>
        ) : (
          <View style={[styles.stack, loading && styles.dimmed]}>
            <View style={styles.totals}>
              <ThemedText type="meta" themeColor="fgMuted" style={styles.medium}>
                Total airflow, {rangeLabel}
              </ThemedText>
              <ThemedText style={[Type.metric, styles.tabular]}>{airflow(totalSeconds)}</ThemedText>
              <ThemedText type="meta" themeColor="fgMuted">
                Counts the time each room’s zone was open while the unit was running.
              </ThemedText>
            </View>

            {rooms.length === 0 ? (
              <EmptyState icon={Icons.activity} title="No rooms yet" body="Rooms appear here once the console reports them." />
            ) : (
              <Card padding="list" accessibilityLabel="Airflow by room">
                {rooms.map((room, index) => (
                  <View key={room.zoneNumber} style={[styles.room, index > 0 && divider]}>
                    <View style={styles.roomTop}>
                      <ThemedText numberOfLines={1} style={[styles.flex, styles.medium]}>
                        {room.name}
                      </ThemedText>
                      <ThemedText
                        type="body"
                        themeColor={room.seconds > 0 ? 'fg' : 'fgSubtle'}
                        style={[styles.semibold, styles.tabular]}>
                        {airflow(room.seconds)}
                      </ThemedText>
                    </View>
                    {/* A room's share of the busiest room. */}
                    <View style={[styles.track, { backgroundColor: theme.surfaceInset }]}>
                      <View
                        style={[styles.bar, { width: `${(room.seconds / max) * 100}%`, backgroundColor: theme.accent }]}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {data && data.actors.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="eyebrow" themeColor="fgMuted" accessibilityRole="header" style={styles.eyebrow}>
                  Who started it
                </ThemedText>
                <Card padding="list">
                  {data.actors.map((actor, index) => (
                    <View key={actor.key} style={[styles.actor, index > 0 && divider]}>
                      <View style={[styles.initials, { backgroundColor: theme.accentSoft }]}>
                        <ThemedText type="xs" style={[styles.semibold, { color: theme.accentDeep }]}>
                          {initialsFor(actor.label)}
                        </ThemedText>
                      </View>
                      <ThemedText type="body" numberOfLines={1} style={[styles.flex, styles.medium]}>
                        {actor.label}
                      </ThemedText>
                      <ThemedText type="meta" themeColor="fgMuted" style={styles.tabular}>
                        {formatDuration(actor.totalSeconds)} · {Math.round(actor.percentageShare)}%
                      </ThemedText>
                    </View>
                  ))}
                </Card>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  tabular: { fontVariant: ['tabular-nums'] },
  dimmed: { opacity: 0.55 },
  content: { padding: Gutter, paddingBottom: 40 },
  stack: { gap: 16 },
  totals: { gap: 4, paddingHorizontal: 4 },
  room: { gap: 8, paddingVertical: 12 },
  roomTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  section: { gap: 8 },
  eyebrow: { paddingHorizontal: 4 },
  actor: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  initials: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
