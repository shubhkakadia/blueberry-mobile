import { Host, Slider } from '@expo/ui';
import { SymbolView } from 'expo-symbols';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonBlock } from '@/components/ui/skeleton';
import { climateIcon, Icons, type IconName } from '@/constants/icons';
import { getClimateTheme, Radius, Type, type ClimateTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  patchAc,
  patchMainPower,
  patchZonePercentage,
  patchZonePower,
  useDebouncedValue,
  type Mutate,
} from '@/hooks/use-system-state';
import { useTheme } from '@/hooks/use-theme';
import { airconApi, isOn, type AcAbility, type AcState, type SystemState, type ZoneState } from '@/lib/aircon';

/** The next timer boundary. `name` is null when no timer is switched on. */
export interface NextTimer {
  name: string | null;
  when: string;
}

interface Props {
  state: SystemState;
  mutate: Mutate;
  loading: boolean;
  /** The mode the page is tinted with; Off when the unit is not running. */
  climate: ClimateTheme;
  selectedZoneNumber: number | null;
  /** One line of automation - the next boundary - and nothing else. */
  nextTimer: NextTimer | null;
  onOpenTimers: () => void;
}

/** Aircon · Now, ported from the web's `AirconNow.tsx`. Colours come from the climate override around it. */
export function AirconNow({ state, mutate, loading, climate, selectedZoneNumber, nextTimer, onOpenTimers }: Props) {
  const theme = useTheme();
  if (loading) return <AirconSkeleton />;

  const ac = state.acs[0];
  const ability = state.abilities.find((a) => a.number === ac?.number);
  const roomsOn = state.zones.filter((zone) => isOn(zone.power)).length;

  return (
    <View>
      {ac ? (
        <>
          <MainUnit ac={ac} ability={ability} climate={climate} mutate={mutate} selectedZoneNumber={selectedZoneNumber} />
          <ModeAndFan ac={ac} ability={ability} mutate={mutate} />
        </>
      ) : (
        <EmptyState
          icon={Icons.console}
          title="Waiting for the console…"
          body="The bridge is connected but has not reported an aircon unit yet."
        />
      )}

      {nextTimer && (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the timers"
          onPress={onOpenTimers}
          style={({ pressed }) => [styles.nextTimer, { backgroundColor: theme.glass }, pressed && styles.pressedSoft]}>
          <SymbolView name={Icons.clock} size={20} tintColor={theme.accent} />
          <ThemedText type="body" style={styles.flex}>
            {nextTimer.name && <ThemedText type="body" style={styles.semibold}>{`${nextTimer.name} `}</ThemedText>}
            {nextTimer.when}
          </ThemedText>
          <SymbolView name={Icons.chevronRight} size={18} tintColor={theme.fgMuted} />
        </Pressable>
      )}

      <View style={styles.rooms}>
        <View style={styles.roomsHeader}>
          <ThemedText accessibilityRole="header" style={styles.roomsTitle}>
            Rooms
          </ThemedText>
          {state.zones.length > 0 && (
            <ThemedText type="meta" style={[styles.tabular, { color: theme.accentDeep }]}>
              {roomsOn} of {state.zones.length} on
            </ThemedText>
          )}
        </View>
        <View style={[styles.roomsCard, { backgroundColor: theme.surface, boxShadow: theme.shadowE1 }]}>
          {state.zones.map((zone, index) => (
            <RoomRow key={zone.number} zone={zone} mutate={mutate} first={index === 0} />
          ))}
          {state.zones.length === 0 && (
            <EmptyState icon={Icons.house} title="No rooms yet" body="Waiting for rooms from the console…" />
          )}
        </View>
      </View>
    </View>
  );
}

function MainUnit({
  ac,
  ability,
  climate,
  mutate,
  selectedZoneNumber,
}: {
  ac: AcState;
  ability: AcAbility | undefined;
  climate: ClimateTheme;
  mutate: Mutate;
  selectedZoneNumber: number | null;
}) {
  const theme = useTheme();
  const on = isOn(ac.power);
  const min = ability?.minSetpoint ?? 16;
  const max = ability?.maxSetpoint ?? 30;

  const commitSetpoint = useCallback(
    (value: number) =>
      mutate(
        patchAc(ac.number, { targetSetpoint: value }),
        () => airconApi.acSetpoint(ac.number, value),
        `a set point of ${value}°`,
      ),
    [ac.number, mutate],
  );
  const [setpoint, setSetpoint] = useDebouncedValue(ac.targetSetpoint, commitSetpoint);

  const togglePower = () =>
    mutate(
      patchMainPower(!on, selectedZoneNumber ?? undefined),
      () => airconApi.acPower(ac.number, !on, selectedZoneNumber ?? undefined),
      on ? 'turning the aircon off' : 'turning the aircon on',
    );

  const setpointColor = on ? theme.accentDeep : theme.fgSubtle;

  return (
    <View style={styles.mainUnit}>
      <View style={styles.mainRow}>
        <View style={styles.flex}>
          <ThemedText style={[styles.caps, { color: theme.accentDeep }]}>Main unit</ThemedText>
          <ThemedText numberOfLines={1} accessibilityLiveRegion="polite" style={[styles.status, { color: theme.accent }]}>
            {on ? climate.status : 'Off'}
          </ThemedText>
        </View>
        <Pressable
          onPress={togglePower}
          accessibilityRole="switch"
          accessibilityLabel="Main unit power"
          accessibilityState={{ checked: on }}
          style={({ pressed }) => [
            styles.power,
            { borderColor: theme.accent, backgroundColor: on ? theme.accent : 'transparent' },
            pressed && styles.pressedDeep,
          ]}>
          <SymbolView name={Icons.power} size={26} tintColor={on ? theme.accentFg : theme.accent} />
        </Pressable>
      </View>

      <View style={styles.setpointRow}>
        <SetpointButton
          label="Lower set point"
          icon={Icons.minus}
          disabled={!on || setpoint <= min}
          onPress={() => setSetpoint(Math.max(min, setpoint - 1))}
        />
        <View style={styles.setpointCenter}>
          <ThemedText style={[styles.caps, { color: theme.accentDeep }]}>Set to</ThemedText>
          <View
            accessible
            accessibilityLabel={`Set to ${setpoint} degrees Celsius`}
            accessibilityLiveRegion="polite"
            style={styles.hero}>
            <ThemedText style={[Type.hero, styles.tabular, { color: setpointColor }]}>{setpoint}</ThemedText>
            <ThemedText style={[styles.degree, { color: setpointColor }]}>°</ThemedText>
          </View>
          {ac.temperature !== null && (
            <ThemedText type="body" style={[styles.tabular, { color: theme.accentDeep }]}>
              Inside {ac.temperature.toFixed(1)}°
            </ThemedText>
          )}
        </View>
        <SetpointButton
          label="Raise set point"
          icon={Icons.plus}
          disabled={!on || setpoint >= max}
          onPress={() => setSetpoint(Math.min(max, setpoint + 1))}
        />
      </View>
    </View>
  );
}

function SetpointButton({
  label,
  icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: IconName;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: theme.glassStrong },
        pressed && styles.pressedDeep,
        disabled && styles.disabled,
      ]}>
      <SymbolView name={icon} size={24} tintColor={theme.accentDeep} />
    </Pressable>
  );
}

/** Short enough for a four-way segment on a narrow phone. */
function fanLabel(speed: string): string {
  return speed === 'Medium' ? 'Med' : speed;
}

function ModeAndFan({ ac, ability, mutate }: { ac: AcState; ability: AcAbility | undefined; mutate: Mutate }) {
  const theme = useTheme();
  const modes = ability?.supportedModes ?? [];
  const fans = ability?.supportedFanSpeeds ?? [];
  // Up to five modes on one row; more wrap onto a second.
  const cell = { width: `${100 / Math.min(modes.length, 5)}%` as `${number}%` };

  return (
    <View style={styles.modeAndFan}>
      {modes.length > 0 && (
        <View accessibilityLabel="Mode" style={styles.modeGrid}>
          {modes.map((option) => {
            const mode = getClimateTheme(option);
            const selected = option === ac.mode;
            const ink = selected ? theme.accentFg : theme.accentDeep;
            return (
              <View key={option} style={[styles.modeCell, cell]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() =>
                    mutate(patchAc(ac.number, { mode: option }), () => airconApi.acMode(ac.number, option), `${mode.label} mode`)
                  }
                  style={({ pressed }) => [
                    styles.mode,
                    { backgroundColor: selected ? theme.accent : theme.glass },
                    pressed && styles.pressed,
                  ]}>
                  <SymbolView name={climateIcon(mode.key)} size={22} tintColor={ink} />
                  <ThemedText type="meta" numberOfLines={1} style={[styles.semibold, { color: ink }]}>
                    {mode.label}
                  </ThemedText>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {fans.length > 0 && (
        <View style={styles.fanRow}>
          <ThemedText type="meta" style={[styles.fanLabel, { color: theme.accentDeep }]}>
            Fan
          </ThemedText>
          <View accessibilityLabel="Fan speed" style={[styles.fanTrack, { backgroundColor: theme.glass }]}>
            {fans.map((option) => {
              const selected = option === ac.fanSpeed;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={option}
                  accessibilityState={{ selected }}
                  onPress={() =>
                    mutate(
                      patchAc(ac.number, { fanSpeed: option }),
                      () => airconApi.acFan(ac.number, option),
                      `fan ${option.toLowerCase()}`,
                    )
                  }
                  style={({ pressed }) => [
                    styles.fanSegment,
                    selected && { backgroundColor: theme.surface, boxShadow: theme.shadowSegment },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="sm"
                    numberOfLines={1}
                    style={{ color: selected ? theme.accentDeep : theme.fgBody, fontWeight: selected ? '600' : '500' }}>
                    {fanLabel(option)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * A room is a damper and nothing else: the temperature is the main unit's,
 * shared by every room, so a room can only be on or off and open so far.
 */
function RoomRow({ zone, mutate, first }: { zone: ZoneState; mutate: Mutate; first: boolean }) {
  const theme = useTheme();
  // Native hosts follow the device's scheme unless told the app's.
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const on = isOn(zone.power);

  const commitPercentage = useCallback(
    (value: number) =>
      // The console's percentage command also powers the zone on, so the
      // optimistic state has to say so too - otherwise the toggle lags a poll
      // behind the slider.
      mutate(
        patchZonePercentage(zone.number, value),
        () => airconApi.zonePercentage(zone.number, value),
        `${zone.name} damper ${value}%`,
      ),
    [zone.number, zone.name, mutate],
  );
  const [percentage, setPercentage] = useDebouncedValue(zone.openPercentage, commitPercentage);

  return (
    <View style={[styles.room, !first && { borderTopWidth: 1, borderColor: theme.hairline }]}>
      <View style={styles.roomTop}>
        <ThemedText numberOfLines={1} style={[styles.roomName, !on && styles.dimmed]}>
          {zone.name}
        </ThemedText>
        <Switch
          value={on}
          accessibilityLabel={`${zone.name} on or off`}
          trackColor={{ false: theme.switchOff, true: theme.accent }}
          thumbColor="#ffffff"
          ios_backgroundColor={theme.switchOff}
          onValueChange={(next) =>
            mutate(
              patchZonePower(zone.number, next),
              () => airconApi.zonePower(zone.number, next),
              `turning ${zone.name} ${next ? 'on' : 'off'}`,
            )
          }
        />
      </View>
      <View style={[styles.damper, !on && styles.dimmed]}>
        <ThemedText type="xs" themeColor="fgMuted" style={styles.damperCaption}>
          Damper
        </ThemedText>
        <Host
          matchContents={{ vertical: true }}
          colorScheme={scheme}
          seedColor={theme.accent}
          accessibilityLabel={`${zone.name} damper`}
          style={styles.flex}>
          <Slider
            value={percentage}
            min={0}
            max={100}
            step={5}
            disabled={!on}
            onValueChange={(value) => setPercentage(Math.round(value))}
          />
        </Host>
        <ThemedText type="sm" numberOfLines={1} style={[styles.readout, styles.tabular]}>
          {percentage}%
        </ThemedText>
      </View>
    </View>
  );
}

function AirconSkeleton() {
  return (
    <View accessible accessibilityLabel="Loading aircon controls" style={styles.skeleton}>
      <View style={styles.mainRow}>
        <View style={styles.skeletonLabels}>
          <SkeletonBlock style={{ height: 12, width: 80 }} />
          <SkeletonBlock style={{ height: 24, width: 112 }} />
        </View>
        <SkeletonBlock style={styles.round} />
      </View>
      <View style={styles.setpointRow}>
        <SkeletonBlock style={styles.round} />
        <SkeletonBlock style={{ height: 112, width: 144, borderRadius: Radius.tile }} />
        <SkeletonBlock style={styles.round} />
      </View>
      <SkeletonBlock style={{ height: 66, borderRadius: Radius.row }} />
      <SkeletonBlock style={{ height: 44, borderRadius: Radius.track }} />
      <SkeletonBlock style={{ height: 288, marginTop: 16, borderRadius: Radius.tile }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  semibold: { fontWeight: '600' },
  tabular: { fontVariant: ['tabular-nums'] },
  dimmed: { opacity: 0.5 },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.94 }] },
  pressedDeep: { transform: [{ scale: 0.88 }] },
  pressedSoft: { transform: [{ scale: 0.985 }] },
  caps: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.84, textTransform: 'uppercase' },

  mainUnit: { gap: 12 },
  mainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  status: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.44 },
  power: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  round: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  setpointRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  setpointCenter: { flex: 1, alignItems: 'center' },
  hero: { flexDirection: 'row', alignItems: 'flex-start' },
  degree: { fontSize: 44, lineHeight: 44, fontWeight: '300', marginTop: 14 },

  modeAndFan: { marginTop: 24, gap: 16 },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -3 },
  modeCell: { padding: 3 },
  mode: { minHeight: 66, borderRadius: Radius.row, alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4 },
  fanRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fanLabel: { width: 34, fontWeight: '600' },
  fanTrack: { flex: 1, flexDirection: 'row', gap: 3, padding: 3, borderRadius: Radius.track },
  fanSegment: { flex: 1, minHeight: 40, borderRadius: Radius.segment, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },

  nextTimer: { marginTop: 16, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.row, paddingHorizontal: 16, paddingVertical: 12 },

  rooms: { marginTop: 28, gap: 10 },
  roomsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  roomsTitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  roomsCard: { borderRadius: Radius.tile, paddingHorizontal: 16 },
  room: { gap: 4, paddingTop: 8, paddingBottom: 14 },
  roomTop: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  roomName: { flex: 1, fontWeight: '600' },
  damper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  damperCaption: { width: 50, fontWeight: '500' },
  // Wide enough for "100%" in Geologica, which runs wider than the web's 40px.
  readout: { width: 48, textAlign: 'right', fontWeight: '600' },

  skeleton: { gap: 12 },
  skeletonLabels: { gap: 8 },
});
