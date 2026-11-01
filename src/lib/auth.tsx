import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { authApi, onUnauthorized, request, type AuthUser } from '@/lib/api';

interface Auth {
  /** undefined while the launch check runs, null when signed out. */
  user: AuthUser | null | undefined;
  /** Why the launch check fell through to sign-in, e.g. the bridge was out of reach. */
  notice: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** The room that comes on with the main unit. Shown at once; rejects if the bridge did not save it. */
  selectRoom: (zoneNumber: number) => Promise<void>;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const off = onUnauthorized(() => setUser(null));
    authApi
      .me()
      .then(setUser)
      .catch((error: Error) => {
        setNotice(error.message);
        setUser(null);
      });
    return off;
  }, []);

  const signIn = async (username: string, password: string) => {
    const signedIn = await authApi.login(username, password);
    setNotice(null);
    setUser(signedIn);
  };

  const signOut = async () => {
    await authApi.logout();
    setUser(null);
  };

  const selectRoom = async (zoneNumber: number) => {
    setUser((current) => current && { ...current, selectedZoneNumber: zoneNumber });
    await request('/api/account/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ selectedZoneNumber: zoneNumber }),
    });
  };

  return (
    <AuthContext value={{ user, notice, signIn, signOut, selectRoom }}>{children}</AuthContext>
  );
}

export function useAuth(): Auth {
  const auth = use(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}

/** For screens behind the sign-in guard, where the user is always known. */
export function useUser(): AuthUser {
  const { user } = useAuth();
  if (!user) throw new Error('useUser must be used behind the sign-in guard');
  return user;
}
