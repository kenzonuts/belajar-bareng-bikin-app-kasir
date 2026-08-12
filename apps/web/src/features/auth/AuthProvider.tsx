import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { mapAuthError, type AuthProfile, type AuthStatus } from './auth-types';

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      return { error: mapAuthError(error), needsEmailConfirmation: false };
    }

    if (data.user && data.session) {
      await ensureProfile(data.user, name);
    }

    return {
      error: null,
      needsEmailConfirmation: Boolean(data.user) && !data.session,
    };
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
