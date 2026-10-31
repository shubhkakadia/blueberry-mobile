import { router } from 'expo-router';

import { Chip, ChipRow } from '@/components/ui/chip';

/** This week | Dishes, as on the web. Dishes is a pushed screen, so going back to the week is Back. */
export function DinnerViews({ view }: { view: 'week' | 'dishes' }) {
  return (
    <ChipRow accessibilityLabel="Dinner views">
      <Chip selected={view === 'week'} onPress={() => view === 'dishes' && router.back()}>
        This week
      </Chip>
      <Chip selected={view === 'dishes'} onPress={() => view === 'week' && router.push('/house/dinner/dishes')}>
        Dishes
      </Chip>
    </ChipRow>
  );
}
