import type { SymbolViewProps } from 'expo-symbols';

export type IconName = SymbolViewProps['name'];

/** The web's `icons.tsx`, as SF Symbols on iOS and Material Symbols on Android and web. */
export const Icons = {
  warning: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  revert: { ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' },
  cool: { ios: 'snowflake', android: 'ac_unit', web: 'ac_unit' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
} satisfies Record<string, IconName>;
