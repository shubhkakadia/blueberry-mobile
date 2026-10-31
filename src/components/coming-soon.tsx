import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Gutter, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Stand-in for a tab whose segments have not been ported yet. Each module replaces its own. */
export function ComingSoon({ sections }: { sections: [label: string, module: string][] }) {
  const theme = useTheme();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <ThemedText type="eyebrow" themeColor="fgMuted" style={styles.eyebrow}>
        Coming in the migration
      </ThemedText>
      <Card padding="list">
        {sections.map(([label, module], index) => (
          <View key={label} style={[styles.row, index > 0 && { borderTopWidth: 1, borderColor: theme.hairline }]}>
            <ThemedText type="body">{label}</ThemedText>
            <ThemedText type="meta" themeColor="fgSubtle">
              {module}
            </ThemedText>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Gutter, gap: Spacing.two },
  eyebrow: { paddingHorizontal: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52 },
});
