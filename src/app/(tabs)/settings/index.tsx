import { Host } from '@expo/ui';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { Segments } from '@/components/segments';
import { ThemedText } from '@/components/themed-text';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { easeChanges } from '@/components/ui/motion';
import { Picker } from '@/components/ui/picker';
import { Pressable } from '@/components/ui/pressable';
import { Icons } from '@/constants/icons';
import { SETTINGS_SECTIONS } from '@/constants/sections';
import { Gutter, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSystemState } from '@/hooks/use-system-state';
import { useTheme } from '@/hooks/use-theme';
import { API_HOST } from '@/lib/api';
import { useAuth, useUser } from '@/lib/auth';
import { loadThemePreference, saveThemePreference, type ThemePreference } from '@/lib/theme-preference';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const satisfies readonly { value: ThemePreference; label: string }[];

/** Settings · General, ported from the web's `Settings.tsx`. */
export default function SettingsScreen() {
  const user = useUser();
  const { signOut } = useAuth();
  const { state, room } = useSystemState();
  const theme = useTheme();
  // Native hosts follow the device's scheme unless told the app's.
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [preference, setPreference] = useState(loadThemePreference);
  const [leaving, setLeaving] = useState(false);
  const now = useNow(5_000);

  const displayName = user.username.charAt(0).toUpperCase() + user.username.slice(1);
  const updated = state.lastUpdated ? new Date(state.lastUpdated) : null;
  const divider = { borderTopWidth: 1, borderColor: theme.hairline };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Segments items={SETTINGS_SECTIONS} selected={0} />
      {room.error && (
        <Alert tone="warning" title="Your default room wasn't saved." onDismiss={room.dismissError}>
          {room.error}
        </Alert>
      )}

      <View style={styles.section}>
        <SectionHeader label="Account" />
        <Card padding="list">
          <View style={styles.account}>
            <View style={[styles.avatar, { backgroundColor: theme.accentDeep }]}>
              <ThemedText style={[styles.initial, { color: theme.surface }]}>{displayName.charAt(0)}</ThemedText>
            </View>
            <View style={styles.flex}>
              <ThemedText numberOfLines={1} style={styles.semibold}>
                {displayName}
              </ThemedText>
              <ThemedText type="meta" themeColor="fgMuted" numberOfLines={1}>
                Signed in as {user.username}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.row, divider]}>
            <View style={styles.flex}>
              <ThemedText type="body" style={styles.medium}>
                Default room
              </ThemedText>
              <ThemedText type="xs" themeColor="fgMuted">
                Comes on with the main unit
              </ThemedText>
            </View>
            {state.zones.length === 0 ? (
              <ThemedText type="body" themeColor="fgMuted">
                No rooms yet
              </ThemedText>
            ) : (
              <Host
                matchContents={{ vertical: true }}
                colorScheme={scheme}
                seedColor={theme.accent}
                accessibilityLabel="Default room"
                style={styles.picker}>
                <Picker
                  selectedValue={room.selectedZoneNumber ?? state.zones[0].number}
                  enabled={!room.saving}
                  onValueChange={room.choose}>
                  {state.zones.map((zone) => (
                    <Picker.Item key={zone.number} label={zone.name} value={zone.number} />
                  ))}
                </Picker>
              </Host>
            )}
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader label="Theme" />
        <View
          accessibilityLabel="Theme"
          style={[styles.segments, { backgroundColor: theme.surface, boxShadow: theme.shadowE1 }]}>
          {THEME_OPTIONS.map((option) => {
            const selected = option.value === preference;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setPreference(option.value);
                  saveThemePreference(option.value);
                }}
                style={({ pressed }) => [
                  styles.segment,
                  selected && { backgroundColor: theme.select },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="body" style={[styles.semibold, { color: selected ? theme.selectFg : theme.fg }]}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader label="Bridge" />
        <Card padding="list">
          <Readout label="Status">
            <View style={styles.status}>
              <Animated.View style={[styles.dot, easeChanges, { backgroundColor: state.connected ? theme.positiveDot : theme.danger }]} />
              <ThemedText type="body" style={[styles.semibold, { color: state.connected ? theme.positive : theme.danger }]}>
                {state.connected ? 'Connected' : 'Offline'}
              </ThemedText>
            </View>
          </Readout>
          <Readout label="Last update" style={divider}>
            <Value>{updated ? relativeTime(updated, now) : '—'}</Value>
          </Readout>
          <Readout label="Rooms" style={divider}>
            <Value>{state.zones.length}</Value>
          </Readout>
          <Readout label="Address" style={divider}>
            <Value>{API_HOST}</Value>
          </Readout>
        </Card>
      </View>

      <Button
        variant="danger"
        size="lg"
        fullWidth
        icon={Icons.signOut}
        loading={leaving}
        loadingLabel="Signing out…"
        onPress={() => {
          setLeaving(true);
          void signOut();
        }}>
        Sign out
      </Button>

      <ThemedText type="meta" themeColor="fgMuted" style={styles.footer}>
        Blueberry · everything you add stays on the home server.
      </ThemedText>
    </ScrollView>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <ThemedText type="eyebrow" themeColor="fgMuted" accessibilityRole="header" style={styles.eyebrow}>
      {label}
    </ThemedText>
  );
}

/** A label and its reading on one line; a hairline between rows rather than around each. */
function Readout({ label, style, children }: { label: string; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <View style={[styles.row, style]}>
      <ThemedText type="body">{label}</ThemedText>
      {children}
    </View>
  );
}

function Value({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="body" themeColor="fgBody" numberOfLines={1} style={styles.value}>
      {children}
    </ThemedText>
  );
}

/** A clock for relative times; the bridge polls every 10 s, so 5 s is plenty. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** "12 seconds ago" - how fresh the reading is, not when it happened. */
function relativeTime(date: Date, now: number): string {
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 5) return 'just now';
  const ago = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  if (seconds < 60) return ago(seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return ago(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return ago(hours, 'hour');
  return date.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  pressed: { transform: [{ scale: 0.96 }] },
  section: { gap: 8, marginBottom: 12 },
  eyebrow: { paddingHorizontal: 4 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 18, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 56, paddingVertical: 8 },
  segments: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: Radius.row },
  segment: { flex: 1, minHeight: 48, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
  // A fixed width, as on the web; Android's dropdown otherwise takes the whole row.
  picker: { width: 184 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  value: { flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
  footer: { paddingHorizontal: 4, marginTop: 8, marginBottom: 12 },
  content: { padding: Gutter, paddingBottom: 40, gap: 8 },
});
