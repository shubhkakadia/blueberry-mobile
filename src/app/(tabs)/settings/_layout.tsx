import { Stack } from 'expo-router';

import { crossfade } from '@/components/ui/motion';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false }}>
      {/* Sections of one tab: switching swaps in place, as the web's segments do. */}
      <Stack.Screen name="index" options={{ title: 'Settings', ...crossfade }} />
      <Stack.Screen name="plan" options={{ title: 'Settings', ...crossfade }} />
    </Stack>
  );
}
