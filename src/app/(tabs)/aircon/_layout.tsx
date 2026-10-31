import { Stack } from 'expo-router';

export default function AirconLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Aircon' }} />
    </Stack>
  );
}
