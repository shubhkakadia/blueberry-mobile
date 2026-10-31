import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { IconName } from '@/constants/icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'ghost' | 'plain' | 'danger' | 'dashed';
export type ButtonSize = 'sm' | 'md' | 'lg';

type Theme = ReturnType<typeof useTheme>;

function variantColors(variant: ButtonVariant, t: Theme) {
  return {
    /** Filled accent: the one action a form or screen exists for. */
    primary: { bg: t.accent, border: 'transparent', fg: t.accentFg },
    /** White with a grey outline: Start now, Edit, Cancel. */
    secondary: { bg: t.surface, border: t.border, fg: t.fg },
    /** A grey fill without a border, for a toggle beside outlined buttons. */
    quiet: { bg: t.surfaceInset, border: 'transparent', fg: t.fg },
    ghost: { bg: 'transparent', border: 'transparent', fg: t.fgMuted },
    /** Takes its colour from the surroundings via `color`, e.g. a close button in an alert. */
    plain: { bg: 'transparent', border: 'transparent', fg: t.fg },
    /** Outlined rust: sign out, delete. */
    danger: { bg: t.surface, border: t.dangerBorder, fg: t.danger },
    /** An add-another control at the end of the list it extends. */
    dashed: { bg: 'transparent', border: t.accentMuted, fg: t.accent },
  }[variant];
}

const SIZES = {
  sm: { height: 36, gap: 6, paddingHorizontal: 12, borderRadius: Radius.button, fontSize: 14 },
  md: { height: 44, gap: 8, paddingHorizontal: 16, borderRadius: Radius.button, fontSize: 14 },
  lg: { height: 52, gap: 8, paddingHorizontal: 20, borderRadius: Radius.row, fontSize: 16 },
} as const;

type BaseProps = Omit<PressableProps, 'children' | 'style'> & {
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
};

export type ButtonProps = BaseProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon. Swapped for a spinner while `loading`. */
  icon?: IconName;
  loadingLabel?: string;
  fullWidth?: boolean;
  /** Fully rounded ends, e.g. New timer in the header. */
  pill?: boolean;
  /** After the label, e.g. a disclosure chevron. */
  trailing?: ReactNode;
  children?: ReactNode;
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  loadingLabel,
  fullWidth = false,
  pill = false,
  trailing,
  disabled,
  style,
  children,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const colors = variantColors(variant, theme);
  const { fontSize, ...box } = SIZES[size];
  // A wide button presses less, or it lurches.
  const press = fullWidth || size === 'lg' ? 0.985 : 0.96;
  const inactive = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      // `sm` is below the 44px floor, so it buys its hit area outside the layout.
      hitSlop={size === 'sm' ? 4 : undefined}
      style={({ pressed }) => [
        styles.base,
        box,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          transform: [{ scale: pressed ? press : 1 }],
        },
        variant === 'dashed' && styles.dashed,
        pill && { borderRadius: Radius.control },
        fullWidth && styles.fullWidth,
        pressed && variant !== 'primary' && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.fg} />
      ) : (
        icon && <SymbolView name={icon} size={18} tintColor={colors.fg} />
      )}
      <ThemedText numberOfLines={1} style={[styles.label, { fontSize, color: colors.fg }]}>
        {loading && loadingLabel ? loadingLabel : children}
      </ThemedText>
      {trailing}
    </Pressable>
  );
}

export type IconButtonProps = BaseProps & {
  icon: IconName;
  /** Required: becomes the accessible name, since there is no visible text. */
  label: string;
  variant?: 'ghost' | 'plain' | 'secondary' | 'quiet' | 'primary';
  /** `round` is the circular outlined button, e.g. previous/next week. */
  shape?: 'square' | 'round';
  /** Overrides the variant's ink, for a `plain` button inside a tinted surface. */
  color?: string;
};

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  shape = 'square',
  loading = false,
  color,
  disabled,
  style,
  ...rest
}: IconButtonProps) {
  const theme = useTheme();
  const colors = variantColors(variant, theme);
  const ink = color ?? colors.fg;
  const inactive = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles.icon,
        {
          backgroundColor: colors.bg,
          borderColor: variant === 'secondary' ? theme.hairlineStrong : colors.border,
          borderRadius: shape === 'round' ? Radius.control : Radius.button,
          // A small target can afford a deeper press than a wide one.
          transform: [{ scale: pressed ? 0.88 : 1 }],
        },
        pressed && variant !== 'primary' && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={ink} />
      ) : (
        <SymbolView name={icon} size={18} tintColor={ink} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dashed: { borderStyle: 'dashed', borderWidth: 1.5 },
  fullWidth: { alignSelf: 'stretch' },
  icon: { width: 44, height: 44 },
  label: { fontWeight: '600', flexShrink: 1 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});
