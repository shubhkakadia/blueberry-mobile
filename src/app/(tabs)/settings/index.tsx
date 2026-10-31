import { ComingSoon } from '@/components/coming-soon';

export default function SettingsScreen() {
  return (
    <ComingSoon
      sections={[
        ['General', 'M3'],
        ['Energy plan', 'M8'],
      ]}
    />
  );
}
