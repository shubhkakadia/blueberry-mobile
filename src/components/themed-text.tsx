import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily, ThemeColor, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: keyof typeof Type;
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'base', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[styles.base, Type[type], type === 'eyebrow' && styles.eyebrow, { color: theme[themeColor ?? 'fg'] }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { fontFamily: FontFamily },
  eyebrow: { textTransform: 'uppercase' },
});
