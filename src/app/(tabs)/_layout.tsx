import { NativeTabs } from 'expo-router/native-tabs';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Four tabs, each owning two or three segments. Nothing lives behind an overflow menu. */
export default function TabLayout() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.surface}
      tintColor={theme.accent}
      indicatorColor={theme.accentSoft}
      labelVisibilityMode="labeled"
      iconColor={{ default: theme.fgMuted, selected: theme.accent }}
      labelStyle={{
        default: { color: theme.fgMuted, fontFamily: FontFamily, fontWeight: '500' },
        selected: { color: theme.accent, fontFamily: FontFamily, fontWeight: '600' },
      }}>
      <NativeTabs.Trigger name="aircon">
        <NativeTabs.Trigger.Label>Aircon</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="wind" md="air" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="house">
        <NativeTabs.Trigger.Label>House</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="slider.horizontal.3" md="tune" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
