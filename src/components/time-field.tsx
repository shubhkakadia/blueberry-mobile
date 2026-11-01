import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Field } from '@/components/ui/field';
import { Pressable } from '@/components/ui/pressable';
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `YYYY-MM-DD` as local midnight, for the native picker. */
function dayToDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1);
}

const toDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * A calendar day, `YYYY-MM-DD`, picked the same way as `TimeField`. A blank
 * value shows "Choose a date"; the picker then opens on the nearest allowed day.
 */
export function DateField({
  label,
  value,
  onChange,
  minimum,
  maximum,
  size = 'md',
}: {
  label: string;
  value: string;
  onChange: (day: string) => void;
  minimum?: string;
  maximum?: string;
  /** `sm` is the 12px label used in dense grids such as a rate period. */
  size?: 'sm' | 'md';
}) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const fallback = toDay(new Date());
  const date = dayToDate(value || (maximum && fallback > maximum ? maximum : minimum && fallback < minimum ? minimum : fallback));
  const shown = value ? `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}` : 'Choose a date';
  const bounds = {
    ...(minimum ? { minimumDate: dayToDate(minimum) } : {}),
    ...(maximum ? { maximumDate: dayToDate(maximum) } : {}),
  };
  const pick = (_: unknown, picked: Date) => onChange(toDay(picked));

  return (
    <Field label={label} size={size} style={styles.field}>
      {Platform.OS === 'ios' && value ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="compact"
          accentColor={theme.accent}
          themeVariant={scheme}
          onValueChange={pick}
          style={styles.ios}
          {...bounds}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${shown}`}
          onPress={() =>
            Platform.OS === 'ios'
              ? // iOS's inline picker has no blank state: start it on the nearest allowed day.
                onChange(toDay(date))
              : DateTimePickerAndroid.open({ value: date, mode: 'date', onValueChange: pick, ...bounds })
          }
          style={({ pressed }) => [
            styles.box,
            size === 'sm' && styles.boxSmall,
            { borderColor: theme.border, backgroundColor: theme.surfaceField },
            pressed && { borderColor: theme.accent },
          ]}>
          <ThemedText type={size === 'sm' ? 'body' : 'base'} themeColor={value ? 'fg' : 'fgSubtle'} numberOfLines={1} style={styles.tabular}>
            {shown}
          </ThemedText>
        </Pressable>
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1 },
  ios: { alignSelf: 'flex-start' },
  box: { height: 48, borderWidth: 1, borderRadius: Radius.field, paddingHorizontal: 14, justifyContent: 'center' },
  boxSmall: { height: 44, paddingHorizontal: 10 },
  tabular: { fontVariant: ['tabular-nums'] },
});
