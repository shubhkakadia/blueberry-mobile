import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false }}>
      {/* Sections of one tab: switching swaps in place, as the web's segments do. */}
      <Stack.Screen name="index" options={{ title: 'Settings', animation: 'none' }} />
      <Stack.Screen name="plan" options={{ title: 'Settings', animation: 'none' }} />
    </Stack>
  );
}
