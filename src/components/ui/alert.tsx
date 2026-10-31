import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/button';
import { riseIn } from '@/components/ui/motion';
import { Icons, type IconName } from '@/constants/icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AlertTone = 'danger' | 'warning' | 'info';

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  /** Overrides the tone's icon, e.g. two rings for overlapping timers. */
  icon?: IconName;
  onDismiss?: () => void;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** A tinted note in the flow of a screen. No border: the fill is enough. */
export function Alert({ tone = 'danger', title, icon, onDismiss, onRetry, style, children }: AlertProps) {
  const theme = useTheme();
  const { box, ink, toneIcon } = {
    danger: { box: theme.dangerSoft, ink: theme.dangerInk, toneIcon: Icons.warning },
    warning: { box: theme.warningSoft, ink: theme.warningInk, toneIcon: Icons.warning },
    info: { box: theme.accentSoft, ink: theme.accentDeep, toneIcon: Icons.info },
  }[tone];

  return (
    <Animated.View
      entering={riseIn}
      accessibilityRole={tone === 'info' ? undefined : 'alert'}
      style={[styles.alert, { backgroundColor: box }, style]}>
      <SymbolView name={icon ?? toneIcon} size={20} tintColor={ink} style={styles.icon} />
      <View style={styles.body}>
        <ThemedText type="sm" style={{ color: ink }}>
          {title && <ThemedText type="sm" style={[styles.title, { color: ink }]}>{`${title} `}</ThemedText>}
          {children}
        </ThemedText>
      </View>
      {onRetry && (
        <IconButton icon={Icons.refresh} label="Try again" variant="plain" color={ink} onPress={onRetry} style={styles.action} />
      )}
      {onDismiss && (
        <IconButton icon={Icons.close} label="Dismiss" variant="plain" color={ink} onPress={onDismiss} style={styles.action} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: Radius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: { marginTop: 1 },
  body: { flex: 1, minWidth: 0 },
  title: { fontWeight: '600' },
  // Bleeds into the padding so the 44px target does not grow the alert.
  action: { marginVertical: -10, marginRight: -8 },
});
