import { Host } from '@expo/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DateField } from '@/components/time-field';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Picker } from '@/components/ui/picker';
import { Gutter } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRuntime } from '@/hooks/use-runtime';
import { useSystemState } from '@/hooks/use-system-state';
import { useTheme } from '@/hooks/use-theme';
import { localDateInput } from '@/lib/runtime';

/** The picker value for "All rooms"; zone numbers start at 0. */
const ALL_ROOMS = -1;

/** A room or a custom period, which the range pills cannot express. Ported from the web's filter sheet. */
export default function FilterScreen() {
  const runtime = useRuntime();
  const { state } = useSystemState();
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [draft, setDraft] = useState(runtime.custom);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const today = localDateInput(new Date());

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Field label="Room">
        <Host matchContents={{ vertical: true }} colorScheme={scheme} seedColor={theme.accent} accessibilityLabel="Room">
          <Picker
            selectedValue={runtime.zone ?? ALL_ROOMS}
            onValueChange={(value) => runtime.setZone(value === ALL_ROOMS ? undefined : value)}>
            <Picker.Item label="All rooms" value={ALL_ROOMS} />
            {state.zones.map((zone) => (
              <Picker.Item key={zone.number} label={zone.name} value={zone.number} />
            ))}
          </Picker>
        </Host>
      </Field>

      <View style={styles.dates}>
        <DateField
          label="From"
          value={draft.from}
          maximum={draft.to}
          onChange={(from) => setDraft((current) => ({ ...current, from }))}
        />
        <DateField
          label="To"
          value={draft.to}
          minimum={draft.from}
          maximum={today}
          onChange={(to) => setDraft((current) => ({ ...current, to }))}
        />
      </View>

      <ThemedText type="meta" themeColor="fgMuted">
        The room applies straight away. Dates apply when you press Show these dates.
      </ThemedText>

      {rangeError && (
        <ThemedText type="meta" themeColor="danger" accessibilityLiveRegion="polite" style={styles.error}>
          {rangeError}
        </ThemedText>
      )}

      <View style={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => {
            if (!draft.from || !draft.to || draft.from > draft.to) return setRangeError('Choose a valid date range.');
            runtime.setCustom(draft);
            router.back();
          }}>
          Show these dates
        </Button>
        {runtime.filtered && (
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => {
              runtime.setZone(undefined);
              if (runtime.range === 'custom') runtime.setRange('7d');
              router.back();
            }}>
            Clear filters
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Gutter, gap: 16 },
  dates: { flexDirection: 'row', gap: 12 },
  error: { fontWeight: '500' },
  actions: { gap: 8, marginTop: 8 },
});
