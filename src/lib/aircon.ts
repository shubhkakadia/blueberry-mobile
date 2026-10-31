import { bridgeSocketUrl, request } from '@/lib/api';

export interface ZoneState {
  number: number;
  name: string;
  power: 'Off' | 'On' | 'Turbo' | 'Unknown';
  openPercentage: number;
  temperatureControlled: boolean;
  targetSetpoint: number;
  temperature: number | null;
  hasSensor: boolean;
  batteryLow: boolean;
}

export interface AcState {
  number: number;
  power: 'Off' | 'On' | 'Turbo' | 'Unknown';
  mode: string;
  fanSpeed: string;
  targetSetpoint: number;
  temperature: number | null;
}

export interface AcAbility {
  number: number;
  name: string;
  supportedModes: string[];
  supportedFanSpeeds: string[];
  minSetpoint: number;
  maxSetpoint: number;
}

export interface SystemState {
  zones: ZoneState[];
  acs: AcState[];
  abilities: AcAbility[];
  connected: boolean;
  lastUpdated: string | null;
}

export const isOn = (power: string) => power === 'On' || power === 'Turbo';

const post = (path: string, body: unknown) =>
  request<SystemState>(path, { method: 'POST', body: JSON.stringify(body) });

export const airconApi = {
  state: () => request<SystemState>('/api/state'),
  acPower: (ac: number, on: boolean, zoneNumber?: number) =>
    post(`/api/ac/${ac}/power`, { on, ...(zoneNumber === undefined ? {} : { zoneNumber }) }),
  acMode: (ac: number, mode: string) => post(`/api/ac/${ac}/mode`, { mode }),
  acFan: (ac: number, speed: string) => post(`/api/ac/${ac}/fan`, { speed }),
  acSetpoint: (ac: number, celsius: number) => post(`/api/ac/${ac}/setpoint`, { celsius }),
  zonePower: (zone: number, on: boolean) => post(`/api/zones/${zone}/power`, { on }),
  zonePercentage: (zone: number, percent: number) => post(`/api/zones/${zone}/percentage`, { percent }),
};

/** Live state from the bridge. Reconnects 2 s after a drop, until unsubscribed. */
export function subscribe(onState: (state: SystemState) => void): () => void {
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const connect = () => {
    if (closed) return;
    socket = new WebSocket(bridgeSocketUrl('/ws'));
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'state') onState(message.payload);
      } catch {
        /* ignore malformed frames */
      }
    };
    socket.onclose = () => {
      if (!closed) retry = setTimeout(connect, 2000);
    };
    socket.onerror = () => socket?.close();
  };

  connect();
  return () => {
    closed = true;
    clearTimeout(retry);
    socket?.close();
  };
}

/**
 * The room a user's stored preference actually points at. The console can drop
 * or renumber zones between sessions, so a saved number is a hint rather than a
 * guarantee - fall back to the first room rather than to nothing.
 */
export function resolveSelectedZoneNumber(zones: ZoneState[], selectedZoneNumber: number | null): number | null {
  if (zones.some((zone) => zone.number === selectedZoneNumber)) return selectedZoneNumber;
  return zones[0]?.number ?? null;
}
