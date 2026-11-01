import { SymbolView } from 'expo-symbols';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { riseIn, sinkOut } from '@/components/ui/motion';
import { Pressable } from '@/components/ui/pressable';
import { Icons } from '@/constants/icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A dark bar floating above the tab bar. Used for one thing: a change the
 * console refused, which has already been put back. It says what happened and
 * waits to be acknowledged rather than timing out, because the control the
 * user was looking at has quietly moved. The caller positions it.
 */
export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={riseIn}
      exiting={sinkOut}
      accessibilityLiveRegion="polite"
      style={[styles.toast, { backgroundColor: theme.toast, boxShadow: theme.shadowToast }]}>
      <SymbolView name={Icons.revert} size={20} tintColor={theme.toastIcon} />
      <ThemedText type="sm" style={[styles.message, { color: theme.toastFg }]}>
        {message}
      </ThemedText>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        style={({ pressed }) => [styles.ok, pressed && styles.pressed]}>
        <ThemedText type="sm" style={[styles.okLabel, { color: theme.toastFg }]}>
          OK
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    borderRadius: Radius.row,
    paddingVertical: 6,
    paddingLeft: 16,
    paddingRight: 8,
  },
  message: { flex: 1, minWidth: 0 },
  ok: { height: 44, minWidth: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.button },
  okLabel: { fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
