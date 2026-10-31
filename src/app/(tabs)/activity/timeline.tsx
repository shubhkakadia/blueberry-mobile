import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { RuntimeRange } from '@/components/runtime-range';
import { Segments } from '@/components/segments';
import { ThemedText } from '@/components/themed-text';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { Icons, type IconName } from '@/constants/icons';
import { ACTIVITY_SECTIONS } from '@/constants/sections';
import { getClimateTheme, Gutter, Radius, type ThemeColor } from '@/constants/theme';
import { useRuntime } from '@/hooks/use-runtime';
import { useTheme } from '@/hooks/use-theme';
import {
  clock,
  dayKey,
  dayLabel,
  formatDuration,
  groupByDay,
  noteFor,
  tagLabel,
  type Run,
  type RuntimeSource,
} from '@/lib/runtime';

/**
 * Who set a run going, as a tinted pill. An inferred session is the quietest:
 * it is the one row the bridge did not actually witness starting.
 */
const TAGS: Record<RuntimeSource, { bg: ThemeColor; fg: ThemeColor; icon: IconName | null }> = {
  manual: { bg: 'tagUser', fg: 'tagUserFg', icon: Icons.person },
  schedule: { bg: 'tagTimer', fg: 'tagTimerFg', icon: Icons.clock },
  manual_schedule: { bg: 'tagTimer', fg: 'tagTimerFg', icon: Icons.clock },
  external: { bg: 'tagConsole', fg: 'tagConsoleFg', icon: Icons.console },
  recovery: { bg: 'tagQuiet', fg: 'tagQuietFg', icon: null },
};

/** Activity · Timeline, ported from the web's `ActivityTimeline.tsx`. */
export default function TimelineScreen() {
  const theme = useTheme();
  const runtime = useRuntime();
  const [refreshing, setRefreshing] = useState(false);
  const { data, fetchedAt, loading, loadingMore, error } = runtime;
  const days = data ? groupByDay(data.sessions, data.timeZone) : [];
  const todayKey = data ? dayKey(fetchedAt, data.timeZone) : '';

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
      <Segments items={ACTIVITY_SECTIONS} selected={1} />

      <View style={styles.stack}>
        <RuntimeRange />

        {loading ? (
          <View accessibilityLabel="Loading the timeline" style={styles.day}>
            <View style={styles.dayHead}>
              <SkeletonBlock style={{ height: 16, width: 128 }} />
              <SkeletonBlock style={{ height: 12, width: 56 }} />
            </View>
            <SkeletonBlock style={{ height: 240, borderRadius: Radius.panel }} />
          </View>
        ) : error ? (
          <Alert tone="danger" onRetry={() => void runtime.reload()}>
            {error}
          </Alert>
        ) : !data || data.sessions.length === 0 ? (
          <EmptyState icon={Icons.activity} title="Nothing recorded" body="No room had airflow during this period." />
        ) : (
          <View style={styles.days}>
            {days.map((day) => (
              <View key={day.key} style={styles.day}>
                <View style={styles.dayHead}>
                  <ThemedText type="body" accessibilityRole="header" style={styles.semibold}>
                    {dayLabel(day.key, todayKey)}
                  </ThemedText>
                  <ThemedText type="meta" themeColor="fgMuted" style={styles.tabular}>
                    {formatDuration(day.runs.reduce((sum, run) => sum + run.durationSeconds, 0))}
                  </ThemedText>
                </View>
                <Card padding="list">
                  {day.runs.map((run, index) => (
                    <RunRow key={run.key} run={run} timeZone={data.timeZone} first={index === 0} />
                  ))}
                </Card>
              </View>
            ))}

            {data.sessions.length < data.total && (
              <Button fullWidth loading={loadingMore} loadingLabel="Loading…" onPress={runtime.loadMore}>
                Show earlier
              </Button>
            )}

            <ThemedText type="meta" themeColor="fgMuted" style={styles.footer}>
              Times are when air was actually flowing. Periods where the bridge was disconnected are left out rather than
              estimated.
            </ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function RunRow({ run, timeZone, first }: { run: Run; timeZone: string; first: boolean }) {
  const theme = useTheme();
  const start = run.sessions[0]!;
  const actor = start.startActor;
  const tag = TAGS[actor.source];
  const config = start.startConfiguration.ac;
  const climate = getClimateTheme(config.mode);
  const mode = climate.key === 'fan' ? climate.status : `${climate.label} · ${config.targetSetpoint}°`;
  const rooms = run.sessions.map((session) => session.zoneName).join(', ');
  const note = noteFor(run);

  return (
    <View style={[styles.run, !first && { borderTopWidth: 1, borderColor: theme.hairline }]}>
      <View style={styles.runTop}>
        <ThemedText style={[styles.semibold, styles.tabular]}>
          {clock(run.start, timeZone)} – {run.end === null ? 'now' : clock(run.end, timeZone)}
        </ThemedText>
        <ThemedText type="meta" themeColor="fgMuted" style={styles.tabular}>
          {formatDuration(run.durationSeconds)}
        </ThemedText>
      </View>
      <ThemedText type="sm" themeColor="fgBody">
        {rooms}
      </ThemedText>
      <View style={styles.runBottom}>
        <ThemedText type="meta" themeColor="fgMuted">
          {mode}
        </ThemedText>
        <View style={[styles.tag, { backgroundColor: theme[tag.bg] }]}>
          {tag.icon && <SymbolView name={tag.icon} size={15} tintColor={theme[tag.fg]} />}
          <ThemedText type="xs" numberOfLines={1} style={[styles.semibold, styles.tagLabel, { color: theme[tag.fg] }]}>
            {tagLabel(actor)}
          </ThemedText>
        </View>
      </View>
      {note && (
        <ThemedText type="meta" themeColor="fgMuted">
          {note}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  semibold: { fontWeight: '600' },
  tabular: { fontVariant: ['tabular-nums'] },
  content: { padding: Gutter, paddingBottom: 40 },
  stack: { gap: 16 },
  days: { gap: 20 },
  day: { gap: 8 },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingHorizontal: 4 },
  run: { gap: 6, paddingVertical: 14 },
  runTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  runBottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, maxWidth: '60%', borderRadius: 14, paddingLeft: 8, paddingRight: 10 },
  tagLabel: { flexShrink: 1 },
  footer: { paddingHorizontal: 4 },
});
