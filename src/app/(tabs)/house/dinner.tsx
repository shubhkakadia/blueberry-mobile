import { ComingSoon } from '@/components/coming-soon';
import { Segments } from '@/components/segments';
import { HOUSE_SECTIONS } from '@/constants/sections';

export default function DinnerScreen() {
  return (
    <ComingSoon sections={[['Dinner', 'M6']]}>
      <Segments items={HOUSE_SECTIONS} selected={1} />
    </ComingSoon>
  );
}
