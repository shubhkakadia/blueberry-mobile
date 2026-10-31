import { ComingSoon } from '@/components/coming-soon';

export default function ActivityScreen() {
  return (
    <ComingSoon
      sections={[
        ['Rooms', 'M7'],
        ['Timeline', 'M7'],
        ['Costs', 'M8'],
      ]}
    />
  );
}
