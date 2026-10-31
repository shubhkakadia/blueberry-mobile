import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Field } from '@/components/ui/field';
import { Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatClock } from '@/lib/schedules';

/** `HH:MM` as today at that time, for the native picker. */
function toDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return date;
}

const toTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

/** A wall-clock time: iOS's inline compact picker, Android's clock dialog behind a field. */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (time: string) => void }) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const pick = (_: unknown, date: Date) => onChange(toTime(date));

  return (
    <Field label={label} style={styles.field}>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          display="compact"
          accentColor={theme.accent}
          themeVariant={scheme}
          onValueChange={pick}
          style={styles.ios}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${formatClock(value)}`}
          onPress={() => DateTimePickerAndroid.open({ value: toDate(value), mode: 'time', onValueChange: pick })}
          style={({ pressed }) => [
            styles.box,
            { borderColor: theme.border, backgroundColor: theme.surfaceField },
            pressed && { borderColor: theme.accent },
          ]}>
          <ThemedText style={styles.tabular}>{formatClock(value)}</ThemedText>
        </Pressable>
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1 },
  ios: { alignSelf: 'flex-start' },
  box: { height: 48, borderWidth: 1, borderRadius: Radius.field, paddingHorizontal: 14, justifyContent: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
});
