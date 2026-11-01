import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { riseIn } from '@/components/ui/motion';
import type { IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={riseIn} style={styles.wrap}>
      <View style={[styles.badge, { backgroundColor: theme.surfaceInset }]}>
        <SymbolView name={icon} size={24} tintColor={theme.fgMuted} />
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      {body && (
        <ThemedText type="sm" themeColor="fgMuted" style={styles.body}>
          {body}
        </ThemedText>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 40 },
  badge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontWeight: '600', textAlign: 'center' },
  body: { maxWidth: 320, textAlign: 'center' },
  action: { marginTop: 8 },
});
