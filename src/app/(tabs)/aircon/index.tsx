import { ComingSoon } from '@/components/coming-soon';

export default function AirconScreen() {
  return (
    <ComingSoon
      sections={[
        ['Now', 'M2'],
        ['Timers', 'M4'],
      ]}
    />
  );
}
