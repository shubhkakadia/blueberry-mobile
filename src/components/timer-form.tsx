import { router, Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert as Dialog, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TimeField } from '@/components/time-field';
import { Alert } from '@/components/ui/alert';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipRow } from '@/components/ui/chip';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Icons } from '@/constants/icons';
import { getClimateTheme, Gutter } from '@/constants/theme';
import { useSystemState } from '@/hooks/use-system-state';
import { useTheme } from '@/hooks/use-theme';
import {
  describeDays,
  EVERY_DAY,
  schedulesApi,
  WEEK,
  WEEKDAYS,
  WEEKENDS,
  type Schedule,
  type ScheduleInput,
} from '@/lib/schedules';

const PATTERNS = [
  ['Every day', EVERY_DAY],
  ['Weekdays', WEEKDAYS],
  ['Weekends', WEEKENDS],
] as const;

/** New or edit timer, ported from the web's `ScheduleForm`. Saves, deletes, then closes itself. */
export function TimerForm({ schedule }: { schedule: Schedule | null }) {
  const { state } = useSystemState();
  const theme = useTheme();
  const zones = state.zones;
  const ability = state.abilities.find((a) => a.number === (schedule?.acNumber ?? state.acs[0]?.number));
  const [name, setName] = useState(schedule?.name ?? '');
  const [startTime, setStartTime] = useState(schedule?.startTime ?? '06:30');
  const [stopTime, setStopTime] = useState(schedule?.stopTime ?? '08:00');
  const [days, setDays] = useState(schedule?.days ?? EVERY_DAY);
  const [selectedZones, setSelectedZones] = useState<number[]>(
    schedule?.zones ?? (zones[0] ? [zones[0].number] : []),
  );
  const [mode, setMode] = useState(schedule?.payload.mode ?? '');
  const [fanSpeed, setFanSpeed] = useState(schedule?.payload.fanSpeed ?? '');
  const [setpoint, setSetpoint] = useState<number | ''>(schedule?.payload.setpoint ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const min = ability?.minSetpoint ?? 16;
  const max = ability?.maxSetpoint ?? 30;
  const problem =
    startTime === stopTime
      ? 'Start and stop must be different times.'
      : days === 0
        ? 'Pick at least one day.'
        : selectedZones.length === 0
          ? 'Pick at least one room.'
          : null;

  const toggleZone = (number: number) =>
    setSelectedZones((current) =>
      current.includes(number) ? current.filter((item) => item !== number) : [...current, number],
    );

  const save = async () => {
    if (problem || saving) return;
    setSaving(true);
    setError(null);
    const input: ScheduleInput = {
      name: name.trim() || 'Aircon timer',
      days,
      startTime,
      stopTime,
      zones: selectedZones,
      payload: {
        ...(mode ? { mode } : {}),
        ...(fanSpeed ? { fanSpeed } : {}),
        ...(setpoint !== '' ? { setpoint } : {}),
      },
    };
    try {
      await (schedule ? schedulesApi.update(schedule.id, input) : schedulesApi.create(input));
      router.back();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!schedule) return;
    Dialog.alert(`Delete ${schedule.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete timer',
        style: 'destructive',
        onPress: async () => {
          try {
            await schedulesApi.remove(schedule.id);
            router.back();
          } catch (e) {
            setError((e as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: schedule ? 'Edit timer' : 'New timer',
          headerLeft: () => (
            <Button variant="ghost" size="sm" onPress={() => router.back()}>
              Cancel
            </Button>
          ),
          headerRight: () => (
            <Button variant="primary" size="sm" pill disabled={problem !== null} loading={saving} onPress={save}>
              Save
            </Button>
          ),
        }}
      />
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {error && <Alert tone="danger">{error}</Alert>}

          <Card level="tile" padding="lg" style={styles.card}>
            <Field label="Name">
              {(a11y) => (
                <Input {...a11y} value={name} maxLength={60} onChangeText={setName} placeholder="Evening cool" />
              )}
            </Field>
            <View style={styles.times}>
              <TimeField label="Starts" value={startTime} onChange={setStartTime} />
              <TimeField label="Stops" value={stopTime} onChange={setStopTime} />
            </View>
          </Card>

          <FormSection title="Repeats" hint={days ? describeDays(days) : 'No days picked'}>
            <ChipRow accessibilityLabel="Common patterns">
              {PATTERNS.map(([label, mask]) => (
                <Chip key={label} selected={days === mask} onPress={() => setDays(mask)}>
                  {label}
                </Chip>
              ))}
            </ChipRow>
            <View style={styles.week}>
              {WEEK.map((day) => {
                const on = (days & (1 << day.bit)) !== 0;
                return (
                  <Pressable
                    key={day.bit}
                    accessibilityRole="button"
                    accessibilityLabel={day.name}
                    accessibilityState={{ selected: on }}
                    onPress={() => setDays((current) => current ^ (1 << day.bit))}
                    style={({ pressed }) => [
                      styles.day,
                      { backgroundColor: on ? theme.accent : theme.surfaceInset },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="sm" style={[styles.semibold, { color: on ? theme.accentFg : theme.fgSubtle }]}>
                      {day.letter}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </FormSection>

          <FormSection
            title="Rooms"
            hint={selectedZones.length ? `${selectedZones.length} of ${zones.length} selected` : 'Pick at least one'}>
            <ChipRow accessibilityLabel="Rooms">
              {zones.map((zone) => (
                <Chip
                  key={zone.number}
                  selected={selectedZones.includes(zone.number)}
                  onPress={() => toggleZone(zone.number)}>
                  {zone.name}
                </Chip>
              ))}
            </ChipRow>
          </FormSection>

          <FormSection title="Aircon settings" hint="Leave any of these unset to keep what the unit is already doing.">
            <ChoiceRow
              label="Mode"
              options={ability?.supportedModes ?? []}
              value={mode}
              onChange={setMode}
              format={(option) => getClimateTheme(option).label}
            />
            <ChoiceRow label="Fan" options={ability?.supportedFanSpeeds ?? []} value={fanSpeed} onChange={setFanSpeed} />
            <View style={styles.setpoint}>
              <ThemedText type="meta" themeColor="fgMuted" style={[styles.fill, styles.medium]}>
                Set point
              </ThemedText>
              <IconButton
                icon={Icons.minus}
                label="Lower set point"
                variant="quiet"
                shape="round"
                disabled={setpoint !== '' && setpoint <= min}
                onPress={() => setSetpoint((current) => (current === '' ? 22 : Math.max(min, current - 1)))}
              />
              <ThemedText style={styles.setpointValue}>{setpoint === '' ? '—' : `${setpoint}°`}</ThemedText>
              <IconButton
                icon={Icons.plus}
                label="Raise set point"
                variant="quiet"
                shape="round"
                disabled={setpoint !== '' && setpoint >= max}
                onPress={() => setSetpoint((current) => (current === '' ? 22 : Math.min(max, current + 1)))}
              />
              <Button variant="ghost" size="sm" disabled={setpoint === ''} onPress={() => setSetpoint('')}>
                Clear
              </Button>
            </View>
          </FormSection>

          {problem && (
            <ThemedText type="meta" themeColor="danger" accessibilityLiveRegion="polite" style={styles.problem}>
              {problem}
            </ThemedText>
          )}

          {schedule && (
            <Button variant="danger" size="lg" icon={Icons.trash} fullWidth onPress={confirmDelete}>
              Delete timer
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <ThemedText accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {hint && (
          <ThemedText type="meta" themeColor="fgMuted">
            {hint}
          </ThemedText>
        )}
      </View>
      <Card level="tile" padding="md" style={styles.card}>
        {children}
      </Card>
    </View>
  );
}

/** One optional choice: tapping the selected option clears it. */
function ChoiceRow({
  label,
  options,
  value,
  onChange,
  format = (option) => option,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  format?: (option: string) => string;
}) {
  if (options.length === 0) return null;
  return (
    <View style={styles.choice}>
      <ThemedText type="meta" themeColor="fgMuted" style={styles.medium}>
        {label}
      </ThemedText>
      <ChipRow accessibilityLabel={label}>
        {options.map((option) => (
          <Chip key={option} selected={value === option} onPress={() => onChange(value === option ? '' : option)}>
            {format(option)}
          </Chip>
        ))}
      </ChipRow>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  pressed: { transform: [{ scale: 0.86 }] },
  content: { padding: Gutter, gap: 20, paddingBottom: 40 },
  card: { gap: 14 },
  times: { flexDirection: 'row', gap: 10 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 10 },
  sectionHead: { gap: 2, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  choice: { gap: 8 },
  setpoint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setpointValue: { width: 56, textAlign: 'center', fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  problem: { paddingHorizontal: 4, fontWeight: '500' },
});
