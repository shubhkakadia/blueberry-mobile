import { ComingSoon } from '@/components/coming-soon';
import { Segments } from '@/components/segments';
import { ACTIVITY_SECTIONS } from '@/constants/sections';

export default function CostsScreen() {
  return (
    <ComingSoon sections={[['Costs', 'M8']]}>
      <Segments items={ACTIVITY_SECTIONS} selected={2} />
    </ComingSoon>
  );
}
