import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, type TextInputInstance, type TextInputProps } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const HEIGHT = { md: 44, lg: 48 } as const;

export type InputProps = TextInputProps & {
  ref?: Ref<TextInputInstance>;
  invalid?: boolean;
  /** `lg` (48px) for a form's main fields; `md` (44px) for dense grids. */
  fieldSize?: keyof typeof HEIGHT;
};

/** 16px text, with an accent border and a soft halo while focused. */
export function Input({ invalid, fieldSize = 'lg', editable = true, style, onFocus, onBlur, ...rest }: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      {...rest}
      editable={editable}
      placeholderTextColor={theme.fgSubtle}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        {
          height: HEIGHT[fieldSize],
          color: theme.fg,
          backgroundColor: theme.surfaceField,
          borderColor: invalid ? theme.danger : focused ? theme.accent : theme.border,
          // Android swaps the field's background drawable whenever its border or halo changes,
          // and the new one resets the padding to the theme's. A hair's change of border width
          // with each look makes React Native set the padding again in the same update.
          borderWidth: 1 + (focused ? 0.01 : 0) + (invalid ? 0.02 : 0),
        },
        focused && { boxShadow: `0 0 0 3px ${theme.accentSoft}` },
        !editable && styles.disabled,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minWidth: 0,
    borderWidth: 1,
    borderRadius: Radius.field,
    paddingHorizontal: 14,
    fontFamily: FontFamily,
    fontSize: 16,
  },
  disabled: { opacity: 0.5 },
});
