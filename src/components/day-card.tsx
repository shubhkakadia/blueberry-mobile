import { Host } from '@expo/ui';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { riseInAt } from '@/components/ui/motion';
import { Picker } from '@/components/ui/picker';
import { FontFamily, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatWeekday, parseLocalDate, type DinnerDay, type Dish } from '@/lib/dine';

/** Picker values that are not dish ids (those start at 1). */
const NOT_PLANNED = 0;
const REMOVED = -1;

/**
 * Every day open at once: the dish is a dropdown, so a whole week is one short
 * scroll and nothing has to be expanded to be read or changed.
 */
export function DayCard({
  day,
  dishes,
  isToday,
  busy,
  disabled,
  noteDraft,
  onDishChange,
  onNoteDraft,
  onNoteCommit,
}: {
  day: DinnerDay;
  dishes: Dish[];
  isToday: boolean;
  busy: boolean;
  disabled: boolean;
  noteDraft: string | undefined;
  onDishChange: (dishId: number | null) => void;
  onNoteDraft: (value: string) => void;
  onNoteCommit: () => void;
}) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [noteFocused, setNoteFocused] = useState(false);
  const date = parseLocalDate(day.date);
  const weekday = formatWeekday(date);
  // The day keeps the name it recorded when the dish was chosen, so history
  // still reads correctly after the dish leaves the library - but it cannot be
  // chosen again, so choosing it does nothing.
  const removed = day.dishId === null && day.dishName !== null;
  const locked = disabled && !busy;

  const meta = [
    day.dishName ? `Dish set by ${day.dishSetByUsername ?? 'someone'}` : 'No dish yet',
    removed ? 'dish since removed' : null,
    day.notes && day.notesSetByUsername ? `note by ${day.notesSetByUsername}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Animated.View
      entering={riseInAt(day.dayOffset)}
      accessibilityLabel={`${weekday}${isToday ? ', today' : ''}`}
      style={[
        styles.card,
        { backgroundColor: theme.surface, boxShadow: theme.shadowE1, borderColor: isToday ? theme.accent : 'transparent' },
      ]}>
      <View style={[styles.badge, { backgroundColor: isToday ? theme.accent : theme.surfaceInset }]}>
        <ThemedText style={[styles.badgeDay, { color: isToday ? theme.accentFg : theme.fg }]}>
          {isToday ? 'Today' : weekday.slice(0, 3)}
        </ThemedText>
        <ThemedText style={[styles.badgeDate, { color: isToday ? theme.accentFg : theme.fg }]}>{date.getDate()}</ThemedText>
      </View>

      <View style={styles.body}>
        <Host
          matchContents={{ vertical: true }}
          colorScheme={scheme}
          seedColor={theme.accent}
          accessibilityLabel={`Dinner for ${weekday}`}>
          <Picker
            selectedValue={day.dishId ?? (removed ? REMOVED : NOT_PLANNED)}
            enabled={!locked}
            onValueChange={(value) => {
              if (value === REMOVED) return;
              onDishChange(value === NOT_PLANNED ? null : value);
            }}>
            <Picker.Item label="Not planned" value={NOT_PLANNED} />
            {removed && <Picker.Item label={`${day.dishName} (removed dish)`} value={REMOVED} />}
            {dishes.map((dish) => (
              <Picker.Item key={dish.id} label={dish.name} value={dish.id} />
            ))}
          </Picker>
        </Host>

        <TextInput
          value={noteDraft ?? day.notes ?? ''}
          maxLength={500}
          editable={!locked}
          accessibilityLabel={`Note for ${weekday}`}
          placeholder="Add a note"
          placeholderTextColor={theme.fgSubtle}
          returnKeyType="done"
          onChangeText={onNoteDraft}
          onFocus={() => setNoteFocused(true)}
          // Committed on blur rather than per keystroke: each save is a round
          // trip, and a shared menu does not need every character broadcast.
          onBlur={() => {
            setNoteFocused(false);
            onNoteCommit();
          }}
          style={[
            styles.note,
            { color: theme.fg, borderColor: noteFocused ? theme.accent : theme.border },
            locked && styles.locked,
          ]}
        />

        <ThemedText type="xs" themeColor="fgMuted">
          {meta}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: Radius.card, borderWidth: 2 },
  badge: { width: 48, height: 56, borderRadius: Radius.field, alignItems: 'center', justifyContent: 'center' },
  badgeDay: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  badgeDate: { fontSize: 20, lineHeight: 22, fontWeight: '600', fontVariant: ['tabular-nums'] },
  body: { flex: 1, minWidth: 0, gap: 6 },
  // No vertical padding: Android's default makes the text taller than the field, which then
  // scrolls its own text and swallows drags meant for the page.
  note: { height: 38, borderBottomWidth: 1, paddingHorizontal: 2, paddingVertical: 0, fontFamily: FontFamily, fontSize: 16 },
  locked: { opacity: 0.5 },
});
