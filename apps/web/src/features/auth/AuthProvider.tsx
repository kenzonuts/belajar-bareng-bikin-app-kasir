import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { ApiError, apiRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { AuthContext, type AuthContextValue } from './auth-context';
import { mapAuthError, type AuthProfile, type AuthStatus } from './auth-types';

async function fetchProfile(userId: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[auth] failed to load profile', error.message);
    return null;
  }

  return data;
}

async function ensureProfile(user: User, fallbackName?: string): Promise<AuthProfile | null> {
  const existing = await fetchProfile(user.id);
  if (existing) {
    return existing;
  }

  const name =
    fallbackName?.trim() ||
    (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : '') ||
    user.email?.split('@')[0] ||
    'User';

  const { error } = await supabase.from('users').upsert(
    {
      id: user.id,
      name,
      email: user.email ?? `${user.id}@unknown.local`,
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('[auth] failed to ensure profile', error.message);
  }

  return fetchProfile(user.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('AUTH_LOADING');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  const syncSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setProfile(null);
      setStatus('UNAUTHENTICATED');
      return;
    }

    const nextProfile = await ensureProfile(nextSession.user);
    setProfile(nextProfile);
    setStatus('AUTHENTICATED');
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      void syncSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? mapAuthError(error) : null };
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        return { error: err.message };
      }
      return { error: mapAuthError({ message: err instanceof Error ? err.message : undefined }) };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? mapAuthError(error) : null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error ? mapAuthError(error) : null };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const nextProfile = await ensureProfile(user);
    setProfile(nextProfile);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user,
      profile,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [status, session, user, profile, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
