import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

/** Spread onto the control so a screen reader announces the visible label, hint and error. */
export interface FieldA11y {
  accessibilityLabel: string;
  accessibilityHint?: string;
}

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  /** Hides the label visually but keeps it for screen readers. */
  labelHidden?: boolean;
  /** `sm` is the 12px label used in dense grids such as a rate period. */
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  children: ReactNode | ((a11y: FieldA11y) => ReactNode);
}

export function Field({ label, hint, error, labelHidden = false, size = 'md', style, children }: FieldProps) {
  const a11y: FieldA11y = { accessibilityLabel: label, accessibilityHint: error ?? hint };

  return (
    <View style={[styles.field, style]}>
      {!labelHidden && (
        <ThemedText
          type={size === 'sm' ? 'xs' : 'meta'}
          themeColor="fgMuted"
          importantForAccessibility="no"
          accessibilityElementsHidden
          style={styles.label}>
          {label}
        </ThemedText>
      )}
      {typeof children === 'function' ? children(a11y) : children}
      {hint && !error && (
        <ThemedText type="xs" themeColor="fgSubtle">
          {hint}
        </ThemedText>
      )}
      {error && (
        <ThemedText type="xs" themeColor="danger" accessibilityLiveRegion="polite" style={styles.label}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, minWidth: 0 },
  label: { fontWeight: '500' },
});
