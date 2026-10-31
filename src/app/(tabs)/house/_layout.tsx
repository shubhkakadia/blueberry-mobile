import { Stack } from 'expo-router';

export default function HouseLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'House' }} />
    </Stack>
  );
}
