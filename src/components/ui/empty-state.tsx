import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { backgroundColor: theme.surfaceInset }]}>
        <SymbolView name={icon} size={24} tintColor={theme.fgMuted} />
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      {body && (
        <ThemedText type="sm" themeColor="fgMuted" style={styles.body}>
          {body}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 40 },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontWeight: '600', textAlign: 'center' },
  body: { maxWidth: 320, textAlign: 'center' },
});
