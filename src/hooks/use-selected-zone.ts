import { useEffect, useState } from 'react';

import { resolveSelectedZoneNumber, type ZoneState } from '@/lib/aircon';
import { useAuth, useUser } from '@/lib/auth';

/**
 * The room that comes on with the main unit. A stored room the console no longer
 * has - or none yet - is replaced with the first room and saved, so the power
 * button always has a room to bring on.
 */
export function useSelectedZone(zones: ZoneState[]) {
  const { selectedZoneNumber } = useUser();
  const { selectRoom } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const effective = resolveSelectedZoneNumber(zones, selectedZoneNumber);

  useEffect(() => {
    if (effective === null || effective === selectedZoneNumber) return;
    selectRoom(effective).catch((e: Error) => setError(e.message));
  }, [effective, selectedZoneNumber, selectRoom]);

  return { selectedZoneNumber: effective, error, dismissError: () => setError(null) };
}
