import * as SecureStore from 'expo-secure-store';

/**
 * Talking to the Home Management System bridge. The web UI used relative URLs;
 * here every request is prefixed with the address entered at sign-in, and the
 * session rides in the bridge's cookie, which the native cookie jar stores and
 * resends.
 */

const BRIDGE_KEY = 'bridge-address';

let bridge: string | null = null;

/** The stored bridge address, or null on first launch. Requests go to it from here on. */
export async function loadBridgeAddress(): Promise<string | null> {
  bridge = await SecureStore.getItemAsync(BRIDGE_KEY).catch(() => null);
  return bridge;
}

/** Points requests at an address without storing it, so a typo never replaces a working one. */
export function setBridgeAddress(address: string): void {
  bridge = address;
}

/** Stores the current address for the next launch. */
export async function rememberBridgeAddress(): Promise<void> {
  if (bridge) await SecureStore.setItemAsync(BRIDGE_KEY, bridge);
}

/** `ws(s)://` for a path on the bridge, e.g. the live-state socket. */
export function bridgeSocketUrl(path: string): string {
  if (!bridge) throw new Error('No bridge address is set.');
  return `${bridge.replace(/^http/, 'ws')}${path}`;
}

/**
 * `home.tailnet.ts.net` → `https://home.tailnet.ts.net`. Release builds allow only
 * HTTPS (the bridge is reached over Tailscale); an explicit `http://` still works in
 * Expo Go, for a bridge on this machine.
 */
export function normalizeBridge(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const unauthorized = new Set<() => void>();

/**
 * Called when any request comes back 401, so a session that expires mid-use
 * drops straight to sign-in instead of leaving a UI that rejects every action.
 */
export function onUnauthorized(listener: () => void): () => void {
  unauthorized.add(listener);
  return () => {
    unauthorized.delete(listener);
  };
}

/**
 * fetch against the bridge. Times out rather than hanging on the OS connect
 * timeout (over a minute on Android for a dead LAN address), and says which
 * address could not be reached.
 */
async function send(path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  if (!bridge) throw new Error('No bridge address is set.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${bridge}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init.headers },
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      controller.signal.aborted
        ? `The bridge at ${bridge} didn't answer.`
        : `Couldn't reach the bridge at ${bridge}.`,
    );
  } finally {
    clearTimeout(timer);
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `request failed (${response.status})`);
  return body as T;
}

/** A JSON call to a data API. A 401 here means the session is gone, so the app signs out. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init);
  if (response.status === 401) {
    unauthorized.forEach((listener) => listener());
    throw new Error('signed out');
  }
  return parse<T>(response);
}

export interface AuthUser {
  id: number;
  username: string;
  selectedZoneNumber: number | null;
}

export const authApi = {
  /** Confirms the address is a bridge before a password is sent to it. */
  async checkBridge(): Promise<void> {
    const response = await send('/healthz', {}, 5_000);
    const body = await response.json().catch(() => null);
    if (body?.status !== 'ok') throw new Error(`No bridge answered at ${bridge}.`);
  },

  /** Resolves to null when not signed in, rather than throwing. */
  async me(): Promise<AuthUser | null> {
    const response = await send('/api/auth/me', {}, 5_000);
    if (response.status === 401) return null;
    return (await parse<{ user: AuthUser }>(response)).user;
  },

  async login(username: string, password: string): Promise<AuthUser> {
    const response = await send('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return (await parse<{ user: AuthUser }>(response)).user;
  },

  async logout(): Promise<void> {
    await send('/api/auth/logout', { method: 'POST' }, 5_000).catch(() => undefined);
  },
};
