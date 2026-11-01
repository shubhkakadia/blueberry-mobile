/**
 * Talking to the Home Management System bridge, published at the household's
 * domain through a Cloudflare Tunnel. The web UI used relative URLs; here every
 * request is prefixed with that address, and the session rides in the bridge's
 * cookie, which the native cookie jar stores and resends.
 *
 * `EXPO_PUBLIC_API_URL` (e.g. in a gitignored `.env.local`) points a dev session
 * at a bridge on this machine instead. Plain `http` works only in Expo Go: release
 * builds allow HTTPS alone.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://blueberrymandal.com').replace(/\/+$/, '');

/** `blueberrymandal.com`: the address as people read it. */
export const API_HOST = API_URL.replace(/^https?:\/\//, '');

/** `wss://` for a path on the bridge, e.g. the live-state socket. */
export function bridgeSocketUrl(path: string): string {
  return `${API_URL.replace(/^http/, 'ws')}${path}`;
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
 * timeout (over a minute on Android for a dead address), and says which
 * address could not be reached.
 */
async function send(path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init.headers },
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      controller.signal.aborted ? `${API_HOST} didn't answer.` : `Couldn't reach ${API_HOST}.`,
    );
  } finally {
    clearTimeout(timer);
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok && !body.error && response.status >= 500) {
    // No JSON from the bridge: Cloudflare answering for a home server that is off or offline.
    throw new Error(`The home server isn't answering (${response.status}).`);
  }
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
