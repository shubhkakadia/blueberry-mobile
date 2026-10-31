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
  heat: { ios: 'sun.max', android: 'sunny', web: 'sunny' },
  dry: { ios: 'drop', android: 'water_drop', web: 'water_drop' },
  fan: { ios: 'fan', android: 'mode_fan', web: 'mode_fan' },
  auto: { ios: 'a.circle', android: 'hdr_auto', web: 'hdr_auto' },
  power: { ios: 'power', android: 'power_settings_new', web: 'power_settings_new' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  console: { ios: 'antenna.radiowaves.left.and.right', android: 'router', web: 'router' },
  house: { ios: 'house', android: 'home', web: 'home' },
  pencil: { ios: 'pencil', android: 'edit', web: 'edit' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  sliders: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  dish: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  person: { ios: 'person', android: 'person', web: 'person' },
  activity: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
} satisfies Record<string, IconName>;

/** A climate mode's icon by its `getClimateTheme` key; unknown modes read as Auto. */
export function climateIcon(key: string): IconName {
  const icons: Record<string, IconName> = {
    cool: Icons.cool,
    heat: Icons.heat,
    dry: Icons.dry,
    fan: Icons.fan,
    off: Icons.power,
  };
  return icons[key] ?? Icons.auto;
}
