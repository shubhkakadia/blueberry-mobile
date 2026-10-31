import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { Icons } from '@/constants/icons';
import { getClimateTheme, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  DAY_NAMES,
  describeDays,
  formatClock,
  schedulesApi,
  WEEK,
  type Schedule,
  type ScheduleRun,
  type TimerTransition,
} from '@/lib/schedules';

/** The one line under a timer's name: what it will do next. */
function statusLine(schedule: Schedule): { text: string; running: boolean } {
  if (!schedule.enabled) return { text: 'Off — won’t run until switched on', running: false };
  const next = schedule.nextTransition;
  if (!next) return { text: 'No upcoming run', running: false };
  const at = formatClock(next.time);
  // The next boundary being a stop means we are inside the window now.
  if (next.transition === 'stop') return { text: `Running now · until ${at}`, running: true };
  const day =
    next.inDays === 0
      ? 'today'
      : next.inDays === 1
        ? 'tomorrow'
        : WEEK.find((item) => item.bit === new Date(`${next.date}T00:00:00`).getDay())!.name;
  return { text: `Next run ${day} at ${at}`, running: false };
}

function settingsLine(schedule: Schedule): string {
  const { mode, fanSpeed, setpoint } = schedule.payload;
  if (!mode && !fanSpeed && setpoint === undefined) return 'Keeps the unit’s current mode, fan and set point';
  return [
    mode ? getClimateTheme(mode).label : null,
    setpoint !== undefined ? `${setpoint}°` : null,
    fanSpeed ? `Fan ${fanSpeed.toLowerCase()}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function TimerCard({
  schedule,
  zoneNames,
  onToggle,
  onEdit,
  onRun,
}: {
  schedule: Schedule;
  zoneNames: string[];
  onToggle: () => Promise<unknown>;
  onEdit: () => void;
  onRun: (transition: TimerTransition) => Promise<unknown>;
}) {
  const theme = useTheme();
  const [historyOpen, setHistoryOpen] = useState(false);
  // The switch moves the moment it is tapped; the server catches up.
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const [running, setRunning] = useState<TimerTransition | null>(null);
  const enabled = pendingEnabled ?? schedule.enabled;
  const status = statusLine({ ...schedule, enabled });
  const dim = !enabled && styles.dim;

  const toggle = async () => {
    setPendingEnabled(!enabled);
    try {
      await onToggle();
    } finally {
      setPendingEnabled(null);
    }
  };

  const run = async (transition: TimerTransition) => {
    setRunning(transition);
    try {
      await onRun(transition);
    } finally {
      setRunning(null);
    }
  };

  return (
    <Card level="tile" padding="lg" style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.flex, styles.titles, dim]}>
          <ThemedText numberOfLines={1} style={styles.name}>
            {schedule.name}
          </ThemedText>
          <ThemedText type="meta" style={status.running ? { color: theme.accent, fontWeight: '600' } : { color: theme.fgMuted }}>
            {status.text}
          </ThemedText>
        </View>
        <IconButton icon={Icons.pencil} label={`Edit ${schedule.name}`} onPress={onEdit} />
        <Switch
          value={enabled}
          disabled={pendingEnabled !== null}
          accessibilityLabel={`${schedule.name} enabled`}
          trackColor={{ false: theme.switchOff, true: theme.accent }}
          thumbColor="#ffffff"
          ios_backgroundColor={theme.switchOff}
          onValueChange={() => void toggle()}
        />
      </View>

      <View style={[styles.body, dim]}>
        <ThemedText style={styles.range}>
          {formatClock(schedule.startTime)} – {formatClock(schedule.stopTime)}
        </ThemedText>
        <View accessible accessibilityLabel={`Repeats ${describeDays(schedule.days).toLowerCase()}`} style={styles.days}>
          {WEEK.map((day) => {
            const on = (schedule.days & (1 << day.bit)) !== 0;
            return (
              <View key={day.bit} style={[styles.day, { backgroundColor: on ? theme.accent : theme.surfaceInset }]}>
                <ThemedText type="meta" style={[styles.semibold, { color: on ? theme.accentFg : theme.fgSubtle }]}>
                  {day.letter}
                </ThemedText>
              </View>
            );
          })}
        </View>
        {zoneNames.length > 0 ? (
          <View style={styles.tags}>
            {zoneNames.map((name) => (
              <Tag key={name}>{name}</Tag>
            ))}
          </View>
        ) : (
          <ThemedText type="meta" themeColor="danger">
            No rooms — this timer has nothing to run.
          </ThemedText>
        )}
        <View style={styles.settings}>
          <SymbolView name={Icons.sliders} size={18} tintColor={theme.fgBody} />
          <ThemedText type="sm" themeColor="fgBody" style={styles.flex}>
            {settingsLine(schedule)}
          </ThemedText>
        </View>
      </View>

      <View>
        <View style={[styles.actions, { borderTopColor: theme.hairline }]}>
          <Button
            style={styles.action}
            loading={running === 'start'}
            disabled={running !== null}
            onPress={() => void run('start')}>
            Start now
          </Button>
          <Button
            style={styles.action}
            loading={running === 'stop'}
            disabled={running !== null}
            onPress={() => void run('stop')}>
            Stop now
          </Button>
          <Button
            variant="quiet"
            accessibilityState={{ expanded: historyOpen }}
            onPress={() => setHistoryOpen((open) => !open)}
            style={styles.history}
            trailing={
              <SymbolView
                name={Icons.chevronDown}
                size={16}
                tintColor={theme.fg}
                style={historyOpen && styles.flipped}
              />
            }>
            History
          </Button>
        </View>
        {historyOpen && <RunHistory scheduleId={schedule.id} />}
      </View>
    </Card>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The last few times this timer actually fired, read on demand. */
function RunHistory({ scheduleId }: { scheduleId: number }) {
  const theme = useTheme();
  const [runs, setRuns] = useState<ScheduleRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    schedulesApi
      .runs(scheduleId)
      .then((data) => active && setRuns(data))
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [scheduleId]);

  if (error) {
    return (
      <ThemedText type="meta" themeColor="danger" style={styles.historyBody}>
        {error}
      </ThemedText>
    );
  }
  if (!runs) {
    return (
      <View accessibilityLabel="Loading history" style={[styles.historyBody, styles.historyLoading]}>
        <SkeletonBlock style={{ height: 36, borderRadius: Radius.field }} />
        <SkeletonBlock style={{ height: 36, borderRadius: Radius.field }} />
      </View>
    );
  }
  if (runs.length === 0) {
    return (
      <ThemedText type="meta" themeColor="fgMuted" style={styles.historyBody}>
        This timer hasn’t run yet.
      </ThemedText>
    );
  }

  const recent = [...runs].sort((a, b) => (a.ranAt < b.ranAt ? 1 : -1)).slice(0, 8);
  return (
    <View style={styles.historyBody}>
      {recent.map((run) => {
        const at = new Date(run.ranAt);
        const failed = run.status === 'error';
        return (
          <View key={run.id} style={[styles.run, { borderTopColor: theme.hairline }]}>
            <View>
              <ThemedText type="meta" style={styles.semibold}>
                {`${DAY_NAMES[at.getDay()]} ${at.getDate()} ${MONTHS[at.getMonth()]}`}
              </ThemedText>
              <ThemedText type="meta" themeColor="fgMuted" style={styles.tabular}>
                {formatClock(`${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}`)}
              </ThemedText>
            </View>
            <ThemedText type="meta" themeColor={failed ? 'danger' : 'fgBody'} style={styles.runResult}>
              {failed
                ? `Couldn’t ${run.transition}${run.detail ? ` — ${run.detail}` : ''}`
                : run.transition === 'start'
                  ? 'Started'
                  : 'Stopped'}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  semibold: { fontWeight: '600' },
  tabular: { fontVariant: ['tabular-nums'] },
  dim: { opacity: 0.55 },
  card: { gap: 14 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  titles: { gap: 3, paddingTop: 2 },
  name: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { gap: 12 },
  range: { fontSize: 28, lineHeight: 34, fontWeight: '300', letterSpacing: -0.84, fontVariant: ['tabular-nums'] },
  days: { flexDirection: 'row', gap: 6 },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  settings: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, paddingTop: 14 },
  action: { flex: 1, minWidth: 0, paddingHorizontal: 8 },
  history: { paddingLeft: 12, paddingRight: 8, gap: 4 },
  flipped: { transform: [{ rotate: '180deg' }] },
  historyBody: { paddingTop: 12 },
  historyLoading: { gap: 8 },
  run: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, paddingVertical: 10 },
  runResult: { flexShrink: 1, textAlign: 'right' },
});
