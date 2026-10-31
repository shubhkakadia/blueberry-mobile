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
  const [saving, setSaving] = useState(false);
  const effective = resolveSelectedZoneNumber(zones, selectedZoneNumber);

  useEffect(() => {
    if (effective === null || effective === selectedZoneNumber) return;
    selectRoom(effective).catch((e: Error) => setError(e.message));
  }, [effective, selectedZoneNumber, selectRoom]);

  /** The Settings picker: shown at once, and a warning if the bridge did not keep it. */
  const choose = (zoneNumber: number) => {
    setError(null);
    setSaving(true);
    selectRoom(zoneNumber)
      .catch((e: Error) => setError(e.message))
      .finally(() => setSaving(false));
  };

  return { selectedZoneNumber: effective, error, saving, choose, dismissError: () => setError(null) };
}
