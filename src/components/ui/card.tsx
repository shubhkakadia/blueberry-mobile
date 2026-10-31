import { View, type ViewProps } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LEVEL = {
  /** The one card a screen is built around. */
  hero: Radius.hero,
  /** A grouping container: a list of rows, a chart, a settings group. */
  panel: Radius.panel,
  /** A card that carries its own controls, e.g. a timer or a rate period. */
  tile: Radius.tile,
  /** A small card in a stack of them, e.g. a day of the dinner week. */
  row: Radius.card,
} as const;

const PADDING = {
  none: {},
  row: { paddingHorizontal: 16, paddingVertical: 12 },
  list: { paddingHorizontal: 16, paddingVertical: 4 },
  sm: { padding: 14 },
  md: { padding: 16 },
  lg: { padding: 18 },
  hero: { padding: 20 },
} as const;

export type CardProps = ViewProps & {
  level?: keyof typeof LEVEL;
  padding?: keyof typeof PADDING;
};

/** A white card on the canvas: no border, lifted by a single soft shadow. */
export function Card({ level = 'panel', padding = 'md', style, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        { backgroundColor: theme.surface, boxShadow: theme.shadowE1, borderRadius: LEVEL[level] },
        PADDING[padding],
        style,
      ]}
    />
  );
}
