import { ComingSoon } from '@/components/coming-soon';

export default function HouseScreen() {
  return (
    <ComingSoon
      sections={[
        ['Groceries', 'M5'],
        ['Dinner', 'M6'],
      ]}
    />
  );
}
